# TreeHacks 2026 — Prize Strategy & Implementation Plan

**Project:** SOMNI AI — Sleep Health Intelligence System  
**Goal:** Align the base product with every relevant prize and maximize wins.

---

## Executive Summary

| Prize | Fit | Priority | Key lever |
|-------|-----|----------|-----------|
| **Greylock** | Strong | P0 | Make 5+ API sequence visible; emphasize feedback loop |
| **Anthropic Human Flourishing** | Strong | P0 | Empathy pass + “test with family” story |
| **OpenAI AI Track** | Strong | P0 | o1 developer prompt, reasoning_effort, creative use |
| **Vercel** | Good | P0 | Full Vercel deploy, edge/DX, performance |
| **BrightData** | Good | P1 | Real use + innovative angle (disparities/guidelines) |
| **Perplexity** | Good | P1 | Sonar consensus, citations, real-world value |
| **TreeHacks Most Impactful** | Strong | P0 | Narrative: early biomarker, preventive health |
| **Anthropic Best Agent (Claude SDK)** | Strong | P0 | Autonomous agent, real problem, tool loop |
| **OpenEvidence Clinical Info** | Strong | P0 | Clinical data → understanding/care delivery |
| **OpenEvidence Healthcare** | Strong | P0 | Innovation in healthcare product |

**Cross-cutting:** Usage visibility (show API sequence), o1 boost, context compaction, agent-team framing — see sections below and any separate plan on o1 developer prompt, context compaction, and agent team.

---

## 1. Greylock — 5+ APIs + Agent That Reasons About Feedback

**Criteria:** Best hack with an agent that reasons about feedback to dynamically complete complex, multi-step tasks. Show 5+ API calls in sequence: Claude → o1 → PubMed → BrightData → Perplexity.

### Current state

- Orchestrator in [lib/agents/orchestrator.ts](lib/agents/orchestrator.ts) already runs: **Claude** (orchestrator) → **OpenAI o1** (invoke_o1_reasoning) → **PubMed** (query_pubmed) → **BrightData** (scrape_guidelines) → **Perplexity** (sonar_consensus). Order is dynamic (Claude chooses tools each turn).
- **Feedback loop:** `assess_evidence_quality` tool evaluates consistency; returns `refine_query` / `broaden_query` / `proceed`. Orchestrator prompt says: “If conflicts detected, re-query with refined search.”
- Usage is tracked (anthropicTurns, pubmedQueries, openaiO1Used, etc.) and returned in the API but **not shown in the UI**.

### Gaps

1. Judges cannot **see** the 5+ API sequence or that feedback is used.
2. Feedback-driven refinement is in the prompt but not **visually** demonstrated (e.g. “refined after conflict”).
3. No single place that **names** the sequence for Greylock (“Claude → o1 → PubMed → BrightData → Perplexity”).

### Actions

1. **Surface usage in the UI**  
   On the analysis page ([app/analysis/[id]/page.tsx](app/analysis/[id]/page.tsx)), after reports load, show a compact “Pipeline used” block when `reports.usage` exists:
   - Anthropic (Claude): X turns  
   - OpenAI o1: yes/no  
   - PubMed: X queries (Y errors)  
   - BrightData: mock / real  
   - Perplexity: X calls  
   Label it e.g. “Multi-API pipeline (Greylock)” so judges see 5+ services in sequence.

2. **Log sequence for demo**  
   In [lib/agents/orchestrator.ts](lib/agents/orchestrator.ts), log each tool invocation in order (e.g. `[Pipeline] 1. Claude turn → 2. invoke_o1_reasoning → 3. query_pubmed …`) so terminal/Vercel logs show the sequence during live demo.

3. **Make feedback explicit in orchestrator prompt**  
   Add one line: “When assess_evidence_quality returns refine_query or broaden_query, you MUST issue a follow-up PubMed or sonar_consensus call with the refined query before proceeding.” Optionally log when evidence assessment triggers a refinement.

4. **Optional:** Return a minimal `pipelineSteps: string[]` from the orchestrator (e.g. `['claude', 'o1', 'pubmed', 'brightdata', 'perplexity', 'claude']`) and show it as a small timeline on the analysis page.

### Demo / talk points

- “Our agent runs five APIs in sequence: Claude coordinates; o1 does deep medical reasoning; PubMed and Perplexity pull research; BrightData adds guidelines. Claude also reasons about feedback: when evidence is inconsistent, it refines the search and re-queries before writing the report.”
- Show the “Pipeline used” section and, if possible, a short clip of logs showing the order and a refinement step.

---

