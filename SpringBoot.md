### Why each "refresh()' step matters as an SDE

Understanding *which step* something happens in tells you *why* a bug manifests the way it does and *where* to look when things break.
| Step | What happens | SDE production consequence |
|------|---|---|
| **1. prepareRefresh** | Context marked active; required properties validated | If you use `@Value("${my-key]")` with no default and the property is missing, the error fires **here** before any bean is touched. You see `IllegalArgumentException: Could not resolve placeholder` before your `main()` even returns.|
| **2. obtainFreshBeanFactory** | `DefaultListableBeanFactory` created; XML parsed into BeanDefinition's | In XML-based apps, a malformed XML bean definition fails here. In annotation apps, this step is fast - definitions aren't registered until step 5.|
| **3. prepareBeanFactory** | Built-in BPPs registered; `environment`, `systemProperties` beans added | `ApplicationContextAware`, `EnvironmentAware` , and `@Value` placeholder resolution infrastructure is wired here. If you ever try to access the `ApplicationContext` before `refresh()` returns (e.g. in a static initialiser), it's not ready yet - this is why. |
| **4. postProcessBeanFactory** | Subclass hook for web contexts | Web contexts register `ServletContextAwareProcessor` here so beans can implement `ServletContextAware` - If a web-specific bean fails to wire later, check whether you're running in a non-web context accidentally (common in tests that load `AnnotationConfigApplicationContext` instead of the full web variant).|
| **5. invokeBeanFactoryPostProcessors** | `@Configuration` classes scanned; `@componentscan`, `@Bean`, `@conditional*` , auto-configs all run | **This is where your beans are *discovered*, not created.** A `@ConditionalOnMissingBean` check, a missing `@ComponentScan` base package, or a failing auto-config condition all surface here. When `--debug` shows a bean in `Negative matches`, this is the step that excluded it. If your `@Configuration` class isn't being picked up, the scan isn't reaching it - check the base package.|
| **6. registerBeanPostProcessorg** | All "BeanPostProcessor beans instantiated, sorted by "@Order" | **Proxy infrastructure is registered here.** `AnnotationAwareAspectJAutoProxyCreator` (the engine behind `@Transactional`, `@Async`, `@Cacheable`) is instantiated at this step. If it's not in the container — because `@EnableAspect]AutoProxy` is missing or `spring-boot-starter-aop` isn't on the classpath - **every AOP annotation silently does nothing from this point forward**, because there is nothing to create proxies in step 11.|
| **7. initMessageSource** | 118n `MessageSource` set up | Affects `@Valid` constraint messages and any `MessageSource` -dependent code. If your validation error messages show the raw code key (`{jakarta.validation.constraints NotBlank-message}`) instead of the text, the `MessageSource` isn't Finding your `messages.properties` file - root cause is here. |
| **8. initApplicationEventMulticaster** | Event bus created (`SimpleApplicationEventMulticaster` by default) | By default, events are dispatched **synchronously on the publishing thread**. If an `@EventListener` method is slow or throws, it blocks the publisher. Switch to an async executor on the multicaster for high-throughput event flows. This is also why an uncaught exception in an `@EventListener` can kill an otherwise-healthy request thread.|
| **9. onRefresh** | Embedded server starts (Tomcat/Jetty/Undertow) | The server starts **before all singleton beans are fully wired** (that happens in step 11). This means there's a brief window where the server socket is open but your application beans aren't ready. Spring's readiness probe (`/ actuator/health/readiness`) stays `OUT_OF_SERVICE` until `ApplicationReadyEvent` fires at step 12 - this is the correct signal to use in Kubernetes, not just liveness. |
| **10. registerListeners** | `@EventListener` beans connected to the event bus | If your `@EventListener` method never fires, check whether the bean was registered before this step. A `BeanPostProcessor` that registers late may miss the listener wiring window. Also: `ApplicationStartingEvent` and `ApplicationEnvironmentPreparedEvent` fire *before* `refresh()` even begins - they require a `SpringApplicationListener` , not `@EventListener`. A common mistake is expecting `@EventListener` to catch those early events. |
| **11. finishBeanFactoryInitialization** | All non-lazy singletons instantiated; `@Autowired` /`@Value` resolved; `@PostConstruct` called; `AOP proxies` created | **The most important step for debugging.** Every `NoSuchBeanDefinitionException`, `NoUniqueBeanDefinitionException` , `UnsatisfiedDependencyException`, `LazyInitializationException` (from `@PostConstruct` hitting a lazy JPA field), and `BeanCurrentlyInCreationException` (circular dep) surfaces here. The stack trace will point to a bean creation call - follow it up to find the root bean that triggered the chain. |
| **12. FinishRefresh** | `ContextRefreshedEvent` --> `SmartLifecycle.start()` --> *ApplicationReadyEvent* | `@EventListener(ContextRefreshedEvent.class)` fires here and is a common hook for one-time startup jobs (warming caches, starting schedulers). **Watch out for idempotency**: in parent-child context setups, *`ContextRefreshedEvent` fires once per context* - your listener may run twice. Use `ApplicationReadyEvent` instead; it fires exactly once for the root context. `SmartLifecycle` beans (message consumers, connection pools that auto-starts) are started here too - if a Kafka consumer never starts consuming, check whether its `SmartLifecycle.isAutoStartup()` returns `true.` |
> **SDE3 debug workflow using this map:**
> - Bean not found / wrong bean wired → step 5 (was it scanned? was a condition false?)
> - Annotation does nothing (Transactional', '@Async, etc.) → step 6 (is the BPP registered?)
> - Startup crash on wiring → step 11 (read the full exception chain, not just the last cause)
> - "@EventListener" never fires + step 10 (early events) or step 12 (was context fully refreshed?)
> - App accepts connections before it's ready + step 9 vs step 12 (use readiness probe, not liveness)
### BeanDefinitions - The Blueprints
Between step 2 and step 11, Spring works entirely with **'BeanDefinition'** objects - descriptions of how to create a bean (class name, scope, constructor args, property values, init method). No instances exist yet.

