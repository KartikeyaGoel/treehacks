# SOMNI AI - Demo Data Guide

## 📁 WHAT FILE TO UPLOAD

**Best Choice for Demo**: `public/demo_data/demo_ultra_dramatic.csv`

## 📊 WHAT THE CSV MUST CONTAIN

### **Required Columns** (case-insensitive):

1. **Date** - Format: YYYY-MM-DD (e.g., "2026-01-15")
2. **Minutes Asleep** OR **total_sleep_min** - Total sleep time in minutes
3. **Sleep Efficiency %** OR **sleep_efficiency** - Percentage (0-100)
4. **Minutes Deep Sleep** OR **deep_sleep_min** - Deep sleep duration in minutes
5. **Minutes REM Sleep** OR **rem_sleep_min** - REM sleep duration in minutes
6. **Number of Awakenings** OR **awakenings** - Count of wake-ups during night

### **Example CSV Format**:

```csv
Date,Minutes Asleep,Sleep Efficiency %,Minutes Deep Sleep,Minutes REM Sleep,Number of Awakenings
2026-01-01,490,94.0,120,120,1
2026-01-02,490,94.0,120,120,1
2026-01-03,490,94.0,120,120,1
...
2026-01-28,330,72.0,40,60,11
2026-01-29,340,73.0,45,65,10
2026-01-30,335,72.0,42,62,11
```

## 🎯 WHY DEMO_ULTRA_DRAMATIC.CSV IS PERFECT

### The Data Story:

**Days 1-23: Perfect Baseline (Ideal Health)**
- 490 minutes sleep (8 hours 10 minutes) - consistent every night
- 94% efficiency - excellent sleep quality
- 120 minutes deep sleep - optimal restorative sleep
- 120 minutes REM sleep - ideal for memory/cognition
- Only 1 awakening per night - minimal fragmentation

**Days 24-30: Catastrophic Deterioration**
- Sleep crashes to 330-350 minutes (5.5-6 hours) - severe deprivation
- Efficiency drops to 72-75% - poor sleep quality
- Deep sleep decimated to 40-50 minutes - 66% reduction!
- REM sleep halved to 60-70 minutes - 50% reduction!
- Awakenings explode to 9-11 per night - severe fragmentation

### What This Simulates:

This pattern mimics real-world health events:
- **Onset of sleep apnea** (fragmentation + reduced deep sleep)
- **Severe stress or burnout** (all metrics crash simultaneously)
- **Metabolic disorder development** (efficiency + deep sleep reduction)
- **Pre-cardiac event state** (fragmentation is strongest CVD predictor)

### Why Judges Will Love It:

1. **Dramatic Visual Impact**: The graphs will show a cliff-drop in all metrics
2. **High SHDI Score**: Will trigger full multi-agent orchestration (shows technical complexity)
3. **Clear Clinical Relevance**: Mimics patterns studied in cardiovascular research
4. **Compelling Narrative**: "This person went from perfect health to crisis in 7 days"
5. **Demonstrates Early Detection**: Traditional medicine wouldn't catch this until symptoms appear

## 🔬 WHAT ANALYSIS YOU'LL SEE

### Statistical Metrics:

**Baseline Stats (Days 1-30 average)**:
- Mean sleep: ~460 minutes
- Mean efficiency: ~90%
- Mean deep sleep: ~106 minutes
- Mean awakenings: ~2.6

**Recent Deviation (Last 7 days vs baseline)**:
- Efficiency z-score: **-1.6 to -2.0σ** (moderate to severe decline)
- Deep sleep z-score: **-1.6 to -2.0σ** (severe reduction)
- REM sleep z-score: **-1.6 to -2.0σ** (severe reduction)
- Awakenings z-score: **+1.6 to +2.0σ** (severe increase)

**SHDI Score**: 15-20/100 (shows drift, may need to be >60 for full orchestration)

**Phenotype**: Efficiency Instability or Fragmentation-Dominant

**Risk Domains**: Cardiovascular, metabolic, mental_health

### Multi-Agent Orchestration:

