# Plan: Fix Vercel deployment (cache + logging)

## Overview

Make the app reliably deployable on Vercel as one full-stack app by replacing the in-memory analysis cache with a durable store (Vercel KV / Redis) and removing production-unsafe filesystem logging in the analyze route.

---

## Problem

1. **Ephemeral cache:** `global.analysisCache` is in-memory. On Vercel, serverless instances do not share memory, so after upload the redirect to `/analysis/[id]` often hits a different instance and returns "Analysis not found".
2. **Filesystem in analyze route:** [app/api/analyze/route.ts](../app/api/analyze/route.ts) uses `appendFileSync` to write to `.cursor/debug.log`. Vercel's filesystem is read-only except `/tmp`, so this can throw in production.

## Approach

Introduce a **cache abstraction** that uses durable storage when configured (Vercel KV / Redis) and falls back to in-memory for local dev. Then remove or guard the debug log so it never writes to a read-only path in production.

---

## 1. Add a cache layer (durable + in-memory fallback)

**New file: `lib/cache.ts`**

- **Shape of stored value:** Same as today: `{ analysis: SleepAnalysisResult, timestamp: string, reports?: { patient, clinical, evidence, usage } }`.
- **Interface:** `getAnalysis(id: string): Promise<CachedAnalysis | null>` and `setAnalysis(id: string, value: CachedAnalysis): Promise<void>`.
- **Behavior:**
  - If `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or the env vars used by `@vercel/kv`) are set: use Vercel KV. Key pattern `analysis:${id}`, value `JSON.stringify(entry)`. Set a TTL (e.g. 24 hours) on `set` to avoid unbounded growth.
  - Else: use the existing in-memory `global.analysisCache` so local dev and existing behavior remain unchanged.
- **Dependency:** Add `@vercel/kv`. (Vercel has migrated KV to Upstash; creating a KV store in the Vercel project dashboard still works and injects the required env vars for `@vercel/kv`.)

**Cache usage today:**

| Route | Reads cache | Writes cache |
|-------|-------------|--------------|
| [app/api/analyze/route.ts](../app/api/analyze/route.ts) | No | Yes — after TS or Python analysis, stores `{ analysis, timestamp }` |
| [app/api/generate-reports/route.ts](../app/api/generate-reports/route.ts) | Yes — by `analysisId` | Yes — merges `reports` into cached entry |
| [app/api/get-analysis/route.ts](../app/api/get-analysis/route.ts) | Yes — by `id`, returns `cached.analysis` | No |
| [app/api/export-pdf/route.ts](../app/api/export-pdf/route.ts) | Yes — by `analysisId`, needs `analysis` and `reports?.evidence` | No |

All four routes will be updated to use the new cache module instead of `global.analysisCache` directly.

---

## 2. Wire API routes to the cache module

- **analyze (POST):** After a successful analysis (TS or Python path), call `setAnalysis(analysisId, { analysis: analysisResult, timestamp })` instead of writing to `global.analysisCache`. Remove the `global.analysisCache` declaration and initialization from this file (and from any other file that only uses the cache via the new module).
- **generate-reports (POST):** Call `getAnalysis(analysisId)`; if null, return 404. After generating reports, call `setAnalysis(analysisId, { ...cached, reports: { ... } })` (read-modify-write). No direct `global.analysisCache` access.
- **get-analysis (GET):** Call `getAnalysis(id)`; if null, return 404. Return `cached.analysis` (same response shape as today).
- **export-pdf (POST):** Call `getAnalysis(analysisId)`; if null, return 404. Use the returned object for `analysisData` (same shape: `analysis`, `reports`). No direct cache access.

Keep the cached value shape unchanged so the frontend and existing response contracts stay the same.

---

## 3. Fix debug logging in the analyze route

In [app/api/analyze/route.ts](../app/api/analyze/route.ts):

- **Option A (recommended):** Do not write to the filesystem in production. Only call the log helper when not on Vercel (e.g. `if (process.env.VERCEL !== '1')`); inside the helper, keep the existing `try/catch` and optionally write to `join(process.cwd(), '.cursor', 'debug.log')` in dev only. This avoids EACCES on Vercel and keeps debug logs locally.
- **Option B:** Remove the `fs` dependency and `debugLog` calls entirely (or replace with `console.log` for non-sensitive data). Simpler but loses file-based debug logs in dev.

Recommendation: Option A so local debugging behavior is preserved without any production writes.

---

## 4. Optional: centralize cache key and TTL

In `lib/cache.ts`, define a single key prefix (e.g. `analysis:`) and TTL constant (e.g. 86400 seconds). Document in code or README that the Vercel project must have a KV store (or Redis) linked and env vars set for production; otherwise the app falls back to in-memory and will still have the "Analysis not found" issue across instances.

---

## 5. No changes required

- **next.config.js:** No change needed for cache or logging. The existing rewrite to `localhost:8000` is irrelevant on Vercel when `PYTHON_API_URL` is unset (TS pipeline is used).
- **Frontend:** No change; it already calls the same API routes and expects the same response shapes.
- **Environment variables:** User must configure the KV store in the Vercel project (or add `KV_*` / Redis env vars) for production; no code change for that beyond using the cache abstraction.

---

## Summary

| Task | Where |
|------|--------|
| Add `lib/cache.ts` with get/set, KV when env set else in-memory | New file |
| Use cache in analyze, generate-reports, get-analysis, export-pdf | 4 API routes |
| Guard or remove debug log in analyze route | [app/api/analyze/route.ts](../app/api/analyze/route.ts) |
| Add `@vercel/kv` dependency | package.json |

After this, the same deploy will work reliably on Vercel (with KV configured) and unchanged locally (in-memory fallback and optional file logging in dev).
