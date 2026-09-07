# Java Learning Notes
## JVM, JRE, and JDK
Think of a Java program as a recipe written in a special language:
- **JDK (Java Development Kit):** the workshop used to write, compile, debug, and package the recipe.
- **JRE (Java Runtime Environment):** everything needed to run the prepared recipe.
- **JVM (Java Virtual Machine):** the engine inside the JRE that actually executes it.

The containment model is:

```text
JDK
|-- development tools: javac, javadoc, jdb, jlink, jpackage, ...
`-- runtime
  |-- Java standard libraries
  `-- JVM
```

Historically, the runtime was distributed separately as a **JRE**. Since Java 11, Oracle no longer ships a general-purpose standalone JRE. Teams usually install a JDK or build a smaller custom runtime with `jlink`. The conceptual term JRE is still useful.

## What Happens When Java Runs?

Given this source file:

```java
public class Hello {
  public static void main(String[] args) {
    System.out.println("Hello");
  }
}
```

### 1. Compile with the JDK

```shell
  javac Hello.java
```
The JDK compiler, `javac` , converts source code into platform-neutral JVM **bytecode** in `Hello.class`. Bytecode is not native Windows or Linux machine

### 2. Run using the runtime

```shell
  java Hello
```
The `java` launcher starts a JVM, loads `Hello.class`, verifies it, and executes its bytecode. The same class file can normally run on any compatible JVM, which is the basis of "write once, run anywhere."

```text
Hello.java --> javac --> Hello.class --> JVM --> native machine instructions
 source         jdk        bytecode               Windows/Linux/MacOS CPU
```

## JVM: The Execution Engine

The JVM is a specification with implementations such as HotSpot and OpenJ9. It provides:
- **Class loading:** Finds classes and loads them on demand through bootstrap, platform, and application class loaders.
- **Bytecode verification:** rejects structurally invalid or unsafe bytecode before execution.
- **Execution:** initially interprets bytecode and uses a **JIT compiler** to turn frequently executed code into optimized native instructions.
- **Memory management:** allocates objects and reclaims unreachable ones through garbage collection.
- **Runtime services:** manages threads, exceptions, synchronization, native calls, and security boundaries.

Important JVM memory areas:

| Area | Purpose | Shared? |
|---|---|---|
| Heap | Objects and arrays; managed by the garbage collector | Yes |
| Metaspace | Class metadata | Yes |
| Java stack | Method frames, local variables, and partial results | One per thread |
| PC register | Current instruction position | One per thread |
| Native stack | Native method execution | One per thread |

An SDE3 should distinguish these common failures:
- `StackOverflowError`: usually recursion or an excessively deep call chain.
- `OutOfMemoryError: Java heap space`: the heap cannot satisfy an allocation, possibly because of a leak, load, or poor sizing.
- `OutfMemoryError: Metaspace`: too much class metadata, often involving class-loader leaks or generated classes.

Garbage collection removes unreachable objects; it does not guarantee the absence of memory leaks. Retaining an unwanted reference keeps an object reachable. Collector choice and heap sizing affect throughput, latency, and operational cost.

## JRE: The Runtime Package

Conceptually, the JRE contains:
- a JVM implementation;
- Java standard libraries such as collections, networking, I/O, and concurrency;
- configuration and native libraries needed to run Java applications.
It does **not** conceptually include development tools such as the Java compiler. A runtime can execute existing bytecode but is not the full development environment.

## JDK: The Developer Toolkit

The JDK includes the runtime plus engineering tools. Important examples are:

| Tool | Purpose |
|---|---|
| `java` | Launch an application and start the JVM |
| `javac` | Compile Java source into bytecode |
| `jar` | Create and inspect JAR archives |
| `javadoc` | Generate API documentation |
| `jdb` | Command-line debugger |
| `jcmd`, `jstack`, `jmap` | Diagnose running JVMs, threads, and memory |
| `jfr` | Record low-overhead runtime events with Java Flight Recorder |
| `jdeps` | Analyze class and module dependencies |
| `jlink` | Build a custom runtime containing selected modules |
| `jpackage` | Create native application packages |

Maven and Gradle are build tools, not part of the JDK. They call JDK tools and manage dependencies, tests, packaging, and build lifecycles.

## Compatibility That Matters

- A JDK can target older bytecode using `javac --release ‹version›`.
- A newer JVM generally runs bytecode compiled for an older Java release.
- An older JVM cannot run newer bytecode and reports `UnsupportedClassVersionError`.

For reproducible builds, pin the JDK vendor and version in local development and CI. In production, use a supported runtime, apply security updates, set container memory limits deliberately, and observe GC pauses, heap usage, thread counts, and JIT behavior before tuning.

## Final Mental Model

