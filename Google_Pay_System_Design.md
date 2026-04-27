# Google Pay System Design: Complete Architecture Breakdown

## Table of Contents
1. [Executive Overview](#executive-overview)
2. [What is Google Pay](#what-is-google-pay)
3. [Payment Flow Architecture](#payment-flow-architecture)
4. [System Architecture](#system-architecture)
5. [Core Components Deep Dive](#core-components-deep-dive)
6. [Security Architecture](#security-architecture)
7. [Payment Processing](#payment-processing)
8. [Scalability & Performance](#scalability--performance)
9. [Integration Points](#integration-points)
10. [Challenges & Solutions](#challenges--solutions)
11. [Interview Talking Points](#interview-talking-points)

---

## Executive Overview

Google Pay processes **billions of transactions annually** across multiple payment types:

- **NFC Payments**: Tap phone at terminal (contactless)
- **QR Code Payments**: Scan code to pay
- **In-App Payments**: Pay within Google Play Store, YouTube, apps
- **Peer-to-Peer Transfers**: Send money to contacts
- **Online Checkout**: Web-based payments
- **Bus/Transit Payments**: Public transportation

### Key Statistics

```
Global User Base: 500M+ active users
Transactions/Day: ~150M transactions
Payment Methods: 5B+ cards linked
Active Merchants: 100M+ businesses
Payment Value/Year: $1T+

Countries Supported: 70+
Payment Networks: Visa, Mastercard, AMEX, local methods
Operating Systems: Android (primary), iOS (limited), Web
```

### Why Google Pay Matters

```
Market Opportunity:
├─ Mobile payments growing 25% YoY
├─ Contactless adoption accelerated by COVID
├─ Incumbent banks + fintech competitors
└─ Control of payment gateway = data gold mine

Technical Challenge:
├─ Real-time transaction processing
├─ 99.99% uptime requirement
├─ PCI DSS compliance (strictest security)
├─ Multiple payment networks (Visa, MC, AMEX)
├─ Fraud detection in milliseconds
└─ Cross-border payments with currency conversion
```

---

## What is Google Pay

### Payment Types Supported

```
NFC (Near Field Communication) Payments:
├─ User unlocks phone
├─ Holds phone near terminal
├─ Terminal detects NFC signal
├─ Payment sent in <500ms
└─ Industry standard for contactless

QR Code Payments:
├─ Merchant displays QR code
├─ User scans with phone
├─ Opens payment app
├─ User enters amount (if dynamic)
├─ Confirms payment
└─ Used in Asia primarily, growing globally

In-App Payments:
├─ Developer integrates Google Pay API
├─ User taps to pay in app
├─ Google Pay fills payment details
├─ Transaction processed
└─ Developer receives confirmation

P2P (Send Money):
├─ User selects recipient (contact)
├─ Enters amount
├─ Adds note (optional)
├─ Google Pay verifies recipient account
├─ Sends money (instant to Google account)
└─ Recipient claims money (if not registered)

Online Checkout:
├─ Merchant website shows "Pay with Google"
├─ User clicks button
├─ Browser redirects to Google Pay
├─ User confirms payment
├─ Browser returns to merchant with confirmation
└─ User never shares card details with merchant

Bill Payments:
├─ User adds biller information
├─ Schedules recurring or one-time payment
├─ Google Pay sends via banking rails
└─ Biller receives payment
```

---

## Payment Flow Architecture

### High-Level Transaction Flow

```
                    ┌─────────────────────┐
                    │   User Device       │
                    │  (Android Phone)    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Google Pay App     │
                    │  ├─ Secure Hardware │
                    │  ├─ Tokenizer       │
                    │  └─ Encryption      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   NFC Controller    │
                    │   (Sends Token)     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  POS Terminal       │
                    │  (Merchant)         │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Issuer Switch      │
                    │  (Visa/MC Gateway)  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Bank               │
                    │  (Card Issuer)      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  User's Bank        │
                    │  Account Deducted   │
                    └─────────────────────┘
```

### Detailed NFC Payment Flow

```
Timeline: 0-2000ms (Total transaction)

T=0ms: User Initiates
├─ User taps phone on POS terminal
├─ Phone's NFC antenna powered
└─ Terminal detects phone presence

T=10-50ms: NFC Handshake
├─ Terminal: "What are you?"
├─ Phone NFC controller: "I'm a payment device"
├─ Terminal: "Send payment data"
└─ Secure channel established (ISO/IEC 14443)

T=50-100ms: Tokenization
├─ Google Pay app unlocks (biometric/PIN verified earlier)
├─ Selects payment instrument from vault
├─ Calls tokenizer: "Give me a single-use token"
├─ Tokenizer generates: token = hash(card + session + timestamp)
├─ Token encrypted: encrypted_token = encrypt(token, public_key)
└─ Card number NEVER transmitted

T=100-200ms: NFC Transmission
├─ Token sent to terminal via NFC (encrypted)
├─ Terminal receives token (300 bytes max)
├─ Terminal includes: Amount, merchant ID, timestamp
├─ Terminal sends to acquiring bank

T=200-500ms: Network Processing
├─ Acquiring bank → Card Network (Visa/Mastercard)
├─ Card Network → Issuer (user's bank)
├─ Issuer: Checks balance, reviews fraud rules
├─ Issuer: Approves or declines
├─ Response flows back through network (300-500ms)

T=500-600ms: Terminal Confirmation
├─ Terminal receives approval code
├─ Shows "APPROVED" or "DECLINED"
├─ Phone vibrates/beeps confirmation
└─ Receipt may be printed/emailed

T=600-2000ms: Google Pay Reconciliation
├─ Terminal sends final transaction details
├─ Merchant's acquiring bank → Google Pay
├─ Google Pay logs transaction
├─ Updates user's transaction history
├─ Sends notification to user
└─ Records for analytics/fraud review

Result: Payment complete, user leaves
```

### In-App Payment Flow (Developer Integration)

```
Merchant App Integration Flow:

Step 1: Developer Adds Google Pay Button
Developer Code:
    <button id="googlePayButton" onclick="requestPayment()">
        Pay with Google
    </button>

Step 2: User Clicks Button
User Action:
    ├─ Clicks "Pay with Google"
    └─ requestPayment() function called

Step 3: Google Pay Client Initializes
Client Code:
    const paymentsClient = new google.payments.api.PaymentsClient();
    const paymentRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        merchantInfo: {
            merchantName: 'Example Merchant',
            merchantId: 'merchant_12345'
        },
        allowedPaymentMethods: [
            {
                type: 'CARD',
                tokenizationSpecification: {
                    type: 'PAYMENT_GATEWAY',
                    parameters: {
                        gateway: 'example',
                        gatewayMerchantId: 'merchant_gateway_id'
                    }
                },
                billingAddressParameters: {
                    format: 'FULL'
                }
            }
        ],
        transactionInfo: {
            totalPriceStatus: 'FINAL',
            totalPrice: '19.99',
            currencyCode: 'USD'
        }
    };

Step 4: User Selects Payment Method
Google Pay UI:
    ├─ Shows user's saved cards
    ├─ User selects card to use
    ├─ User enters CVC (if required)
    └─ User approves payment

Step 5: Token Generation
Server-Side (Google Pay):
    token = {
        "signature": "...",          // Signed by Google
        "protocolVersion": "ECv1",
        "signedMessage": "{          // Encrypted payment data
            'encryptedCardNumber': '...',
            'expiryMonth': '12',
            'expiryYear': '2025',
            'authMethod': 'PAN_ONLY'
        }"
    }

Step 6: Merchant Receives Token
Merchant Backend:
    ├─ Receives tokenized payment method
    ├─ Sends token to payment gateway
    ├─ Payment gateway decrypts (has Google's key)
    ├─ Payment gateway processes with card network
    └─ Returns transaction ID

Step 7: Confirmation to User
User Sees:
    ├─ Payment confirmation screen
    ├─ Order details
    ├─ Confirmation email sent
    └─ Order processing begins
```

---

## System Architecture

### Three-Tier Architecture

```
TIER 1: CLIENT LAYER
├─ Android App (Java/Kotlin)
│  ├─ Secure Element (TEE - Trusted Execution Environment)
│  ├─ NFC Controller
│  ├─ Biometric/PIN Handler
│  └─ Tokenization Engine
├─ iOS App (Limited, no NFC in some countries)
│  └─ Payment Kit (limited to online/in-app)
└─ Web Browser
   ├─ JavaScript SDK
   ├─ Payment Request API
   └─ Tokenizer

TIER 2: API & SERVICES LAYER
├─ API Gateway (Load Balanced)
│  ├─ Rate Limiting
│  ├─ Authentication
│  ├─ Request Routing
│  └─ SSL/TLS Termination
├─ Core Microservices
│  ├─ Transaction Service (Process transactions)
│  ├─ Tokenization Service (Generate tokens)
│  ├─ User Service (Account management)
│  ├─ Payment Method Service (Cards/accounts)
│  ├─ Reconciliation Service (Settle funds)
│  ├─ Fraud Detection Service (Real-time ML)
│  ├─ Notification Service (Push/SMS/Email)
│  └─ Analytics Service (Insights, reporting)
└─ Authentication
   ├─ OAuth 2.0
   ├─ Biometric verification
   └─ Tokenization credentials

TIER 3: DATA & EXTERNAL LAYER
├─ Databases
│  ├─ User Data (MySQL, encrypted)
│  ├─ Transaction Log (Cassandra, immutable)
│  ├─ Payment Methods Vault (Encrypted, PCI DSS Level 1)
│  ├─ Fraud Rules Engine (Real-time rules)
│  └─ Cache Layer (Redis)
├─ Payment Networks
│  ├─ Visa Direct (API-based transfers)
│  ├─ Mastercard (Card network)
│  ├─ AMEX
│  └─ Local payment networks (country-specific)
├─ Banks
│  ├─ Issuer banks (where card comes from)
│  ├─ Acquiring banks (merchant's bank)
│  └─ Settlement banks
└─ External Services
   ├─ Machine Learning (Fraud scoring)
   ├─ Analytics Data Warehouse
   └─ Third-party fraud services
```

### Complete System Diagram

```
                    ┌──────────────────────────────────────┐
                    │     Client Layer                     │
                    │  (Android, iOS, Web Browser)         │
                    └────────────┬─────────────────────────┘
                                 │ HTTPS/TLS 1.3
                                 │
                    ┌────────────▼─────────────────────────┐
                    │    API Gateway (Kong/Zuul)          │
                    │  ├─ Load Balancing                  │
                    │  ├─ Rate Limiting (1M req/sec/user) │
                    │  ├─ DDoS Protection                 │
                    │  └─ TLS Termination                 │
                    └────────────┬─────────────────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
    ┌─────▼──────┐        ┌──────▼──────┐       ┌──────▼──────┐
    │Transaction │        │Tokenization │       │User Service │
    │Service     │        │Service      │       │             │
    │            │        │             │       │             │
    └─────┬──────┘        └──────┬──────┘       └──────┬───────┘
          │                      │                     │
          └──────────────────────┼─────────────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
    ┌─────▼──────┐        ┌──────▼──────┐       ┌──────▼──────┐
    │Payment      │        │Fraud        │       │Notification │
    │Method       │        │Detection    │       │Service      │
    │Service      │        │Service      │       │             │
    └─────┬──────┘        └──────┬──────┘       └──────┬───────┘
          │                      │                     │
          └──────────────────────┼─────────────────────┘
                                 │
    ┌────────────────────────────┼──────────────────────────┐
    │                            │                          │
┌───▼────┐               ┌───────▼────┐            ┌────────▼────┐
│MySQL   │               │Cassandra   │            │Redis        │
│User    │               │Transaction │            │Cache        │
│Accounts│               │Log         │            │Session      │
└────────┘               └────────────┘            └─────────────┘
    │
┌───▼────────────────────────────────────────┐
│      Payment Networks & Banks              │
├────────────────────────────────────────────┤
│┌────────┐ ┌──────────┐ ┌────────┐        │
││ Visa   │ │Mastercard│ │AMEX    │        │
│└────────┘ └──────────┘ └────────┘        │
│                                            │
│ Issuer Banks | Acquiring Banks             │
│ (User's Bank) | (Merchant's Bank)         │
└────────────────────────────────────────────┘
```

---

## Core Components Deep Dive

### 1. Tokenization Service

**Responsibility**: Convert real card data into single-use tokens

```
Why Tokenization?

Traditional Card Processing:
  Merchant → Receives card number → Sends to processor
  Risk: Card number exposed to multiple parties
  PCI DSS Scope: Merchant must comply (expensive)
  
With Tokenization:
  Merchant → Receives token (useless without key)
  Merchant sends token to processor
  Processor decrypts (only they have key)
  Card number stays encrypted
  PCI DSS Scope: Only Google Pay (Level 1 compliance)

Google Pay Tokenization Architecture:

┌─────────────────────────────────────┐
│ User's Phone                        │
│ ┌────────────────────────────────┐ │
│ │ Secure Element (TEE)           │ │
│ │ ├─ Stores: Real card number    │ │
│ │ ├─ Generates: Random nonce     │ │
│ │ ├─ Has: Google's public key    │ │
│ │ └─ Protected: Hardware level   │ │
│ └────────────────────────────────┘ │
└─────────────────────────────────────┘
             │
             │ Card number stays in TEE
             │ (Never exposed to OS or app)
             │
             ▼
┌─────────────────────────────────────┐
│ Tokenization Process                │
│                                     │
│ payload = {                         │
│   card_number: "4111...",          │
│   expiry: "12/25",                 │
│   cvv: "123",                      │
│   nonce: random_256_bits           │
│ }                                  │
│                                     │
│ token = encrypt(                   │
│   payload,                         │
│   google_public_key,               │
│   nonce                            │
│ )                                  │
│                                     │
│ Only 300 bytes of data sent        │
│ Contains no usable card info       │
└─────────────────────────────────────┘
             │
             │ Token (encrypted)
             │
             ▼
┌─────────────────────────────────────┐
│ Terminal/Merchant Receives Token    │
│                                     │
│ {                                  │
│   "token": "encrypted_bytes",      │
│   "expiry": "UNIX_timestamp",      │
│   "nonce": "random_bytes"          │
│ }                                  │
│                                     │
│ Token is device-specific:          │
│  - Valid for only 1 transaction    │
│  - Expires in 60 seconds           │
│  - Can't be reused                 │
│  - Can't be decrypted (need key)   │
└─────────────────────────────────────┘

Types of Tokens:

1. Transient Token (One-time use)
   ├─ Used for: Single tap payment
   ├─ Valid for: 60 seconds
   ├─ Can be used: 1 time
   └─ Merchant receives: Encrypted blob

2. Persistent Token (Stored by merchant)
   ├─ Used for: Recurring billing
   ├─ Valid for: 12-36 months
   ├─ Can be used: Multiple times
   └─ Merchant stores: Token (not card)

3. Network Token (From card network)
   ├─ Used for: Online purchases
   ├─ Valid for: Card validity period
   ├─ Can be used: Multiple times
   └─ Issued by: Visa/Mastercard
```

### 2. Fraud Detection Service

**Responsibility**: Identify suspicious transactions in real-time

```
Real-Time Fraud Detection Pipeline:

T=0ms: Transaction Arrives
├─ Payment request received
├─ Extract all transaction details
└─ Pass to ML service

T=1-50ms: Feature Engineering
├─ Extract 1000+ features:
│  ├─ User historical features:
│  │  ├─ Average spending per day
│  │  ├─ Typical merchant categories
│  │  ├─ Geographic patterns
│  │  └─ Time-of-day patterns
│  ├─ Device features:
│  │  ├─ Device ID history
│  │  ├─ Previous transactions
│  │  ├─ Device rooting status
│  │  └─ OS version, app version
│  ├─ Transaction features:
│  │  ├─ Amount
│  │  ├─ Merchant category
│  │  ├─ Geographic location
│  │  ├─ Time since last transaction
│  │  └─ Currency (if international)
│  ├─ Network features:
│  │  ├─ IP address reputation
│  │  ├─ VPN/Proxy detection
│  │  ├─ Velocity (transactions in last hour)
│  │  └─ Impossible travel (distance/time)
│  └─ Card features:
│     ├─ Card age
│     ├─ Previous fraud incidents
│     └─ Card network (Visa, MC, etc.)

T=50-80ms: Rule-Based Scoring
├─ Check business rules:
│  ├─ IF amount > $10,000 → flag
│  ├─ IF user in US, transaction in China → flag
│  ├─ IF 5 transactions in 60 seconds → flag
│  ├─ IF merchant in blacklist → block
│  ├─ IF card flagged by issuer → block
│  └─ IF known fraud pattern → block
└─ Rule score: 0-100

T=80-120ms: ML Model Inference
├─ Pass features to ML ensemble:
│  ├─ Gradient Boosting Model (XGBoost)
│  │  └─ Fraud probability: 0.000-1.000
│  ├─ Neural Network (Deep Learning)
│  │  └─ Anomaly score: 0.000-1.000
│  ├─ Isolation Forest (Outlier detection)
│  │  └─ Anomaly score: 0.000-1.000
│  └─ Logistic Regression (Baseline)
│     └─ Fraud probability: 0.000-1.000
├─ Ensemble votes:
│  ├─ If 3/4 models agree → high confidence
│  ├─ If 2/4 models agree → medium confidence
│  └─ If 1/4 models agree → low confidence
└─ Final ML score: 0-100

T=120-150ms: Decision Engine
├─ Combine rule score + ML score
├─ Final fraud score = 0.4*rules + 0.6*ML
├─ Decision thresholds:
│  ├─ Score < 20: APPROVE
│  ├─ Score 20-50: APPROVE but monitor
│  ├─ Score 50-75: CHALLENGE (require verification)
│  ├─ Score 75-90: DECLINE (but can appeal)
│  └─ Score > 90: BLOCK (high confidence fraud)
└─ Return decision

T=150-200ms: Actions
├─ APPROVE:
│  ├─ Allow transaction
│  ├─ Send to payment network
│  └─ Log for model retraining
├─ CHALLENGE:
│  ├─ Ask user to verify (OTP, biometric)
│  ├─ If verified: APPROVE
│  ├─ If failed: DECLINE
│  └─ Log challenge result
├─ DECLINE:
│  ├─ Reject transaction
│  ├─ Notify user
│  ├─ Suggest: Add payment method
│  └─ Log for investigation
└─ BLOCK:
   ├─ Immediately block
   ├─ Lockdown account
   ├─ Send security alert
   └─ Escalate to human review

T=200-500ms: Payment Network
├─ Continue with approved transactions
└─ Communicate challenge/decline to user

Model Accuracy:
├─ True Positive Rate (catch fraud): 95%+
├─ False Positive Rate (block legitimate): 2-5%
├─ Processing latency: 200ms max
└─ Daily transactions analyzed: 150M+

Training:
├─ Data: 10 years historical transactions
├─ Labeled examples: 1M+ confirmed frauds
├─ Retrain frequency: Daily
├─ Feature updates: Real-time
└─ Model deployment: A/B tested before full rollout
```

### 3. Transaction Service

**Responsibility**: Process payment transactions end-to-end

```
Transaction Service Architecture:

┌────────────────────────────────────┐
│ Incoming Payment Request           │
├────────────────────────────────────┤
│ {                                  │
│   user_id: "user_123",            │
│   payment_method_id: "card_456",  │
│   amount: 19.99,                  │
│   currency: "USD",                │
│   merchant_id: "merchant_789",    │
│   timestamp: 1624564800000        │
│ }                                  │
└────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ 1. Create Transaction Object       │
├────────────────────────────────────┤
│ transaction = {                    │
│   id: uuid(),                      │
│   user_id, amount, merchant_id,   │
│   status: 'PENDING',              │
│   created_at: now(),              │
│   retry_count: 0,                 │
│   result: null                    │
│ }                                  │
│                                    │
│ Save to database (Cassandra)       │
│ → Transaction committed to log     │
│ → Immutable record created         │
└────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ 2. Verify Payment Method           │
├────────────────────────────────────┤
│ Fetch from Payment Method Service: │
│ ├─ Card still exists?             │
│ ├─ Card not expired?              │
│ ├─ Card not blocked?              │
│ ├─ User still owns card?          │
│ └─ Sufficient fraud checks pass?   │
│                                    │
│ If fails: DECLINE immediately     │
└────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ 3. Run Fraud Detection             │
├────────────────────────────────────┤
│ Call Fraud Service (see above)     │
│ Possible outcomes:                 │
│ ├─ APPROVE                         │
│ ├─ CHALLENGE (require verification)│
│ ├─ DECLINE                         │
│ └─ BLOCK                           │
│                                    │
│ If DECLINE/BLOCK: Stop here       │
└────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ 4. Request Token                   │
├────────────────────────────────────┤
│ Call Tokenization Service:         │
│ ├─ Get encrypted card token        │
│ ├─ Token valid for 60 seconds      │
│ ├─ Token can be used once          │
│ └─ Token ready to send to network  │
└────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ 5. Prepare Network Request         │
├────────────────────────────────────┤
│ networkRequest = {                 │
│   token: encrypted_token,          │
│   amount: 1999,  // in cents       │
│   currency: "USD",                │
│   merchant_id: "merchant_789",    │
│   timestamp: now(),                │
│   device_id: "device_123",        │
│   signature: HMAC-SHA256(...)     │
│ }                                  │
│                                    │
│ Compress & encrypt request         │
└────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ 6. Send to Payment Network         │
├────────────────────────────────────┤
│ Connection: Dedicated line to      │
│            Visa/Mastercard network │
│ Protocol: Proprietary + TLS        │
│ Retry: Yes (exponential backoff)   │
│ Timeout: 30 seconds                │
│                                    │
│ Send request                       │
│ Wait for response                  │
└────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ 7. Process Network Response        │
├────────────────────────────────────┤
│ Response possibilities:            │
│                                    │
│ A. APPROVED                        │
│    ├─ Auth code received           │
│    ├─ Set status: 'AUTHORIZED'     │
│    └─ Proceed to settlement        │
│                                    │
│ B. DECLINED (funds insufficient)   │
│    ├─ Reason: "Insufficient funds"│
│    ├─ Set status: 'DECLINED'       │
│    └─ Notify user                  │
│                                    │
│ C. BLOCKED (fraud detected by bank)│
│    ├─ Reason: "Suspicious activity"│
│    ├─ Set status: 'BLOCKED'        │
│    └─ Advise user contact bank     │
│                                    │
│ D. TIMEOUT (no response in 30s)    │
│    ├─ Retry logic:                 │
│    │  └─ Exponential backoff: 1s, 2s, 4s, 8s │
│    ├─ If 3 retries fail:           │
│    │  └─ Query transaction status  │
│    │  └─ Was transaction approved? │
│    └─ Deduplicate: Use transaction ID to │
│       ensure no double charges     │
└────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ 8. Update Database                 │
├────────────────────────────────────┤
│ transaction.status = approval_code │
│ transaction.auth_code = auth_code  │
│ transaction.network = 'VISA'       │
│ transaction.completed_at = now()   │
│                                    │
│ Save to Cassandra (append-only)    │
│ Save to MySQL (transaction summary)│
│ Update Redis cache (user balance)  │
└────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────┐
│ 9. Send Confirmation               │
├────────────────────────────────────┤
│ Send to Notification Service:      │
│ ├─ Push notification               │
│ ├─ SMS (in some countries)         │
│ ├─ Email receipt                   │
│ └─ In-app notification             │
│                                    │
│ Return to client:                  │
│ {                                  │
│   transaction_id: "txn_xyz",      │
│   status: "APPROVED",             │
│   amount: 19.99,                  │
│   timestamp: 1624564800500,       │
│   receipt_url: "..."              │
│ }                                  │
└────────────────────────────────────┘

Idempotency Guarantee:

Problem:
├─ Network timeout: Is payment approved?
├─ Retry sent but original succeeded
└─ Result: Double charge!

Solution: Idempotency Key
├─ Client generates: idempotency_key = UUID()
├─ Client always sends same key
├─ Server checks: Have I seen this key before?
├─ If yes: Return previous response (no double charge)
├─ If no: Process transaction
└─ Result: Safe retries, no duplicates
```

### 4. Payment Method Service

**Responsibility**: Manage user's saved payment methods securely

```
Payment Method Storage Architecture:

User's Phone (Secure Element):
├─ Stores: Real card data
├─ Encrypted: Yes (AES-256)
├─ Accessible: Only by Google Pay app
└─ Synced: To Google servers (encrypted)

Google's Vault (PCI DSS Level 1):
├─ Encrypted card data (at rest)
├─ Tokenization keys (separated)
├─ Audit logs (who accessed what)
├─ Redundancy: Multiple data centers
└─ Compliance: Annual audits

Database Schema (Simplified):

cards table:
├─ card_id (primary key)
├─ user_id (indexed)
├─ card_token (encrypted)
├─ card_last_4 (plaintext, for display)
├─ card_brand (VISA, MC, AMEX)
├─ expiry_month (encrypted)
├─ expiry_year (encrypted)
├─ billing_address (encrypted)
├─ is_default (boolean)
├─ added_at (timestamp)
├─ updated_at (timestamp)
└─ deleted_at (soft delete)

bank_accounts table:
├─ account_id (primary key)
├─ user_id (indexed)
├─ account_token (encrypted)
├─ account_last_4 (encrypted)
├─ routing_number (encrypted)
├─ account_type (CHECKING, SAVINGS)
└─ verified (boolean, requires verification)

Adding a New Card:

Step 1: User Enters Card Details
├─ Card number
├─ Expiry date
├─ CVV
├─ Billing zip code
└─ (All on user's device, not sent to server)

Step 2: Validation
├─ Luhn check (verify card number format)
├─ Expiry check (not expired)
├─ CVV length check
└─ Billing zip format check

Step 3: Tokenization
├─ Create token using private key
├─ Token stored in Secure Element
└─ Token ready for transactions

Step 4: Server Registration
├─ Send to Google servers: card_last_4, brand, expiry
├─ NO card number sent
├─ Server stores metadata
├─ Send confirmation to device

Step 5: Verification (First Transaction)
├─ User makes first transaction
├─ Card network asks for CVV
├─ User enters CVV
├─ If approved: Card marked as verified
├─ Future transactions don't need CVV

Tokenized Card Format:

Original Card:
4111 1111 1111 1111 | 12/25 | 123

After Tokenization:
Token: eyJhbGciOiJSU0EtT0FFUCIsImVuYyI6IkExMjhHQ00ifQ...

Characteristics:
├─ 300-500 bytes (encrypted)
├─ Can't be decrypted (only Google has key)
├─ Can only be used once
├─ Expires in 60 seconds
├─ Device-specific

Card Lifecycle:

Added:
├─ Card created
├─ Token generated
├─ Stored in Secure Element
└─ Awaiting first transaction

Active:
├─ At least one transaction succeeded
├─ Can be used for future payments
├─ Expiry date valid
└─ Not reported as lost

Expired:
├─ Expiry date passed
├─ Can't be used for new transactions
├─ Can be renewed (update expiry)
└─ Kept for historical records

Deleted:
├─ User deleted card
├─ Soft deleted in database
├─ Kept for reconciliation
├─ Can't be reactivated
└─ Removed from UI

Security Features:

1. Card Data Encryption
   ├─ Algorithm: AES-256-GCM
   ├─ Key rotation: Every 90 days
   ├─ Key storage: HSM (Hardware Security Module)
   └─ Never in plaintext in database

2. Access Control
   ├─ Only Google Pay app can use
   ├─ User authentication required
   ├─ Biometric/PIN for transactions
   ├─ Audit logs for all access
   └─ Anomalous access detected

3. Tokenization
   ├─ Real card never sent to merchant
   ├─ Real card never sent to payment network
   ├─ Token unique per transaction
   ├─ Token expires after use
   └─ Reduces PCI compliance scope

4. Monitoring
   ├─ Unusual card activity
   ├─ Geographic anomalies
   ├─ Impossible travel detection
   ├─ Velocity checks (transactions/time)
   └─ Automatic lockdown if suspicious
```

---

## Security Architecture

### Defense in Depth

```
LAYER 1: Transport Security (Network)
├─ TLS 1.3 for all connections
├─ Certificate pinning (prevent MITM)
├─ VPN/proxy detection
├─ DDoS protection (Google Cloud Armor)
└─ Rate limiting (per IP, per user)

LAYER 2: Authentication (Identity)
├─ Multi-factor authentication:
│  ├─ Something you know: PIN/Password
│  ├─ Something you have: Phone/Security key
│  └─ Something you are: Biometric (fingerprint, face)
├─ Session management:
│  ├─ Session tokens (short-lived, 15 min)
│  ├─ Refresh tokens (long-lived, 30 days)
│  └─ Token rotation on each refresh
└─ Device trust:
   ├─ Device ID verification
   ├─ Device rooting detection
   └─ Suspicious activity lockout

LAYER 3: Authorization (Access Control)
├─ Role-based access control (RBAC)
├─ Payment method access:
│  ├─ Only owner can use their cards
│  ├─ Only owner can modify payment methods
│  └─ Shared accounts: Profile-based limits
├─ Transaction limits:
│  ├─ Daily limit: $2,000
│  ├─ Per transaction limit: $10,000
│  ├─ Per merchant limit: $500
│  └─ Adjustable by user
└─ Geographic restrictions:
   ├─ Country-level blocks
   ├─ IP-based restrictions
   └─ Travel mode (notify user)

LAYER 4: Data Security (At Rest)
├─ Database encryption:
│  ├─ AES-256-GCM for all sensitive data
│  ├─ Key Management Service (Google Cloud KMS)
│  ├─ Separate keys per data type
│  └─ Key rotation every 90 days
├─ Field-level encryption:
│  ├─ Card number: Encrypted
│  ├─ CVV: Encrypted (deleted after use)
│  ├─ Expiry: Encrypted
│  └─ Routing number: Encrypted
├─ Audit logs:
│  ├─ Immutable (write-once)
│  ├─ Comprehensive (every access logged)
│  ├─ Retention: 7+ years
│  └─ Tamper detection
└─ Secure element:
   ├─ Hardware TEE on Android
   ├─ Private keys in secure element
   ├─ Can't be extracted
   └─ Even if phone rooted, keys safe

LAYER 5: Transaction Security
├─ Amount verification:
│  ├─ User explicitly confirms
│  ├─ Amount shown in large font
│  └─ Unique per transaction
├─ Merchant verification:
│  ├─ Merchant name shown
│  ├─ Merchant category shown
│  ├─ Merchant verified by network
│  └─ Fraud prevention for fake merchants
├─ Real-time fraud detection:
│  ├─ Machine learning models (ML)
│  ├─ Rules-based detection
│  ├─ Device fingerprinting
│  ├─ Behavior analysis
│  └─ Anomaly detection
└─ Velocity checks:
   ├─ Transactions per minute
   ├─ Transactions per hour
   ├─ Transactions per day
   └─ Across devices

LAYER 6: Regulatory Compliance
├─ PCI DSS Level 1 (strictest)
│  ├─ Annual security audit
│  ├─ Penetration testing
│  ├─ Vulnerability assessment
│  └─ Compliance certification
├─ SOC 2 Type II:
│  ├─ Security controls tested
│  ├─ Availability & performance
│  ├─ Processing integrity
│  └─ Annual audit
├─ GDPR (Europe):
│  ├─ User data privacy
│  ├─ Right to deletion
│  ├─ Data portability
│  └─ Privacy by design
├─ Local regulations:
│  ├─ Japan: Maintain Japan-based servers
│  ├─ India: Data localization required
│  ├─ Brazil: Payment data protected
│  └─ China: Limited/No service

LAYER 7: Incident Response
├─ Security monitoring:
│  ├─ 24/7/365 monitoring
│  ├─ Automated alerts
│  ├─ Incident detection
│  └─ Real-time response
├─ Breach procedures:
│  ├─ Affected users notified (within 72 hours)
│  ├─ Card reissuance offered
│  ├─ Fraud monitoring provided
│  └─ Legal compliance met
└─ Post-incident:
   ├─ Root cause analysis
   ├─ System hardening
   ├─ Process improvement
   └─ Lessons learned
```

### Secure Enclave & Hardware Security

```
Android Secure Element Architecture:

User's Phone Hardware:
┌──────────────────────────────────┐
│ Main Processor (ARM)             │
│                                  │
│ Can be:                          │
│  ├─ Rooted                       │
│  ├─ Jailbroken                   │
│  ├─ Malware infected             │
│  ├─ Debugged                     │
│  └─ NOT trusted for secrets      │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ Trusted Execution Environment    │
│ (TEE - Secure Enclave)           │
│                                  │
│ Separate processor:              │
│  ├─ Isolated from main OS        │
│  ├─ Can't be rooted              │
│  ├─ Hardware-protected memory    │
│  ├─ Secure boot                  │
│  └─ Tamper evident               │
│                                  │
│ Stores:                          │
│  ├─ Private keys (card data)     │
│  ├─ Encryption keys              │
│  ├─ Authentication secrets       │
│  └─ Never exposed to OS          │
└──────────────────────────────────┘

Card Tokenization (Secure Enclave):

Main Process (Untrusted):
├─ User clicks "Pay"
└─ Sends request to TEE

TEE Process (Trusted):
├─ Verify user authentication
│  ├─ Check biometric
│  ├─ Check PIN
│  └─ Verify not in hostile state
├─ Access card from secure storage
│  ├─ Card number: 4111 1111 1111 1111
│  ├─ Expiry: 12/25
│  ├─ CVV: 123
│  └─ All encrypted in storage
├─ Generate one-time token:
│  ├─ Create nonce: random 256 bits
│  ├─ Create payload: {card_number, expiry, nonce}
│  ├─ Encrypt with Google's public key
│  └─ Sign with private key (proves authenticity)
├─ Return encrypted token to main OS
│  └─ Main OS can't decrypt
├─ Main OS sends token to payment network
│  └─ Payment network decrypts (has private key)
└─ Card number NEVER exposed to main OS

Why This Works:

Even if attacker:
├─ Roots the device
├─ Installs malware
├─ Debugs the process
├─ Runs MITM attacks
└─ Result: Still can't get card number

Because:
├─ Card stored in TEE (isolated)
├─ TEE can't be rooted
├─ Token encrypted with Google's key
├─ Only Google can decrypt
└─ Card never leaves TEE unencrypted
```

---

## Payment Processing

### End-to-End Transaction Settlement

```
Day 0: Transaction Occurs (Real-time)
├─ 10:00 AM: User taps phone at coffee shop
├─ Payment processed in 500ms
├─ User sees "Payment approved"
├─ $5.00 deducted (authorization hold)
└─ Status: AUTHORIZED

Day 0-1: Batch Processing (Overnight)
├─ 11:00 PM: All transactions from day bundled
├─ Thousands of transactions per batch
├─ Bundle sent to payment network
├─ Payment network sorts by card issuer
│  └─ All visa → Visa clearing house
│  └─ All MC → Mastercard clearing house
└─ Status: CLEARING

Day 1-2: Settlement (Issuer Processing)
├─ Card issuer receives transactions
├─ Issuer verifies:
│  ├─ Still have available balance?
│  ├─ No fraud reported by user?
│  └─ Transaction not disputed?
├─ If verified: Money moved from user's account
├─ If disputed: Chargeback initiated
└─ Status: SETTLED

Day 2-3: Merchant Receives Funds
├─ Acquiring bank (merchant's bank) receives funds
├─ Fees deducted:
│  ├─ Card network fee: 0.5%
│  ├─ Acquiring bank fee: 1.5%
│  ├─ Google Pay fee: 0.5%
│  └─ Total to merchant: 97.5% of transaction
├─ Money deposited to merchant's account
└─ Merchant can see transaction in banking

Reconciliation:

Google Pay Reconciliation Service:
├─ Receives daily settlement reports from networks
├─ Compares:
│  ├─ Authorized transactions vs. settled transactions
│  ├─ Amounts match?
│  ├─ Count matches?
│  └─ All transactions accounted for?
├─ Discrepancies:
│  ├─ Duplicate detection
│  ├─ Missing transactions
│  ├─ Amount mismatches
│  └─ Investigate with payment network
└─ Final reconciliation:
   ├─ Update transaction status
   ├─ Send user receipt email
   ├─ Update merchant accounting
   └─ Close transaction

Database Transactions:

Transaction State Machine:

CREATED → AUTHORIZED → CLEARING → SETTLED → COMPLETED
   ↓           ↓          ↓          ↓
FAILED    DECLINED    ERROR    FAILED

Transitions:
├─ CREATED → AUTHORIZED:
│  └─ Payment network approved
├─ AUTHORIZED → CLEARING:
│  └─ Transaction sent for settlement
├─ CLEARING → SETTLED:
│  └─ Issuer confirmed debit
├─ SETTLED → COMPLETED:
│  └─ Merchant received funds
├─ CREATED → FAILED:
│  └─ Fraud detection blocked
├─ AUTHORIZED → DECLINED:
│  └─ Issuer declined (insufficient funds)
└─ CLEARING → ERROR:
   └─ Settlement failed, retry next day

Webhook Events:

Google Pay publishes events:
├─ transaction.authorized
│  └─ Sent when funds authorized
├─ transaction.cleared
│  └─ Sent when batch cleared
├─ transaction.settled
│  └─ Sent when merchant ready to receive
├─ transaction.completed
│  └─ Sent when funds received
├─ transaction.failed
│  └─ Sent when transaction failed
└─ transaction.disputed
   └─ Sent when chargeback initiated

Merchant Webhook Handler:

webhook_handler(event):
    if event.type == 'transaction.authorized':
        # Update order status
        order.status = 'AUTHORIZED'
        order.save()
        # Prepare item for shipping
        queue.publish('prepare_shipment', order.id)
    
    elif event.type == 'transaction.settled':
        # Confirm payment received
        order.payment_status = 'RECEIVED'
        order.save()
        # Trigger fulfillment
        queue.publish('fulfill_order', order.id)
    
    elif event.type == 'transaction.failed':
        # Payment failed
        order.status = 'PAYMENT_FAILED'
        order.save()
        # Notify customer
        send_email(
            to: order.customer_email,
            subject: 'Payment Failed',
            body: 'Please retry payment'
        )
```

---

## Scalability & Performance

### Handling Billions of Transactions

```
Scale Numbers:

Daily Transactions: 150M
Per Second (Peak): ~2,000 TPS
Peak Hour (Multiplier): 3-5x (lunch time, holidays)
Peak TPS: 10,000 TPS
Busiest Days: Black Friday (20x peak)

Peak Day TPS: 200,000 TPS

System Design for Peak:

Request Handling:

Without Scaling:
├─ Single server: 1,000 requests/second
├─ 10,000 TPS needed: Need 10 servers
├─ But costs multiply for: DB, cache, network
└─ Not cost-effective

With Horizontal Scaling:
├─ 100 API servers (stateless)
├─ 50 Transaction service instances
├─ 30 Fraud detection instances
├─ 20 Tokenization instances
├─ Load balancer distributes traffic
└─ Easy to scale: Add/remove instances

Database Scaling:

Write Load:

Single MySQL Server Limits:
├─ Insert capacity: 10,000 writes/sec (max)
├─ Need for: 100,000 writes/sec (peak)
└─ Solution: Database sharding

Sharding Strategy:
├─ Shard by: user_id % num_shards
├─ Shard 1: user_id % 10 == 0
├─ Shard 2: user_id % 10 == 1
├─ ...
├─ Shard 10: user_id % 10 == 9
│
├─ Each shard handles: 10,000 writes/sec
├─ Total capacity: 100,000 writes/sec
└─ Easy scaling: Add shards, re-shard (data migration)

Read Load:

Master-Replica Setup:
├─ 1 Master (write-heavy)
├─ 10 Replicas (read-only)
│
├─ Writes: Always to master
├─ Reads: Load balanced across replicas
├─ Replication lag: <1 second
└─ Eventual consistency acceptable (reconciliation catches issues)

Cache Layer:

Problem: Database overload
├─ Same queries from millions of users
├─ Redundant database hits
└─ Solution: Redis cache

Caching Strategy:

User Cache:
├─ User profile (age rarely)
├─ Saved cards (moderate frequency)
├─ Account balance (real-time)
├─ Transaction history (time-based)
└─ TTL: 1 hour to 1 week

Card Cache:
├─ Cached last 4 digits (frequent reads)
├─ Cached brand (VISA, MC)
├─ Cached expiry status
├─ Invalidated on delete
└─ TTL: 30 days

Session Cache:
├─ User session token
├─ Valid for: 15 minutes
├─ Refreshable: Yes
├─ Invalidated on logout
└─ TTL: 30 minutes (with refresh)

Cache Invalidation:

Event-driven invalidation:
├─ When card deleted: invalidate card cache
├─ When balance changed: invalidate balance cache
├─ When profile updated: invalidate profile cache
└─ Via: Publish event to cache service

TTL-based invalidation:
├─ Even without events, cache expires
├─ Set reasonable TTL for each data type
├─ Re-fetch from DB on cache miss
└─ If DB unavailable: Serve stale cache (graceful degradation)

Message Queue for Async:

Problem: Slow synchronous operations
├─ Notification sending (slow)
├─ Analytics processing (slow)
├─ Reconciliation (slow)
└─ Solution: Async with message queue

Queue Architecture:

Transaction Flow:
1. Process payment (sync): 200ms
2. Publish event to queue: 10ms
3. Return to user: "Payment approved"

Background Workers:
├─ Consumer 1: Notification Service
│  ├─ Read: transaction.approved event
│  ├─ Send: Push notification
│  ├─ Send: SMS (optional)
│  └─ Send: Email receipt
├─ Consumer 2: Analytics Service
│  ├─ Read: transaction.approved event
│  ├─ Parse: Extract features
│  ├─ Aggregate: Daily metrics
│  └─ Write: Data warehouse (Big Query)
├─ Consumer 3: Reconciliation Service
│  ├─ Read: transaction.settled event
│  ├─ Match: With bank settlement report
│  ├─ Verify: Amounts and counts
│  └─ Update: Database status
└─ Results:
   ├─ User gets notification instantly (parallel)
   ├─ Analytics don't slow down payments
   ├─ Reconciliation catches errors
   └─ All within SLA

Performance Metrics:

API Response Times:
├─ API gateway response: < 5ms
├─ Transaction service: 100-200ms
├─ Payment network round trip: 300-500ms
├─ Total end-to-end: 500-700ms
├─ P50 (median): 450ms
├─ P99 (99th percentile): 2s
└─ SLA: 99.9% requests < 2s

Throughput:
├─ Current capacity: 10,000 TPS sustained
├─ Peak capacity (short burst): 50,000 TPS
├─ With scaling: Add instances, increase to 100,000+ TPS
└─ Cost: ~$0.0001 per transaction (Google Cloud infra)

Availability:
├─ Target: 99.99% uptime
├─ Allowed downtime: 52 minutes/year
├─ Regional redundancy:
│  ├─ US-East: Primary
│  ├─ US-West: Backup
│  └─ EU-West: Separate region
├─ Automatic failover:
│  └─ If region fails: Traffic rerouted (< 1 sec)
└─ Result: Users never notice (transparent)
```

---

## Integration Points

### Developer Integration (In-App Payments)

```
Steps to Integrate Google Pay:

Step 1: Register Application
├─ Developer signs up at Google Pay Console
├─ Register app package name / merchant ID
├─ Verify domain ownership
└─ Get API credentials

Step 2: Add Google Pay Button
HTML/JavaScript:
    <div id="container"></div>
    <script>
        const button = paymentsClient.createButton({
            buttonColor: 'default',
            buttonType: 'checkout',
            onClick: onGooglePayButtonClicked
        });
        document.getElementById('container').appendChild(button);
    </script>

Step 3: Define Payment Configuration
JavaScript:
    const paymentRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [
            {
                type: 'CARD',
                tokenizationSpecification: {
                    type: 'PAYMENT_GATEWAY',
                    parameters: {
                        gateway: 'example',
                        gatewayMerchantId: 'your_gateway_merchant_id'
                    }
                },
                billingAddressParameters: {
                    format: 'FULL',
                    phoneNumberRequired: false
                }
            }
        ],
        merchantInfo: {
            merchantName: 'Your Store',
            merchantId: '1234567890'
        },
        transactionInfo: {
            totalPriceStatus: 'FINAL',
            totalPrice: '99.99',
            currencyCode: 'USD',
            countryCode: 'US'
        },
        emailRequired: true,
        shippingAddressRequired: true,
        shippingAddressParameters: {
            allowedCountryCodes: ['US', 'GB', 'CA']
        }
    };

Step 4: Handle Payment
JavaScript:
    async function onGooglePayButtonClicked() {
        const paymentData = await paymentsClient.loadPaymentData(paymentRequest);
        
        // Send tokenized payment to your server
        const response = await fetch('/api/process-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: paymentData.paymentMethodData.tokenizationData.token,
                amount: '99.99',
                orderId: 'order_123'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show success message
            showConfirmation('Payment successful!');
        } else {
            // Show error
            showError(result.error);
        }
    }

Step 5: Server-Side Processing
Node.js Backend:
    app.post('/api/process-payment', async (req, res) => {
        const { token, amount, orderId } = req.body;
        
        try {
            // 1. Verify token signature (ensure from Google)
            const isValid = await verifyTokenSignature(token);
            if (!isValid) {
                return res.status(400).json({ error: 'Invalid token' });
            }
            
            // 2. Decrypt token (need gateway merchant key)
            const cardData = await gateway.decryptToken(token);
            
            // 3. Process payment
            const result = await processPayment({
                cardToken: cardData,
                amount: amount,
                orderId: orderId,
                merchantId: MERCHANT_ID
            });
            
            if (result.approved) {
                // 4. Return success
                res.json({
                    success: true,
                    transactionId: result.id,
                    orderId: orderId
                });
            } else {
                res.json({
                    success: false,
                    error: result.declineReason
                });
            }
        } catch (error) {
            res.status(500).json({ error: 'Payment processing failed' });
        }
    });

Step 6: Verify & Fulfill
├─ Listen for payment webhooks
├─ Update order status
├─ Prepare shipment
└─ Send confirmation email
```

### Merchant Integration (Online Checkout)

```
Web Checkout Flow:

Merchant Website:
├─ Customer adds items to cart
├─ Clicks "Checkout"
├─ Merchant website loads Google Pay checkout

Google Pay Checkout Page:
├─ User sees cart summary
├─ User selects payment method
│  ├─ Saved card
│  ├─ New card
│  └─ Google Pay balance (if available)
├─ User reviews shipping address
├─ User clicks "Pay"
└─ Payment processed

Return to Merchant:
├─ User redirected back to merchant
├─ Merchant receives transaction ID
├─ Merchant verifies transaction with Google
└─ Merchant completes order

Webhook Notifications:

Google sends webhooks to merchant backend:
├─ transaction.authorized → Order can be prepared
├─ transaction.completed → Order can be shipped
├─ transaction.failed → Notify customer, retry payment
└─ transaction.dispute → Chargeback initiated
```

### Bank & Payment Network Integration

```
Settlement Connection:

Google Pay ↔ Payment Network (Visa/Mastercard) ↔ Banks

Connection Type:
├─ Dedicated fiber optic line
├─ Redundant connections (backup)
├─ Encrypted tunnel (TLS + custom encryption)
├─ 99.99% uptime SLA

Data Format:
├─ ISO 8583 messages (financial standard)
├─ Binary protocol (not JSON)
├─ Proprietary extensions
└─ Compression (optimize for bandwidth)

Daily Settlement:

Morning:
├─ Google Pay sends settlement file to network
├─ Contains all transactions from previous day
├─ Sorted by: Card issuer, merchant acquiring bank
├─ Format: Binary ISO 8583
└─ Transmission time: 30 minutes

Processing:
├─ Network receives file
├─ Validates format and signatures
├─ Routes to appropriate banks
├─ Banks process debits
└─ Money moves through banking system

Afternoon:
├─ Settlement report returned to Google
├─ Confirms: Which transactions settled
├─ Lists: Any discrepancies
├─ Google reconciles against internal DB
└─ Investigation of mismatches
```

---

## Challenges & Solutions

### Technical Challenges

```
Challenge 1: Handling Transaction Ambiguity

Problem:
├─ Network timeout: Is payment approved?
├─ Can't retry (might double-charge)
├─ User experience: "Did payment go through?"
└─ Financial: Need to know for reconciliation

Solution: Idempotency Key
├─ Client generates: UUID()
├─ Client sends: transaction_id + idempotency_key
├─ Server checks: Have I seen this key before?
│  ├─ If yes: Return cached response (no double charge)
│  └─ If no: Process and cache response
├─ Server also: Query payment network immediately
│  └─ Search transaction by timestamp/amount/merchant
└─ Result: Safe retries guaranteed

Challenge 2: Fraud False Positives

Problem:
├─ Fraud detection too strict: Decline legitimate transactions
├─ Users frustrated: Can't buy things
├─ User churn: Switch to competitor
└─ Revenue: Lost transactions

Example:
├─ User travels to new country
├─ Tries to buy something
├─ Fraud system: "This is unusual, decline"
├─ User: "Why did my payment fail?"
├─ User: Calls customer service (expensive)
└─ User: Considers competitor (expensive)

Solution: Progressive Friction
├─ Low risk (score < 20): Approve immediately
├─ Medium risk (score 20-50): Approve but monitor
├─ Higher risk (score 50-75): Challenge user
│  ├─ Ask for OTP (One-Time Password)
│  ├─ Ask for biometric (verify it's user)
│  └─ If verified: Approve, reduce fraud score
├─ High risk (score 75-90): Decline but allow appeal
│  └─ User calls support: Agent manually reviews
├─ Very high risk (score > 90): Block, require contact
   └─ User must call support to unlock

Result:
├─ 95% legitimate transactions approved instantly
├─ 4% require one additional verification
├─ 1% investigated by human review
└─ User experience: Rarely notice security friction

Challenge 3: Cross-Border Payments

Problem:
├─ Different currencies (USD, EUR, INR, etc.)
├─ Different payment networks per country
├─ Different regulations per country
├─ Currency conversion fees
├─ Speed varies by region
└─ Complexity multiplied

Example: USD → INR Transfer
├─ User: American in India, wants to send money
├─ Recipient: Indian, has UPI account (India payments)
├─ Challenge:
│  ├─ USD card (Visa)
│  ├─ INR recipient (local bank account)
│  ├─ Need to convert
│  ├─ Different banking systems
│  ├─ India regulations (strict FX controls)
│  └─ Recipient KYC requirements

Solution: Regional Routing
├─ Detect: Source country, destination country
├─ Query: What payment methods available?
├─ Route to:
│  ├─ Local corridor service (for common routes)
│  ├─ International money transfer service (SWIFT)
│  └─ Bilateral partnerships (faster)
├─ Convert: USD → INR at wholesale rate
├─ Deduct: Transfer fee
├─ Send: Via appropriate corridor
└─ Settle: In destination country

Challenge 4: Real-Time Fraud At Scale

Problem:
├─ 10,000 transactions per second (peak)
├─ Fraud detection must be sub-100ms
├─ ML models require 100-200ms inference
├─ Can't slow down payments
└─ Can't ignore fraud (losses)

Solution: Tiered Detection
├─ Tier 1: Rules (0-10ms)
│  ├─ Check blacklists
│  ├─ Check velocity (too many txns)
│  ├─ Check impossible travel
│  └─ Block obvious fraud immediately
│
├─ Tier 2: Cached ML (20-50ms)
│  ├─ Pre-computed scores in Redis
│  ├─ Updated hourly
│  ├─ Fast lookup: < 50ms
│  └─ Covers 90% of cases
│
├─ Tier 3: Real-time ML (100-200ms)
│  ├─ Full ML model inference
│  ├─ Covers edge cases
│  ├─ Can wait (not critical path)
│  └─ Results used for next transactions
│
└─ Result: 95% fraud detection with <10ms latency

Challenge 5: PCI DSS Compliance At Scale

Problem:
├─ PCI DSS: Strictest security standard
├─ Requires: Encryption, access control, auditing
├─ At scale: 500M users, $1T volume
├─ Regulation: Audits, penetration testing
├─ Violation: $500K - $5M+ fines + jail time
└─ Can't compromise on security

Solution: Tokenization

The key to PCI DSS compliance:
├─ Real card numbers: NEVER stored by merchants
├─ Tokenization: Convert to useless token
├─ Only Google's systems: Have card number
├─ Google's infrastructure: PCI DSS Level 1
├─ Merchants: Never touch real cards
└─ Result: Massive scope reduction

Traditional Merchant:
├─ Merchant stores: Card numbers
├─ Merchant required to be: PCI DSS compliant
├─ Audit cost: $50,000+ per year
├─ Implementation: Months of work
└─ Risk: High (large attack surface)

With Google Pay:
├─ Merchant stores: Tokens only
├─ Merchant required to be: Not PCI DSS compliant (token doesn't count)
├─ Audit cost: $0
├─ Implementation: Easy (call API)
└─ Risk: Low (no card data)

Challenge 6: Recurring Payments

Problem:
├─ Subscription model growing (Netflix, Spotify, etc.)
├─ Businesses need: Charge user monthly
├─ Issue: Card expires, gets declined
├─ Issue: User might dispute charge (chargeback)
├─ Issue: Need to retry failed charges
└─ Solution: Complicated

Solution: Network Tokens
├─ Card network (Visa, MC) maintains token
├─ Token valid for: Entire card validity period
├─ Token can be: Charged multiple times
├─ Issuer: Updates token if card reissued
├─ Result:
│  ├─ Merchant doesn't manage tokens
│  ├─ Failed charges: Automatic retry
│  ├─ Card reissue: Seamless (issuer handles)
│  └─ Chargeback: Easier to defend

Recurring Billing Flow:
├─ Month 1: User subscribes
├─  └─ Get network token from Visa/MC
├─ Month 2: Charge network token
├│  └─ Visa finds user's active card
├─ Month 3: Same card used
├─ Month 4: User gets new card (reissue)
│  └─ Visa automatically routes to new card
├─ Month 5: Works transparently
│  └─ Merchant doesn't change anything
└─ Result: High success rate (95%+)
```

---

## Interview Talking Points

### Question 1: "Design a mobile payment system like Google Pay"

**Your Answer (Senior Architect Approach):**

```
Let me break this down systematically.

1. CLARIFY REQUIREMENTS

Functional Requirements:
├─ Users can add payment methods (cards, accounts)
├─ Users can pay at NFC terminals (tap)
├─ Users can pay online (web/app)
├─ Users can send money P2P
├─ Users can view transaction history
├─ Users can dispute charges
└─ Merchants can see transaction status

Non-functional Requirements:
├─ 99.99% availability
├─ < 1 second payment time (NFC)
├─ Support 10,000+ TPS peak
├─ PCI DSS Level 1 compliance
├─ Real-time fraud detection
├─ Sub-100ms fraud decision
└─ Cost-optimized for scale

Scale:
├─ Users: 500M active
├─ Transactions/day: 150M
├─ Payment methods: 5B+ cards
├─ Merchants: 100M+
└─ Countries: 70+

2. IDENTIFY KEY CHALLENGES

Challenge 1: Security
├─ Can't store card numbers in databases
├─ Can't expose card numbers to merchants
├─ Must prevent unauthorized access
└─ Solution: Tokenization + Encryption

Challenge 2: Real-time Fraud
├─ 10,000 TPS, need fraud decision in < 100ms
├─ ML models too slow (100-200ms)
├─ Can't reject legitimate transactions
└─ Solution: Tiered detection (rules → cache → ML)

Challenge 3: Idempotency
├─ Network timeout: Is payment approved?
├─ Can't retry without idempotency key
├─ Risk: Double charging users
└─ Solution: Idempotency keys + status queries

Challenge 4: Scalability
├─ 150M transactions/day across all systems
├─ Database can't handle single point writes
├─ Network bandwidth limited
└─ Solution: Sharding + Caching + Async

3. SYSTEM ARCHITECTURE

┌─────────────────────────────────────┐
│ Client Layer                        │
│ ├─ Android (Secure Element)         │
│ ├─ iOS (Secure Enclave)             │
│ └─ Web (JavaScript SDK)             │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ API Gateway                         │
│ ├─ Load balancing (100 instances)   │
│ ├─ Rate limiting                    │
│ └─ TLS termination                  │
└─────────────┬───────────────────────┘
              │
    ┌─────────┼─────────┐
    │         │         │
┌───▼────┐┌──▼──────┐┌─▼──────┐
│Payment ││Tokenize ││User    │
│Service ││Service  ││Service │
└───┬────┘└──┬──────┘└─┬──────┘
    │        │         │
    └────────┼─────────┘
             │
    ┌────────▼────────┐
    │Fraud Detection  │
    │Service          │
    └────────┬────────┘
             │
    ┌────────▼────────┐
    │Data Layer       │
    ├─ MySQL (Users)  │
    ├─ Cassandra (TX) │
    ├─ Redis (Cache)  │
    └─ Vault (Cards)  │

4. KEY COMPONENTS

Payment Service:
├─ Receives payment request
├─ Verifies payment method exists
├─ Calls fraud detection
├─ Requests token from tokenization service
├─ Sends to payment network
├─ Records transaction
└─ Returns result to client

Tokenization Service:
├─ Takes real card number (from secure enclave)
├─ Encrypts with Google's key
├─ Returns one-time token
├─ Token valid for 60 seconds
├─ Token useless without key
└─ Sent to merchant (safe)

Fraud Detection Service:
├─ Extract 1000+ features
├─ Run business rules (< 10ms)
├─ Check cached ML score (< 50ms)
├─ Run full ML model (100-200ms, async)
├─ Return: Approve/Challenge/Decline/Block
└─ Decision: < 100ms

5. DETAILED FLOW: NFC Tap Payment

T=0ms: User taps phone
└─ NFC antenna activated

T=10-50ms: NFC handshake
├─ Terminal ↔ Phone communication
├─ Secure channel established
└─ Terminal asks for payment data

T=50-100ms: Secure element tokenization
├─ Secure element woken
├─ User authentication (biometric/PIN)
├─ Real card accessed (from SE)
├─ Token generated (encrypted)
└─ Sent to NFC controller

T=100-200ms: NFC transmission
├─ Token sent to terminal
├─ Terminal receives (encrypted, useless)
├─ Terminal includes: amount, merchant ID
└─ Sent to acquiring bank

T=200-500ms: Network processing
├─ Acquiring bank → Card network (Visa/MC)
├─ Card network → Issuer (user's bank)
├─ Issuer checks: Balance, fraud rules
├─ Issuer approves/declines
├─ Response back through network
└─ Total: ~300ms

T=500-600ms: Terminal confirms
├─ Shows "APPROVED"
├─ Phone vibrates/beeps
└─ User leaves

Parallel: Google Pay backend (T=100-1000ms)
├─ Transaction service logs
├─ Fraud detection analyzes
├─ Reconciliation recorded
├─ Notification sent
└─ User sees notification in app

Result: 600ms total, user sees approval in 500ms

6. SECURITY ARCHITECTURE

Layer 1: Client
├─ Secure Element (TEE)
├─ Hardware-protected storage
├─ Can't be rooted
└─ Card never exposed

Layer 2: Transport
├─ TLS 1.3 for all APIs
├─ Certificate pinning
├─ Encrypted NFC
└─ VPN/proxy detection

Layer 3: Application
├─ Tokenization (card → useless token)
├─ No plaintext card numbers
├─ PCI DSS scope reduction
└─ Google handles PCI (Level 1)

Layer 4: Database
├─ AES-256-GCM encryption
├─ Separate keys per data type
├─ Key rotation (90 days)
├─ Audit logs (immutable)
└─ HSM for key storage

Layer 5: Monitoring
├─ Real-time fraud detection
├─ Behavioral analysis
├─ Anomaly detection
├─ 24/7 SOC monitoring
└─ Auto-incident response

7. SCALABILITY

API Layer:
├─ 100+ instances
├─ Load balancer (round-robin)
├─ Horizontal scaling (add more)
└─ Stateless (can go down anytime)

Database:
├─ MySQL sharding (10 shards)
├─ Cassandra for transaction log (immutable)
├─ Redis for cache (session, cards)
└─ Per-region redundancy

Message Queue:
├─ Kafka for events
├─ Async processing
├─ Notification service consumes
├─ Analytics service consumes
└─ Decouples slowness

Results:
├─ Current: 10,000 TPS sustained
├─ Peak: 50,000 TPS with scaling
├─ Latency: P50 450ms, P99 2s
└─ Cost: ~$0.0001/transaction

8. FAILURE HANDLING

Failure Mode 1: Payment network down
├─ Queue transactions locally
├─ Retry with exponential backoff
├─ After 3 retries: Mark for investigation
├─ Query network status (is it up?)
└─ User notified: "Trying again..."

Failure Mode 2: Fraud service down
├─ Fall back to rules-based detection only
├─ More false positives (worse UX)
├─ But system still works
├─ Escalate: Page on-call engineer
└─ Recover: Restart service, replay queue

Failure Mode 3: Database down
├─ Read from cache
├─ Serve stale data (if needed)
├─ No writes until recovered
├─ Fail fast (don't queue if down > 30s)
├─ User: "Try again in a few minutes"
└─ Meanwhile: Database team investigating

Failure Mode 4: Data center down
├─ Automatic failover to backup region
├─ Users in that region: Rerouted
├─ Users in other regions: Unaffected
├─ RTO: < 1 minute (transparent)
└─ Zero data loss (replicated)

9. TRADE-OFFS EXPLAINED

Eventual Consistency vs Strong Consistency
├─ User sees balance immediately (optimistic)
├─ Actual balance updates in background
├─ 99% of time: Matches instantly
├─ 1% of time: May take seconds
├─ Why: Speed > perfection
└─ Reconciliation catches errors

Latency vs Security
├─ Fraud detection fast (100ms < slow)
├─ But not perfect (some fraud gets through)
├─ vs. Perfect but slow (users frustrated)
├─ Choose: Good enough fast
└─ Additional: Watermark for chargeback proof

Availability vs Consistency
├─ User can pay even if reconciliation delayed
├─ System stays up even with minor errors
├─ vs. Wait for perfect consistency
├─ Choose: Always available
└─ Correction: Later reconciliation

Cost vs Features
├─ Tokenization: More expensive (encryption)
├─ But: Reduces PCI scope (saves way more)
├─ Fraud detection: Expensive ML
├─ But: Prevents fraud losses (saves way more)
└─ Choose: Invest in security

10. MONITORING & OBSERVABILITY

Metrics:
├─ Request latency (P50, P99)
├─ Error rate (per service)
├─ Fraud rate (% transactions flagged)
├─ False positive rate (legitimate declined)
├─ Transaction throughput (TPS)
└─ Cost per transaction

Alerting:
├─ Latency spike: Alert if P99 > 3s
├─ Error rate: Alert if > 0.1%
├─ Fraud rate spike: Investigate (might be attack)
├─ Service down: Page on-call

Logging:
├─ Structured logs (JSON)
├─ Correlation ID (trace request)
├─ Immutable audit logs
├─ 7+ year retention
└─ Encryption (PCI requirement)

Tracing:
├─ Start in API Gateway
├─ Pass ID to all services
├─ See full path: Request → Payment → Fraud → Network
├─ Identify bottlenecks
└─ Debug issues faster

11. FUTURE IMPROVEMENTS (Bonus)

┌─ Instant settlements (T+0 vs T+2)
├─ Blockchain for transparency
├─ Offline payments (work without internet)
├─ Biometric only (no PIN needed)
├─ AI-powered fraud (zero fraud)
├─ Voice-activated payments
└─ Expanding to more countries
```

---

### Question 2: "How do you prevent fraud in real-time?"

**Your Answer:**

```
Real-time fraud detection is one of the hardest problems in fintech.

Let me explain the complete solution:

1. THE PROBLEM

Scale:
├─ 10,000 transactions per second
├─ Need fraud decision in < 100ms
├─ Can't reject legitimate transactions
├─ Can't let fraud through

Conflicting Goals:
├─ Goal 1: Catch fraud (minimize loss)
├─ Goal 2: Fast transactions (minimize friction)
├─ Goal 3: Approve legitimate (minimize frustration)
└─ Goal 4: Real-time (no latency)

Trade-off:
├─ Perfect fraud detection: Too slow
├─ Instant approval: Misses fraud
├─ Solution: Tiered approach

2. TIERED FRAUD DETECTION

Tier 1: Rules (< 10ms)
├─ Business rule engine
├─ Pre-programmed rules
├─ Check at request time
├─ Fast decision
│
├─ Examples:
│  ├─ IF amount > $10,000 → FLAG
│  ├─ IF merchant in blacklist → BLOCK
│  ├─ IF user in 2 countries in 1 hour → FLAG
│  ├─ IF 5+ transactions in 60 seconds → FLAG
│  ├─ IF new card, amount > $1,000 → FLAG
│  ├─ IF issued from high-risk country → FLAG
│  ├─ IF IP flagged by threat intel → BLOCK
│  └─ IF device rooted/jailbroken → FLAG
│
├─ Output: Score 0-100
├─ Latency: < 10ms
├─ Coverage: ~70% of transactions

Tier 2: Cached ML (20-50ms)
├─ Machine learning model
├─ Run offline (nightly)
├─ Results cached in Redis
├─ Instant lookup at request time
│
├─ Features:
│  ├─ User features:
│  │  ├─ Average transaction amount
│  │  ├─ Typical merchant categories
│  │  ├─ Geographic patterns
│  │  ├─ Time-of-day patterns
│  │  └─ Historical fraud rate
│  ├─ Device features:
│  │  ├─ Devices used by this user
│  │  ├─ Device age
│  │  └─ Device fraud history
│  ├─ Card features:
│  │  ├─ Card age
│  │  ├─ Previous frauds
│  │  └─ Card issuer
│  └─ Network features:
│     ├─ IP reputation
│     ├─ VPN/Proxy detection
│     └─ ISP geolocation
│
├─ Models:
│  ├─ XGBoost (gradient boosting)
│  ├─ Neural network (deep learning)
│  └─ Logistic regression (baseline)
│
├─ Output: Fraud probability 0-1.0
├─ Latency: < 50ms (Redis lookup)
└─ Coverage: ~95% of transactions

Tier 3: Real-time ML (100-200ms)
├─ Full ML model inference
├─ Called for edge cases
├─ Can wait (not critical path)
├─ Results improve future models
│
├─ Features: 1000+ features
│  ├─ All features from Tier 2
│  ├─ Historical merchant data
│  ├─ Category-specific patterns
│  ├─ Temporal features (day of week, time)
│  └─ Ensemble features (combo patterns)
│
├─ Output: Fraud probability + confidence
├─ Latency: 100-200ms
└─ Coverage: Handles 5% hard cases

3. COMBINING SCORES

Rule Score: 0-100 (Tier 1)
ML Score (cached): 0-100 (Tier 2)
Real-time ML: 0-100 (Tier 3, async)

Final Score:
final_score = 0.3 * rule_score + 0.7 * ml_score

Decision:
if final_score < 20:
    APPROVE (low risk)
elif final_score < 50:
    APPROVE + MONITOR (medium risk)
elif final_score < 75:
    CHALLENGE (require 2FA / OTP)
elif final_score < 90:
    DECLINE (but allow appeal)
else:
    BLOCK (high confidence fraud)

4. PROGRESSIVE FRICTION APPROACH

Low Risk (Score < 20):
├─ 70% of transactions
├─ Instant approval
├─ No friction
└─ Example: Regular user, known merchant, normal amount

Medium Risk (Score 20-50):
├─ 20% of transactions
├─ Approve immediately
├─ Passive monitoring (log for review)
├─ Example: New merchant, slightly unusual amount

Higher Risk (Score 50-75):
├─ 8% of transactions
├─ Challenge user:
│  ├─ Send OTP to phone
│  ├─ User enters code
│  └─ If verified: APPROVE
├─ Friction: 20-30 seconds
└─ Example: Large amount, unusual merchant

High Risk (Score 75-90):
├─ 1.5% of transactions
├─ Decline transaction
├─ User can appeal:
│  ├─ Call customer service
│  ├─ Agent reviews
│  ├─ If legitimate: APPROVE
│  └─ Takes minutes
├─ Friction: 5-10 minutes
└─ Example: Impossible travel (US → Asia in 1 hour)

Very High Risk (Score > 90):
├─ 0.5% of transactions
├─ Block immediately
├─ Account lockdown:
│  ├─ All payment methods disabled
│  ├─ User gets security alert
│  ├─ Must verify account ownership
│  └─ Phone call from security team
├─ Friction: 30+ minutes
└─ Example: Account takeover detected

Result:
├─ 70% users: No friction (approve instantly)
├─ 20% users: 0 friction (approve + log)
├─ 8% users: 20-30s friction (OTP required)
├─ 1.5% users: Manual review (call support)
├─ 0.5% users: Account lockdown (security team)

5. MACHINE LEARNING MODEL

Training:

Data:
├─ 10 years of transactions
├─ 1M+ labeled frauds
├─ 5B legitimate transactions
├─ 500 billion transactions total

Features:
├─ Time-based: Day, hour, minute patterns
├─ User-based: Behavioral profile
├─ Geographic: Location, travel speed
├─ Device-based: Device ID, device health
├─ Card-based: Age, network, issuer
├─ Merchant-based: Category, riskiness
├─ Amount-based: Compared to historical
├─ Network-based: IP, ISP, proxy
└─ Ensemble: Interaction features

Algorithm:
├─ XGBoost: Fast, accurate
├─ Neural Network: Captures complex patterns
├─ Logistic Regression: Simple baseline
└─ Ensemble vote: Better accuracy

Training:
├─ Daily retraining (new data)
├─ Validation: Hold-out test set
├─ A/B testing: New model vs old
└─ Gradual rollout: 1% → 10% → 100%

Performance:
├─ True positive rate (catch fraud): 95%+
├─ False positive rate (block legitimate): 2-5%
├─ F1 score: 0.92 (excellent)
├─ AUC: 0.98 (outstanding)

6. HANDLING NETWORK ATTACKS

Attack: Fraud Ring

Definition:
├─ Organized group
├─ Stolen cards
├─ Multiple accounts coordinating
├─ Same location/IP
└─ Simultaneous transactions

Detection:
├─ Multiple cards at same IP
├─ Multiple accounts same location
├─ Same merchant (testing stolen cards)
├─ Rapid-fire transactions
└─ Rules catch most

Action:
├─ IP blacklist (all from IP blocked)
├─ Merchant flag (requires extra verification)
├─ Account freezes (investigate)
├─ Card revocation (notify issuer)
└─ Law enforcement notification

Attack: Account Takeover

Definition:
├─ Attacker compromises account
├─ Knows password
├─ May have bypassed 2FA
├─ Makes unauthorized purchases
└─ User doesn't notice

Detection:
├─ Behavior change:
│  ├─ Different device
│  ├─ Different location
│  ├─ Different time of day
│  ├─ Different merchants
│  └─ Different amount patterns
├─ Rules detect impossible travel
├─ ML detects behavior divergence
└─ Result: High fraud score

Action:
├─ Challenge with OTP
├─ Disable other payment methods
├─ Lock account (user must verify)
├─ Password reset required
├─ Security questions
└─ Send verification email

Attack: Stolen Card Testing

Definition:
├─ Attacker has stolen card
├─ Tests with micro transactions
├─ $0.01 → $1 → $10 → $100 (escalation)
├─ Trying to avoid detection
└─ Once successful: Big purchase

Detection:
├─ New card, multiple merchants
├─ Low amounts (test transactions)
├─ Rapid-fire (within minutes)
├─ Unusual merchants
└─ Rules trigger on patterns

Action:
├─ Block after 2-3 test transactions
├─ Notify cardholder
├─ Card issuer contacted
├─ Transaction suspended
└─ Investigation initiated

7. CHARGEBACK PROTECTION

Chargeback: User disputes transaction

Timeline:
├─ Day 0: Transaction occurs
├─ Day 30: User opens dispute
├─ Day 60: Bank investigates
├─ Day 90: Decision (user or merchant)
└─ Day 120: Final settlement

Dispute Reasons:
├─ "Unauthorized transaction" (fraud/takeover)
├─ "Item not received" (merchant scam)
├─ "Item not as described" (quality issue)
├─ "Duplicate charge" (billing error)
└─ "Billing error" (wrong amount)

Google Pay Defense:

For "Unauthorized" claims:
├─ Prove: User verified with biometric/PIN
├─ Prove: Device known to user
├─ Prove: Watermark shows user session
└─ Win rate: 95%+

For "Fraud" claims:
├─ Prove: Transaction from known device
├─ Prove: User's location (GPS log)
├─ Prove: User's IP (network log)
├─ Prove: User's biometric (if available)
└─ Win rate: 90%+

Forensic Watermarking:
├─ Every transaction watermarked
├─ Watermark includes:
│  ├─ User ID
│  ├─ Device ID
│  ├─ Timestamp
│  └─ Location
├─ Watermark: Non-repudiable proof
├─ In chargeback: Used to prove user made txn
└─ Win rate: 98%+ with watermark

8. CONTINUOUS IMPROVEMENT

Feedback Loop:

Transaction Flow:
├─ Approved: Can't verify (mostly legitimate)
├─ Declined: Can investigate (mostly fraud)
├─ Charged back: Definitely fraud
├─ Confirmed fraud: 100% labeled
└─ Labeled data: Train next model

Weekly Analysis:
├─ Which transactions declined unjustly?
│  └─ Users called support: Can label
├─ Which transactions approved were fraud?
│  └─ Chargebacks: 100% confirmed
├─ Pattern analysis: Why did we miss?
│  └─ Improve feature engineering
└─ Update rules: Add new patterns

Monthly Retraining:
├─ Add new labeled data
├─ Update ML models
├─ A/B test new model
└─ Gradual rollout if better

Result:
├─ Model improves monthly
├─ False positive rate decreases
├─ Fraud detection rate increases
├─ User experience improves
└─ Cost decreases
```

---

### Question 3: "How do you ensure transaction idempotency?"

**Your Answer:**

```
Idempotency is critical to prevent double-charging users.

The Problem:

Scenario:
├─ User taps phone at terminal
├─ Payment sent to Google servers
├─ Network packet arrives → transaction processed
├─ Response sent back: "Approved"
├─ But user's phone doesn't receive response (timeout)
├─ User tries again: Taps phone again
├─ Server: "Did I process this already?"

Risk:
├─ If no idempotency: User charged twice
├─ User loses $X (deducted twice)
├─ Customer support call needed
├─ User trust lost
└─ Company liable ($2X refund + penalty)

Solution: Idempotency Key

What:
├─ Unique ID per transaction attempt
├─ Generated on client side
├─ Sent with request
├─ Server checks: "Have I seen this key?"

Implementation:

Client Side:
    transaction_id = UUID.random()  // Client generates
    idempotency_key = SHA256(transaction_id + timestamp)
    
    request_body = {
        idempotency_key: idempotency_key,
        amount: 19.99,
        merchant_id: "merchant_123",
        ...
    }
    
    // Send request
    response = send_to_server(request_body)
    
    // Network timeout? No problem!
    if timeout:
        // Retry with SAME idempotency_key
        // Server will recognize it

Server Side:
    @post('/api/payment')
    def process_payment(request):
        idempotency_key = request.body.idempotency_key
        
        // Check if we've seen this key before
        cached_response = redis.get(f"idempotency:{idempotency_key}")
        
        if cached_response:
            // We've already processed this!
            return cached_response  // Return old response
        
        // New request, process normally
        transaction = create_transaction(request)
        payment_result = process_with_payment_network(transaction)
        
        // Cache result for future retries
        redis.set(
            f"idempotency:{idempotency_key}",
            payment_result,
            ex=3600  // Expire after 1 hour
        )
        
        return payment_result

How It Works:

Attempt 1 (Succeeds):
├─ Client: sends idempotency_key = "abc123"
├─ Server: Checks cache → miss
├─ Server: Processes transaction
├─ Server: Saves response in cache
└─ Server: Returns response

Attempt 2 (Retry, Network timeout on Attempt 1):
├─ Client: sends SAME idempotency_key = "abc123"
├─ Server: Checks cache → HIT
├─ Server: Returns cached response (no reprocessing)
└─ Client: Never knows about retry

Result:
├─ Exactly-once semantics: Only charged once
├─ Retries are safe
├─ No double-charging
└─ Transparent to user

Storage Implementation:

Redis Cache:
├─ Key: f"idempotency:{idempotency_key}"
├─ Value: {
│    "status": "approved",
│    "transaction_id": "txn_123",
│    "amount": 19.99,
│    "timestamp": 1624564800
│  }
├─ Expiry: 1 hour
├─ Latency: < 5ms
└─ Capacity: Billions of keys

Long-term Storage:
├─ Also store in database (MySQL)
├─ For audit/compliance
├─ Key: idempotency_key
├─ Value: cached response
├─ Retention: 90 days
└─ Used for dispute resolution

Guarantee Semantics:

This provides:
├─ At-least-once: Request processed at least once
├─ Idempotent: Multiple identical requests = one processing
├─ Safe retries: Client can retry infinitely
└─ Exactly-once: From client perspective (one charge)

Edge Cases:

Edge Case 1: Retry with new idempotency key
├─ Client: New key = "xyz789"
├─ Server: Cache miss
├─ Server: Process (may be different transaction)
└─ Result: Could charge twice (user error)

Prevention:
├─ Client never generates new key for same transaction
├─ Key derived from: transaction_id + timestamp
├─ Same inputs = same key
└─ Guaranteed idempotency

Edge Case 2: Concurrent requests with same key
├─ Request A: arrives with key "abc"
├─ Request B: arrives with key "abc" (same time)
├─ Both miss cache (concurrent)
├─ Both process (RACE CONDITION!)
└─ Result: Could process twice

Prevention:
├─ Use cache lock: Redis SET with NX
├─ Atomic operation: SET only if missing
├─ Loser waits for winner's result
└─ Result: Always exactly once

Implementation:
    def process_payment_idempotent(request):
        key = f"idempotency:{idempotency_key}"
        
        // Check cache (read)
        cached = redis.get(key)
        if cached:
            return cached
        
        // Try to get lock (atomic)
        lock_acquired = redis.set(
            f"lock:{key}",
            "processing",
            nx=True,  // Only set if not exists
            ex=10     // Auto-release after 10s
        )
        
        if not lock_acquired:
            // Another request is processing
            // Wait for its result
            wait_for_result(key, timeout=5)
            return redis.get(key)
        
        try:
            // Process transaction
            result = process_with_network(request)
            
            // Save result
            redis.set(key, result, ex=3600)
            
            return result
        finally:
            // Release lock
            redis.delete(f"lock:{key}")

Edge Case 3: Cache expires before settle ment
├─ Cache expiry: 1 hour
├─ Settlement: Happens T+2 days
├─ Customer: "I was charged twice"
├─ But: Cache no longer has response
└─ Issue: Can't prove idempotency

Prevention:
├─ Database (MySQL) is source of truth
├─ Even if Redis expires, check database
├─ Query: transaction_id + user_id
└─ Can prove: Transaction only happened once

Enhanced Implementation:
    def check_duplicate(idempotency_key, user_id):
        // Check cache first (fast)
        cached = redis.get(f"idempotency:{idempotency_key}")
        if cached:
            return cached
        
        // Check database (slow, but persistent)
        db_result = db.query(
            "SELECT * FROM idempotent_requests 
             WHERE idempotency_key = ? AND user_id = ?",
            idempotency_key, user_id
        )
        
        if db_result:
            // We've seen this before
            return db_result[0].response
        
        // New request
        return None
```

---

### Question 4: "What would you change about Google Pay if you were the architect?"

**Your Answer (Honest Assessment):**

```
Great question. Even as a senior architect, I think there are areas to improve:

1. INSTANT SETTLEMENT (Currently T+2 days)

Current Problem:
├─ User pays today
├─ Merchant gets funds in 2 days
├─ Risk: What if chargeback in those 2 days?
├─ Merchant: Doesn't know if payment final
├─ User: Can't see where money went

Current Process:
├─ Day 0: Payment processed (authorization)
├─ Day 1: Batch cleared through network
├─ Day 2: Settlement (money in merchant bank)
└─ Why: Legacy banking infrastructure (SWIFT, etc.)

Improvement: Real-time Settlement

How:
├─ Direct bank integration
├─ Skip card networks (Visa/MC)
├─ Instant debit-to-debit
├─ Blockchain for transparency (optional)
└─ T+0 (same day) or T+1

Benefits:
├─ User: Sees immediate deduction
├─ Merchant: Gets funds instantly
├─ Company: Reduced fraud window (2 days)
├─ Risk: Chargeback requires reversal API
└─ Better UX: Real-time settlement notifications

Challenge:
├─ Requires bank partnerships (hard)
├─ Payment network won't like it (lose fees)
├─ Complex for multi-currency (FX timing)
└─ But: Worth the effort (better product)

2. OFFLINE PAYMENTS

Current Problem:
├─ Google Pay requires internet
├─ No internet? No payments
├─ Example: Subway in tunnel, airplane mode
├─ User: "Why can't I pay offline?"

Current Implementation:
├─ All authorization happens online
├─ Payment network must approve
├─ No offline capability
└─ Workaround: Cash (backwards)

Improvement: Offline Capability

How:
├─ Pre-authorized transaction limits
├─ User unlocked 5 offline transactions: $100 each
├─ Transaction stored on phone
├─ When online: Sync and settle
├─ Terminal: Works offline (tap works without network)

Benefits:
├─ User: Can pay on airplane/subway
├─ Merchant: Works everywhere
├─ Company: New market (developing countries)
├─ Risk: Limited pre-auth, not unbounded

Challenge:
├─ More complex fraud detection
├─ Double-spending protection (offline)
├─ Needs blockchain or distributed ledger
└─ But: Huge opportunity (developing markets)

3. CRYPTOGRAPHIC PROOF OF PAYMENT

Current Problem:
├─ In dispute: "Who did the transaction?"
├─ Watermark helps but not cryptographic
├─ Customer: "I didn't do it"
├─ Merchant: "You did"
├─ Resolution: Expensive chargeback process

Current Implementation:
├─ Watermarking (invisible marker)
├─ Device logs
├─ Network logs
├─ But: Not cryptographically proof
└─ Can be disputed

Improvement: Non-repudiation

How:
├─ Sign transaction with user's private key
├─ Signature proves: User authorized payment
├─ Cryptographically: Impossible to forge
├─ Blockchain: Immutable proof
└─ User can't deny payment

Benefits:
├─ Chargeback disputes: User can't win (proof)
├─ Fraud prevention: Less incentive to lie
├─ Company: Win rate near 100%
└─ User: Honest users aren't accused

Challenge:
├─ User needs private key (generate on phone)
├─ Key management complex
├─ Recovery if lost
├─ But: Worth it (eliminates fraud)

4. DECENTRALIZED IDENTITY

Current Problem:
├─ Account linked to phone number
├─ Phone lost: Account access lost
├─ Requires: Lengthy recovery process
├─ User: Frustrated
├─ Company: Support cost

Current Implementation:
├─ Account tied to Google account
├─ Phone number as backup
├─ Recovery: Call support, answer questions
└─ Takes: Hours to days

Improvement: Decentralized Identity

How:
├─ User has cryptographic identity (private key)
├─ Can use on any device
├─ Recovery: Doesn't require phone
├─ Backup key splits (Shamir secret sharing)
└─ Family can help recover

Benefits:
├─ User: Portable identity
├─ Company: No support calls
├─ User: Faster account access
└─ Reduces: Account recovery complexity

Challenge:
├─ Complex implementation
├─ Users don't understand crypto
├─ Private key management hard
└─ But: Long-term bet

5. UNIVERSAL INTEROPERABILITY

Current Problem:
├─ Google Pay only works with Google
├─ Apple Pay only with Apple
├─ Samsung Pay only with Samsung
├─ User: Locked into ecosystem

Current Implementation:
├─ Proprietary APIs
├─ Closed ecosystem
├─ High switching costs
└─ Anti-competitive

Improvement: Open Standard

How:
├─ Support open payment standards
├─ Cross-platform compatibility
├─ Merchant doesn't care about brand
├─ User chooses their provider
└─ True competition

Benefits:
├─ User: Freedom to switch
├─ Market: More competition
├─ Industry: Better innovation
└─ Consumer: Better prices

Challenge:
├─ Reduces Google's moat
├─ Revenue implications
├─ Network effects work against
└─ But: Right long-term (anti-trust pressure anyway)

6. PRIVACY IMPROVEMENTS

Current Problem:
├─ Google sees all transactions
├─ Can track user's spending
├─ Privacy implications
├─ User: Uncomfortable

Current Implementation:
├─ Google collects all data
├─ Used for ML models
├─ Used for ad targeting (controversial)
└─ Privacy policy: Allows this

Improvement: Privacy-Preserving

How:
├─ Merchant name blinded
├─ Amount encrypted
├─ Only user and issuer see full details
├─ Google sees: Just a transaction happened
├─ Federated learning: Train model without raw data

Benefits:
├─ User: Real privacy
├─ Company: Better trust
├─ Regulatory: GDPR compliance easier
└─ Competitive: "We don't track you"

Challenge:
├─ Fraud detection harder (less data)
├─ Personalization less good
├─ Ad targeting impossible
├─ But: Users value privacy (modern)

7. CARBON FOOTPRINT TRACKING

Current Problem:
├─ User doesn't know environmental impact
├─ Carbon-intensive businesses (oil, meat)
├─ Green businesses (renewable energy)
├─ User: "How do I choose?"

Current Implementation:
├─ No environmental data
└─ Users make blind choices

Improvement: Carbon Scoring

How:
├─ Integrate carbon intensity per merchant
├─ Show user: "This purchase = 50 kg CO2"
├─ Compare: "Average purchase = 10 kg CO2"
├─ Suggest: "This green option = 1 kg CO2"
└─ Option: Offset carbon (pay extra)

Benefits:
├─ User: Make informed decisions
├─ Merchant: Incentive to reduce carbon
├─ Environment: Less emissions
└─ Company: Brand: "We're responsible"

Challenge:
├─ Data collection (per merchant)
├─ Complexity (supply chain)
├─ User care (do they care?)
└─ But: Future will demand it

SUMMARY OF IMPROVEMENTS:

Priority 1 (High Impact, Medium Effort):
├─ Instant settlement (T+0)
├─ Offline payments
└─ Privacy improvements

Priority 2 (Medium Impact, High Effort):
├─ Cryptographic proof
├─ Decentralized identity
└─ Universal interoperability

Priority 3 (Nice-to-Have, Medium Effort):
├─ Carbon tracking
├─ Better UX
└─ Emerging markets

What I'd Focus On:
├─ Instant settlement (huge UX win)
├─ Offline payments (huge market: developing countries)
├─ Privacy (competitive advantage + regulatory)
└─ Ignore: Interoperability (against company interest)
```

---

## Summary of Key Takeaways

```
Google Pay Architecture:

1. SECURITY (Defense-in-depth)
   ├─ Tokenization (card → token)
   ├─ Encryption (AES-256)
   ├─ Secure enclave (hardware protection)
   ├─ PCI DSS Level 1 compliance
   └─ Real-time fraud detection

2. SCALE (Billions of transactions)
   ├─ Horizontal scaling (stateless services)
   ├─ Database sharding (data partitioning)
   ├─ Caching (Redis)
   ├─ Message queues (async processing)
   └─ Monitoring (observability)

3. RELIABILITY (Always available)
   ├─ Multi-region deployment
   ├─ Automated failover
   ├─ Circuit breakers (graceful degradation)
   ├─ Retry logic (exponential backoff)
   └─ Idempotency (no double-charging)

4. PAYMENTS (End-to-end)
   ├─ NFC (tap phone)
   ├─ QR code (scan to pay)
   ├─ Online (web checkout)
   ├─ P2P (send money)
   └─ Settlement (T+2 days)

5. FRAUD (Real-time detection)
   ├─ Rules-based (fast)
   ├─ Cached ML (faster)
   ├─ Real-time ML (accurate)
   ├─ Progressive friction (UX)
   └─ Watermarking (chargeback proof)

Key Interview Messages:
├─ "I understand security implications"
├─ "I think at scale"
├─ "I make trade-offs explicit"
├─ "I focus on user experience"
├─ "I have opinions on improvements"
└─ "I explain honestly (not just Google)"
```

---

*This document represents Google Pay's publicly disclosed technology and best practices in fintech system design. Actual implementation may differ based on recent changes.*
