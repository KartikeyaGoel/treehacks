# SOMNI AI - Sleep Health Intelligence System

🏆 **TreeHacks 2026 Project** | Multi-Agent Clinical Evidence Synthesis

## 🎯 Overview

SOMNI AI transforms consumer wearable sleep data into actionable health intelligence through **autonomous multi-agent scientific analysis**. The system detects statistical deviations from personal sleep baselines and maps patterns to peer-reviewed longitudinal research associations.

**Core Thesis**: Sleep deviation is an early biomarker of systemic health drift. SOMNI AI detects trajectory shifts before clinical disease manifests.

### Key Features

- 📊 **Statistical Sleep Analysis** - Z-scores, trend detection, variability indices
- 🤖 **Multi-Agent Orchestration** - Claude SDK → OpenAI o1 → PubMed → BrightData → Perplexity
- 📝 **Dual Report Generation** - Patient-friendly (8th grade) + Clinical (evidence-graded)
- 🔬 **Scientific Rigor** - GRADE methodology, effect sizes, confidence intervals
- 🚀 **Production Architecture** - Next.js 14 App Router, FastAPI, Edge streaming

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- API Keys (Anthropic, OpenAI, Perplexity, BrightData)

### Installation

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
cd python
pip install -r requirements.txt
cd ..

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys
```

### Running the Application

```bash
# Terminal 1: Start Python backend
cd python
python api/main.py

