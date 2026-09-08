# Production mobile AI deployment

The Android APK never calls Google Gemini. Its only cloud AI route is:

`Android APK → HTTPS LM-Vision AI Engine → Gemini API`

## Backend deployment

Deploy `services/ai-engine` behind TLS and configure these values in the hosting provider's secret/configuration store:

```text
AI_DEFAULT_PROVIDER=GEMINI
AI_ENGINE_REQUIRE_AUTH=true
GEMINI_API_KEY=<server-only Gemini key>
# Optional: comma-separated server-only failover keys. Never send these to the APK.
GEMINI_API_KEYS=<primary-key>,<backup-key>
GEMINI_MODEL=gemini-2.5-flash
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<public Supabase anon key>
```

Do not put `GEMINI_API_KEY` in an Expo variable, EAS public variable, source file, or APK configuration. For local server work, put it in the git-ignored `.env.local`; `services/ai-engine/src/run-server.ts` loads that file before safe tracked defaults.

The deployed service must make these endpoints available through its HTTPS domain:

- `GET /api/v1/ai/health` — backend/Gemini readiness, no inference
- `POST /api/v1/ai/package-analysis` — authenticated, Zod-validated package observation extraction

The backend validates image payloads and calls the server-only Gemini provider. The mobile deterministic rule engine evaluates rules after it receives observations; Gemini does not issue a legal verdict.

## APK build configuration

Set these non-secret EAS production environment variables before creating the APK:

```text
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_API_URL=https://<deployed-backend-domain>/api/v1
```

`EXPO_PUBLIC_API_URL` is intentionally public: it is an HTTPS address, not a credential. A release build refuses localhost, private LAN addresses, and plain HTTP for the backend URL. Without a reachable backend it runs local OCR/CV and deterministic evaluation, stores the inspection locally, and lets the existing sync queue retry later.

Build after the endpoint is deployed:

```powershell
npm run build:apk --workspace=@lm-vision/mobile
```