| Question | Answer |
|---|---|
| What defines the abstract machine that executes bytecode? | JVM |
| What provides the JVM and libraries needed to run an app? | JRE/runtime image | 
| What provides the compiler and diagnostic/package tools? | JDK |
| What does "javac" produce? | JVM bytecode (*-class") | 
| What does "java start? | A JVM process |

In one sentence: **develop with a JDK, distribute a suitable runtime, and execute inside a JVM.**

---

## Core Java Fundamentals

### 1. Static vs Instance Members and Static Blocks

#### Core idea

- An **instance member** belongs to an object. Every object gets its own instance fields, and an instance method needs an object to run.
- A **static member** belongs to the class. One class-level field is shared by all instances loaded by the same class loader.
- A static method has no `this`, so it cannot directly access instance members.
- Prefer calling static members through the class name: `Counter.getTotal()`, not `counter.getTotal()`.

```java
class Counter {
  private static int total; // shared
  private int value; // one per Counter object
  static {
    total = 10; // runs when Counter is initialized
  }
  Counter () {
    value++;
    total++;
  ｝
  static int getTotal() {
    return total;
  }
}
```

A **static initialization block** runs once when the JVM initializes the class. Multiple static fields and blocks run in textual order. It is useful for class-level initialization that needs several statements, but complex work, I/O, or recoverable failures should not happen there. If initialization fails, the JVM throws `ExceptionInInitializerError`; later uses may produce `NoClassDefFoundError`.

Class initialization is lazy and JVM-controlled. It normally occurs before the first object creation, static method call, or access to a non-constant static field. Reading a compile-time constant such as `static final int LIMIT = 10` may not initialize the class because the value can be inlined into the caller.
Static mutable state is global state within a class loader. It creates concurrency, testing, and lifecycle risks. Use synchronization or thread-safe types when it is genuinely shared, and avoid it for request-specific data.

#### `<clinit>` in Simple Terms
`‹clinit>` means **class initialization method**. You do not write or call it. When a class has static field initializers or static blocks, `javac` combines them, in source order, into this special JVM method.

```java
class Settings {
  static int timeout = 30;
  static {
  System.out.println("Settings loaded");
  }
}
```

Conceptually, the compiler creates:

```text
‹clinit›:
  timeout = 30
  print "Settings loaded"
```

The JVM runs `‹clinit>` once before the class's first active use. It is different from `‹init>`, which is the JVM name for a constructor and runs for every new object.

**What an SDE3 should know:**

- A class file has `‹clinit›` only when runtime class-level initialization is required; compile-time constants may be inlined and need no runtime assignment.
- The JVM, not application code, invokes it once per loaded class identity. The same class loaded by two class loaders is initialized twice independently.
- Initialization follows superclass-first and source-text order. Interfaces have related but different initialization rules and are not initialized merely because an implementing class is initialized.
- Execution is synchronized per class. Other threads needing the class wait, and successful completion safely publishes the initialized static state.
- If it throws, the first active use normally receives "ExceptionInInitializerError"; later uses commonly receive "NoClassDefFoundError because the class remains erroneous for that class loader.
- Slow I/O, external calls, locks, or complex dependency chains in static initialization can delay startup, cause deadlocks, and make failures difficult to recover from.
- Circular initialization may expose default values such as "®" or "null', even though each class is initialized only once.
- Diagnose it with the earliest 'ExceptionInInitializerError and its cause; the later "NoClassDefFoundError' is often only a consequence.

#### What Happens Under the Hood

1. **Class metadata is loaded:** The class loader reads `Counter.class`, and the JVM creates an internal `Class` representation containing its fields, methods, constant pool, and modifiers. The same class name loaded by another class loader represents a different JVM type.
2. **Static storage is prepared:** During linking, the JVM allocates class-level storage and assigns default values: "0", "false", or "null". Therefore,
`total` is initially `0`, even though the source later assigns `10`.
3. **The class is initialized:** The compiler combines static field initializers and static blocks, in source order, into a special method named `‹clinit>`. The JVM invokes `‹clinit>` once before the class's first active use.
4. **Initialization is synchronized:** The JVM uses a per-class initialization lock. One thread runs `‹clinit>` while other threads needing that class wait. Successful initialization establishes a happens-before relationship with later class use.
5. **Instance storage is separate:** An object's instance fields live as part of that heap object's layout. Each `new Counter()` gets a separate `value`; the class-level `total` is not copied into each object.
6. **Bytecode uses different operations:** Instance fields normally use `getfield` and `putfield`, which require an object reference. Static fields use `getstatic` and `putstatic`, which resolve the declaring class. Static calls use `invokestatic` and carry no receiver as local variable `this`.
7. **Constants may disappear from runtime access:** A primitive or `String` compile-time constant can be copied into a caller's bytecode. Changing the library constant without recompiling the caller may leave the caller using the old value.
   
This explains why static state is shared only inside one loaded class identity, why initialization order matters, and why static initialization is safe but later static mutations require their own concurrency control.

#### Tricky interview questions
**Q: Can a static method access an instance field?**
Not directly. An instance field belongs to a particular object, but a static method is invoked on the class and receives no implicit this reference.
The compiler therefore does not know which object's field to read.
```java
class User {
  String name = "Sam";
  static void printName() {
    // System.out.println(name); // compile-time error
    User user = new User();
    System.out.println(user.name); // valid: the object is explicit
  }
}
```

A static method can still access static fields directly because those fields belong to the class. Passing an object into a static method also makes its instance state accessible through that reference.

**Q: Can static methods be overridden?**
No. A subclass may declare a static method with the same signature, but this is **method hiding**, not overriding. The compiler chooses the method from the reference or class name used at the call site; the JVM does not use runtime polymorphic dispatch for invokestatic.
```java
class Parent {
  static void show() {
    System out-printin("Parent");
  }
}
class Child extends Parent {
  static void show() { System.out.println("Child");
  }
}
Parent value = new Child();
value.show(); // Parent: compile-time type-is Parent
Child.show(); // child
```

Calling a static method through an object is legal but misleading. Prefer `Parent.show()` so the compile-time selection is obvious. By contrast, overridden **instance** method would call the child's implementation for `new Child()`.

**Q: Is a static field always one value for the entire JVM**
No. There is one copy per **loaded class identity**, not necessarily one per JVM process. A JVM identifies a class using both its fully qualified name and the class loader that defined it.
For example, two application servers or plugin class loaders can each load `com.example.Cache`. The JVM treats them as different classes, so each receives its own static fields and static initialization. This also means their objects are not assignment-compatible even though the class names match.
Within one ordinary application class loader, however, all instances normally share the same static field.

**Q: When do static blocks and instance initialization run?**
For the first `new Child()`, the usual order is:

1. Parent static fields and static blocks, in source order.
2. Child static fields and static blocks, in source order.
3. Parent instance fields and instance initializer blocks, in source order.
4. Parent constructor body.
5. Child instance fields and instance initializer blocks, in source order.
6. Child constructor body.
   
The static steps occur once for each loaded class. Steps 3-6 occur for every new object. On the second "new Child()", static initialization is skipped because both classes are already initialized.
Loading a class does not always initialize it immediately. Initialization is triggered by **active use**, such as object creation, a static method call, or access to a non-constant static field. Reading an inlined compile-time constant may not run the static block.

**Q: Are static initialization blocks thread-safe?**
Their one-time execution is thread-safe. The JVM allows only one thread to initialize a class; another thread that actively uses the same class waits until initialization completes. After successful initialization, its writes are visible to threads that subsequently use the class.
```java
class Registry {
  static final Map<String, String> VALUES = new HashMap<>();
  static {
    VALUES.put ("region", "US"); // protected during initialization
  }
}
```

This guarantee protects construction of `VALUES`, not all future access. Concurrent calls to `VALUES.put()` after initialization are still unsafe because `HashMap` is mutable and not thread-safe. Use immutable state, synchronization, or a concurrent collection for later mutations. Circular static initialization can also expose default values and should be avoided.

### 2. `final`, `finally`, and `finalize`

These keywords have unrelated purposes.

#### `final`
- A **final variable** can be assigned only once.
- A **final reference** cannot point to another object, but the referenced object may still be mutable.
- A **final method** cannot be overridden.
- A **final class** cannot be extended.
- A blank final field must be assigned by every constructor path.

```java
final List<String> names = new ArrayList<>();
names.add("A"); // valid: object changes
// names = new ArrayList<>(); // invalid: reference changes
```

`final` helps express intent, but it does not by itself make an object immutable or a field safely visible between threads. Properly constructed objects receive special Java Memory Model visibility guarantees for their final fields, but mutable state still needs safe publication and synchronization.

#### `finally`
A `finally` block is attached to `try` and normally runs whether execution succeeds, returns, or throws. Use it for cleanup when try-with-resources is not applicable.
```java
try {
  return readValue();
} finally {
  auditRead();
}
```

It may not run if the JVM or process terminates abruptly, for example through "System.exit" a crash, or forced termination. Never return or throw casually from `finally`: it can replace a pending return value or hide the original exception.

#### `finalize`
`Object.finalize()` was an unpredictable GC-triggered cleanup hook. It is deprecated for removal and should not be used. There is no guarantee when, or even whether, it runs. Use try-with-resources and `AutoCloseable` for deterministic cleanup;  `Cleaner` is only a safety net for exceptional cases.