| Source of configuration | Registered by |
|---|---|
| @Component / @Service / @Repository | ClassPathBeanDefinitionScanner |
| @Bean method in @Configuration | ConfigurationClassBeanDefinitionReader |
| \<bean\> element in XML | XmlBeanDefinitionReader |
| @Import(SomeRegistrar.class) | ImportBeanDefinitionRegistrar |
| Auto-configuration classes | AutoConfigurationImportSelector |

You can inspect what is registered at runtime:
```java
ConfigurableListableBeanFactory bf = ((ConfigurableApplicationContext) ctx).getBeanFactory();
// All registered bean names
String[] names = bf-getBeanDefinitionNames); // ~500 in a typical Boot app
// Inspect a specific definition
BeanDefinition bd = bf-getBeanDefinition("orderService");
System.out.println(bd.getBeanClassName()); // com.example.OrderService
System.out.println(bd.getScope)); // singleton
System.out.println(bd.isLazyInitO); // false
System.out.println(bd.getConstructorArgumentValues().getArgumentCount():
```
### Accessing ApplicationContext
**Option 1 - Constructor injection (preferred)**
```java
@Service
public class OrderService {
  private final ApplicationContext ctx;
  public OrderService (ApplicationContext ctx) {
    this.ctx = ctx;   // ctx is fully refreshed at injection time
  }
}
```
Use when you genuinely need to look up beans dynamically (e.g. strategy pattern by name).

**Option 2 - `ApplicationContextAware` (infrastructure/library code)**
```java
@Component
public class BeanLocator implements ApplicationContextAware {
private ApplicationContext ctx;
  @override
  public void setApplicationContext(ApplicationContext ctx) {
    this.ctx = ctx;  // called at step 3 of bean lifecycle (Aware callbacks)
  }

  public ‹T> T getBean(Class<T> type) {
    return ctx-getBean(type) ;
  }
}
```
Spring detects `ApplicationContextAware` via `ApplicationContextAwareProcessor` (a built-in BPP registered at `refresh()` step 3) and calls `setApplicationContext` during the Aware callback phase of each bean's lifecycle.
**Option 3 - Static holder (last resort, avoid in greenfield)**
```java
@Component
public class SpringContext implements ApplicationContextAware f
  private static ApplicationContext context;
  @override
  public void setApplicationContext(ApplicationContext ctx) {
    SpringContext.context = ctx;
  }
  public static ‹T› T getBean(Class<T> type) {
    return context getBean (type) ;
  }
}
```
Used in legacy code where DI is unavailable (static utility methods, Hibernate `UserType`, etc.). The risk: `context` is `null` until Spring has called `setApplicationContext`, and any static call before that throws `NullPointerException`.

### ConfigurableApplicationContext* — Lifecycle Control
`SpringApplication.run()` returns `ConfigurableApplicationContext`, not just `ApplicationContext`. This gives you lifecycle control:
```java
ConfigurableApplicationContext ctx = SpringApplication.run(App.class, args);

// Graceful shutdown - triggers @PreDestroy, ContextClosedEvent, SmartLifecycle.stop()
ctx. close();

// Register JVM shutdown hook (Spring Boot does this automatically via registerShutdownHook())
ctx. registerShutdownHook):

// Programmatic context construction before refresh) - useful for tests/tooling
AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext();
ctx. register(MyConfig.class);
ctx. getEnvironment) -getPropertySources()
   .addFirst(new MapPropertySource ("overrides", Map.of("server-port", "0")));
ctx.refresh(); // context is now live
ctx.getBean(MyService.class).doWork();
ctx. close();
```

