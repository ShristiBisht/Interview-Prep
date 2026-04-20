# Java Program Execution: From Code to CPU Cycles
## A Senior HFT Developer's Guide to JVM Internals

---

## TABLE OF CONTENTS
1. The Journey Overview
2. Compilation Phase (javac)
3. Class Loading Mechanism
4. Bytecode Verification
5. Class Initialization & Static Fields
6. Method Invocation & Call Stack
7. JIT Compilation Strategy
8. Memory Management (Heap, Stack, Metaspace)
9. Garbage Collection
10. Thread Execution Model
11. JVM Optimizations (Inlining, Escape Analysis, etc.)
12. Real HFT Optimization Techniques
13. Profiling & Monitoring

---

## SECTION 1: THE JOURNEY OVERVIEW

When you run `java MyApplication`, you're starting an incredibly complex machine that:
- Dynamically loads classes on-demand
- Interprets bytecode initially
- Detects hot code paths
- Compiles them to native machine code
- Optimizes based on runtime behavior
- Manages memory across multiple generations
- Handles concurrent garbage collection
- Coordinates thousands of threads

**The 4 Major Phases:**
```
Source Code (.java)
    ↓ [COMPILATION PHASE - javac]
Bytecode (.class)
    ↓ [CLASS LOADING PHASE - ClassLoader]
Runtime Classes (in memory)
    ↓ [VERIFICATION & INITIALIZATION]
Executable Code (interpreter + JIT compilation)
    ↓ [EXECUTION WITH GC & OPTIMIZATION]
Running Application
```

---

## SECTION 2: COMPILATION PHASE (javac)

### What javac Does

When you run `javac MyCode.java`, the Java compiler performs these operations:

#### 2.1 Lexical Analysis
- Reads source code character by character
- Groups characters into tokens: keywords, identifiers, operators, literals
- Creates a stream of tokens
- In HFT context: This is where syntax errors are caught early

#### 2.2 Syntax Analysis (Parsing)
- Takes token stream and builds an Abstract Syntax Tree (AST)
- Verifies syntax follows Java grammar
- AST represents code structure hierarchically

```
Code: int x = 5;

AST:
VariableDeclaration
├── Type: int
├── Name: x
└── Initializer: Literal(5)
```

#### 2.3 Semantic Analysis
- Checks semantic correctness (not just syntax)
- Type checking: Can you assign `String` to `int`? NO
- Variable scope: Is variable declared before use?
- Inheritance chain: Are you overriding correctly?
- Generics: Type erasure happens here

#### 2.4 Bytecode Generation
The compiler outputs **Java bytecode** - an intermediate language (IR) that's:
- **Stack-based** (not register-based like x86)
- **Human-readable** (you can decompile it)
- **JVM-independent** (same .class works on any JVM)

**Example: Simple Java Code**
```java
public int add(int a, int b) {
    return a + b;
}
```

**Compiled Bytecode:**
```
public int add(int, int);
  Code:
     0: iload_1          // Load first int argument onto stack
     1: iload_2          // Load second int argument onto stack
     2: iadd             // Pop two ints, add them, push result
     3: ireturn          // Pop int from stack and return
```

### Key Bytecode Instructions

| Instruction | Meaning | Example |
|------------|---------|---------|
| `iload_n` | Load int from local variable | `iload_1` → push arg1 |
| `istore_n` | Store int to local variable | `istore_3` → pop to var3 |
| `iadd` | Add two ints | Pop 2 ints, push sum |
| `invokevirtual` | Call instance method | Dynamic dispatch |
| `invokestatic` | Call static method | Direct call |
| `invokespecial` | Call private/constructor | No overriding |
| `invokedynamic` | Call dynamic method | Lambda expressions |
| `new` | Allocate object | Create instance |
| `getfield` | Read instance field | Fetch field value |
| `putfield` | Write instance field | Store field value |
| `aload_n` | Load object reference | Push reference |
| `astore_n` | Store object reference | Pop to variable |

### Why Bytecode?

1. **Portability**: Same bytecode runs on Windows, Linux, macOS
2. **Security**: JVM can verify bytecode before execution
3. **Optimization**: JVM optimizes based on runtime behavior
4. **Interoperability**: Multiple languages (Scala, Kotlin) compile to bytecode

---

## SECTION 3: CLASS LOADING MECHANISM

### The Three-Tier ClassLoader Hierarchy

```
Bootstrap ClassLoader (native C++)
    ↓
Extension ClassLoader (java.ext.dirs)
    ↓
Application ClassLoader (CLASSPATH)
    ↓
Custom ClassLoaders (user-defined)
```

### When Does Class Loading Happen?

Classes are loaded **lazily** - only when first referenced:

```java
public class MyApp {
    public static void main(String[] args) {
        // MyApp class is loaded when JVM starts
        
        DataProcessor processor;
        // DataProcessor NOT loaded yet
        
        processor = new DataProcessor();
        // NOW DataProcessor is loaded
    }
}
```

### The Three Phases of Class Loading

#### Phase 1: LOADING
- ClassLoader reads .class bytecode from disk (or network, or memory)
- Constructs in-memory representation
- Creates java.lang.Class object
- At this point: Only bytecode structure is understood

**Key Point for HFT**: Custom ClassLoaders allow hot-swapping classes without JVM restart. Many HFT firms load trading strategies dynamically.

```java
// Custom ClassLoader example for HFT
class StrategyClassLoader extends ClassLoader {
    public Class<?> loadStrategy(String className, byte[] bytecode) {
        return defineClass(className, bytecode, 0, bytecode.length);
    }
}
```

#### Phase 2: LINKING (Verification, Preparation, Resolution)

##### A. Verification
- **Most critical for security**
- Bytecode Verifier checks:
  - Stack type consistency: Can you push `int` and pop as `long`? NO
  - Variable initialization: Is every local variable assigned before use?
  - Illegal operations: Can you access private fields from outside?
  
```java
// Invalid bytecode that verifier catches:
int x;
System.out.println(x);  // ERROR: x not initialized
```

- Verification happens **once per class** (cached)
- In HFT, disable verification with `-Xverify:none` in ULTRA high-performance scenarios (NOT recommended - security risk)

##### B. Preparation
- Allocates memory for class variables (static fields)
- Sets default values:
  - Numeric types → 0
  - boolean → false
  - Object references → null

```java
public class Config {
    public static int maxConnections;  // = 0 (not initialized yet)
    public static String serviceName;  // = null
}
```

**Memory Layout After Preparation:**
```
Metaspace Memory:
┌─────────────────────────────────┐
│ Config Class Metadata           │
├─────────────────────────────────┤
│ maxConnections: 0               │
│ serviceName: null               │
│ (Other metadata...)             │
└─────────────────────────────────┘
```

##### C. Resolution
- Converts symbolic references to direct references
- Example: Method call `processor.process()` → Direct pointer to method
- Happens on-demand (lazy resolution)

#### Phase 3: INITIALIZATION
Covered in next section (Section 4).

### The Parental Delegation Model

When `Application ClassLoader` needs to load a class:
1. Asks parent: `Extension ClassLoader, can you load this?`
2. Extension asks parent: `Bootstrap, can you load this?`
3. Bootstrap tries to load from `$JAVA_HOME/lib`
4. If not found, passes back to Extension
5. If not found, passes to Application ClassLoader
6. If not found, throws `ClassNotFoundException`

**Benefit**: Prevents loading malicious `java.lang.String` from untrusted source.