If SHDI > 60, system will:
1. **Claude Orchestrator** - Coordinates the research pipeline
2. **OpenAI o1** - Deep clinical reasoning on the pattern
3. **PubMed Search** - Finds research on fragmentation + cardiovascular risk
4. **Perplexity Sonar** - Detects consensus across meta-analyses
5. **BrightData** - Scrapes CDC sleep health guidelines

### Reports Generated:

**Patient Report** (Empathetic, 8th-grade reading level):
- "What We Observed" - Plain language summary
- "What Research Has Found" - Accessible science communication
- "What This Does NOT Mean" - Clear disclaimers about not being diagnostic
- "What You Can Do" - Actionable lifestyle recommendations
- "When to Talk to a Doctor" - Guidance on clinical follow-up

**Clinical Report** (Evidence-graded for healthcare providers):
- Quantitative metrics table (z-scores, trends, variability)
- SHDI score with confidence intervals
- Risk phenotype classification
- Evidence summary with PubMed citations
- Effect sizes and hazard ratios
- GRADE methodology evidence strength ratings
- Limitations section (wearable accuracy, confounders)
- Clinical recommendations for preventive screening

## 🎨 ALTERNATIVE DEMO STRATEGIES

### Option 1: "Before and After" Story
Upload two files:
1. First 23 days only → "Everything looks great!"
2. Full 30 days → "Wait... something's wrong"
(Shows how early detection works)

### Option 2: "Comparison" Demo
Have two datasets ready:
1. demo_ultra_dramatic.csv (severe drift)
2. fitbit_30days.csv (stable sleep)
Show how system responds differently

### Option 3: "Progressive Reveal"
Start with just showing the upload, then as analysis runs:
- Reveal the data story ("healthy baseline... then crisis")
- Show live z-score calculations appearing
- Highlight when multi-agent orchestration kicks in
- Culminate with clinical findings

## 📝 HOW TO EXPORT YOUR OWN DATA

### From Fitbit:
1. Log in to fitbit.com
2. Settings → Data Export → Request Data
3. Download sleep data CSV
4. Rename columns to match format above

### From Apple Health:
1. Health app → Profile → Export All Health Data
2. Unzip → find export.xml
3. SOMNI parses this automatically (we have Apple Health XML parser!)

### From Oura Ring:
1. cloud.ouraring.com → Settings → Data Export
2. Download sleep sessions CSV
3. Format columns as shown above

## ⚠️ MINIMUM DATA REQUIREMENTS

For analysis to work:
- **Minimum 14 days** of data (validation will reject less)
- **All 6 columns** must be present (date, sleep time, efficiency, deep, REM, awakenings)
- **Realistic value ranges**:
  - Sleep time: 0-720 minutes (0-12 hours)
  - Efficiency: 0-100%
  - Deep sleep: 0-300 minutes
  - REM sleep: 0-300 minutes
  - Awakenings: 0-50

## 🚨 TROUBLESHOOTING

### "Analysis failed - insufficient data"
- Check you have at least 14 days
- Verify all required columns exist
- Ensure no blank rows

### "Parsing error"
- Check date format is YYYY-MM-DD
- Ensure column headers match (case-insensitive)
- Remove any special characters from data

### "SHDI score too low"
- This is fine! Shows system handles normal sleep too
- Explain: "This person has stable sleep - no intervention needed"
- Emphasize: "The system correctly identifies ABSENCE of drift"

## 🎯 PRO TIP FOR DEMO

Before your demo, test the upload once to verify:
1. File uploads successfully
2. Analysis runs without errors
3. You know approximately what SHDI score to expect
4. You're familiar with the findings shown

Then for the actual demo, you can confidently say:
"This data shows a 66% reduction in deep sleep over 7 days - let's see what the AI agents find..."

This shows you understand the tool deeply (judges love that!)

## 💡 BONUS: Creating Your Own Dramatic Dataset

If you want even MORE drama, edit the CSV to make recent days worse:
- **Awakenings**: Increase to 15-20 (simulating severe apnea)
- **Deep sleep**: Reduce to 20-30 minutes (critical deprivation)
- **Efficiency**: Drop to 65-70% (clinical-level poor sleep)

This will push SHDI higher and trigger more dramatic findings!

---

**Remember**: The file you upload IS the story you're telling. Make it dramatic, make it realistic, make it memorable. 🚀