## 2. Anthropic Human Flourishing — Empathetic Patient Report

**Criteria:** Patient report reads empathetically (test with a family member). Show how AI can make life better and serve human potential.

### Current state

- [lib/reports/patient-report.ts](lib/reports/patient-report.ts) is built for 8th-grade reading, hopeful tone, “What You Can Do,” clear “What This Does NOT Mean,” and disclaimers.
- Orchestrator system prompt asks for “Conversational, hopeful, actionable, &lt;8th grade reading level” for the patient report.
- No explicit “empathy” or “human flourishing” framing in the template or prompt.

### Gaps

1. Tone is clear and supportive but could be more **explicitly** empathetic (validation, “we’re here with you,” avoiding alarm).
2. No **“test with family member”** artifact or story for judges.
3. Human flourishing / “technology serves human potential” is not spelled out in the app or README.

### Actions

1. **Empathy pass on patient report copy**  
   - Add a short opening line that validates the user (e.g. “Taking an interest in your sleep is a positive step.”).  
   - For non-stable SHDI, add one sentence that normalizes variation and reduces anxiety (e.g. “Many people see temporary changes; the goal is to understand patterns, not to worry.”).  
   - Keep “What You Can Do” and “When to Talk to Your Doctor” as hopeful and actionable; avoid catastrophic language.

2. **Orchestrator prompt**  
   In the patient-report instruction, add: “Use an empathetic, supportive tone. Acknowledge the person’s effort in tracking sleep. Do not use alarming language; emphasize agency and next steps.”

3. **Document “test with family member”**  
   Add a short subsection in README or in `docs/plans/`: “Human Flourishing — Patient report is designed to be read with or to a family member (e.g. parent or partner). We tested readability and tone with [a family member / internal review] to ensure it feels supportive, not clinical or scary.” If you actually run it past a family member, note it (e.g. “Tested with a family member for clarity and empathy”).

4. **README / landing**  
   One line under features or prizes: “Anthropic Human Flourishing: Patient report written to be read empathetically, including with family members, to support understanding and next steps without fear.”

### Demo / talk points

- “We tuned the patient report so it feels like a supportive summary you could read with a parent or partner — no jargon, no alarm, and clear next steps. We [tested it with a family member / designed it for family reading] to keep the human at the center.”

---

## 3. OpenAI AI Track — Most Creative Use of OpenAI API

**Criteria:** Top three teams that use the OpenAI API most creatively.

### Current state

- **o1-preview** is used in [lib/agents/orchestrator.ts](lib/agents/orchestrator.ts) via `invokeO1()`: one `user` message with reasoning_prompt + sleep_data_summary + fixed “Provide: 1. Ranked risk domains…” instructions. No system/developer message; no `reasoning_effort`.

### Gaps

1. o1 is used “straight” — no **creative** framing (developer prompt, structured reasoning ask).  
2. No **reasoning_effort** or other parameters that highlight “we’re using o1’s reasoning.”  
3. Creative angle is understated in the narrative.

### Actions

1. **o1 developer prompt (recommended in prior plan)**  
   - Add `O1_MEDICAL_REASONING_SYSTEM_PROMPT`: frame task as research associations and risk domains (no diagnosis), ask for step-by-step reasoning then structured output (ranked risk domains, confidence, screening, reasoning trace), reinforce constraints (no disease probabilities, wearable limitations).  
   - In `invokeO1()`, send this as first message with role `developer` (or `system` per API), then current user message.  
   - Set `reasoning_effort: 'high'` (or max supported for o1-preview) in `chat.completions.create`.

2. **README / demo**  
   - State clearly: “We use OpenAI o1 for **deep medical reasoning** on sleep–health associations: structured chain-of-thought, risk domain ranking, and screening suggestions, all steered by a dedicated system prompt.”

3. **Optional (if time):** Second o1 call for “sanity check” or alternative risk ranking to show chained/o1-heavy use — only if it doesn’t slow the demo.

### Demo / talk points

- “We use OpenAI o1 as our clinical reasoning engine. We inject a dedicated system prompt so o1 stays in the lane of research associations and risk domains, and we ask for explicit reasoning traces. That’s how we use the API creatively for medical reasoning without diagnosis.”

---

## 4. Vercel — Best Use of Vercel

**Criteria:** Best leverages Vercel to build, deploy, and scale a production-ready web app. Judges consider performance, developer experience, and creative use.

### Current state