```
Application tries: new DataProcessor()
    ↓ Ask Extension
    ↓ Ask Bootstrap
    ↓ Bootstrap searches $JAVA_HOME/lib → NOT FOUND
    ↓ Back to Extension (searches $JAVA_HOME/lib/ext) → NOT FOUND
    ↓ Back to Application (searches CLASSPATH) → FOUND
    ↓ Application ClassLoader loads it
```

---

## SECTION 4: CLASS INITIALIZATION & STATIC FIELDS

### The Difference Between Preparation and Initialization

**Preparation** (Phase 2 of Loading):
- Memory allocated
- Default values set (`int = 0`, `ref = null`)
- **No code execution**

**Initialization** (Phase 3 of Loading):
- Static initializers execute
- Static fields get real values
- Constructor code runs (for instances)

### When Does Initialization Happen?

Only when class is **actively used**:

```java
public class ExpensiveClass {
    static {
        System.out.println("Static initializer running");
        // This runs only when ExpensiveClass is initialized
    }
}

public class Main {
    public static void main(String[] args) {
        // ExpensiveClass is NOT initialized yet
        Class<?> clazz = ExpensiveClass.class;
        // Still NOT initialized - just loaded
        
        ExpensiveClass.staticMethod();
        // NOW it's initialized
    }
}
```

### Initialization Triggers

Class is initialized when you:
- Create instance: `new MyClass()`
- Access static field: `MyClass.counter`
- Call static method: `MyClass.staticMethod()`
- Call reflection methods: `Class.forName("...", true, ...)`
- Initialize subclass (parent initializes first)

### Static Initialization Order (Critical for HFT!)

```java
class OrderProcessor {
    // 1. Class variables are declared in order
    static List<Order> orders = new ArrayList<>();  // Allocated
    static int counter = 0;                          // = 0 initially
    
    // 2. Static initializers run in order of appearance
    static {
        System.out.println("Block 1");
        counter = 100;
    }
    
    static {
        System.out.println("Block 2");
        orders.add(new Order("init-order"));
    }
    
    // 3. Final static field initialization
    static final int MAX = counter + 50;  // MAX = 150
}

// When OrderProcessor is initialized:
// OUTPUT:
// Block 1
// Block 2
// counter is now 100
// orders has 1 Order
// MAX is 150
```

### Memory Model at Initialization

```
Before: (After Preparation)
┌────────────────────┐
│ Metaspace          │
├────────────────────┤
│ OrderProcessor     │
│ orders: null       │
│ counter: 0         │
│ MAX: 0             │
└────────────────────┘

After: (After Initialization)
┌────────────────────┐
│ Metaspace          │
├────────────────────┤
│ OrderProcessor     │
│ orders: ──┐        │
│ counter: 100       │
│ MAX: 150           │
└────────────────────┘
         │
         ↓
    ┌─────────────────┐
    │ Heap            │
    │ ArrayList       │
    │ [1 Order]       │
    └─────────────────┘
```

---

## SECTION 5: METHOD INVOCATION & CALL STACK

### The Stack: The Central Stage

Each **thread** has its own **stack**. The stack holds:
- Local variables
- Method call history
- Partial results during computation
- Return addresses

### Stack Frame Structure

When a method is called, a **stack frame** is created:

```
┌──────────────────────────────────┐
│ Stack Frame for method()          │
├──────────────────────────────────┤
│ Local Variables                  │
│  - this (object reference)       │
│  - param1, param2, ... (args)   │
│  - local variables               │
├──────────────────────────────────┤
│ Operand Stack                    │
│  (temporary values)              │
├──────────────────────────────────┤
│ Return Address                   │
│  (where to jump after return)    │
├──────────────────────────────────┤
│ Previous Frame Pointer           │
│  (link to caller's frame)        │
└──────────────────────────────────┘
```

### Example: Call Stack Building

```java
class Calculator {
    public static void main(String[] args) {      // Frame 1
        int result = add(5, 3);
    }
    
    static int add(int a, int b) {                // Frame 2
        int sum = a + b;
        return multiply(sum, 2);
    }
    
    static int multiply(int x, int y) {           // Frame 3
        return x * y;
    }
}
```

**Stack at Frame 3:**
```
┌────────────────────────┐
│ multiply(21, 2) Frame  │
│ Local: x=21, y=2      │
├────────────────────────┤
│ add(5, 3) Frame        │
│ Local: a=5, b=3, sum=8│
├────────────────────────┤
│ main(String[]) Frame   │
│ Local: result=?        │
├────────────────────────┤
│ JVM Internal           │
└────────────────────────┘
```

**Return Sequence:**
```
multiply returns 42
    ↓
add Frame: sum result = 42, returns to main
    ↓
main Frame: result = 42, exits
```

### Stack Overflow: A Cautionary Tale

```java
class Disaster {
    static void recursive() {
        recursive();  // No base case!
    }
}

// Result: Each call adds a frame
// After ~10,000 frames (depends on frame size):
// StackOverflowError: stack frame is too large
```

Memory limit: 1MB per thread (on most systems)
```
Frame size ≈ 1KB average
1MB / 1KB = 1000 frames max
```

### Types of Method Invocation

#### 1. invokestatic (Static Methods)
- **Direct binding** at compile time
- No virtual dispatch
- Fastest path
- Example: `Math.abs(-5)`

```
Bytecode:
  invokestatic java/lang/Math.abs:(I)I
  
JVM:
  → Direct jump to Math.abs code
```

#### 2. invokespecial (Private/Constructor/Super)
- **No overriding** possible
- Direct to specific method
- Constructors: `new MyClass()`
- Private methods: `privateMethod()`
- Super calls: `super.method()`

```
Bytecode:
  invokespecial MyClass.<init>:()V
  
JVM:
  → Direct jump to MyClass constructor
```

#### 3. invokevirtual (Instance Methods) - THE COMPLEX ONE
- **Dynamic dispatch** - which implementation to call?
- Creates Virtual Method Table (VMT)
- Must determine at runtime based on object type

```java
class Animal {
    void speak() { System.out.println("Generic sound"); }
}

class Dog extends Animal {
    void speak() { System.out.println("Woof"); }
}

class Cat extends Animal {
    void speak() { System.out.println("Meow"); }
}

public class Zoo {
    public static void main(String[] args) {
        Animal a = new Dog();
        a.speak();  // invokevirtual - WHICH speak()?
    }
}
```

**Virtual Method Table for Dog:**
```
Dog VMT:
┌─────────────────────────┐
│ method: speak()         │
│ address: 0x12345678     │ → Points to Dog.speak()
├─────────────────────────┤
│ method: toString()      │
│ address: 0xabcdef00     │
└─────────────────────────┘

Cat VMT:
┌─────────────────────────┐
│ method: speak()         │
│ address: 0x87654321     │ → Points to Cat.speak()
├─────────────────────────┤
│ method: toString()      │
│ address: 0x11223344     │
└─────────────────────────┘
```

**Runtime Resolution:**
```
a.speak()
  ↓
Check: what is the actual type of 'a'? → Dog
  ↓
Look up Dog's VMT
  ↓
Find speak() in Dog's VMT
  ↓
Jump to 0x12345678
  ↓
Execute Dog.speak() code
```

#### 4. invokedynamic (Lambda/Dynamic)
- Newest invocation type (Java 7+)
- Used for lambdas and method handles
- Allows custom linkage logic
- Most flexible but slower

```java
List<Integer> nums = Arrays.asList(1, 2, 3);
nums.forEach(n -> System.out.println(n));
// forEach(Consumer) calls invokedynamic
```

---

## SECTION 6: JIT COMPILATION - WHERE THE MAGIC HAPPENS

### Interpretation vs Compilation

**Pure Interpretation** (Old approach):
```
.class bytecode
    ↓
Bytecode interpreter
    ↓
Execute directly
    ↓
Slow but startup fast
```

