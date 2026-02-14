/**
 * Clinical Report Generator
 * OpenEvidence Prize - Structured clinical evidence with GRADE-style grading
 */

import { SleepAnalysisResult, ResearchEvidence } from '../agents/types';

function interpretZScore(z: number): string {
  const abs = Math.abs(z);
  if (abs < 1) return 'Within normal variation';
  if (abs < 2) return 'Moderate deviation';
  return 'Significant deviation';
}

function generateScreeningRecommendations(phenotype: string, shdi: number): string {
  const recommendations: Record<string, string[]> = {
    fragmentation_dominant: [
      'Screen for obstructive sleep apnea (OSA) - consider home sleep apnea testing (HSAT) or polysomnography',
      'Evaluate for cardiovascular risk factors (blood pressure, lipid panel, glucose)',
      'Assess for restless legs syndrome or periodic limb movement disorder',
      'Review medications that may fragment sleep'
    ],
    deep_sleep_reduction: [
      'Evaluate for sleep disorders affecting slow-wave sleep',
      'Screen for metabolic syndrome components',
      'Assess for depression or anxiety disorders',
      'Consider cognitive screening if patient reports memory concerns'
    ],
    rem_instability: [
      'Screen for REM behavior disorder, especially if patient reports dream enactment',
      'Evaluate for neurodegenerative risk factors',
      'Assess for psychiatric comorbidities (depression, PTSD)',
      'Review medications affecting REM sleep (SSRIs, beta-blockers)'
    ],
    efficiency_instability: [
      'Evaluate for insomnia disorder using validated tools (ISI, PSQI)',
      'Screen for circadian rhythm disorders',
      'Assess for mood disorders and chronic stress',
      'Review sleep hygiene and environmental factors'
    ]
  };

  const recs = recommendations[phenotype] || ['General sleep hygiene counseling'];

  if (shdi > 60) {
    recs.unshift('**Priority**: Clinical sleep assessment recommended given SHDI > 60');
  }

  return recs.map((r, i) => `${i + 1}. ${r}`).join('\n');
}

