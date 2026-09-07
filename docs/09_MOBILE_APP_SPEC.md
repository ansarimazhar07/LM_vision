# LM-Vision — Mobile App Specification

## 1. Mobile UX Principles

- Designed for field officers, bright environments, gloves/one-hand use where practical.
- Primary actions are large and obvious.
- Avoid multi-screen typing when camera/evidence can be used.
- Always show whether work is local, syncing, or server-processed.
- Never hide uncertainty.

## 2. Navigation

```text
Login
  └─ Home
      ├─ New Inspection
      │   ├─ Category Selection
      │   ├─ Package Type
      │   ├─ Guided Camera Capture
      │   ├─ Image Review
      │   ├─ Calibration
      │   ├─ AI Processing
      │   ├─ Inspection Result
      │   ├─ Finding Detail
      │   ├─ Evidence
      │   ├─ Inspector Decision
      │   └─ Report
      ├─ E-Commerce
      ├─ History
      └─ Profile
```

## 3. Screen Specifications

### Login

**Purpose:** authenticate the officer.  
**UI:** logo, credentials/approved auth flow, environment status.  
**Actions:** sign in, retry.  
**API:** `/auth/session`.  
**Loading:** disabled button/spinner.  
**Error:** readable auth error; never expose raw provider error.  
**Empty:** not applicable.  
**Success:** navigate to Home.

### Home

**Purpose:** launch work and show operational status.  
**UI:** New Inspection CTA, pending sync, recent inspections, connectivity.  
**API:** summary/recent list.  
**Error:** cached state where possible.

### New Inspection

**Purpose:** create canonical draft.  
**UI:** source type, category, package type.  
**Action:** continue.  
**API:** `POST /inspections`.

### Category Selection

Show configurable categories. Do not hardcode legal applicability into the UI.

### Package Type

Capture package type as structured metadata used later by rule applicability.

### Guided Camera Capture

**Purpose:** capture front/primary display and additional panels.  
**UI:** framing guide, glare/blur indicator, required-shot checklist, capture button.  
**API:** presigned upload flow.  
**Offline:** save local draft and queue upload.  
**Error:** retain image locally until user retries/deletes.

### Image Review

Show thumbnails, quality flags, retake action, metadata, and “continue with review” path.

### Calibration

UI displays selected reference object, known size, detected pixels, calculated mm/pixel, estimated measurement, and confidence. User must confirm reference object and can mark calibration untrusted.

### AI Processing

Show progress stages rather than pretending a single monolithic AI step:

`quality → OCR → extraction → CV → consensus → rule evaluation`.

### Inspection Result

Sections:

- overall inspection status;
- declarations;
- applicable rules;
- findings grouped by severity/status;
- evidence count;
- human review queue.

Statuses are `PASS`, `WARNING`, `SUSPECTED_NON_COMPLIANCE`, `MANUAL_REVIEW`.

### Finding Detail

Display:

- finding title;
- status;
- rule ID/number/source reference when source-backed;
- explanation;
- evidence preview;
- confidence;
- machine/human origin;
- verify/edit controls.

### Evidence

Evidence gallery with image, crop/region, notes, hash status, verification state.

### Inspector Decision

Explicit human decision screen. Required comment for configured decision types. Once submitted, decision is audited.

### E-Commerce

Capture URL or screenshot. Show digital-source badge. Display extracted listing fields and compare action.

### History

Search by inspection ID/product/manufacturer/date/status. Offline shows cached cases only.

### Report

Show report generation state, preview/metadata, and secure open/share path subject to policy.

### Profile

Show role, sync state, app version, environment, sign-out.

## 4. Local Inspection State

Store a versioned draft object with:

```ts
interface LocalInspectionDraft {
  localId: string;
  serverId?: string;
  version: number;
  status: string;
  capturedEvidenceRefs: string[];
  pendingOperations: string[];
  updatedAt: string;
}
```

## 5. Sync Rules

- Each queued mutation has an idempotency key.
- Upload binary before finalizing evidence record.
- Sync oldest/most urgent inspection first.
- Retry with exponential backoff.
- Conflict detection uses server version/updated timestamp.
- User review is required for conflicting human decisions or edits.

## 6. Permissions

Request camera/photos/notification permissions contextually, not all at first launch. Explain purpose before system prompt.

## 7. Offline Behavior

Works offline for:

- starting a draft;
- category/package selection;
- camera capture;
- image review;
- local notes;
- queued evidence.

MVP does not promise full offline Gemini/OpenAI/PaddleOCR capability.

## 8. Error Handling

Every async screen needs a retry action and preserves user-entered state. Distinguish:

- user input error;
- network error;
- provider outage;
- processing failure;
- authorization failure;
- sync conflict.
