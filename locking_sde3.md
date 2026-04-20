# Pessimistic & Optimistic Locking — SDE3 Deep Dive

---

## 1. THE CORE MENTAL MODEL

Before any implementation detail — the philosophical difference:

| | Pessimistic Locking | Optimistic Locking |
|--|--------------------|--------------------|
| **Assumption** | Conflict is likely | Conflict is rare |
| **Strategy** | Prevent conflict before it happens | Detect conflict after it happens |
| **Cost paid** | Upfront — always pay lock cost | At commit time — pay only on conflict |
| **Best for** | High-contention workloads | Low-contention, read-heavy workloads |
| **Failure mode** | Deadlock, reduced throughput | Retry storms under high contention |

---

## 2. PESSIMISTIC LOCKING — COMPLETE DEPTH

### 2.1 What It Actually Does

Pessimistic locking acquires an exclusive or shared lock **before reading or writing** and holds it until the transaction completes. Other transactions attempting to access the same resource are blocked until the lock is released.

The OS/database enforces mutual exclusion at the resource level — the resource is literally unavailable to competing threads/transactions.

### 2.2 Lock Types (Granular Understanding)

```
Shared Lock (S-Lock / Read Lock)
├── Multiple readers can hold simultaneously
├── Writers are blocked until ALL readers release
└── SQL: SELECT ... FOR SHARE / LOCK IN SHARE MODE

Exclusive Lock (X-Lock / Write Lock)
├── Only ONE holder at a time
├── Blocks all other readers AND writers
└── SQL: SELECT ... FOR UPDATE

Intent Locks (InnoDB specific)
├── IS (Intent Shared) — signals intent to acquire S-lock on row
├── IX (Intent Exclusive) — signals intent to acquire X-lock on row
├── SIX (Shared + Intent Exclusive) — table read, some rows will be written
└── Purpose: Allow table-level checks without scanning all rows

Key-Range Locks (SQL Server)
├── Prevent phantom reads by locking index ranges
└── RangeS-S, RangeS-U, RangeI-N, RangeX-X variants
```

### 2.3 Lock Compatibility Matrix

```
          S-Lock    X-Lock
S-Lock  |  YES   |   NO   |
X-Lock  |   NO   |   NO   |
```

### 2.4 Deadlock — Deep Mechanics

Deadlock occurs when transaction T1 holds lock A and waits for B, while T2 holds lock B and waits for A.

```
T1: LOCK(A) → wait for LOCK(B)
T2: LOCK(B) → wait for LOCK(A)
         ↑_______DEADLOCK_________↑
```

**Deadlock Detection:**
- Databases maintain a "waits-for" directed graph
- Background thread periodically checks for cycles
- On cycle detection: victim selected (lowest cost transaction rolled back)
- MySQL InnoDB: runs detection on every lock request that creates a wait (expensive but fast detection)

**Deadlock Prevention Strategies:**

```
1. Lock Ordering — Always acquire locks in same global order
   BAD:
   T1: lock(accounts[A]), lock(accounts[B])
   T2: lock(accounts[B]), lock(accounts[A])  ← different order = deadlock risk
   
   GOOD:
   T1: lock(min(A,B)), lock(max(A,B))
   T2: lock(min(A,B)), lock(max(A,B))  ← same order = safe

2. Lock Timeout — Give up after N ms, retry
   SET innodb_lock_wait_timeout = 5;

3. Wound-Wait / Wait-Die Schemes
   Wait-Die:  older txn waits, younger txn dies (rolls back)
   Wound-Wait: older txn wounds (rolls back) younger, older waits
   Both are deadlock-free by construction (no cycles possible)
```

### 2.5 Pessimistic Locking Implementation Patterns

**Database Level:**
```sql
-- PostgreSQL / MySQL — row-level exclusive lock
BEGIN;
SELECT * FROM accounts 
WHERE id = 123 
FOR UPDATE;             -- other txns block here

UPDATE accounts 
SET balance = balance - 100 
WHERE id = 123;
COMMIT;

-- Skip locked rows (queue processing pattern)
SELECT * FROM jobs 
WHERE status = 'pending' 
LIMIT 1 
FOR UPDATE SKIP LOCKED;  -- don't block, skip already-locked rows

-- Nowait — fail immediately if lock unavailable
SELECT * FROM inventory 
WHERE product_id = 42 
FOR UPDATE NOWAIT;  -- throws error instead of blocking
```

