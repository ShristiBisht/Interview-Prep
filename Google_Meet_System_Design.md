# Google Meet System Design: Complete Architecture & Analysis

## Table of Contents
1. [Executive Overview](#executive-overview)
2. [What is Google Meet](#what-is-google-meet)
3. [Core Architecture](#core-architecture)
4. [Media Handling & Codecs](#media-handling--codecs)
5. [Real-Time Communication Protocol](#real-time-communication-protocol)
6. [Network Optimization](#network-optimization)
7. [Scalability Architecture](#scalability-architecture)
8. [Recording & Transcription](#recording--transcription)
9. [Security Architecture](#security-architecture)
10. [Challenges & Solutions](#challenges--solutions)
11. [SDE3-Level Interview Questions](#sde3-level-interview-questions)

---

## Executive Overview

Google Meet serves **3B+ meetings annually** with millions of simultaneous conferences:

```
Real-time Statistics:
├─ Active concurrent meetings: 10M+
├─ Peak concurrent participants: 1B+ (globally)
├─ Average meeting duration: 45 minutes
├─ Participants per meeting: 1-500+ (varies)
├─ Video quality options: 360p → 1080p → 4K
├─ Supported platforms: Web, Android, iOS, Desktop apps
├─ Global data centers: 30+
└─ Network latency SLA: < 100ms (p99)

Key Metrics:
├─ Video frames/second: 30fps
├─ Audio sample rate: 48kHz
├─ Acceptable latency: < 250ms (one-way)
├─ Packet loss tolerance: 5-10%
├─ Codec support: VP9, H.264, H.265, AV1, Opus, AAC
└─ Encryption: End-to-end (E2EE) in some modes
```

### Why Google Meet is Complex

```
Real-time Communication Challenges:

Challenge 1: Latency
├─ Video takes milliseconds to encode/decode
├─ Network packet travel time: 10-200ms
├─ Processing: encoding, transmission, decoding
├─ Total: Must be < 250ms (acceptable for humans)
├─ If > 500ms: Feels like phone delay (bad UX)
└─ Solution: Optimize at every step

Challenge 2: Bandwidth Variability
├─ User on WiFi: 10Mbps
├─ User on mobile 4G: 2Mbps
├─ User on rural internet: 500Kbps
├─ Same call, different capabilities
├─ Solution: Adaptive bitrate (ABR)

Challenge 3: Packet Loss
├─ No internet is perfect
├─ Loss: 0.1% - 5% typical
├─ Loss: 20%+ on poor networks
├─ Video can't resend (too slow)
├─ Solution: Error correction codes + frame refresh

Challenge 4: Synchronization
├─ Video and audio must stay in sync
├─ Network delays vary
├─ Decoder buffers add delay
├─ Solution: Clever timestamping + jitter buffer

Challenge 5: Scale
├─ 1-to-1 call: Easy (direct connection)
├─ 10 people: 90 connections (fully mesh)
├─ 100 people: 9,900 connections (doesn't scale)
├─ Solution: Selective forwarding unit (SFU)

Challenge 6: Network NAT Traversal
├─ Home network: Behind firewall/NAT
├─ Can't receive incoming connections
├─ Need to establish connection outbound
├─ Solution: STUN + TURN servers
```

---

## What is Google Meet

### Meeting Types

```
Meeting Type 1: One-to-One
├─ Two participants
├─ Direct peer-to-peer (P2P) possible
├─ Lowest latency: 50-100ms
├─ Lowest bandwidth: 500Kbps per participant
├─ Example: Personal call

Meeting Type 2: Small Group (3-10 people)
├─ Uses SFU (Selective Forwarding Unit)
├─ Central server relays video
├─ Lower complexity than mesh
├─ Latency: 100-150ms
├─ Bandwidth: 1-3Mbps per participant
├─ Example: Team standup

Meeting Type 3: Large Meeting (50-300 people)
├─ Uses MCU (Multipoint Control Unit)
├─ Central server mixes video
├─ Only one composite video to each participant
├─ Latency: 200-300ms
├─ Bandwidth: 1-5Mbps (depends on layout)
├─ Example: Company all-hands

Meeting Type 4: Webinar (100-10,000+ people)
├─ Few speakers, many viewers
├─ Uses tree topology (distribution network)
├─ Viewers receive low-latency broadcast
├─ Latency: 2-10 seconds (acceptable for broadcast)
├─ Bandwidth: Minimal for viewers
├─ Example: Live event, product launch
```

### Key SDE3 Interview Insight

For large meetings, the architecture MUST change:
- **P2P Mesh**: O(n²) connections - impossible at scale
- **SFU**: O(n) - each person receives N-1 streams (bandwidth intensive)
- **MCU**: O(n) - each person receives 1 composite (CPU intensive)

**Choice depends on constraints**: Bandwidth vs CPU vs Latency

---

## Core Architecture

### High-Level System Overview

```
                    ┌─────────────────────────────────┐
                    │   Participant Devices           │
                    │  (Browser, Android, iOS, Desktop)
                    └──────────────┬──────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        │ (WebRTC Peer Connection) │ (Signaling)              │
        │                          │                          │
    ┌───▼────┐            ┌───────▼───────┐         ┌───────▼────┐
    │   P2P   │            │  Signaling    │         │ Metadata   │
    │ Stream  │            │  Service      │         │ Service    │
    │ (Media) │            │  (Establish   │         │ (User info)│
    └───┬────┘            │  connection)  │         └───────┬────┘
        │                 └───────────────┘                 │
        │                                                   │
    ┌───▼──────────────────────────────────────┐          │
    │  SFU/MCU                                  │          │
    │  (Selective Forwarding Unit /             │          │
    │   Multipoint Control Unit)                │          │
    │  ├─ Receive video from participants      │          │
    │  ├─ Transcode if needed                  │          │
    │  ├─ Mix/forward to other participants    │          │
    │  └─ Handle active speaker detection      │          │
    └───┬──────────────────────────────────────┘          │
        │                                                   │
        │ (Media + Control)                                │
        │                                                   │
    ┌───▴────────────────────────────────┐    ┌────────▴─────┐
    │  Backend Services                   │    │ Data Layer   │
    │  ├─ Recording Service               │    │ ├─ MySQL     │
    │  ├─ Transcription Service           │    │ ├─ Firestore │
    │  ├─ Live Translation Service        │    │ ├─ GCS       │
    │  ├─ Storage Service                 │    │ └─ Redis     │
    │  └─ Analytics Service               │    └─────────────┘
    └─────────────────────────────────────┘
```

---

## Key Components (SDE3 Deep Dive)

### Selective Forwarding Unit (SFU)

**SFU is the core of Google Meet's architecture for 3-300 person calls.**

```
Responsibilities:
├─ Receive media from each participant
├─ Forward to other participants (not mix)
├─ Monitor and adapt quality
├─ Detect active speaker
├─ Handle simulcast (multiple bitrates)
└─ Maintain per-participant state

Per Participant:
├─ Upload: 1 incoming stream (user → SFU)
├─ Download: N-1 incoming streams (others → user)
├─ Bandwidth per user: ~1.5 Mbps × N (download heavy)

Example: 5 participants, each 1.5 Mbps:
├─ User 1 sends: 1.5 Mbps (to SFU)
├─ User 1 receives: 1.5 × 4 = 6 Mbps (from others)
├─ User 1 total: 7.5 Mbps (significant!)
├─ SFU bandwidth: 5 × 1.5 × 2 = 15 Mbps total
└─ Scales linearly with participants

Simulcast Optimization:

Send 3 bitrate versions from each user:
├─ High: 2 Mbps, 1080p (for large screen)
├─ Medium: 1 Mbps, 720p (for normal screen)
├─ Low: 300 Kbps, 360p (for thumbnail)

Each receiver picks based on:
├─ Available bandwidth
├─ Screen size (where participant displayed)
├─ Device capability
└─ Connection quality

Smart forwarding:
├─ Active speaker: Send High stream to all
├─ Visible participants: Send Medium stream
├─ Background: Send Low stream (or no video)
└─ Result: Efficient bandwidth usage
```

### Multipoint Control Unit (MCU)

**MCU for large meetings (50-300 people) - used when bandwidth matters more than latency.**

```
Responsibilities:
├─ Receive all participant videos
├─ Composite into single grid layout
├─ Encode composite stream
├─ Send one stream to each participant
└─ Smart layout management

Tradeoff:
├─ Server-side CPU VERY high (transcode all)
├─ Client-side bandwidth LOW (receive 1 stream)
├─ Latency higher (processing time)
└─ When to use: > 50 people

Example: 100 participants

MCU approach:
├─ Receive: 100 video streams (5 Mbps total)
├─ Process: Composite into grid
├─ Encode: 100 different composites
│  ├─ Each composite slightly different
│  ├─ Why: Each user sees different layout
│  └─ (Or send same composite to all, less personalized)
├─ Send: 100 streams × 2 Mbps = 200 Mbps
└─ CPU: 200+ cores for 100 people (very expensive)

SFU approach (same 100 people):
├─ Forward: 100 × 100 streams = 10,000 streams
├─ Bandwidth: 100 people × 99 × 1.5 Mbps = 14,850 Mbps
└─ Impossible: User bandwidth insufficient

Result: MCU MANDATORY for 100+, despite CPU cost
```

---

## Latency Analysis (SDE3 Critical)

### Complete End-to-End Breakdown

```
User A speaks at T=0ms
User B hears at T=?ms

Timeline:

[0-10ms] Audio Capture
├─ Microphone captures sound wave
├─ Samples at 48kHz (20.8µs per sample)
├─ Collects into 20ms frames
└─ Fixed latency: ~10-20ms (unavoidable)

[10-40ms] Audio Processing
├─ Noise suppression (remove background)
├─ Echo cancellation (remove speaker echo)
├─ Automatic gain control (normalize volume)
├─ Total: 30ms processing
└─ Low-latency optimizations reduce to 20ms

[40-60ms] Audio Encoding (Opus)
├─ Frame of PCM audio → Opus compressed
├─ Opus frame: 20ms audio
├─ Encoding latency: 10-15ms
├─ Packetization: 5ms
└─ Result: Compressed RTP packet

[60-110ms] Network Transmission
├─ UDP packet sent to SFU
├─ Routing through internet: 20-50ms (typical)
├─ SFU receives: ~50ms
└─ Geographic dependent (same region: 10-20ms)

[110-160ms] Jitter Buffer (Receiver side)
├─ Receiver has buffer: Smooth playback
├─ Accounts for packet variance
├─ Typical buffer: 20-40ms
├─ Balances: Jitter robustness vs latency
└─ Result: Smooth audio delivery

[160-180ms] Audio Decoding
├─ Opus decompression
├─ PCM samples recovered
├─ Low latency: 5-15ms (highly optimized)
└─ Result: Raw audio ready

[180-200ms] Playback
├─ Audio device (speaker) queuing
├─ System buffering
├─ Sound emerges from speaker
└─ Minimal: 10-20ms

Total one-way: ~100-150ms
- Median: ~120ms (excellent)
- P99: ~150ms (still good)
- Acceptable: < 250ms

Video (Much More Complex):

[0-5ms] Video Capture
├─ Camera sensor captures frame
├─ Vsync timing: 16ms (60Hz refresh)
└─ Fixed: Very small latency

[5-35ms] Video Processing
├─ Format conversion (YUV → RGB, etc)
├─ Resizing (if needed)
├─ Preprocessing (low-light boost, etc)
└─ Variable: 20-30ms

[35-85ms] Video Encoding
├─ VP9/H.264 compression
├─ Motion estimation (compare to previous)
├─ Entropy encoding (bitstream generation)
├─ In low-latency mode: 40-60ms
├─ Hardware accelerated: 15-30ms (preferred)
└─ VP9 (slower) vs H.264 (faster)

[85-135ms] Network Transmission
├─ Network latency (same as audio): 50ms
└─ Similar geographic dependency

[135-185ms] Jitter Buffer
├─ Video packets may arrive out of order
├─ Larger buffer than audio: 30-50ms
├─ Why: Video more jitter-sensitive
└─ Balances: Multiple frame dependencies vs latency

[185-235ms] Video Decoding
├─ Bitstream → Raw frames
├─ Hardware accelerated: 15-30ms
├─ Inter-frame dependencies: May wait for reference
└─ Variable: 30-60ms

[235-275ms] Rendering + Sync
├─ GPU rendering to screen
├─ Audio/video sync alignment
├─ Wait for audio (critical)
└─ Variable: 20-40ms

Total for video: ~200-300ms one-way
- Median: ~220ms (acceptable)
- P99: ~300ms (edge of acceptable)
- Acceptable: < 400ms for video call

Interesting Observation:
├─ Audio latency: ~120ms (can feel natural)
├─ Video latency: ~220ms (can't feel real-time)
├─ But OK: Humans expect video lag more than audio
└─ Audio lag > 250ms: Feels like poor call quality

Key SDE3 Insight:
Audio and video latencies DON'T MATCH, but that's OK
because:
├─ Audio must sync with video (keep latencies close)
├─ Both < 250ms acceptable
├─ The longer one (video) determines feel
└─ Optimize: Reduce video encoding latency (use HW)
```

### Latency Optimization Techniques

```
Reduce Capture Latency:
├─ Already minimal (10-20ms: physics limit)
├─ Can't reduce further without new hardware
└─ Accept this baseline

Reduce Processing Latency:
├─ GPU acceleration for processing
├─ Low-latency algorithms for:
│  ├─ Noise suppression (skip complex models)
│  ├─ Echo cancellation (use faster methods)
│  └─ Gain control (simpler auto-gain)
└─ Result: Save 10-15ms

Reduce Encoding Latency:
├─ Use hardware encoder (GPU)
│  ├─ Software VP9: 80-100ms
│  ├─ Hardware H.264: 15-30ms
│  └─ ~70ms saved!
├─ Low-latency codec mode
│  ├─ Skip complex motion estimation
│  ├─ Use faster algorithms
│  ├─ Bitrate increase: 10-20%
│  └─ Latency decrease: 30-50ms
└─ Trade: Quality down 5-10%

Reduce Network Latency:
├─ Can't improve speed of light (physics)
├─ Best: Geo-distributed servers (nearby)
├─ USA ↔ Europe: Minimum 40-50ms (ocean)
├─ Same region: 5-20ms
└─ Place servers in 30+ data centers globally

Reduce Jitter Buffer:
├─ Start small: 10ms
├─ Grow only if needed
├─ Use predictive algorithms
├─ Playback speed adjustment (imperceptible)
└─ Save: 10-20ms

Reduce Decoding Latency:
├─ Hardware accelerated decoding
├─ Parallel frame decoding
├─ Low-latency decode modes
└─ Save: 15-30ms

Typical Optimization Results:

Before:
├─ Capture: 15ms
├─ Processing: 30ms
├─ Encoding: 70ms (software)
├─ Network: 50ms
├─ Jitter buffer: 40ms
├─ Decoding: 40ms (software)
├─ Total: 245ms (edge acceptable)

After (all optimizations):
├─ Capture: 15ms (no change: physics)
├─ Processing: 15ms (-15ms via GPU)
├─ Encoding: 25ms (-45ms via hardware)
├─ Network: 50ms (no change: physics)
├─ Jitter buffer: 20ms (-20ms via smart sizing)
├─ Decoding: 15ms (-25ms via hardware)
├─ Total: 140ms (MUCH better!)

Key Result:
├─ Reduced by 105ms (43%)
├─ Hardware matters A LOT
└─ Google Meet optimizes this heavily
```

---

## Adaptive Bitrate Algorithm (ABR)

### Real-time Quality Adaptation

```
The Problem:
├─ User bandwidth: Highly variable
├─ Network conditions: Change every second
├─ Must adapt: Without interruption
├─ Target: Best quality possible without stalling

The Solution: Continuous Measurement + Adjustment

Every 1 second (during call):

[Step 1] Measure Network Health
├─ Packet loss: Extract from RTCP report
├─ RTT (Round Trip Time): From RTCP measurements
├─ Buffer level: How full is jitter buffer
└─ Trends: Is it improving or degrading?

[Step 2] Estimate Available Bandwidth
├─ Loss-based:
│  ├─ Loss > 5%: Probably 500 Kbps
│  ├─ Loss 2-5%: Probably 1-2 Mbps
│  └─ Loss < 1%: Probably > 2 Mbps
├─ RTT-based:
│  ├─ RTT increasing: Congestion, reduce
│  ├─ RTT stable: Good
│  └─ RTT decreasing: Network improving
├─ Buffer-based:
│  ├─ Buffer < 10%: Starving, reduce
│  ├─ Buffer 40-60%: Goldilocks zone
│  └─ Buffer > 80%: Full, can increase
└─ Combined: Weighted average

[Step 3] Select Target Bitrate
Available steps:
├─ 500 Kbps → 360p @ 15fps (minimum)
├─ 1.0 Mbps → 480p @ 30fps
├─ 1.5 Mbps → 720p @ 30fps
├─ 2.5 Mbps → 1080p @ 30fps
└─ 4.0 Mbps → 1080p @ 60fps (premium)

Selection:
├─ If estimated_bw > 2.0 Mbps: Select 2.5 Mbps
├─ If estimated_bw > 1.2 Mbps: Select 1.5 Mbps
├─ If estimated_bw > 0.8 Mbps: Select 1.0 Mbps
└─ If estimated_bw < 0.8 Mbps: Select 500 Kbps

[Step 4] Apply Change (Carefully!)

Reducing bitrate (congestion detected):
├─ Action: Reduce IMMEDIATELY
├─ Reason: Prevent stalling (freezing video)
├─ Magnitude: 30-50% reduction (aggressive)
├─ Example: 2.5 Mbps → 1.5 Mbps or 1.0 Mbps
├─ Transition time: 200-500ms (smooth)
└─ User perception: Blurry for a second (OK)

Increasing bitrate (network improving):
├─ Action: Increase SLOWLY
├─ Reason: Don't overshoot (cause congestion again)
├─ Magnitude: 10-20% per step (conservative)
├─ Example: 1.0 → 1.5 Mbps (wait) → 2.5 Mbps
├─ Time between steps: 5-10 seconds
└─ User perception: Quality gradually improves (good UX)

Asymmetric Strategy:
├─ Reduce: Fast (prevent stalling)
├─ Increase: Slow (avoid oscillation)
└─ Result: Stable, recovers gracefully from congestion
```

### Real Code Example

```python
class AdaptiveBitrateController:
    def __init__(self):
        self.current_bitrate_kbps = 1000
        self.last_update_time = now()
        self.measurement_history = []
        
    def on_rtcp_report(self, report):
        """Called ~every 1 second with network measurements"""
        
        # Extract measurements
        loss_rate = report.packets_lost / report.packets_sent
        rtt_ms = report.round_trip_time
        buffer_ms = report.jitter_buffer_level
        
        # Estimate available bandwidth from loss
        if loss_rate > 0.05:
            loss_estimate_kbps = 500
        elif loss_rate > 0.02:
            loss_estimate_kbps = 1200
        else:
            loss_estimate_kbps = self.current_bitrate_kbps * 1.2
        
        # Estimate from RTT trend
        if len(self.measurement_history) > 0:
            prev_rtt = self.measurement_history[-1]['rtt']
            rtt_delta = (rtt_ms - prev_rtt) / prev_rtt
            if rtt_delta > 0.2:  # 20% increase
                rtt_estimate_kbps = self.current_bitrate_kbps * 0.85
            elif rtt_delta < -0.1:  # 10% decrease
                rtt_estimate_kbps = self.current_bitrate_kbps * 1.15
            else:
                rtt_estimate_kbps = self.current_bitrate_kbps
        else:
            rtt_estimate_kbps = self.current_bitrate_kbps
        
        # Estimate from buffer
        if buffer_ms < 100:
            buffer_estimate_kbps = self.current_bitrate_kbps * 0.7
        elif buffer_ms > 500:
            buffer_estimate_kbps = self.current_bitrate_kbps * 1.2
        else:
            buffer_estimate_kbps = self.current_bitrate_kbps
        
        # Weighted combination
        estimated_bw = (
            0.5 * loss_estimate_kbps +
            0.3 * rtt_estimate_kbps +
            0.2 * buffer_estimate_kbps
        )
        
        # Add safety margin (keep 30% headroom)
        target_bitrate = estimated_bw * 0.7
        
        # Select bitrate step
        bitrate_steps = [500, 1000, 1500, 2500, 4000]
        selected_bitrate = 500
        for step in bitrate_steps:
            if step <= target_bitrate:
                selected_bitrate = step
            else:
                break
        
        # Decide whether to update
        time_since_update = now() - self.last_update_time
        bitrate_delta = abs(selected_bitrate - self.current_bitrate_kbps)
        
        # Update if:
        # 1) Significant change (> 200 Kbps) OR
        # 2) Haven't updated in 10 seconds
        if bitrate_delta > 200 or time_since_update > 10000:
            self.update_encoder_bitrate(selected_bitrate)
            self.current_bitrate_kbps = selected_bitrate
            self.last_update_time = now()
        
        # Store for trending
        self.measurement_history.append({
            'rtt': rtt_ms,
            'loss': loss_rate,
            'buffer': buffer_ms,
            'time': now()
        })
        if len(self.measurement_history) > 20:
            self.measurement_history.pop(0)
    
    def update_encoder_bitrate(self, bitrate_kbps):
        """Tell encoder to adjust bitrate"""
        self.encoder.set_target_bitrate(bitrate_kbps)
        # Encoder adapts within 1-2 seconds
```

---

## Scalability: From 1 to 10M Concurrent Meetings

### Architecture Choices by Meeting Size

```
1-2 Participants: Peer-to-Peer (P2P)
├─ Direct connection between devices
├─ No server needed for media
├─ Signaling server only (metadata)
├─ Latency: 50-100ms (best case)
├─ Server cost: Minimal
└─ Example: Personal call

3-20 Participants: SFU (Selective Forwarding Unit)
├─ Central SFU server
├─ Receives all streams, forwards to all
├─ Each participant: Upload 1, Download N-1 streams
├─ Latency: 100-150ms
├─ Server bandwidth: Sum of all streams × 2 (in+out)
├─ Server CPU: Minimal (just forwarding)
├─ Scalability: Limited by client bandwidth
└─ Example: Team standup

50-300 Participants: MCU (Multipoint Control Unit)
├─ Central MCU server
├─ Receives all, composites into grid, sends 1 composite
├─ Each participant: Upload 1, Download 1 composite stream
├─ Latency: 200-300ms
├─ Server bandwidth: Sum of uploads + sum of downloads
├─ Server CPU: VERY HIGH (transcode N streams)
├─ Scalability: Limited by server CPU
├─ Why this size: User bandwidth becomes bottleneck with SFU
└─ Example: Company all-hands meeting

300+ Participants: Broadcast/Webinar Mode
├─ Few speakers (5-10), many viewers (100s-1000s)
├─ Tree topology: Speaker → Regional SFU → CDN → Viewers
├─ Viewers: Audio/video mix, no upload (or raise hand)
├─ Latency: 2-10 seconds (acceptable for broadcast)
├─ Server cost: Streaming optimized
├─ Scalability: CDN scales infinitely
└─ Example: Product launch, live event
```

### Global Scale-Out (10M Concurrent Meetings)

```
Single SFU Server Capacity:

Hardware:
├─ CPU: 32 cores
├─ Memory: 64GB RAM
├─ Network: 10 Gbps connection
└─ Storage: SSD for temp buffers

Concurrent Meetings per SFU:
├─ Depends on meeting size
├─ Assumption: Average 10 people per meeting
├─ Each person: 1.5 Mbps × 10 = 15 Mbps
├─ SFU handles: 100-150 concurrent meetings
└─ Headroom: 20-30% (for peaks)

Theoretical Capacity:
├─ Meetings per SFU: 100-150
├─ For 10M concurrent meetings: 10M / 100 = 100K SFUs
├─ Cost per SFU: $500/month (cloud VM)
├─ Monthly cost: 100K × $500 = $50M
├─ Annual cost: $600M (just SFU hardware!)

Multi-Region Deployment:

Google has 30+ data centers globally:
├─ USA: Virginia, Oregon, Iowa, South Carolina (4)
├─ Europe: London, Frankfurt, Netherlands, Belgium (4)
├─ Asia: Tokyo, Singapore, Hong Kong, India (4)
├─ South America: Sao Paulo (1)
├─ Africa: South Africa, Egypt (2)
├─ Oceania: Sydney, Melbourne (2)
└─ ... and more

Load Balancing Strategy:

When participant joins:
1. Determine geographic region (from IP)
2. Route to SFU in nearest region
3. If all SFUs in region full, use next closest
4. Result: Latency < 50ms to nearest SFU for 99%+ users

For Cross-Region Calls:

Meeting spans USA + Europe:
├─ USA participants → USA SFU
├─ EU participants → EU SFU
├─ Link: USA-SFU sends audio mix to EU-SFU
├─ Link: EU-SFU sends audio mix to USA-SFU
├─ Result:
│  ├─ USA users: 20ms to SFU + local processing
│  ├─ EU users: 20ms to SFU + local processing
│  └─ Cross-Atlantic: 80ms (audio mix, highly compressed)
└─ SFU doesn't send all participant streams (huge bandwidth)

Scaling Within a Region:

Single city (San Francisco) has:
├─ 10,000 concurrent meetings
├─ Distributed across multiple SFU instances
├─ Load balancer (round-robin or least-loaded)
├─ Automatic scaling:
│  ├─ Monitor: Current utilization per SFU
│  ├─ If > 80%: Spin up new SFU instance
│  ├─ If < 20%: Shut down SFU instance
│  └─ Result: Always have capacity with efficiency
└─ Cost-optimized: Scale up/down hourly

Database Scaling:

Meetings table (MySQL):
├─ Billions of meetings (need sharding)
├─ Shard by: meeting_id % num_shards
├─ Example: 1000 shards
├─ Each shard: Handles ~1M meetings
└─ Query by meeting_id: Go to specific shard

Participants table:
├─ 10M meetings × 10 people = 100M records
├─ Also sharded by meeting_id
└─ Fast lookup: Which meetings does user attend?

Cache Layer (Redis):

Meeting state (in-memory):
├─ Current participants
├─ Active speaker
├─ Layout preferences
├─ Connection quality metrics
└─ TTL: Expires when meeting ends (garbage collected)

Cost per active meeting:
├─ Meeting metadata: ~1KB (Redis)
├─ 10M meetings × 1KB = 10GB RAM
├─ Manageable: Redis cluster of 10-20 nodes

Result: Efficient, real-time state management
```

---

## Recording & Transcription

### Recording Architecture

```
Recording Pipeline:

[1] Capture Phase (Continuous)
├─ Start recording job
├─ Tap into SFU/MCU output
├─ Receive composite video (1080p)
├─ Receive mixed audio
├─ Store in Ring Buffer (circular, limited memory)
└─ Latency: None (parallel to meeting)

[2] Encoding Phase (Async, Background)
├─ Read from Ring Buffer chunks
├─ Encode video: H.264 (fast, compatible)
├─ Encode audio: AAC (compatible)
├─ Mux into MP4 container
├─ Create 1-minute segments (resilience)
└─ Write to local SSD (temp storage)

[3] Upload Phase (Async)
├─ Upload segments to Google Cloud Storage (GCS)
├─ With redundancy (multiple copies)
├─ Encrypt before uploading: AES-256
├─ Parallel uploads (don't block each other)
└─ Retry on failure (exponential backoff)

[4] Processing Phase (Post-call)
├─ Once call ends, finalize video
├─ Generate thumbnail (frame at 30 seconds)
├─ Compute duration
├─ Index for search (metadata)
├─ Generate preview clip (15-30 seconds)
└─ Mark as "ready" for viewing

[5] Availability
├─ Available in Google Drive
├─ Available in Google Calendar (event details)
├─ Shared with meeting attendees
├─ Auto-delete after 30 days (if not saved)
├─ Can be permanently saved
└─ Searchable within organization

Storage Economics:

1 hour meeting @ 1080p:
├─ Video bitrate: 2.5 Mbps
├─ Audio bitrate: 128 Kbps
├─ Total: 2.6 Mbps
├─ Duration: 1 hour = 3600 seconds
├─ Raw file: 2.6 Mbps × 3600 = 936 MB ≈ 1 GB
└─ With compression (H.265): ~500 MB

For 10M meetings/day:
├─ Average duration: 45 minutes
├─ 10M × 45 = 450M hours recorded
├─ 450M hours × 500 MB = 225 PB/day
├─ Monthly: ~6.75 EB (exabytes!)
├─ Cost: ~$100M/month (Google Cloud Storage pricing)
└─ Offset by: Storage savings, premium features, data value

Quality for Different Meeting Sizes:

1-20 people:
├─ Record individual streams (if storage available)
├─ Post-processing: Mix audio, composite video
├─ Quality: Excellent
└─ Use case: Important meetings

50-300 people:
├─ Record SFU output (all streams, not feasible)
├─ Or record MCU composite (all participants mixed)
├─ Quality: Good (limited by composite resolution)
└─ Use case: Company meetings, webinars

300+ people:
├─ Record broadcast stream only
├─ Quality: Depends on quality of stream (usually lower)
└─ Use case: Company events, keynotes

Live Streaming (Public):

For public meetings:
├─ Stream to YouTube Live, Facebook Live, etc.
├─ SFU sends composite to streaming service
├─ Public can watch (without Google account)
├─ Optional: Auto-record to YouTube channel
└─ Use case: Product launches, public presentations
```

### Transcription Pipeline

```
Live Transcription:

During the call:

[1] Audio Extraction
├─ Take mixed audio from SFU/MCU
├─ Sample at 16kHz (speech optimal)
├─ Send to Speech-to-Text service in real-time
└─ Latency: Audio arrives ~1-2 seconds behind live

[2] Speech Recognition (ML Model)
├─ Google's Speech-to-Text API
├─ State-of-the-art neural network
├─ Real-time inference
├─ Accuracy: 95%+ (English)
├─ Other languages: 85-90%
└─ Latency: ~1-2 seconds behind live

[3] Speaker Identification (Diarization)
├─ Challenge: "Who said what?"
├─ ML model identifies speaker voice
├─ Accuracy: 85-95% (depends on similarity)
├─ Links speaker to participant
└─ Colored output: Each speaker different color

[4] Display to Participants
├─ Show captions live in meeting
├─ Show in meeting transcript
├─ Clickable: Jump to timestamp
├─ Searchable: Search for words spoken
└─ Optional: Users can edit post-call

Accuracy:

English (USA):
├─ Clear audio: 95%+ accuracy
├─ Background noise: 75-85% accuracy
├─ Strong accents: 80-90% accuracy
└─ Multiple simultaneous speakers: 60-70%

Other Languages:
├─ Major (Spanish, French, German): 90-95%
├─ Asian (Japanese, Chinese, Korean): 85-90%
├─ Others (Hindi, Arabic, Portuguese): 80-85%
└─ Less common: 70-80%

Handling Errors:

Common mistakes:
├─ Homophones: "I" vs "eye" (both sound same)
├─ Domain-specific terms: "API" as "API" vs "a-p-i"
├─ Names: Misspelled proper nouns
├─ Slang: New words not in training
└─ Accents: Regional variations

User correction:
├─ Transcript is editable (post-call)
├─ Users can fix errors
├─ Corrections improve ML model
└─ Better accuracy over time

Translation:

Real-time translation (new feature):

[1] Transcribe to text
   Spanish: "Hola, ¿cómo estás?"

[2] Translate (neural MT)
   English: "Hi, how are you?"

[3] Display translated captions
   Live in meeting

Languages: 100+
├─ Major languages: Excellent quality
├─ Less common: Good quality
├─ Rare languages: Decent quality
└─ Combined: Any source + target pair

Quality:
├─ Technical terms: May be inaccurate
├─ Idioms: Often mistranslated
├─ Context-dependent: Ambiguous
└─ Better with longer context

Post-Call Summary:

After meeting ends:

[1] Use full transcript
├─ All speaker turns
├─ Timing information
└─ Full text

[2] ML Summarization
├─ Extract key points
├─ Identify decisions made
├─ Identify action items (who → what → when)
└─ Identify next steps

[3] Generate Document
├─ 2-3 paragraph summary
├─ Key discussion points
├─ Action items (formatted list)
├─ Attendees
├─ Duration
└─ Link to full recording

[4] Save to Drive
├─ Auto-created Google Doc
├─ Editable by attendees
├─ Linked in Calendar event
├─ Email notification sent
└─ Searchable in Drive

Quality:
├─ Summaries: 70-80% useful
├─ Action items: 60-70% complete
├─ Requires user editing
└─ Still saves significant time

Cost:

Per meeting:
├─ Transcription (API): ~$0.06
├─ Summarization (ML): ~$0.04
├─ Translation (optional): ~$0.02
├─ Total: ~$0.12 per meeting

For 10M meetings/day:
├─ 10M × $0.12 = $1.2M/day
├─ Annual: $440M/year
└─ Offset by: Premium pricing, data value, retention
```

---

## Security & Privacy (SDE3 Deep Dive)

### Encryption Strategies

```
Three Encryption Modes:

Mode 1: Standard (Default)
├─ Encryption: TLS 1.3 (signaling), DTLS-SRTP (media)
├─ Readable by: Google (can decrypt)
├─ Features enabled: Recording, transcription, smart composition
├─ Privacy: Good (encrypted in transit)
├─ Practicality: Features work
└─ Use case: Most meetings

Mode 2: End-to-End Encryption (E2EE)
├─ Encryption: TLS 1.3 (signaling), DTLS-SRTP (media)
├─ Readable by: Only participants
├─ Features disabled: Recording, transcription, smart composition
├─ Privacy: Excellent (Google can't decrypt)
├─ Practicality: Limited features
└─ Use case: Security-sensitive meetings

Mode 3: Private Channel (Rare)
├─ Encryption: Client-side before transmission
├─ Readable by: Only participants
├─ Features: Minimal
├─ Privacy: Maximum
├─ Practicality: Complex, testing intensive
└─ Use case: Highly sensitive government/law meetings

Key Exchange (E2EE):

Diffie-Hellman Ephemeral (DHE):

Participant A:
├─ Generate random secret: a = large random number
├─ Compute: A' = g^a mod p (share this publicly)

Participant B:
├─ Generate random secret: b = large random number
├─ Compute: B' = g^b mod p (share this publicly)

Exchange:
├─ A sends B' to B (over TLS, secure)
├─ B sends A' to A (over TLS, secure)

Compute Shared Secret:
├─ A: shared_secret = B'^a mod p
├─ B: shared_secret = A'^b mod p
├─ Math: B'^a = (g^b)^a = g^(ab) = g^(ba) = (g^a)^b = A'^b
└─ Result: Both compute SAME secret!

Derive Encryption Key:
├─ key = HKDF(shared_secret, context, salt)
├─ Each call: New key (forward secrecy)
└─ If device compromised later: Old calls still encrypted

Forward Secrecy:

Benefit:
├─ Even if attacker gets private keys later
├─ Can't decrypt old calls
├─ Each call has unique key
├─ Impossible to decrypt historical meetings

Authentication:

In standard mode:
├─ Google signs certificates
├─ Client trusts Google CA
├─ Certificate pinning (prevent MITM)
└─ Result: Secure connection

In E2EE mode:
├─ Users can verify fingerprints
├─ Example: "Is this really Alice?"
├─ Public key fingerprint shown
├─ Both users verify: Matches what they see
└─ Result: Authenticated connection

Access Control:

Host Controls:
├─ Admit/remove participants (waiting room)
├─ Mute all participants
├─ Disable screen sharing
├─ Lock meeting (no new people)
├─ Require passcode
├─ Record/don't record
└─ Remove disruptive users

Enterprise Admin Controls:
├─ Enforce E2EE (yes/no)
├─ Recording allowed (yes/no)
├─ Participant restrictions (domain allowlist)
├─ Require security keys
├─ Audit all meetings
└─ Compliance policies
```

---

## Interview-Ready Summary

### What Interviewers Expect (SDE3)

```
Demonstrate:
✓ Architecture scales 1 → 10M meetings
✓ Why different architectures (P2P, SFU, MCU)
✓ Latency breakdown (every component 10-20ms)
✓ How ABR works (measure → estimate → adapt)
✓ Global scalability (multi-region, cascading)
✓ Handling failures (graceful degradation)
✓ Recording/transcription pipeline (async)
✓ Security/privacy trade-offs (features vs encryption)
✓ Honest assessment: What's hard? What trades are made?
✓ Concrete numbers: Latency, bandwidth, cost

Avoid:
✗ "Google does X, so we do X" (no original thinking)
✗ "Perfect system possible" (unrealistic)
✗ "Use off-the-shelf WebRTC" (doesn't solve the problems)
✗ Ignoring real constraints (physics, human biology)
✗ Over-simplification (it's complex for reasons)

Red Flag Answers:
✗ "Latency doesn't matter for video"
✗ "Just send all streams to everyone"
✗ "No need for adaptive bitrate"
✗ "Encryption doesn't affect performance"
✗ "Record everything, handle storage later"

What They're Really Testing:

1. Can you think at scale?
   ├─ 1 person: Easy
   ├─ 100 people: Architecture changes
   ├─ 1M people: Everything changes
   └─ Do you think through implications?

2. Do you understand trade-offs?
   ├─ Latency vs Quality
   ├─ CPU vs Bandwidth
   ├─ Features vs Privacy
   └─ Cost vs User Experience

3. Can you optimize efficiently?
   ├─ Every millisecond matters (100ms → 1 second = 10x worse)
   ├─ Focus on biggest wins
   ├─ Hardware acceleration crucial
   └─ Know when to accept "good enough"

4. Do you know your constraints?
   ├─ Speed of light (80ms USA-Europe, can't improve)
   ├─ Network loss (5-10%, design around it)
   ├─ Human perception (250ms latency feels bad)
   └─ Physics matter!

5. Can you handle ambiguity?
   ├─ "Design a video conference"
   ├─ 1-20 people? 1M people? They didn't say!
   ├─ Clarify before designing
   ├─ Design for what's asked, mention scalability
   └─ Show you think critically

Perfect Answer Structure:

1. Clarify requirements (1 person? 1M people?)
2. Identify constraints (latency, bandwidth, cost)
3. Propose architecture (P2P/SFU/MCU choice)
4. Deep dive on 1-2 hard problems:
   ├─ Real-time quality adaptation
   ├─ Low latency at scale
   ├─ Recording pipeline
   └─ Or what they ask
5. Mention trade-offs you made
6. Discuss monitoring/observability
7. Ask clarifying questions if confused

Example Opening:

"Video conferencing has interesting constraints:
- Real-time: < 250ms latency acceptable
- Scalability: 1-to-1 to 10K+ users
- Bandwidth variability: 500Kbps to 10Mbps
- Reliability: 99.9%+ uptime

These require different architectures:
- 1-2 people: P2P (lowest latency)
- 3-20: SFU (balance)
- 50-300: MCU (lower bandwidth)
- 300+: Broadcast (CDN scale)

Before I go deeper, is there a specific size/constraint
you want me to focus on?"
```

---

*This document represents Google Meet's publicly disclosed architecture and best practices in real-time communication systems. Actual implementation details may differ based on recent changes and proprietary optimizations.*