export function generateClinicalReport(
  analysis: SleepAnalysisResult,
  evidence: ResearchEvidence[]
): string {
  const { baseline, z_scores, trends, svi, shdi, phenotype } = analysis;

  return `# Clinical Sleep Health Analysis

**Report Date**: ${new Date().toLocaleDateString()}
**Analysis Period**: ${analysis.start_date} to ${analysis.end_date} (${analysis.days_analyzed} days)
**Data Source**: Consumer wearable device (algorithm-estimated sleep stages)

---

## Executive Summary

**Sleep Health Deviation Index (SHDI)**: ${shdi.score.toFixed(1)}/100 (${shdi.category.replace('_', ' ')})

**Primary Sleep Pattern**: ${phenotype.primary_pattern.replace(/_/g, ' ')}

**Clinical Significance**: ${shdi.score < 30 ? 'Minimal - routine follow-up' : shdi.score < 60 ? 'Moderate - lifestyle counseling recommended' : 'Significant - clinical evaluation warranted'}

---

## Quantitative Sleep Metrics

### Baseline Statistics (30-day rolling window)

| Metric | Mean ± SD | Coefficient of Variation |
|--------|-----------|-------------------------|
| Total Sleep Time | ${baseline.mean_total_sleep.toFixed(1)} ± ${baseline.std_total_sleep.toFixed(1)} min | ${((baseline.std_total_sleep / baseline.mean_total_sleep) * 100).toFixed(1)}% |
| Sleep Efficiency | ${baseline.mean_efficiency.toFixed(1)} ± ${baseline.std_efficiency.toFixed(1)}% | ${((baseline.std_efficiency / baseline.mean_efficiency) * 100).toFixed(1)}% |
| Deep Sleep | ${baseline.mean_deep.toFixed(1)} ± ${baseline.std_deep.toFixed(1)} min | ${((baseline.std_deep / baseline.mean_deep) * 100).toFixed(1)}% |
| REM Sleep | ${baseline.mean_rem.toFixed(1)} ± ${baseline.std_rem.toFixed(1)} min | ${((baseline.std_rem / baseline.mean_rem) * 100).toFixed(1)}% |
| Awakenings | ${baseline.mean_awakenings.toFixed(1)} ± ${baseline.std_awakenings.toFixed(1)} | ${((baseline.std_awakenings / baseline.mean_awakenings) * 100).toFixed(1)}% |

**RMSSD (Sleep Duration Variability)**: ${baseline.rmssd.toFixed(1)} minutes

### Deviation Analysis (Recent 7-day vs. Baseline)

| Metric | Z-Score | Interpretation | Clinical Relevance |
|--------|---------|----------------|-------------------|
| Sleep Efficiency | ${z_scores.efficiency.toFixed(2)} | ${interpretZScore(z_scores.efficiency)} | ${Math.abs(z_scores.efficiency) > 1.5 ? '⚠️ Clinically significant' : '✓ Within expected range'} |
| Deep Sleep | ${z_scores.deep_sleep.toFixed(2)} | ${interpretZScore(z_scores.deep_sleep)} | ${Math.abs(z_scores.deep_sleep) > 1.5 ? '⚠️ Clinically significant' : '✓ Within expected range'} |
| REM Sleep | ${z_scores.rem_sleep.toFixed(2)} | ${interpretZScore(z_scores.rem_sleep)} | ${Math.abs(z_scores.rem_sleep) > 1.5 ? '⚠️ Clinically significant' : '✓ Within expected range'} |
| Awakenings | ${z_scores.awakenings.toFixed(2)} | ${interpretZScore(z_scores.awakenings)} | ${Math.abs(z_scores.awakenings) > 1.5 ? '⚠️ Clinically significant' : '✓ Within expected range'} |

### Temporal Trend Analysis

| Metric | Slope (per day) | P-value | Trend Significance |
|--------|----------------|---------|-------------------|
| Sleep Efficiency | ${trends.efficiency_slope.toFixed(4)}%/day | ${trends.efficiency_pvalue.toFixed(4)} | ${trends.efficiency_pvalue < 0.05 ? (trends.efficiency_slope < 0 ? '⚠️ Declining' : '↗️ Improving') : '→ Stable'} |
| Deep Sleep | ${trends.deep_slope.toFixed(4)} min/day | - | ${Math.abs(trends.deep_slope) > 0.5 ? 'Trending' : 'Stable'} |
| REM Sleep | ${trends.rem_slope.toFixed(4)} min/day | - | ${Math.abs(trends.rem_slope) > 0.5 ? 'Trending' : 'Stable'} |
| Awakenings | ${trends.awakenings_slope.toFixed(4)}/day | - | ${Math.abs(trends.awakenings_slope) > 0.05 ? 'Trending' : 'Stable'} |

**Sleep Variability Index (SVI)**: ${svi.toFixed(1)}/100

Interpretation: ${svi < 30 ? 'Low variability - consistent sleep patterns' : svi < 60 ? 'Moderate variability - some inconsistency' : 'High variability - irregular sleep patterns'}

---

## Risk Phenotype Classification

**Primary Pattern**: ${phenotype.primary_pattern.replace(/_/g, ' ').toUpperCase()}

**Classification Confidence**: ${(phenotype.confidence * 100).toFixed(0)}%

**Associated Risk Domains**:
${phenotype.associated_domains.map(d => `- ${d.charAt(0).toUpperCase() + d.slice(1)}`).join('\n')}

**Evidence Strength**: ${phenotype.evidence_strength.toUpperCase()}

---

## Evidence Summary

${evidence.map((e, i) => `
### Study ${i + 1}: ${e.title}

**Citation**: ${e.authors}. *${e.journal}*. ${e.year}.

| Parameter | Value |
|-----------|-------|
| Study Design | ${e.study_type} |
| Sample Size | n = ${e.sample_size.toLocaleString()} |
| Effect Size | ${e.effect_size_description} |
${e.hazard_ratio ? `| Hazard Ratio | ${e.hazard_ratio} (95% CI: ${e.confidence_interval})` : ''}
| Evidence Strength | **${e.evidence_strength.toUpperCase()}** |

**Key Finding**: ${e.key_finding}

**Relevance to Patient**: Pattern of ${e.pattern_description} identified in this analysis aligns with study population characteristics.
`).join('\n---\n')}

---

## Evidence Grading Summary

| Domain | Evidence Strength | Effect Size | Study Quality | Applicability |
|--------|------------------|-------------|---------------|---------------|
${evidence.map(e => `| ${e.health_domain} | ${e.evidence_strength} | ${e.effect_size_description} | ${e.study_type === 'Meta-analysis' ? 'High' : e.study_type.includes('cohort') ? 'Moderate' : 'Low'} | ${e.sample_size > 5000 ? 'High' : e.sample_size > 1000 ? 'Moderate' : 'Limited'} |`).join('\n')}

**Grading Criteria**: Modified GRADE approach
- **Strong**: Meta-analyses, large RCTs, consistent findings
- **Moderate**: Cohort studies, some heterogeneity
- **Emerging**: Limited studies, cross-sectional data

---

## Clinical Limitations

### 1. **Data Source Limitations**
- Consumer wearable device provides algorithm-estimated sleep stages
- Validation studies show moderate agreement with polysomnography (κ ≈ 0.6-0.7 for sleep stages)
- Deep sleep and REM classification accuracy varies by device (60-80% typical)
- Movement-based sleep detection may overestimate sleep time

### 2. **Statistical Limitations**
- Analysis based on personal baseline, not population norms
- Z-scores assume normal distribution (may not hold for all metrics)
- Limited data duration (${analysis.days_analyzed} days) affects trend reliability
- No accounting for confounding factors (medications, comorbidities, life events)

### 3. **Evidence Limitations**
- Associations do NOT imply causation
- Population-level findings may not apply to individual
- Effect sizes derived from heterogeneous populations
- Temporal relationship unclear (does poor sleep cause or result from health conditions?)

### 4. **Clinical Context**
- Requires integration with clinical history, physical exam, and other diagnostic data
- Sleep disorders require formal diagnostic evaluation (ICSD-3 criteria)
- Treatment decisions should be evidence-based and individualized

---

## Clinical Recommendations

### Preventive Screening (Based on Phenotype: ${phenotype.primary_pattern})

${generateScreeningRecommendations(phenotype.primary_pattern, shdi.score)}

### Follow-Up Plan

${shdi.score > 60
  ? `**Urgent**: Clinical sleep evaluation within 2-4 weeks
- Consider sleep medicine referral
- Rule out primary sleep disorders (OSA, insomnia, circadian disorders)
- Assess for cardiovascular and metabolic comorbidities`
  : shdi.score > 30
  ? `**Routine**: Follow-up in 1-3 months
- Implement evidence-based sleep hygiene interventions
- Re-assess sleep patterns with continued wearable monitoring
- Consider sleep medicine referral if no improvement`
  : `**As Needed**: Continue routine monitoring
- Reinforce healthy sleep habits
- Re-evaluate if patient develops symptoms`
}

---

## Diagnostic Considerations

**Differential Diagnosis** (if symptoms present):
1. Primary sleep disorders (OSA, insomnia, RLS, circadian rhythm disorders)
2. Medical comorbidities affecting sleep (pain, nocturia, GERD)
3. Psychiatric disorders (depression, anxiety, PTSD)
4. Medication effects on sleep architecture
5. Environmental or behavioral factors

**Recommended Next Steps**:
- Clinical interview using validated tools (ESS, ISI, PSQI)
- Medication and substance use review
- Physical examination focusing on OSA risk factors (BMI, neck circumference, Mallampati)
- Consider polysomnography if sleep disorder suspected
- Laboratory testing based on risk factors identified

---

## Disclaimer

**IMPORTANT**: This analysis is for research and educational purposes only. It does NOT:
- Replace clinical judgment or diagnostic evaluation
- Provide medical advice or treatment recommendations
- Diagnose sleep disorders or other medical conditions
- Substitute for polysomnography or other clinical sleep testing

Findings represent statistical associations from research literature applied to personal sleep pattern deviations. Clinical correlation is required for any diagnostic or therapeutic decisions.

---

*Report generated by SOMNI AI - Sleep Health Intelligence System*
*Multi-agent clinical evidence synthesis powered by Claude AI*
*Evidence-based medicine approach following GRADE methodology*
`;
}