**Modern JVM (Hybrid):**
```
.class bytecode
    ↓
Interpreter (counts calls)
    ↓
Detects hot method (>10,000 calls)
    ↓
JIT Compiler
    ↓
Native machine code
    ↓
Execute native code
    ↓
Fast but startup slower
```

### JIT Compilation Process

#### Step 1: Counting/Profiling
```java
public int expensiveCalculation(int n) {
    return fibonacci(n);
}

// JVM counter:
// Call 1: counter = 1
// Call 2: counter = 2
// ...
// Call 10,001: counter = 10,001 → TRIGGER JIT
```

#### Step 2: Compilation Decision

**C1 Compiler (Client Compiler):**
- Fast compilation (low latency)
- Limited optimizations
- Used for JIT tier 1

**C2 Compiler (Server Compiler):**
- Slow compilation (high latency)
- Aggressive optimizations
- Used for JIT tier 2

**TieredCompilation** (Modern default):
```
Code path:
Bytecode (Interpreted, slow)
    ↓ (after ~1,000 calls)
C1 Compiled (moderate optimization)
    ↓ (after ~10,000 calls)
C2 Compiled (aggressive optimization, fast)
```

#### Step 3: Compilation Itself

The JIT compiler transforms bytecode → native x86 assembly:

```java
public int add(int a, int b) {
    return a + b;
}
```

**Interpreted version:**
```
bytecode:
  iload_1
  iload_2
  iadd
  ireturn
```

**JIT Compiled version (x86):**
```asm
mov eax, edi        ; eax = a
add eax, esi        ; eax += b
ret                 ; return eax
```

### JVM Optimizations During JIT

#### 1. Inlining - The Most Powerful Optimization

**Definition**: Replace method call with the method body

```java
public class Point {
    private int x, y;
    
    public int getX() {
        return x;  // Small method
    }
    
    public long distanceToOrigin() {
        int dx = getX();  // Calls getX()
        int dy = getY();  // Calls getY()
        return (long) dx * dx + dy * dy;
    }
}
```

**Before Inlining:**
```
distanceToOrigin():
    push frame
    call getX()
        push frame
        return x
        pop frame
    store dx
    call getY()
        push frame
        return y
        pop frame
    store dy
    multiply & add
    return
```

**After Inlining by JIT:**
```
distanceToOrigin():
    mov eax, [this.x]    ; directly read x
    mov ebx, [this.y]    ; directly read y
    imul eax, eax        ; dx * dx
    imul ebx, ebx        ; dy * dy
    add eax, ebx         ; sum
    ret
```

**Performance Impact**: 10-100x faster for small methods!

**Inlining Heuristics:**
- Method size < 325 bytes? Candidate for inlining
- Compilation unit size < 45,000? Yes
- Override frequency? If method is overridden many times, don't inline
- Recursive? Don't inline recursive calls

**Control Inlining** (for HFT optimization):
```bash
java -XX:CompileCommand=inline,com/hft/OrderProcessor::process MyApp
java -XX:InlineSmallCode=4000 MyApp  # Inline methods up to 4KB
java -XX:MaxFreqInlineSize=2000 MyApp
```

#### 2. Dead Code Elimination

```java
int result = expensiveComputation();  // Never used
return 42;
```

**JIT sees**:
- Result is assigned but never read
- Eliminates entire computation

#### 3. Loop Unrolling

```java
for (int i = 0; i < 4; i++) {
    array[i] = i * 2;
}
```

**Unrolled:**
```
array[0] = 0;
array[1] = 2;
array[2] = 4;
array[3] = 6;
```

Reduces loop overhead significantly.

#### 4. Escape Analysis

The most important optimization for allocation-heavy code!

```java
public class OrderProcessor {
    public long processOrder(Order order) {
        Container temp = new Container();  // Does this escape?
        temp.add(order);
        return temp.getValue();  // Never returned/stored
    }
}
```

**Escape Analysis says**: 
- `temp` is local to this method
- Never escapes to heap
- Can be **stack-allocated** instead!

**Stack allocation benefits:**
- No garbage collection needed
- Extremely fast
- No heap fragmentation
- Cache-friendly

```
Normal: new Container() → Heap allocation → Later GC
Escaped: new Container() → Stack allocation → Auto freed on return
```

