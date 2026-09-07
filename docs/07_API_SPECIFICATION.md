# LM-Vision — API Specification

## 1. API Conventions

Base path: `/api/v1`.

### Authentication

Bearer session token from Supabase Auth. Server validates token and role before executing protected operations.

### Success envelope

```json
{
  "success": true,
  "data": {},
  "meta": {"requestId": "req-123"}
}
```

### Error envelope

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request is invalid",
    "details": []
  },
  "meta": {"requestId": "req-123"}
}
```

### Pagination

Query: `page`, `pageSize`, `cursor` where appropriate.

### Standard errors

`400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 CONFLICT`, `413 FILE_TOO_LARGE`, `415 UNSUPPORTED_MEDIA`, `422 UNPROCESSABLE`, `429 RATE_LIMITED`, `500 INTERNAL_ERROR`, `503 DEPENDENCY_UNAVAILABLE`.

## 2. Authentication

| Method | URL | Purpose | Auth |
|---|---|---|---|
| POST | `/auth/session` | Resolve application session/profile | Bearer |
| POST | `/auth/signout` | Sign out | Bearer |
| GET | `/auth/me` | Current user/profile | Bearer |

## 3. Inspections

| Method | URL | Purpose | Auth |
|---|---|---|---|
| POST | `/inspections` | Create inspection draft | Inspector+ |
| GET | `/inspections/:id` | Get canonical inspection | Scoped |
| PATCH | `/inspections/:id` | Update draft metadata | Owner/allowed supervisor |
| POST | `/inspections/:id/process` | Start processing pipeline | Inspector+ |
| POST | `/inspections/:id/decision` | Submit inspector decision | Inspector/Supervisor |
| GET | `/inspections` | Search/list inspections | Scoped |

### Create inspection request

```json
{
  "sourceType": "PHYSICAL",
  "category": "PERSONAL_CARE",
  "packageType": "BOTTLE"
}
```

### Process response

```json
{
  "success": true,
  "data": {
    "inspectionId": "uuid",
    "jobId": "job-123",
    "status": "PROCESSING"
  }
}
```

## 4. Products / Manufacturers

| Method | URL | Purpose | Auth |
|---|---|---|---|
| GET | `/products` | Search products | Scoped |
| POST | `/products` | Create product | Inspector+ |
| GET | `/products/:id` | Product detail | Scoped |
| GET | `/manufacturers` | Search manufacturers | Scoped |
| GET | `/manufacturers/:id` | Manufacturer profile/analytics | Supervisor+ |

## 5. Images / Evidence

| Method | URL | Purpose | Auth |
|---|---|---|---|
| POST | `/images/presign` | Obtain signed upload URL | Scoped |
| POST | `/images/complete` | Finalize upload + hash | Scoped |
| GET | `/inspections/:id/evidence` | Evidence list | Scoped |
| POST | `/evidence/:id/verify` | Verify evidence | Inspector/Supervisor |
| GET | `/evidence/:id/url` | Temporary signed URL | Scoped |

Uploads must validate MIME, extension, size, and image parseability. Hash is calculated server-side or verified server-side.

## 6. AI

| Method | URL | Purpose | Auth |
|---|---|---|---|
| POST | `/ai/package-analysis` | Queue package analysis | Inspector+ |
| POST | `/ai/listing-analysis` | Analyze listing | Inspector+ |
| POST | `/ai/consensus` | Compare provider outputs | Service/Supervisor path |
| GET | `/ai/jobs/:id` | Get job status | Scoped |

AI API output must be canonical JSON validated by shared schemas.

## 7. Rules

| Method | URL | Purpose | Auth |
|---|---|---|---|
| GET | `/rules` | Search rule definitions | All permitted |
| GET | `/rules/:id` | Rule history | All permitted |
| POST | `/rules/proposals` | Submit rule proposal | Admin/authorized reviewer |
| POST | `/rules/:id/versions` | Create rule version | Admin |
| POST | `/rules/versions/:id/approve` | Approve version | Authorized legal/admin role |
| POST | `/rules/versions/:id/activate` | Activate approved version | Admin |

Activation returns `409` when source or approval metadata is incomplete.

## 8. Findings

| Method | URL | Purpose | Auth |
|---|---|---|---|
| GET | `/inspections/:id/findings` | List findings | Scoped |
| PATCH | `/findings/:id` | Add review state/comment | Inspector/Supervisor |
| POST | `/findings/:id/verify` | Verify/reject finding | Inspector/Supervisor |

## 9. E-Commerce

| Method | URL | Purpose | Auth |
|---|---|---|---|
| POST | `/ecommerce/listings` | Create listing evidence | Inspector+ |
| POST | `/ecommerce/listings/:id/analyze` | Analyze listing | Inspector+ |
| POST | `/ecommerce/compare` | Compare listing to package | Inspector+ |
| GET | `/ecommerce/listings/:id` | Listing detail | Scoped |

## 10. Reports

| Method | URL | Purpose | Auth |
|---|---|---|---|
| POST | `/reports/inspections/:id` | Generate report | Inspector/Supervisor |
| GET | `/reports/:id` | Report metadata | Scoped |
| GET | `/reports/:id/url` | Signed download/view URL | Scoped |

Report generation should be idempotent for a given inspection snapshot + report format.

## 11. Analytics

| Method | URL | Purpose | Auth |
|---|---|---|---|
| GET | `/analytics/dashboard` | Operational KPIs | Supervisor+ |
| GET | `/analytics/manufacturers/:id` | Manufacturer metrics | Supervisor+ |
| GET | `/analytics/risk` | Risk indicators | Supervisor+ |

Risk analytics must remain explainable and must not be presented as a legal finding.

## 12. Audit

| Method | URL | Purpose | Auth |
|---|---|---|---|
| GET | `/audit` | Search audit logs | Auditor/Admin |
| GET | `/audit/:id` | Audit detail | Auditor/Admin |

## 13. Authorization Matrix

| Capability | Inspector | Supervisor | Admin | Auditor |
|---|---:|---:|---:|---:|
| Create inspection | ✓ | ✓ | ✓ | — |
| Submit evidence | ✓ | ✓ | ✓ | — |
| Finalize own decision | ✓ | ✓ | ✓ | — |
| Team review | — | ✓ | ✓ | — |
| Rule proposal | — | ✓/configured | ✓ | — |
| Rule activation | — | —/configured | ✓ | — |
| User administration | — | — | ✓ | — |
| Read audit logs | — | limited | ✓ | ✓ |

## 14. Rate Limits

Prototype defaults are configurable. Suggested starting policy:

- general authenticated API: 120 requests/min/user;
- upload initiation: 30/min/user;
- AI jobs: 10/min/user and bounded concurrent jobs;
- report generation: 10/min/user.

Return `429` with retry metadata.

## 15. Idempotency

For uploads, processing jobs, decisions, and report generation, support `Idempotency-Key` where duplicate submissions are plausible.

## 16. API Non-Negotiables

- Schema validate every request and external response.
- Never trust client role claims.
- Never accept arbitrary rule executable code.
- Never return unrestricted evidence storage URLs.
- Include request/correlation IDs in logs.
