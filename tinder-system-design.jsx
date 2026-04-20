import { useState } from "react";

const theme = {
  bg: "#0A0A0F",
  surface: "#12121A",
  card: "#1A1A26",
  border: "#2A2A3E",
  accent: "#FF4458",
  accentSoft: "#FF6B7A",
  gold: "#FFB547",
  teal: "#00C9A7",
  blue: "#4A9EFF",
  purple: "#9B6BFF",
  text: "#F0F0FF",
  textMuted: "#7A7A9A",
  textDim: "#4A4A6A",
};

const Badge = ({ children, color = theme.accent }) => (
  <span style={{
    background: `${color}22`,
    color,
    border: `1px solid ${color}44`,
    borderRadius: 4,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    fontFamily: "monospace",
  }}>{children}</span>
);

const SectionTitle = ({ children, sub }) => (
  <div style={{ marginBottom: 28 }}>
    <h2 style={{ color: theme.text, fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>{children}</h2>
    {sub && <p style={{ color: theme.textMuted, fontSize: 13, marginTop: 6 }}>{sub}</p>}
  </div>
);

const Card = ({ children, style = {} }) => (
  <div style={{
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    padding: 20,
    ...style
  }}>{children}</div>
);

const Tag = ({ children, c = theme.blue }) => (
  <span style={{
    background: `${c}18`, color: c, border: `1px solid ${c}33`,
    borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600,
    display: "inline-block", margin: "3px 3px 3px 0"
  }}>{children}</span>
);

const Arrow = ({ label }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, margin: "0 6px" }}>
    <div style={{ width: 40, height: 1, background: theme.border }} />
    {label && <span style={{ color: theme.textDim, fontSize: 9, letterSpacing: "0.05em" }}>{label}</span>}
  </div>
);

// ──────────────────────────────────────────────
// SECTIONS
// ──────────────────────────────────────────────

