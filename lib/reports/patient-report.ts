/**
 * Patient Report Generator
 * Anthropic Human Flourishing Prize - Empathetic, accessible, 8th grade reading level
 */

import { SleepAnalysisResult, ResearchEvidence } from '../agents/types';

export function generatePatientReport(
  analysis: SleepAnalysisResult,
  evidence: ResearchEvidence[]
): string {
  const { shdi, phenotype, z_scores } = analysis;

  return `# Your Sleep Health Insights

## What We Observed

Over the past **${analysis.days_analyzed} days**, we analyzed your sleep patterns using data from your wearable device.

${shdi.category === 'stable'
  ? `✅ **Good news!** Your sleep patterns are stable and consistent with your personal baseline.`
  : `📊 We detected some changes in your sleep patterns compared to your usual baseline.`
}

${phenotype.primary_pattern === 'fragmentation_dominant' && Math.abs(z_scores.awakenings) > 1
  ? `**Sleep Interruptions**: You've experienced more nighttime awakenings than typical for you (${z_scores.awakenings.toFixed(1)} standard deviations ${z_scores.awakenings > 0 ? 'above' : 'below'} your baseline). This means you're waking up more often during the night.`
  : ''
}

${phenotype.primary_pattern === 'deep_sleep_reduction' && Math.abs(z_scores.deep_sleep) > 1
  ? `**Deep Sleep Changes**: Your deep sleep has been ${z_scores.deep_sleep < 0 ? 'lower' : 'higher'} than your usual pattern (${Math.abs(z_scores.deep_sleep).toFixed(1)} standard deviations). Deep sleep is when your body does most of its physical recovery.`
  : ''
}

${phenotype.primary_pattern === 'rem_instability' && Math.abs(z_scores.rem_sleep) > 1
  ? `**REM Sleep Variation**: Your REM sleep has been more variable than usual. REM sleep is important for memory and emotional processing.`
  : ''
}

## What Research Has Found

**Important**: These are patterns observed in research studies, not medical diagnoses.

${evidence.slice(0, 3).map(e => `
### ${e.health_domain.charAt(0).toUpperCase() + e.health_domain.slice(1)} Health

Research has found that **${e.pattern_description}** is associated with ${e.health_domain} health. This was observed in studies with **${e.sample_size.toLocaleString()} participants**.

- **Study type**: ${e.study_type}
- **Finding strength**: ${e.evidence_strength} evidence
- **Effect size**: ${e.effect_size_description}
${e.hazard_ratio ? `- **Statistical measure**: Hazard ratio of ${e.hazard_ratio} (${e.confidence_interval})` : ''}

*What this means*: ${e.key_finding}
`).join('\n')}

## What This Does NOT Mean

Let's be clear about what this analysis is **not**:

- ❌ **Not a diagnosis**: This analysis does not diagnose any medical condition
- ❌ **Not clinical-grade**: Wearable devices provide **estimates** of sleep stages, not the gold-standard polysomnography (PSG) used in sleep labs
- ❌ **Not medical advice**: Many factors affect sleep - stress, environment, lifestyle changes, medications
- ❌ **Not unusual to vary**: Individual variation in sleep patterns is completely normal

## What You Can Do

### 1. Lifestyle Changes That Research Supports

Try these evidence-based sleep improvements:

- **Consistent schedule**: Go to bed and wake up at the same time every day (yes, even weekends!)
- **Optimize your bedroom**: Keep it cool (60-67°F), dark, and quiet
- **Screen time**: Limit phones, tablets, and computers 1 hour before bed
- **Physical activity**: Regular exercise helps, but avoid vigorous workouts close to bedtime
- **Avoid**: Caffeine after 2 PM, large meals before bed, alcohol as a sleep aid

### 2. When to Talk to Your Doctor

${shdi.score > 60
  ? `Given the magnitude of changes we detected, **consider discussing these patterns with your healthcare provider**, especially if you're experiencing:

- Persistent daytime fatigue or sleepiness
- Difficulty concentrating or memory problems
- Mood changes or irritability
- Morning headaches
- Snoring or gasping during sleep (ask a partner)`
  : `If you notice **persistent symptoms**, consider discussing with your doctor:

- Daytime fatigue that doesn't improve with lifestyle changes
- Difficulty falling asleep or staying asleep
- Feeling unrefreshed despite adequate sleep time
- Any concerning health changes`
}

### 3. Continue Tracking

Keep monitoring your sleep to see if patterns improve with lifestyle changes. Look for trends over weeks, not individual nights.

## Your Sleep Metrics Summary

| Metric | Your Baseline | Recent 7-Day Average |
|--------|---------------|---------------------|
| Sleep Efficiency | ${analysis.baseline.mean_efficiency.toFixed(1)}% | ${(analysis.baseline.mean_efficiency + z_scores.efficiency * analysis.baseline.std_efficiency).toFixed(1)}% |
| Deep Sleep | ${analysis.baseline.mean_deep.toFixed(0)} min | ${(analysis.baseline.mean_deep + z_scores.deep_sleep * analysis.baseline.std_deep).toFixed(0)} min |
| REM Sleep | ${analysis.baseline.mean_rem.toFixed(0)} min | ${(analysis.baseline.mean_rem + z_scores.rem_sleep * analysis.baseline.std_rem).toFixed(0)} min |
| Awakenings | ${analysis.baseline.mean_awakenings.toFixed(1)} | ${(analysis.baseline.mean_awakenings + z_scores.awakenings * analysis.baseline.std_awakenings).toFixed(1)} |

---

### Important Disclaimer

This report uses consumer wearable data, which provides **indirect estimates** of sleep stages. For clinical sleep assessment, polysomnography (PSG) in a sleep lab is the gold standard.

**This is not a diagnostic tool.** Findings represent research associations from scientific literature, not medical diagnoses. Always consult with a qualified healthcare provider for medical advice.

---

*Generated by SOMNI AI - Sleep Health Intelligence System*
*Powered by Claude AI with evidence-based research synthesis*
`;
}
