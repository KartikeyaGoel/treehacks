# Plan: Vercel deployment, PubMed test, PDF export, and usage visibility

## Overview

This plan covers: (1) Running the full stack on Vercel by porting the Python sleep analysis to TypeScript; (2) Adding a test that verifies PubMed API responses can be read safely; (3) Implementing the clinical report PDF export so the Export button returns a downloadable PDF; (4) Adding orchestrator usage visibility so you can see which services (Anthropic, Perplexity, PubMed, Bright Data, OpenAI o1) were actually used each run.

---

## 1. Everything on Vercel (Python backend to TypeScript)

**Current state:** The Next.js app forwards file uploads to a separate Python FastAPI backend at `PYTHON_API_URL` ([app/api/analyze/route.ts](app/api/analyze/route.ts)). The Python backend uses pandas, scipy, statsmodels, and lxml for parsing (Apple Health XML, Fitbit/Oura CSV), validation, and sleep analysis.

**Constraint:** Vercel serverless Python has a ~50 MB compressed (250 MB uncompressed) function size limit. SciPy + numpy + pandas + statsmodels far exceeds this.

**Approach:** Port the sleep analysis pipeline to TypeScript and run it inside the existing Next.js API route. Single Vercel deployment; no separate Python process.

**Implementation outline:**

- **New modules (under `lib/sleep-analysis/`):** Parser (fast-xml-parser + CSV), validator (min 14 days, required fields, ranges), analyzer (baseline stats, z-scores, linear regression for trends, SVI, SHDI, phenotype). Types matching current API response shape.
- **API route:** In [app/api/analyze/route.ts](app/api/analyze/route.ts), when `PYTHON_API_URL` is unset, use the TS pipeline instead of proxying to Python; when set (e.g. local dev), keep existing proxy behavior.
- **Note:** On Vercel, `global.analysisCache` is ephemeral; for production, consider Vercel KV or a DB for durable storage (follow-up).

---

## 2. PubMed readability test

**Goal:** Verify that the PubMed (NCBI E-utilities) response structure used in [lib/agents/orchestrator.ts](lib/agents/orchestrator.ts) can be read safely—no "Cannot read properties of undefined (reading '<id>')".

**Approach:** Add a Jest test that hits the real NCBI esearch + esummary APIs and asserts on the shape we depend on.

- Call esearch with a simple query (e.g. `sleep`, `retmax=2`).
- Assert `searchData.esearchresult?.idlist` is an array.
- If idlist has entries, call esummary with those ids.
- Assert `detailsData.result` is a non-null object and that for each id, `detailsData.result[id]` exists with expected fields (e.g. title).
- Optionally assert parsed output matches `PubMedResult` shape.

**Files:** Add `lib/agents/__tests__/pubmed.test.ts` (or equivalent); add `jest.config.js` if missing.

---

## 3. Clinical report PDF export (download on device)

**Current state:** [app/api/export-pdf/route.ts](app/api/export-pdf/route.ts) returns 501 with JSON; the frontend shows "PDF export not yet implemented". No PDF is returned.

**Goal:** API returns a PDF binary with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="somni-clinical-report-<id>.pdf"`. Existing frontend download logic will then save the file. Works on Vercel (in-memory response).

**Implementation outline:**

- Use cached `analysisData.reports.clinical` (and evidence) in the export-pdf route.
- Use `@react-pdf/renderer` (already in package.json and next.config.js) to build a PDF document (clinical report text as React-PDF components or plain text blocks).
- Use `renderToBuffer()` (or equivalent server API) to get a Buffer; return `new NextResponse(pdfBuffer, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="somni-clinical-report-' + analysisId + '.pdf"' } })`.
- Add module e.g. `lib/reports/clinical-report-pdf.tsx` with a helper that takes cached analysis/reports and returns the PDF buffer. Route calls it and returns the response.

---

## 4. Orchestrator usage visibility

**Goal:** After each report generation run, you can see which external services were actually used (Anthropic, Perplexity, PubMed, Bright Data, OpenAI o1) and whether PubMed succeeded or errored and whether Bright Data was real or mock.

**Why:** Tool usage is decided by Claude each run. Without tracking, you cannot tell from spend alone whether Perplexity, PubMed, Bright Data, or o1 were invoked or whether PubMed returned data or errors.

**Implementation outline:**

- In [lib/agents/orchestrator.ts](lib/agents/orchestrator.ts), add a **usage object** for the run (e.g. on the orchestrator instance or passed through the run):
  - `anthropicTurns: number` — incremented each time we call `anthropic.messages.create()`.
  - `perplexityCalls: number` — incremented when `sonar_consensus` tool is executed.
  - `pubmedQueries: number` — incremented when `query_pubmed` is executed.
  - `pubmedErrors: number` — incremented when `queryPubMed` catches an error or returns empty due to API shape (optional: track in `queryPubMed` and expose via callback or return).
  - `brightDataUsed: 'mock' | 'real'` — set to `'real'` only when the Bright Data API is actually called (key present and request sent); otherwise `'mock'`.
  - `openaiO1Used: boolean` — set to true when `invoke_o1_reasoning` tool is executed.

- Update these counters in the existing `executeTools` switch (when handling each tool name) and inside `scrapeBrightData` when choosing mock vs API path. In `queryPubMed`, on catch or when `resultMap` is missing, increment pubmedErrors (if the orchestrator has access to that, e.g. by returning a small result shape `{ results, error: true }` and counting errors in the orchestrator).

- At the end of `orchestrate()`:
  - **Option A (minimal):** Log a one-line summary, e.g.  
    `[Orchestrator] Usage: Anthropic ${anthropicTurns} turns, Perplexity ${perplexityCalls}, PubMed ${pubmedQueries} (${pubmedErrors} errors), Bright Data ${brightDataUsed}, OpenAI o1 ${openaiO1Used ? 'yes' : 'no'}`  
    so it appears in the terminal and in Vercel serverless logs.
  - **Option B (API + UI):** Return the usage object from the orchestrator. Have [app/api/generate-reports/route.ts](app/api/generate-reports/route.ts) include it in the JSON response (e.g. `usage: { anthropicTurns, perplexityCalls, pubmedQueries, pubmedErrors, brightDataUsed, openaiO1Used }`). Optionally show a short "Report used: …" line on the analysis page (e.g. in a collapsible or footer).

- No new dependencies; only in-memory counters and one log line and/or response field.

**Files to change:** [lib/agents/orchestrator.ts](lib/agents/orchestrator.ts) (counters, log and/or return usage). Optionally [app/api/generate-reports/route.ts](app/api/generate-reports/route.ts) (pass through usage in response) and [app/analysis/[id]/page.tsx](app/analysis/[id]/page.tsx) (display usage if desired).

---

## Summary

| Item | Action |
|------|--------|
| **1. Vercel everything** | Port Python parsing, validation, and sleep analysis to TypeScript; run analysis in `app/api/analyze` when `PYTHON_API_URL` is unset. |
| **2. PubMed test** | Add Jest test calling NCBI esearch + esummary and asserting on idlist and result[id] shape. |
| **3. PDF export** | Implement PDF generation in `lib/reports` with @react-pdf/renderer; return binary from `app/api/export-pdf` with attachment headers. |
| **4. Usage visibility** | Track and log (and optionally return in API + show in UI) which tools were used: Anthropic turns, Perplexity, PubMed queries/errors, Bright Data mock vs real, OpenAI o1. |
