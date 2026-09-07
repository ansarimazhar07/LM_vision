# @lm-vision/config

This package provides **centralized environment configuration and runtime validation** using Zod for LM-Vision (SIH 2026 Problem Statement 26034).

## Security Guardrails

1. **Client / Server Boundary**:
   - `getClientEnv()` safely exposes only variables prefixed with `NEXT_PUBLIC_*` and `NODE_ENV`.
   - `getServerEnv()` exposes server-only variables (e.g. `GEMINI_API_KEY`, `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
   - If `getServerEnv()` is invoked in a client-side browser runtime (`window !== undefined`), it immediately throws an error to prevent leaking secrets.
2. **Strict Validation**: All variables are checked at startup or first access using strict Zod schemas with descriptive error messages.
3. **No Hardcoded Secrets**: Only `.env.example` templates with placeholders are stored in version control.