**Application Level (Java):**
```java
// ReentrantLock — explicit pessimistic locking
private final ReentrantLock lock = new ReentrantLock();

public void transfer(Account from, Account to, BigDecimal amount) {
    // Lock ordering to prevent deadlock — lock by ID always
    Account first  = from.getId() < to.getId() ? from : to;
    Account second = from.getId() < to.getId() ? to : from;
    
    first.lock.lock();
    try {
        second.lock.lock();
        try {
            from.debit(amount);
            to.credit(amount);
        } finally {
            second.lock.unlock();
        }
    } finally {
        first.lock.unlock();
    }
}

// ReadWriteLock — allow concurrent reads, exclusive writes
private final ReadWriteLock rwLock = new ReentrantReadWriteLock();
private final Lock readLock  = rwLock.readLock();
private final Lock writeLock = rwLock.writeLock();

public Data read() {
    readLock.lock();
    try { return data; }
    finally { readLock.unlock(); }
}

public void write(Data newData) {
    writeLock.lock();
    try { this.data = newData; }
    finally { writeLock.unlock(); }
}
```

**Distributed Pessimistic Lock (Redis):**
```lua
-- SETNX-based distributed lock
-- SET key value NX PX milliseconds
-- NX: only set if not exists
-- PX: expiry in milliseconds (prevents deadlock if holder crashes)

SET lock:resource_123 <unique-token> NX PX 30000

-- Release ONLY if token matches (Lua script — atomic)
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
else
    return 0
end
```

```java
// Redisson (production-grade distributed lock)
RLock lock = redissonClient.getLock("lock:resource_123");
try {
    // Wait up to 10s to acquire, auto-release after 30s
    if (lock.tryLock(10, 30, TimeUnit.SECONDS)) {
        try {
            // Critical section
        } finally {
            lock.unlock();
        }
    }
} catch (InterruptedException e) {
    Thread.currentThread().interrupt();
}
```

### 2.6 Lock Granularity Trade-offs

```
Table Lock
├── Coarse — one lock for entire table
├── Low overhead (1 lock object)
├── Terrible concurrency — full table blocked
└── Use case: bulk operations, DDL

Page Lock
├── Locks a disk page (~8KB, multiple rows)
├── Medium granularity
└── SQL Server uses these

Row Lock
├── Fine — one lock per row
├── High overhead (many lock objects)
├── Best concurrency
└── Default in InnoDB, PostgreSQL

Column Lock
├── Rarely implemented at DB level
└── Application-level pattern only
```

**Locking overhead reality:**
- InnoDB row lock = ~96 bytes per lock in memory
- 1M locked rows = ~96MB just in lock metadata
- This is why lock escalation exists (SQL Server escalates row→table when lock count too high)

---

## 3. OPTIMISTIC LOCKING — COMPLETE DEPTH

### 3.1 What It Actually Does

Optimistic locking acquires **no lock** during read or processing. At commit time, it **checks whether the data changed** since it was read. If unchanged — commit succeeds. If changed — abort and retry.

The core mechanism: **version tracking** (version number, timestamp, or hash).

### 3.2 Version-Based Optimistic Locking

**Database Schema:**
```sql
CREATE TABLE products (
    id          BIGINT PRIMARY KEY,
    name        VARCHAR(255),
    price       DECIMAL(10,2),
    stock       INT,
    version     BIGINT DEFAULT 0,  -- The version column
    updated_at  TIMESTAMP
);
```

**The Read-Modify-Write Cycle:**
```sql
-- Step 1: Read (no lock)
SELECT id, price, stock, version 
FROM products 
WHERE id = 42;
-- Returns: id=42, price=99.99, stock=100, version=7

-- Step 2: Application modifies data (no lock held)
-- ... time passes, user makes decision ...

-- Step 3: Write with version check (atomic CAS)
UPDATE products 
SET    stock   = 99,          -- our new value
       version = version + 1  -- increment version
WHERE  id      = 42 
AND    version = 7;           -- ONLY update if still version 7

-- Check rows affected:
-- 1 row affected → SUCCESS (we were the only writer)
-- 0 rows affected → CONFLICT (someone else modified it)
```

**This UPDATE is atomic at the database level.** The WHERE clause acts as a Compare-And-Swap (CAS) operation.