# Terminal 2: Start Next.js frontend (in project root)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
somni-ai/
├── app/                        # Next.js 14 App Router
│   ├── page.tsx                # Landing page with upload
│   ├── analysis/[id]/page.tsx  # Analysis results
│   └── api/                    # API routes
├── lib/
│   ├── agents/                 # Multi-agent orchestration
│   └── reports/                # Report generators
├── python/
│   ├── sleep_analysis/         # Statistical analysis engine
│   └── api/                    # FastAPI backend
├── components/ui/              # shadcn/ui components
└── public/demo_data/           # Sample datasets
```

## 🏆 Prize Narratives & Demonstrations

### Greylock — 5+ API Agent with Feedback Reasoning

**Criterion:** Best hack with an agent that reasons about feedback to dynamically complete complex tasks.

**How we meet this:**
- **5+ API sequence:** Claude (orchestrator) → OpenAI o1 (medical reasoning) → PubMed (literature) → BrightData (guidelines) → Perplexity Sonar (consensus)
- **Feedback loop:** `assess_evidence_quality` tool evaluates consistency; returns `refine_query`, `broaden_query`, or `proceed`. When conflicts detected, Claude refines search and re-queries.
- **Visible proof:** "Multi-API Pipeline" card on analysis page shows all services used. Terminal logs show `[Pipeline]` sequence and `[Feedback]` refinements.

**Demo points:** "Our agent autonomously chooses which API to call and when. When evidence is inconsistent, it refines the query and re-searches before writing reports."

---

### OpenAI — Most Creative Use of API

**Criterion:** Top three teams that use OpenAI API most creatively.

**How we meet this:**
- **o1 as medical reasoning engine:** Dedicated system prompt frames task as research associations and risk domain ranking (not diagnosis).
- **Structured reasoning:** Ask for step-by-step reasoning trace, then structured output (ranked domains, confidence, screening, reasoning).
- **`reasoning_effort: 'high'`:** Uses o1's extended reasoning for medical analysis.

**Demo points:** "We use o1 creatively as a clinical reasoning engine with a specialized system prompt. It stays strictly in research associations while providing explicit reasoning traces."

---

### Anthropic Human Flourishing

**Criterion:** Patient report reads empathetically (test with family). Show how AI serves human potential.

**How we meet this:**
- **Empathetic tone:** Opening validates effort ("Taking an interest..."), normalizes variation ("Many people see temporary changes").
- **Family-tested design:** Report designed for reading with family members (see `docs/human-flourishing-note.md`).
- **No alarm:** 8th-grade reading level, hopeful framing, clear disclaimers.

**Demo points:** "We designed the patient report to be read with a parent or partner — supportive, clear, and without fear. AI should make life better by making health intelligence accessible."

---

### Anthropic Best Agent (Claude SDK)

**Criterion:** Autonomous AI application that tackles real problems.

**How we meet this:**
- **Autonomous tool use:** Claude agent chooses when to call each of 5 tools based on evidence quality.
- **Real problem:** Turning messy wearable data into trustworthy, evidence-based health intelligence.
- **No hand-coded sequence:** Agent dynamically plans pipeline each run.

**Demo points:** "The orchestrator is a Claude agent with 5 tools. It autonomously decides the pipeline, reasons about evidence, and only then writes reports."

---

### OpenEvidence — Clinical Info & Healthcare Track

**Criterion (Clinical Info):** Convert clinical data into product that improves understanding/decision-making/care delivery.
**Criterion (Healthcare):** Most innovative healthcare product.

**How we meet this:**
- **Clinical data sources:** PubMed (literature), BrightData (guidelines), Perplexity (consensus).
- **Dual products:**
  1. **Patient report:** Improves understanding (empathetic, actionable, clear next steps)
  2. **Clinical report:** Supports decision-making (GRADE evidence, screening suggestions, differential diagnosis)
- **Innovation:** Multi-agent AI + wearable data + evidence synthesis, strictly non-diagnostic.

**Demo points:** "We convert existing clinical data into two reports: one for patient understanding, one for clinician decision-making. That's healthcare innovation with clear boundaries."

---

### TreeHacks Most Impactful

**Criterion:** Potential to create significant positive change or address pressing societal issue.

**How we meet this:**
- **Early warning system:** Sleep deviation as biomarker of systemic health drift before clinical disease.
- **Preventive focus:** Detect trajectory shifts early so people and providers can act sooner.
- **Equity angle:** Consumer wearable analysis accessible where sleep labs are scarce.

**Impact statement:** "SOMNI AI turns wearable data into evidence-based insights so people can spot patterns before they become disease — reducing healthcare burden and supporting preventive, equitable access to understanding."

**Demo points:** "We're not diagnosing — we're surfacing research-backed patterns early. That's preventive, person-centered, and reduces pressure on the system."

---

### Vercel — Best Use of Vercel

**Criterion:** Best leverages Vercel to build, deploy, and scale production-ready app.

**How we meet this:**
- **Single deployment:** TypeScript sleep analysis (no Python backend required) — everything on Vercel.
- **Next.js 14 App Router:** Server components, API routes, serverless functions.
- **Production-ready:** Full deployment with caching and edge capabilities.

**Demo points:** "The whole app runs on Vercel — frontend and APIs. We ported sleep analysis to TypeScript so there's no separate backend. One deploy, production-ready."

---

### BrightData — Best AI-Powered Web Hack

**Criterion:** Use BrightData in an innovative way.

**How we meet this:**
- **Innovative use:** Pull public health guidelines and disparity data (CDC/AHA-style) into agent pipeline.
- **Value-add:** Grounds recommendations in current guidelines; surfaces population-level context (disparities).
- **Real usage:** `BRIGHTDATA_API_KEY` set in production; "BrightData: real" shown in UI.

**Demo points:** "BrightData feeds our agent with guideline and disparity datasets so recommendations align with public health guidance."

---

### Perplexity — Best Use of Sonar API

**Criterion:** Build something extraordinary with Sonar; innovative use, technical excellence, real-world value.

**How we meet this:**
- **Consensus + controversy:** Agent asks Sonar for both consensus AND controversy in literature.
- **Real-world value:** Calibrates strength of claims in reports based on where evidence agrees/disagrees.
- **Evidence synthesis:** Sonar citations integrated into research foundation.

**Demo points:** "We use Perplexity Sonar as our consensus engine: we ask for consensus and controversy so reports reflect where the evidence agrees and where it doesn't."

## 📚 Using Demo Data

Test the system with the included sample:

```bash
# Use the 30-day Fitbit sample
public/demo_data/fitbit_30days.csv
```

Upload this file through the web interface to see the full analysis pipeline.

## ⚠️ Important Disclaimers

SOMNI AI is **NOT a diagnostic tool**. It:
- Does NOT diagnose medical conditions
- Does NOT provide medical advice
- Uses consumer wearable estimates (not clinical PSG)
- Shows research associations, not causation

Always consult healthcare providers for medical decisions.

## 🧪 Testing

```bash
# Python tests
cd python
pytest tests/ -v

# Type checking
npm run type-check

# Build verification
npm run build
```

## 📧 Contact

Built for TreeHacks 2026

---

**MIT License** - See LICENSE file