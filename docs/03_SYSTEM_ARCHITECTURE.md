# LM-Vision — System Architecture

## 1. Architecture Overview

```mermaid
flowchart TD
    Mobile[Inspector Mobile App]
    Web[Web Command Center]
    API[Shared Backend API]
    AI[AI Gateway]
    OCR[OCR/CV Engine]
    Rules[Deterministic Rule Engine]
    DB[(Supabase PostgreSQL)]
    Storage[(Supabase Storage)]
    Reports[Report Engine]
    Audit[Audit Log]

    Mobile --> API
    Web --> API
    API --> AI
    API --> OCR
    AI --> Rules
    OCR --> Rules
    API --> Rules
    Rules --> DB
    API --> DB
    API --> Storage
    DB --> Reports
    Storage --> Reports
    API --> Audit
    Rules --> Audit
```

### Architecture principles

- Clients never decide legal outcomes.
- AI and CV provide evidence/measurements.
- Rule engine is deterministic and versioned.
- Human verification is a first-class domain object.
- Storage and database are separated but cryptographically linked by evidence hashes.

## 2. Mobile Architecture

```mermaid
flowchart LR
    UI[React Native UI]
    State[Inspection State Store]
    Camera[Camera Module]
    Queue[Offline Queue]
    Sync[Sync Manager]
    API[Backend API]
    Local[(Local Storage)]

    UI --> State
    UI --> Camera
    State --> Local
    Camera --> State
    State --> Queue
    Queue --> Sync
    Sync --> API
    API --> Sync
```

## 3. Web Architecture

```mermaid
flowchart TD
    Browser[Web Browser]
    Next[Next.js Application]
    Domain[Application/Domain Services]
    API[Backend API]
    DB[(PostgreSQL)]
    Storage[(Evidence Storage)]
    Charts[Analytics + Recharts]

    Browser --> Next
    Next --> Domain
    Domain --> API
    API --> DB
    API --> Storage
    Domain --> Charts
```

## 4. AI Pipeline

```mermaid
flowchart TD
    Image[Package Image]
    Quality[Quality Gate]
    OCR[PaddleOCR]
    CV[OpenCV]
    Gemini[Gemini Adapter]
    OpenAI[OpenAI Adapter]
    Normalize[Canonical Normalizer]
    Consensus[Consensus Engine]
    Evidence[Evidence Store]
    Rules[Rule Engine]

    Image --> Quality
    Quality --> OCR
    Quality --> CV
    Image --> Gemini
    Image --> OpenAI
    OCR --> Normalize
    CV --> Normalize
    Gemini --> Normalize
    OpenAI --> Normalize
    Normalize --> Consensus
    Consensus --> Evidence
    Consensus --> Rules
```

## 5. Rule Engine Flow

```mermaid
flowchart TD
    Input[Canonical Inspection Evidence]
    Classify[Product / Package Attributes]
    Select[Select Active Applicable Rules]
    Validate[Deterministic Validators]
    Status[PASS / WARNING / SUSPECTED_NON_COMPLIANCE / MANUAL_REVIEW]
    Finding[Create Finding + Evidence Links]
    Human[Inspector Verification]

    Input --> Classify
    Classify --> Select
    Select --> Validate
    Validate --> Status
    Status --> Finding
    Finding --> Human
```

## 6. Physical Inspection Sequence

```mermaid
sequenceDiagram
    actor Inspector
    participant Mobile
    participant API
    participant AI
    participant OCRCV as OCR/CV
    participant Rules
    participant DB
    participant Storage

    Inspector->>Mobile: Start inspection
    Mobile->>API: Create draft inspection
    API->>DB: Persist draft
    Inspector->>Mobile: Capture images
    Mobile->>API: Upload image(s)
    API->>Storage: Store evidence object
    API->>OCRCV: Quality/OCR/CV request
    API->>AI: Structured multimodal analysis
    OCRCV-->>API: OCR + measurements
    AI-->>API: Canonical analysis
    API->>Rules: Evaluate applicable rules
    Rules-->>API: Findings/statuses
    API->>DB: Persist findings + audit events
    API-->>Mobile: Review package
    Inspector->>Mobile: Verify findings and decide
    Mobile->>API: Inspector decision
    API->>DB: Persist decision
```

## 7. E-Commerce Sequence

```mermaid
sequenceDiagram
    actor Inspector
    participant Web as Mobile/Web Client
    participant API
    participant Listing as Listing Analyzer
    participant Rules
    participant DB

    Inspector->>Web: Submit URL/screenshot
    Web->>API: Create listing evidence
    API->>Listing: Extract structured fields
    Listing-->>API: ListingAnalysis
    API->>Rules: Validate listing fields
    Rules-->>API: Listing findings
    API->>DB: Persist listing + findings
    Inspector->>Web: Compare to package
    Web->>API: Request cross-source comparison
    API-->>Web: Mismatches + evidence
```

## 8. Evidence Lifecycle

```mermaid
stateDiagram-v2
    [*] --> CAPTURED
    CAPTURED --> STORED: hash + metadata
    STORED --> ANALYZED
    ANALYZED --> LINKED: linked to declaration/finding
    LINKED --> VERIFIED: human review
    LINKED --> DISPUTED: correction required
    DISPUTED --> VERIFIED
    VERIFIED --> RETAINED
    RETAINED --> ARCHIVED
```

## 9. Authentication/RBAC

```mermaid
flowchart TD
    User[User]
    Auth[Supabase Auth]
    Session[Session]
    RBAC[Role/Permission Check]
    RLS[PostgreSQL RLS]
    Resource[Resource]

    User --> Auth
    Auth --> Session
    Session --> RBAC
    RBAC --> RLS
    RLS --> Resource
```

Authorization must be enforced server-side and at the database layer for protected records.

## 10. Offline Sync

```mermaid
flowchart TD
    Capture[Capture Offline]
    Local[Local Inspection Draft]
    Queue[Upload Queue]
    Online{Network Available?}
    Upload[Upload + Sync]
    Conflict{Conflict?}
    Resolve[Conflict Resolution]
    Success[Synced]
    Retry[Exponential Backoff]

    Capture --> Local
    Local --> Queue
    Queue --> Online
    Online -- No --> Queue
    Online -- Yes --> Upload
    Upload --> Conflict
    Conflict -- No --> Success
    Conflict -- Yes --> Resolve
    Resolve --> Success
    Upload --> Retry
    Retry --> Queue
```

## Architecture boundaries

**AI boundary:** structured extraction/interpretation only.  
**Rule boundary:** accepts canonical evidence and active rules; emits deterministic validation results.  
**Evidence boundary:** owns binary evidence, hashes, provenance, retention metadata.  
**Decision boundary:** only human decision can finalize inspection outcome.