### 3.3 Implementation Patterns

**JPA / Hibernate:**
```java
@Entity
public class Product {
    @Id
    private Long id;
    
    private String name;
    private BigDecimal price;
    private int stock;
    
    @Version  // Hibernate manages version automatically
    private Long version;
}

// Usage
@Transactional
public void decrementStock(Long productId) {
    Product product = em.find(Product.class, productId);
    // No lock acquired ↑
    
    product.setStock(product.getStock() - 1);
    // Hibernate issues:
    // UPDATE products SET stock=?, version=8 WHERE id=? AND version=7
    
    // If version mismatch: throws OptimisticLockException
}

// Retry wrapper
public void decrementStockWithRetry(Long productId, int maxRetries) {
    int attempts = 0;
    while (attempts < maxRetries) {
        try {
            decrementStock(productId);
            return;  // Success
        } catch (OptimisticLockException e) {
            attempts++;
            if (attempts >= maxRetries) throw e;
            Thread.sleep(backoff(attempts));  // Exponential backoff
        }
    }
}
```

**Without ORM (raw JDBC):**
```java
public boolean updateProduct(Connection conn, long id, 
                              int newStock, long expectedVersion) 
    throws SQLException {
    
    String sql = """
        UPDATE products 
        SET stock = ?, version = version + 1
        WHERE id = ? AND version = ?
    """;
    
    try (PreparedStatement ps = conn.prepareStatement(sql)) {
        ps.setInt(1, newStock);
        ps.setLong(2, id);
        ps.setLong(3, expectedVersion);
        
        int rowsAffected = ps.executeUpdate();
        return rowsAffected == 1;  // true = success, false = conflict
    }
}
```

**Application-Level (Redis):**
```lua
-- WATCH + MULTI/EXEC — Redis optimistic locking
WATCH balance:user:123
-- If balance:user:123 changes before EXEC → transaction aborted

MULTI
  DECRBY balance:user:123 100
EXEC
-- Returns nil if WATCH key was modified → retry
```

```python
def transfer_with_retry(redis, key, amount, max_retries=3):
    for attempt in range(max_retries):
        with redis.pipeline() as pipe:
            try:
                pipe.watch(key)
                balance = int(pipe.get(key))
                
                if balance < amount:
                    raise InsufficientFundsError()
                
                pipe.multi()
                pipe.decrby(key, amount)
                pipe.execute()  # Fails if key changed since WATCH
                return True
                
            except WatchError:
                if attempt == max_retries - 1:
                    raise
                time.sleep(2 ** attempt * 0.1)  # Exponential backoff
```

### 3.4 Timestamp-Based vs Version-Number Based

```
Version Number (Integer)
├── Monotonically increasing integer
├── Immune to clock skew
├── Precise — version N+1 means exactly one write after N
└── PREFERRED in most cases

Timestamp-Based
├── Uses updated_at timestamp
├── Problem: clock skew in distributed systems
├── Problem: two writes in same millisecond = same timestamp
├── Problem: NTP adjustments can go backward
└── AVOID unless you have no other option

Hash-Based (Etag pattern)
├── Hash of entire row content
├── Used in HTTP ETags (optimistic HTTP concurrency)
├── No separate version column needed
└── More expensive to compute
```

**HTTP ETag (optimistic locking in REST APIs):**
```http
-- GET returns ETag
GET /api/products/42
Response:
  ETag: "a8f3bc92"
  { "id": 42, "stock": 100 }

-- PUT includes ETag in If-Match
PUT /api/products/42
If-Match: "a8f3bc92"
{ "stock": 99 }

-- Server checks: does current ETag match?
-- Match    → 200 OK, update applied, new ETag returned
-- Mismatch → 412 Precondition Failed, client must retry
```

### 3.5 Retry Strategy — Critical For Production

**Naive retry (WRONG):**
```java
while (true) {
    try {
        update();
        break;
    } catch (OptimisticLockException e) {
        // Retry immediately — causes retry storm
    }
}
```