- Next.js 14 App Router, API routes: analyze, get-analysis, generate-reports, export-pdf.
- [docs/plans/DEPLOYMENT_AND_FEATURES_PLAN.md](docs/plans/DEPLOYMENT_AND_FEATURES_PLAN.md): TypeScript port of Python sleep analysis for single Vercel deploy; PDF export; usage visibility.
- `export-pdf` uses `runtime = 'nodejs'`; no edge routes yet. README mentions “Edge streaming” but no streaming implementation found in app.

### Gaps

1. **Deploy:** App may still depend on Python backend for analysis; TS port gives “everything on Vercel.”  
2. **Edge / streaming:** No edge route or streaming response demonstrated.  
3. **DX / performance:** Not explicitly called out (e.g. App Router, server components, caching).  
4. **Creative use:** Could add one edge route (e.g. get-analysis or a lightweight health check) and/or streaming for report generation.

### Actions

1. **Complete “everything on Vercel”**  
   - Finish TypeScript analysis in [lib/sleep-analysis/](lib/sleep-analysis/) and use it in [app/api/analyze/route.ts](app/api/analyze/route.ts) when `PYTHON_API_URL` is unset so a single Vercel deployment runs without Python.  
   - Document in README: “Single Vercel deployment — no separate backend.”

2. **One clear Vercel feature**  
   - **Option A:** Add an **edge** route (e.g. `app/api/health/route.ts` with `export const runtime = 'edge'`) that returns app status and maybe pipeline capabilities.  
   - **Option B:** **Streaming:** If generate-reports can stream partial content (e.g. “Analysis started…” then “PubMed done…” then final report), implement streaming response and mention “streaming” in README.  
   - Prefer the one that’s more stable for demo (edge health is low-risk).

3. **README “Vercel” subsection**  
   - “Built and deployed on Vercel: Next.js 14 App Router, serverless API routes, [edge health check / streaming report generation], single deployment with TypeScript analysis for zero external backend.”

4. **Performance**  
   - Ensure analysis and report generation complete in a reasonable time; if you have caching (e.g. analysis by id), mention it as “efficient reuse of results.”

### Demo / talk points

- “The whole app runs on Vercel — frontend and APIs. We moved sleep analysis to TypeScript so there’s no separate backend. [We use an edge route for health / We stream report progress]. It’s one deploy, production-ready.”

---

## 5. BrightData — Best AI‑Powered Web Hack

**Criteria:** Use BrightData in an innovative way.

### Current state

- [lib/agents/orchestrator.ts](lib/agents/orchestrator.ts): `scrape_guidelines` calls BrightData with `dataset_id: 'gd_sleep_health_guidelines'`, `discover_by: topics`. When key is missing, mock CDC/AHA-style data is returned.
- Mock includes statistics, guidelines, and disparities (e.g. “Black/African American adults: 2x higher risk…”).

### Gaps

1. With no key, judges only see **mock** data — not “real” BrightData.  
2. “Innovative” use is not spelled out (e.g. guidelines + disparities feeding into patient and clinical reports).

### Actions

1. **Use real BrightData at demo**  
   - Ensure `BRIGHTDATA_API_KEY` is set in Vercel (or demo env) so at least one run hits the real API.  
   - In UI or “Pipeline used,” show “BrightData: real” when used.

2. **Narrative for innovation**  
   - “We use BrightData to pull **public health guidelines and disparity data** (CDC/AHA-style) into the pipeline. That lets our agent ground recommendations in current guidelines and surface population-level context (e.g. disparities) alongside individual sleep data.”  
   - Add this to README and/or a one-slide “BrightData” bullet.

3. **Fallback**  
   - Keep mock for when key is absent; document that “Production/demo uses BrightData for live guideline and disparity data.”

### Demo / talk points

- “BrightData feeds our agent with real-world guideline and disparity datasets. We use that to make our reports aligned with current public health guidance and to acknowledge disparities where relevant.”

---

## 6. Perplexity — Best Use of Sonar API

**Criteria:** Build something extraordinary with Perplexity’s Sonar API; innovative use, technical excellence, clear real-world value.

### Current state

- `sonar_consensus` in orchestrator calls Perplexity `sonar-pro` with a user query; returns consensus text and citations. Used for “consensus detection and meta-analysis.”
- Orchestrator prompt: “Use Perplexity Sonar for consensus detection when available”; “Include consensus AND controversy in query.”

### Gaps

1. **Real-world value** and **innovative use** are not explicitly stated (consensus + controversy for medical evidence).  
2. Citations are returned but may not be surfaced in the patient/clinical report UI.  
3. No mention of Sonar by name in README or UI.

### Actions

