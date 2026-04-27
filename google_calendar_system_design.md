# 🗓️ Google Calendar — System Design Deep Dive
### SDE 3 Interview Reference | Senior Architect Perspective

---

## Table of Contents
1. [What Is Google Calendar? (Product Overview)](#1-product-overview)
2. [Functional & Non-Functional Requirements](#2-requirements)
3. [Scale Estimation (Back-of-the-Envelope)](#3-scale-estimation)
4. [High-Level Architecture](#4-high-level-architecture)
5. [Core Data Models](#5-data-models)
6. [API Design](#6-api-design)
7. [Deep Dive: Event Storage & Retrieval](#7-event-storage)
8. [Deep Dive: Real-Time Sync](#8-real-time-sync)
9. [Deep Dive: Recurring Events](#9-recurring-events)
10. [Deep Dive: Notifications & Reminders](#10-notifications)
11. [Deep Dive: Sharing & Permissions (ACL)](#11-permissions)
12. [Deep Dive: Search](#12-search)
13. [Deep Dive: Free/Busy & Scheduling](#13-freebusy)
14. [Caching Strategy](#14-caching)
15. [Failure Modes & Resilience](#15-resilience)
16. [Global Distribution](#16-global-distribution)
17. [Interview Talking Points & Trade-offs](#17-tradeoffs)

---

## 1. Product Overview

Google Calendar is a **time-management and scheduling** web/mobile application. At its core it manages:

- **Events**: Time-bounded entries with metadata (title, description, location, attendees)
- **Calendars**: Named collections of events owned by a user or shared with a group
- **Invitations**: Collaborative scheduling with accept/decline/tentative semantics
- **Reminders & Notifications**: Time-triggered alerts (email, push, SMS)
- **Recurring Events**: RRULE-based repeating patterns (daily, weekly, monthly, etc.)
- **Free/Busy Information**: Aggregated availability for meeting scheduling
- **Integrations**: Meet, Gmail (smart chips), Workspace, third-party CalDAV

---

## 2. Requirements

### 2.1 Functional Requirements (Must-Have)

| # | Requirement |
|---|-------------|
| F1 | Create, read, update, delete (CRUD) events |
| F2 | Support recurring events with exceptions |
| F3 | Invite attendees; track RSVP (accept / decline / tentative) |
| F4 | Multiple calendars per user; share calendars with ACL |
| F5 | Reminders: email, push notification, SMS |
| F6 | Free/Busy lookup for scheduling |
| F7 | Cross-timezone support; events stored in UTC |
| F8 | Offline support with eventual sync |
| F9 | Search across events |
| F10 | Real-time sync across devices |
| F11 | CalDAV / iCalendar interoperability |

### 2.2 Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Availability** | 99.99% uptime (~52 min/year downtime) |
| **Latency** | p99 < 200ms for event reads; p99 < 500ms for writes |
| **Consistency** | Strong consistency for single-user writes; eventual across attendees |
| **Durability** | Zero data loss — multi-region replication |
| **Scale** | 500M+ active users; billions of events |
| **Security** | Data encrypted at rest and in transit; fine-grained ACLs |
| **Compliance** | GDPR, HIPAA (Workspace), SOC 2 |

### 2.3 Out of Scope (for interview)
- Video conferencing (Google Meet) internals
- Gmail parsing (smart event detection)
- Billing / payments

---

## 3. Scale Estimation

### Users & Events
```
Active Users:           500 million
Events per user/year:   ~200 events
Total events in DB:     500M × 200 = 100 billion events

New events/day:         500M × (200/365) ≈ 270 million events/day
New events/second:      ~3,100 writes/sec (peak 3×) = ~10,000 writes/sec
```

### Read Traffic
```
Read:Write ratio:       100:1 (calendar apps are read-heavy)
Read QPS:               10,000 × 100 = 1,000,000 reads/sec peak
```

### Storage
```
Event record:           ~2 KB average (metadata + attendees)
100 billion events:     100B × 2KB = 200 TB raw
With replication (3×):  600 TB
With index overhead:    ~1 PB total
```

### Notification Load
```
Reminders triggered/day: 270M events × 1.5 reminders avg = ~400M notifications/day
Notifications/sec:        ~5,000/sec (with peaks around :00 and :30 of every hour)
```

> **Interview tip**: Always state your assumptions clearly. The exact numbers matter less than the reasoning process.

---

## 4. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                  │
│  Web Browser   iOS App   Android App   CalDAV Clients   3rd Party   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTPS / WebSocket
┌───────────────────────────▼─────────────────────────────────────────┐
│                       EDGE / CDN LAYER                               │
│              Google Cloud CDN  ·  Load Balancers  ·  DDoS Shield    │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────────┐
│                       API GATEWAY                                    │
│         Rate Limiting  ·  Auth (OAuth2/JWT)  ·  Routing             │
└──────┬────────┬──────────┬───────────────┬──────────────────────────┘
       │        │          │               │
┌──────▼──┐ ┌──▼──────┐ ┌─▼──────────┐ ┌─▼──────────────┐
│  Event  │ │Calendar │ │Notification│ │  Sync / Push   │
│ Service │ │ Service │ │  Service   │ │   Service      │
└──────┬──┘ └──┬──────┘ └─┬──────────┘ └─┬──────────────┘
       │       │           │              │
┌──────▼───────▼───────────▼──────────────▼───────────────────────────┐
│                       MESSAGE BUS (Pub/Sub)                          │
│                    Google Pub/Sub / Apache Kafka                     │
└──────────────────────┬──────────────────────────────────────────────┘
                       │ (async fanout: invites, reminders, search index)
          ┌────────────┴────────────┐
          │                         │
   ┌──────▼──────┐          ┌───────▼──────┐
   │  Reminder   │          │    Search    │
   │  Scheduler  │          │   Indexer   │
   └──────┬──────┘          └───────┬──────┘
          │                         │
   ┌──────▼──────┐          ┌───────▼──────┐
   │ Notification│          │ Elasticsearch│
   │  Dispatcher │          │  / Spanner  │
   └─────────────┘          └─────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                     │
│                                                                      │
│  ┌─────────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Cloud Spanner  │  │  Bigtable /  │  │      Redis /          │  │
│  │  (Events, ACLs, │  │  HBase       │  │      Memcached        │  │
│  │   Calendars)    │  │  (Free/Busy) │  │      (Cache Layer)    │  │
│  └─────────────────┘  └──────────────┘  └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Data Models

### 5.1 Calendar

```sql
Calendar {
  calendar_id     UUID         PRIMARY KEY
  owner_user_id   UUID         NOT NULL
  name            VARCHAR(255) NOT NULL
  description     TEXT
  color           VARCHAR(7)   -- hex color e.g. #4285F4
  timezone        VARCHAR(64)  -- IANA e.g. "America/New_York"
  visibility      ENUM(PUBLIC, PRIVATE, SHARED)
  created_at      TIMESTAMP
  updated_at      TIMESTAMP
  deleted_at      TIMESTAMP    -- soft delete
  sync_token      VARCHAR(64)  -- for incremental sync
}
```

### 5.2 Event

```sql
Event {
  event_id        UUID         PRIMARY KEY
  calendar_id     UUID         FK → Calendar
  creator_id      UUID         FK → User
  title           VARCHAR(1024)
  description     TEXT
  location        VARCHAR(1024)
  
  -- Time: Always store in UTC, display in user TZ
  start_time      TIMESTAMP (UTC)
  end_time        TIMESTAMP (UTC)
  start_timezone  VARCHAR(64)   -- original TZ for display
  end_timezone    VARCHAR(64)
  all_day         BOOLEAN
  
  -- Recurrence (RFC 5545 iCalendar)
  rrule           TEXT          -- e.g. "FREQ=WEEKLY;BYDAY=MO,WE,FR"
  recurrence_id   TIMESTAMP     -- for exceptions: which instance is this?
  original_event_id UUID        -- parent event if this is an exception
  
  status          ENUM(CONFIRMED, TENTATIVE, CANCELLED)
  visibility      ENUM(PUBLIC, PRIVATE, DEFAULT)
  
  -- Optimistic concurrency
  etag            VARCHAR(64)
  sequence        INT           -- increments on update (iCalendar standard)
  
  created_at      TIMESTAMP
  updated_at      TIMESTAMP
}
```

### 5.3 Attendee

```sql
Attendee {
  event_id        UUID          FK → Event
  user_id         UUID          FK → User (nullable for external)
  email           VARCHAR(255)
  display_name    VARCHAR(255)
  role            ENUM(ORGANIZER, REQUIRED, OPTIONAL)
  status          ENUM(NEEDS_ACTION, ACCEPTED, DECLINED, TENTATIVE)
  comment         TEXT          -- RSVP comment
  self            BOOLEAN       -- is this the requesting user?
  resource        BOOLEAN       -- is this a room/resource?
  updated_at      TIMESTAMP
  PRIMARY KEY     (event_id, email)
}
```

### 5.4 ACL (Access Control List)

```sql
CalendarACL {
  acl_id          UUID         PRIMARY KEY
  calendar_id     UUID         FK → Calendar
  scope_type      ENUM(USER, GROUP, DOMAIN, DEFAULT)
  scope_value     VARCHAR(255) -- email, domain, or null for DEFAULT
  role            ENUM(NONE, FREE_BUSY_READER, READER, WRITER, OWNER)
  created_at      TIMESTAMP
  UNIQUE (calendar_id, scope_type, scope_value)
}
```

### 5.5 Reminder

```sql
Reminder {
  reminder_id     UUID         PRIMARY KEY
  event_id        UUID         FK → Event
  user_id         UUID         FK → User
  method          ENUM(EMAIL, POPUP, SMS)
  minutes_before  INT          -- minutes before event start
  fired           BOOLEAN
  fire_at         TIMESTAMP    -- computed: start_time - minutes_before
  INDEX           (fire_at, fired) -- critical for scheduler queries
}
```

---

## 6. API Design

Google Calendar follows **REST** principles with **gRPC** for internal service-to-service calls.

### 6.1 Event APIs

```http
# Create Event
POST /calendars/{calendarId}/events
Body: { title, start, end, attendees[], rrule, reminders[], ... }
Response: 201 Created + Event object

# Get Event
GET /calendars/{calendarId}/events/{eventId}
Response: 200 OK + Event object

# Update Event (full update)
PUT /calendars/{calendarId}/events/{eventId}
Header: If-Match: {etag}   ← Optimistic concurrency control
Body: full Event object

# Patch Event (partial update)
PATCH /calendars/{calendarId}/events/{eventId}

# Delete Event
DELETE /calendars/{calendarId}/events/{eventId}

# List Events (with pagination + sync)
GET /calendars/{calendarId}/events
  ?timeMin=2024-01-01T00:00:00Z
  &timeMax=2024-01-31T23:59:59Z
  &singleEvents=true      ← expand recurring events
  &orderBy=startTime
  &pageToken={token}      ← cursor-based pagination
  &syncToken={token}      ← incremental sync (server-sent delta)

# Quick Add (NLP parsing)
POST /calendars/{calendarId}/events/quickAdd
  ?text=Meeting with John tomorrow at 3pm
```

### 6.2 Sync Protocol (Delta Sync)

```
First sync:
  GET /events → returns full list + nextSyncToken

Subsequent syncs:
  GET /events?syncToken=TOKEN
  → returns only changed/deleted events since last sync
  → deleted events returned with status: "cancelled"
  → returns new nextSyncToken

If syncToken is expired (410 Gone):
  → client must do full re-sync
```

> **Design note**: The `syncToken` encodes a server-side timestamp and a cursor. On the backend, all writes stamp a `updated_at` microsecond timestamp + a monotonic sequence number per calendar. The sync token is essentially a **checkpoint** into this ordered log.

---

## 7. Deep Dive: Event Storage & Retrieval

### 7.1 Why Cloud Spanner / NewSQL?

Google Calendar needs:
- **Globally consistent** reads (you should see your own writes immediately)
- **Cross-row transactions** (creating an event + its attendees + reminders atomically)
- **SQL query capability** (range scans by time, joins)
- **Horizontal scalability** (petabyte scale)

Cloud Spanner provides externally consistent transactions via TrueTime (GPS + atomic clocks). Alternatives: CockroachDB, YugabyteDB, or MySQL with Vitess sharding.

### 7.2 Sharding Strategy

```
Shard key:  calendar_id (interleaved with events)

Spanner interleaving:
  Calendar (calendar_id)
    └── Event (calendar_id, event_id)    ← co-located on same split
          └── Attendee (calendar_id, event_id, email)
```

**Why calendar_id as shard key?**
- All events for a calendar are co-located → fast time-range scans
- Avoid hot spots: a single very popular calendar doesn't block others
- Natural isolation: one calendar ≠ another calendar's data

**Risk**: "Hot calendar" problem (e.g. a calendar with 10M followers).
**Mitigation**: Read replicas + caching for public/read-heavy calendars.

### 7.3 Time-Range Query

```sql
SELECT e.*
FROM Event e
WHERE e.calendar_id = @calendarId
  AND e.start_time < @timeMax
  AND e.end_time   > @timeMin
  AND e.status     != 'CANCELLED'
ORDER BY e.start_time
LIMIT 250;

-- Index: (calendar_id, start_time, end_time)
-- Note: we index start_time ASC for the range scan,
-- and also check end_time to catch multi-day events
```

### 7.4 Recurring Event Expansion

Recurring events are **stored once** (the master event with `rrule`).

On read, two strategies:

**Strategy A — Expand at Query Time (used for small date ranges)**
```
1. Fetch master event with rrule
2. Use iCalendar library to expand instances in [timeMin, timeMax]
3. Override instances that have exceptions (stored as child events)
4. Merge and return
```

**Strategy B — Pre-expand and Materialize (used for search / scheduling)**
```
1. When rrule is created, publish to async job queue
2. Worker materializes next N instances (e.g., 2 years out)
3. Store materialized instances in a separate table
4. Periodically extend the horizon (rolling window)
```

> **Tradeoff**: Strategy A is simpler and always correct; Strategy B is faster for search but requires invalidation when the rrule changes.

---

## 8. Deep Dive: Real-Time Sync

### 8.1 The Problem

A user edits an event on their laptop. Their phone and another attendee's device must see the update within seconds.

### 8.2 Architecture: Push Channel (WebSocket / Server-Sent Events)

```
Client Device                API Gateway              Event Service
     │                           │                         │
     │── Subscribe(calendarId) ──▶│                         │
     │                           │── Open long-poll ───────▶│
     │                           │                         │
     │   (another client writes) │                         │
     │                           │◀── Event published ─────│
     │◀── Push notification ─────│   (via Pub/Sub)         │
     │                           │                         │
     │── GET /events?sync=TOKEN ─▶│                         │
     │◀── Delta events ──────────│                         │
```

### 8.3 Implementation

**Write path:**
```
1. Client writes event → Event Service
2. Event Service writes to Spanner (durable)
3. Event Service publishes to Pub/Sub topic: "calendar.{calendarId}.changes"
4. Return 200 to client
```

**Push path:**
```
1. Push Service subscribes to Pub/Sub topics for connected clients
2. On message: push notification to all subscribed devices for that calendar
3. Client receives push → fetches delta via sync token
4. If push missed (app backgrounded): FCM/APNs background fetch
```

**Why not push the full event in the notification?**
- Keeps push payload small (avoids ACL checks in push path)
- Client always fetches authoritative data from API
- Handles race conditions (multiple quick edits) — client sees final state

### 8.4 Conflict Resolution

```
Last-write-wins with sequence numbers:

Client A edits event, sequence=5 → submit with If-Match: etag-5
Client B edits same event, sequence=5 → submit with If-Match: etag-5

Server processes A first → sequence becomes 6, new etag
Server processes B → etag mismatch → 409 Conflict returned
Client B must: GET latest → re-apply changes → re-submit
```

---

## 9. Deep Dive: Recurring Events

This is one of the **hardest** parts of calendar design. Interviewers love it.

### 9.1 iCalendar RRULE

```
RRULE:FREQ=WEEKLY;BYDAY=MO,WE;COUNT=10
   → Every Monday and Wednesday, 10 times total

RRULE:FREQ=MONTHLY;BYDAY=2MO
   → Second Monday of every month

RRULE:FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1
   → January 1st every year
```

### 9.2 Data Model for Exceptions

```
Master Event (event_id: "E1", rrule: "FREQ=WEEKLY;BYDAY=MO")
  │
  ├── Exception: Cancel 2024-01-15 instance
  │   (event_id: "E1-EX1", original_event_id: "E1",
  │    recurrence_id: "2024-01-15T09:00:00Z", status: CANCELLED)
  │
  └── Exception: Move 2024-01-22 to 2024-01-23
      (event_id: "E1-EX2", original_event_id: "E1",
       recurrence_id: "2024-01-22T09:00:00Z",
       start_time: "2024-01-23T09:00:00Z")
```

### 9.3 Editing Recurring Events — The "This and Following" Problem

When a user edits a recurring event, the UI asks:
1. **This event only** → Create an exception record
2. **This and following events** → Split the master event:
   - Update master: add `UNTIL=<split_date>` to RRULE
   - Create new master event from split_date with new properties
3. **All events** → Update master event; delete all exceptions (or re-validate them)

```
Before: Master E1, RRULE: FREQ=WEEKLY (infinite)
               Jan 1 ──── Jan 8 ──── Jan 15 ──── Jan 22 ──── ...

"This and following" edit on Jan 15, change location to "NYC":
After:  Master E1, RRULE: FREQ=WEEKLY;UNTIL=Jan-14 (terminated)
        New Master E2, RRULE: FREQ=WEEKLY (from Jan 15), location="NYC"
               Jan 1 ──── Jan 8 │ Jan 15 ──── Jan 22 ──── ...
                                ↑ split point
```

> **Gotcha to mention in interview**: The "this and following" operation requires a transaction that:
> 1. Updates the old master's RRULE (add UNTIL)
> 2. Creates new master event
> 3. Migrates any exceptions that fall after the split date to the new master
> All in a single atomic transaction — critical for consistency.

---

## 10. Deep Dive: Notifications & Reminders

### 10.1 Scale Problem

```
~400 million reminders per day
= ~5,000 reminders/second average
= ~50,000 reminders/second at peak (top of the hour)
```

### 10.2 Reminder Scheduling Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  REMINDER SCHEDULER                          │
│                                                             │
│  ┌─────────────┐    ┌────────────────┐    ┌─────────────┐  │
│  │  Reminder   │    │  Time-bucket   │    │   Dispatch  │  │
│  │  DB Table   │───▶│  Partitioning  │───▶│   Workers   │  │
│  │             │    │                │    │             │  │
│  │ fire_at IDX │    │ Bucket per     │    │  Pull from  │  │
│  │ (clustered) │    │ 1-minute window│    │  Pub/Sub    │  │
│  └─────────────┘    └────────────────┘    └──────┬──────┘  │
└────────────────────────────────────────────────── │ ────────┘
                                                    │
                        ┌───────────────────────────┤
                        │                           │
                 ┌──────▼─────┐            ┌────────▼──────┐
                 │   Email    │            │  Push (FCM /  │
                 │  Service   │            │   APNs)       │
                 └────────────┘            └───────────────┘
```

### 10.3 Scheduler Algorithm

```python
# Runs every minute — polling pattern
def schedule_reminders():
    now = current_time_utc()
    window_end = now + timedelta(minutes=1)
    
    # Query: reminders due in next minute
    due_reminders = db.query("""
        SELECT * FROM Reminder
        WHERE fire_at BETWEEN :now AND :window_end
          AND fired = FALSE
        LIMIT 10000
    """, now=now, window_end=window_end)
    
    for reminder in due_reminders:
        # Publish to topic for dispatch workers
        pubsub.publish("reminders.due", reminder)
        
        # Mark as fired (idempotency)
        db.update("Reminder SET fired=TRUE WHERE reminder_id=:id", 
                  id=reminder.reminder_id)
```

### 10.4 Idempotency

Reminders must fire **exactly once**. Risks:
- Scheduler crashes mid-batch → reminders re-fired
- Network retry → duplicate dispatch

Solutions:
- Mark `fired=TRUE` in same transaction as publishing
- Idempotency key in notification payload (reminder_id + user_id + fire_at)
- Notification service deduplicates on idempotency key (Redis `SETNX` with TTL)

---

## 11. Deep Dive: Sharing & Permissions (ACL)

### 11.1 Permission Model

```
Roles (ordered by access):
  NONE              → cannot see calendar at all
  FREE_BUSY_READER  → can see only busy/free blocks, no event details
  READER            → can see all event details
  WRITER            → can create/edit events
  OWNER             → can delete calendar, manage ACLs

Scope types:
  USER   → specific Google account (user@gmail.com)
  GROUP  → Google Group
  DOMAIN → all users of a Workspace domain
  DEFAULT→ the "Make public" setting
```

### 11.2 ACL Check Flow

```
Request: GET /calendars/{calendarId}/events

1. AuthN: Validate OAuth2 token → extract user_id
2. AuthZ: Check ACL table
   SELECT role FROM CalendarACL
   WHERE calendar_id = :calendarId
     AND (
       (scope_type='USER'   AND scope_value=:userEmail)  OR
       (scope_type='GROUP'  AND scope_value IN :userGroups) OR
       (scope_type='DOMAIN' AND scope_value=:userDomain) OR
       (scope_type='DEFAULT')
     )
   ORDER BY scope_type specificity DESC  -- USER > GROUP > DOMAIN > DEFAULT
   LIMIT 1

3. If role >= READER → allow
   If role = FREE_BUSY_READER → return events with title/description stripped
   If role = NONE or no row → 403 Forbidden
```

### 11.3 Caching ACL Decisions

ACL checks are on every request. Cache with:
```
Key:   acl:{userId}:{calendarId}
Value: effective_role (e.g., "WRITER")
TTL:   60 seconds

Invalidation: On any ACL write, publish to "acl.invalidate" topic
              Cache layer subscribes and evicts affected keys
```

---

## 12. Deep Dive: Search

### 12.1 Requirements
- Search across all events (title, description, location, attendees)
- Results ranked by recency + relevance
- Must respect ACLs (users can only find their own events)

### 12.2 Architecture

```
Write Path:
  Event created/updated
    → Pub/Sub message
    → Search Indexer service
    → Elasticsearch document upserted
      { event_id, calendar_id, user_id,
        title, description, location,
        attendee_emails[], start_time, ... }

Read Path:
  GET /calendars/primary/events?q=team+meeting
    → Search Service
    → Elasticsearch query:
        must: { user_id: X, query: "team meeting" }
        filter: [ { range: { start_time: { gte: "now-6M" } } } ]
    → Return event_ids
    → Fetch full events from Spanner (for ACL-safe, up-to-date data)
    → Return to client
```

### 12.3 Why fetch from Spanner after search?

- Elasticsearch index may be slightly stale (async indexing)
- Spanner is the source of truth for access control
- Ensures deleted/private events are never returned

---

## 13. Deep Dive: Free/Busy & Scheduling

### 13.1 Use Case

"Find a time" feature: show when a group of people are available.

### 13.2 Storage: Bigtable for Free/Busy

Free/Busy is a **time-series** workload — dense, write-heavy, range-scan heavy:

```
Row key:  {user_id}#{date_bucket}
           e.g. "user123#2024-01-15"

Columns:  00:00, 00:15, 00:30, ..., 23:45  (15-min slots)
Values:   0 = FREE, 1 = BUSY, 2 = TENTATIVE
```

**Why Bigtable?**
- Time-series data maps naturally to wide rows
- Extremely fast range scans for a user's week view
- Write throughput: millions of slot updates per second
- No complex joins needed (denormalized by design)

### 13.3 Free/Busy API

```http
POST /freeBusy
Body: {
  timeMin: "2024-01-15T09:00:00Z",
  timeMax: "2024-01-15T18:00:00Z",
  items: [
    { id: "alice@example.com" },
    { id: "bob@example.com" },
    { id: "conference-room-a@example.com" }
  ]
}

Response: {
  "alice@example.com": {
    "busy": [
      { "start": "2024-01-15T10:00:00Z", "end": "2024-01-15T11:00:00Z" }
    ]
  },
  ...
}
```

> **Privacy note**: FREE_BUSY_READER only gets the time slots, not event titles.

---

## 14. Caching Strategy

### 14.1 Cache Layers

```
L1: Client-side cache (browser/app)
    - Stores events for current + ±2 week window
    - Invalidated by sync token responses
    - Enables offline mode

L2: CDN / Edge cache
    - Public calendars only
    - iCalendar feed responses (TTL: 5 min)

L3: Application cache (Redis/Memcached)
    - ACL decisions: TTL 60s
    - Calendar metadata: TTL 5min
    - User preferences: TTL 15min
    - Free/busy summary: TTL 30s

L4: Database query cache
    - Spanner built-in read cache
    - Bigtable block cache
```

### 14.2 Cache Invalidation Strategy

```
Write-through pattern:
  1. Write to Spanner (source of truth)
  2. Publish event to "calendar.changed" Pub/Sub topic
  3. Cache invalidation service subscribes, deletes affected keys
  4. Next read populates cache from DB

Why not write-around?
  → Would allow stale reads after writes (bad UX for own writes)

Why not write-back?
  → Risk of data loss if cache node fails before flush
```

---

## 15. Failure Modes & Resilience

### 15.1 Failure Scenarios & Mitigations

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Single data center down | 33% capacity | Multi-region active-active; traffic rerouted in <30s |
| Reminder scheduler crash | Reminders delayed | Scheduler is stateless; Kubernetes restarts within 60s; reminders catch up from DB |
| Pub/Sub backlog | Sync delay | Per-calendar topic partitioning; auto-scale consumers |
| Spanner region failure | Read latency spike | Multi-region Spanner config; reads served from replicas |
| Cache stampede | DB overload on deploy | Cache warming on startup; jittered TTL; probabilistic early expiration |
| Notification flood (top of hour) | Push service overload | Jitter delivery by ±30s; priority queues; circuit breakers |

### 15.2 Circuit Breaker Pattern

```
Event Service → Notification Service

If Notification Service error rate > 50% for 10s:
  → Open circuit: immediately return success to caller
  → Events are queued in Pub/Sub durably
  → Half-open after 30s: let 1 request through
  → If success: close circuit, drain queue
  → If fail: open again
```

### 15.3 Idempotency on Retries

Every write operation generates a **client-generated idempotency key**:
```http
POST /calendars/primary/events
X-Idempotency-Key: {UUID generated by client}
```
Server stores: `(idempotency_key → response)` in Redis for 24h.
Retries return the stored response without re-executing.

---

## 16. Global Distribution

### 16.1 Multi-Region Strategy

```
Primary regions: us-central1, europe-west1, asia-east1
                 (covers ~95% of users with <50ms latency)

User data routing:
  → User's "home region" set at account creation (based on signup location)
  → Writes go to home region leader
  → Reads served from nearest replica
  → Cross-region replication lag: typically <1 second (Spanner)
```

### 16.2 Timezone Handling

```
Rule: Store ALL timestamps in UTC.

Event start_time = "2024-03-10T14:00:00Z" (UTC)
display_timezone = "America/New_York"

→ Display as "10:00 AM EST" (UTC-5)
→ After DST: "10:00 AM EDT" (UTC-4) ← same UTC, different wall clock

Why NOT store in local time?
  → DST transitions cause ambiguity (e.g., 1:30 AM happens twice on fall-back)
  → Cannot sort or compare times correctly without TZ context
  → UTC + IANA timezone name is the correct representation
```

---

## 17. Interview Talking Points & Trade-offs

### 17.1 Classic Interview Questions

**Q: How would you design the database schema for recurring events?**
> Store the master event once with the RRULE string. Exceptions are stored as separate event records with `original_event_id` pointing to the master and `recurrence_id` identifying which instance they override. Expand instances on the fly at read time for a given date range, merging exceptions.

**Q: How do you ensure a reminder fires exactly once at massive scale?**
> Mark reminder as fired atomically when publishing to Pub/Sub. Notification dispatcher uses an idempotency key (reminder_id + user_id + fire_at hash) stored in Redis SETNX with 24h TTL to deduplicate any retries.

**Q: How do you handle the "find a time" feature for 50 attendees?**
> Parallel fan-out: query Bigtable for each attendee's free/busy simultaneously (50 goroutines). Merge results client-side (OR all busy slots). This is a scatter-gather pattern; timeout the slowest 5% and proceed with available data.

**Q: How does sync work when a user comes back online?**
> Client stores the last `syncToken` it received. On reconnect, sends `GET /events?syncToken=TOKEN`. Server returns only events changed since that token (deleted ones with status=cancelled). If token expired (>30 days, 410 Gone), client does a full re-sync.

**Q: How would you scale to 10× the current load?**
> (1) Horizontal scaling of stateless API services, (2) Add Spanner read replicas in each region, (3) Increase Pub/Sub topic partitions, (4) Add more Reminder Scheduler shards (partition by `calendar_id % N`), (5) Expand Bigtable cluster for Free/Busy, (6) Add CDN caching for public calendar feeds.

### 17.2 Key Trade-offs to Articulate

| Decision | Option A | Option B | Choice & Why |
|----------|----------|----------|--------------|
| Recurring event storage | Store once + expand | Materialize all instances | Store once for writes; materialize for search |
| Consistency model | Strong (CP) | Eventual (AP) | Strong for same user; eventual for cross-attendee |
| Notification trigger | Polling DB | Message queue | Message queue (Pub/Sub) — decoupled, scalable |
| Free/Busy DB | Relational | Bigtable | Bigtable — time-series is a natural fit |
| Search | Spanner full-text | Elasticsearch | Elasticsearch — richer ranking, async is acceptable |
| Sync protocol | Polling | Push + pull | Push for low latency; pull for correctness |

### 17.3 What Impresses Interviewers

1. **Mentioning iCalendar RFC 5545** — shows you know the standards
2. **Explaining the "this and following" split transaction** — shows depth on recurring events
3. **Discussing TrueTime / Spanner for external consistency** — not just "use a database"
4. **Quantifying the notification problem** — 50,000 reminders/sec at top of hour is a real systems challenge
5. **Idempotency everywhere** — retries, duplicate push, scheduler restarts
6. **Privacy by design** — FREE_BUSY_READER role, data minimization in sync payloads

---

## Quick Reference: Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Primary DB | Cloud Spanner | Globally consistent, horizontally scalable SQL |
| Time-series (Free/Busy) | Cloud Bigtable | Wide-column, fast range scans |
| Cache | Redis + Memcached | ACL, sessions, idempotency keys |
| Message bus | Cloud Pub/Sub / Kafka | Async fan-out, durable queuing |
| Search | Elasticsearch | Full-text search, flexible ranking |
| Push | FCM (Android), APNs (iOS), WebSocket (Web) | Platform-native push |
| CDN | Google Cloud CDN | Public calendar feeds, static assets |
| Coordination | Kubernetes + Google Borg | Auto-scaling, health checks |
| Monitoring | Cloud Monitoring + OpenTelemetry | SLIs, SLOs, distributed tracing |

---

*Document prepared for SDE 3 System Design Interview Preparation*
*Architecture patterns valid as of 2024 — always verify current Google Cloud product capabilities*