**Production retry with exponential backoff + jitter:**
```java
public <T> T withOptimisticRetry(Supplier<T> operation) {
    int maxAttempts = 5;
    long baseDelayMs = 50;
    
    for (int attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return operation.get();
        } catch (OptimisticLockException e) {
            if (attempt == maxAttempts) {
                throw new MaxRetriesExceededException(e);
            }
            
            // Exponential backoff: 50ms, 100ms, 200ms, 400ms
            long delay = baseDelayMs * (1L << (attempt - 1));
            
            // Jitter: randomize ±25% to prevent synchronized retries
            long jitter = (long)(delay * 0.25 * (Math.random() * 2 - 1));
            
            try {
                Thread.sleep(delay + jitter);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                throw new RuntimeException(ie);
            }
        }
    }
    throw new IllegalStateException("Unreachable");
}
```

**Retry storm problem:**
```
Without jitter:
t=0:   1000 threads conflict
t=50:  1000 threads retry simultaneously → conflict again
t=100: 1000 threads retry simultaneously → conflict again
Result: Thundering herd, system thrashes

With jitter:
t=0:   1000 threads conflict
t=37-63: Threads retry spread across 26ms window
Result: Much lower contention, most succeed
```

---

## 4. DEEP COMPARISON — WHEN TO USE WHAT

### 4.1 Contention Level Analysis

```
Low Contention (most reads, rare conflict):
→ Optimistic wins
→ Pessimistic wastes resources locking things that never conflict
→ Example: user profile updates, product catalog edits

High Contention (many writers, same rows):
→ Pessimistic wins above a threshold
→ Optimistic causes retry storms
→ Example: inventory decrement during flash sale, 
           bank account balance, ticket booking

The crossover point (empirical rule):
→ If conflict rate > 20-30%, pessimistic becomes more efficient
→ Below that threshold, optimistic typically wins
```

### 4.2 Operation Duration Analysis

```
Short operations (< 1ms):
→ Either works
→ Lock hold time is negligible

Long operations (user thinks, then submits):
→ NEVER pessimistic at DB level
→ You cannot hold a DB lock while user is thinking (seconds-minutes)
→ Use optimistic — version captured on load, checked on submit
→ Example: edit form loaded at t=0, submitted at t=30s
           Pessimistic would lock row for 30s → catastrophic
           Optimistic reads version at load, checks at submit → correct
```

### 4.3 The Lost Update Problem — Both Solve Differently

```
Scenario:
T1 reads balance = 1000
T2 reads balance = 1000
T1 writes balance = 900  (deducted 100)
T2 writes balance = 800  (deducted 200)
Result: balance = 800, but should be 700 → LOST UPDATE

Pessimistic solution:
T1 SELECT FOR UPDATE (acquires lock)
T2 SELECT FOR UPDATE (BLOCKS)
T1 writes 900, commits, releases lock
T2 unblocks, reads 900, writes 700, commits
Result: 700 ✓

Optimistic solution:
T1 reads balance=1000, version=5
T2 reads balance=1000, version=5
T1 UPDATE WHERE version=5 → sets balance=900, version=6 → SUCCESS (1 row)
T2 UPDATE WHERE version=5 → 0 rows affected → CONFLICT → retry
T2 retries: reads balance=900, version=6
T2 UPDATE WHERE version=6 → sets balance=700, version=7 → SUCCESS
Result: 700 ✓
```

### 4.4 Distributed Systems Consideration

```
Single Database:
→ DB handles pessimistic locking natively (well-understood)
→ Optimistic also straightforward with version column

Microservices / Distributed:
→ Pessimistic across services requires distributed lock (Redis, Zookeeper)
→ Distributed locks are complex (network partition handling, lock expiry)
→ Optimistic is often better — saga pattern with compensating transactions
→ Event sourcing naturally provides optimistic behavior (append-only, version = event sequence)
```

---

## 5. ADVANCED PATTERNS — SDE3 TERRITORY

### 5.1 Hybrid Locking

Real systems often combine both:

```java
// Outer: Optimistic (no lock on read)
// Inner: Pessimistic (lock only when conflict detected)

@Transactional
public void processOrder(long orderId) {
    Order order = orderRepo.findById(orderId);  // No lock
    
    if (order.needsInventoryCheck()) {
        // Only lock inventory rows, not the order
        Inventory inv = inventoryRepo.findByProductForUpdate(
            order.getProductId()  // SELECT FOR UPDATE here only
        );
        inv.decrement(order.getQuantity());
    }
    
    // Order update still optimistic
    order.setStatus(PROCESSING);
    orderRepo.save(order);  // Throws OptimisticLockException if concurrent update
}
```

