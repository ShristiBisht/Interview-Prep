# Advanced Java: Complete HFT Developer's Masterclass
## Lambda, Threading, GC, Collections, and Beyond

---

## TABLE OF CONTENTS

1. [Functional Programming & Lambda Expressions](#1-functional-programming--lambda-expressions)
2. [Functional Interfaces (Producer, Consumer, Supplier, etc.)](#2-functional-interfaces-producer-consumer-supplier-etc)
3. [Streams API](#3-streams-api)
4. [Exception Handling Deep Dive](#4-exception-handling-deep-dive)
5. [File I/O (NIO, Channels, Memory Mapped)](#5-file-io-nio-channels-memory-mapped)
6. [String Manipulation & Interning](#6-string-manipulation--interning)
7. [Wrapper Classes & Autoboxing](#7-wrapper-classes--autoboxing)
8. [Collections Framework Architecture](#8-collections-framework-architecture)
9. [ArrayList Deep Dive](#9-arraylist-deep-dive)
10. [HashMap & Hash Tables](#10-hashmap--hash-tables)
11. [HashSet & Equality](#11-hashset--equality)
12. [LinkedList & Deque](#12-linkedlist--deque)
13. [Threading Fundamentals](#13-threading-fundamentals)
14. [Synchronization & Locks](#14-synchronization--locks)
15. [Virtual Threads (Java 19+)](#15-virtual-threads-java-19)
16. [Garbage Collection Detailed](#16-garbage-collection-detailed)
17. [Optional Deep Dive](#17-optional-deep-dive)
18. [Database Connection Pooling (Hikari)](#18-database-connection-pooling-hikari)
19. [Interfaces vs Abstract Classes](#19-interfaces-vs-abstract-classes)
20. [SOLID Principles](#20-solid-principles)
21. [Java 8 Enhancements](#21-java-8-enhancements)
22. [Java 21 & Recent Features](#22-java-21--recent-features)

---

## 1. FUNCTIONAL PROGRAMMING & LAMBDA EXPRESSIONS

### Why Functional Programming?

Traditional imperative:
```java
// Old way: how to do it
List<String> names = Arrays.asList("Alice", "Bob", "Charlie");
List<String> filtered = new ArrayList<>();
for (String name : names) {
    if (name.length() > 3) {
        filtered.add(name);
    }
}
System.out.println(filtered);  // [Alice, Charlie]
```

Functional:
```java
// New way: what you want
List<String> filtered = names.stream()
    .filter(name -> name.length() > 3)
    .collect(Collectors.toList());
System.out.println(filtered);  // [Alice, Charlie]
```

**Benefits:**
- **Readable**: What you want (declarative), not how to do it (imperative)
- **Parallelizable**: Easier to parallelize functional code
- **Testable**: Pure functions easier to test
- **Concurrent**: Immutability avoids synchronization

### Lambda Expression Syntax

```java
// Syntax: (parameters) -> body

// 1. No parameters
() -> System.out.println("Hello")

// 2. One parameter (parentheses optional)
x -> x * 2
(x) -> x * 2

// 3. Multiple parameters
(x, y) -> x + y

// 4. One statement (no braces)
x -> x * 2

// 5. Multiple statements (braces required)
x -> {
    int result = x * 2;
    System.out.println(result);
    return result;
}

// 6. Complex expressions
(list) -> {
    int sum = 0;
    for (int num : list) sum += num;
    return sum;
}
```

### Type Inference

```java
// Without type hints
List<Integer> numbers = Arrays.asList(1, 2, 3);
numbers.forEach(n -> System.out.println(n * 2));
// Compiler infers: n is Integer

// With explicit types (optional)
numbers.forEach((Integer n) -> System.out.println(n * 2));

// Mixed (if needed for clarity)
// (String s, int i) -> s.repeat(i)
```

### Method References

Cleaner alternative to lambdas:

```java
// Lambda
System.out::println
// Replaces: (s) -> System.out.println(s)

// Static method reference
Integer::parseInt
// Replaces: (s) -> Integer.parseInt(s)

// Instance method
String::length
// Replaces: (s) -> s.length()

// Constructor reference
ArrayList::new
// Replaces: () -> new ArrayList()

// Usage in streams
List<String> numbers = Arrays.asList("1", "2", "3");
numbers.stream()
    .map(Integer::parseInt)      // Method reference!
    .forEach(System.out::println); // Method reference!
```

### Capturing Variables

```java
int multiplier = 5;

// Lambda captures multiplier
Function<Integer, Integer> multiply = x -> x * multiplier;

// Key rule: captured variables must be effectively final
multiplier = 10;  // ERROR! Can't change after lambda capture
multiply.apply(2);  // Would be ambiguous (which multiplier?)
```

**Why effectively final?**
- Lambdas are closures over values, not references
- Prevents race conditions and ambiguity
- If variable were mutable, thread safety would be nightmare

**Solution: Use wrapper if you need to mutate**
```java
int[] multiplier = {5};  // Array wrapper (mutable)
Function<Integer, Integer> multiply = x -> x * multiplier[0];
multiplier[0] = 10;  // OK: changing array contents, not reference
```

### Scope & this

```java
class Calculator {
    int base = 10;
    
    void calculate() {
        int local = 5;
        
        Function<Integer, Integer> add = x -> {
            return x + this.base + local;  // Can access all three
        };
    }
}

// this = reference to enclosing Calculator object
// base = accessed via this
// local = captured from local scope
```

---

## 2. FUNCTIONAL INTERFACES (Producer, Consumer, Supplier, Etc)

### What is a Functional Interface?

An interface with **exactly one abstract method**. Can have default/static methods.

```java
@FunctionalInterface
public interface MyInterface {
    void doSomething();  // One abstract method
    
    default void someDefault() {  // Default OK
        System.out.println("Default");
    }
    
    static void someStatic() {  // Static OK
        System.out.println("Static");
    }
}

// Can implement with lambda
MyInterface impl = () -> System.out.println("Implementation");

// @FunctionalInterface is optional but recommended
// Compiler enforces single abstract method
```

### Built-in Functional Interfaces

#### 1. Consumer<T> - Takes value, returns nothing

```java
Consumer<String> printer = s -> System.out.println(s);
printer.accept("Hello");  // Output: Hello

// Common use: forEach
List<String> names = Arrays.asList("Alice", "Bob");
names.forEach(name -> System.out.println(name));
```

**Method signature:**
```
void accept(T t);
```

#### 2. Producer/Supplier<T> - Returns value, takes nothing

```java
Supplier<String> greeter = () -> "Hello, World!";
System.out.println(greeter.get());  // Output: Hello, World!

// Common use: lazy evaluation
Supplier<ExpensiveObject> lazy = () -> new ExpensiveObject();
ExpensiveObject obj = lazy.get();  // Created only when called
```

**Method signature:**
```
T get();
```

#### 3. Function<T, R> - Takes T, returns R

```java
Function<Integer, Integer> square = x -> x * x;
System.out.println(square.apply(5));  // Output: 25

// Chaining (composition)
Function<Integer, Integer> addOne = x -> x + 1;
Function<Integer, Integer> addOneSquare = square.andThen(addOne);
System.out.println(addOneSquare.apply(5));  // (5*5)+1 = 26

Function<Integer, Integer> squareAddOne = addOne.compose(square);
System.out.println(squareAddOne.apply(5));  // (5+1)*5 = ... wait no
// compose goes: square(addOne(5)) = square(6) = 36
```

**Method signature:**
```
R apply(T t);
```

#### 4. Predicate<T> - Takes T, returns boolean

```java
Predicate<Integer> isEven = n -> n % 2 == 0;
System.out.println(isEven.test(4));  // true
System.out.println(isEven.test(5));  // false

// Combining predicates
Predicate<Integer> isPositive = n -> n > 0;
Predicate<Integer> isEvenAndPositive = isEven.and(isPositive);

System.out.println(isEvenAndPositive.test(4));   // true
System.out.println(isEvenAndPositive.test(-4));  // false

// Negation
Predicate<Integer> isOdd = isEven.negate();
System.out.println(isOdd.test(5));  // true
```

**Method signature:**
```
boolean test(T t);
```

#### 5. BiFunction<T, U, R> - Two inputs, one output

```java
BiFunction<Integer, Integer, Integer> add = (a, b) -> a + b;
System.out.println(add.apply(5, 3));  // Output: 8

// Real-world: Comparator
Comparator<Integer> comp = (a, b) -> a - b;  // BiFunction<Integer, Integer, Integer>
```

**Method signature:**
```
R apply(T t, U u);
```

#### 6. UnaryOperator<T> - Same type in and out

```java
UnaryOperator<Integer> double = x -> x * 2;
System.out.println(double.apply(5));  // Output: 10

// Common in streams
List<Integer> numbers = Arrays.asList(1, 2, 3);
numbers.replaceAll(x -> x * 2);  // UnaryOperator
```

**Method signature:**
```
T apply(T t);
```

#### 7. BinaryOperator<T> - Two same types in, same type out

```java
BinaryOperator<Integer> multiply = (a, b) -> a * b;
System.out.println(multiply.apply(5, 3));  // Output: 15

// Common: reduce
List<Integer> numbers = Arrays.asList(1, 2, 3, 4);
int product = numbers.stream()
    .reduce(1, (a, b) -> a * b);  // BinaryOperator
System.out.println(product);  // Output: 24
```

**Method signature:**
```
T apply(T t, T u);
```

### Creating Custom Functional Interfaces

```java
@FunctionalInterface
public interface DataProcessor<T> {
    T process(T input);
    
    default void log(String message) {
        System.out.println(message);
    }
}

// Use
DataProcessor<Integer> square = x -> {
    x = x * x;
    return x;
};
```

### Practical Example: HFT Order Processing

```java
// Define processors
interface OrderProcessor {
    Order process(Order order);
}

interface OrderValidator {
    boolean validate(Order order);
}

// Use in pipeline
public class TradingEngine {
    private List<OrderProcessor> processors = new ArrayList<>();
    private OrderValidator validator;
    
    void addProcessor(OrderProcessor processor) {
        processors.add(processor);
    }
    
    void processOrder(Order order) {
        if (!validator.validate(order)) {
            System.out.println("Invalid order");
            return;
        }
        
        Order processed = order;
        for (OrderProcessor processor : processors) {
            processed = processor.process(processed);
        }
        
        submitOrder(processed);
    }
}

// Usage
engine.setValidator(order -> order.quantity > 0 && order.price > 0);
engine.addProcessor(order -> {  // Add risk check
    order.risk = order.quantity * order.price;
    return order;
});
engine.addProcessor(order -> {  // Add fee calculation
    order.fee = order.quantity * 0.001;
    return order;
});
```

---

## 3. STREAMS API

### Stream Basics

```java
// Stream: A sequence of elements supporting operations

List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5);

// Intermediate operations (lazy): filter, map, distinct, etc.
// Terminal operation (eager): forEach, collect, reduce, etc.

numbers.stream()
    .filter(n -> n % 2 == 0)        // Intermediate (lazy)
    .map(n -> n * n)                // Intermediate (lazy)
    .forEach(System.out::println);  // Terminal (eager)
    
// Output: 4, 16 (squared even numbers)
```

### Lazy Evaluation

```java
List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5);

numbers.stream()
    .filter(n -> {
        System.out.println("Filtering: " + n);
        return n % 2 == 0;
    })
    .map(n -> {
        System.out.println("Mapping: " + n);
        return n * n;
    })
    .limit(1)                // Only take first result
    .forEach(System.out::println);

// Output:
// Filtering: 1
// Filtering: 2
// Mapping: 2
// 4
// (Filtering stops after limit reached, doesn't process 3, 4, 5)
```

### Key Stream Operations

#### Intermediate Operations

```java
// filter: Keep elements matching predicate
numbers.stream()
    .filter(n -> n > 2)
    // [3, 4, 5]

// map: Transform each element
numbers.stream()
    .map(n -> n * 2)
    // [2, 4, 6, 8, 10]

// flatMap: Map and flatten
List<List<Integer>> nested = Arrays.asList(
    Arrays.asList(1, 2),
    Arrays.asList(3, 4)
);
nested.stream()
    .flatMap(List::stream)  // Flatten to single stream
    // [1, 2, 3, 4]

// distinct: Remove duplicates
Stream.of(1, 2, 2, 3, 3, 3)
    .distinct()
    // [1, 2, 3]

// sorted: Order elements
numbers.stream()
    .sorted()
    // [1, 2, 3, 4, 5]

numbers.stream()
    .sorted(Comparator.reverseOrder())
    // [5, 4, 3, 2, 1]

// limit: Take first N
numbers.stream()
    .limit(3)
    // [1, 2, 3]

// skip: Skip first N
numbers.stream()
    .skip(2)
    // [3, 4, 5]

// peek: Inspect without modifying (debug)
numbers.stream()
    .peek(System.out::println)  // Print each
    .filter(n -> n > 2)
    .forEach(System.out::println);
```

#### Terminal Operations

```java
// forEach: Consume all elements
numbers.stream()
    .forEach(System.out::println);

// collect: Gather into collection
List<Integer> doubled = numbers.stream()
    .map(n -> n * 2)
    .collect(Collectors.toList());

// reduce: Combine into single value
int sum = numbers.stream()
    .reduce(0, (a, b) -> a + b);  // Start with 0, add all

// min/max
int min = numbers.stream()
    .min(Comparator.naturalOrder())
    .orElse(0);

// count
long count = numbers.stream()
    .filter(n -> n % 2 == 0)
    .count();

// anyMatch/allMatch/noneMatch
boolean hasEven = numbers.stream()
    .anyMatch(n -> n % 2 == 0);

boolean allPositive = numbers.stream()
    .allMatch(n -> n > 0);

// findFirst/findAny
Optional<Integer> first = numbers.stream()
    .filter(n -> n > 2)
    .findFirst();
```

### Collectors

```java
List<String> names = Arrays.asList("Alice", "Bob", "Charlie");

// toList
List<String> list = names.stream()
    .collect(Collectors.toList());

// toSet
Set<String> set = names.stream()
    .collect(Collectors.toSet());

// toMap
Map<String, Integer> nameToLength = names.stream()
    .collect(Collectors.toMap(
        Function.identity(),  // Key: name itself
        String::length        // Value: length
    ));
// {Alice=5, Bob=3, Charlie=7}

// groupingBy: Group by characteristic
List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5, 6);
Map<String, List<Integer>> byParity = numbers.stream()
    .collect(Collectors.groupingBy(
        n -> n % 2 == 0 ? "even" : "odd"
    ));
// {odd=[1, 3, 5], even=[2, 4, 6]}

// partitioningBy: Split into true/false
Map<Boolean, List<Integer>> partition = numbers.stream()
    .collect(Collectors.partitioningBy(n -> n % 2 == 0));
// {false=[1, 3, 5], true=[2, 4, 6]}

// joining: Concatenate strings
String joined = names.stream()
    .collect(Collectors.joining(", "));
// "Alice, Bob, Charlie"

// Custom collector
Collector<Integer, ?, Integer> sumCollector = 
    Collectors.summingInt(Integer::intValue);
int sum = numbers.stream()
    .collect(sumCollector);
```

### Parallel Streams

```java
List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);

// Sequential
long start = System.nanoTime();
int sum = numbers.stream()
    .filter(n -> n % 2 == 0)
    .map(n -> n * n)
    .reduce(0, Integer::sum);
long seqTime = System.nanoTime() - start;

// Parallel
start = System.nanoTime();
int sumParallel = numbers.parallelStream()
    .filter(n -> n % 2 == 0)
    .map(n -> n * n)
    .reduce(0, Integer::sum);
long parTime = System.nanoTime() - start;

System.out.println("Sequential: " + seqTime);
System.out.println("Parallel: " + parTime);
// Parallel often slower for small datasets due to overhead
// Better for large datasets (millions of elements)
```

**When to use parallel streams:**
- Large datasets (100k+ elements)
- Expensive operations per element
- NOT recommended for I/O operations (blocking)
- NOT recommended if operations maintain state

---

## 4. EXCEPTION HANDLING DEEP DIVE

### Exception Hierarchy

```
Throwable
├── Error (system failure, don't catch)
│   ├── OutOfMemoryError
│   ├── StackOverflowError
│   └── VirtualMachineError
└── Exception (recoverable)
    ├── Checked Exception (must catch)
    │   ├── IOException
    │   ├── SQLException
    │   └── (custom checked exceptions)
    └── Unchecked Exception (optional to catch)
        ├── RuntimeException
        │   ├── NullPointerException
        │   ├── ArrayIndexOutOfBoundsException
        │   └── ArithmeticException
        └── (custom runtime exceptions)
```

### Checked vs Unchecked

```java
// CHECKED: Compiler forces you to handle
void readFile(String filename) throws IOException {
    // Must throw or catch IOException
    FileReader reader = new FileReader(filename);
    // ...
}

// UNCHECKED: Compiler doesn't force
void divide(int a, int b) {
    // ArithmeticException not declared
    int result = a / b;  // Throws if b==0, but not required to declare
}
```

### Try-Catch-Finally

```java
try {
    // Code that might throw exception
    int result = 10 / 0;  // ArithmeticException
} catch (ArithmeticException e) {
    // Handle specific exception
    System.out.println("Cannot divide by zero: " + e.getMessage());
} catch (Exception e) {
    // Catch-all (should be last)
    System.out.println("Some error: " + e);
} finally {
    // ALWAYS executes (unless JVM exits)
    System.out.println("Cleanup code");
}

// Output:
// Cannot divide by zero: / by zero
// Cleanup code
```

### Multiple Catch Blocks (Order Matters!)

```java
try {
    // ...
} catch (NullPointerException e) {
    // Specific first
    System.out.println("Null pointer");
} catch (RuntimeException e) {
    // More general
    System.out.println("Runtime error");
} catch (Exception e) {
    // Most general last
    System.out.println("Any error");
}

// Wrong order (compile error):
try {
    // ...
} catch (Exception e) {
    // Catches everything!
} catch (NullPointerException e) {
    // Unreachable (already caught)
}
```

### Try-with-Resources (Auto Close)

```java
// Old way (manual)
BufferedReader reader = null;
try {
    reader = new BufferedReader(new FileReader("file.txt"));
    String line = reader.readLine();
} catch (IOException e) {
    e.printStackTrace();
} finally {
    if (reader != null) {
        try {
            reader.close();  // What if close() throws?
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}

// New way (try-with-resources)
try (BufferedReader reader = new BufferedReader(new FileReader("file.txt"))) {
    String line = reader.readLine();
} catch (IOException e) {
    e.printStackTrace();
}
// reader.close() called automatically!
```

**Key points:**
- Resource must implement AutoCloseable
- close() called automatically in reverse order
- Exceptions from close() are suppressed (available via getSuppressed())

### Multi-Catch (Java 7+)

```java
try {
    // ...
} catch (IOException | SQLException e) {
    // Catch multiple exception types
    System.out.println("Error: " + e.getMessage());
    // e is effectively final, so can be used safely
}
```

### Throwing Exceptions

```java
public void validateAge(int age) throws IllegalArgumentException {
    if (age < 0) {
        throw new IllegalArgumentException("Age cannot be negative");
    }
}

// Custom exception
public class OrderException extends Exception {
    public OrderException(String message) {
        super(message);
    }
}

public void processOrder(Order order) throws OrderException {
    if (order.quantity <= 0) {
        throw new OrderException("Invalid quantity: " + order.quantity);
    }
}
```

### Exception Chain (Cause)

```java
try {
    // ...
} catch (SQLException e) {
    // Wrap and re-throw with cause
    throw new OrderException("Failed to save order", e);
}

// Printing stack trace shows full chain:
OrderException: Failed to save order
    at OrderService.saveOrder(OrderService.java:42)
Caused by: SQLException: Connection timeout
    at DataSource.getConnection(DataSource.java:100)
```

### Stack Trace Inspection

```java
try {
    // ...
} catch (Exception e) {
    // Get stack trace
    StackTraceElement[] trace = e.getStackTrace();
    for (StackTraceElement element : trace) {
        System.out.println(element.getClassName() + "." + 
                          element.getMethodName() + ":" + 
                          element.getLineNumber());
    }
    
    // Or print full trace
    e.printStackTrace();
}
```

### Best Practices

```java
// ❌ BAD: Catching too broad
try {
    // ...
} catch (Exception e) {
    System.out.println("Error");  // Swallows important info
}

// ✅ GOOD: Specific exception
try {
    // ...
} catch (IOException e) {
    logger.error("Failed to read file", e);
}

// ❌ BAD: Catching and ignoring
try {
    // ...
} catch (Exception e) {
    // silence
}

// ✅ GOOD: Log or re-throw
try {
    // ...
} catch (Exception e) {
    logger.error("Unexpected error", e);
    throw new ApplicationException("Operation failed", e);
}

// ❌ BAD: Throwing generic Exception
public void process() throws Exception {
    // Too vague
}

// ✅ GOOD: Specific exception
public void process() throws IOException, SQLException {
    // Clear what can fail
}
```

---

## 5. FILE I/O (NIO, CHANNELS, MEMORY MAPPED)

### Old I/O (Streams) vs New I/O (NIO)

| Aspect | Old I/O (Streams) | New I/O (NIO) |
|--------|-------------------|---------------|
| Model | Byte-oriented | Buffer-oriented |
| Blocking | Always blocking | Non-blocking possible |
| Channels | No | Yes (selectable) |
| Scalability | One thread per stream | One thread many connections |
| Performance | Slower for many files | Faster for many files |

### File Reading

#### Old I/O
```java
// Reading entire file
String content = new String(Files.readAllBytes(Paths.get("file.txt")));

// Reading line by line
try (BufferedReader reader = new BufferedReader(new FileReader("file.txt"))) {
    String line;
    while ((line = reader.readLine()) != null) {
        System.out.println(line);
    }
}
```

#### New I/O (NIO)
```java
// Reading entire file (NIO)
String content = new String(Files.readAllBytes(Paths.get("file.txt")));

// Reading with buffer
ByteBuffer buffer = ByteBuffer.allocate(1024);
try (FileInputStream fis = new FileInputStream("file.txt")) {
    FileChannel channel = fis.getChannel();
    while (channel.read(buffer) > 0) {
        buffer.flip();  // Switch from write to read mode
        while (buffer.hasRemaining()) {
            byte b = buffer.get();
            System.out.print((char) b);
        }
        buffer.clear();  // Clear for next read
    }
}
```

### ByteBuffer (Memory-Oriented)

```java
// Allocate buffer
ByteBuffer buffer = ByteBuffer.allocate(1024);  // Heap buffer
ByteBuffer directBuffer = ByteBuffer.allocateDirect(1024);  // Direct (off-heap)

// Position and limit
buffer.position();      // Current position (0 initially)
buffer.limit();         // Limit (capacity initially)
buffer.capacity();      // Fixed size (1024)

// Writing to buffer
buffer.put((byte) 'H');
buffer.put((byte) 'i');
System.out.println("Position: " + buffer.position());  // 2

// Switching modes
buffer.flip();  // Position = 0, Limit = old position
System.out.println("Limit: " + buffer.limit());  // 2

// Reading from buffer
byte b = buffer.get();  // Reads 'H'
System.out.println("Position: " + buffer.position());  // 1

// Rewind
buffer.rewind();  // Position = 0 (same limit)
buffer.get();  // Reads 'H' again

// Clear
buffer.clear();  // Position = 0, Limit = capacity
```

### FileChannel (Seek, Transfer)

```java
// Random access
try (RandomAccessFile raf = new RandomAccessFile("file.txt", "r")) {
    FileChannel channel = raf.getChannel();
    
    // Seek to position
    channel.position(100);
    
    // Read from position
    ByteBuffer buffer = ByteBuffer.allocate(64);
    channel.read(buffer);
    
    // Get current position
    long pos = channel.position();
}

// Transfer between channels (zero-copy)
try (FileInputStream fis = new FileInputStream("source.txt");
     FileOutputStream fos = new FileOutputStream("dest.txt")) {
    
    FileChannel srcChannel = fis.getChannel();
    FileChannel dstChannel = fos.getChannel();
    
    // Zero-copy transfer
    srcChannel.transferTo(0, srcChannel.size(), dstChannel);
}
```

### Memory-Mapped Files (Fastest!)

```java
// Memory-map file for reading
try (RandomAccessFile file = new RandomAccessFile("large.bin", "r")) {
    FileChannel channel = file.getChannel();
    
    MappedByteBuffer buffer = channel.map(
        FileChannel.MapMode.READ_ONLY,
        0,  // Start position
        file.length()  // Size
    );
    
    // Access like regular buffer (but backed by file)
    while (buffer.hasRemaining()) {
        byte b = buffer.get();
        System.out.print((char) b);
    }
}

// For writing
try (RandomAccessFile file = new RandomAccessFile("output.bin", "rw")) {
    FileChannel channel = file.getChannel();
    
    MappedByteBuffer buffer = channel.map(
        FileChannel.MapMode.READ_WRITE,
        0,
        1024
    );
    
    buffer.put("Hello, World!".getBytes());
    // Changes automatically written to file
}
```

**Memory-mapped advantages:**
- Ultra-fast for large files
- Backed by OS page cache
- Changes automatically persisted
- No manual flush needed

### Path & Files Utilities

```java
Path path = Paths.get("src/main/java/Example.java");

// File operations
Files.exists(path);
Files.isDirectory(path);
Files.isReadable(path);
Files.size(path);
Files.getLastModifiedTime(path);

// Create
Files.createFile(path);
Files.createDirectory(Paths.get("dir"));
Files.createDirectories(Paths.get("a/b/c"));

// Delete
Files.delete(path);
Files.deleteIfExists(path);

// Copy
Files.copy(source, dest, StandardCopyOption.REPLACE_EXISTING);

// Move
Files.move(source, dest, StandardCopyOption.ATOMIC_MOVE);

// Walk directory
Files.walk(Paths.get("."))
    .filter(Files::isRegularFile)
    .filter(p -> p.toString().endsWith(".java"))
    .forEach(System.out::println);
```

### NIO Channels (Non-Blocking)

```java
// Selector for non-blocking I/O
Selector selector = Selector.open();

ServerSocketChannel serverChannel = ServerSocketChannel.open();
serverChannel.configureBlocking(false);
serverChannel.bind(new InetSocketAddress(8080));

// Register for accept events
SelectionKey key = serverChannel.register(selector, SelectionKey.OP_ACCEPT);

while (true) {
    int ready = selector.select();  // Block until event
    
    if (ready == 0) continue;
    
    Set<SelectionKey> selectedKeys = selector.selectedKeys();
    Iterator<SelectionKey> iter = selectedKeys.iterator();
    
    while (iter.hasNext()) {
        SelectionKey selectedKey = iter.next();
        iter.remove();
        
        if (selectedKey.isAcceptable()) {
            // Accept new connection
            SocketChannel socketChannel = serverChannel.accept();
            socketChannel.configureBlocking(false);
            socketChannel.register(selector, SelectionKey.OP_READ);
        } else if (selectedKey.isReadable()) {
            // Read from socket
            SocketChannel socketChannel = (SocketChannel) selectedKey.channel();
            ByteBuffer buffer = ByteBuffer.allocate(1024);
            socketChannel.read(buffer);
        }
    }
}

// One thread handles thousands of connections!
```

---

## 6. STRING MANIPULATION & INTERNING

### String Immutability

```java
String s = "Hello";
s.concat(" World");  // Creates new String, doesn't modify s

System.out.println(s);  // Still "Hello"

// To actually concatenate, reassign
s = s.concat(" World");
System.out.println(s);  // "Hello World"

// Why immutable?
// - Thread-safe (no synchronization needed)
// - Can be used as HashMap key (hash won't change)
// - Security (passwords can't be overwritten)
```

### String Pool (Interning)

```java
// String literals automatically interned (in pool)
String s1 = "hello";
String s2 = "hello";
System.out.println(s1 == s2);  // true (same reference)

// String objects created with new aren't in pool
String s3 = new String("hello");
String s4 = new String("hello");
System.out.println(s3 == s4);  // false (different objects)
System.out.println(s3.equals(s4));  // true (same content)

// Explicit interning
String s5 = new String("hello").intern();
System.out.println(s1 == s5);  // true (now same reference)

// String pool location
String s6 = "hello";
// Java 6: String pool in PermGen (limited, can OutOfMemory)
// Java 7+: String pool in Heap (no more OutOfMemory)
```

### String Concatenation

```java
// ❌ Old way: StringBuilder
String result = "";
for (int i = 0; i < 1000; i++) {
    result += "Item " + i;  // Creates 1000 intermediate Strings!
}

// ✅ Good way: StringBuilder
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 1000; i++) {
    sb.append("Item ").append(i).append("\n");
}
String result = sb.toString();

// ✅ Modern (Java 11+): Text Blocks
String text = """
    Line 1
    Line 2
    Line 3
    """;

// ✅ Modern: String.format
String formatted = String.format("Name: %s, Age: %d", "Alice", 30);

// ✅ Modern: String.join
String joined = String.join(", ", "Alice", "Bob", "Charlie");

// ✅ Modern: String template (Java 21)
// String message = STR."Hello \{name}";  // Preview feature
```

### StringBuilder vs StringBuffer

```java
// StringBuffer (synchronized, thread-safe)
StringBuffer threadSafe = new StringBuffer("Hello");
threadSafe.append(" World");

// StringBuilder (not synchronized, faster)
StringBuilder fast = new StringBuilder("Hello");
fast.append(" World");

// StringBuilder is faster for single-threaded code
// StringBuffer used when sharing across threads
```

### String Methods

```java
String s = "Hello, World!";

// Searching
s.indexOf('o');              // 4
s.lastIndexOf('o');          // 8
s.contains("World");         // true
s.startsWith("Hello");       // true
s.endsWith("!");             // true

// Extracting
s.substring(0, 5);           // "Hello"
s.substring(7);              // "World!"

// Transforming
s.toUpperCase();             // "HELLO, WORLD!"
s.toLowerCase();             // "hello, world!"
s.strip();                   // Remove leading/trailing whitespace
s.stripLeading();            // Remove leading only
s.stripTrailing();           // Remove trailing only

// Replacing
s.replace('o', '0');         // "Hell0, W0rld!"
s.replaceAll("l+", "L");     // "HeLo, WorLd!"

// Splitting
String[] parts = "a,b,c".split(",");  // ["a", "b", "c"]

// Repeating (Java 11+)
"ab".repeat(3);              // "ababab"

// Comparison
s.equals("Hello, World!");          // true (content)
s.equalsIgnoreCase("hello, world!"); // true (case-insensitive)
s.compareTo("Hello, Worlds");        // negative (< "Worlds")
```

### Regular Expressions

```java
String text = "Order 123 at 2024-01-15";

// Pattern matching
Pattern pattern = Pattern.compile("\\d+");
Matcher matcher = pattern.matcher(text);

while (matcher.find()) {
    System.out.println(matcher.group());  // 123, 2024, 01, 15
}

// Simple matching
boolean matches = text.matches(".*\\d{3}.*");  // true (has 3 digits)

// Replace all numbers
String replaced = text.replaceAll("\\d+", "X");  // "Order X at X-X-X"

// Split on pattern
String[] parts = text.split("\\s+");  // Split on whitespace
// ["Order", "123", "at", "2024-01-15"]

// Capture groups
Pattern p = Pattern.compile("(\\w+):(\\d+)");
Matcher m = p.matcher("host:8080");
if (m.find()) {
    System.out.println(m.group(1));  // "host"
    System.out.println(m.group(2));  // "8080"
}
```

---

## 7. WRAPPER CLASSES & AUTOBOXING

### Wrapper Classes

```java
// Primitive types
int, long, float, double, boolean, byte, short, char

// Wrapper classes
Integer, Long, Float, Double, Boolean, Byte, Short, Character

// Wrapping (boxing)
Integer boxed = Integer.valueOf(42);
Integer boxed2 = new Integer(42);  // Deprecated

// Unwrapping (unboxing)
int unboxed = boxed.intValue();

// Other useful methods
Integer.parseInt("123");           // String to int
Integer.toString(123);             // int to String
Integer.MAX_VALUE;                 // 2147483647
Integer.MIN_VALUE;                 // -2147483648
Integer.toBinaryString(15);        // "1111"
Integer.toHexString(255);          // "ff"
```

### Autoboxing & Unboxing

```java
// Autoboxing (automatic primitive → wrapper)
Integer boxed = 42;  // Automatically calls Integer.valueOf(42)

// Unboxing (automatic wrapper → primitive)
int unboxed = boxed;  // Automatically calls boxed.intValue()

// Works in collections
List<Integer> numbers = new ArrayList<>();
numbers.add(42);  // Autoboxed to Integer

for (int num : numbers) {  // Unboxed to int
    System.out.println(num);
}

// Watch out for null!
Integer nullable = null;
int value = nullable;  // NullPointerException!

// Better practice
int value = nullable != null ? nullable : 0;  // Use default
```

### Performance Implications

```java
// ❌ Inefficient: Boxing in loop
Integer sum = 0;
for (int i = 0; i < 1000; i++) {
    sum += i;  // Box each time, huge overhead
}

// ✅ Efficient: Use primitive
int sum = 0;
for (int i = 0; i < 1000; i++) {
    sum += i;  // No boxing
}

// ❌ Inefficient: Wrapper in hot loop
List<Integer> numbers = new ArrayList<>();
long start = System.nanoTime();
for (int i = 0; i < 1000000; i++) {
    numbers.add(i);  // Boxing 1M times
}
long elapsed = System.nanoTime() - start;

// ✅ Efficient: Primitive in hot loop (if possible)
int[] numbers = new int[1000000];
long start = System.nanoTime();
for (int i = 0; i < 1000000; i++) {
    numbers[i] = i;  // No boxing
}
long elapsed = System.nanoTime() - start;
```

### Integer Cache

```java
// Java caches -128 to 127 for Integer
Integer a = 127;
Integer b = 127;
System.out.println(a == b);  // true (cached)

Integer c = 128;
Integer d = 128;
System.out.println(c == d);  // false (not cached, different objects)

// Always use .equals() for value comparison
Integer x = 128;
Integer y = 128;
System.out.println(x.equals(y));  // true (correct)

// Cache ranges
Byte: -128 to 127
Short: -128 to 127
Integer: -128 to 127
Long: -128 to 127
Boolean: only true/false (cached)
```

---

## 8. COLLECTIONS FRAMEWORK ARCHITECTURE

### Class Hierarchy

```
Iterable
├── Collection
│   ├── List (ordered, allows duplicates)
│   │   ├── ArrayList (growable array)
│   │   ├── LinkedList (doubly-linked list)
│   │   ├── CopyOnWriteArrayList (thread-safe)
│   │   └── Vector (legacy, synchronized)
│   ├── Set (unique elements, no order guarantee)
│   │   ├── HashSet (hash-based, unordered)
│   │   ├── TreeSet (sorted, uses Comparator)
│   │   ├── LinkedHashSet (insertion-order)
│   │   └── ConcurrentHashMap.KeySet
│   └── Queue (FIFO, with priority variants)
│       ├── LinkedList (doubly-ended)
│       ├── PriorityQueue (min-heap by default)
│       ├── Deque (double-ended queue)
│       └── BlockingQueue (thread-safe, blocking)
└── Map (key-value pairs)
    ├── HashMap (hash-based, unordered)
    ├── TreeMap (sorted, uses Comparator)
    ├── LinkedHashMap (insertion-order)
    ├── Hashtable (legacy, synchronized)
    ├── ConcurrentHashMap (thread-safe)
    └── WeakHashMap (uses weak keys)
```

### Iterator Pattern

```java
List<String> names = Arrays.asList("Alice", "Bob", "Charlie");

// Iterator
Iterator<String> iter = names.iterator();
while (iter.hasNext()) {
    String name = iter.next();
    System.out.println(name);
    // iter.remove();  // Safe removal
}

// Enhanced for-loop (under the hood uses Iterator)
for (String name : names) {
    System.out.println(name);
}

// ListIterator (bidirectional)
ListIterator<String> listIter = names.listIterator();
while (listIter.hasNext()) {
    System.out.println("Forward: " + listIter.next());
}

while (listIter.hasPrevious()) {
    System.out.println("Backward: " + listIter.previous());
}

// Stream iteration
names.forEach(System.out::println);
```

### Comparable vs Comparator

```java
// Comparable: natural ordering (inside class)
class Person implements Comparable<Person> {
    String name;
    int age;
    
    @Override
    public int compareTo(Person other) {
        return this.age - other.age;  // Sort by age
    }
}

// Usage
List<Person> people = ...;
Collections.sort(people);  // Uses compareTo

// Comparator: custom ordering (external)
Comparator<Person> byName = (p1, p2) -> p1.name.compareTo(p2.name);
Collections.sort(people, byName);

// Chaining comparators
Comparator<Person> bySurnameFirstname = 
    Comparator.comparing((Person p) -> p.surname)
              .thenComparing(p -> p.name);
Collections.sort(people, bySurnameFirstname);

// Reverse ordering
Collections.sort(people, byName.reversed());
```

### Thread-Safe Collections

```java
// Synchronized wrappers
List<String> syncList = Collections.synchronizedList(new ArrayList<>());
Map<String, String> syncMap = Collections.synchronizedMap(new HashMap<>());
Set<String> syncSet = Collections.synchronizedSet(new HashSet<>());

// Concurrent collections (better performance)
ConcurrentHashMap<String, String> concMap = new ConcurrentHashMap<>();
CopyOnWriteArrayList<String> cowList = new CopyOnWriteArrayList<>();
ConcurrentLinkedQueue<String> concQueue = new ConcurrentLinkedQueue<>();

// BlockingQueue (thread communication)
BlockingQueue<Integer> queue = new LinkedBlockingQueue<>();
queue.put(42);  // Block if full
Integer value = queue.take();  // Block if empty
```

---

## 9. ARRAYLIST DEEP DIVE

### Internal Structure

```java
public class ArrayList<E> implements List<E>, Cloneable, Serializable {
    Object[] elementData;  // Underlying array
    int size;              // Number of elements
    
    public ArrayList() {
        this.elementData = new Object[10];  // Default capacity
        this.size = 0;
    }
    
    public void add(E e) {
        ensureCapacity(size + 1);
        elementData[size++] = e;
    }
    
    private void ensureCapacity(int minCapacity) {
        if (elementData.length < minCapacity) {
            grow(minCapacity);
        }
    }
    
    private void grow(int minCapacity) {
        int oldCapacity = elementData.length;
        int newCapacity = oldCapacity + (oldCapacity >> 1);  // 1.5x growth
        if (newCapacity < minCapacity) newCapacity = minCapacity;
        
        elementData = Arrays.copyOf(elementData, newCapacity);
    }
}
```

### Capacity vs Size

```java
ArrayList<String> list = new ArrayList<>();
System.out.println("Size: " + list.size());      // 0
System.out.println("Capacity: " + list.size());  // 0 (no getter!)

list.add("A");
System.out.println("Size: " + list.size());      // 1

list.add("B");
System.out.println("Size: " + list.size());      // 2

// Capacity grows automatically, but you can't directly see it
// Use reflection to see internal array:
Field f = ArrayList.class.getDeclaredField("elementData");
f.setAccessible(true);
Object[] array = (Object[]) f.get(list);
System.out.println("Actual capacity: " + array.length);  // 10
```

### Growth Strategy

```java
// When capacity exhausted, grows by 50%
int capacity = 10;
// After 10 adds: capacity = 10
// 11th add: capacity = 10 + (10 >> 1) = 15
// 16th add: capacity = 15 + (15 >> 1) = 22
// 23rd add: capacity = 22 + (22 >> 1) = 33
// ...

// Amortized O(1) insertion (not O(n))
ArrayList<Integer> list = new ArrayList<>();
long start = System.nanoTime();
for (int i = 0; i < 1_000_000; i++) {
    list.add(i);  // O(1) amortized
}
long elapsed = System.nanoTime() - start;
System.out.println("Time: " + elapsed + "ns");
```

### Common Operations

```java
ArrayList<String> list = new ArrayList<>(Arrays.asList("A", "B", "C"));

// Access
String first = list.get(0);      // O(1)
String last = list.get(list.size() - 1);

// Add
list.add("D");                   // O(1) amortized
list.add(1, "B2");               // O(n) insertion

// Remove
list.remove(1);                  // O(n) removal
list.remove("B2");               // O(n) search + remove
list.removeAll(Arrays.asList("A", "B"));  // O(n*m)

// Search
int index = list.indexOf("C");   // O(n)
boolean contains = list.contains("C");  // O(n)

// Iteration
for (String s : list) {          // O(n)
    System.out.println(s);
}

// Sorting
Collections.sort(list);          // O(n log n)
list.sort(Comparator.naturalOrder());
```

### Pre-allocating for Performance

```java
// ❌ Bad: Resizes multiple times
ArrayList<Integer> list = new ArrayList<>();
for (int i = 0; i < 1_000_000; i++) {
    list.add(i);  // Resizes at: 10, 15, 22, 33, ...
}

// ✅ Good: Pre-allocate if size known
ArrayList<Integer> list = new ArrayList<>(1_000_000);
for (int i = 0; i < 1_000_000; i++) {
    list.add(i);  // No resizing needed
}

// For HFT: Pre-allocation is critical!
```

---

## 10. HASHMAP & HASH TABLES

### Hash-Based Lookup

```
HashMap uses hash code to quickly locate elements

1. Calculate hash code: hash = key.hashCode()
2. Map to bucket index: index = hash % tableSize
3. Look in bucket (collision list)

Time complexity:
- Best: O(1) (no collisions)
- Average: O(1) (good hash distribution)
- Worst: O(n) (all keys hash to same bucket)
```

### HashMap Internal Structure

```java
public class HashMap<K,V> implements Map<K,V> {
    static final int DEFAULT_CAPACITY = 16;
    static final float LOAD_FACTOR = 0.75f;
    
    Node<K,V>[] table;  // Array of buckets
    int size;
    
    class Node<K,V> {
        final K key;
        V value;
        Node<K,V> next;  // Collision list (before Java 8)
        // Java 8+: bucket switches to TreeMap if > 8 collisions
    }
    
    public V put(K key, V value) {
        if (table == null) {
            table = new Node[DEFAULT_CAPACITY];
        }
        
        int hash = key.hashCode();
        int index = hash % table.length;
        
        // Check for collisions and add
        Node<K,V> node = new Node<>(key, value);
        if (table[index] == null) {
            table[index] = node;
        } else {
            // Collision handling (linked list or tree)
            addToChain(table[index], node);
        }
        
        size++;
        
        if (size > LOAD_FACTOR * table.length) {
            resize();
        }
        
        return null;  // Value if already existed
    }
    
    public V get(K key) {
        int hash = key.hashCode();
        int index = hash % table.length;
        
        Node<K,V> node = table[index];
        while (node != null) {
            if (node.key.equals(key)) {
                return node.value;
            }
            node = node.next;
        }
        
        return null;  // Not found
    }
    
    private void resize() {
        Node<K,V>[] oldTable = table;
        table = new Node[oldTable.length * 2];  // Double size
        size = 0;
        
        // Re-hash all entries
        for (Node<K,V> node : oldTable) {
            while (node != null) {
                put(node.key, node.value);
                node = node.next;
            }
        }
    }
}
```

### Hash Code & Equals Contract

```java
// CRITICAL: Must follow contract

class Order {
    String symbol;
    int quantity;
    
    @Override
    public boolean equals(Object obj) {
        if (!(obj instanceof Order)) return false;
        Order other = (Order) obj;
        return this.symbol.equals(other.symbol) &&
               this.quantity == other.quantity;
    }
    
    @Override
    public int hashCode() {
        // Must produce same hash for equal objects!
        return Objects.hash(symbol, quantity);
    }
}

// Contract: If a.equals(b), then a.hashCode() == b.hashCode()

Order o1 = new Order("AAPL", 100);
Order o2 = new Order("AAPL", 100);

o1.equals(o2);      // true
o1.hashCode() == o2.hashCode();  // true (required!)

Map<Order, Long> map = new HashMap<>();
map.put(o1, 1000L);
map.get(o2);        // Returns 1000L (same hash and equals)
```

### Load Factor & Rehashing

```java
// Load factor: size / capacity
// Default: 0.75

HashMap<String, String> map = new HashMap<>();

// Capacity 16, load factor 0.75
// Resize when size > 12

// Adding 13th element triggers resize to 32
for (int i = 0; i < 13; i++) {
    map.put("key" + i, "value" + i);
    // At i=12, resize from 16 to 32
    // All entries re-hashed (expensive!)
}

// To avoid resizing in hot loop, pre-allocate
HashMap<String, String> map = new HashMap<>(1000);  // Capacity for ~750 entries
```

### HashMap vs ConcurrentHashMap

```java
// HashMap: NOT thread-safe
HashMap<String, String> map = new HashMap<>();
map.put("a", "1");
map.put("b", "2");

// Two threads putting concurrently can corrupt map!
// Or throw ConcurrentModificationException during iteration

// ConcurrentHashMap: Thread-safe, better performance
ConcurrentHashMap<String, String> concMap = new ConcurrentHashMap<>();
concMap.put("a", "1");
concMap.put("b", "2");

// Uses segment locking: multiple threads can write to different segments
// Iteration safe even if modified

// For HFT: Use carefully (synchronization overhead)
```

---

## 11. HASHSET & EQUALITY

### HashSet Internals

```java
public class HashSet<E> extends AbstractSet<E> {
    private HashMap<E, Object> map;
    private static final Object PRESENT = new Object();
    
    public HashSet() {
        map = new HashMap<>();
    }
    
    @Override
    public boolean add(E e) {
        return map.put(e, PRESENT) == null;  // Returns true if newly added
    }
    
    @Override
    public boolean contains(Object o) {
        return map.containsKey(o);
    }
    
    @Override
    public boolean remove(Object o) {
        return map.remove(o) == PRESENT;
    }
}

// HashSet is just HashMap with null values!
```

### Uniqueness Contract

```java
class Person {
    String name;
    
    @Override
    public boolean equals(Object obj) {
        if (!(obj instanceof Person)) return false;
        Person other = (Person) obj;
        return this.name.equals(other.name);
    }
    
    @Override
    public int hashCode() {
        return name.hashCode();
    }
}

Set<Person> set = new HashSet<>();
set.add(new Person("Alice"));
set.add(new Person("Alice"));  // Won't add (equals returns true)
System.out.println(set.size());  // 1 (unique)

// Without proper equals/hashCode:
class BadPerson {
    String name;
    // No equals/hashCode override
}

Set<BadPerson> badSet = new HashSet<>();
badSet.add(new BadPerson("Alice"));
badSet.add(new BadPerson("Alice"));
System.out.println(badSet.size());  // 2 (not unique!)
```

### Common Mistake: Mutable Keys

```java
class MutableKey {
    public String value;
    
    MutableKey(String value) {
        this.value = value;
    }
    
    @Override
    public int hashCode() {
        return value.hashCode();  // Hash based on mutable field!
    }
    
    @Override
    public boolean equals(Object obj) {
        if (!(obj instanceof MutableKey)) return false;
        return this.value.equals(((MutableKey) obj).value);
    }
}

Set<MutableKey> set = new HashSet<>();
MutableKey key = new MutableKey("Alice");
set.add(key);

// Change the key!
key.value = "Bob";  // Hash code changed!

// Now the key is lost in the set
System.out.println(set.contains(key));  // false! (can't find it)
// Key is in set but in wrong bucket

// ❌ Never use mutable objects as HashMap keys or HashSet elements!
// ✅ Use immutable objects (String, Integer, enums)
```

---

## 12. LINKEDLIST & DEQUE

### LinkedList Structure

```java
public class LinkedList<E> implements List<E>, Deque<E> {
    Node<E> first;
    Node<E> last;
    int size;
    
    class Node<E> {
        E item;
        Node<E> next;
        Node<E> prev;
        
        Node(Node<E> prev, E element, Node<E> next) {
            this.item = element;
            this.next = next;
            this.prev = prev;
        }
    }
    
    // Add to end: O(1)
    public void add(E e) {
        linkLast(e);
    }
    
    // Remove from beginning: O(1)
    public E remove() {
        return removeFirst();
    }
    
    // Get from beginning: O(1)
    public E peek() {
        final Node<E> f = first;
        return (f == null) ? null : f.item;
    }
}

// Structure:
// null <-> [A] <-> [B] <-> [C] <-> null
//         first              last
```

### ArrayList vs LinkedList

```java
// Access by index: ArrayList O(1), LinkedList O(n)
ArrayList<Integer> arrayList = new ArrayList<>(Arrays.asList(1,2,3,4,5));
int value = arrayList.get(2);  // O(1): direct array access

LinkedList<Integer> linkedList = new LinkedList<>(Arrays.asList(1,2,3,4,5));
int value = linkedList.get(2);  // O(n): must traverse 2 nodes

// Adding at end: ArrayList O(1) amortized, LinkedList O(1)
arrayList.add(6);              // O(1) amortized
linkedList.add(6);             // O(1)

// Adding at beginning: ArrayList O(n), LinkedList O(1)
arrayList.add(0, 0);           // O(n): shift all elements
linkedList.addFirst(0);        // O(1): just update pointers

// Removing: ArrayList O(n), LinkedList O(n) if by value, O(1) if iterator
arrayList.remove(Integer.valueOf(3));  // O(n): search + shift
linkedList.removeIf(x -> x == 3);     // O(n): must find it

// Use ArrayList for:
// - Frequent random access (get by index)
// - Append-only workloads
// - Memory efficiency

// Use LinkedList for:
// - Frequent insertions/removals at ends
// - Deque operations (addFirst, removeLast)
// - Queue/Stack implementations
```

### Deque Operations

```java
Deque<Integer> deque = new LinkedList<>();

// Add operations
deque.addFirst(1);   // Add to front
deque.addLast(3);    // Add to back
deque.push(0);       // Stack: add to front
deque.offer(4);      // Queue: add to back

// Remove operations
deque.removeFirst();  // Remove from front
deque.removeLast();   // Remove from back
deque.pop();         // Stack: remove from front
deque.poll();        // Queue: remove from front

// Peek operations
deque.peekFirst();   // View front
deque.peekLast();    // View back
deque.peek();        // View front

// Usage: Double-ended queue
// [First] <-> 1 <-> 2 <-> 3 <-> [Last]
```

---

## 13. THREADING FUNDAMENTALS

### Thread Creation

```java
// Method 1: Extend Thread class
class MyThread extends Thread {
    @Override
    public void run() {
        System.out.println("Running in thread: " + Thread.currentThread().getName());
    }
}

MyThread t = new MyThread();
t.start();  // Starts new thread
// t.run();  // ❌ Doesn't start thread, runs in current thread!

// Method 2: Implement Runnable (preferred)
class MyRunnable implements Runnable {
    @Override
    public void run() {
        System.out.println("Running in thread");
    }
}

Thread t = new Thread(new MyRunnable());
t.start();

// With lambda (Java 8+)
new Thread(() -> System.out.println("Running")).start();

// Method 3: Submit to ExecutorService
ExecutorService executor = Executors.newFixedThreadPool(4);
executor.submit(() -> System.out.println("Running"));
executor.shutdown();
```

### Thread States

```
           ┌─→ RUNNABLE ←─┐
           │               │
           │ (scheduler)   │
           ↓               │
       RUNNING ──(yield/slice)──┘
           │
           │ (synchronized, sleep, wait, I/O)
           ↓
        BLOCKED / WAITING
           │
           ↓ (notified, time elapsed, I/O ready)
        RUNNABLE
           │
           ↓ (join, exit)
      TERMINATED
```

### Thread Priority

```java
// Priority range: 1 (MIN) to 10 (MAX), default 5 (NORM)
Thread t = new Thread(() -> { /* ... */ });
t.setPriority(Thread.MAX_PRIORITY);      // 10
t.setPriority(Thread.NORM_PRIORITY);     // 5
t.setPriority(Thread.MIN_PRIORITY);      // 1

// Higher priority threads get more CPU time (but not guaranteed)
// Avoid relying on priority for correctness
```

### Thread Naming

```java
Thread t = new Thread(() -> {
    System.out.println(Thread.currentThread().getName());
}, "WorkerThread-1");
t.start();

// Better: Give meaningful names for debugging
ExecutorService executor = Executors.newFixedThreadPool(
    4,
    r -> {
        Thread t = new Thread(r);
        t.setName("OrderProcessor-" + counter++);
        return t;
    }
);
```

### Thread Sleep & Yield

```java
// Sleep: Thread gives up CPU for specified time
try {
    Thread.sleep(1000);  // Sleep for 1 second
} catch (InterruptedException e) {
    // Interrupted while sleeping
    Thread.currentThread().interrupt();  // Re-interrupt
}

// Yield: Hint to scheduler to give other threads a chance
Thread.yield();  // May or may not do anything (not guaranteed)

// For HFT: Avoid sleep/yield in critical paths
// Use busy-waiting or condition variables instead
```

### Daemon Threads

```java
// Daemon threads: JVM exits when all non-daemon threads exit
Thread t = new Thread(() -> {
    while (true) {
        // Background work
    }
});
t.setDaemon(true);  // Mark as daemon
t.start();

// Main thread exits, JVM shuts down (daemon thread killed)

// Use for: Background cleanup, monitoring
// Don't use for: Critical work that must complete
```

---

## 14. SYNCHRONIZATION & LOCKS

### Synchronized Methods

```java
class Counter {
    private int count = 0;
    
    // Synchronized instance method: locks 'this'
    synchronized void increment() {
        count++;
    }
    
    // Synchronized class method: locks Class object
    static synchronized void incrementGlobal() {
        // ...
    }
    
    // Synchronized block: more fine-grained control
    void incrementOptimized() {
        synchronized(this) {
            count++;
        }
        // Other non-synchronized work here
    }
}

// Synchronization ensures:
// - Atomicity: Action completes without interruption
// - Visibility: Changes visible to other threads
// - Ordering: Operations in order
```

### Monitor (Intrinsic Lock)

```
Every Java object has an intrinsic lock (monitor)

synchronized method/block acquires lock:
1. Thread enters synchronized code
2. Acquires lock on object
3. Other threads blocked waiting for lock
4. Thread exits synchronized code
5. Releases lock
6. One waiting thread acquires lock

Monitors: Heavyweight (used to be, now optimized)
```

### Explicit Locks (ReentrantLock)

```java
class BankAccount {
    private double balance = 1000;
    private Lock lock = new ReentrantLock();
    
    void withdraw(double amount) {
        lock.lock();
        try {
            if (balance >= amount) {
                balance -= amount;
            }
        } finally {
            lock.unlock();  // MUST unlock in finally
        }
    }
    
    // With tryLock (non-blocking)
    boolean tryWithdraw(double amount) {
        if (lock.tryLock()) {  // Returns immediately
            try {
                if (balance >= amount) {
                    balance -= amount;
                    return true;
                }
            } finally {
                lock.unlock();
            }
        }
        return false;
    }
    
    // With timeout
    boolean tryWithdrawTimeout(double amount, long timeMillis) {
        try {
            if (lock.tryLock(timeMillis, TimeUnit.MILLISECONDS)) {
                try {
                    if (balance >= amount) {
                        balance -= amount;
                        return true;
                    }
                } finally {
                    lock.unlock();
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return false;
    }
}

// ReentrantLock benefits:
// - Can try to acquire (tryLock)
// - Can timeout
// - Can check if held
// - More flexible than synchronized
// - But more verbose (must unlock in finally)
```

### ReadWriteLock

```java
class Cache<K, V> {
    private Map<K, V> map = new HashMap<>();
    private ReadWriteLock lock = new ReentrantReadWriteLock();
    
    // Multiple readers can access simultaneously
    V get(K key) {
        lock.readLock().lock();
        try {
            return map.get(key);
        } finally {
            lock.readLock().unlock();
        }
    }
    
    // Exclusive writer access
    void put(K key, V value) {
        lock.writeLock().lock();
        try {
            map.put(key, value);
        } finally {
            lock.writeLock().unlock();
        }
    }
}

// Great for read-heavy workloads
// Multiple threads can read simultaneously
// Write requires exclusive access
```

### Wait & Notify

```java
class DataContainer<T> {
    private T data = null;
    private boolean available = false;
    
    synchronized void put(T item) throws InterruptedException {
        while (available) {
            wait();  // Wait for consumer
        }
        this.data = item;
        this.available = true;
        notifyAll();  // Wake up waiting threads
    }
    
    synchronized T get() throws InterruptedException {
        while (!available) {
            wait();  // Wait for producer
        }
        T item = data;
        this.available = false;
        notifyAll();  // Wake up waiting threads
        return item;
    }
}

// Producer:
container.put("data");

// Consumer:
String data = container.get();

// Protocol:
// Thread calls wait(): releases lock, sleeps
// Thread calls notify(): wakes one waiting thread
// Thread calls notifyAll(): wakes all waiting threads
```

### Condition Variables

```java
class DataContainer<T> {
    private T data = null;
    private boolean available = false;
    private Lock lock = new ReentrantLock();
    private Condition notEmpty = lock.newCondition();
    private Condition notFull = lock.newCondition();
    
    void put(T item) throws InterruptedException {
        lock.lock();
        try {
            while (available) {
                notFull.await();  // More flexible than wait()
            }
            this.data = item;
            this.available = true;
            notEmpty.signal();
        } finally {
            lock.unlock();
        }
    }
    
    T get() throws InterruptedException {
        lock.lock();
        try {
            while (!available) {
                notEmpty.await();
            }
            T item = data;
            this.available = false;
            notFull.signal();
            return item;
        } finally {
            lock.unlock();
        }
    }
}

// Condition benefits:
// - Multiple conditions per lock
// - More flexible than wait/notify
// - Clearer intent
```

---

## 15. VIRTUAL THREADS (Java 19+)

### Problem: Thread Pool Exhaustion

```java
// Traditional threads are heavyweight
// 1 thread ≈ 1-2 MB stack memory
// Operating system threads: ~10,000 max per process

// In server handling 100,000 connections:
// 100,000 connections * 1MB per thread = 100GB memory!
// Solution before: Thread pools, non-blocking I/O (complex)

ExecutorService executor = Executors.newFixedThreadPool(100);
for (int i = 0; i < 100000; i++) {
    executor.submit(() -> {
        // Handle one connection
        // But only 100 threads, so 99,900 requests wait!
    });
}
```

### Virtual Threads (Lightweight)

```java
// Virtual threads: Lightweight, managed by JVM
// Thousands can run on single platform thread

// Create virtual threads
Thread vt1 = Thread.ofVirtual()
    .name("virtual-1")
    .start(() -> {
        System.out.println("Hello from virtual thread");
    });

// Or use ExecutorService
ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
executor.submit(() -> {
    System.out.println("Virtual thread task");
});

// Handle 100,000 concurrent connections easily
ExecutorService server = Executors.newVirtualThreadPerTaskExecutor();
for (int i = 0; i < 100000; i++) {
    server.submit(() -> handleConnection());  // Each gets own virtual thread
}

// Virtual thread = 1KB (vs 1MB for platform thread)
// 100,000 connections * 1KB = 100MB (manageable!)
```

### Structured Concurrency (Preview)

```java
// Manage related tasks as group
void fetchUserData(String userId) throws Exception {
    try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
        
        // Start multiple async tasks
        var userFuture = scope.fork(() -> getUser(userId));
        var ordersFuture = scope.fork(() -> getOrders(userId));
        var paymentsFuture = scope.fork(() -> getPayments(userId));
        
        // Wait for all to complete
        scope.join();
        
        // Get results
        User user = userFuture.resultNow();
        List<Order> orders = ordersFuture.resultNow();
        List<Payment> payments = paymentsFuture.resultNow();
        
        return new UserData(user, orders, payments);
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        throw new RuntimeException(e);
    }
}

// Benefits:
// - Automatic cleanup
// - Exception propagation
// - Cancellation
// - No ExecutorService boilerplate
```

---

## 16. GARBAGE COLLECTION DETAILED

### Generational Garbage Collection

```
Young Generation (90% of objects die here)
├─ Eden Space (80%)      ← New objects allocated
├─ Survivor 0 (10%)      ← Survived 1 GC
└─ Survivor 1 (10%)      ← Survived 1 GC

Old Generation (long-lived objects)
└─ Objects aged > 15 GC cycles

Permanent/Metaspace
└─ Class metadata
```

### Minor GC (Young Generation)

```
1. Mark reachable objects in Young Gen
2. Copy live objects to Survivor space
3. Age++ objects that survived
4. Objects aged >= threshold promoted to Old Gen
5. Reclaim Eden and old Survivor space

Frequency: Every few MB allocated (seconds)
Pause time: 10-100ms (configurable)

Example:
Eden: 100MB allocation
    ↓ Full, trigger Minor GC
    ↓ 90MB garbage, 10MB live
    ↓ Copy 10MB to Survivor
    ↓ Reclaim 90MB Eden
```

### Full GC (Entire Heap)

```
1. Mark reachable objects in entire heap
2. Compact heap (move objects together)
3. Reclaim unused space

Frequency: Rare (hopefully)
Pause time: 100ms - 10s (catastrophic for latency!)

Avoid: System.gc(), OutOfMemoryError triggers, poorly tuned heap
```

### GC Tuning for HFT

```bash
# G1GC (Garbage First)
java -XX:+UseG1GC \
     -XX:MaxGCPauseMillis=50 \
     -XX:+ParallelRefProcEnabled \
     -XX:InitialHeapSize=8g \
     -XX:MaxHeapSize=8g \
     MyApp

# ZGC (Ultra-low latency)
java -XX:+UseZGC \
     -XX:ZCollectionInterval=120 \
     -XX:InitialHeapSize=8g \
     -XX:MaxHeapSize=8g \
     MyApp

# Pre-touch pages (avoid page faults)
java -XX:+AlwaysPreTouch MyApp

# Disable dynamic sizing
java -XX:-UseAdaptiveSizePolicy MyApp
```

### Weak References

```java
// WeakReference: GC can reclaim at any time
WeakReference<byte[]> ref = new WeakReference<>(new byte[1024]);

byte[] data = ref.get();  // May be null if garbage collected

// Use case: Caches
class ImageCache {
    private Map<String, WeakReference<Image>> cache = new HashMap<>();
    
    Image getImage(String path) {
        WeakReference<Image> ref = cache.get(path);
        if (ref != null) {
            Image img = ref.get();
            if (img != null) return img;  // Still in cache
        }
        
        // Not in cache, load from disk
        Image img = loadFromDisk(path);
        cache.put(path, new WeakReference<>(img));
        return img;
    }
}

// If memory needed, GC frees unused images without warning
```

---

## 17. OPTIONAL DEEP DIVE

### Optional Purpose

```java
// Problem: null pointer exceptions
User user = findUser("Alice");
if (user != null) {
    System.out.println(user.getName());
} else {
    System.out.println("User not found");
}

// Solution: Optional - explicit absence
Optional<User> user = findUser("Alice");
user.ifPresentOrElse(
    u -> System.out.println(u.getName()),
    () -> System.out.println("User not found")
);
```

### Creating Optionals

```java
// of: Value must not be null
Optional<String> opt1 = Optional.of("hello");

// ofNullable: Value can be null
Optional<String> opt2 = Optional.ofNullable(getValue());  // Could be null

// empty: No value
Optional<String> opt3 = Optional.empty();

// from method
Optional<User> user = Optional.ofNullable(database.findById(1));
```

### Optional Operations

```java
Optional<String> opt = Optional.of("hello");

// Get value (throws if empty)
String value = opt.get();  // "hello"

// Get value or default
String value = opt.orElse("default");  // "hello"
String value = opt.orElseGet(() -> "default");  // "hello"

// Get or throw
String value = opt.orElseThrow();  // "hello"
String value = opt.orElseThrow(() -> new Exception("Not found"));

// Check if present
if (opt.isPresent()) {
    System.out.println(opt.get());
}

// Execute side effect
opt.ifPresent(System.out::println);  // Print if present

// Chain operations
opt.filter(s -> s.length() > 2)   // Only if filter passes
   .map(String::toUpperCase)      // Transform
   .flatMap(s -> Optional.of(s))  // Chain optionals
   .ifPresentOrElse(
       System.out::println,
       () -> System.out.println("Empty or filtered out")
   );
```

### Optional Stream Integration

```java
List<Optional<String>> optionals = Arrays.asList(
    Optional.of("A"),
    Optional.empty(),
    Optional.of("B"),
    Optional.empty(),
    Optional.of("C")
);

// Collect non-empty values
List<String> values = optionals.stream()
    .flatMap(Optional::stream)  // Empty options filtered out
    .collect(Collectors.toList());
// [A, B, C]

// Traditional
List<String> values = optionals.stream()
    .filter(Optional::isPresent)
    .map(Optional::get)
    .collect(Collectors.toList());
```

### Pitfalls

```java
// ❌ Bad: Defeats purpose of Optional
Optional<String> opt = Optional.ofNullable(value);
if (opt == null) {  // Optional itself is null!
    // ...
}

// ✅ Good:
Optional<String> opt = Optional.ofNullable(value);
if (opt.isEmpty()) {  // Explicit
    // ...
}

// ❌ Bad: Using get() without checking
Optional<String> opt = Optional.ofNullable(getValue());
String s = opt.get();  // NoSuchElementException if empty!

// ✅ Good:
String s = opt.orElse("default");

// ❌ Bad: Wrapping Optional in Optional
Optional<Optional<String>> nested = Optional.of(Optional.of("value"));

// ✅ Use flatMap to unwrap
Optional<String> flat = nested.flatMap(o -> o);
```

---

## 18. DATABASE CONNECTION POOLING (HIKARI)

### Why Connection Pooling?

```
Without pooling:
App → Request → Create connection → Connect to DB
                (slow, 100-500ms per request)
            → Execute query
            → Close connection
            ← Return result

Request 2 comes in:
            → Create connection (slow again!)
            → ...

With pooling:
App → Request → Take connection from pool (fast!)
            → Execute query
            → Return connection to pool
            ← Return result

Next request:
            → Reuse connection (already open!)
            → Execute query
            → Return to pool
```

### HikariCP Setup

```java
// Maven dependency
// <dependency>
//     <groupId>com.zaxxer</groupId>
//     <artifactId>HikariCP</artifactId>
//     <version>5.0.1</version>
// </dependency>

HikariConfig config = new HikariConfig();
config.setJdbcUrl("jdbc:mysql://localhost:3306/mydb");
config.setUsername("root");
config.setPassword("password");
config.setMaximumPoolSize(20);          // Max connections
config.setMinimumIdle(5);               // Min idle connections
config.setConnectionTimeout(30000);     // 30 seconds
config.setIdleTimeout(600000);          // 10 minutes
config.setMaxLifetime(1800000);         // 30 minutes

HikariDataSource dataSource = new HikariDataSource(config);

// Use it
try (Connection conn = dataSource.getConnection()) {
    try (Statement stmt = conn.createStatement()) {
        ResultSet rs = stmt.executeQuery("SELECT * FROM users");
        while (rs.next()) {
            System.out.println(rs.getString("name"));
        }
    }
}
```

### HikariCP Features

```java
// Connection properties
config.setPoolName("HikariPool-1");
config.setAutoCommit(true);  // Connections auto-commit
config.setTransactionIsolation("TRANSACTION_READ_COMMITTED");

// Performance tuning
config.setLeakDetectionThreshold(60000);  // Log leaks > 1 minute
config.setJdbcUrl("jdbc:mysql://localhost/db" +
    "?cachePrepStmts=true" +
    "&prepStmtCacheSize=250" +
    "&prepStmtCacheSqlLimit=2048" +
    "&useServerPrepStmts=true" +
    "&useSSL=false");

// Metrics
config.setMetricsTrackerFactory(new PrometheusMetricsTrackerFactory());

// Test connection periodically
config.setConnectionTestQuery("SELECT 1");
```

### Connection Lifecycle

```
1. Create: Connection created, handshake with DB
2. Open: Available in pool, ready to use
3. Borrowed: Application has connection
4. Returned: App returns to pool, reset for next use
5. Closed: Connection no longer needed

Timeout scenarios:
- connectionTimeout: Time to wait for connection from pool
- idleTimeout: Close if idle > this time
- maxLifetime: Max time connection can exist (before close)

HikariCP handles all of this automatically!
```

### Common Patterns

```java
// Singleton DataSource
public class DataSourceProvider {
    private static final HikariDataSource ds;
    
    static {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("...");
        config.setUsername("...");
        config.setPassword("...");
        config.setMaximumPoolSize(20);
        ds = new HikariDataSource(config);
    }
    
    public static DataSource get() {
        return ds;
    }
    
    public static void close() {
        ds.close();
    }
}

// Usage
DataSource ds = DataSourceProvider.get();
try (Connection conn = ds.getConnection()) {
    // Use connection
}
```

### Performance Tips

```java
// 1. Tune pool size (not too big, not too small)
// Formula: connections = ((core_count * 2) + effective_spindle_count)
// For 4 cores: 4*2 + 1 = 9 connections

// 2. Use PreparedStatements
try (Connection conn = dataSource.getConnection()) {
    String sql = "SELECT * FROM users WHERE id = ?";
    try (PreparedStatement stmt = conn.prepareStatement(sql)) {
        stmt.setInt(1, userId);
        stmt.execute();
    }
}

// 3. Return connections quickly
// Bad: Keep connection open for non-DB work
Connection conn = dataSource.getConnection();
String data = callExternalAPI();  // 1 second!
callDatabase(conn, data);
conn.close();

// Good: Only hold connection during DB operations
String data = callExternalAPI();  // 1 second (no connection)
try (Connection conn = dataSource.getConnection()) {
    callDatabase(conn, data);  // Minimal connection time
}

// 4. Monitor pool
JmxPoolConfiguration jmx = new JmxPoolConfiguration();
config.setJmxConfiguration(jmx);
// Monitor via JConsole
```

---

## 19. INTERFACES VS ABSTRACT CLASSES

### Interfaces (Contracts)

```java
// Interface: What an object can do (contract)
public interface PaymentProcessor {
    void process(Payment payment) throws PaymentException;
    void refund(String transactionId) throws PaymentException;
    
    default void logTransaction(String message) {
        System.out.println(message);
    }
    
    static void printHeader() {
        System.out.println("=== Payment Processing ===");
    }
}

// Multiple interfaces (multiple inheritance of contract)
class CreditCardProcessor implements PaymentProcessor, Auditable, Loggable {
    @Override
    public void process(Payment payment) throws PaymentException {
        // Implementation
    }
    
    @Override
    public void refund(String transactionId) throws PaymentException {
        // Implementation
    }
}

// Usage: Loose coupling
PaymentProcessor processor = new CreditCardProcessor();
processor.process(payment);

// Can swap implementations
processor = new PayPalProcessor();
processor.process(payment);  // Different implementation, same interface
```

### Abstract Classes (Partial Implementation)

```java
// Abstract class: Shared code + contract
public abstract class PaymentProcessor {
    private List<PaymentListener> listeners = new ArrayList<>();
    
    // Shared implementation
    public final void addListener(PaymentListener listener) {
        listeners.add(listener);
    }
    
    protected void notifyListeners(PaymentEvent event) {
        listeners.forEach(l -> l.onPayment(event));
    }
    
    // Abstract: must implement
    abstract void process(Payment payment) throws PaymentException;
    abstract void refund(String transactionId) throws PaymentException;
    
    // Concrete: can use
    void logTransaction(String message) {
        System.out.println(message);
    }
}

// Subclass
class CreditCardProcessor extends PaymentProcessor {
    @Override
    void process(Payment payment) throws PaymentException {
        // Implementation
        notifyListeners(new PaymentEvent(payment));
    }
    
    @Override
    void refund(String transactionId) throws PaymentException {
        // Implementation
    }
}

// Shared behavior via inheritance
// Can't extend multiple classes!
```

### Comparison

| Aspect | Interface | Abstract Class |
|--------|-----------|-----------------|
| **Purpose** | Contract (what) | Shared code (how) |
| **Inheritance** | Multiple | Single |
| **Fields** | Static/final constants | Instance fields |
| **Methods** | abstract, default, static | abstract, concrete |
| **Constructors** | No | Yes |
| **Access** | Public | Any (private, protected) |
| **Use when** | Unrelated classes share contract | Related classes share code |

### Modern Java (Java 8+): Blurring the Lines

```java
// Interfaces now can have:
// - Default methods (shared code!)
// - Static methods
// - Private methods

interface PaymentProcessor {
    // Abstract
    void process(Payment payment);
    
    // Default (concrete)
    default void logSuccess() {
        log("Payment processed successfully");
    }
    
    // Static
    static void validatePayment(Payment p) {
        if (p.amount <= 0) throw new IllegalArgumentException();
    }
    
    // Private (helper)
    private void log(String message) {
        System.out.println(message);
    }
}

// Abstract class with only abstract methods = same as interface!
// But abstract class still better if you have:
// - Instance fields
// - Constructors
// - Protected/private methods
```

### Best Practices

```java
// ✅ Use interface for contracts
interface Repository<T> {
    Optional<T> findById(String id);
    List<T> findAll();
    void save(T entity);
}

// ✅ Use abstract class for shared code
abstract class BaseRepository<T> implements Repository<T> {
    protected DataSource dataSource;
    protected Logger logger;
    
    protected BaseRepository(DataSource ds) {
        this.dataSource = ds;
        this.logger = getLogger();
    }
    
    protected final void logQuery(String sql) {
        logger.debug(sql);  // Shared logging
    }
}

// ✅ Concrete implementation
class UserRepository extends BaseRepository<User> {
    public UserRepository(DataSource ds) {
        super(ds);
    }
    
    @Override
    public Optional<User> findById(String id) {
        logQuery("SELECT * FROM users WHERE id = ?");
        // Implementation
    }
}
```

---

## 20. SOLID PRINCIPLES

### S: Single Responsibility Principle

```java
// ❌ Bad: Multiple responsibilities
class Order {
    private String id;
    private List<Item> items;
    
    void addItem(Item item) { items.add(item); }
    
    void processPayment(PaymentInfo payment) {
        // Payment processing logic (different responsibility!)
    }
    
    void sendEmail(String email) {
        // Email logic (different responsibility!)
    }
    
    void saveToDatabase() {
        // Persistence logic (different responsibility!)
    }
}

// ✅ Good: Each class has one responsibility
class Order {
    private String id;
    private List<Item> items;
    void addItem(Item item) { items.add(item); }
}

class PaymentProcessor {
    void processPayment(Order order, PaymentInfo info) { /* ... */ }
}

class EmailNotifier {
    void sendConfirmation(Order order) { /* ... */ }
}

class OrderRepository {
    void save(Order order) { /* ... */ }
}
```

### O: Open/Closed Principle

```java
// ❌ Bad: Must modify class for new types
class PaymentProcessor {
    void process(Payment payment) {
        if (payment instanceof CreditCard) {
            processCreditCard((CreditCard) payment);
        } else if (payment instanceof PayPal) {
            processPayPal((PayPal) payment);
        } else if (payment instanceof Bitcoin) {  // Adding new type requires modification!
            processBitcoin((Bitcoin) payment);
        }
    }
}

// ✅ Good: Open for extension, closed for modification
interface PaymentHandler {
    void handle(Payment payment);
}

class CreditCardHandler implements PaymentHandler {
    @Override
    public void handle(Payment payment) { /* ... */ }
}

class PayPalHandler implements PaymentHandler {
    @Override
    public void handle(Payment payment) { /* ... */ }
}

class BitcoinHandler implements PaymentHandler {  // New type, no modification needed!
    @Override
    public void handle(Payment payment) { /* ... */ }
}

class PaymentProcessor {
    private Map<String, PaymentHandler> handlers = new HashMap<>();
    
    void registerHandler(String type, PaymentHandler handler) {
        handlers.put(type, handler);
    }
    
    void process(Payment payment) {
        PaymentHandler handler = handlers.get(payment.getType());
        handler.handle(payment);
    }
}
```

### L: Liskov Substitution Principle

```java
// ❌ Bad: Violates contract
class Rectangle {
    protected int width, height;
    void setWidth(int w) { this.width = w; }
    void setHeight(int h) { this.height = h; }
    int getArea() { return width * height; }
}

class Square extends Rectangle {
    @Override
    void setWidth(int w) { 
        this.width = w; 
        this.height = w;  // Violates expectation!
    }
    
    @Override
    void setHeight(int h) { 
        this.width = h; 
        this.height = h;  // Violates expectation!
    }
}

Rectangle r = new Square();
r.setWidth(5);
r.setHeight(10);
System.out.println(r.getArea());  // Expected 50, got 100!

// ✅ Good: Don't force inheritance
interface Shape {
    int getArea();
}

class Rectangle implements Shape {
    private int width, height;
    Rectangle(int width, int height) { 
        this.width = width; 
        this.height = height; 
    }
    
    @Override
    public int getArea() { return width * height; }
}

class Square implements Shape {
    private int side;
    Square(int side) { this.side = side; }
    
    @Override
    public int getArea() { return side * side; }
}
```

### I: Interface Segregation Principle

```java
// ❌ Bad: Fat interface
interface Worker {
    void work();
    void eat();
    void sleep();
    void code();
    void designArchitecture();
    void manageTeam();
}

class Developer implements Worker {
    @Override
    public void code() { /* ... */ }
    
    @Override
    public void manageTeam() {
        throw new UnsupportedOperationException();  // Forced to implement!
    }
}

// ✅ Good: Segregated interfaces
interface Workable {
    void work();
}

interface Eatable {
    void eat();
}

interface Sleepable {
    void sleep();
}

interface Codeable {
    void code();
}

interface Manageable {
    void manageTeam();
}

class Developer implements Workable, Eatable, Sleepable, Codeable {
    // Only implements what's relevant
}

class Manager implements Workable, Eatable, Sleepable, Manageable {
    // Only implements what's relevant
}

class Robot implements Workable, Codeable {
    // No eat/sleep for robots!
}
```

### D: Dependency Inversion Principle

```java
// ❌ Bad: Depends on concrete classes
class PaymentService {
    private CreditCardProcessor processor;  // Concrete dependency!
    
    PaymentService() {
        this.processor = new CreditCardProcessor();  // Tight coupling!
    }
    
    void pay(Payment payment) {
        processor.process(payment);
    }
}

// ❌ Hard to test, can't swap implementations

// ✅ Good: Depends on abstraction
interface PaymentProcessor {
    void process(Payment payment);
}

class PaymentService {
    private PaymentProcessor processor;  // Abstract dependency
    
    PaymentService(PaymentProcessor processor) {  // Injected!
        this.processor = processor;
    }
    
    void pay(Payment payment) {
        processor.process(payment);
    }
}

// Easy to test with mock
@Test
void testPayment() {
    PaymentProcessor mock = payment -> {
        // Mock behavior
    };
    
    PaymentService service = new PaymentService(mock);
    service.pay(new Payment(100));
    // Verify behavior
}

// Easy to swap implementations
PaymentProcessor creditCard = new CreditCardProcessor();
PaymentProcessor paypal = new PayPalProcessor();

PaymentService service1 = new PaymentService(creditCard);
PaymentService service2 = new PaymentService(paypal);
```

---

## 21. JAVA 8 ENHANCEMENTS

### Lambda Expressions (Covered in detail above)

### Stream API (Covered in detail above)

### Default Methods

```java
interface Drawable {
    void draw();
    
    // Default method: can be overridden but doesn't have to be
    default void printDimensions() {
        System.out.println("Default dimensions");
    }
}

class Rectangle implements Drawable {
    @Override
    public void draw() {
        System.out.println("Drawing rectangle");
    }
    
    // Uses default implementation
}

Rectangle rect = new Rectangle();
rect.draw();           // Calls overridden method
rect.printDimensions();  // Calls default method
```

### Optional (Covered in detail above)

### Date & Time API

```java
// Old (bad) Java Calendar
Calendar cal = Calendar.getInstance();
cal.set(2024, Calendar.JANUARY, 15);  // Note: JANUARY is 0!
Date date = cal.getTime();

// New (good) java.time
LocalDate date = LocalDate.of(2024, 1, 15);  // Clear!
LocalTime time = LocalTime.of(14, 30, 0);
LocalDateTime dateTime = LocalDateTime.of(date, time);

// Operations
LocalDate tomorrow = date.plusDays(1);
LocalDate nextMonth = date.plusMonths(1);
LocalDate nextYear = date.plusYears(1);

// Day of week
DayOfWeek dow = date.getDayOfWeek();  // MONDAY

// Duration & Period
Duration duration = Duration.between(time, time.plusHours(2));  // Seconds
Period period = Period.between(date, date.plusMonths(3));  // Days/months/years

// Formatting
DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
String formatted = date.format(formatter);  // "2024-01-15"
LocalDate parsed = LocalDate.parse(formatted, formatter);

// Time zones
ZonedDateTime zdt = ZonedDateTime.now(ZoneId.of("America/New_York"));
Instant instant = Instant.now();  // UTC timestamp
```

---

## 22. JAVA 21 & RECENT FEATURES

### Records (Java 14+, stable in Java 16+)

```java
// ❌ Old way: Lots of boilerplate
class Person {
    private final String name;
    private final int age;
    
    Person(String name, int age) {
        this.name = name;
        this.age = age;
    }
    
    String getName() { return name; }
    int getAge() { return age; }
    
    @Override
    public boolean equals(Object obj) { /* ... */ }
    
    @Override
    public int hashCode() { /* ... */ }
    
    @Override
    public String toString() { /* ... */ }
}

// ✅ New way: Records
record Person(String name, int age) {}

// Automatically generates:
// - Constructor
// - Getters (name(), age(), not getName/getAge)
// - equals()
// - hashCode()
// - toString()

Person p = new Person("Alice", 30);
System.out.println(p.name());  // "Alice"
System.out.println(p);  // "Person[name=Alice, age=30]"

// Records are immutable
// p.name = "Bob";  // ❌ Compilation error!

// Custom methods allowed
record Order(String id, double amount) {
    Order {  // Compact constructor
        if (amount < 0) throw new IllegalArgumentException();
    }
    
    double getTax() {
        return amount * 0.1;
    }
}
```

### Sealed Classes (Java 17)

```java
// Old: Any class can extend
class Vehicle { }
class Bike extends Vehicle { }  // OK
class UnknownVehicle extends Vehicle { }  // Unexpected!

// New: Control who can extend
sealed class Vehicle permits Bike, Car, Truck { }

final class Bike extends Vehicle { }  // Must be final, sealed, or non-sealed
final class Car extends Vehicle { }
final class Truck extends Vehicle { }

// UnknownVehicle extends Vehicle { }  // ❌ Compilation error!

// Usage: Pattern matching with sealed classes
public String getDescription(Vehicle v) {
    if (v instanceof Bike) {
        return "Two wheels";
    } else if (v instanceof Car) {
        return "Four wheels";
    } else if (v instanceof Truck) {
        return "Many wheels";
    }
    // Compiler knows all subtypes are covered!
}
```

### Pattern Matching (Java 21)

```java
// Old way: instanceof + casting
Object obj = "hello";
if (obj instanceof String) {
    String str = (String) obj;  // Redundant casting
    System.out.println(str.length());
}

// New way: Pattern matching
if (obj instanceof String str) {
    System.out.println(str.length());  // str is already String
}

// With guards
if (obj instanceof String str && str.length() > 5) {
    System.out.println(str);
}

// Record patterns
record Point(int x, int y) { }

Point p = new Point(1, 2);
if (p instanceof Point(var x, var y)) {
    System.out.println(x + y);  // 3
}

// Switch with patterns
String describe(Object obj) {
    return switch(obj) {
        case null -> "null";
        case String s -> "String: " + s;
        case Integer i -> "Integer: " + i;
        case Point(var x, var y) -> "Point(" + x + "," + y + ")";
        default -> "Unknown";
    };
}
```

### Text Blocks (Java 15+)

```java
// Old way: String concatenation nightmare
String json = "{\n" +
    "  \"name\": \"Alice\",\n" +
    "  \"age\": 30\n" +
    "}";

// New way: Text blocks
String json = """
    {
      "name": "Alice",
      "age": 30
    }
    """;

// SQL example
String query = """
    SELECT * FROM users
    WHERE age > 18
      AND status = 'active'
    ORDER BY name
    """;

// HTML example
String html = """
    <html>
        <body>
            <h1>Hello</h1>
        </body>
    </html>
    """;
```

### String Templates (Java 21, Preview)

```java
// Note: Requires --enable-preview flag to compile and run

// Old way: String.format
String formatted = String.format("Name: %s, Age: %d", name, age);

// New way: String template (preview)
// String message = STR."Name: \{name}, Age: \{age}";

// Embedded expressions
// int a = 5, b = 10;
// String result = STR."\{a} + \{b} = \{a + b}";

// Can use different processors
// FMT processor for formatting
// String formatted = FMT."%.2f\{value}";

// This is a preview feature, syntax may change
```

### Virtual Threads (Java 19+) (Covered above)

### Generics Improvements

```java
// Java 21: No need to specify type parameters in many cases
List<Integer> numbers = new ArrayList<>();
// Old: List<Integer> numbers = new ArrayList<Integer>();

// Type inference in method calls
List list = new ArrayList<Integer>();  // Diamond operator
// works without specifying Integer on both sides

// Wildcards improvements (more inference)
List<? extends Number> nums = new ArrayList<Integer>();
```

### Module System Improvements (Java 9+)

```java
// module-info.java (Java 9+)
module com.example.trading {
    requires java.base;
    requires java.logging;
    
    exports com.example.trading.api;
    
    opens com.example.trading.impl for reflection;
    
    provides com.example.spi.Strategy 
        with com.example.impl.DefaultStrategy;
}

// Benefits:
// - Encapsulation at module level
// - Explicit dependencies
// - Service providers
// - Reduced JAR hell
```

### Finalization Deprecated

```java
// Old: Use finalize() for cleanup (DON'T!)
class Resource {
    @Override
    protected void finalize() throws Throwable {
        // Called by GC (unpredictably)
        cleanup();
    }
}

// New: Use try-with-resources
class Resource implements AutoCloseable {
    @Override
    public void close() {
        // Called deterministically
        cleanup();
    }
}

try (Resource r = new Resource()) {
    // Use resource
}
// close() called automatically

// Or explicit cleanup
class Resource {
    public void close() {
        cleanup();
    }
}

// Or use Cleaner (advanced)
Cleaner cleaner = Cleaner.create();
cleaner.register(resource, () -> cleanup());
```

---

## SUMMARY: HFT JAVA DEVELOPER QUICK REFERENCE

### Performance-Critical Decisions

```java
// Collections:
ArrayList    → Sequential access, append-only
HashMap      → Key-value lookup (O(1) average)
TreeMap      → Sorted keys (O(log n))
ConcurrentHashMap → Thread-safe without synchronized
HashSet      → Unique elements, O(1) lookup

// Strings:
StringBuilder → Concatenation in loops
String       → Immutable, safe, hashable
StringBuffer → Rarely use (StringBuilderdır faster)

// Threading:
volatile     → Visibility without locking
synchronized → Mutual exclusion
ReentrantLock → More flexible than synchronized
VirtualThreads → 100k+ concurrent connections
CountDownLatch → Wait for N threads
CyclicBarrier → Synchronize at point

// I/O:
NIO Channels → High throughput
Memory-mapped files → Fastest access
Selector     → One thread, 1000s connections
Streams      → Simple, slower

// GC:
G1GC (-XX:+UseG1GC) → Balanced latency/throughput
ZGC (-XX:+UseZGC) → Ultra-low latency (<10ms)
Pre-touch (-XX:+AlwaysPreTouch) → Avoid page faults
-Xms = -Xmx → Fixed heap (no resizing pauses)

// Functional:
.stream()    → Transformation chains
.parallel()  → Multi-threaded (for large datasets)
Optional     → Explicit null handling
Lambda       → Concise, readable code
```

### Interview Tips

1. **Know the trade-offs**: ArrayList vs LinkedList, HashMap vs TreeMap
2. **Understand complexity**: O(1), O(n), O(log n) for each operation
3. **Thread safety**: synchronized, volatile, Lock, ConcurrentHashMap
4. **Memory management**: Stack vs Heap, GC tuning, memory leaks
5. **Real examples**: Show you can apply concepts to HFT scenarios

---

**Last Updated**: 2024
**Version**: 3.0 - Advanced HFT Features
**Difficulty**: Intermediate → Expert
**Time to Mastery**: 100+ hours of practice

This is the comprehensive guide. Master this, and you're a Java prodigy. 🚀
