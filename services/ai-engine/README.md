# @lm-vision/ai-engine

This service defines the **AI Provider Gateway skeleton and provider boundaries** for LM-Vision (SIH 2026 Problem Statement 26034).

## Provider Architecture

1. **Canonical Interface**: All providers implement the `AIProvider` contract defined in `@lm-vision/shared-types`.
2. **Provider Implementations**:
   - `MockProvider`: Provides deterministic, zero-network mock analysis for testing the complete pipeline (Phase 5).
   - `GeminiProvider`: Skeleton stub for Google Gemini multimodal vision models (to be integrated in Phase 6 — Gemini).
   - `OpenAIProvider`: Skeleton stub for OpenAI vision models (to be integrated in Phase 7 — OpenAI).
   - `Consensus Engine`: Multi-model agreement verification (to be integrated in Phase 8 — AI Consensus).
3. **Configurable Model Selection**: Models are not hardcoded to obsolete versions; active model IDs are passed at instantiation or configured through server-side environment variables (`GEMINI_MODEL`, `OPENAI_MODEL`, `MOCK_AI_MODEL`).
4. **No Vendor Leaks**: Raw model responses are stored strictly in metadata fields; downstream services only consume canonical declarations, bounding boxes, quality metrics, and visual measurements.