### 5.2 MVCC — How Modern Databases Avoid Most Locking

Multi-Version Concurrency Control (PostgreSQL, InnoDB) — the mechanism that makes optimistic locking efficient:

```
Traditional locking: one version of data, readers block writers
MVCC: multiple versions exist simultaneously, readers never block writers

PostgreSQL implementation:
Each row has:
- xmin: transaction ID that created this version
- xmax: transaction ID that deleted/updated this version (0 if current)

Reader sees row version where:
- xmin committed before reader's snapshot
- xmax is 0 OR committed after reader's snapshot

This means:
- Readers always see a consistent snapshot (no locks needed)
- Writers create new versions (don't overwrite, don't block readers)
- Vacuum process cleans up old versions

Result: SELECT never blocks on INSERT/UPDATE/DELETE
        INSERT/UPDATE/DELETE never blocks on SELECT
        Only write-write conflicts need locking
```

### 5.3 SELECT FOR UPDATE SKIP LOCKED — Queue Pattern

```sql
-- Perfect for job queues — no deadlocks, high throughput
-- Multiple workers can process different jobs simultaneously

-- Worker process:
BEGIN;
SELECT id, payload 
FROM   jobs 
WHERE  status = 'pending'
ORDER  BY created_at
LIMIT  1
FOR UPDATE SKIP LOCKED;  -- Skip any row another worker locked

-- Process the job...
UPDATE jobs SET status = 'done' WHERE id = ?;
COMMIT;

-- This pattern:
-- ✓ No deadlocks (SKIP LOCKED never waits)
-- ✓ No double processing (FOR UPDATE ensures exclusivity)  
-- ✓ High throughput (workers truly parallel)
-- ✓ Fair (ORDER BY created_at = FIFO queue)
```

### 5.4 Optimistic Locking At Scale — Sharding Consideration

```
Problem: Version-based optimistic locking works perfectly for single-row updates.
         What about operations spanning multiple rows/shards?

Scenario: Transfer $100 from Account A (shard 1) to Account B (shard 2)

Option 1: Two-Phase Commit (2PC)
- Phase 1: Both shards prepare (acquire locks)
- Phase 2: Both shards commit (or rollback)
- Problem: Coordinator failure leaves locks held → blocking

Option 2: Saga Pattern (optimistic distributed)
- Step 1: Debit A (optimistic, version check)
- Step 2: Credit B (optimistic, version check)
- If Step 2 fails: Compensating transaction (re-credit A)
- No distributed locks, no blocking
- Problem: Temporarily inconsistent (A debited but B not yet credited)
- Solution: Eventual consistency is acceptable in most real scenarios

Option 3: Event Sourcing
- Append debit event to A's log
- Append credit event to B's log
- Version = position in event log
- Replay events to reconstruct state
- Naturally optimistic, naturally auditable
```

### 5.5 CAS (Compare-And-Swap) — The Atomic Foundation

Optimistic locking's implementation at CPU level:

```java
// Java AtomicInteger — hardware CAS instruction
AtomicInteger counter = new AtomicInteger(0);

// compareAndSet is a single atomic CPU instruction (LOCK CMPXCHG on x86)
boolean success = counter.compareAndSet(
    expectedValue,  // Read value we based decision on
    newValue        // Value to set if still matches expected
);

// Implementation of AtomicInteger.incrementAndGet():
public final int incrementAndGet() {
    return unsafe.getAndAddInt(this, valueOffset, 1) + 1;
    // Single hardware instruction — no OS lock needed
}

// Manual CAS loop (what databases do conceptually):
public int increment(AtomicInteger value) {
    int current, next;
    do {
        current = value.get();       // Read
        next = current + 1;          // Compute new value
    } while (!value.compareAndSet(current, next));  // Atomic CAS
    return next;
}
// ABA Problem: value goes A→B→A between our read and CAS
// CAS succeeds but we missed intermediate changes
// Solution: AtomicStampedReference (version number attached to reference)
```

### 5.6 ABA Problem — Advanced Trap

