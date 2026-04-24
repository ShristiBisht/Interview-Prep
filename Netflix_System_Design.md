# Netflix System Design: Complete Architecture Breakdown

## Table of Contents
1. [Executive Overview](#executive-overview)
2. [System Architecture](#system-architecture)
3. [Core Components Deep Dive](#core-components-deep-dive)
4. [Data Flow & Request Lifecycle](#data-flow--request-lifecycle)
5. [Scalability & Performance](#scalability--performance)
6. [Fault Tolerance & Resilience](#fault-tolerance--resilience)
7. [Database Strategy](#database-strategy)
8. [Real-time Features](#real-time-features)
9. [Interview Talking Points](#interview-talking-points)

---

## Executive Overview

Netflix streams to **250+ million subscribers** globally, serving **500 million+ hours watched daily**. This scale requires a system that is:

- **Globally Distributed**: Low latency for users across continents
- **Highly Available**: 99.99%+ uptime (11.5 minutes downtime per year)
- **Resilient**: Graceful degradation under failures
- **Cost-Optimized**: Operating at minimal infrastructure cost per stream
- **Fast Iteration**: Push new features every day without downtime

### Why This Architecture Matters

Netflix's system design reflects **fundamental tradeoffs** in distributed systems:
- **Consistency vs. Availability**: Using eventual consistency (CAP theorem)
- **Monolith vs. Microservices**: Shifted from monolith to 600+ microservices
- **Centralized vs. Decentralized**: Hybrid approach with dedicated regional cores

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Devices                                │
│           (Web, iOS, Android, Smart TV, Gaming Consoles)           │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   CDN Edge  │ (CloudFlare, Akamai)
                    │   Caching   │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
    ┌───▼────┐      ┌──────▼──────┐    ┌─────▼────┐
    │API GW  │      │ API Gateway │    │ Metadata │
    │ (LB)   │      │ (Zuul)      │    │  Server  │
    └───┬────┘      └──────┬──────┘    └─────┬────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
┌───▼──────┐        ┌──────▼──────┐       ┌──────▼──────┐
│Playback  │        │Personalization        │Content      │
│Service   │        │Recommendation Service │Management   │
│          │        │                       │             │
└───┬──────┘        └──────┬──────┘       └──────┬───────┘
    │                      │                      │
    └──────────────────────┼──────────────────────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
┌───▼──────┐        ┌──────▼──────┐       ┌──────▼──────┐
│Cassandra │        │ Elasticsearch        │ Redis       │
│(State)   │        │ (Search/Analytics)   │ (Cache)     │
└──────────┘        └──────────────┘       └─────────────┘
    │                      │                      │
    └──────────────────────┼──────────────────────┘
                           │
                    ┌──────▼──────┐
                    │ AWS/Cloud   │
                    │  Data Lake  │
                    │  (S3, HDFS) │
                    └─────────────┘
```

### Three-Tier Architecture

```
TIER 1: CLIENT LAYER
├─ Web Browser (JavaScript)
├─ iOS App (Swift)
├─ Android App (Kotlin)
├─ Smart TV Apps
└─ Gaming Consoles

TIER 2: API & SERVICES LAYER
├─ CDN Edge (Caching layer)
├─ API Gateway (Zuul, Kong)
├─ Microservices
│  ├─ Playback Service
│  ├─ Metadata Service
│  ├─ Recommendation Service
│  ├─ User Service
│  ├─ Subscription Service
│  └─ Content Management Service
└─ Authentication/Authorization (OAuth2)

TIER 3: DATA LAYER
├─ Databases
│  ├─ Cassandra (Distributed, always-on)
│  ├─ MySQL (Transactional)
│  └─ DynamoDB (Serverless)
├─ Cache Layer
│  ├─ Redis (Session, hot data)
│  └─ Memcached (Distributed cache)
├─ Search & Analytics
│  ├─ Elasticsearch (Full-text search)
│  ├─ Splunk (Logging)
│  └─ Data Pipeline (Kafka, Spark)
└─ Storage
   ├─ S3 (Video assets, backups)
   └─ CDN Origin (Master content)
```

---

## Core Components Deep Dive

### 1. **Content Delivery Network (CDN)**

#### Purpose
Netflix doesn't stream video from a single data center. Instead, it uses **Open Connect**, Netflix's custom CDN.

#### Architecture

```
Netflix Open Connect Components:
├─ Netflix-owned ISP partnerships
├─ Regional cache servers
├─ Edge locations (in-ISP deployments)
└─ Real-time analytics for cache optimization
```

#### How It Works

1. **Content Placement**: Netflix analyzes viewing patterns per region
2. **Smart Caching**: Popular shows cached at edge locations
3. **Lazy Caching**: Unpopular content cached on-demand
4. **Fallback Hierarchy**: 
   - ISP Edge Cache → Regional Cache → Netflix Origin → Cloud

#### Key Decisions
- **Why custom CDN?** Control + Cost optimization
- **Why not just Akamai?** Netflix streams 30% of internet traffic; scale justified custom solution
- **Regional Awareness**: Different regions need different content

#### Interview Question
> "How would you handle cache invalidation when a title is removed or updated?"

**Answer Framework:**
- Event-driven invalidation: When metadata updates, publish event
- TTL-based: Content cached for X hours, then refreshed
- Explicit purge: Admin commands to ISP partners
- Versioning: Use content hashes to detect stale data

---

### 2. **API Gateway & Load Balancing**

#### Role
Sits between clients and microservices. Routes millions of requests/second.

```
Request Flow:
Client Request 
    ↓
[1] Load Balancer (AWS ELB/ALB)
    ↓
[2] API Gateway (Zuul)
    ├─ Rate Limiting
    ├─ Request Authentication
    ├─ Request Routing
    └─ Response Filtering
    ↓
[3] Microservices
    ↓
Response
```

#### Netflix's Zuul Gateway Features

```yaml
Features:
  Authentication:
    - OAuth2 token validation
    - Device token verification
    - Geo-blocking rules
  
  Rate Limiting:
    - Per-user rate limits
    - Per-device rate limits
    - Adaptive rate limiting (based on load)
  
  Routing:
    - A/B testing routing
    - Canary deployments
    - Shadow traffic (mirror requests)
  
  Resilience:
    - Circuit breaker pattern
    - Bulkhead isolation
    - Timeout enforcement
```

#### Key Design Decisions

**Why not put business logic in gateway?**
- Keep gateway lightweight (single responsibility)
- Business logic lives in microservices
- Gateway does: auth, routing, rate limiting only

**How to scale API Gateway?**
- Stateless design (multiple instances)
- Each instance can serve requests independently
- Load balancer distributes traffic
- Horizontal scaling: Add instances as needed

---

### 3. **Microservices Architecture**

Netflix operates **600+ microservices**. Key ones:

#### A. Playback Service
**Responsibility**: Manage video playback, streaming, quality adjustment

```
Playback Service Internals:
├─ Manifest Generation
│  └─ Creates DASH/HLS manifest (which streams, bitrates)
├─ Bitrate Selection (ABR - Adaptive Bitrate)
│  ├─ Monitor bandwidth
│  ├─ Measure latency
│  └─ Select appropriate quality
├─ Session Management
│  ├─ Track watched duration
│  ├─ Store resume point
│  └─ Sync across devices
└─ Error Handling
   ├─ Retry logic
   ├─ Fallback mechanisms
   └─ Quality degradation

Data Flow for a Play Request:
1. User clicks "Play"
2. Send PlaybackInitRequest
3. Validate subscription (Subscription Service)
4. Get streaming URLs (Content Service)
5. Allocate server capacity (Playback Service)
6. Generate manifest (DASH/HLS)
7. Return manifest to client
8. Client downloads video chunks from CDN
9. Playback Service tracks progress
10. On stop, save resume point to Cassandra
```

**Adaptive Bitrate (ABR) Algorithm**
```
Every 3-5 seconds:
  current_bandwidth = measure_last_chunk_download_speed()
  buffer_level = client_buffer.remaining_seconds()
  
  if buffer_level < 10s:
    quality = reduce_bitrate(current_quality)
  elif buffer_level > 30s AND current_bandwidth > next_quality_bitrate:
    quality = increase_bitrate(current_quality)
  else:
    quality = maintain_current_quality()
  
  return quality
```

#### B. Recommendation Service
**Responsibility**: Personalized recommendations based on viewing history

```
ML Pipeline:
User Behavior Data (Kafka) 
    ↓
Stream Processing (Spark/Flink)
    ├─ Real-time feature computation
    ├─ Watch history analysis
    └─ Engagement metrics
    ↓
ML Models (TensorFlow)
    ├─ Collaborative Filtering
    ├─ Content-Based Filtering
    ├─ Contextual Bandits
    └─ Ranking Models
    ↓
Cache in Redis
    ├─ Pre-computed recommendations
    ├─ Personalized rankings
    └─ Updated hourly/daily
    ↓
Recommendation Service API
    └─ Returns top-N titles for user
```

**Why separate service?**
- Can scale independently
- Recommendation updates don't impact playback
- Different technology stack (ML frameworks)
- Can A/B test new recommendation models

#### C. Metadata Service
**Responsibility**: Movie/show information (title, plot, cast, genres, images)

```
Metadata Service Characteristics:
├─ High Read Volume (millions/sec)
├─ Low Write Volume (updated by content team)
├─ Always-on requirement
└─ Global distribution needed

Solution:
├─ Cassandra (Primary Store)
│  └─ Distributed, no single point of failure
├─ Redis (Hot Cache)
│  └─ Cache popular titles
└─ CDN (Edge Cache)
   └─ Cache images/artwork globally
```

---

### 4. **Database Strategy**

Netflix uses **polyglot persistence**: different databases for different needs.

#### A. Apache Cassandra
**Why Cassandra?**
- Distributed, no single point of failure
- Always writable (AP in CAP theorem)
- Horizontal scaling
- Handles massive write volume

**Use Cases at Netflix**
- User viewing history
- Resume points (watch where you left off)
- Session state
- Playback events

```
Cassandra Cluster Architecture:
┌─────────────────────────────────────────────┐
│         Netflix Cassandra Ring              │
├─────────────────────────────────────────────┤
│ Multiple clusters across regions            │
│                                             │
│  US-East Cluster                            │
│  ├─ Node 1 (Token: 0-50)                   │
│  ├─ Node 2 (Token: 51-100)                 │
│  └─ Node 3 (Token: 101-150)                │
│                                             │
│  EU-West Cluster (Read Replica)            │
│  ├─ Node 1 (Mirror of US)                  │
│  └─ Node 2 (Mirror of US)                  │
│                                             │
│  APAC Cluster (Independent)                │
│  └─ Replicas per region                    │
└─────────────────────────────────────────────┘
```

**Key Cassandra Concepts Used**
```
Partitioning Strategy:
  Partition Key: user_id
  Clustering Key: timestamp DESC
  
  Result: All user events sorted by time
  
Write Consistency: ONE (speed) or QUORUM (safety)
Read Consistency: ONE (speed)
Replication Factor: RF=3 (3 copies minimum)

Query Example:
SELECT * FROM user_events 
WHERE user_id = 'user123' 
ORDER BY timestamp DESC 
LIMIT 100;
```

#### B. MySQL
**Use Cases**
- Subscription data (billing, plan info)
- User accounts
- Content catalog
- ACID transactions required

```
MySQL Topology:
┌──────────────────────────────────┐
│    Primary (Write Master)        │
│  Read/Write Traffic              │
└──────────────┬───────────────────┘
               │ Binary Log
       ┌───────┴────────┐
       │                │
   ┌───▼────┐      ┌───▼────┐
   │ Replica│      │ Replica│
   │(Read-1)│      │(Read-2)│
   └────────┘      └────────┘

Scaling strategy: Read replicas for high-volume queries
```

#### C. DynamoDB/Other NoSQL
**Use Cases**
- Serverless applications
- Temporary data
- Session storage
- User preferences

---

### 5. **Caching Layer**

Netflix implements **multi-layer caching**:

```
Cache Hierarchy (Top to Bottom):

[1] Browser Cache (Client-side)
    ├─ Static assets (JS, CSS)
    ├─ TTL: Days/weeks
    └─ Reduces API calls

[2] CDN Cache (Edge)
    ├─ API responses
    ├─ Images/artwork
    └─ TTL: Hours/days

[3] Application Cache (Redis)
    ├─ Session data
    ├─ User recommendations
    ├─ Frequently accessed metadata
    └─ TTL: Minutes/hours

[4] Database Cache (Memcached)
    ├─ Database query results
    ├─ Transient data
    └─ TTL: Seconds/minutes

[5] Database (Cassandra/MySQL)
    └─ Source of truth
```

#### Cache Invalidation Strategy

```
Pattern 1: TTL-based
  Set cache with expiration time
  After X seconds, data expires
  Client fetches fresh data on next request

Pattern 2: Event-driven
  When data changes, publish event
  Cache service listens to events
  Immediately invalidates relevant cache
  Example: Title metadata updated → purge cache entry

Pattern 3: Broadcast invalidation
  Publish invalidation message to all cache nodes
  All nodes delete the key
  Used for critical updates (security, licensing)

Pattern 4: Version-based
  Include version in cache key
  When data updates, bump version
  Old versions eventually expire
  New version is fresh
```

**Real Example: Resume Point Cache**
```
When user stops watching:
1. Update to Cassandra (source of truth)
2. Publish event "PlaybackStopped"
3. Redis listener invalidates cache key: resume_point:{user_id}:{title_id}
4. CDN edge cache also invalidated via event
5. Next time user opens app, cache miss → fetch from DB → cache again

This ensures: Eventual consistency, minimal latency, guaranteed correctness
```

---

## Data Flow & Request Lifecycle

### Complete User Journey: Browse → Watch → Resume

```
PHASE 1: BROWSE (User Opens Netflix)
──────────────────────────────────────

1. Client sends request: GET /api/home
   
2. API Gateway (Zuul)
   ├─ Authenticate user (verify token)
   ├─ Rate limit check
   ├─ Route to Homepage Service
   └─ Timeout: 5 seconds

3. Homepage Service
   ├─ Get user ID from token
   ├─ Fetch watched titles (check cache → Cassandra)
   ├─ Call Recommendation Service
   │  └─ Get top 30 recommendations (from cache)
   ├─ Fetch Metadata (titles, posters, descriptions)
   │  └─ Cache hit from Redis (popular titles)
   └─ Compile response

4. Response returned to client
   ├─ Homepage data (3 KB)
   ├─ Image URLs (from CDN)
   └─ Total latency: 200-300ms

5. Client renders UI
   ├─ Lazy load images from CDN
   ├─ CDN serves from nearest edge location
   └─ Browser caches images


PHASE 2: PLAY (User Clicks Play)
──────────────────────────────────

1. Client sends: POST /api/playback/start
   ├─ Title ID
   ├─ Device info
   └─ Current timestamp

2. API Gateway
   └─ Route to Playback Service

3. Playback Service
   ├─ Validate subscription
   │  └─ Call Subscription Service (cached)
   ├─ Check licensing (is this title available in user's region?)
   │  └─ Call Content Service
   ├─ Allocate streaming session
   ├─ Generate DASH/HLS manifest
   │  ├─ Available bitrates: 480p, 720p, 1080p, 4K
   │  ├─ Include encryption keys
   │  └─ Include CDN URLs for each bitrate
   └─ Return manifest

4. Client receives manifest
   ├─ Parser reads available streams
   ├─ Determine optimal bitrate (ABR)
   ├─ Request video chunks from CDN
   │  └─ CDN serves from cache (pre-cached popular content)
   │  └─ If miss, fetch from origin
   └─ Start playback

5. Parallel: Telemetry
   ├─ Send PlaybackStarted event
   │  └─ To Kafka (event stream)
   └─ Service tracks active sessions


PHASE 3: WATCH (During Playback)
─────────────────────────────────

Every 3-5 seconds:
1. Client measures download speed
2. Calculates buffer level
3. Adjusts bitrate (ABR algorithm)
4. Fetches next chunk at new bitrate

Every 30 seconds:
1. Client sends heartbeat
   └─ Current watch time
   └─ Current bitrate
   └─ Buffer health
   └─ Any errors

Events logged to Kafka:
├─ Video chunk downloaded (timing, size)
├─ Bitrate changed (reason, old bitrate, new bitrate)
├─ Buffering event (buffer underrun)
└─ Error events (if any)


PHASE 4: STOP (User Stops Watching)
────────────────────────────────────

1. Client sends: POST /api/playback/stop
   ├─ Watch time: 23:45 (stopped at 23:45)
   └─ Total duration: 50:00

2. Playback Service
   ├─ Update resume point in Cassandra
   ├─ Close streaming session
   ├─ Send final telemetry to Kafka
   └─ Return confirmation

3. Async processing (via Spark/Flink)
   ├─ Update user profile (newly watched title)
   ├─ Update recommendation models (new data point)
   ├─ Store analytics (watch time, bitrate stats)
   └─ Update user engagement score

4. Next session (resume)
   └─ Check resume point in cache → instant resume at 23:45
```

---

## Scalability & Performance

### Handling 500 Million Hours Watched Daily

#### Request Volume Calculations
```
500 million hours watched daily
= 500M hours × 3600 seconds
= 1.8 trillion seconds watched

If average session = 1.5 hours:
= 333 million sessions per day
= ~3,850 sessions per second (peak: 10,000+ sessions/sec)

Each session generates:
- 1 play request
- 1 stop request
- ~120 heartbeats (every 30 seconds)
- ~1000 telemetry events (ABR changes, buffer events, etc.)

Total daily events: ~1.8 billion events
Ingestion rate: ~20,000 events/second
```

#### Scaling Strategies

**1. Horizontal Scaling**
```
Database Sharding:
  
  Before: One MySQL instance (bottleneck at 10K QPS)
  
  After: Sharded setup
  ├─ Shard 1 (user_id % 3 == 0): Handles 1/3 users
  ├─ Shard 2 (user_id % 3 == 1): Handles 1/3 users
  └─ Shard 3 (user_id % 3 == 2): Handles 1/3 users
  
  Each shard can handle 10K QPS
  Total capacity: 30K QPS
  Can add shards as needed
```

**2. Caching Optimization**
```
Without caching:
  Every homepage request hits database
  Metadata Service: 100K QPS
  Database: 100K QPS (bottleneck!)

With caching:
  Homepage requests:
    - 95% hit cache (popular user base)
    - 5% miss, hit database
  Metadata Service: 100K QPS
  Database: 5K QPS (manageable)
  
Result: 20x reduction in database load
```

**3. Event Streaming & Async Processing**
```
Synchronous (Blocking):
  User stops watching
  → Update resume point (sync write)
  → Update recommendation model (sync)
  → Update analytics (sync)
  → Delay: 500ms

Asynchronous (Non-blocking):
  User stops watching
  → Update resume point (sync write)
  → Publish event to Kafka (async)
  → Return immediately to user (latency: 50ms)
  
  Background workers:
  ├─ Read from Kafka
  ├─ Update recommendation model (eventual consistency)
  └─ Update analytics
  
Result: 10x faster response, same functionality
```

**4. Queue-Based Load Leveling**
```
Scenario: Peak time (8PM), 10K sessions/second

Without queue:
  10K requests/sec → Playback Service
  Service can handle 2K/sec
  Result: 8K requests queue up, timeouts occur

With queue:
  10K requests/sec → SQS/Kafka Queue
  Queue: Unlimited capacity
  Playback Service: Processes at 2K/sec from queue
  Users wait 4 seconds instead of timeout
  After peak, queue drains
  
Result: No timeouts, graceful degradation
```

---

## Fault Tolerance & Resilience

### Chaos Engineering at Netflix

Netflix invented **Chaos Monkey**: randomly kill production servers to test resilience.

#### Multi-layer Fault Tolerance

```
LAYER 1: Service Level
────────────────────────
Circuit Breaker Pattern:

  Normal Operation:
    Request → Service A → Service B → Response
    Success rate: 99.9%
  
  Partial Failure:
    Service B fails (latency spike)
    Circuit Breaker detects:
      - 50+ errors in 10 seconds
      - Latency > 1000ms in 50% of requests
    State: OPEN
    Action: Fail-fast (don't send requests)
    
    After 30 seconds: Try one request (HALF_OPEN state)
    If succeeds: State: CLOSED (back to normal)
    If fails: State: OPEN (continue failing fast)


LAYER 2: Regional Level
────────────────────────
Multi-region deployment:

  User in US: Route to US-East region
  If US-East down: Route to US-West
  If US down: Route to EU-West
  
  Data replication:
    Primary (US-East) → Replica (US-West) → Replica (EU-West)
    Write to primary
    Read from nearest replica
    Automatic failover if primary fails


LAYER 3: Data Level
────────────────────
Cassandra replication:

  Replication factor: 3 (data on 3 nodes)
  
  Node 1 fails:
    2 copies still available
    Cluster continues operating
    Automatic repair: Missing data replicated back
  
  Entire region fails:
    Multi-region cluster:
      DC1 (us-east): 3 nodes
      DC2 (eu-west): 3 nodes
      DC3 (ap-southeast): 3 nodes
    If DC1 fails, DC2 and DC3 still have data
    Consistency level: QUORUM (2 out of 3)
    Writes complete even if one DC is down


LAYER 4: Graceful Degradation
──────────────────────────────
What if recommendations fail?

  Normal:
    Homepage Service
    ├─ Get recommendations (call Recommendation Service)
    ├─ Get metadata
    └─ Compile response

  If Recommendation Service down:
    Homepage Service
    ├─ Call Recommendation Service
    ├─ Timeout after 1 second
    ├─ Fall back to trending titles (pre-computed)
    ├─ Get metadata
    └─ Return response with generic recommendations
    
  Result: User sees something instead of error
```

#### Monitoring & Alerting

```
Netflix monitoring stack:

├─ Metrics (Atlas/Prometheus)
│  ├─ Request latency (p50, p99)
│  ├─ Error rates
│  ├─ Queue depths
│  ├─ CPU/Memory usage
│  └─ Custom metrics (ABR changes, buffer events)
│
├─ Logging (Splunk, ELK)
│  ├─ Structured logs from each service
│  ├─ Correlation IDs (trace request across services)
│  └─ Real-time analysis
│
└─ Distributed Tracing (Distributed Zipkin)
   ├─ End-to-end request flow
   ├─ Identify slow services
   └─ Debug production issues
```

---

## Database Strategy

### Polyglot Persistence Decision Tree

```
Choosing the right database for your use case:

Q1: Do you need ACID transactions?
    YES → MySQL / PostgreSQL
    NO → Continue to Q2

Q2: Is the data distributed across regions?
    YES → Cassandra / DynamoDB
    NO → Continue to Q3

Q3: Is this read-heavy or write-heavy?
    Read-heavy → Add caching layer
    Write-heavy → Cassandra / DynamoDB
    Both → Continue to Q4

Q4: Do you need full-text search?
    YES → Elasticsearch
    NO → Your chosen database above

Q5: Is schema flexible/changing?
    YES → MongoDB / DynamoDB
    NO → Structured databases (MySQL, Cassandra)
```

### Example: Resume Point Service

```
Requirement: Store where user stopped watching (resume point)
- Millions of users
- High write volume (user stops watching)
- High read volume (user opens app)
- Distributed globally
- Must be available (can't lose resume point)

Analysis:
├─ ACID needed? No (eventual consistency acceptable)
├─ Distributed? Yes (global users)
├─ Write-heavy? Yes (every session generates write)
├─ Full-text search? No
├─ Flexible schema? No

Decision: Apache Cassandra
Reasons:
├─ Distributed: No single point of failure
├─ Write-optimized: Can handle millions of writes/sec
├─ Always-available: Masterless architecture
├─ Scales horizontally: Add nodes, not harder

Implementation:
CREATE TABLE resume_points (
    user_id TEXT,
    title_id TEXT,
    resume_point INT,
    watch_duration INT,
    last_updated TIMESTAMP,
    PRIMARY KEY (user_id, title_id)
);

Queries:
- Write: INSERT resume_point (user stops watching)
- Read: SELECT resume_point WHERE user_id = ? AND title_id = ?
- Cleanup: DELETE when title finished

Cassandra advantages:
├─ Write: O(1) regardless of data size
├─ Read: O(log n) due to B-tree indexing
├─ Distributed: Automatic sharding by user_id
└─ Replication: Automatic across regions
```

---

## Real-time Features

### Viewing Metrics & Analytics

```
Architecture: Lambda + Kappa Hybrid

┌─────────────────────────────────────────────┐
│             Client (Streaming)               │
│ Every 30 seconds sends heartbeat             │
│ {                                            │
│   "user_id": "user123",                     │
│   "title_id": "title456",                   │
│   "current_time": 1234,                     │
│   "bitrate": "1080p",                       │
│   "buffer_health": 20,                      │
│   "error": null                             │
│ }                                           │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│     Kafka (Event Stream)                    │
│ High-throughput event ingestion             │
│ Partitioned by: title_id                    │
│ Retention: 7 days                           │
└────────────┬────────────────────────────────┘
             │
      ┌──────┴──────┐
      │             │
      ▼             ▼
   BATCH       STREAMING
  (Lambda)     (Kappa)
   
STREAMING PATH (Real-time):
Kafka → Flink / Spark Streaming
├─ Aggregate metrics (per minute)
├─ Detect anomalies
│  └─ If bitrate drops: Alert ops team
├─ Update trending list (top watched now)
└─ Cache results in Redis (updated every minute)

BATCH PATH (Historical):
Kafka → HDFS / S3 (Parquet files)
├─ Store all events (data lake)
├─ Process every hour
├─ Compute statistics
│  ├─ Peak hours by geography
│  ├─ Content popularity
│  └─ Device distribution
└─ Update data warehouse (for BI)
```

---

## Interview Talking Points

### Question 1: "Design Netflix's recommendation system"

**Your Answer Structure:**

1. **Problem Statement**
   - 250M subscribers with diverse tastes
   - Need personalized recommendations (increase watch time)
   - Different recommendation algorithms for different contexts
   - Real-time model updates to reflect new trends

2. **Architecture**
   ```
   User Behavior → Event Stream (Kafka)
   ↓
   Feature Computation (Spark/Flink)
   ├─ User features (watch history, ratings, time of day)
   ├─ Content features (genre, actors, length)
   └─ Contextual features (device, location, network speed)
   ↓
   ML Models (TensorFlow/PyTorch)
   ├─ Collaborative Filtering (user-user, item-item)
   ├─ Content-Based Filtering (similar to watched)
   ├─ Contextual Bandits (explore-exploit tradeoff)
   └─ Ranking Models (which recommendations to show first)
   ↓
   Recommendation Service API
   ├─ Takes user_id, context
   ├─ Returns top-N recommendations
   ├─ Serves from cache (updated daily/hourly)
   └─ Latency SLA: <500ms
   ```

3. **Key Trade-offs**
   - **Personalization vs. Computation Cost**: More complex models → better recommendations, but slower
   - **Freshness vs. Stability**: Update model hourly (fresh) or daily (stable)?
   - **Coverage vs. Precision**: Show recommendations for unpopular content (coverage) or only safe bets (precision)?

4. **Scaling Considerations**
   - Training: Nightly batch job (all users)
   - Serving: Pre-compute top-N for each user, cache
   - Model A/B testing: Serve model A to 50% users, model B to 50%

---

### Question 2: "How would you handle a database failure?"

**Your Answer:**

```
Scenario: Primary MySQL instance fails

Immediate (< 1 minute):
1. Monitoring detects no heartbeat from primary
2. Circuit breaker trips
3. Application switches to read replicas
4. Reads work, but writes fail
5. Alert sent to on-call engineer

Short-term (1-5 minutes):
1. DBA promotes best replica to primary
2. Write replicas point to new primary
3. Old primary removed from pool
4. Traffic gradually moved to new primary

Long-term (5-30 minutes):
1. Investigate root cause
2. Repair old primary
3. Add back as replica (syncs from new primary)
4. Monitor for stability

Result: Service degraded 2-3 minutes, no data loss
```

---

### Question 3: "How do you ensure consistency across distributed services?"

**Your Answer:**

```
Netflix uses EVENTUAL CONSISTENCY model:

Scenario: User updates watch progress

Synchronous Updates (must be immediate):
├─ Resume point (user's progress)
└─ Subscription validity (billing)

Asynchronous Updates (eventual consistency OK):
├─ Recommendation models (updated hourly)
├─ Analytics (updated daily)
└─ Profile metadata (updated daily)

Implementation:
1. Resume point update (sync)
   Update DB immediately, return to user

2. Publish event to Kafka (async)
   Recommendation Service listens
   Updates model (might take minutes)

3. User opens app
   Resume point from cache (correct, recent)
   Recommendations from cache (might be slightly old, but acceptable)

Trade-off: Lower latency + higher availability vs. Perfect consistency
This works because:
├─ Users tolerate slightly stale recommendations
├─ Resume points are fresh (high priority)
└─ Failing fast is better than slow consistency
```

---

### Question 4: "How would you scale to 1 billion users?"

**Your Answer:**

```
Current: 250M users
Target: 1B users (4x growth)

Database Scaling:
├─ Cassandra: Add nodes to cluster (linear scaling)
├─ MySQL: Add shards (consistent hashing)
└─ Redis: Add nodes to cluster (consistent hashing)
Cost increase: 4x data, so 4x infrastructure (acceptable)

Microservices Scaling:
├─ Add more instances per service
├─ Load balancing already in place
└─ No architectural changes needed
Cost increase: 4x computation (acceptable)

Tricky Part: CDN & Bandwidth
├─ Video streaming: 70% of internet traffic
├─ Current: 30% of internet traffic
├─ At 1B users: ~60% of internet traffic
├─ Solution: More ISP partnerships, more edge caches
└─ Cost increase: Network contracts (not just infrastructure)

Recommendation System:
├─ Current: Precompute recommendations nightly for all users
├─ At 1B users: Nightly job might take 12+ hours (too slow)
├─ Solution: Move to near-real-time (hourly updates per region)
├─ Or: Hierarchical clusters (compute regional recommendations)
└─ Or: Online learning (update model in real-time for new users)

Regional Strategy:
├─ US: Deep infrastructure (all regions)
├─ Europe: Secondary cluster (EU-West primary)
├─ Asia: New cluster (APAC-primary)
├─ Africa: ISP partnerships (no dedicated DC)
```

---

### Question 5: "How do you A/B test features without impacting performance?"

**Your Answer:**

```
Netflix A/B Testing (Experimentation Platform):

Setup:
├─ User assigned to control or variant (based on user_id hash)
├─ 50% control, 50% variant
├─ Consistent (same variant every visit)

Implementation:
1. API Gateway receives request
2. Extract user_id from token
3. Hash: variant = hash(user_id + experiment_id) % 2
4. Route to appropriate microservice version

Key: Routing happens at gateway, not in service logic

Example: Testing new recommendation algorithm
├─ Control: Old algorithm (50% users)
├─ Variant: New algorithm (50% users)
├─ Same QPS to each version
├─ Monitor metrics (watch time, engagement)
├─ After 2 weeks: Compare results
├─ New algorithm 10% better? Roll out to all users
└─ New algorithm worse? Keep old version

Rollout Strategy (Canary Deployment):
├─ 1% users: New version
├─ Monitor errors, latency
├─ If healthy → 10%
├─ If healthy → 50%
├─ If healthy → 100%

Rolling back:
├─ If errors spike, immediately route 100% to old version
├─ No service restart needed
└─ Automatic traffic switch
```

---

### Question 6: "What are the main challenges in your system design?"

**Honest Answer:**

```
1. Trade-off between Consistency and Latency
   ├─ Strong consistency → slow
   ├─ Weak consistency → fast, but eventual correctness
   └─ Netflix chose: Fast + eventual consistency

2. Cache Invalidation
   ├─ Hard problem: deciding when to refresh cache
   ├─ Solution: TTL + event-driven invalidation
   └─ Still imperfect (some inconsistencies)

3. Data Volume
   ├─ Petabytes of data to store
   ├─ Terabytes per day ingested
   └─ Sharding/partitioning required

4. Global Distribution
   ├─ User in different regions has latency
   ├─ Replication across regions increases complexity
   ├─ Regulatory requirements (GDPR, data residency)
   └─ Solution: Multi-region architecture

5. Cost Optimization
   ├─ Video streaming is expensive (bandwidth)
   ├─ Netflix invests heavily in CDN/Open Connect
   └─ Every 1% latency improvement saves millions in bandwidth

6. Real-time Decision Making
   ├─ Choosing bitrate every few seconds
   ├─ Recommendation changes based on current trends
   ├─ Requires low-latency ML inference
   └─ Can't afford to wait for batch jobs
```

---

## Summary of Key Design Principles

```
1. SCALE HORIZONTALLY
   ├─ Design to add more machines, not bigger machines
   ├─ No single point of failure
   └─ Cost scales linearly

2. EMBRACE FAILURE
   ├─ Assume services will fail (they will)
   ├─ Design for graceful degradation
   ├─ Use circuit breakers, retries, fallbacks
   └─ Chaos engineering to test failure modes

3. EVENTUAL CONSISTENCY
   ├─ Don't wait for perfect consistency
   ├─ Accept eventual consistency for non-critical data
   ├─ Sync writes for critical data (resume point, billing)
   └─ Async for everything else

4. CACHING EVERYWHERE
   ├─ Cache at every layer (client, CDN, app, DB)
   ├─ Reduces load on databases
   ├─ Improves latency dramatically
   └─ Most important optimization

5. ASYNC > SYNC
   ├─ Use message queues for heavy lifting
   ├─ Return to user immediately
   ├─ Process in background (Kafka, SQS)
   └─ Faster response times

6. MEASURE EVERYTHING
   ├─ Instrument all services
   ├─ Collect metrics, logs, traces
   ├─ Use data to make decisions
   └─ Example: A/B testing every change

7. AUTOMATE EVERYTHING
   ├─ CI/CD for rapid deployment
   ├─ Infrastructure as Code
   ├─ Automated failover
   └─ Automated scaling
```

---

## Recommended Deeper Dives

1. **Cassandra**: Distributed databases, eventual consistency
2. **Kafka**: Event streaming, pub-sub systems
3. **Load Balancing**: Consistent hashing, round-robin
4. **Caching**: LRU eviction, TTL strategies, cache stampede
5. **CDN**: Edge computing, content delivery
6. **Rate Limiting**: Token bucket, sliding window
7. **Circuit Breakers**: Failure detection and recovery

---

*This document represents best practices from Netflix's public tech talks, engineering blogs, and system design interviews. Actual implementation details may vary.*
