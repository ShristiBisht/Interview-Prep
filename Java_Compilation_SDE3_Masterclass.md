# Java Compilation: SDE3 Masterclass
## Complete Deep Dive into javac and Bytecode Generation

---

## TABLE OF CONTENTS

1. [Overview & Architecture](#1-overview--architecture)
2. [Compilation Pipeline](#2-compilation-pipeline)
3. [Lexical Analysis (Scanning)](#3-lexical-analysis-scanning)
4. [Syntax Analysis (Parsing)](#4-syntax-analysis-parsing)
5. [Semantic Analysis & Type Checking](#5-semantic-analysis--type-checking)
6. [Bytecode Generation](#6-bytecode-generation)
7. [Bytecode Instructions Deep Dive](#7-bytecode-instructions-deep-dive)
8. [Type System & Type Erasure](#8-type-system--type-erasure)
9. [Generics Compilation](#9-generics-compilation)
10. [Annotations](#10-annotations)
11. [Module System (Java 9+)](#11-module-system-java-9)
12. [Incremental Compilation](#12-incremental-compilation)
13. [Annotation Processors](#13-annotation-processors)
14. [Decompilation & Class File Analysis](#14-decompilation--class-file-analysis)
15. [Common Compilation Errors](#15-common-compilation-errors)
16. [SDE3 Interview Questions](#16-sde3-interview-questions)

---

## 1. OVERVIEW & ARCHITECTURE

### What is Java Compilation?

Java compilation is the process of transforming **human-readable Java source code (.java files)** into **bytecode (.class files)** that can be executed by the Java Virtual Machine (JVM).

```
Java Source (.java)
    ↓
[Lexical Analysis] → Tokens
    ↓
[Syntax Analysis] → Abstract Syntax Tree (AST)
    ↓
[Semantic Analysis] → Type Checking, Resolution
    ↓
[Bytecode Generation] → .class file
    ↓
Java Bytecode (JVM-independent)
```

### Key Principles

1. **Single Pass with Multiple Phases**: javac reads the source once but makes multiple logical passes
2. **Stack-based Bytecode**: Unlike x86 (register-based), Java uses stack-based execution
3. **Type Safety**: Enforced at compile time, verified at runtime
4. **Write Once, Run Anywhere (WORA)**: Same bytecode runs on any JVM implementation
5. **Platform Independence**: Compilation doesn't depend on OS or architecture

### The javac Compiler

```bash
javac [options] [sourcefiles]

# Examples:
javac MyClass.java                              # Simple compile
javac -d bin src/com/example/*.java            # Specify output dir
javac -cp lib/*:. src/*.java                   # With classpath
javac -source 11 -target 11 MyClass.java       # Version control
javac -processor com.example.MyProcessor *.java # Custom processors
```

### Class File Format

The .class file is a binary format with specific structure:

```
ClassFile {
    u4             magic;              // 0xCAFEBABE
    u2             minor_version;      // 0-65535
    u2             major_version;      // Java version
    u2             constant_pool_count;
    cp_info        constant_pool[constant_pool_count-1];
    u2             access_flags;
    u2             this_class;
    u2             super_class;
    u2             interfaces_count;
    u2             interfaces[interfaces_count];
    u2             fields_count;
    field_info     fields[fields_count];
    u2             methods_count;
    method_info    methods[methods_count];
    u2             attributes_count;
    attribute_info attributes[attributes_count];
}
```

---

## 2. COMPILATION PIPELINE

### Complete Compilation Phases (In Detail)

#### Phase 1: Initialization
```
javac starts
    ↓
Create compiler instance
    ↓
Initialize symbol tables
    ↓
Set up compiler options
    ↓
Prepare classpath/sourcepath
```

#### Phase 2: Source File Reading & Lexical Analysis
```
For each .java file:
    ↓
Read file contents from disk
    ↓
Tokenize (Lexical Analysis)
    ↓
Create AST (Parsing)
```

#### Phase 3: Enter (Symbol Resolution Pass)
```
For each compilation unit:
    ↓
Create Symbol objects for classes/interfaces/enums
    ↓
Create scopes for each symbol
    ↓
Enter all symbols into symbol tables
    ↓
Build class hierarchy (extends/implements)
```

#### Phase 4: Process (Annotation Processing)
```
If annotation processors present:
    ↓
Run user-defined annotation processors
    ↓
Generate new source files or class files
    ↓
Re-run compilation on generated sources
```

#### Phase 5: Attr & Check (Attribute & Type Checking)
```
For each AST node:
    ↓
Resolve all symbolic references
    ↓
Perform type checking
    ↓
Check access modifiers
    ↓
Validate overrides
    ↓
Desugar syntax (loops, string concat, etc.)
```

#### Phase 6: Flow & Lower (Control Flow & Bytecode Gen)
```
For each method:
    ↓
Analyze control flow (unreachable code, final vars)
    ↓
Lower AST to simpler form
    ↓
Generate bytecode
    ↓
Optimize bytecode
```

#### Phase 7: Generate (Class File Writing)
```
For each compiled class:
    ↓
Create ClassFile structure
    ↓
Write to .class file on disk
    ↓
Done!
```

### Example: Tracing Compilation of a Single Method

```java
public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }
}
```

**Phase 1 (Lexical Analysis):**
```
Tokens: [public] [class] [Calculator] [{] 
        [public] [int] [add] [(] [int] [a] [,] [int] [b] [)]
        [{] [return] [a] [+] [b] [;] [}] [}]
```

**Phase 2 (Parsing - Creates AST):**
```
ClassDecl
  ├─ Name: Calculator
  ├─ Modifiers: public
  └─ Methods:
      └─ MethodDecl
          ├─ Name: add
          ├─ ReturnType: int
          ├─ Parameters: [a: int, b: int]
          └─ Body:
              └─ Return
                  └─ BinOp(+)
                      ├─ Left: Ident(a)
                      └─ Right: Ident(b)
```

**Phase 3 (Enter):**
```
Create Symbol: Calculator
Create Symbol: add (method)
Create Scopes for method parameters
Symbol Table:
  - Calculator: ClassSymbol
  - add: MethodSymbol
    - a: VarSymbol (type: int)
    - b: VarSymbol (type: int)
```

**Phase 4 (Attr & Check):**
```
Visit Return node
  ↓
Visit BinOp(+) node
  ↓
Type of Left (a): resolve from symbol table → int
  ↓
Type of Right (b): resolve from symbol table → int
  ↓
Check: int + int → int (valid!)
  ↓
Infer BinOp result type: int
  ↓
Check: return int matches method return type int (valid!)
```

**Phase 5 (Flow & Lower):**
```
Control flow analysis:
  ↓
All paths return (no unreachable code)
  ↓
Lower AST:
  a + b → iadd (bytecode instruction)
```

**Phase 6 (Generate):**
```
Generate bytecode:
  Code_attribute {
    max_stack = 2
    max_locals = 3
    code {
      0: iload_1      // load int arg 1 (a)
      1: iload_2      // load int arg 2 (b)
      2: iadd         // add top two ints
      3: ireturn      // return int from stack
    }
  }
```

---

## 3. LEXICAL ANALYSIS (SCANNING)

### What is Lexical Analysis?

Breaking source code into **tokens** - the smallest meaningful units (keywords, identifiers, operators, literals, etc.).

### Tokenization Process

```java
public class Person {
    private String name;
    public void setName(String n) {
        name = n;
    }
}
```

**Becomes tokens:**
```
TOKEN[1]: KEYWORD "public"
TOKEN[2]: KEYWORD "class"
TOKEN[3]: IDENTIFIER "Person"
TOKEN[4]: LBRACE "{"
TOKEN[5]: KEYWORD "private"
TOKEN[6]: KEYWORD "class" (wait, no)... actually TYPE "String"
TOKEN[7]: IDENTIFIER "name"
TOKEN[8]: SEMICOLON ";"
... and so on
```

### Token Types in Java

| Category | Examples |
|----------|----------|
| Keywords | public, private, class, interface, if, else, for, while, return |
| Identifiers | Person, name, setName, i, value |
| Literals | 42, 3.14, "hello", true, null, 'c' |
| Operators | +, -, *, /, =, ==, !=, &&, \|\| |
| Separators | {, }, (, ), [, ], ;, , |
| Comments | // line comment, /* block comment */ |

### The Scanner State Machine

```
State: START
Input: 'p'
  ↓
Check: is 'p' alphabetic? YES
  ↓
State: READING_IDENTIFIER
Input: 'u', 'b', 'l', 'i', 'c'
  ↓
All alphabetic, continue
  ↓
Next input: ' ' (space, not alphanumeric)
  ↓
End of token: "public"
  ↓
Check: is "public" a keyword? YES
  ↓
Emit: KEYWORD_PUBLIC token
  ↓
State: START (resume scanning)
```

### Whitespace & Comment Handling

```java
public /* comment */ class /*another*/ Test {
    // comments are skipped
    int x; // end of line comment
    /* multi-line
       comment */
}
```

**Scanner processes:**
```
Whitespace (spaces, tabs, newlines):
  Ignored (only used for token boundaries)
  
Single-line comments (//):
  Skip until end of line
  
Multi-line comments (/* ... */):
  Skip until matching */
  Can nest in some contexts
  
Javadoc comments (/** ... */):
  Parsed specially (stored as annotations)
```

### String & Character Literals

```java
String s1 = "hello";           // STRING literal
String s2 = "hello\"world";    // Escape sequences
char c = 'a';                  // CHAR literal
int i = 0xDEADBEEF;           // Hex literal
long l = 1000L;               // Long literal
double d = 1.23e-10;          // Scientific notation
```

**Scanner handles:**
```
String escapes: \n, \t, \r, \\, \", \', \uXXXX (unicode)
Char validation: Single character in quotes
Number formats: 
  - Decimal: 123
  - Hex: 0xDEADBEEF
  - Octal: 0777
  - Binary: 0b1010
  - Scientific: 1.23e-10
Suffixes: L (long), F (float), D (double, optional), f/d (lowercase)
```

### Position Tracking

For error messages:
```
File: Calculator.java
    ↓
Line: 42
    ↓
Column: 15
    ↓
Error message: "Unexpected token '}' at line 42, column 15"
```

Each token stores:
- Token type
- Token value
- Line number
- Column number
- Source position

---

## 4. SYNTAX ANALYSIS (PARSING)

### What is Syntax Analysis?

Taking tokens and building an **Abstract Syntax Tree (AST)** that represents the program structure.

### Grammar (Simplified)

Java grammar is a **context-free grammar**:

```
CompilationUnit ::= [PackageDecl] [ImportDecls] [TypeDecls]

TypeDecl ::= ClassDecl | InterfaceDecl | EnumDecl | AnnotationDecl

ClassDecl ::= Modifiers "class" Identifier [Extends] [Implements] "{" ClassBody "}"

Extends ::= "extends" Type

Implements ::= "implements" TypeList

ClassBody ::= MemberDecl*

MemberDecl ::= FieldDecl | MethodDecl | ConstructorDecl | InitializerDecl | ClassDecl

FieldDecl ::= Modifiers Type Identifier ["=" Expr] ";"

MethodDecl ::= Modifiers Type Identifier "(" [FormalParams] ")" [Throws] "{" MethodBody "}"

Statement ::= Block | IfStatement | WhileStatement | ForStatement | ...

Expression ::= Literal | Identifier | BinaryOp | MethodCall | ...
```

### Parsing Algorithm (Recursive Descent)

```java
// Simplified example:

class Parser {
    private Token current;
    
    void parseClassDecl() {
        expect(KEYWORD_CLASS);
        String name = expectIdentifier();
        expect(LBRACE);
        while (!check(RBRACE)) {
            parseMemberDecl();
        }
        expect(RBRACE);
    }
    
    void parseMemberDecl() {
        if (check(KEYWORD_PUBLIC)) {
            advance();  // consume public
        }
        
        if (check(KEYWORD_STATIC)) {
            advance();  // consume static
        }
        
        // Now parse field or method
        Type type = parseType();
        String name = expectIdentifier();
        
        if (check(LPAREN)) {
            // It's a method!
            parseMethodDecl(type, name);
        } else if (check(SEMICOLON)) {
            // It's a field!
            advance();  // consume ;
        }
    }
}
```

### AST Nodes

Each node represents a language construct:

```
ClassDecl
  ├─ modifiers: [public, final]
  ├─ name: "Person"
  ├─ superclass: "Object"
  ├─ interfaces: []
  └─ body: [
      FieldDecl {
        ├─ modifiers: [private]
        ├─ type: String
        ├─ name: "name"
        └─ initializer: null
      },
      MethodDecl {
        ├─ modifiers: [public]
        ├─ returnType: void
        ├─ name: "setName"
        ├─ parameters: [Param(String, "n")]
        └─ body: [
            ExpressionStatement {
              └─ BinaryOp("=") {
                  ├─ left: FieldAccess("name")
                  └─ right: Identifier("n")
                }
            }
          ]
      }
    ]
```

### Expression Parsing (Operator Precedence)

Java operator precedence (highest to lowest):

```
1. Postfix:        expr++ expr-- () [] . (access operators)
2. Unary:          ++expr --expr +expr -expr ! ~ (type)
3. Multiplicative: * / %
4. Additive:       + -
5. Shift:          << >> >>>
6. Relational:     < > <= >= instanceof
7. Equality:       == !=
8. Bitwise AND:    &
9. Bitwise XOR:    ^
10. Bitwise OR:    |
11. Logical AND:   &&
12. Logical OR:    ||
13. Ternary:       ? :
14. Assignment:    = += -= *= /= %= &= |= ^= <<= >>= >>>=
```

**Parsing: 2 + 3 * 4**

```
Call parseExpression()
  ↓
parseAdditive()
  ↓
parseMultiplicative()  // Higher precedence!
  ↓
parsePrimary()  → 2
  ↓
See + (lower precedence)
  ↓
Back to parseAdditive()
  ↓
See +, call parseMultiplicative()
  ↓
parsePrimary() → 3
  ↓
See * (higher precedence, handled in multiplicative)
  ↓
parseMultiplicative() continues
  ↓
See *, call parsePrimary() → 4
  ↓
No more operators
  ↓
Result: BinOp(+, 2, BinOp(*, 3, 4))
  ↓
Which evaluates as: 2 + (3 * 4) = 14 ✓
```

### Error Recovery

When parser encounters syntax error:

```java
void parseStatement() {
    try {
        // Parse normally
        parseIfStatement();
    } catch (SyntaxError e) {
        // Recovery: skip to next statement boundary
        while (!check(SEMICOLON) && !check(RBRACE)) {
            advance();
        }
        if (check(SEMICOLON)) {
            advance();
        }
        reportError("Expected statement");
    }
}
```

This allows reporting multiple errors in one compilation pass!

---

## 5. SEMANTIC ANALYSIS & TYPE CHECKING

### What is Semantic Analysis?

After parsing, we have syntactically correct code. Now we verify it's **semantically correct**:
- Variables declared before use
- Types match
- Access modifiers respected
- Methods overridden correctly
- No duplicate declarations

### Symbol Resolution

```java
public class Example {
    private String name;
    
    public void printName() {
        System.out.println(name);  // RESOLVE: what is 'name'?
    }
}
```

**Resolution process:**
```
Looking for symbol: "name" in context of printName()

1. Check local scope (method):
   name not found locally
   
2. Check enclosing scope (class):
   name found! → FieldSymbol(private String)
   
3. Check access: Is this method allowed to access private field?
   YES, same class
   
4. Record: name → FieldSymbol(String)
   
5. Later at bytecode generation, generate: getfield name
```

### Type Checking

```java
int x = 5;
String s = "hello";
int y = x + s;  // ERROR: Cannot apply operator + to (int, String)
```

**Type checking process:**
```
Check assignment: y = x + s
  ↓
Get type of x: int
  ↓
Get type of s: String
  ↓
Look up operator + for (int, String)
  ↓
Not found in operator table!
  ↓
Report compile-time error:
  "The operator + is undefined for the argument type(s) int, String"
```

### Method Overload Resolution

```java
class Math {
    static int max(int a, int b) { ... }
    static long max(long a, long b) { ... }
    static double max(double a, double b) { ... }
}

int result = Math.max(5, 10);      // Which max?
long result = Math.max(5L, 10L);   // Which max?
```

**Overload resolution:**
```
Method call: max(5, 10)
  ↓
Argument types: (int, int)
  ↓
Find all methods named "max" in scope
  ↓
- max(int, int) ✓ EXACT MATCH
- max(long, long) - requires widening int→long
- max(double, double) - requires widening int→double
  ↓
Choose EXACT MATCH: max(int, int)
  ↓
If multiple candidates with same specificity:
  Compile-time error: "The method max is ambiguous"
```

### Type Compatibility

**Widening conversions** (safe, automatic):
```
byte → short → int → long → float → double
     ↘ char ↗

byte b = 5;
int i = b;  // OK, implicit widening

char c = 'A';
int i = c;  // OK, char → int
```

**Narrowing conversions** (unsafe, requires cast):
```
int i = 1000;
byte b = i;       // ERROR: Cannot convert from int to byte
byte b = (byte)i; // OK with explicit cast
```

**Numeric type promotion:**
```
byte + byte → int
short + short → int
byte + short → int
int + int → int
int + long → long
float + float → float
float + int → float
double + anything → double
```

### Access Control Checking

```java
public class A {
    private int x;
    protected int y;
    public int z;
}

class B {
    A a = new A();
    void test() {
        a.x;  // ERROR: x is private, not accessible
        a.y;  // ERROR: y is protected, not accessible (different package)
        a.z;  // OK: z is public
    }
}
```

**Access modifier rules:**
```
         | Class | Package | Subclass | World |
---------|-------|---------|----------|-------|
private  |  YES  |   NO    |    NO    |  NO   |
package  |  YES  |   YES   |    NO    |  NO   |
protected|  YES  |   YES   |    YES   |  NO   |
public   |  YES  |   YES   |    YES   |  YES  |
```

### Method Override Validation

```java
class Parent {
    public void method(int x) { }
}

class Child extends Parent {
    // Valid override
    @Override
    public void method(int x) { }
    
    // Invalid: different return type
    // public int method(int x) { }  // ERROR
    
    // Invalid: more restrictive access
    // private void method(int x) { }  // ERROR
    
    // Invalid: throws checked exception
    // public void method(int x) throws IOException { }  // ERROR
}
```

**Override rules:**
```
✓ Return type must be SAME or COVARIANT (subtype)
✓ Parameters must be EXACTLY the same
✓ Access modifier must be SAME or LESS restrictive
✓ Cannot throw NEW checked exceptions
✓ Can override with NO throws clause
```

---

## 6. BYTECODE GENERATION

### What is Bytecode?

Bytecode is an **intermediate representation** that:
- Is **stack-based** (not register-based)
- Uses **1-3 byte instructions**
- Is **human-readable** via decompilers
- Is **JVM-independent** (runs on any JVM)
- Is **more efficient than interpreting AST directly**

### Stack-Based Architecture

Unlike CPU registers, JVM uses an **operand stack**:

```java
int x = 5 + 3;
```

**Bytecode:**
```
ldc 5          // Push 5 onto stack: [5]
ldc 3          // Push 3 onto stack: [5, 3]
iadd           // Pop 2, add, push result: [8]
istore_1       // Pop and store in local var 1: []
```

**Register-based (like x86):**
```
mov eax, 5
mov ebx, 3
add eax, ebx
mov [x], eax
```

### Bytecode Generation Process

For each AST node, generate corresponding bytecode:

```
ClassDecl
  ├─ Generate class header
  ├─ Generate constant pool
  ├─ FieldDecl
  │   └─ Add field descriptor
  ├─ MethodDecl
  │   ├─ Generate method signature
  │   ├─ MethodBody (statements)
  │   │   └─ For each statement:
  │   │       └─ Generate bytecode
  │   └─ Generate local variable table
  └─ Generate attributes (SourceFile, etc.)
```

### Simple Example: Field Assignment

```java
public class Test {
    int x;
    
    public void setX(int value) {
        x = value;
    }
}
```

**Bytecode for setX:**
```
public void setX(int);
  Code:
     0: aload_0           // Load 'this' (arg 0)
     1: iload_1           // Load 'value' (arg 1)
     2: putfield x        // Set field x on this object
     5: return            // Return void
```

**Constant pool entries:**
```
#1 = Methodref #2.#3          // java/lang/Object.<init>
#2 = Class #4                 // java/lang/Object
#3 = NameAndType #5.#6        // <init>:()V
#4 = Utf8 java/lang/Object
#5 = Utf8 <init>
#6 = Utf8 ()V
#7 = Fieldref #8.#9           // Test.x
#8 = Class #10                // Test
#9 = NameAndType #11.#12      // x:I
#10 = Utf8 Test
#11 = Utf8 x
#12 = Utf8 I
```

### Complex Example: Control Flow

```java
public void checkAge(int age) {
    if (age >= 18) {
        System.out.println("Adult");
    } else {
        System.out.println("Minor");
    }
}
```

**Bytecode:**
```
public void checkAge(int);
  Code:
     0: iload_1            // Load age
     1: bipush 18          // Push constant 18
     3: if_icmplt 14       // If age < 18, jump to 14 (else branch)
     6: getstatic System.out
     9: ldc "Adult"
    11: invokevirtual println
    14: getstatic System.out  // else branch starts here
    17: ldc "Minor"
    19: invokevirtual println
    22: return
```

**Control flow graph:**
```
       ┌──→ [0-5] Load and compare ──┐
       │                              ↓
       │                        [6-12] if true (println "Adult")
       │                              ↓
       │                        [13] jump to 22
       │                              ↓
       └──────────────→ [14-21] else (println "Minor")
                              ↓
                        [22] return
```

### Labels and Jump Targets

```java
for (int i = 0; i < 10; i++) {
    if (i == 5) break;
    System.out.println(i);
}
```

**Bytecode:**
```
0: iconst_0           // i = 0
1: istore_1           // store in local var 1

LOOP_START (label at 2):
2: iload_1            // load i
3: bipush 10
5: if_icmpge LOOP_END // if i >= 10, jump to end
8: iload_1            // load i
9: iconst_5
10: if_icmpeq LOOP_END  // if i == 5, break (jump to end)
13: getstatic out
16: iload_1
17: invokevirtual println
20: iinc 1, 1         // i++
23: goto LOOP_START   // unconditional jump to 2
26: LOOP_END:
26: return
```

---

## 7. BYTECODE INSTRUCTIONS DEEP DIVE

### Instruction Format

Each bytecode instruction has:
- **Opcode** (1 byte): The operation (0-255)
- **Operands** (0-N bytes): Arguments to the operation

```
Instruction: iload_1
Opcode: 0x1B (27 decimal)
Operands: none
Meaning: Load int from local variable 1 onto stack

Instruction: bipush 10
Opcode: 0x10 (16 decimal)
Operands: 1 byte (value 10)
Meaning: Push byte 10 as int onto stack
```

### Instruction Categories

#### 1. Load Instructions (Push value onto stack)

```
iload_0, iload_1, iload_2, iload_3    // Load int from local var 0-3
iload <var>                           // Load int from local var (arbitrary)
lload_0, lload_1, ...                // Load long
fload, dload, aload                  // Float, double, reference
```

**Example:**
```java
void method(int a, long b, double c, Object d) {
    // int a is at local var 1 (var 0 is 'this')
    // long b is at local vars 2-3 (longs take 2 slots)
    // double c is at local vars 4-5
    // Object d is at local var 6
    
    int x = a;  → iload_1 (load from var 1)
}
```

#### 2. Store Instructions (Pop from stack, store)

```
istore_0, istore_1, ...               // Store int to local var
istore <var>                          // Store int (arbitrary var)
lstore, fstore, dstore, astore        // Long, float, double, ref
```

**Example:**
```java
int result = 42;
// Stack: [42]
istore_1     // Pop 42, store in local var 1
// Stack: []
```

#### 3. Constant Instructions

```
nop                    // No operation
aconst_null           // Push null
iconst_m1, iconst_0, iconst_1, ...   // Push int -1 to 5
lconst_0, lconst_1    // Push long 0 or 1
fconst_0, fconst_1, fconst_2         // Push float
dconst_0, dconst_1                   // Push double
bipush <byte>         // Push byte (-128 to 127)
sipush <short>        // Push short (-32768 to 32767)
ldc <index>           // Push constant from constant pool
ldc2_w <index>        // Push long/double from pool
```

**Examples:**
```
iconst_5      // Push 5 (optimized, no operand needed)
bipush 127    // Push 127 (needs 1-byte operand)
sipush 32000  // Push 32000 (needs 2-byte operand)
ldc 1         // Push constant #1 from pool
```

#### 4. Arithmetic Instructions

```
iadd, isub, imul, idiv, irem          // int arithmetic
ladd, lsub, lmul, ldiv, lrem          // long arithmetic
fadd, fsub, fmul, fdiv, frem          // float arithmetic
dadd, dsub, dmul, ddiv, drem          // double arithmetic
ineg, lneg, fneg, dneg                // Negate
```

**Stack behavior:**
```
Before: [a, b]
iadd
After:  [a + b]

Before: [a]
ineg
After:  [-a]
```

#### 5. Comparison Instructions

```
lcmp           // Compare longs: result = (a > b) ? 1 : (a < b) ? -1 : 0
fcmpl, fcmpg   // Compare floats (l=less, g=greater for NaN)
dcmpl, dcmpg   // Compare doubles

if_icmpeq <offset>     // If int a == int b, jump
if_icmpne <offset>     // If int a != int b, jump
if_icmplt <offset>     // If int a < int b, jump
if_icmpgt <offset>     // If int a > int b, jump
if_icmple <offset>     // If int a <= int b, jump
if_icmpge <offset>     // If int a >= int b, jump

ifeq <offset>          // If a == 0, jump
ifne <offset>          // If a != 0, jump
iflt <offset>          // If a < 0, jump
ifgt <offset>          // If a > 0, jump
ifle <offset>          // If a <= 0, jump
ifge <offset>          // If a >= 0, jump

if_acmpeq <offset>     // If a == b (references), jump
if_acmpne <offset>     // If a != b (references), jump
```

**Example: if (x > 5)**
```
iload_1        // Load x
bipush 5
if_icmple 10   // If x <= 5, jump to 10 (skip true block)
// ... true block bytecode ...
goto 15        // Jump to end
// Label 10: false block
// ... false block bytecode ...
// Label 15: continue
```

#### 6. Method Invocation Instructions

```
invokestatic <method>      // Call static method (no receiver)
invokespecial <method>     // Call private/constructor/super (no virtual dispatch)
invokevirtual <method>     // Call instance method (virtual dispatch)
invokeinterface <method>   // Call interface method
invokedynamic <bootstrap>  // Call dynamic (lambdas, etc.)
```

**Stack behavior:**
```
Before: [arg1, arg2, ..., argN]
invokevirtual method
After:  [returnValue] or [] if void
```

**Example:**
```java
System.out.println("hello");

Bytecode:
getstatic System.out       // Load System.out (PrintStream)
ldc "hello"                // Push "hello"
invokevirtual println      // Pop 2 args, call

Stack before invokevirtual: [PrintStream, "hello"]
Stack after invokevirtual: []
```

#### 7. Field Access

```
getfield <field>       // Read instance field
putfield <field>       // Write instance field
getstatic <field>      // Read static field
putstatic <field>      // Write static field
```

**Example:**
```java
class Person {
    int age;
    void setAge(int a) {
        age = a;  
    }
}

Bytecode for setAge:
aload_0        // Load 'this'
iload_1        // Load 'a'
putfield age   // Pop this and a, set age field

// Implicit: 'this' is at local var 0 for instance methods
```

#### 8. Object Creation & Array

```
new <class>            // Allocate new object (uninitialized)
newarray <type>        // Allocate primitive array
anewarray <class>      // Allocate object array
multianewarray <type>  // Allocate multi-dimensional array
arraylength            // Get array length
```

**Example:**
```java
Object[] arr = new Object[10];

Bytecode:
bipush 10              // Array size
anewarray Object       // Create array of Object
astore_1               // Store in local var 1

Stack behavior:
Before: []
bipush 10
After: [10]
anewarray Object
After: [Object[]]
astore_1
After: []
```

#### 9. Type Conversion

```
i2l, i2f, i2d              // int → long, float, double
l2i, l2f, l2d              // long → int, float, double
f2i, f2l, f2d              // float → int, long, double
d2i, d2l, d2f              // double → int, long, float
i2b, i2c, i2s              // int → byte, char, short
```

**Example:**
```java
int x = 5;
long y = x;

Bytecode:
iload_1        // Load x (int)
i2l            // Convert int to long (push 64-bit value)
lstore_2       // Store in y (long, occupies 2 local vars)
```

#### 10. Logical/Bitwise

```
ishl, ishr, iushr           // int shift left/right, unsigned right
lshl, lshr, lushr           // long shift
iand, ior, ixor             // int bitwise and/or/xor
land, lor, lxor             // long bitwise
```

#### 11. Return Instructions

```
return         // Return void
ireturn        // Pop int and return
lreturn        // Pop long and return
freturn        // Pop float and return
dreturn        // Pop double and return
areturn        // Pop reference and return
```

#### 12. Exception Handling

```
athrow         // Throw exception from stack
```

### Instruction Size & Compactness

```
Instruction                    Bytecode       Size
─────────────────────────────────────────────────
iconst_5                       0x08           1 byte
bipush 127                     0x10 0x7F      2 bytes
sipush 32767                   0x11 0x7F FF   3 bytes
ldc 1                          0x12 0x01      2 bytes
aload_0                        0x2A           1 byte
aload <var>                    0x19 <var>     2 bytes
```

Compact encoding important for JVM performance and class file size.

---

## 8. TYPE SYSTEM & TYPE ERASURE

### Java's Type System

Java has a **nominal type system** (types named explicitly, unlike structural):

```java
class A { int x; }
class B { int x; }

A a = new A();
B b = (B) a;  // Cast required, even though structure is same
              // Because they have different names
```

### Primitive Types (not objects)

```
byte   (8-bit signed integer)  range: -128 to 127
short  (16-bit signed)          range: -32,768 to 32,767
int    (32-bit signed)          range: -2^31 to 2^31-1
long   (64-bit signed)          range: -2^63 to 2^63-1
float  (32-bit IEEE 754)        range: ±1.4e-45 to ±3.4e38
double (64-bit IEEE 754)        range: ±4.9e-324 to ±1.8e308
boolean (2 values)              true or false
char   (16-bit Unicode)         range: '\u0000' to '\uFFFF'
```

Stored directly on stack/in local vars (no heap allocation).

### Reference Types (objects)

```java
Object          // Super type of all objects
String, Integer // Specific classes
List, Map       // Interface types
```

Always allocated on heap, reference stored on stack/in local var.

### Type Erasure (Critical for SDE3!)

**Type Erasure** is the process of removing generic type information at compile time.

```java
List<String> strings = new ArrayList<String>();
List<Integer> ints = new ArrayList<Integer>();

// At runtime, both are List<Object>!
// Type information <String>, <Integer> is ERASED
```

**Why erasure?**
- Java added generics in 1.5 but needed backward compatibility
- Old code used raw types: `List list = new ArrayList()`
- Erasure allows seamless mixing of generic and raw code

### How Erasure Works

**Before erasure (source):**
```java
public class Box<T> {
    private T value;
    
    public void set(T value) {
        this.value = value;
    }
    
    public T get() {
        return value;
    }
}

Box<String> box = new Box<>();
box.set("hello");
String s = box.get();
```

**After erasure (bytecode):**
```java
public class Box {
    private Object value;  // T → Object
    
    public void set(Object value) {  // T → Object
        this.value = value;
    }
    
    public Object get() {  // T → Object
        return value;
    }
}

Box box = new Box();           // Generic type erased
box.set("hello");
String s = (String) box.get(); // Cast inserted by compiler!
```

### Bytecode for Generic Code

```java
public static void printList(List<String> list) {
    for (String s : list) {
        System.out.println(s);
    }
}
```

**Becomes:**
```java
public static void printList(List list) {  // List, not List<String>
    for (String s : list) {                // Implicit cast: (String) list.next()
        System.out.println(s);
    }
}
```

**Bytecode:**
```
Code:
   0: aload_0           // Load list
   1: invokeinterface List.iterator
   4: astore_1          // Store iterator
   5: aload_1           // Load iterator
   6: invokeinterface Iterator.hasNext
   9: ifeq 28           // If no more, jump to end
  12: aload_1           // Load iterator
  13: invokeinterface Iterator.next  // Returns Object!
  16: checkcast String  // Cast to String (inserted by compiler)
  19: astore_2          // Store s
  20: getstatic out
  23: aload_2           // Load s
  24: invokevirtual println
  27: goto 5            // Loop
  28: return
```

### Bounds Erasure

```java
public <T extends Number> void process(T value) {
    int x = value.intValue();  // Number has intValue()
}
```

**Bytecode:**
```
Code:
   0: aload_1              // Load value (type Object after erasure)
   1: checkcast Number     // Compiler inserts checkcast!
   4: invokevirtual intValue
   7: istore_2
   8: return
```

### Bridge Methods (for complex generics)

```java
interface Comparable<T> {
    int compareTo(T o);
}

class StringComparable implements Comparable<String> {
    @Override
    public int compareTo(String o) {
        return o.length();
    }
}
```

**After erasure:**
```java
interface Comparable {
    int compareTo(Object o);  // T erased to Object
}

class StringComparable implements Comparable {
    @Override
    public int compareTo(String o) {  // Signature changed!
        return o.length();
    }
}
```

**Problem**: Method doesn't match the interface after erasure!

**Solution**: Compiler generates bridge method:
```java
class StringComparable implements Comparable {
    public int compareTo(Object o) {  // Bridge method
        return compareTo((String) o);  // Delegate to real method
    }
    
    public int compareTo(String o) {  // Real implementation
        return o.length();
    }
}
```

**Bytecode shows both methods:**
```
public int compareTo(Object);  // Bridge
public int compareTo(String);  // Original
```

---

## 9. GENERICS COMPILATION

### Generic Type Parameters

```java
class Pair<K, V> {
    private K key;
    private V value;
    
    public K getKey() { return key; }
    public V getValue() { return value; }
}

// Usage:
Pair<String, Integer> pair = new Pair<>();
String key = pair.getKey();      // Type safe!
Integer value = pair.getValue();
```

**Compilation:**
```
Check: getKey() returns K
Infer: K = String (from Pair<String, Integer>)
Infer: getKey() returns String
Check: can assign to String? YES
Compile as: getKey() returns Object (erased)
           with implicit checkcast to String
```

### Bounded Type Parameters

```java
class NumberBox<T extends Number> {
    private T value;
    
    public int toInt() {
        return value.intValue();  // OK: T extends Number
    }
}

class BadBox<T> {
    private T value;
    
    public int toInt() {
        return value.intValue();  // ERROR: T might not have intValue()
    }
}
```

**Compilation of NumberBox:**
```
Check: value.intValue()
  ↓
Is T guaranteed to have intValue()?
  ↓
T extends Number, Number has intValue()
  ↓
YES, compile

Bytecode:
aload_0
getfield value       // Get T
checkcast Number     // Insert bounds check
invokevirtual intValue
```

### Wildcard Types

```java
// Covariance: List<String> is List<? extends Object>
void processObjects(List<? extends Object> list) {
    for (Object obj : list) {
        System.out.println(obj);
    }
}

List<String> strings = Arrays.asList("a", "b");
processObjects(strings);  // OK

// Contravariance: List<Object> is List<? super String>
void addStrings(List<? super String> list) {
    list.add("hello");
}

List<Object> objects = new ArrayList<>();
addStrings(objects);  // OK
```

### Generic Methods

```java
public static <T> T getFirst(List<T> list) {
    return list.isEmpty() ? null : list.get(0);
}

// Usage:
String s = getFirst(Arrays.asList("a", "b"));
Integer i = getFirst(Arrays.asList(1, 2));
```

**Compilation:**
```
Call: getFirst(Arrays.asList("a", "b"))
  ↓
Infer type argument: T = String
  ↓
Bytecode: 
  List.get(0) returns Object
  Add checkcast String (inserted by compiler)
```

---

## 10. ANNOTATIONS

### Annotation Definition

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Timeout {
    int milliseconds() default 1000;
    String reason() default "";
}
```

**Compilation:**
```
1. Create annotation interface:
   public interface Timeout extends Annotation { ... }
   
2. Generate default implementations:
   public int milliseconds() default 1000;
   public String reason() default "";
```

### Annotation Usage

```java
class Service {
    @Timeout(milliseconds = 5000)
    public void slowMethod() { }
    
    @Timeout  // Uses defaults
    public void normalMethod() { }
}
```

**In bytecode:**
```
RuntimeVisibleAnnotations attribute:
  Annotation: Timeout
    milliseconds: 5000
    reason: "" (default)
    
  Annotation: Timeout
    milliseconds: 1000 (default)
    reason: "" (default)
```

### Retention Policies

```java
@Retention(RetentionPolicy.SOURCE)
// Available only in source, discarded during compilation
// Example: @Deprecated

@Retention(RetentionPolicy.CLASS)  
// Available in class file, not at runtime (default)
// Example: @NotNull (for static analysis)

@Retention(RetentionPolicy.RUNTIME)
// Available at runtime via reflection
// Example: @Override, @Test, @Entity
```

### Target Types

```java
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface MyAnnotation { }

@MyAnnotation         // OK on class
class MyClass {
    @MyAnnotation     // OK on method
    void method() { }
    
    @MyAnnotation     // ERROR on field
    int field;
}
```

### Repeatable Annotations

```java
@Repeatable(Timeouts.class)
public @interface Timeout {
    int value();
}

public @interface Timeouts {
    Timeout[] value();
}

class Service {
    @Timeout(1000)
    @Timeout(2000)  // Can repeat!
    void method() { }
}
```

**Compiled as:**
```
RuntimeVisibleAnnotations attribute:
  Annotation: Timeouts
    value: [
      Timeout(1000),
      Timeout(2000)
    ]
```

---

## 11. MODULE SYSTEM (Java 9+)

### Module Declaration

```java
// module-info.java
module com.example.trading {
    requires java.base;
    requires java.logging;
    
    exports com.example.trading.api;
    exports com.example.trading.models;
    
    opens com.example.trading.impl;
    
    uses com.example.trading.spi.Strategy;
    provides com.example.trading.spi.Strategy
        with com.example.trading.impl.DefaultStrategy;
}
```

### Compilation with Modules

```bash
# Old way (classpath)
javac -cp lib/*:. src/*.java

# Module way
javac --module-source-path src src/com.example.trading/module-info.java
javac --module-source-path src -d out src/**/*.java
```

### Module Resolution During Compilation

```
javac --module-source-path src module-info.java
  ↓
1. Find module-info.java
  ↓
2. Parse module declarations:
   - requires com.example.api;
   ↓
3. Locate com.example.api on module path
  ↓
4. Compile all files in com.example.trading module
  ↓
5. Verify module constraints:
   - Only export declared packages? YES
   - Requires existing modules? YES
   ↓
6. Generate module-info.class
```

### Module Access Control

```java
// com.example.api module
module com.example.api {
    exports com.example.api.public;
}

// com.example.impl module  
module com.example.impl {
    requires com.example.api;
    
    // Can access com.example.api.public (exported)
    // Cannot access com.example.api.internal (not exported)
}
```

**Compilation error if module tries to access unexported package:**
```
[ERROR] package com.example.api.internal is not visible
```

---

## 12. INCREMENTAL COMPILATION

### Why Incremental Compilation?

Full recompilation of large projects is slow. Incremental compilation recompiles only affected files.

```
Project: 10,000 Java files

Scenario 1: Change one line in Utils.java
  Full compile: 10,000 files → 2 minutes
  Incremental: Utils.java + dependents → 10 seconds
```

### Dependency Tracking

Compiler tracks dependencies:
```
Utils.java
  ├─ imports: java.util.*, com.example.*
  ├─ used by: Service1.java, Service2.java, Helper.java
  
Service1.java
  ├─ imports: Utils, Config
  ├─ used by: Main.java
  
Service2.java
  ├─ imports: Utils, Database
  ├─ used by: Main.java
```

### Incremental Build Algorithm

```
If Utils.java changed:
  1. Recompile Utils.java
  2. Check dependents: Service1, Service2, Helper
  3. Do their signatures change? 
     - If YES: recompile dependents
     - If NO: skip (already up-to-date)
  4. Check service1/service2 dependents: Main.java
  5. Do their signatures change?
     - If YES: recompile Main.java
     - If NO: done
```

### IDE Support (Eclipse, IntelliJ)

```
1. Detect file save: Utils.java
2. Background: incremental compilation
3. Immediate feedback: errors/warnings
4. No full project rebuild needed
```

Build tools like Gradle and Maven use file timestamps:
```
File: Utils.java (modified: 10:45:00)
File: Utils.class (generated: 10:30:00)

Is .class outdated? 10:30 < 10:45 → YES
Recompile Utils.java
```

---

## 13. ANNOTATION PROCESSORS

### What are Annotation Processors?

Plugins that run **during compilation** to:
- Generate new source files
- Generate new class files
- Validate code
- Perform compile-time calculations

### Compilation Flow with Processors

```
javac *.java
  ↓
Parse and enter (create symbol table)
  ↓
Run annotation processors
  ↓
Do processors generate new sources?
  ├─ YES: Re-run from parsing with new sources
  └─ NO: Continue
  ↓
Annotation processing complete? (no more sources)
  ├─ YES: Continue to checking and bytecode gen
  └─ NO: Repeat
```

### Simple Processor Example

```java
@SupportedAnnotationTypes("com.example.GenerateCode")
@SupportedSourceVersion(SourceVersion.RELEASE_11)
public class CodeGenerator extends AbstractProcessor {
    
    @Override
    public boolean process(Set<? extends TypeElement> annotations,
                          RoundEnvironment roundEnv) {
        for (Element elem : roundEnv.getElementsAnnotatedWith(GenerateCode.class)) {
            String className = elem.getSimpleName() + "Generated";
            
            try {
                JavaFileObject source = processingEnv.getFiler()
                    .createSourceFile(className);
                    
                Writer writer = source.openWriter();
                writer.write("public class " + className + " { }");
                writer.close();
            } catch (IOException e) {
                processingEnv.getMessager().printMessage(
                    Diagnostic.Kind.ERROR, e.getMessage());
            }
        }
        
        return true;  // Claim annotations
    }
}
```

### Lombok Example (Real-world)

```java
@Data
class Person {
    private String name;
    private int age;
}

// Processor generates:
public class Person {
    private String name;
    private int age;
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public int getAge() { return age; }
    public void setAge(int age) { this.age = age; }
    
    @Override
    public boolean equals(Object o) { ... }
    
    @Override
    public int hashCode() { ... }
    
    @Override
    public String toString() { ... }
}
```

### Compilation Command

```bash
# Register processor
javac -processor com.example.CodeGenerator \
      -processorpath lib/processor.jar \
      src/*.java
```

---

## 14. DECOMPILATION & CLASS FILE ANALYSIS

### Class File Structure (Review)

```
ClassFile {
    u4             magic           // 0xCAFEBABE
    u2             minor_version   
    u2             major_version   // Major version = Java version - 1
    u2             constant_pool_count
    cp_info        constant_pool[...]
    u2             access_flags
    u2             this_class
    u2             super_class
    u2             interfaces_count
    u2             interfaces[...]
    u2             fields_count
    field_info     fields[...]
    u2             methods_count
    method_info    methods[...]
    u2             attributes_count
    attribute_info attributes[...]
}
```

### Version Numbers

```
Java 8:  Major = 52, Minor = 0 (0x34 0x00)
Java 11: Major = 55, Minor = 0 (0x37 0x00)
Java 17: Major = 61, Minor = 0 (0x3D 0x00)
Java 21: Major = 65, Minor = 0 (0x41 0x00)

Hexdump of Java 11 class file:
CA FE BA BE        // magic
00 00              // minor
00 37              // major (55 = Java 11)
```

### Using javap (Disassembler)

```bash
# Disassemble a class
javap -c -p -v MyClass.class

# Example output:
public class MyClass
  minor version: 0
  major version: 55
  flags: ACC_PUBLIC, ACC_SUPER
  
Constant pool:
   #1 = Methodref          #6.#15         // java/lang/Object.<init>
   #2 = Fieldref           #5.#16         // MyClass.x:I
   
...

  public void setX(int);
    descriptor: (I)V
    flags: ACC_PUBLIC
    Code:
      stack=2, locals=2, args_size=2
         0: aload_0
         1: iload_1
         2: putfield      #2                  // Field x:I
         5: return
```

### Using javap -c (Disassemble Code)

Shows bytecode:
```bash
javap -c Calculator.class

public class Calculator {
  public int add(int, int);
    Code:
       0: iload_1
       1: iload_2
       2: iadd
       3: ireturn
}
```

### Decompilers

Tools to convert .class back to readable Java:

**javap** (JDK tool):
```bash
javap -c -p -v ClassName.class
```

**CFR** (modern, handles lambdas, records):
```bash
cfr ClassName.class --outputdir src/
```

**JD-GUI** (GUI tool):
```bash
jd-gui file.jar
```

### Constant Pool Analysis

```java
class Test {
    String name = "John";
    int age = 30;
}

// Constant Pool entries:
#1  = Class "java/lang/Object"
#2  = Class "Test"
#3  = Utf8 "name"
#4  = Utf8 "Ljava/lang/String;"
#5  = Fieldref #2.#6  // Test.name
#6  = NameAndType #3.#4  // name:Ljava/lang/String;
#7  = String "John"
#8  = Utf8 "age"
#9  = Utf8 "I"
#10 = Fieldref #2.#11  // Test.age
#11 = NameAndType #8.#9  // age:I
...
```

---

## 15. COMMON COMPILATION ERRORS

### Type Errors

```java
int x = "hello";  
// ERROR: incompatible types: String cannot be converted to int

String[] arr = new String[5];
arr[0] = 42;  
// ERROR: incompatible types: int cannot be converted to String

List<Integer> list = new ArrayList<String>();
// ERROR: incompatible types: ArrayList<String> cannot be converted to List<Integer>
```

### Reference Resolution Errors

```java
undefined symbol: someMethod()
// The method doesn't exist or was misnamed

undefined symbol: MyClass
// The class wasn't imported or isn't on classpath

symbol: class String
location: class Test
// Probably a package issue (e.g., wrong import)
```

### Access Control Errors

```java
class A {
    private int x;
}

class B {
    void test(A a) {
        int y = a.x;  
        // ERROR: x has private access in A
    }
}
```

### Override Errors

```java
class Parent {
    public void method() { }
}

class Child extends Parent {
    private void method() { }  
    // ERROR: cannot reduce visibility from public to private
}

class Child extends Parent {
    public int method() { return 1; }  
    // ERROR: method() in Child cannot override method() in Parent
    // (different return types)
}
```

### Generic Type Errors

```java
List<String> strings = new ArrayList<Integer>();
// ERROR: incompatible types: ArrayList<Integer> cannot be converted to List<String>

List<? extends Number> list = new ArrayList<String>();
// ERROR: String doesn't extend Number

Map<String, ? extends Number> = new HashMap<String, Integer>();
// OK

List<String> strings = ...;
List list = strings;  // Unchecked assignment warning
```

### Unreachable Code

```java
void method() {
    throw new RuntimeException();
    System.out.println("Never reaches here");
    // ERROR: unreachable statement
}
```

### Forward References in Initializers

```java
class Example {
    int x = y;  // ERROR: cannot reference field before it is defined
    int y;
}
```

---

## 16. SDE3 INTERVIEW QUESTIONS

### Question 1: Explain the complete compilation pipeline

**Expected Answer Structure:**

1. **Lexical Analysis**: Source code → Tokens (keywords, identifiers, literals, operators)
2. **Syntax Analysis**: Tokens → AST (Abstract Syntax Tree)
   - Uses parser with operator precedence rules
   - Recursive descent parsing
3. **Semantic Analysis**: 
   - Symbol resolution (find where each identifier is declared)
   - Type checking (do operators work on given types?)
   - Access control validation
4. **Bytecode Generation**:
   - AST → Stack-based bytecode instructions
   - Generates constant pool entries for names/types
   - Optimizes (dead code elimination, etc.)
5. **Class File Writing**: 
   - Bytecode → Binary .class file format
   - Stores metadata in attributes

**Key Point**: Javac does multiple logical passes but reads source once (efficient design).

---

### Question 2: What is type erasure and why does Java use it?

**Expected Answer:**

Type erasure removes generic type information at compile time:

```java
List<String> strings = ...;
List<Integer> ints = ...;

// At runtime, both are identical: List
```

**Why?**
- Java added generics in Java 5, but needed backward compatibility
- Old code used raw types: `List list = new ArrayList()`
- Recompiling with generics would break bytecode compatibility
- Solution: Erase generics at compile time, add implicit casts

**Technical Details:**
```
public <T> T get(List<T> list) { ... }

Erases to:

public Object get(List list) { ... }

Compiler inserts: T t = (T) someObject;
```

**Consequence**: 
- Cannot use `instanceof` with generics: `x instanceof List<String>` → ERROR
- Cannot create generic arrays: `new List<String>[10]` → ERROR
- Cannot have overloaded methods differing only in type parameters:
  ```java
  void process(List<String>) { }
  void process(List<Integer>) { }  // ERROR: same erasure
  ```

---

### Question 3: Explain bridge methods and when they're generated

**Expected Answer:**

Bridge methods are **synthetic methods** generated by javac when generic method overrides would have different signatures after erasure.

**Example:**
```java
interface Comparable<T> {
    int compareTo(T o);
}

class String implements Comparable<String> {
    public int compareTo(String o) {
        return this.length() - o.length();
    }
}
```

**After erasure:**
- Interface method signature: `compareTo(Object)`
- Implementation method signature: `compareTo(String)`
- These don't match!

**Solution**: Compiler generates bridge method:
```java
class String implements Comparable {
    public int compareTo(Object o) {  // Bridge method
        return compareTo((String)o);  // Delegate
    }
    
    public int compareTo(String o) {  // Real implementation
        return this.length() - o.length();
    }
}
```

**Key Points:**
- Bridge methods are `synthetic` (generated, not in source)
- `javap -c String.class` shows both methods
- Important for binary compatibility
- Developer doesn't write them explicitly

---

### Question 4: How does javac resolve method overloads?

**Expected Answer:**

Java uses a multi-phase overload resolution:

**Phase 1: Identify Applicable Methods**
- Name matches
- Number and type of arguments compatible

**Phase 2: Select Most Specific**
```java
class Test {
    void method(int a) { }      // Method A
    void method(long a) { }     // Method B
    void method(Object a) { }   // Method C
}

Test test = new Test();
test.method(5);  // int argument

Applicable methods:
- method(int): int exact match ✓
- method(long): requires int→long widening ✓
- method(Object): requires int→Object boxing+widening ✓

Most specific: method(int) (exact match preferred)
```

**Preference Order:**
1. Exact match (no conversion)
2. Widening primitive (e.g., int→long)
3. Autoboxing (e.g., int→Integer)
4. Widening reference (e.g., String→Object)
5. Varargs

**Ambiguous Case (Compile Error):**
```java
void method(List<String>) { }
void method(List<Integer>) { }

method(new ArrayList<>());
// ERROR: ambiguous (both methods erase to List)
```

---

### Question 5: Explain constant pool and why it's necessary

**Expected Answer:**

The **constant pool** is a table in the .class file storing all constants referenced by the code.

**Why?**
- Bytecode uses **indices into constant pool**, not actual values
- Saves space: `ldc #7` (2 bytes) vs storing full string (many bytes)
- Class linking: References to other classes use indices

**Constant Pool Entries:**
```
#1  = Methodref #2.#3              // Method reference
#2  = Class #4                     // Class reference
#3  = NameAndType #5.#6            // Name and type
#4  = Utf8 "java/lang/Object"      // String (class name)
#5  = Utf8 "<init>"                // String (method name)
#6  = Utf8 "()V"                   // String (method signature)
#7  = String #8                    // String literal reference
#8  = Utf8 "Hello"                 // String literal content
```

**Bytecode Usage:**
```java
System.out.println("Hello");

Bytecode:
getstatic   #9   // Get System.out (from constant pool entry #9)
ldc         #7   // Load string (references entry #7, which → entry #8 "Hello")
invokevirtual #10  // Call println (from entry #10)
```

**Size Implications:**
```
Without constant pool:
ldc "Hello World String with lots of content"
ldc "Hello World String with lots of content"
ldc "Hello World String with lots of content"
→ 3 copies, waste of space

With constant pool:
ldc #7  // -> "Hello World String with lots of content"
ldc #7  // -> same entry
ldc #7  // -> same entry
→ 1 copy, reference 3 times
```

---

### Question 6: What's the difference between invokevirtual, invokespecial, invokestatic?

**Expected Answer:**

Three different bytecode instructions for method invocation with different binding strategies:

| Instruction | When Used | Binding | Virtual Dispatch |
|-------------|-----------|---------|------------------|
| invokestatic | Static methods | Compile-time | NO |
| invokespecial | Private methods, constructors, super calls | Compile-time | NO |
| invokevirtual | Instance methods | Runtime | YES |

**invokestatic** (Compile-time binding):
```java
Math.abs(-5);

Bytecode: invokestatic Math.abs

→ Directly calls Math.abs, no receiver object needed
```

**invokespecial** (No overriding):
```java
this.privateMethod();
super.method();
new MyClass();

Bytecode: invokespecial MyClass.privateMethod / MyClass.method / MyClass.<init>

→ No possibility of override (private or super), direct call
```

**invokevirtual** (Runtime dispatch):
```java
Animal a = new Dog();
a.speak();

Bytecode: invokevirtual Animal.speak

At runtime:
1. Get actual type of object: Dog
2. Look up speak() in Dog's method table
3. Call Dog.speak() (even though reference is Animal)
```

**Performance Implication:**
```
invokestatic/invokespecial:
  - No lookup needed
  - Fast (can be inlined)

invokevirtual:
  - Virtual method dispatch
  - JIT compiler optimizes (inlines if monomorphic)
  - Slow if many subtypes
```

---

### Question 7: Explain how javac handles control flow analysis

**Expected Answer:**

Javac performs **definite assignment analysis** to ensure:
1. Variables are assigned before use
2. No unreachable code
3. Final variables aren't reassigned

**Example 1: Uninitialized variable**
```java
void method() {
    int x;
    System.out.println(x);  // ERROR: variable x might not be initialized
}
```

**Example 2: Definite assignment through if**
```java
int x;
if (condition) {
    x = 1;
} else {
    x = 2;
}
System.out.println(x);  // OK: x is definitely assigned
```

**Example 3: Undefined path**
```java
int x;
if (condition) {
    x = 1;
}
System.out.println(x);  // ERROR: if condition is false, x not assigned
```

**Example 4: Unreachable code**
```java
void method() {
    return;
    System.out.println("never");  // ERROR: unreachable statement
}
```

**Control Flow Analysis Algorithm:**
```
For each variable, track 3 states:
- UNASSIGNED: never assigned on this path
- ASSIGNED: definitely assigned on all paths
- MAYBE_ASSIGNED: assigned on some paths

Track as code flows:
    UNASSIGNED
       ↓ (x = 1)
    ASSIGNED

Multiple paths:
    ASSIGNED (on path A)
    UNASSIGNED (on path B)
       ↓
    MAYBE_ASSIGNED (merge)
```

---

### Question 8: How does javac handle forward references in static initializers?

**Expected Answer:**

Static initializers can only access static fields **defined before** them:

```java
class Example {
    static int x = y;  // ERROR: cannot reference y before it is defined
    static int y;
}

class Good {
    static int y = 1;
    static int x = y;  // OK: y is defined first
}
```

**Why?**
- Static initializers execute in order
- Cannot reference field that hasn't been initialized yet
- Prevents use-before-definition bugs

**Instance initializers have same rule:**
```java
class Example {
    int x = y;  // ERROR: cannot reference y before it is defined
    int y;
}
```

**But can reference previous fields:**
```java
class Example {
    int x;
    int y = x;  // OK: x is already declared

    // But at runtime, y = 0 (x's default value)
}
```

---

### Question 9: Explain Java's strictfp modifier and its effect on compilation

**Expected Answer:**

`strictfp` (strict floating point) restricts floating point calculations to IEEE 754 for consistency across platforms:

```java
strictfp class Calculator {  // All methods strictly conforming
    // ...
}

class Calculator {
    strictfp void calculate() {  // Only this method strictly conforming
        // ...
    }
}
```

**Without strictfp:**
- JVM may use extended precision (80-bit on x86)
- Results differ slightly between platforms
- Performance might be better (fewer conversions)

**With strictfp:**
- Use standard IEEE 754 (64-bit doubles, 32-bit floats)
- Results identical on all platforms
- Slight performance penalty (rounding after each operation)

**Bytecode:**
```
ACC_STRICT flag set in class/method flags

javap shows: strictfp void calculate();
```

**Modern Java**: strictfp is less important (most code doesn't need it)

---

### Question 10: What information is available to annotation processors and what can they do?

**Expected Answer:**

Annotation processors receive access to:
1. **RoundEnvironment**: Information about elements being compiled
2. **Elements**: Utilities to analyze elements (classes, methods, fields)
3. **Types**: Utilities for type operations

**What processors can do:**
- **Generate source files**: New .java files for compilation
- **Generate resource files**: Configuration files, etc.
- **Print messages**: Warnings, errors, info
- **Cannot modify**: Existing source code

**Example:**
```java
public class MyProcessor extends AbstractProcessor {
    public boolean process(Set<? extends TypeElement> annotations,
                          RoundEnvironment roundEnv) {
        // Access annotations
        for (Element elem : roundEnv.getElementsAnnotatedWith(MyAnnotation.class)) {
            // elem is TypeElement, MethodElement, VariableElement, etc.
            String name = elem.getSimpleName().toString();
            
            // Generate new source
            JavaFileObject source = processingEnv.getFiler()
                .createSourceFile("Generated_" + name);
            Writer writer = source.openWriter();
            writer.write("// generated code");
            writer.close();
        }
        return true;  // Claim these annotations
    }
}
```

**Real-world Examples:**
- **Lombok**: Generates getters/setters/toString
- **JAXB**: Generates XML serialization code
- **Protocol Buffers**: Generates serialization code
- **Dagger**: Generates dependency injection code

---

## SUMMARY: SDE3 INTERVIEW PREPARATION CHECKLIST

### Must Know:

- ✅ Complete compilation pipeline (7 phases)
- ✅ Bytecode instructions (load, store, arithmetic, invocation, etc.)
- ✅ Type erasure and why it exists
- ✅ Bridge methods for generics
- ✅ How javac resolves overloads (phase 1: applicable, phase 2: specific)
- ✅ Constant pool and class file format
- ✅ Different invocation instructions (virtual vs static vs special)
- ✅ Control flow analysis (definite assignment)
- ✅ Forward reference restrictions
- ✅ Annotation processors and their capabilities

### Should Be Able To Explain:

- Converting any Java code to bytecode manually
- Reading bytecode with javap
- Understanding decompiler output
- Debugging compilation issues
- Performance implications of different compilation choices

### Advanced Topics (Great to Know):

- Module system compilation
- Incremental compilation algorithm
- Custom annotation processors
- Class loader interactions with compilation
- Compiler optimization phases

---

## FINAL WORDS

As an **SDE3**, you're expected to understand not just **how to use** Java, but **how Java works under the hood**. The compilation process is where code comes alive - understanding this deeply gives you superpowers:

1. **Write better code**: Know what bytecode you're generating
2. **Debug faster**: Decompile to bytecode to see actual behavior
3. **Optimize** : Understand micro-optimizations
4. **Design libraries**: Use annotation processors for less boilerplate
5. **Architect systems**: Design with compilation in mind

Master these concepts, and you'll ace any SDE3 Java compilation interview. 🚀

---

**Last Updated**: 2024
**Version**: 2.0 - SDE3 Edition
**Difficulty**: Intermediate → Advanced