```
ABA Problem in detail:

T1 reads value = A (version ignored)
T2 changes A → B
T2 changes B → A
T1 CAS: current=A, expected=A → SUCCESS (but missed A→B→A transition)

Example impact:
Lock-free stack:
T1 reads head → Node(A) → Node(B)
T2 pops A, pops B, pushes A back
Stack is now: Node(A) (B is freed memory)
T1 CAS succeeds: sets head to Node(B) → DANGLING POINTER 💥

Solution: AtomicStampedReference in Java
AtomicStampedReference<Node> head = new AtomicStampedReference<>(node, 0);

int[] stampHolder = new int[1];
Node current = head.get(stampHolder);  // Gets value AND stamp
int currentStamp = stampHolder[0];

head.compareAndSet(
    current,           // Expected reference
    newNode,           // New reference
    currentStamp,      // Expected stamp (version)
    currentStamp + 1   // New stamp
);
// Now A→B→A fails because stamp changed: 0→1→2, not still 0
```

---

## 6. REAL-WORLD SCENARIOS — INTERVIEW-READY

### Scenario 1: Flash Sale Inventory
```
10,000 concurrent users trying to buy last item

Naive optimistic approach:
→ All 10,000 read stock=1, version=42
→ All 10,000 try to UPDATE WHERE version=42
→ 1 succeeds, 9,999 get conflict, retry
→ 9,999 retry: all see stock=0 (or throw out-of-stock)
→ Actually fine! Most abort immediately on seeing stock=0

With pessimistic SELECT FOR UPDATE:
→ 10,000 queue on the row lock
→ 1 processes, 9,999 wait then see stock=0
→ Higher latency but same result

Better solution: Redis atomic DECR (single-threaded)
→ DECR inventory:product:42
→ Returns new value atomically
→ If < 0: INCR back (compensate) + reject
→ No locking needed at all — Redis single-threaded model
→ Reserve in Redis, confirm asynchronously in DB
```

### Scenario 2: Distributed Configuration Update
```
Multiple service instances reading and writing shared config

Option: Optimistic with version stored in ZooKeeper/etcd
- etcd has built-in optimistic locking via ModRevision
- Read: GET /config/feature-flags (returns value + ModRevision=47)
- Write: PUT /config/feature-flags IF ModRevision == 47 (atomic CAS)
- Other writers: their ModRevision=47 check fails → conflict → retry

etcd Go client:
txn := client.Txn(ctx).
    If(clientv3.Compare(clientv3.ModRevision("key"), "=", 47)).
    Then(clientv3.OpPut("key", newValue)).
    Else(clientv3.OpGet("key"))
resp, _ := txn.Commit()
if !resp.Succeeded { /* conflict — retry with new revision */ }
```

### Scenario 3: Collaborative Document Editing
```
Google Docs-style concurrent editing

Pessimistic: impossible (users type simultaneously)
Optimistic: naive version approach fails (every keystroke conflicts)

Real solution: Operational Transformation (OT) or CRDT
- OT: Transform operations relative to each other
  T1: Insert "Hello" at position 0
  T2: Insert "World" at position 0
  After transform: T2 becomes Insert "World" at position 5
  Result: "HelloWorld" regardless of order applied

- CRDT (Conflict-free Replicated Data Type):
  Operations designed to be commutative and idempotent
  No coordination needed — merge always produces consistent result
  Yjs, Automerge libraries implement this

This is beyond optimistic/pessimistic — conflict-free by design
```

---

## 7. INTERVIEW PATTERNS — WHAT INTERVIEWERS ACTUALLY ASK

### Pattern 1: "How do you handle concurrent writes?"
```
Strong answer structure:
1. Clarify contention level (high vs low conflict rate)
2. Clarify operation duration (milliseconds vs user-interaction time)
3. Clarify distribution (single DB vs microservices)
4. Choose based on answers:
   - Low contention, single DB → optimistic (version column)
   - High contention, short ops → pessimistic (SELECT FOR UPDATE)
   - Long user-facing ops → always optimistic
   - Distributed → saga/event sourcing/CRDTs
```

### Pattern 2: "What happens if your optimistic lock keeps failing?"
```
Strong answer:
1. Retry with exponential backoff + jitter (prevent retry storm)
2. Set max retry limit (return error, don't infinite loop)
3. If persistent failure → consider whether optimistic is right choice
4. Circuit breaker pattern to prevent cascade retry storms
5. Monitor conflict rate — if > 30%, evaluate switching to pessimistic
```