1. **README and demo narrative**  
   - “We use the **Perplexity Sonar API** for consensus detection and meta-analysis: the agent asks Sonar for consensus and controversy on sleep–health associations, then uses that to calibrate the strength of claims in both patient and clinical reports.”  
   - Add “Perplexity Sonar” to the “Pipeline used” / usage section when `perplexityCalls > 0`.

2. **Surface Sonar in the product**  
   - If the orchestrator or report includes consensus text or citations, show a short “Research consensus (Perplexity Sonar)” line or citation list on the analysis page (e.g. under clinical report).  
   - If citations are only in the backend, at least mention in UI: “Evidence synthesis supported by Perplexity Sonar.”

3. **Query design**  
   - Ensure orchestrator prompts for Sonar include “consensus” and “controversy” (or similar) so the use of Sonar is clearly for research synthesis, not one-off search.

### Demo / talk points

- “We use Perplexity’s Sonar API as our consensus engine: we ask for both consensus and controversy in the literature so our reports reflect where the evidence agrees and where it doesn’t. That’s how we use Sonar for real-world clinical understanding.”

---

## 7. TreeHacks Most Impactful Hack

**Criteria:** Potential to create the most significant positive change or address a pressing societal issue (e.g. environmental, accessibility, social injustices). Tangible difference.

### Current state

- **Thesis:** Sleep deviation as early biomarker of systemic health drift; detect trajectory shifts before clinical disease.  
- Consumer wearable data → evidence-based insights; preventive framing; not a diagnostic tool.  
- README already mentions “Most Impactful: Early health drift detection.”

### Gaps

1. “Societal issue” and “tangible difference” could be sharper (e.g. prevention, equity, mental health, cardiovascular burden).  
2. No short “impact” statement tailored to the prize.

### Actions

1. **Impact statement (README + pitch)**  
   - “Sleep is an early warning system. SOMNI AI turns wearable data into evidence-based insights so people and providers can spot patterns **before** they become disease — reducing unnecessary burden on healthcare and supporting preventive, equitable access to understanding.”  
   - Optionally add one line on equity: e.g. “Making this kind of analysis accessible from consumer devices can help bridge gaps where sleep labs are scarce.”

2. **Landing or about page**  
   - One paragraph: “Why this matters — early detection, prevention, and actionable intelligence for everyday people and their clinicians.”

3. **Demo**  
   - Lead with impact: “We’re not diagnosing — we’re surfacing research-backed patterns so people can act earlier and have better conversations with their doctors.”

### Demo / talk points

- “Our goal is impact: we use sleep as an early biomarker so people can see patterns before they become serious. That’s preventive, person-centered, and reduces pressure on the system.”

---

## 8. Anthropic Best Agent Made with Claude SDK

**Criteria:** Create an autonomous AI application that tackles real problems (made with Claude SDK).

### Current state

- Orchestrator uses **Anthropic Messages API** (`@anthropic-ai/sdk`, `anthropic.messages.create`) with tools (PubMed, o1, BrightData, Perplexity, assess_evidence_quality). Multi-turn tool loop; autonomous tool choice.  
- **Note:** This is the **Client SDK** (Messages API + your tool loop), not the **Claude Agent SDK** (which has built-in tools like Read, Bash). Prize wording “Claude SDK” likely includes both; your app is an **agent** using the API.

### Gaps

1. “Autonomous” and “real problem” are not spelled out in README or UI.  
2. No explicit “agent” or “Claude SDK” callout for this prize.

### Actions

1. **README**  
   - “**Anthropic Best Agent:** Our orchestrator is an autonomous Claude agent (Messages API + tool use). It decides when to call PubMed, o1, BrightData, and Perplexity, and when to re-query based on evidence quality — tackling the real problem of turning sleep data into evidence-based health intelligence.”

2. **UI**  
   - One line under “Multi-agent clinical evidence synthesis”: “Powered by Claude (Anthropic) — autonomous tool use for evidence synthesis.”

3. **Demo**  
   - “The brain of the app is a Claude agent. We give it sleep data and five tools; it autonomously plans the pipeline, reasons about evidence, and only then writes the reports. No hand-coded sequence — Claude decides the steps.”

### Demo / talk points

- “We built an autonomous agent with the Claude API: it chooses when to call each API and when to refine its search based on evidence. The real problem we tackle is turning messy wearable data into trustworthy, evidence-based insights.”

---

## 9. OpenEvidence Clinical Info Prize

**Criteria:** Most creatively and effectively convert existing clinical data into a product that improves understanding, decision-making, or care delivery.

### Current state