const sections = {
  overview: () => (
    <div>
      <SectionTitle sub="Scope, scale, and key functional requirements">System Overview</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Card>
          <div style={{ color: theme.accent, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 12 }}>FUNCTIONAL REQUIREMENTS</div>
          {[
            ["User Profile", "Signup, photos, bio, preferences"],
            ["Discovery", "Swipe cards based on geo + preferences"],
            ["Matching", "Mutual right-swipe → match"],
            ["Messaging", "Real-time chat between matches"],
            ["Boost / Super Like", "Premium engagement features"],
            ["Notifications", "Push alerts for matches & messages"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <span style={{ color: theme.accent, minWidth: 8 }}>▸</span>
              <div>
                <span style={{ color: theme.text, fontWeight: 600, fontSize: 13 }}>{k}: </span>
                <span style={{ color: theme.textMuted, fontSize: 13 }}>{v}</span>
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <div style={{ color: theme.teal, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 12 }}>NON-FUNCTIONAL REQUIREMENTS</div>
          {[
            ["Scale", "50M DAU, 1.5B swipes/day"],
            ["Latency", "Swipe deck load < 200ms p99"],
            ["Availability", "99.99% uptime (4 nines)"],
            ["Consistency", "Eventual OK for swipes; strong for matches"],
            ["Geo-Proximity", "Radius queries in real-time"],
            ["Privacy", "Location fuzzed, GDPR compliant"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <span style={{ color: theme.teal, minWidth: 8 }}>▸</span>
              <div>
                <span style={{ color: theme.text, fontWeight: 600, fontSize: 13 }}>{k}: </span>
                <span style={{ color: theme.textMuted, fontSize: 13 }}>{v}</span>
              </div>
            </div>
          ))}
        </Card>
      </div>
      <Card>
        <div style={{ color: theme.gold, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 14 }}>BACK-OF-ENVELOPE ESTIMATES</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {[
            ["1.5B", "Swipes/day", theme.accent],
            ["~17K", "Swipes/sec (peak ~50K)", theme.blue],
            ["5M", "Matches/day", theme.teal],
            ["10TB+", "Photo storage/day", theme.purple],
          ].map(([num, label, color]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ color, fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em" }}>{num}</div>
              <div style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  ),

  hld: () => (
    <div>
      <SectionTitle sub="High-Level Design — services, data flow, and component responsibilities">Architecture Overview</SectionTitle>

      {/* Architecture Diagram */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ color: theme.blue, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 16 }}>SYSTEM ARCHITECTURE DIAGRAM</div>
        {/* Client Layer */}
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 12 }}>
          {["iOS Client", "Android Client", "Web Client"].map(c => (
            <div key={c} style={{ background: `${theme.accent}18`, border: `1px solid ${theme.accent}44`, borderRadius: 8, padding: "8px 16px", color: theme.accent, fontSize: 12, fontWeight: 700 }}>{c}</div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <div style={{ width: 1, height: 20, background: theme.border }} />
        </div>
        {/* CDN + LB */}
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 12 }}>
          <div style={{ background: `${theme.gold}18`, border: `1px solid ${theme.gold}44`, borderRadius: 8, padding: "8px 16px", color: theme.gold, fontSize: 12, fontWeight: 700 }}>CDN (CloudFront)</div>
          <div style={{ background: `${theme.gold}18`, border: `1px solid ${theme.gold}44`, borderRadius: 8, padding: "8px 16px", color: theme.gold, fontSize: 12, fontWeight: 700 }}>API Gateway + WAF</div>
          <div style={{ background: `${theme.gold}18`, border: `1px solid ${theme.gold}44`, borderRadius: 8, padding: "8px 16px", color: theme.gold, fontSize: 12, fontWeight: 700 }}>Load Balancer (L7)</div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <div style={{ width: 1, height: 20, background: theme.border }} />
        </div>
        {/* Services */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 12 }}>
          {[
            ["Auth Service", theme.purple],
            ["Profile Service", theme.blue],
            ["Discovery Service", theme.accent],
            ["Swipe Service", theme.accent],
            ["Match Service", theme.teal],
            ["Chat Service", theme.teal],
          ].map(([name, color]) => (
            <div key={name} style={{ background: `${color}18`, border: `1px solid ${color}44`, borderRadius: 8, padding: "8px 6px", color, fontSize: 11, fontWeight: 700, textAlign: "center" }}>{name}</div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <div style={{ width: 1, height: 20, background: theme.border }} />
        </div>
        {/* Message Bus */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <div style={{ background: `${theme.gold}18`, border: `1px dashed ${theme.gold}66`, borderRadius: 8, padding: "8px 32px", color: theme.gold, fontSize: 12, fontWeight: 700 }}>↔ Kafka Event Bus (swipe-events, match-events, notification-events) ↔</div>
        </div>
        {/* Data Layer */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
          {[
            ["PostgreSQL\n(Profiles)", theme.blue],
            ["Cassandra\n(Swipes)", theme.purple],
            ["Redis\n(Swipe Deck Cache)", theme.accent],
            ["MongoDB\n(Chat/Messages)", theme.teal],
            ["Elasticsearch\n(Geo Discovery)", theme.gold],
          ].map(([name, color]) => (
            <div key={name} style={{ background: `${color}10`, border: `1px solid ${color}33`, borderRadius: 8, padding: "8px 4px", color, fontSize: 10, fontWeight: 700, textAlign: "center", whiteSpace: "pre-line" }}>{name}</div>
          ))}
        </div>
      </Card>

      {/* Services Detail */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {[
          {
            name: "Discovery Service", color: theme.accent,
            desc: "Pre-computes swipe decks for each user. Runs geo + filter queries against Elasticsearch, scores candidates via ML model, stores ranked deck in Redis with TTL.",
            pattern: "Read-heavy. Fan-out-on-read. Redis cache per user (key: deck:{userId}).",
            tech: ["Elasticsearch", "Redis", "Geo-hash", "ML Ranking"]
          },
          {
            name: "Swipe Service", color: theme.purple,
            desc: "Processes swipe events. Writes to Cassandra (append-only). Publishes to Kafka. Rate-limits free users (100 likes/12hr). Idempotent via swipe dedup key.",
            pattern: "Write-heavy. Fire-and-forget. Idempotency via (userId, targetId) unique key.",
            tech: ["Cassandra", "Kafka", "Redis (rate-limit)", "Idempotency Keys"]
          },
          {
            name: "Match Service", color: theme.teal,
            desc: "Consumes Kafka swipe events. Checks if target already swiped right on actor. If mutual, creates match record, triggers notification event, unlocks chat.",
            pattern: "Event-driven consumer. Optimistic check in Cassandra. Strong consistency for match write.",
            tech: ["Kafka Consumer", "Cassandra", "PostgreSQL (matches)", "Push Notif"]
          },
          {
            name: "Chat Service", color: theme.blue,
            desc: "WebSocket-based real-time messaging. Persistent connections per user. Fan-out to recipients. Messages stored in MongoDB. Offline delivery via APNs/FCM.",
            pattern: "WebSocket + pub/sub. Redis for presence. Offline queue in Kafka.",
            tech: ["WebSocket", "Redis Pub/Sub", "MongoDB", "Kafka (offline)"]
          },
        ].map(({ name, color, desc, pattern, tech }) => (
          <Card key={name}>
            <div style={{ color, fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", marginBottom: 8 }}>{name}</div>
            <p style={{ color: theme.textMuted, fontSize: 12, lineHeight: 1.6, marginBottom: 10 }}>{desc}</p>
            <div style={{ background: `${color}10`, borderLeft: `3px solid ${color}`, padding: "6px 10px", borderRadius: "0 4px 4px 0", marginBottom: 10 }}>
              <span style={{ color: theme.textDim, fontSize: 10, fontWeight: 700 }}>PATTERN: </span>
              <span style={{ color: theme.textMuted, fontSize: 11 }}>{pattern}</span>
            </div>
            <div>{tech.map(t => <Tag key={t} c={color}>{t}</Tag>)}</div>
          </Card>
        ))}
      </div>
    </div>
  ),

  discovery: () => (
    <div>
      <SectionTitle sub="The core differentiator — how Tinder serves swipe cards at scale">Discovery & Recommendation Engine</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <div style={{ color: theme.accent, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 12 }}>DECK PRECOMPUTATION FLOW</div>
          {[
            ["1", "User opens app → check Redis for cached deck (TTL 1hr)", theme.blue],
            ["2", "Cache MISS → trigger deck rebuild asynchronously", theme.purple],
            ["3", "Elasticsearch geo-query: radius filter (e.g. 25mi)", theme.teal],
            ["4", "Apply preference filters: age, gender, distance", theme.gold],
            ["5", "Score candidates via ML (ELO-like attractiveness + activity)", theme.accent],
            ["6", "Exclude already-swiped (Bloom filter check)", theme.blue],
            ["7", "Write top-200 candidates to Redis: ZADD deck:{uid}", theme.purple],
            ["8", "Client paginates: ZRANGE deck:{uid} 0 19", theme.teal],
          ].map(([n, text, color]) => (
            <div key={n} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
              <div style={{ background: color, color: "#000", borderRadius: "50%", width: 20, height: 20, minWidth: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900 }}>{n}</div>
              <span style={{ color: theme.textMuted, fontSize: 12, lineHeight: 1.5 }}>{text}</span>
            </div>
          ))}
        </Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <div style={{ color: theme.gold, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 10 }}>ELO / DESIRABILITY SCORE</div>
            <p style={{ color: theme.textMuted, fontSize: 12, lineHeight: 1.6 }}>Each user has a hidden <span style={{ color: theme.gold, fontWeight: 700 }}>desirability score</span> updated via ELO-like algorithm:</p>
            <div style={{ background: `${theme.gold}10`, borderRadius: 8, padding: 12, marginTop: 8, fontFamily: "monospace", fontSize: 12 }}>
              <div style={{ color: theme.gold }}>newScore = oldScore + K × (outcome − expected)</div>
              <div style={{ color: theme.textDim, marginTop: 4 }}>K = 32, outcome ∈ [0,1], expected = f(scoreDelta)</div>
            </div>
            <p style={{ color: theme.textMuted, fontSize: 12, lineHeight: 1.6, marginTop: 8 }}>Users shown to similarly-scored users. High-score users get shown first in others' decks. Score updated async via Kafka consumer.</p>
          </Card>
          <Card>
            <div style={{ color: theme.teal, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 10 }}>BLOOM FILTER FOR SEEN USERS</div>
            <p style={{ color: theme.textMuted, fontSize: 12, lineHeight: 1.6 }}>Storing every (user, seen) pair in Cassandra for exclusion would be too slow. Instead:</p>
            <div style={{ marginTop: 8 }}>
              {[
                "Bloom filter per user stored in Redis (Bit array)",
                "False positive rate ~1% — occasionally re-show seen profiles (acceptable)",
                "Size: ~10MB per user for 10M seen entries",
                "Reset bloom filter periodically for re-engagement",
              ].map((t, i) => <div key={i} style={{ color: theme.textMuted, fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: theme.teal }}>✓ </span>{t}
              </div>)}
            </div>
          </Card>
        </div>
      </div>
      <Card>
        <div style={{ color: theme.purple, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 12 }}>GEO-INDEXING STRATEGY</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {[
            { title: "Geohash Bucketing", color: theme.blue, desc: "Encode lat/lng to geohash string. Index in Elasticsearch. Query adjacent geohash cells to avoid boundary issues. Precision 6 = ~1.2km cells." },
            { title: "Location Updates", color: theme.teal, desc: "Client sends location every 5 min (background) or on app open. Fuzzing applied: ±0.5km for privacy. Write to Redis GEO (GEOADD) + async sync to Elasticsearch." },
            { title: "Redis GEO Commands", color: theme.purple, desc: "GEOADD users:geo lng lat userId\nGEORADIUS users:geo lng lat 25 mi ASC COUNT 500\nO(N+log(M)) — extremely fast for nearby queries." },
          ].map(({ title, color, desc }) => (
            <div key={title}>
              <div style={{ color, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{title}</div>
              <p style={{ color: theme.textMuted, fontSize: 12, lineHeight: 1.6, fontFamily: desc.includes("GEOADD") ? "monospace" : "inherit", whiteSpace: "pre-line" }}>{desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  ),

  swipe: () => (
    <div>
      <SectionTitle sub="Swipe processing, match detection, and event-driven architecture">Swipe & Match System</SectionTitle>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ color: theme.accent, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 16 }}>SWIPE EVENT FLOW</div>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
          {[
            { label: "Client Swipe", color: theme.accent },
            null,
            { label: "Swipe Service\n(Validate + Dedup)", color: theme.purple },
            null,
            { label: "Cassandra\nswipes table", color: theme.blue },
            null,
            { label: "Kafka\nswipe-events", color: theme.gold },
            null,
            { label: "Match Service\n(Consumer)", color: theme.teal },
            null,
            { label: "Match Created\n→ Notify", color: theme.teal },
          ].map((item, i) =>
            item === null ? <Arrow key={i} /> :
            <div key={i} style={{ background: `${item.color}18`, border: `1px solid ${item.color}44`, borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
              <span style={{ color: item.color, fontSize: 11, fontWeight: 700, whiteSpace: "pre-line" }}>{item.label}</span>
            </div>
          )}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <div style={{ color: theme.blue, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 12 }}>CASSANDRA SCHEMA — SWIPES</div>
          <div style={{ fontFamily: "monospace", fontSize: 12, color: theme.textMuted, lineHeight: 1.8 }}>
            <div style={{ color: theme.teal }}>CREATE TABLE swipes (</div>
            <div style={{ paddingLeft: 16, color: theme.text }}>  swiper_id   UUID,</div>
            <div style={{ paddingLeft: 16, color: theme.text }}>  swipee_id   UUID,</div>
            <div style={{ paddingLeft: 16, color: theme.accent }}>  direction   TINYINT,  <span style={{ color: theme.textDim }}>-- 1=right, 0=left</span></div>
            <div style={{ paddingLeft: 16, color: theme.text }}>  created_at  TIMESTAMP,</div>
            <div style={{ color: theme.teal }}>  PRIMARY KEY (swiper_id, swipee_id)</div>
            <div style={{ color: theme.teal }}>);</div>
            <div style={{ marginTop: 8, color: theme.textDim }}>-- Read: "Did B swipe right on A?"</div>
            <div style={{ color: theme.textMuted }}>SELECT direction FROM swipes</div>
            <div style={{ color: theme.textMuted }}>WHERE swiper_id=B AND swipee_id=A;</div>
          </div>
        </Card>
        <Card>
          <div style={{ color: theme.teal, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 12 }}>MATCH DETECTION LOGIC</div>
          <div style={{ fontFamily: "monospace", fontSize: 12, color: theme.textMuted, lineHeight: 1.8 }}>
            <div style={{ color: theme.textDim }}>// Kafka consumer: SwipeEvent</div>
            <div><span style={{ color: theme.blue }}>if</span> (event.direction == RIGHT) {"{"}</div>
            <div style={{ paddingLeft: 16 }}>reverse = cassandra.get(</div>
            <div style={{ paddingLeft: 32 }}>swiper=<span style={{ color: theme.accent }}>event.swipee</span>,</div>
            <div style={{ paddingLeft: 32 }}>swipee=<span style={{ color: theme.accent }}>event.swiper</span></div>
            <div style={{ paddingLeft: 16 }}>);</div>
            <div style={{ color: theme.blue }}>  if (reverse?.direction == RIGHT) {"{"}</div>
            <div style={{ paddingLeft: 32, color: theme.teal }}>createMatch(event.swiper, event.swipee);</div>
            <div style={{ paddingLeft: 32, color: theme.teal }}>publishNotification(...);</div>
            <div style={{ paddingLeft: 16 }}>{"}"}</div>
            <div>{"}"}</div>
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ color: theme.gold, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 12 }}>RATE LIMITING DESIGN</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {[
            { tier: "Free Users", limit: "100 right-swipes / 12hr", impl: "Redis sliding window counter. Key: ratelimit:swipe:{userId}. INCR + EXPIRE.", color: theme.textMuted },
            { tier: "Gold Users", limit: "Unlimited swipes", impl: "Skip rate limit middleware via JWT claim. tier=gold bypasses Redis check.", color: theme.gold },
            { tier: "Boost Mode", limit: "Priority in decks for 30 min", impl: "Redis sorted set. boosts:{region} ZADD with expiry score. Discovery reads this set first.", color: theme.accent },
          ].map(({ tier, limit, impl, color }) => (
            <div key={tier}>
              <div style={{ color, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{tier}</div>
              <div style={{ color: theme.accent, fontSize: 11, marginBottom: 6 }}>{limit}</div>
              <div style={{ color: theme.textMuted, fontSize: 11, lineHeight: 1.6 }}>{impl}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  ),

  chat: () => (
    <div>
      <SectionTitle sub="Real-time messaging, WebSocket architecture, and offline delivery">Chat & Messaging System</SectionTitle>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ color: theme.teal, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 16 }}>WEBSOCKET MESSAGE FLOW</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr 1fr", gap: 20 }}>
          <div>
            <div style={{ color: theme.accent, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>User A (Online)</div>
            {["Connect WS to Chat Server", "Authenticate via JWT", "Send message payload", "Receive ACK (msg_id)"].map((s, i) => (
              <div key={i} style={{ color: theme.textMuted, fontSize: 11, marginBottom: 6, paddingLeft: 8, borderLeft: `2px solid ${theme.accent}44` }}>{s}</div>
            ))}
          </div>
          <div style={{ background: `${theme.teal}08`, border: `1px solid ${theme.teal}22`, borderRadius: 8, padding: 16 }}>
            <div style={{ color: theme.teal, fontWeight: 700, fontSize: 13, marginBottom: 10, textAlign: "center" }}>Chat Service (Stateful Pod)</div>
            {[
              ["Validate match exists (PostgreSQL)", theme.blue],
              ["Persist message to MongoDB", theme.purple],
              ["Publish to Redis pub/sub channel: chat:{matchId}", theme.teal],
              ["Other Chat Server subscribed → push to User B's WS", theme.gold],
              ["ACK sent back to sender with message_id + timestamp", theme.accent],
            ].map(([step, color], i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <span style={{ color, minWidth: 14, fontSize: 12 }}>→</span>
                <span style={{ color: theme.textMuted, fontSize: 11 }}>{step}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ color: theme.blue, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>User B</div>
            <div style={{ color: theme.teal, fontWeight: 700, fontSize: 12, marginBottom: 6 }}>Online:</div>
            {["Different WS server", "Subscribed to same Redis channel", "Real-time delivery"].map((s, i) => (
              <div key={i} style={{ color: theme.textMuted, fontSize: 11, marginBottom: 6, paddingLeft: 8, borderLeft: `2px solid ${theme.blue}44` }}>{s}</div>
            ))}
            <div style={{ color: theme.purple, fontWeight: 700, fontSize: 12, marginBottom: 6, marginTop: 10 }}>Offline:</div>
            {["Message queued in Kafka", "Push via APNs/FCM", "Delivered on reconnect"].map((s, i) => (
              <div key={i} style={{ color: theme.textMuted, fontSize: 11, marginBottom: 6, paddingLeft: 8, borderLeft: `2px solid ${theme.purple}44` }}>{s}</div>
            ))}
          </div>
        </div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ color: theme.purple, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 12 }}>MONGODB SCHEMA — MESSAGES</div>
          <div style={{ fontFamily: "monospace", fontSize: 12, color: theme.textMuted, lineHeight: 1.8 }}>
            <div style={{ color: theme.teal }}>{"{"}</div>
            <div style={{ paddingLeft: 16 }}><span style={{ color: theme.blue }}>_id</span>: ObjectId,</div>
            <div style={{ paddingLeft: 16 }}><span style={{ color: theme.blue }}>match_id</span>: UUID,   <span style={{ color: theme.textDim }}>// shard key</span></div>
            <div style={{ paddingLeft: 16 }}><span style={{ color: theme.blue }}>sender_id</span>: UUID,</div>
            <div style={{ paddingLeft: 16 }}><span style={{ color: theme.blue }}>content</span>: String,  <span style={{ color: theme.textDim }}>// encrypted</span></div>
            <div style={{ paddingLeft: 16 }}><span style={{ color: theme.blue }}>type</span>: Enum,       <span style={{ color: theme.textDim }}>// text/gif/emoji</span></div>
            <div style={{ paddingLeft: 16 }}><span style={{ color: theme.blue }}>created_at</span>: ISODate,</div>
            <div style={{ paddingLeft: 16 }}><span style={{ color: theme.blue }}>read_at</span>: ISODate | null</div>
            <div style={{ color: theme.teal }}>{"}"}</div>
            <div style={{ marginTop: 8, color: theme.textDim }}>Index: {"{ match_id: 1, created_at: -1 }"}</div>
          </div>
        </Card>
        <Card>
          <div style={{ color: theme.gold, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 12 }}>SCALE CONSIDERATIONS</div>
          {[
            ["Connection Load", "50M DAU, ~10M concurrent WS. Horizontal scale Chat pods behind NLB. Sticky sessions not needed — Redis pub/sub decouples servers.", theme.blue],
            ["Presence Service", "Heartbeat every 30s. Redis SETEX presence:{uid} 35 1. Expiry = implicit offline detection.", theme.teal],
            ["Message Ordering", "Client-side: optimistic display by timestamp. Server: Mongo ObjectId (time-based) ensures order per match.", theme.purple],
          ].map(([title, desc, color]) => (
            <div key={title} style={{ marginBottom: 12 }}>
              <div style={{ color, fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{title}</div>
              <div style={{ color: theme.textMuted, fontSize: 11, lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  ),

  lld: () => (
    <div>
      <SectionTitle sub="Class design, API contracts, and design patterns used">Low-Level Design & Patterns</SectionTitle>
      
      {/* Design Patterns */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ color: theme.accent, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 16 }}>DESIGN PATTERNS APPLIED</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          {[
            { pattern: "Strategy", where: "Scoring / Ranking", desc: "SwipeRankingStrategy interface with impl: ELOStrategy, ActivityStrategy, BoostStrategy. Swapped at runtime.", color: theme.accent },
            { pattern: "Observer", where: "Match Events", desc: "MatchEventPublisher notifies observers: NotificationObserver, ChatRoomObserver, AnalyticsObserver on match.", color: theme.blue },
            { pattern: "Factory", where: "Notification Delivery", desc: "NotificationFactory.create(platform) → APNsNotifier | FCMNotifier | WebPushNotifier", color: theme.teal },
            { pattern: "Repository", where: "Data Access", desc: "SwipeRepository, ProfileRepository abstract Cassandra/Postgres. Testable, swappable storage.", color: theme.purple },
            { pattern: "CQRS", where: "Discovery", desc: "Write path: Swipe events → Cassandra. Read path: Pre-materialized deck from Redis. Separate models.", color: theme.gold },
            { pattern: "Circuit Breaker", where: "Inter-service calls", desc: "Hystrix/Resilience4j on Discovery→Elasticsearch. Half-open probing. Fallback: serve stale deck.", color: theme.accent },
            { pattern: "Saga (Choreography)", where: "Match Creation", desc: "Distributed tx: Swipe event → Match Service → Notification Service → Chat Init, each via Kafka. No 2PC.", color: theme.blue },
            { pattern: "Decorator", where: "Swipe Service", desc: "SwipeService wrapped by: RateLimitDecorator → DeduplicationDecorator → AuditLogDecorator → CoreSwipeService", color: theme.teal },
            { pattern: "Bulkhead", where: "Resource Isolation", desc: "Separate thread pools for Premium vs Free users. Premium deck refresh never starved by free tier load.", color: theme.purple },
          ].map(({ pattern, where, desc, color }) => (
            <div key={pattern} style={{ background: `${color}08`, border: `1px solid ${color}22`, borderRadius: 8, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <span style={{ color, fontWeight: 800, fontSize: 13 }}>{pattern}</span>
                <Badge color={color}>{where}</Badge>
              </div>
              <p style={{ color: theme.textMuted, fontSize: 11, lineHeight: 1.6, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* API Contracts */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ color: theme.blue, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 14 }}>KEY API CONTRACTS</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            {
              endpoint: "GET /v1/discovery/deck",
              desc: "Returns paginated swipe deck for current user.",
              params: "?lat=&lng=&limit=20&cursor=",
              response: `{ profiles: [{id, name, age, photos[], bio, distance}], nextCursor, deckExpiresAt }`,
              color: theme.teal
            },
            {
              endpoint: "POST /v1/swipes",
              desc: "Record a swipe. Idempotent.",
              params: "Body: { swipee_id, direction: 'like'|'pass'|'superlike' }",
              response: `{ swipe_id, matched: bool, match_id?: UUID }`,
              color: theme.accent
            },
            {
              endpoint: "GET /v1/matches",
              desc: "List all matches for authenticated user.",
              params: "?limit=50&cursor=&since=timestamp",
              response: `{ matches: [{match_id, user, lastMessage, unread}], nextCursor }`,
              color: theme.purple
            },
            {
              endpoint: "POST /v1/messages",
              desc: "Send message to a match.",
              params: "Body: { match_id, content, type: 'text'|'gif' }",
              response: `{ message_id, created_at, status: 'sent' }`,
              color: theme.blue
            },
          ].map(({ endpoint, desc, params, response, color }) => (
            <div key={endpoint} style={{ background: `${color}08`, border: `1px solid ${color}22`, borderRadius: 8, padding: 12 }}>
              <div style={{ color, fontFamily: "monospace", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{endpoint}</div>
              <div style={{ color: theme.textMuted, fontSize: 11, marginBottom: 8 }}>{desc}</div>
              <div style={{ color: theme.textDim, fontSize: 10, fontFamily: "monospace", marginBottom: 4 }}>Params: {params}</div>
              <div style={{ background: theme.bg, borderRadius: 6, padding: 8, fontFamily: "monospace", fontSize: 10, color: theme.textMuted }}>{response}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Failure Modes */}
      <Card>
        <div style={{ color: theme.gold, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 14 }}>FAILURE MODES & MITIGATIONS</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { fail: "Elasticsearch down", impact: "Discovery fails", fix: "Fallback to Redis stale deck. Circuit breaker opens. Alert on-call." },
            { fail: "Kafka consumer lag", impact: "Match notification delayed", fix: "Consumer group scaling. Lag monitored. SLA: match delivered < 2s p99." },
            { fail: "Redis eviction under pressure", impact: "Deck cache miss storm", fix: "maxmemory-policy: allkeys-lru. Fallback to DB with backpressure. Async rebuild." },
            { fail: "Duplicate swipe processed", impact: "False match or double write", fix: "Cassandra upsert (LWT): INSERT IF NOT EXISTS. Kafka idempotent producer." },
            { fail: "WS server crash", impact: "Users lose connection", fix: "Client auto-reconnects. Messages re-fetched via REST on reconnect. Kafka offline queue." },
            { fail: "Hot user (celebrity)", impact: "Swipe write hotspot", fix: "Cassandra partition by swiper_id avoids swipee hotspot. Rate-limit incoming swipes." },
          ].map(({ fail, impact, fix }) => (
            <div key={fail} style={{ display: "flex", gap: 10, background: `${theme.gold}06`, border: `1px solid ${theme.gold}18`, borderRadius: 8, padding: 10 }}>
              <span style={{ color: theme.accent, fontSize: 16, lineHeight: 1 }}>⚠</span>
              <div>
                <div style={{ color: theme.text, fontWeight: 700, fontSize: 12 }}>{fail}</div>
                <div style={{ color: theme.accent, fontSize: 11, marginBottom: 4 }}>Impact: {impact}</div>
                <div style={{ color: theme.textMuted, fontSize: 11 }}>{fix}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  ),

  data: () => (
    <div>
      <SectionTitle sub="Database selection rationale, schemas, and data partitioning">Data Layer Deep Dive</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {[
          { db: "PostgreSQL", use: "User Profiles & Matches", why: "Strong consistency for match records. ACID guarantees. Relational: users ↔ matches ↔ preferences. Read replicas for profile reads.", color: theme.blue },
          { db: "Cassandra", use: "Swipe Records", why: "Write-heavy (17K/sec). Partition by swiper_id. Append-only. Linear scale. Eventual consistency OK. TTL on left-swipes (1 year).", color: theme.purple },
          { db: "Redis", use: "Deck Cache + Geo + Rate Limits + Presence", why: "Sub-ms reads for hot deck data. GEO commands. Atomic INCR for rate limiting. Pub/Sub for chat. TTL for all ephemeral data.", color: theme.accent },
          { db: "MongoDB", use: "Chat Messages", why: "Document model fits messages naturally. Sharded by match_id. Time-series index on created_at. Text encryption at rest. TTL for unmatch.", color: theme.teal },
          { db: "Elasticsearch", use: "Geo Discovery + Search", why: "Geo distance queries with filters. Scoring/boosting native support. Updated async from Postgres via CDC (Debezium). Not source of truth.", color: theme.gold },
          { db: "S3 + CDN", use: "Photo Storage", why: "S3 for durable object storage. CloudFront CDN with edge caching. Serve resized variants (thumbnail/full). Pre-signed URLs, 1hr expiry.", color: theme.textMuted },
        ].map(({ db, use, why, color }) => (
          <Card key={db}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ color, fontWeight: 800, fontSize: 16 }}>{db}</span>
              <Badge color={color}>{use}</Badge>
            </div>
            <p style={{ color: theme.textMuted, fontSize: 12, lineHeight: 1.6, margin: 0 }}>{why}</p>
          </Card>
        ))}
      </div>
      <Card>
        <div style={{ color: theme.blue, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 14 }}>POSTGRES SCHEMA — CORE TABLES</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, fontFamily: "monospace", fontSize: 11, color: theme.textMuted }}>
          {[
            {
              name: "users", color: theme.blue, fields: [
                ["id", "UUID PK"],["name", "VARCHAR(50)"],["dob", "DATE"],
                ["gender", "ENUM"],["bio", "TEXT"],["elo_score", "INT"],
                ["is_premium", "BOOL"],["created_at", "TIMESTAMPTZ"],
              ]
            },
            {
              name: "user_preferences", color: theme.purple, fields: [
                ["user_id", "UUID FK"],["min_age", "SMALLINT"],["max_age", "SMALLINT"],
                ["genders", "INT[]"],["max_distance_km", "SMALLINT"],
                ["show_me", "BOOL"],
              ]
            },
            {
              name: "matches", color: theme.teal, fields: [
                ["id", "UUID PK"],["user_a_id", "UUID FK"],["user_b_id", "UUID FK"],
                ["created_at", "TIMESTAMPTZ"],["unmatched_at", "TIMESTAMPTZ"],
                ["UNIQUE", "(user_a_id, user_b_id)"],
              ]
            }
          ].map(({ name, color, fields }) => (
            <div key={name}>
              <div style={{ color, fontWeight: 700, marginBottom: 8 }}>{name}</div>
              {fields.map(([col, type]) => (
                <div key={col} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: theme.text }}>{col}</span>
                  <span style={{ color: theme.textDim }}>{type}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  ),
};

const navItems = [
  { id: "overview", label: "Overview" },
  { id: "hld", label: "HLD" },
  { id: "discovery", label: "Discovery" },
  { id: "swipe", label: "Swipe & Match" },
  { id: "chat", label: "Chat" },
  { id: "lld", label: "LLD & Patterns" },
  { id: "data", label: "Data Layer" },
];

export default function TinderDesign() {
  const [active, setActive] = useState("overview");
  const Content = sections[active];

  return (
    <div style={{ background: theme.bg, minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", color: theme.text }}>
      {/* Header */}
      <div style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}`, padding: "16px 32px", display: "flex", alignItems: "center", gap: 20, position: "sticky", top: 0, zIndex: 100 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, background: `linear-gradient(135deg, ${theme.accent}, #FF8C42)`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🔥</div>
            <span style={{ color: theme.text, fontWeight: 900, fontSize: 18, letterSpacing: "-0.02em" }}>Tinder System Design</span>
            <Badge color={theme.gold}>SDE3 / FAANG</Badge>
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {["50M DAU", "1.5B swipes/day", "99.99% SLA"].map(t => (
            <Tag key={t} c={theme.textMuted}>{t}</Tag>
          ))}
        </div>
      </div>

      {/* Nav */}
      <div style={{ background: theme.surface, borderBottom: `1px solid ${theme.border}`, padding: "0 32px", display: "flex", gap: 4, overflowX: "auto" }}>
        {navItems.map(({ id, label }) => (
          <button key={id} onClick={() => setActive(id)} style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "12px 16px",
            color: active === id ? theme.accent : theme.textMuted,
            fontWeight: active === id ? 700 : 500,
            fontSize: 13,
            borderBottom: `2px solid ${active === id ? theme.accent : "transparent"}`,
            whiteSpace: "nowrap",
            transition: "all 0.15s",
          }}>{label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "32px", maxWidth: 1100, margin: "0 auto" }}>
        <Content />
      </div>
    </div>
  );
}
