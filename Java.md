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
7. [`ReentrantLock`, ReadWriteLock, StampedLock](#7-reentrantlock-readwritelock-stampedlock) - When to leave 'synchronized for timeouts, fairness, read/ write, or optimistic reads.
8. [`final` Fields and Safe Publication](#8-final-fields-and-safe-publication) - The "Final' -field guarantee, 'this -escape bugs, and how to publish objects safely.
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

## 1. Why JVM Mastery Matters at SDE3
At SDE3, you are expected to:

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
ーーー
## 2. JVM Architecture: Class Loader, Runtime Data Areas, Execution Engine

### 2.1 Class Loading Lifecycle
Every class goes through:
1. Loading: bytecode bytes become a "Class" object.
2. Linking:
- Verification
- Preparation
- Resolution
3. Initialization: static initializers execute.
Class loaders follow parent delegation:
- Bootstrap ClassLoader
- Platform ClassLoader
- Application ClassLoader
Why this matters:
- ClassLoader leaks in app servers.
- Duplicate classes loaded by different loaders are different types.
- Plugin architectures rely on custom class loaders.

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
**verification** (bytecode is type-safe and cannot corrupt the JVM - the reason Java can run untrusted code), **preparation* (static fields get default values: `0`/`null`/`false`), and **resolution** (symbolic references → direct references). Only then does *initialization* run static blocks and assign real static values.

**Parent delegation explained:** when a loader is asked for a class, it first asks its *parent*, and only loads the class itself if the parent can't.
This guarantees core classes (`java.lang-String` ) are always loaded by the bootstrap loader - you cannot spoof `java.lang.*`. The flip side: a class's
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

## 5, volatile: What It Guarantees and What It Does Not

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