### Pattern 3: "How do you prevent deadlocks?"
```
Strong answer:
1. Lock ordering — always acquire in consistent global order
2. Lock timeout — don't wait indefinitely
3. Keep transactions short — minimize lock hold time
4. Use SELECT FOR UPDATE SKIP LOCKED for queue patterns
5. Application-level: detect and retry (rather than prevent)
6. Architecture-level: avoid distributed locks when possible
```

### Pattern 4: "Design a ticket booking system"
```
The trick: two problems require different approaches

Problem 1: Seat reservation (high contention, show-specific seat)
→ Pessimistic: SELECT FOR UPDATE on specific seat row
→ Or: Optimistic with status CAS (available→reserved)
→ Or: Redis SETNX per seat (atomic, fast, temporary hold)

Problem 2: Payment processing (user-specific, low contention)
→ Optimistic: version on booking record

Combined:
1. Redis SETNX lock:seat:A23 userToken EX 300  (5 min hold)
2. If acquired → proceed to payment
3. Payment success → UPDATE seats SET status='sold', version=?
   WHERE id=? AND status='reserved' AND version=?
4. Payment timeout → Redis key expires → seat available again
```

---

## 8. PERFORMANCE BENCHMARKS — REAL NUMBERS

```
PostgreSQL row lock overhead:
- SELECT FOR UPDATE: +0.1-0.5ms vs plain SELECT
- Under contention: wait time = p99 of critical section

Optimistic retry cost:
- No conflict: same as plain SELECT + UPDATE
- 1 conflict: 2x SELECT + 2x UPDATE + backoff time
- N conflicts: (N+1)x operations

Rule of thumb:
- Conflict rate 0%:   Optimistic = 100% efficiency
- Conflict rate 10%:  Optimistic = ~90% efficiency  
- Conflict rate 30%:  Optimistic ≈ Pessimistic
- Conflict rate 50%:  Pessimistic wins significantly
- Conflict rate 90%:  Consider single-threaded queue (Redis, Kafka)

Lock escalation threshold (SQL Server):
- > 5000 row locks on single table → escalates to table lock
- InnoDB: no automatic escalation, but > 1M locks = memory pressure
```

---

## 9. QUICK REFERENCE CHEAT SHEET

```
PESSIMISTIC                          OPTIMISTIC
─────────────────────────────────    ────────────────────────────────────
Lock BEFORE read                     No lock on read
Block competitors                    Detect conflict at commit
Good: high contention                Good: low contention
Good: short transactions             Good: long user-facing operations
Bad: deadlock risk                   Bad: retry storm risk
Bad: poor throughput under load      Bad: wasted work on conflict
SQL: SELECT FOR UPDATE               SQL: UPDATE WHERE version=N
Java: synchronized/ReentrantLock     Java: @Version / AtomicReference
Redis: SET NX EX (distributed)       Redis: WATCH/MULTI/EXEC
Failure: blocking / deadlock         Failure: OptimisticLockException
Recovery: timeout + retry            Recovery: backoff + retry
```

---

## 10. COMMON MISTAKES (SDE3 MUST AVOID)

```
1. Holding pessimistic lock across network call
   BAD: lock(row) → call external API → unlock(row)
   FIX: unlock before network call, use optimistic for cross-service

2. Optimistic retry without backoff
   BAD: while(conflict) { retry immediately; }
   FIX: exponential backoff + jitter + max attempts

3. Optimistic on high-contention without monitoring
   BAD: assume low contention without metrics
   FIX: track OptimisticLockException rate, alert if > threshold

4. Distributed pessimistic lock without TTL
   BAD: SET lock:key token NX  (no expiry)
   FIX: SET lock:key token NX PX 30000  (always set TTL)

5. Releasing distributed lock without ownership check
   BAD: DEL lock:key  (deletes any holder's lock)
   FIX: Lua script — GET, check token matches, then DEL (atomic)

6. ABA problem in lock-free code
   BAD: AtomicReference CAS without version
   FIX: AtomicStampedReference or AtomicMarkableReference

7. Optimistic locking on collections / joins
   BAD: version on parent only while child rows change freely
   FIX: version bump on parent when children change, or version per child

8. Not handling OptimisticLockException in @Transactional
   BAD: let it bubble up as 500 error
   FIX: catch, retry or return 409 Conflict to client
```

---

*SDE3 Locking Reference — covers pessimistic, optimistic, distributed, MVCC, CAS, ABA, and real-world patterns*