- **Clinical data in:** PubMed (literature), BrightData (guidelines/disparities), Perplexity (consensus).  
- **Product:** Dual reports (patient + clinical), evidence grading, effect sizes, limitations, screening suggestions.  
- [lib/reports/clinical-report.ts](lib/reports/clinical-report.ts): GRADE-style structure, tables, screening recommendations.

### Gaps

1. The “clinical data → product” story is not explicit.  
2. “Improves understanding, decision-making, or care delivery” could be stated in one sentence.

### Actions

1. **README / OpenEvidence subsection**  
   - “We convert **existing clinical data** (PubMed, guidelines, consensus from Perplexity) into **two products**: (1) a patient-facing report that improves **understanding** and next steps, and (2) a clinical report that supports **decision-making** and **care delivery** with evidence grading and screening suggestions.”

2. **Demo**  
   - “All our evidence comes from existing clinical data — we don’t invent studies. We turn that into one report for the person and one for the clinician, so both understanding and care decisions improve.”

### Demo / talk points

- “We take existing clinical data — literature, guidelines, consensus — and turn it into reports that improve understanding for the patient and decision-making for the clinician. That’s the core of our OpenEvidence angle.”

---

## 10. OpenEvidence Healthcare Track

**Criteria:** Most innovative product in the healthcare space.

### Current state

- Sleep health intelligence; multi-agent evidence synthesis; wearable → evidence-based insights; responsible framing (no diagnosis, disclaimers).

### Gaps

1. “Most innovative” is implied but not stated (multi-agent, multi-API, early biomarker, dual reports).

### Actions

1. **One-liner**  
   - “SOMNI AI is an innovative healthcare product: it combines multi-agent AI, wearable data, and evidence synthesis to surface sleep–health associations early and support both patients and providers with graded evidence and clear boundaries (no diagnosis).”

2. **Demo**  
   - Emphasize: multi-source evidence, o1 for reasoning, dual reports, and responsible design (disclaimers, no disease claims).

### Demo / talk points

- “We’re innovating in healthcare by connecting wearables, multi-agent AI, and clinical evidence into one pipeline that’s useful for people and clinicians while staying strictly non-diagnostic.”

---

## Implementation Priority & Dependencies

**P0 (do first)**  
- Greylock: Surface usage + pipeline in UI; optional pipelineSteps.  
- OpenAI: o1 developer prompt + reasoning_effort.  
- Anthropic Human Flourishing: Empathy pass + “test with family” note.  
- Anthropic Best Agent: README + one UI line.  
- OpenEvidence (both): README subsections + one-liners.  
- Most Impactful: Impact statement in README.  
- Vercel: Single deploy (TS analysis), README, and one edge or streaming feature.

**P1 (next)**  
- BrightData: Real key at demo + narrative.  
- Perplexity: Sonar callout in README and UI (consensus/citations).  
- Context compaction and agent-team framing (see separate plan on o1/compaction/agent-team) if time.

**Order suggestion**  
1. o1 developer prompt (OpenAI).  
2. Usage + pipeline visibility in UI (Greylock + all sponsors).  
3. README prize subsections and impact statement (all prizes).  
4. Patient report empathy + family-test note (Human Flourishing).  
5. Vercel: TS analysis + one edge/streaming feature.  
6. BrightData and Perplexity narrative + UI tweaks.  
7. Optional: context compaction, agent-team framing.

---

## Demo Day Checklist

- [ ] All relevant API keys set in Vercel (Anthropic, OpenAI, Perplexity, BrightData) so no “mock” when avoidable.  
- [ ] One full run shows “Pipeline used” with 5+ services (Claude, o1, PubMed, BrightData, Perplexity).  
- [ ] Patient report sounds empathetic; “tested with family” story ready.  
- [ ] o1 developer prompt and reasoning_effort in place; can explain “creative use of OpenAI.”  
- [ ] App deployed on Vercel; can explain “single deploy” and [edge/streaming].  
- [ ] BrightData: at least one “real” run; can explain innovative use.  
- [ ] Perplexity: Sonar named in UI or README; can explain consensus + real-world value.  
- [ ] Impact statement and OpenEvidence one-liners rehearsed.  
- [ ] 60–90 second pitch hits: problem, 5+ API agent, feedback loop, empathy, o1, impact, healthcare innovation.

---

## References

- [DEPLOYMENT_AND_FEATURES_PLAN.md](DEPLOYMENT_AND_FEATURES_PLAN.md) — Vercel, PDF export, usage visibility.  
- Any separate plan on o1 prompt injection, context compaction, and agent team (Messages API vs Claude Agent SDK).
