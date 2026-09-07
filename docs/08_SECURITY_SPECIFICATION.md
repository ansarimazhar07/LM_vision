# LM-Vision — Security Specification

## 1. Security Objectives

Protect inspection evidence, credentials, rule configuration, reports, audit history, and user access while maintaining an auditable chain of custody.

## 2. Authentication

Use Supabase Auth. Client receives a session; backend validates the access token on protected requests. Session expiry and refresh must follow the identity provider's supported mechanism.

Do not ship AI provider secrets in mobile/web bundles.

## 3. RBAC

Roles:

- `INSPECTOR`
- `SUPERVISOR`
- `ADMIN`
- `AUDITOR`

Authorization is enforced at API/service boundaries and PostgreSQL RLS. UI hiding is not an authorization mechanism.

## 4. Database Security

- Enable RLS on protected tables.
- Use least-privilege service credentials.
- Separate privileged server operations from client-accessible operations.
- Avoid exposing raw provider payloads unnecessarily.
- Use parameterized queries/typed client libraries.

## 5. Storage Security

Evidence objects are private by default.

Access pattern:

`Authorized user → API authorization → short-lived signed URL → object`

Do not expose permanent public buckets for inspection evidence.

## 6. AI API Key Security

Provider keys reside only in server-side environment/secret management.

Required controls:

- separate keys per environment where feasible;
- key rotation procedure;
- usage monitoring;
- request quotas;
- no key logging;
- redact provider request/response bodies from ordinary application logs unless explicitly approved.

## 7. Audit Trail

Audit all:

- authentication and privileged access events;
- inspection creation/decision changes;
- evidence verification;
- rule proposal/approval/activation;
- user/role changes;
- report generation;
- administrative configuration changes.

Audit records are append-oriented. Corrections create new events; they do not erase history.

## 8. Evidence Hashing

For every binary evidence artifact compute SHA-256.

```text
hash = SHA256(original_bytes)
```

Persist hash with evidence metadata. If an object is transformed, store it as a new derived artifact with its own hash and relation to the source.

Hashing establishes integrity evidence; it is not by itself proof of legal authenticity.

## 9. Input Validation

Validate:

- UUIDs
- enumerations
- numeric ranges
- timestamps
- URLs
- image dimensions
- MIME types
- JSON schema
- pagination values

Zod validates TypeScript-side boundaries. Python services perform independent validation for service-side contracts.

## 10. File Validation

Before processing:

1. Check declared MIME.
2. Inspect actual file signature/parser behavior.
3. Enforce size and dimension limits.
4. Decode safely.
5. Strip/normalize unnecessary metadata if policy permits.
6. Hash the original artifact.
7. Store using generated object IDs, not user-controlled filenames.

## 11. Rate Limiting

Apply per-user/IP or token-bound rate limits to authentication, uploads, AI requests, listing analysis, and reports.

## 12. Privacy

Collect only operationally required data. Avoid storing unnecessary device identifiers or exact location. Define retention periods before production deployment.

## 13. Secure Logging

Never log:

- access tokens;
- API keys;
- passwords;
- signed URLs;
- unnecessary raw personal data;
- full provider prompts containing sensitive evidence unless explicitly approved.

Logs should carry `requestId`, `inspectionId` where applicable, service, event name, severity, and timestamp.

## 14. Secret Management

Environment categories:

```text
NEXT_PUBLIC_*            # only non-secret client configuration
SUPABASE_URL             # public project URL as appropriate
SUPABASE_ANON_KEY        # public client key as designed by Supabase
SUPABASE_SERVICE_ROLE    # server-only secret
GEMINI_API_KEY           # server-only secret
OPENAI_API_KEY           # server-only secret
```

Never commit `.env` files containing secrets.

## 15. Threat Model Summary

| Threat | Control |
|---|---|
| Unauthorized evidence access | Auth + RBAC + RLS + signed URLs |
| Evidence tampering | Private storage + SHA-256 + audit trail |
| Prompt injection in package/listing text | Treat extracted text as untrusted data; structured schemas; no tool execution from model output |
| Malicious uploaded files | Type/size/signature validation + safe parsing |
| Model hallucination | Evidence requirements + deterministic rules + human review |
| Privileged misuse | Least privilege + audit + separation of duties |
| Replay/duplicate action | Idempotency keys for mutation endpoints |
| API abuse | Rate limits + quotas |
| Secret leakage | Server-only provider calls + secret management |

## 16. AI-Specific Security Boundary

Package text, e-commerce content, and OCR text are untrusted input. The model must not be permitted to interpret text such as “ignore the rules” as an instruction to the system. Model output is data and must pass schema validation before use.
