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

## 🏆 Prize Categories Targeted

- **Greylock**: 5+ API orchestration with autonomous feedback loops
- **Anthropic Human Flourishing**: Empathetic patient reports
- **OpenAI AI Track**: o1-preview structured reasoning
- **Vercel**: Next.js 14 with edge streaming
- **BrightData**: CDC/AHA guideline scraping
- **Perplexity**: Consensus detection
- **OpenEvidence**: Evidence-graded clinical reports
- **Healthcare Track**: Responsible AI
- **Most Impactful**: Early health drift detection

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