Enable escape analysis (it's default in modern JVMs):
```bash
java -XX:+DoEscapeAnalysis MyApp
```

#### 5. Branch Prediction & Speculative Optimization

```java
public void processOrder(Order order) {
    if (order.isPriority()) {  // 99% true in production
        fastPath(order);
    } else {
        slowPath(order);
    }
}
```

**JIT observed**: 
- 99% of calls take `if` branch
- Compiles code assuming branch is taken
- If branch is actually taken → Super fast
- If branch not taken → Deoptimization occurs

```
Optimized code for: if (order.isPriority()) == true
    cmp [order.priority], 1
    jne deopt_path         ; if not equal, jump to deopt
    ; fastPath inlined code here
    ret
    
deopt_path:
    ; rarely taken, slower
```

When assumptions are violated, JIT **deoptimizes**:
- Reverts to interpreter
- Re-profiles
- Re-JITs with new assumptions

#### 6. Monomorphic/Polymorphic Inlining

```java
Animal animal = new Dog();
animal.speak();  // invokevirtual
```

If JIT observes only Dog objects call speak():
- **Monomorphic**: Inline Dog.speak() directly
- Add type check: if (not Dog) deoptimize

If JIT observes Dog and Cat objects:
- **Polymorphic**: Create multiple optimized paths
- For Dog: jump to Dog.speak()
- For Cat: jump to Cat.speak()
- For others: deoptimize

#### 7. Biased Locking

Synchronization optimization:

```java
synchronized(lock) {
    // critical section
}
```

JIT observes:
- This lock is always locked by the same thread
- Assumes thread bias → no synchronization needed!

If different thread tries to acquire:
- Revoke bias
- Switch to normal locking

---

## SECTION 7: MEMORY MANAGEMENT - THE BEAST

### JVM Memory Regions

```
JVM Process Memory:
┌─────────────────────────────────────────┐
│ Heap (Shared, GC managed)               │
│  - Young Generation (Eden, S0, S1)      │
│  - Old Generation                       │
│  - Maximum: -Xmx setting                │
├─────────────────────────────────────────┤
│ Stack (Per thread)                      │
│  - Call frames                          │
│  - Local variables                      │
│  - Each thread: -Xss setting            │
├─────────────────────────────────────────┤
│ Metaspace (Class metadata)              │
│  - Class structures                     │
│  - Method data                          │
│  - Maximum: -XX:MetaspaceSize           │
├─────────────────────────────────────────┤
│ Code Cache (Compiled code)              │
│  - JIT compiled native code             │
│  - Maximum: -XX:ReservedCodeCacheSize   │
├─────────────────────────────────────────┤
│ Native Memory (JNI, Direct Buffers)     │
│  - Off-heap data                        │
│  - Unmanaged by GC                      │
└─────────────────────────────────────────┘
```

### The Heap: Young Generation (Hotspot Collector)

```
Young Generation:
┌───────────────────────────────────┐
│ Eden Space (80% of young gen)      │
│                                   │
│ [new objects allocated here]      │
├───────────────────────────────────┤
│ Survivor Space 0 (10%)      │ S 1 │
│ [objects surviving GC]      │ 10% │
└───────────────────────────────────┘

Size: -Xmn2g = 2GB young generation
```

### Object Allocation Process

```
1. New allocation request:
   Object obj = new MyClass();
   
2. Thread-local allocation buffer (TLAB):
   Each thread has its own TLAB in Eden
   If obj fits in TLAB:
       pointer bump allocation (FAST)
   Else:
       allocate new TLAB (slower)
       
3. Object layout in memory:
   ┌──────────────────┐
   │ Object Header    │ 16 bytes
   │ - Mark Word      │ 8 bytes
   │ - Class Pointer  │ 8 bytes
   ├──────────────────┤
   │ Field 1          │
   │ Field 2          │
   │ ...              │
   └──────────────────┘

4. Mark Word (critical for GC):
   [garbage_bits | age | lock_state]
   - Tracks object age (for generational GC)
   - Locking information (biased lock, normal lock, etc.)
   - Marks object as reachable or not
```

### Generational Hypothesis

**Key insight**: Most objects die young!

```
Age distribution of objects:
100% ┤ █
     │ █
  80%├ █
     │ █
  60%├ █
     │ ██
  40%├ ██
     │ ███
  20%├ ████
     │ █████████
   0%├─────────────────────
      age→ 0 1 2 3 4 5 6 7 8 9 10 (in GC cycles)
```

Most objects are collected in **Young Generation** GC (fast).
Few survive to **Old Generation** GC (slow, full).

### Object Promotion

```
Young Gen:
┌─────────────────────┐
│ Eden: new objects   │
│ age < threshold     │
└──────────────────┬──┘
                   │
              GC occurs
                   │
                   ↓
┌──────────────────────────┐
│ Survivor: age++          │
│ age < promotion_age      │
└──────────────────┬───────┘
                   │ (after 15 GC cycles)
                   ↓
            ┌─────────────────────┐
            │ Old Gen: aged objs   │
            │ age >= promotion_age │
            └─────────────────────┘
```

Default promotion age: 15 cycles (configurable).

### Metaspace (Class Metadata)

```
Metaspace:
┌───────────────────────────┐
│ Class Structure           │
│ - Fields info             │
│ - Methods info            │
│ - Method Code Attributes  │
│ - Constant Pool           │
├───────────────────────────┤
│ Metaspace Arena           │
│ - Thread-local allocation │
│ - Chunk-based allocation  │
├───────────────────────────┤
│ Code Cache                │
│ - JIT compiled methods    │
│ - Size: 240MB default     │
└───────────────────────────┘
```

Class metadata is never GC'd (in Java 8+), causing:

```java
// Dangerous in HFT:
for (int i = 0; i < 1000000; i++) {
    ClassLoader cl = new URLClassLoader(new URL[]{...});
    Class<?> dynamicClass = cl.loadClass("...");
    // If class is never unloaded → Metaspace fills up
    // Eventually: OutOfMemoryError: Metaspace
}
```

### Code Cache (Compiled Code)

```
Code Cache (default 240MB):
┌─────────────────────┐
│ Profiling area      │ 30%
│ (profiling info)    │
├─────────────────────┤
│ Non-profiling area  │ 70%
│ (compiled methods)  │
└─────────────────────┘

When full:
CodeCache is 100% full
    ↓
JVM stops compiling new methods
    ↓
Code runs interpreted (slow)
    ↓
Watch for: "[CodeCache] space is full, FULL" in logs
```

Critical for HFT:
```bash
java -XX:ReservedCodeCacheSize=512m MyTradingSystem
# More cache = can JIT compile more methods
```

---

## SECTION 8: GARBAGE COLLECTION - THE GREAT RECYCLER

### How GC Determines What to Delete

**Root Set**: Objects that are directly reachable
- Local variables on stack
- Static fields
- JNI references

**Reachability**: An object is reachable if any root can reach it

```java
class Node {
    Node next;
}

Node root = new Node();
root.next = new Node();
root.next.next = new Node();
```

**Memory graph:**
```
Root → root ─────┐
                  ↓
                Node
                  │ next
                  ↓
                Node
                  │ next
                  ↓
                Node

All reachable (must keep)
```

When reference is lost:

```java
root.next = null;  // Dereferenced the middle node
```

**Memory graph after:**
```
Root → root ─────┐
                  ↓
                Node
                  │ next (null)
                  
                    (garbage!)
                Node ← Can't reach anymore
                  │ next
                  ↓
                Node
```

Middle node and third node are garbage → can be collected.

### GC Algorithms

#### 1. Mark-Sweep-Compact (CMS, G1)

**Mark Phase**: Traverse reachability graph, mark all reachable objects

```
Before Mark:
┌─────────────────────────────────┐
│ Live   │ Garbage │ Live │ Gabage │
│ [obj1] │ [obj2]  │[obj3]│ [obj4] │
└─────────────────────────────────┘

After Mark:
┌─────────────────────────────────┐
│ ✓ Live │ ✗ Garbage │ ✓ Live │ ✗ │
│ [obj1] │ [obj2]    │[obj3] │[obj4]│
└─────────────────────────────────┘
```

**Sweep Phase**: Delete all unmarked objects

```
After Sweep:
┌──────────────────────┐
│ [obj1]  │ [obj3]     │
│         │            │
│ Free    │ Free       │
└──────────────────────┘
```

**Compact Phase**: Move live objects together (eliminate fragmentation)

```
After Compact:
┌──────────────────────┐
│ [obj1] │ [obj3]      │
│        │             │
│  Free Space Available│
└──────────────────────┘
```

#### 2. Minor GC (Young Generation)

```
Before:
Eden [obj1][obj2][obj3][obj4]
S0   [old1][old2]
S1   []

Minor GC triggers:
  - Eden full
  - Mark reachable objects
  - Copy live to S1
  
After:
Eden []
S0   []
S1   [old1][old2][young1][young3]
     (young2 and young4 were garbage)

Age++  for objects copied
```

Frequency: Every few MB allocated (seconds in HFT context).

#### 3. Full GC (Old Generation)

```
Triggers:
- Old generation full
- Promotion from young gen requires space
- Explicit System.gc() call (AVOID IN HFT!)
- Metaspace full

Duration: 100ms - 10s (catastrophic for HFT!)
```

### Different GC Collectors

#### Serial GC (Single-threaded, old)
```
Execution: Stop the world (STW)
         Pause all threads
         ↓
         GC runs
         ↓
         Resume all threads
         
Pause time: 100ms-1s (bad for HFT)
```

#### Parallel GC (Multi-threaded young gen)
```
Young Gen: Parallel mark/copy (16 threads default)
Old Gen: Parallel mark/compact

Pause time: 50ms-500ms (better)
```

#### CMS (Concurrent Mark-Sweep)
```
Timeline:
t0: Full GC starts
t1-10: Concurrent mark (app running, slowed)
t10: Stop world for final mark
t11: Concurrent sweep (app running)
t15: GC done

Pause time: 10-100ms (good for HFT)
Fragmentation: YES (issue long-term)
```

#### G1GC (Garbage First)
```
Heap divided into regions (1-32MB each):
┌──────┬──────┬──────┬──────┐
│ Rgn1 │ Rgn2 │ Rgn3 │ Rgn4 │ Young
├──────┼──────┼──────┼──────┤
│ Rgn5 │ Rgn6 │ Rgn7 │ Rgn8 │ Young
├──────┼──────┼──────┼──────┤
│ Rgn9 │ RgnA │ RgnB │ RgnC │ Old
└──────┴──────┴──────┴──────┘

Collection:
- Collects young regions first (low pause)
- Then mixes in old regions (higher garbage first)
- Can pause at any region boundary

Pause time: 10-100ms (configurable)
Fragmentation: NO (compacting)

Preferred for HFT: G1GC with 50ms pause target
```

```bash
java -XX:+UseG1GC -XX:MaxGCPauseMillis=50 MyTradingApp
```

#### ZGC (Low-latency)
```
Pause time: < 10ms GUARANTEED (incredible!)
Throughput: 95%+ (even with GC)

Technique: Concurrent everything
- Concurrent mark
- Concurrent compact
- Never move objects while app uses them (color pointers)

For ultra-low-latency HFT:
java -XX:+UseZGC -XX:ZCollectionInterval=120 MyApp
```

### Generations Configuration

```bash
# Young generation size
java -Xmn2g MyApp

# Or explicit ratio
java -XX:NewRatio=2 MyApp
# Ratio 2:1 means YG:OG = 1:2

# Survivor space
java -XX:SurvivorRatio=8 MyApp
# 8:1:1 = Eden:S0:S1 (in YG)

# Promotion age
java -XX:InitialTenuringThreshold=7 MyApp
# Objects promoted after 7 GC cycles
```

### Memory Leak Detection

Heap dump:
```bash
jmap -dump:live,format=b,file=heap.bin <pid>
# Generate heap dump

jhat heap.bin
# Analyze in browser
```

Tools:
- **Eclipse MAT**: Memory Analyzer Tool
- **YourKit**: Professional profiler
- **JProfiler**: Full profiler

---

## SECTION 9: THREAD EXECUTION MODEL

### Thread Creation & JVM Integration

```java
class Worker implements Runnable {
    public void run() {
        System.out.println("Working");
    }
}

Thread t = new Thread(new Worker());
t.start();  // NOT t.run()!
```

**Thread.start()** does:
1. Allocates native thread structure
2. Allocates stack (default 1MB per thread)
3. Calls native `pthread_create()`
4. OS scheduler manages thread

```
Java Code:
new Thread(runnable).start()
    ↓
JVM Native Layer:
JNI call: JNU_NewThreadID()
    ↓
OS Level:
pthread_create()
    ↓
Kernel:
Allocate thread context
Add to ready queue
    ↓
CPU Scheduler:
When CPU available, run thread
```

### Thread Stack

Each thread gets **separate stack** (typically 1MB):

```
Thread 1 Stack:        Thread 2 Stack:
┌─────────────────┐   ┌─────────────────┐
│ method4() frame │   │ method7() frame │
├─────────────────┤   ├─────────────────┤
│ method3() frame │   │ method6() frame │
├─────────────────┤   ├─────────────────┤
│ method2() frame │   │ method5() frame │
├─────────────────┤   ├─────────────────┤
│ method1() frame │   │ main() frame    │
├─────────────────┤   ├─────────────────┤
│ JVM bootstrap   │   │ JVM bootstrap   │
└─────────────────┘   └─────────────────┘
```

Separate stacks mean:
- Local variables don't interfere
- But shared heap is dangerous
- Need synchronization for heap access

### Context Switching (CPU perspective)

```
Timeline:
t0: CPU runs Thread A
    ┌─────────────────────────┐
    │ Execute Thread A code   │
    │ EAX = 5                 │
    │ EBX = 10                │
    │ ...                     │
    └─────────────────────────┘

t1: Scheduler switches to Thread B
    Save Thread A CPU state (registers)
    ┌─────────────────────────┐
    │ Thread A Context:       │
    │ EAX=5, EBX=10, ...      │
    │ RIP=0x12345678          │
    │ RSP=0x...               │
    └─────────────────────────┘
    
    Load Thread B CPU state
    ┌─────────────────────────┐
    │ Execute Thread B code   │
    │ EAX = 100               │
    │ EBX = 200               │
    │ ...                     │
    └─────────────────────────┘

t2: Switch back to Thread A
    Save Thread B CPU state
    Load Thread A CPU state
    Continue from RIP=0x12345678

Cost per switch: ~1-10 microseconds
```

**In HFT**: Too many threads = too much context switching = latency!

### Synchronization: The Complexity

```java
synchronized void transferMoney(Account from, Account to, int amount) {
    from.withdraw(amount);
    to.deposit(amount);
}
```

**What synchronization does:**
```
Thread 1 enters:
    ↓
acquireMonitor(lock)
    Check lock status
    If locked by other thread: WAIT (blocked)
    If free: Mark as locked, continue
    ↓
Execute critical section
    ↓
releaseMonitor(lock)
    Unmark lock
    Notify waiting threads
```

**Lock structure (Mark Word):**
```
64-bit Mark Word:
┌──────────────────────────────────────────────────┐
│ unused (2) │ biased_lock (1) │ lock_type (2) │... │
└──────────────────────────────────────────────────┘

Lock types:
01 - Normal/unbiased lock
10 - Heavy-weight lock
11 - GC marker
00 - Biased lock

Biased Lock: No actual locking (optimization!)
    Only holds thread ID
    If same thread acquires again: free!
    
Normal Lock: Mutex with wait queue
    Threads contend in queue
    OS scheduler decides order

Heavy-weight Lock: When too much contention
    Uses native mutex
    Slower but handles many threads
```

### Thread Communication: Wait/Notify

```java
class PrintBuffer {
    private Queue<String> buffer;
    
    synchronized void produce(String item) {
        buffer.add(item);
        notifyAll();  // Wake up all waiting threads
    }
    
    synchronized String consume() {
        while (buffer.isEmpty()) {
            wait();  // Release lock, sleep, re-acquire on wakeup
        }
        return buffer.poll();
    }
}
```

**Execution timeline:**
```
Thread A:                    Thread B:
consume()
  lock acquired
  isEmpty? yes
  wait()
    ↓ unlock
    ↓ sleep              produce("hello")
    │                      lock acquired
    │                      add to buffer
    │                      notifyAll()
    │                      unlock
    ↓
  wake up
  re-acquire lock
  return item
  unlock
```

### Volatile Keyword - Memory Visibility

```java
class Flag {
    volatile boolean running = true;
    
    void stopWorker() {
        running = false;
    }
    
    void worker() {
        while (running) {  // Must see latest value
            doWork();
        }
    }
}
```

**Without volatile:**
```
JVM may optimize:
    boolean temp = running;
    while (temp) {  // Uses cached temp, not re-reading!
        doWork();
    }
```

**With volatile:**
```
JVM must:
    while (true) {
        temp = LOAD from memory (not cache)
        if (!temp) break
        doWork();
    }
```

### Happens-Before Relationships

Memory visibility guarantees:

```
volatile write ──────────────────→ volatile read
(in thread A)                      (in thread B)

Thread A:
  x = 5
  volatile y = 10  ─────────────→ Thread B: int z = volatile y
                                  Now: z == 10 AND x == 5
```

Critical for HFT:
```java
class OrderQueue {
    volatile Order[] orders = new Order[1000];
    volatile int size = 0;
    
    void addOrder(Order o) {
        orders[size] = o;
        size++;  // volatile write ensures memory barrier
    }
    
    Order getOrder(int i) {
        return orders[i];  // volatile read ensures latest memory
    }
}
```

---

## SECTION 10: ADVANCED JVM OPTIMIZATIONS

### Escape Analysis Deep Dive

```java
class PriceAggregator {
    public double calculateAverage(List<Double> prices) {
        Stats stats = new Stats();  // Does this escape?
        stats.addAll(prices);
        return stats.average();
    }
}
```

**Escape analysis algorithm:**
1. Where is `stats` created? → In `calculateAverage()`
2. Is it returned? → No
3. Is it stored in field? → No
4. Is it passed to unknown method? → No (addAll is known method)

**Conclusion**: stats doesn't escape!

**Optimization: Scalar Replacement**
```
Instead of:
    new Stats()         → allocate object on heap
    push reference      → store reference
    call addAll()       → pass reference
    
Do this:
    double sum = 0.0    → allocate scalar
    int count = 0       → allocate scalar
    for loop            → inline operations
    return sum / count  → compute directly
```

**Result**: Zero allocations! No GC pressure!

### Method Devirtualization

```java
List<Integer> nums = new ArrayList<>();  // Concrete type!

public int sum(List<Integer> nums) {
    int total = 0;
    for (Integer n : nums) {
        total += n.intValue();  // invokevirtual
    }
    return total;
}
```

**JIT sees**: List reference is always ArrayList
- **Monomorphic:** Inline `Iterator.next()` directly
- Remove virtual dispatch overhead

### Common Subexpression Elimination

```java
int result = expensive1() + expensive2() +
             expensive1() + expensive3();
```

**Naive:**
```
call expensive1()  → x
call expensive2()  → y
call expensive1()  → z (redundant!)
call expensive3()  → w
return x + y + z + w
```

**Optimized:**
```
call expensive1()  → x
call expensive2()  → y
call expensive3()  → w
return x + y + x + w  (reuse x)
```

### Loop Optimization: Peeling & Unrolling

**Loop Peeling:**
```java
for (int i = 0; i < n; i++) {
    if (i == 0) setupPhase(array[i]);
    else normalProcess(array[i]);
}
```

**Becomes:**
```
setupPhase(array[0]);
for (int i = 1; i < n; i++) {
    normalProcess(array[i]);
}
```

Removes branch inside loop!

**Loop Unrolling:**
```java
for (int i = 0; i < 100; i += 4) {
    process(i);
    process(i+1);
    process(i+2);
    process(i+3);
}
```

Reduces loop iterations (99% less loop overhead).

### Null Check Elimination

```java
String str = getValidString();  // Always returns non-null

String upper = str.toUpperCase();  // Needs null check
int len = str.length();
```

**Compiler optimizes:**
```
str.toUpperCase()  // No null check!
               (JIT proved it's never null)
str.length()       // No null check!
```

---

## SECTION 11: HFT-SPECIFIC OPTIMIZATIONS

### Latency-Critical Configuration

```bash
java \
  -server \
  -Xmx8g \
  -Xms8g \
  -XX:+UseG1GC \
  -XX:MaxGCPauseMillis=25 \
  -XX:+ParallelRefProcEnabled \
  -XX:-ResizeTLAB \
  -XX:+AlwaysPreTouch \
  -XX:+UnlockExperimentalVMOptions \
  -XX:G1NewCollectionHeuristicsWeight=20 \
  -XX:InitialCodeCacheSize=256m \
  -XX:ReservedCodeCacheSize=512m \
  -XX:+UseStringDeduplication \
  -XX:+PrintGCDateStamps \
  -XX:+PrintGCDetails \
  MyTradingSystem
```

**Explanation:**
- `-server`: Aggressive JIT compilation
- `-Xmx8g -Xms8g`: Pre-allocate all heap (avoid resize pauses)
- `-XX:+UseG1GC`: Low-pause collector
- `-XX:MaxGCPauseMillis=25`: Target 25ms pause time
- `-XX:+ParallelRefProcEnabled`: Parallel weak reference processing
- `-XX:-ResizeTLAB`: Fixed TLAB size (predictable allocation)
- `-XX:+AlwaysPreTouch`: Touch all pages at startup (avoid page faults during execution)
- `-XX:G1NewCollectionHeuristicsWeight=20`: More aggressive young gen collection
- `-XX:InitialCodeCacheSize=256m`: Large initial code cache
- `-XX:ReservedCodeCacheSize=512m`: Large max code cache
- `-XX:+UseStringDeduplication`: Save memory on duplicate strings

### Avoiding GC Pauses

**Pre-allocate everything:**
```java
class TickProcessor {
    // Pre-allocate pools
    private Queue<Order> orderPool = new ArrayBlockingQueue<>(100000);
    private Queue<Tick> tickPool = new ArrayBlockingQueue<>(1000000);
    
    TickProcessor() {
        // Pre-warm: fill pools to warm up memory
        for (int i = 0; i < 100000; i++) {
            orderPool.offer(new Order());
        }
        for (int i = 0; i < 1000000; i++) {
            tickPool.offer(new Tick());
        }
    }
    
    public void processTick(Tick tick) {
        Order order = orderPool.poll();  // Reuse from pool
        if (order == null) return;
        
        order.process(tick);
        
        orderPool.offer(order);  // Return to pool
    }
}
```

**Zero-allocation trading loop:**
```java
// Pre-allocate
Order[] orderCache = new Order[1000];
int orderCount = 0;

for (Tick tick : tickStream) {
    if (orderCount >= 1000) flushOrders();
    
    Order order = orderCache[orderCount];
    order.update(tick);
    orderCount++;
}
```

### CPU Cache Locality

```java
// BAD: False sharing
class StockPrice {
    volatile long price;      // 8 bytes
    volatile long volume;     // 8 bytes
    // Other threads accessing price causes cache coherency traffic!
}

// GOOD: Padding
class StockPrice {
    volatile long price;      // 8 bytes
    long p1, p2, p3, p4, p5, p6, p7;  // Padding to 64 bytes (cache line)
    
    volatile long volume;     // Different cache line
    long v1, v2, v3, v4, v5, v6, v7;
    // Now price and volume in different cache lines - no false sharing
}
```

### Compiler Directives (Expert Level)

```
Create directive file: directives.txt
```

```
[
  {
    match: "com/hft/OrderProcessor.process",
    c1: { Enabled: true, Inline: true },
    c2: { Enabled: true, Inline: true },
    inline: { include: ["+com/hft/Order.*"] }
  },
  {
    match: "com/hft/Risk.calculate",
    c2: { Enabled: true, InlineSmallCode: 5000 }
  }
]
```

```bash
java -XX:CompilerDirectivesFile=directives.txt MyApp
```

### NUMA Awareness (Multi-socket machines)

```bash
# 2-socket NUMA machine
numactl --interleave=all java -XX:+UseNUMA MyApp
```

For HFT on NUMA:
- Thread 0-7 on Socket 0 CPU
- Thread 8-15 on Socket 1 CPU
- Allocate shared data on Socket 0 or 1 (preferably the socket processing it)

---

## SECTION 12: PROFILING & DEBUGGING

### JVM Metrics You Must Know

```bash
# Real-time JVM metrics
jstat -gcutil -h20 <pid> 1000
# Output every 1 second

# Example output:
#   S0     S1     E      O      M     CCS    YGC    YGCT    FGC    FGCT     GCT
#   0.00  10.23  45.67  23.45  95.12 87.34   127    2.345   3      0.234   2.579
#   (% used)                         (#)   (seconds)     (sec)
```

### JFR (Java Flight Recorder) - Best Profiler

```bash
# Start recording
java -XX:StartFlightRecording=duration=60s,filename=recording.jfr MyApp

# Analyze
jfr print recording.jfr
```

Records:
- Method execution time
- GC details
- Lock contention
- Thread state changes
- Everything with nanosecond precision

### What to Look For

**GC Logs:**
```
[2024-01-15T10:30:45.123+0000][gc,start     ] GC(127) Pause Young (Normal) (G1 Evacuation Pause)
[2024-01-15T10:30:45.134+0000][gc            ] GC(127) ... (Eden: 1280M(1280M)->0B(1088M) Survivors: 64M->128M Old: 256M->384M) 11M->512M(2048M)
[2024-01-15T10:30:45.145+0000][gc            ] GC(127) User=0.09s Sys=0.00s Real=0.012s

[gc,cpu ]     GC(127) pause, 0.012 seconds
```

**Good signs:**
- GC pause < 50ms
- No full GC (G1 doesn't do full GC in normal operation)
- Young GC every 1-2 seconds
- 95%+ CPU for application

**Bad signs:**
- GC pause > 100ms
- Full GC happening
- Pause time increasing over time (memory leak)
- Excessive GC frequency (allocation problem)

### Async Profiler (Sampling)

```bash
# Profile application for 60 seconds
./async-profiler.sh -d 60 -f flamegraph.html <pid>

# Generates flame graph showing:
# - Which methods consume most CPU
# - Call stack leading to hot methods
# - Percentage of total time
```

### GCeasy.io (Analyze GC logs)

Upload GC logs:
```bash
-XX:+PrintGCDetails -XX:+PrintGCDateStamps -Xloggc:gc.log
```

Provides:
- GC pause time analysis
- Heap size recommendations
- GC pause frequency
- Memory leak detection
- Generational hypothesis validation

---

## SECTION 13: MEMORY MANAGEMENT DEEP DIVE

### Object Size Calculation

```java
class Order {
    private int id;           // 4 bytes
    private long timestamp;   // 8 bytes
    private double price;     // 8 bytes
    private String symbol;    // 8 bytes (reference)
}

// Memory layout:
Object Header (Mark Word):      16 bytes
  - Mark Word:                   8 bytes
  - Class Pointer:               8 bytes

Fields:                          40 bytes (including padding)
  - id:                          4 bytes
  - (padding):                   4 bytes
  - timestamp:                   8 bytes
  - price:                       8 bytes
  - symbol:                      8 bytes

Total: 56 bytes (aligned to 8 bytes)
```

### String Interning (Trap!)

```java
String s1 = "hello";              // String pool
String s2 = new String("hello");  // Heap allocation
String s3 = s2.intern();          // Added to pool

s1 == s3;   // true (same reference)
s1 == s2;   // false (different locations)
```

String pool in Metaspace (unlimited copies):
```
String Pool:
"hello" → 0x12345678

New allocation:
new String("hello") → 0x87654321 (different!)

Intern:
s2.intern() → Look up pool → Found 0x12345678
```

In HFT, be careful:
```java
// Bad: Creates millions of strings
for (Message msg : messages) {
    String symbol = msg.symbol;  // Unreliable interning
    // ...
}

// Good: Control interning
String symbol = msg.symbol.intern();  // Explicit
// Or use enum for known symbols
enum Symbol { AAPL, GOOGL, MSFT }
```

### Weak/Soft/Phantom References (Advanced)

```java
// WeakReference: GC can reclaim at any time
WeakReference<Order> ref = new WeakReference<>(new Order());
Order order = ref.get();  // Might be null!

// Use case: Caches that don't prevent GC
class Cache {
    private Map<Key, WeakReference<Value>> cache = new HashMap<>();
    
    Value get(Key k) {
        WeakReference<Value> ref = cache.get(k);
        if (ref != null) {
            Value v = ref.get();  // Check if GC'd
            if (v != null) return v;
        }
        // Not in cache, refetch
        Value v = fetchFromDB(k);
        cache.put(k, new WeakReference<>(v));
        return v;
    }
}
```

### Memory Barriers & Visibility

```java
// Without synchronization
class Counter {
    private long value = 0;
    
    void increment() {
        value++;
    }
    
    long getValue() {
        return value;
    }
}
```

**Problem**: Thread visibility!

```
Thread A:                       Thread B:
value = 0                       value = ? (not visible)
value++                         (reads from cache)
memory barrier needed!

With synchronization:
synchronized void increment() {
    value++;
    // memory barrier: flush to main memory
}

synchronized long getValue() {
    // memory barrier: read from main memory
    return value;
}
```

---

## SECTION 14: REAL-WORLD HFT CONSIDERATIONS

### Latency Budget

For microsecond-scale trading:

```
Desired round-trip latency: 100 microseconds

Breakdown:
- Network packet round-trip:   40 microseconds
- JVM processing:              20 microseconds
- Business logic:              30 microseconds
- GC/other OS delays:          10 microseconds
                              ─────────────
Total:                         100 microseconds
```

Every JVM allocation is critical!

### Thread Affinity (Pin to CPU)

```java
// Force thread to specific CPU
Runtime.getRuntime().exec(
    "taskset -c 2,3 java -jar trading.jar"
);

// Linux: thread on cores 2-3 only
// Maximizes CPU cache hit rate
// Reduces context switching
```

### Lock-Free Data Structures

```java
// AtomicLong uses CPU compare-and-swap (CAS)
AtomicLong bestBid = new AtomicLong(0);

// Update without lock (non-blocking)
long prev = bestBid.get();
if (bestBid.compareAndSet(prev, newPrice)) {
    // Success: price updated atomically
} else {
    // Conflict: retry
}
```

CAS operation is atomic at CPU level:
```
1. Read value from memory
2. Compare with expected
3. If equal: write new value
4. All in one CPU instruction
```

### Direct ByteBuffers (Off-Heap Memory)

```java
// On-heap (garbage collected)
ByteBuffer heapBuffer = ByteBuffer.allocate(1024);

// Off-heap (not GC'd, direct memory)
ByteBuffer directBuffer = ByteBuffer.allocateDirect(1024);
```

**Off-heap advantages:**
- Not subject to GC pauses
- Can share with JNI/native code
- Potentially better performance for I/O
- No garbage collection overhead

**Off-heap disadvantages:**
- Manual memory management (memory leaks possible)
- Limited by `-XX:MaxDirectMemorySize`
- Slightly slower access

In HFT:
```java
// Pre-allocate direct buffers
ByteBuffer[] networkBuffers = new ByteBuffer[1000];
for (int i = 0; i < 1000; i++) {
    networkBuffers[i] = ByteBuffer.allocateDirect(4096);
}

// Reuse throughout program lifetime
```

---

## SECTION 15: EXAMPLE: COMPLETE PROGRAM EXECUTION

Let's trace a simple order processing program:

```java
public class OrderProcessor {
    public static void main(String[] args) {
        MarketData market = new MarketData();
        Order order = new Order("AAPL", 100, 150.25);
        market.process(order);
    }
}

class Order {
    String symbol;
    int quantity;
    double price;
    
    public Order(String symbol, int quantity, double price) {
        this.symbol = symbol;
        this.quantity = quantity;
        this.price = price;
    }
}

class MarketData {
    void process(Order order) {
        double totalCost = order.quantity * order.price;
        System.out.println("Processing: " + order.symbol);
    }
}
```

### Complete Execution Timeline

**PHASE 1: JVM Startup (t=0-10ms)**
```
1. JVM process starts
   - Allocate heap: 8GB
   - Allocate stacks: per thread
   - Initialize GC (select G1GC)
   - Load Bootstrap ClassLoader
   
2. Load java.lang.String (core class)
   - ClassLoader loads String.class
   - Verification
   - Initialization (static fields)
   - String pool initialized
```

**PHASE 2: Class Loading (t=10-20ms)**
```
3. main(String[]) is invoked
   - JVM loads OrderProcessor.class
   - ClassLoader.loadClass("OrderProcessor")
     → Parental delegation
     → Bootstrap, Extension say "not mine"
     → Application ClassLoader finds it
     → Read .class bytecode
   
   Verification:
   - Bytecode is valid
   - main() method signature correct
   - All references resolvable
   
   Preparation:
   - No static fields, so nothing allocated
   
   Initialization:
   - No static initializers, so nothing runs

4. Both MarketData and Order classes loaded similarly
```

**PHASE 3: main() Execution Begins (t=20-25ms)**
```
5. main() stack frame created:
   ┌──────────────────────────┐
   │ main() Stack Frame       │
   ├──────────────────────────┤
   │ Local Variables:         │
   │  - args: String[]        │
   │  - market: null (TBD)    │
   │  - order: null (TBD)     │
   │                          │
   │ Operand Stack: [empty]   │
   └──────────────────────────┘

6. MarketData market = new MarketData();
   - Bytecode: new MarketData
   - Allocate 16 bytes (object header) on heap (Eden space)
   - Initialize all fields to defaults
   - object reference → 0x400000
   - Store reference in local variable 'market'
   
   ┌──────────────────────────┐
   │ main() Stack Frame       │
   ├──────────────────────────┤
   │ Local Variables:         │
   │  - args: String[...]     │
   │  - market: 0x400000  ←   │
   │  - order: null           │
   └──────────────────────────┘
   
   Heap:
   0x400000 → [MarketData object] (16 bytes, empty)

7. Order order = new Order(...);
   - new Order("AAPL", 100, 150.25)
   - Allocate 56 bytes on heap (Eden space)
   - Call <init> constructor
   
   Constructor execution:
   ┌──────────────────────────────────┐
   │ <init>(String,int,double) Frame  │
   ├──────────────────────────────────┤
   │ Local Variables:                 │
   │  - this: 0x401000                │
   │  - symbol: "AAPL"                │
   │  - quantity: 100                 │
   │  - price: 150.25                 │
   ├──────────────────────────────────┤
   │ Operand Stack: [empty]           │
   └──────────────────────────────────┘
   
   Assignment happens:
   order.symbol = "AAPL"
   order.quantity = 100
   order.price = 150.25
   
   Constructor returns
   Store reference in local variable 'order'
   
   Heap:
   0x401000 → [Order object]
               - symbol: "AAPL"
               - quantity: 100
               - price: 150.25
```

**PHASE 4: Method Invocation (t=25-30ms)**
```
8. market.process(order);
   - Bytecode: invokevirtual MarketData.process
   - Look up MarketData VMT
   - Find process method → 0x777777
   - Push argument (order reference)
   - Call at 0x777777
   
   Interpreter executes process():
   ┌──────────────────────────┐
   │ process(Order) Frame     │
   ├──────────────────────────┤
   │ Local Variables:         │
   │  - this: 0x400000        │
   │  - order: 0x401000       │
   │  - totalCost: ? (TBD)    │
   └──────────────────────────┘
   
9. double totalCost = order.quantity * order.price;
   - Get order reference from local
   - getfield order.quantity → 100
   - getfield order.price → 150.25
   - Multiply: 100 * 150.25 = 15025.0
   - Store in totalCost

10. System.out.println("Processing: " + order.symbol);
    - String concatenation creates new String
    - Allocate 38 bytes on heap
    - Append operations
    - Call println
    - Output: "Processing: AAPL"

11. Return from process()
    - Stack frame popped
    - Control returns to main()

12. main() returns void
    - Stack frame popped
    - Thread finishes
```

**PHASE 5: Cleanup (t=30-50ms)**
```
13. No more code to execute
    - Main thread exits
    - JVM checks for other threads
    - No other threads (default: exits)

14. GC may run before exit (if needed)
    - Collect garbage from Eden
    - Finalize all threads

15. JVM terminates
    - Release all memory
    - Exit process
```

### Memory State at Different Times

**After Line 6 (MarketData created):**
```
Heap:
┌────────────────────────────────────┐
│ Eden:                              │
│ 0x400000 → [MarketData] (16 bytes) │
│                                    │
│ Rest: empty                        │
└────────────────────────────────────┘

Stack:
┌──────────────────────┐
│ main() Frame         │
│ market: 0x400000     │
│ order: null          │
└──────────────────────┘
```

**After Line 7 (Order created):**
```
Heap:
┌──────────────────────────────────┐
│ Eden:                            │
│ 0x400000 → [MarketData]          │
│ 0x401000 → [Order] (56 bytes)    │
│            - symbol: (reference) │
│            - quantity: 100       │
│            - price: 150.25       │
│                                  │
│ String Pool:                     │
│ "AAPL" → 0x402000               │
└──────────────────────────────────┘
```

**After process() completes:**
```
Heap allocations:
- MarketData: 16 bytes (unused)
- Order: 56 bytes (unused)
- "AAPL" String: 38 bytes (unused)
- Result string: 38 bytes (unused)
= ~150 bytes total

If minor GC occurs now:
- All objects in local scope are marked as roots
- All objects are reachable (not yet garbage)
- Minor GC doesn't collect

After main() finishes:
- No more root references
- All objects become unreachable
- Next GC will reclaim all
```

### GC During Execution

```
Timeline with GC:

t=0: JVM starts
t=20: OrderProcessor class loaded
t=25: MarketData allocated (16 bytes Eden)
t=26: Order allocated (56 bytes Eden)
t=27: process() runs
t=28: Temporary string concatenation result
t=30: main() returns

t=35: Eden full (assume allocated ~100MB total)
t=35: **MINOR GC TRIGGERED**
     - Mark phase: trace reachability
     - Order, MarketData, strings → all unreachable (no root)
     - Sweep: reclaim all ~100MB
     - Result: Eden now empty, S0 empty
     
t=40: New allocations start fresh in Eden

t=45: main() thread exits
t=50: JVM terminates (no full GC needed)
```

---

## SECTION 16: SUMMARY & KEY TAKEAWAYS

### The Mental Model

```
Java Source Code
    ↓ [javac - compile to bytecode]
Stack-based Bytecode
    ↓ [ClassLoader - load to memory]
Classes in Heap + Metaspace
    ↓ [Verification + Initialization]
Ready-to-execute bytecode
    ↓ [Interpreter]
Slow execution (10-100 MIPS)
    ↓ [JIT Compiler detects hot code]
Native compiled code
    ↓ [Execute native code]
Fast execution (1000+ MIPS)
    ↓ [GC manages memory]
Live application
```

### Performance Checklist for HFT

- [ ] GC pause time < 50ms (G1GC, -XX:MaxGCPauseMillis=50)
- [ ] No full GCs (tune -Xmx appropriately)
- [ ] Code cache not full (monitor CodeCache usage)
- [ ] Escape analysis enabled (-XX:+DoEscapeAnalysis)
- [ ] Inlining aggressive (tune -XX:InlineSmallCode)
- [ ] TLAB size appropriate (-XX:TLABSize)
- [ ] CPU affinity set (taskset)
- [ ] NUMA awareness (-XX:+UseNUMA)
- [ ] String deduplication off (unless memory-bound)
- [ ] Pre-allocation strategy in place (pools)

### Tools to Master

1. **jstat**: Real-time GC stats
2. **jmap**: Heap dump for analysis
3. **jfr**: Flight recorder for profiling
4. **async-profiler**: Flame graphs
5. **GCeasy.io**: Log analysis
6. **Eclipse MAT**: Memory leak detection
7. **JProfiler/YourKit**: Full profiling

---

## CONCLUSION

The JVM is one of the most sophisticated pieces of software engineering. From bytecode interpretation to speculative JIT compilation, from generational garbage collection to NUMA-aware memory management, every microsecond of latency comes from understanding these layers deeply.

For HFT, the difference between a 100-microsecond execution and a 110-microsecond execution can be the difference between profit and loss. Master these concepts, and you'll write Java that performs like C while retaining safety and maintainability.

Remember: **The best optimization is no allocation.**

---

**Last updated**: 2024
**For**: Senior HFT Developers & Java Prodigies
**Version**: 1.0 - Deep Dive Edition
