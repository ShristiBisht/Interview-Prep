# JVM & Concurrency Deep Dive for SDE3 (Beginner -> Senior)
> Audience: Engineers who know Java basics and want SDE3-level depth in JVM internals, concurrency, performance, and production debugging-
## Table of Contents
> Click any title to jump to that section.
1. [Why JVM Mastery Matters at SDE3](#1-why-jvm-mastery-matters-at-sde3) - Why JVM depth still matters when frameworks hide it; the SDE3 mindset of measuring under load.
2. [JVM Architecture: Class Loader, Runtime Data Areas, Execution Engine](#2-jvm-architecture-class-loader-runtime-data-areas-execution-engine) - Class loading lifecycle, memory areas, interpreter vs C1/C2 JIT, and deoptimization.
3. [Java Memory Model (JMM): Visibility, Ordering, Atomicity](#3-java-memory-model-imm-visibility-ordering-atomicity) - Why threads see stale state; the hardware reality behind reordering and caching.
4. [`happens-before` Rules You Must Internalize](#4-happens-before-rules-you-must-internalize) - The edges (lock, volatile, start, join, transitivity)
that make concurrency correct.
5. [`volatile`: What It Guarantees and What It Does Not](#5-volatile-what-it-guarantees-and-what-it-does-not) - Visibility/ordering via barriers, why "count++" is still broken, double-checked locking.
6. [`synchronized`, Monitors, and Lock States](#6-synchronized-monitors-and-lock-states) - Monitor enter/exit, mutual exclusion + visibility + reentrancy, and lock-object pitfalls.
7. [`ReentrantLock`, ReadWriteLock, StampedLock](#7-reentrantlock-readwritelock-stampedlock) - When to leave `synchronized` for timeouts, fairness, read/ write, or optimistic reads.
8. [`final` Fields and Safe Publication](#8-final-fields-and-safe-publication) - The `final` -field guarantee, `this` -escape bugs, and how to publish objects safely.
9. [Escape Analysis, Stack Allocation, and JIT Effects](#9-escape-analysis-stack-allocation-and-jit-effects) - Scalar replacement, lock elision, and why naive benchmarks measure nothing.
10. [Garbage Collection Fundamentals](#10-garbage-collection-fundamentals) - Generational model, minor/major GC, stop-the-world, and the metrics that predict health.
11. [G1 GC Deep Dive](#11-g1-gc-deep-dive) - Region-based "Garbage First", pause-time goals, humongous-object pitfalls, key flags.
12. [ZGC and Shenandoah: Low-Latency Collectors](#12-zgc-and-shenandoah-low-latency-collectors) - Concurrent relocation via colored/Brooks pointers and the throughput tradeoff.
13. [GC Tuning in Production](#13-gc-tuning-in-production) - Evidence-first discipline; most "GC problems" are really application problems.
14. [Threading Model: 05 Threads, Context Switching, Scheduling](#14-threading-model-os-threads-context-switching-scheduling) - 1:1 05 mapping costs, over-subscription signature, and pool sizing.
15. [Virtual Threads (Project Loom)](#15-virtual-threads-project-loom) - Mount/unmount mechanics, millions of cheap threads, and the pinning gotcha.
16. [Structured Concurrency and Scoped Values](#16-structured-concurrency-and-scoped-values) - Bounded task lifecycles, unified cancellation, and `ScopedValue` vs `ThreadLocal`.
17. [`CompletableFuture` Deep Dive](#17-completablefuture-deep-dive) - Composition, error handling, timeouts, and the common async pitfalls.
18. [Thread Pools and Executor Design](#18-thread-pools-and-executor-design) - "ThreadPoolExecutor" anatomy, the queue-fills-first rule, and rejection policies.
19. [Lock-Free Programming: CAS, VarHandle, ABA, False Sharing](#19-lock-free-programming-cas-varhandle-aba-false-sharing) - How CAS retry loops work, ABA fixes, and cache-line contention.
20. [High-Throughput Data Structures (ConcurrentHashMap, "LongAdder", Queues)](#20-high-throughput-data-structures) - Concurrency-friendly maps, counters, and queue choices.
21. [Contention, Backpressure, and Throughput Engineering](#21-contention-backpressure-and-throughput-engineering) - Why contention collapses throughput and how to shed load gracefully.
22. [Common Concurrency Bugs in Real Systems](#22-common-concurrency-bugs-in-real-systems) - Coffman deadlock conditions, livelock vs starvation, and ThreadLocal leaks.
23. [Debugging and Observability for JVM Concurrency](#23-debugging-and-observability-for-jvm-concurrency) - Signals to watch and how to triage thread dumps.
24. [JVM Performance Toolchain (JFR, async-profiler, jod, jmap)](#24-jvm-performance-toolchain) - Low-overhead profiling and the commands for live diagnosis.
25. [Practical SDE3 Incident Playbooks](#25-practical-sde3-incident-playbooks) - Step-by-step responses to latency spikes, hot CPU, and slow memory leaks.
26. [Interview-Grade Questions and Model Answers](#26-interview-grade-questions-and-model-answers) - Crisp answers to the most-asked concurrency questions.
27. [Quick Reference Cheat Sheet](#27-quick-reference-cheat-sheet) - Primitive and GC decision guides plus golden rules.
28. [Core Java Language Mastery (8 to 21)](#28-core-java-language-mastery-8-to-21) - Semantic, not just syntactic, command of modern language features.
29. [Generics, Type Erasure, and Type-Safety Traps](#29-generics-type-erasure-and-type-safety-traps) - Erasure consequences, PECS variance, and heap pollution.
30. [Collections and Stream API Internals](#30-collections-and-stream-api-internals) - "HashMap /1ist internals and where streams help or hurt.
31. [I/O, NIO, Filesystem, and Networking Internals](#31-io-nio-filesystem-and-networking-internals) - Blocking vs channels/buffers, "ByteBuffer lifecycle, and TCP/TLS basics.
32. [Build and Dependency Management (Maven/Gradle)](#32-build-and-dependency-management-mavengradle) - Transitive mediation, BOMs, reproducible builds, and SBOMs.
33. [Testing, Benchmarking, and Quality Engineering](#33-testing-benchmarking-and-quality-engineering) - Test pyramid, JMH essentials, and concurrency stress testing.
34. [Databases and Persistence Internals for Java Engineers](#34-databases-and-persistence-internals-for-java-engineers) - Indexing, isolation, deadlocks, and ORM reality checks.
35. [Distributed Systems Patterns for Java Services](#35-distributed-systems-patterns-for-java-services) - Idempotency, outbox, saga, caching, and resilience patterns.
36. [Java Security Internals and Secure Coding](#36-java-security-internals-and-secure-coding) - Validation, secure deserialization, crypto/TLS, and common pitfalls.
37. [API Design, Backward Compatibility, and Evolution](#37-api-design-backward-compatibility-and-evolution) - Contracts, versioning, and stable error models for multi-team growth.
38. [Runtime Operations, SLOs, and Incident Leadership](#38-runtime-operations-slos-and-incident-leadership) - SLIs/SLOs, error budgets, incident command, and postmortems.
39. [Architecture, Mentoring, and SDE3 Influence Skills](#39-architecture-mentoring-and-sde3-influence-skills) - Design docs, reviews, and the senior
multiplier effect.
40. [90-Day SDE3 Java Mastery Plan](#40-90-day-sde3-java-mastery-plan) - A staged plan from foundation hardening to senior execution.
41. [Hands-On Labs (Build to Learn Internals)](#41-hands-on-labs-build-to-learn-internals) - Ten labs that turn mental models into measured results.
42. [Interview Question Bank (Sections 28 to 40)](#42-interview-question-bank-sections-28-to-40) - Breadth questions across language, systems, and leadership.
43. [Company-Tier SDE3 Java Checklist](#43-company-tier-sde3-java-checklist) - Readiness signals by hiring bar plus a self-assessment scorecard.
44. [WebSocket Internals for Java Engineers](#44-websocket-internals-for-java-engineers) - Long-lived transport, backpressure, scaling, and reconnect/ auth semantics.
45. [Everything About Java: Version-by-Version (Java 8 to 25)](#45-everything-about-java-version-by-version-java-8-to-25) - Release-by-release feature tour with LTS migration guidance.
46. [Core Java Interview Deep Dives (Where Interviews Go Deep)](#46-core-java-interview-deep-dives-where-interviews-go-deep) - Mechanism + tradeoff + gotcha for the topics interviewers drill.
47. [Java Streams Deep Dive (Producers, Consumers, and Real Examples)](#47-java-streams-deep-dive-producers-consumers-and-real-examples) - Pipeline model, sources/collectors, parallelism, and worked examples.
48. [JVM Internals Deep Dive (From Source to Machine Code)](#48-jvm-internals-deep-dive-from-source-to-machine-code) — The full path from `-.java` down to executing machine code.
49. [Hardware Foundations: CPU, Cache Coherence, and Memory Orderingl(#49-hardware-foundations-cpu-cache-coherence-and-memory-ordering) - The x86/ARM reality that makes `volatile` and barriers necessary.
50. [Memory Barriers, VarHandle, and the JMM Under the Hood](#50-memory-barriers-varhandle-and-the-jmm-under-the-hood) - How `volatile` / `synchronized` / `Final` map to hardware fences on x86 vs ARM.
51. [Locks, Monitors, and AQS at the Bit Level](#51-locks-monitors-and-aqs-at-the-bit-level) - Mark-word encoding, lock inflation, `ObjectMonitor`, and `AbstractQueuedSynchronizer`.
52. [Allocation, GC Barriers, and Colored Pointers Under the Hood](#52-allocation-gc-barriers-and-colored-pointers-under-the-hood) - TLAB bump allocation, card tables, SATB, and ZGC/Shenandoah barriers.
53. [Reading Real JIT Output (Interpreter + Assembly Walkthrough)](#53-reading-real-jit-output-interpreter--assembly-walkthrough) - Template interpreter
dispatch, inline caches, `-XX:+PrintAssembly` walkthrough.


## 1. Why JVM Mastery Matters at SDE3
At SDE3, you are expected to:

- Design systems that are correct under concurrency, not only in single-threaded tests.
- Diagnose production incidents where failures happen only under load.
- Reason about latency distributions (p50/p95/p99), not just average response time.
- Make tradeoffs between throughput, latency, memory footprint, and complexity.

Frameworks reduce boilerplate, but they do not remove JVM realities:
- Threads still schedule on CPUs.
- Memory ordering still matters.
- GC pauses still impact tail latency.
- Contention still destroys throughput.
SDE3 mindset: if it is not measured, it is an assumption.

### 1.1 Latency Percentiles (p50 / p95 / p99 / p999) - What They Are and Why They Matter

**p50, p95, p99** are **percentiles** of a latency distribution. If you sort every request's response time from fastest to slowest:

- **p50 (median)** - 50% of requests were **at or below** this latency. Half your traffic is faster, half is slower. This is the "typical" experience.
- **p95** - 95% of requests were at or below this latency. Only 1 in 20 requests was slower. This starts capturing the *bad* experiences.
- **p99** - 99% of requests were at or below this latency. Only 1 in 100 was slower. This is the "tail" - where GC pauses, lock contention, and slow downstream calls show up.
- **p999 (three-nines)** - 999 in 1000 requests were at or below. Captures rare but user-impacting spikes.
- **p9999** - used at very high scale (hyperscale services) where even 1 in 10,000 matters.

#### Why the Average (Mean) Lies

Suppose 100 requests: 99 take 10 ms, one takes 2000 ms.
- **Average** = (99 x 10 + 2000) / 100 = **29.9 ms** - looks healthy.
- **p50** = 10 ms
- **p99**= ~2000 ms - one user waited **2 seconds**.

The average *hides* the outlier. At scale, that outlier is not one user - it is thousands per hour. **Averages are dangerous because a few very slow requests barely move them, but ruin user experience.**

#### Why Tail Latency Matters at Scale (Fan-Out Amplification)

Modern services fan out: one user request calls 10, 50, or 100 backend services in parallel and waits for all of them.

If each backend has p99 = 100 ms (i.e., 1% chance a call is slow):
- **1 backend call** -> 99% chance the user request is fast.
- **10 parallel backend calls** -> probability *all* are Fast = 0.99^10 = **90%**. So **10% of user requests hit the tail**.
- **100 parallel calls** -> 0.99^100 = **37%**. So **63% of user requests hit the tail**.

This is the classic result from Jeff Dean's *"The Toil at Scale"*: **your p99 becomes your users' median at fan-out scale**. Optimizing average latency is meaningless when architecture amplifies the tail.

#### What Each Percentile Tells You Diagnostically
| Percentile | What It Reveals |
|---|---|
|**p50**| Baseline health. Steady-state performance of the happy path. |
|**p95**| Normal-but-slow requests. Cache misses, mild contention, warm-up effects. |
|**p99**| Real tail issues. GC pauses, lock contention, connection pool waits, retries. |
|**999**| Rare pathologies. STW GC, safepoint bias, host-level noise (noisy neighbor), thread pool starvation. | 
|**max** | Almost useless as an SLO - dominated by single-event outliers. Track it, don't gate on it. |

#### How SLOs Are Written

Real SLOs are always percentile-based, never average-based:
- *"p99 request Latency ‹ 200 ms over a 5-minute window, 99.9% of the time."*
- *"Average Latency ‹ 100 ms."* (Meaningless - hides tail.)

Error budgets (Section 38) are computed against these percentile SLOS.

#### Where the Tail Comes From in a JVM Service

The tail (p99+) is almost always one of:
1. **GC pauses** - a stop-the-world event freezes the JVM for tens to hundreds of milliseconds. Every in-flight request pays that cost. This is *the* #1 tail-latency driver in Java, and why ZGC/Shenandoah (Section 12) exist.
2. **Lock contention** - a thread waits on a "synchronized" block held by someone else. Under load, wait queues grow non-linearly.
3. **Executor / thread-pool saturation** - the request sits in the work queue before a worker even picks it up (queueing delay, not service time).
4. **Downstream slow calls** - a database, cache, or HTTP dependency hit *its* tail; you inherited it.
5. **Connection pool exhaustion** - the request waits for a JDBC/HTTP connection to free up.
6. **JIT deoptimization / compilation** - a rare recompile stalls execution.
7. **Safepoint delays** - the JVM waits for all threads to reach a safepoint before GC (long-running loops without safepoint polls extend this).
8. **OS-level noise** - CPU throttling, page faults, noisy neighbors in containers, network jitter.

#### How You Actually Measure Percentiles

You **cannot** compute percentiles by averaging averages. You need the full distribution (or an approximation of it):
- **Histograms** - bucket every request into latency bins (e.g., `HdrHistogram`, Micrometer's `Timer` with `publishPercentileHistogram`. Percentiles are read off the histogram.
- **Sketches** - approximate distributions with bounded error (e.g, `t-digest`, DDSketch). Used by Datadog, Prometheus (with caveats) -
- **Sampling** - capture a random subset of raw latencies. Cheap, but poor tail resolution.
  
**Never** compute percentiles from pre-averaged data (e-g, averaging per-minute averages). The math does not compose - you will silently under-report the tail. Percentiles must be aggregated from raw buckets/sketches.

#### The Coordinated Omission Trap
A subtle but important benchmarking bug: if your load generator waits for each response before sending the next request, then when the server stalls (e.g., a GC pause), the generator *stops sending*. The requests that *would have* arrived during the stall are never measured - so the stall's impact on latency is silently omitted. Tools like `wrk2` and `HdrHistogram` correct for this by measuring latency against the *intended* send time, not the actual send time. Ignoring coordinated omission makes p99 look 10-100x better than reality.
#### Quick Mental Model
- **p50** answers: *"How fast is my service normaLLy?"*
- **p99** answers: *"How bad does it get for real users?*
- **p999** answers: *"What's my worst-case that still happens often enough to care?"*
At SDE3, if someone asks *"is the service healthy?"* and you answer with an average, you have already failed the seniority signal.

---

## 2. JVM Architecture: Class Loader, Runtime Data Areas, Execution Engine

### 2.1 Class Loading Lifecycle
Every class goes through three JVM-mandated phases before its code can execute. Phases are **lazy** - a class is only loaded when it is first *actively used* (`new`, static access, `Class.forName`, subclass initialization, etc.). Merely mentioning a type name (e.g-, as a field type) does not trigger loading.

#### Phase 1 - Loading
The JVM reads the raw `.class` bytes (from disk, JAR, network, or generated in-memory) and creates an in-memory `java.lang-Class<?>` object representing the type. The `ClassLoader` is what actually locates and reads those bytes; the JVM itself does not know where the bytes came from.
Key facts:
- The result is a single `Class` object per (fully-qualified name, defining ClassLoader) pair.
- The `Class` object lives in the **heap**, but the class *metadata* (method tables, constant pool, bytecode) lives in **Metaspace** (native memory, since Java 8; before that, PermGen).
- Loading can trigger recursive loading of the superclass and superinterfaces (they must be loaded before this class can be linked).

#### Phase 2 - Linking (Verification + Preparation + Resolution)
**Verification** - the JVM proves the bytecode is *safe*:
- Stack map frames are consistent (types match at every branch target) -
- No jumps outside method bounds, no illegal type conversions, no access to private members from outside.
- The verifier is **the reason Java can safely run untrusted code** (applets, plugin JARs). If verification fails, you get `VerifyError`.

**Preparation** - static fields are allocated and given their **default JVM values** (not their source-code initializers yet):

  
| Field type | Default at preparation |
|---|---| 
|`int`, `short`, `byte`, `char` | `0`|
| `long` | `0L` |
| `Float` | `0.0F` |
| `double` | `0.0d` |
| `boolean` | `False` |
| reference | `null` |

Note: `static final` **primitive/String** constants known at compile time are folded into the constant pool and appear "set" from the very start - this is why they can be safely read even before initialization.

**Resolution** - symbolic references in the constant pool (e.g., `"java/util/List"`, `"add: (Ljava/lang/Object;)Z"`) are replaced with **direct references** (pointers to actual `Class`, method, or field structures). Resolution can be lazy - the JVM may defer it until the reference is first used.

#### Phase 3 - Initialization

The **only** phase your code controls. The JVM runs the class's `‹clinit>` method - a synthetic method that contains:
- Static field initializers, in source order.
- All `static {... }` blocks, in source order.

Rules interviewers probe:
- `‹clinit>` runs **exactly once** per `Class` object, and the JVM guarantees this with a lock on the `Class` - no explicit synchronization needed.
(This is why the *initialization-on-demand holder idiom* is a correct singleton.)
- Initialization of a class triggers initialization of its **superclass** first (but not its superinterfaces, unless a `default` method is inherited).
- If `‹clinit>` throws, the class is marked *erroneous* - every subsequent access throws `NoClassDefFoundError`, forever, for that loader. Common in production: a static block reads a config file that is missing, and every request thereafter fails with a confusing `NoClassDefFoundError` instead of the original `IOExcention`

#### The Full Sequence, Visualized
```
Loading   -->   Verification   -->   Preparation   -->   Resolution (may be lazy)   -->   Initialization (runs < clinit>)
bytes            safe?                static fields        symbolic refs                    your code runs (once)
  -> Class         -> VerifyError        = defaults            -> direct refs
```

#### Class Loaders and Parent Delegation
Since Java 9, the standard hierarchy is:
| Loader | Loads what | Written in |
|---|---|---|
| **Bootstrap** | Core JDK modules (`java.base`, `java.logging`, ...) | Native code (C++) - has no Java `ClassLoader` object; `String.class.getClassLoader()` returns `null` |
| **Platform** (was "Extension" before Java 9) | Additional JDK modules (`java-sql`, `java-xml`, ...) | Java |
| **Application** (a.k.a. System) | Your app classes from `-cp` / module path | Java |
| **Custom** (Framework/plugin/web-app) | Anything else - plugin JARs, hot-reloaded code, O5Gi bundles, Tomcat webapps | Java |

**Parent delegation** - when asked to load a class, a loader **first delegates to its parent**, and only loads the class itself if the parent returns `null`. Effect:
- Core classes (`java.lang-String`) are *always* loaded by the bootstrap loader. You cannot ship your own `java.lang.String` on the classpath and have it override the real one - the bootstrap loader will win first. This is a **security guarantee**, not a convention.
- The application loader can see everything platform + bootstrap loaded, but not the other way around (parents cannot see children).

```
        Bootstrap
          ^ delegates first
        Platform
          ^ delegates first
        Application
          ^ delegates first
        Custom (Tomcat webapp / Spring Boot fat-jar / plugin)
```

Some frameworks *invert* delegation deliberately (e.g., Tomcat's `WebappClassLoader` tries itself first for app classes) so a webapp's bundled library version wins over the container's version. This is legal but powerful - and the source of many "works locally, fails in prod" mysteries.

#### Class Identity - the Rule Interviewers Test

› **A class's runtime identity is the pair `(fully-qualified name, defining ClassLoader)`, not just the name.**

Consequences that trip up senior engineers:
- `com.acme.Foo` loaded by loader A and `com.acme.Foo` loaded by loader B are **different types**. Casting one to the other throws `ClassCastException` even though the source is identical.
- `static` fields are per-`Class`, not per-name - so a class loaded twice has *two* independent copies of its statics. Singletons "leak" across plugin reloads for exactly this reason.
- `instanceof` compares against a specific `Class` object; a plugin can pass "the same" type to the host and fail an `instanceof` check.

#### Why This Matters in Production
1. **ClassLoader / Metaspace leaks in app servers.** When you redeploy a webapp, the container discards the old `WebappClassLoader` so its classes can be GC'd From Metaspace. But if *anything* still holds a reference into that loader - a `ThreadLocal` on a pooled thread, a JDBC driver registered in `DriverManager`, an MBean, a static cache in a parent-loaded library, a thread the app started and never stopped - the entire loader (and every class it defined) is retained. After a few redeploys, Metaspace Fills and you get `OutOfMemoryError: Metaspace`. This is the #1 real-world cause of "we restart Tomcat every night."
2. **Plugin architectures.** OSGi, JPMS layers, Spring Boot's `LaunchedURLClassLoader`, Intelli] plugins - all rely on custom loaders to give each plugin its own namespace so plugins can bundle conflicting library versions without clashing.
3. **Duplicate-class bugs.** Same JAR appearing on both the container and the app classpath → two `Class` objects → confusing `ClassCastException` or "method not found" errors on reflection.
4. **Hot reload / dev-time tooling.** Spring DevTools, JRebel, and IDE hot-swap all work by discarding a classloader and loading a fresh one - which is why static state and cached `Class` references break under hot reload.
5. **Erroneous classes are permanent.** A failed `<clinit›` marks the class unusable *for that Loader's Lifetime*. Restart or a fresh loader is the only recovery.

#### Diagnostic Commands
```bash
# See every class loaded and by which loader
java -Xlog:class+load=info,class+init=info YourApp

# Live inspection
jcmd ‹pid› vM. classloader_stats # loader-by-loader class counts / bytes
jcmd ‹pid› GC.class_histogram | head # what's dominating memory
jcmd <pid> VM.metaspace # netspace conting me used / capacity
imap -clstats ‹ pid› # classloader statistics
```

If Metaspace grows unbounded across redeploys, a heap dump analyzed in Eclipse MAT with the **"Duplicate Classes"** and **"Classloader Leaks"** reports will point straight at the retaining reference.

### 2.2 Runtime Data Areas

- Heap: objects and arrays.
- Metaspace: class metadata.
- Java Stacks: stack frames per thread.
- Program Counter register: current instruction per thread.
- Native Method Stack: JNI/native calls.

### 2.3 Execution Engine

- Interpreter executes bytecode directly.
- JIT compiler (C1/C2) compiles hot code paths to machine code.
- Deoptimization can revert compiled code if assumptions break.
This is why warm-up matters in benchmarks.

### 2.4 How the Pieces Fit (the "why" behind the diagram)
**Class loading is lazy and ordered.** A class is loaded the first time it is actively used. *Linking* has three sub-steps interviewers probe:
**verification** (bytecode is type-safe and cannot corrupt the JVM - the reason Java can run untrusted code), **preparation** (static fields get default values: `0`/`null`/`false`), and **resolution** (symbolic references → direct references). Only then does *initialization* run static blocks and assign real static values.

**Parent delegation explained:** when a loader is asked for a class, it first asks its *parent*, and only loads the class itself if the parent can't.
This guarantees core classes (`java.lang.String` ) are always loaded by the bootstrap loader - you cannot spoof `java.lang.*`. The flip side: a class's
**identity is `(fully-qualified-name, ClassLoader)`**. The *same* `.class` loaded by two different loaders yields two incompatible types - the source of `ClassCastException`s in app servers/plugin systems, and of **metaspace leaks** when a redeployed app's loader is never GC'd because something still references its classes.

**The two-tier JIT:** code starts **interpreted**; hot methods are compiled by **C1** (fast compile, light optimization) and the hottest by **C2** (slow compile, aggressive optimization - inlining, escape analysis, loop unrolling). C2 makes *speculative* assumptions (e.g., "this call site is always
`ArrayList`"); if reality changes, the JVM **deoptimizes** back to the interpreter and recompiles. This tiered model is exactly why a cold JVM is slow and why **benchmarks must warm up** (Section 33) - you are otherwise measuring the interpreter, not production behavior.
## 3. Java Memory Model (JMM): Visibility, Ordering, Atomicity
JMM defines legal interactions between threads and memory.
Three core properties:
- Atomicity: operations complete as indivisible units.
- Visibility: one thread's write becomes visible to others.
- Ordering: constraints on reordering by compiler/CPU.
Without synchronization, each thread may cache values and observe stale state.
### Example: Stale Read

```java
class FlagExample {
  boolean ready = false;
  int data
  = 8;
  void writer() {
    data = 42;
    ready = true;
  }
  void reader() {
    if (ready) {
    // Could still see data == 0 without happens-before edge.
    System.out.println(data);
    }
  }
}
```

This can print 0 due to reordering/visibility.

### Why This Happens: The Hardware Reality

Modern hardware lies to you for speed. Three layers reorder your code:
1. **The compiler** (javac + JIT) reorders instructions for efficiency.
2. **The CPU** executes out-of-order and speculatively.
3. **Per-core caches** mean a write by thread A may sit in A's cache, invisible to thread B for a while.
   
So "thread A wrote `data = 42`, then `ready = true`" is **not** guaranteed to be seen in that order by thread B. The reader can observe `ready == true` 
but a *stale* `data == O`, because the two writes were reordered or `data`'s new value had not yet propagated to the reader's core.

### The Three Properties, Precisely
- **Atomicity** - an operation is indivisible. `int x= 5` is atomic. `x++` is **not** (it is read → add → write, three steps). `long`/`double` writes are not even guaranteed atomic without `volatile` on 32-bit JVMs.
- **Visibility** - when one thread writes, does another *see* it? Without synchronization, possibly never (the value sits in a register/cache).
- **Ordering** - can operations be reordered? Yes, unless a memory barrier forbids it.

The fix for  `FlagExample`: make `ready` volatile. Then `data = 42` (program order) → `ready = true` (volatile write) » reader sees `ready` (volatile read) → reader sees `data = 42` (transitivity). The volatile write "publishes" everything that happened before it.

---

## 4. happens-before Rules You Must Internalize
Key rules:
1. Program order rule: within a thread, statements happen in order.
2. Monitor lock rule: unlock on monitor happens-before subsequent lock on same monitor.
3. Volatile rule: write to volatile happens-before subsequent read of that volatile.
4. Thread start rule: actions before `Thread start()` happen-before actions in started thread.
5. Thread join rule: actions in thread happen-before successful return from `join()`.
6. Transitivity: if A happens-before B and B happens-before C, then A happens-before C.

If you cannot draw the happens-before edges, your concurrency correctness is a guess.

### How to Use These Rules
`happens-before` is the JMM's formal promise: "if X happens-before Y, then X's memory effects are visible to Y, and X appears to occur before Y." If you
**cannot draw a happens-before edge** between a write and a read, the read may legally see a stale value.

The edges you actually rely on in practice:
- **Monitor lock** - a lock *release* happens-before any later *acquire of the same Lock*. This is why `synchronized` gives visibility, not just mutual exclusion.
- **Volatile** - a write to a volatile happens-before any later read of that *some* volatile (the key publishing mechanism).
- **Thread start** - everything before `t.start()` is visible to the new thread.
- **Thread join** - everything the thread did is visible after `t.join()` returns.
- **Transitivity** - chains compose: A+B and B+C gives A->C. (This is how a single volatile write publishes all the plain writes before it.)

**Worked example - safe publication via transitivity:**
```java
int data = 0;
volatile boolean ready = False;

// Writer thread
data = 42; // (1) plain write
ready = true; // (2) volatile write - happens-before any read of ready

// Reader thread
if (ready) { // (3) volatile read - sees (2)
  use(data): // (4) guaranteed to see data == 42 via (1)→(2)→(3)→(4)
}
```

---

## 5. volatile: What It Guarantees and What It Does Not

`volatile` guarantees:
- Visibility of writes to all threads.
- Ordering around volatile operations (memory barriers).

`volatile` does not guarantee:
- Atomic compound actions ("count++" is still non-atomic).
- Mutual exclusion.

Good uses:
- Shutdown flags.
- Double-checked locking with "volatile singleton reference.
- Sequence/version publication.

Bad uses:
- Coordinating complex shared mutable structures without additional synchronization.

### The Mechanism
A volatile write inserts a **store barrier** (no earlier write can move after it) and a volatile read inserts a **load barrier** (no later read can move before it). That is what creates the ordering and visibility guarantees.
What it does **not** give you is atomicity of compound actions:
```java
volatile int counter;  
counter++;  // STILL broken under concurrency: read, +1, write are 3 steps
```

Two threads can both read `5`, both write `6` - a lost update. For atomic counters use `AtomicInteger` / `LongAdder`; for invariants spanning multiple fields use a lock.

**Canonical correct use - double-checked locking:**
``` java
class Holder {
  private static volatile Config instance;  // volatile is essential
  static Config get() {
    Config c = instance;
    if (c == null) {
    synchronized (Holder-class) {
      c = instance;
      if (c == null) instance = c = new Config();
    }
    return c;
  }
}
```

Without `volatile`, another thread could see a non-null reference to a **half-constructed** `Config` (the reference published before the constructor's writes were visible).

---

## 6. synchronized, Monitors, and Lock States
`synchronized` uses monitor enter/exit bytecodes.

Properties:
- Mutual exclusion.
- Visibility guarantees on lock acquire/release.
- Reentrant (same thread can acquire same lock repeatedly)
  
Historically lock optimizations included biased locking and lightweight locking. In modern JDKs, biased locking has been removed; still, monitor optimizations exist and evolve.

### Typical Pitfall

Synchronizing on mutable/public lock objects:

```java
object lock = new Object();  // If lock reference changes, synchronization is broken.
```

Best practice: private Final lock or synchronize on `this` only when class boundaries are controlled.

### What synchronized Actually Provides
Every Java object has an associated **monitor**, `synchronized` compiles to `monitorenter` /`monitorexit` bytecodes around the block, giving three guarantees:
- **Mutual exclusion** - only one thread holds the monitor at a time.
- **Visibility** - acquiring the lock sees all writes made before the *previous* release of the same monitor (the monitor-lock happens-before edge).
- **Reentrancy** - the same thread can re-acquire a monitor it already holds, preventing self-deadlock in recursive/nested calls.

**Why the pitfall matters:** if the lock reference can change, two threads may lock *different* objects and both enter the critical section - broken mutual exclusion. Always:
```java
private final Object lock = new Object(); // final reference, never reassigned
void update() { synchronized (lock) { /* critical section */ }}
```
Avoid `synchronized(this)` on classes whose instances are exposed (callers could lock on your object and cause deadlock) and never lock on a `String` literal or boxed primitive (they are shared/interned).

---

## 7. ReentrantLock, ReadWriteLock, StampedLock



private Final Reentrantlock lock = new ReentrantLock(=


private final Condition notEmpty = lock. newCondition();


private final Condition notFull = lock newCondition();


private final Object[] slots;



### 7.1 The Decision Table

| Need | Use | Why |
|---|---|---|
| Simple mutual exclusion, small critical section | "synchronized | JVM optimises it; impossible to leak a lock |
| Need "tryLock', timeout, or interruptibility | "ReentrantLock | synchronized cannot do any of these | 
| Need fairness (FIFO acquisition) | "ReentrantLock(true)* | synchronized is barging-friendly - no FIFO guarantee | 
| Multiple wait conditions (producer / consumer) | "ReentrantLock° + "Condition' | Cleaner than a single monitor with "notifyAll | 
| Reads vastly outnumber writes; long critical sections | "ReentrantReadWriteLock' | Concurrent readers | 
| Rare writes; readers should skip locking entirely | 'StampedLock' (optimistic) | Cheapest read path in the JDK | 
| Simple shared state without any blocking | 'Atomic* / AtomicReference<Snapshot> | No lock at all (Section 3.6) |

### 7.2 ReentrantLock - the workhorse

```java
private final ReentrantLock lock = new ReentrantLock();
private final Condition notEmpty = lock.newCondition();
private final Condition notFull = lock newCondition();
private final object[] slots;
private int head, tail, count;

void put (Object x) throws InterruptedException {
  lock.lock(); // ALWAYS pair with try/finally
  try {
    while (count = slots.length) notFull-await();
    slots[tail] = x;
    tail = (tail + 1) % slots. length;
    count++; notEmpty-signal(); // wake exactly one taker - safe now
  } finally {
    lock unlock();
  }
}
Object take() throws InterruptedException {
  lock.lockO;
  try {
    while (count = 0) notEmpty-await();
    Object x = slots[head]; slots[head] = null;
    head = (head + 1) % slots.length;
    count--;
    notFull-signal();  // wake exactly one putter
    return x;
  } finally {
  lock unlock();
 }
}
```

**Two `Condition`s let you use `signal` instead of `signalAll`** - you wake exactly the right kind of waiter. `ArrayBlockingQueue` is literally this code.

**What Reentrantlock gives you that `synchronized` cannot:**
- `tryLock()` - non-blocking attempt. Returns `false` immediately if the lock is held.
- `tryLock(timeout, unit)` - bounded wait. Returns `false` on timeout, allowing recovery instead of unbounded blocking.
- `lockInterruptibly()` - the waiter can be `Thread interrupt()`ed while blocked. `synchronized` waiters are **not** interruptible - you cannot cancel them.
- `newCondition()` - multiple wait queues, one per logical condition.
- Fairness constructor - `new ReentrantLock(true)` acquires in FIFO order.
  
**The one drawback:** forgetting `unlock()` in a `finally` leaks the lock forever, and the JVM will not help you. IDEs and static analysers catch most cases - use them.

**trylock deadlock-avoidance pattern:**

```java
boolean transfer(Account from, Account to, long amt) throws InterruptedException {
  while (true) {
  if (from.lock.tryLock()) {
    try {
      if (to.lock.tryLock()) {
      try {
      From-debit(amt); to.credit(amt);
      return true;
      } finally { to.lock.unlock(); }
    } Finally { from.lock.unlock(); }
  }
  // Back off with jitter to avoid livelock
  Thread.sleep(ThreadLocalRandom.current()-nextInt(1, 5));
  }
}
```
No global lock ordering needed; deadlock is impossible - either thread that fails its second `tryLock` releases the first and retries.

### 7.3 ReentrantReadWriteLock - when reads dominate
```java
  private Final ReentrantReadWriteLock rw = new ReentrantReadWriteLock();
  private final Lock r = rw.readLock();
  private final Lock w = rw.writeLock();
  private final Map<String, String> cache = new HashMap():
  String get(String k) {
    r-lock();
    try { return cache.get(k); }
    finally { r.unlock(); }
  }
  void put(String k, String v) {
    w.lock():
    try { cache-put(k, v); }
    finally { w.unlock(); }
  }
```

Many readers may hold the read lock simultaneously; a writer holds the write lock exclusively. **Caveats:**

- **Writer starvation** in unfair mode under heavy read load - writers may wait forever. Use "new ReentrantReadwriteLock(true)* for fairness, at throughput cost.
- **Downgrading** (hold write + acquire read + release write) is legal and useful. **Upgrading* (hold read » acquire write) is **not** - two readers both trying to upgrade will deadlock.
- **Only worth it if the critical section is non-trivial.** For a simple "map-get, use 'ConcurrentHashMap* - the read-lock bookkeeping exceeds the work being protected.
- **Never do I/0 under the read lock.** All readers stall behind one slow reader.

### 7.4 StampedLock - optimistic reads for read-mostly state
Three modes: write, pessimistic read, and *optimistic read** (no actual lock).

```java
class Point {
  private final StampedLock sl = new StampedLock@:
  private double x, y;

  double distanceFromOrigin() {
    long stamp = s1. tryOptimisticReadO; //no lock - just a version stamp
    double cx = x, cy = У; // read Fields (may be inconsistent!)
    if (!s1.validate(stamp)) { // did a writer intervene?
      stamp = sl.readLock(); // fall back to real read lock
      try { cx = x; cy = y; }
      Finally { s1.unlockRead (stamp); }
    }
    return Math. hypot (cx, cy);
  }

  void move(double dx, double dy) {
    long stamp = s1.writeLock();
    try { x += dx; y += dy; }
    Finally { s1. unlockWrite(stamp); }
  }
}
```

Optimistic read is essentially free when writes are rare - no CAS, no fence beyond a plain volatile-like read of the stamp. Costs:

- **Not reentrant.** Recursive acquisition deadlocks.
- **Not condition-aware.** No "newCondition)".
- **Optimistic reads may see torn / inconsistent intermediate state.** Always сору fields to locals *before* calling validate', and never deneference an object read optimistically without first validating (else you may "NullPointerException on a stale reference).
- **Never call "Thread interrupt'** on a thread blocked in "StampedLock" - old versions had CPU spin bugs; modern versions are safer but the pattern is still niche.

Use it only when profiling proves  `ReentrantReadWriteLock` is your bottleneck.

### 7.5 Fairness - the trade you're actually making

- **Non-fair (default):** an arriving thread may barge ahead of already-queued waiters if the lock is momentarily free. Higher throughput; some threads can be starved for long periods.
- **Fair:** strict FIFO - every arriving acquirer joins the tail of the queue. Latency variance drops; throughput drops ~2-5x.

Fairness matters when a starved thread would violate an SLO (e.g., a high-priority write behind a torrent of reads). Otherwise leave it off - the throughput win of unfair mode is real.

### 7.6 Common Mistakes

1. **Forgetting `finally`.** Every `.lock()` must be paired with `.unlock()` in a `finally`- IDE live-templates exist - use them.
2. **Exposing the lock via a getter.** `getLock()` breaks encapsulation and lets external code deadlock you.
3. **Using `ReadWriteLock` for tiny critical sections.** The read-lock bookkeeping dominates the actual work. Prefer `ConcurrentHashMap`, `AtomicReference`, or `synchronized`.
4. **Holding any lock across an I/O call.** If the I/O stalls (network, disk, downstream service), every waiter stalls. Copy the data out, release the lock, then perform the I/0.
5. **Mixing lock types on the same state.** If some paths use `synchronized(this)` and others use a `Reentrantlock`, they do not exclude each other - they are completely independent monitors. Pick one and enforce it.

---
