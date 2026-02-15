import { z } from 'zod';

/**
 * Zod schemas for sleep analysis data validation
 * Ported from python/sleep_analysis/models.py
 */

export const SleepRecordSchema = z.object({
  date: z.date(),
  total_sleep_min: z.number().min(0).max(720),
  sleep_efficiency: z.number().min(0).max(100),
  deep_sleep_min: z.number().min(0).max(360),
  rem_sleep_min: z.number().min(0).max(360),
  awakenings: z.number().min(0).max(50),
});

export type SleepRecord = z.infer<typeof SleepRecordSchema>;

export const BaselineMetricsSchema = z.object({
  mean_total_sleep: z.number(),
  std_total_sleep: z.number(),
  mean_efficiency: z.number(),
  std_efficiency: z.number(),
  mean_deep: z.number(),
  std_deep: z.number(),
  mean_rem: z.number(),
  std_rem: z.number(),
  mean_awakenings: z.number(),
  std_awakenings: z.number(),
  rmssd: z.number(),
});

export type BaselineMetrics = z.infer<typeof BaselineMetricsSchema>;

export const ZScoresSchema = z.object({
  efficiency: z.number(),
  deep_sleep: z.number(),
  rem_sleep: z.number(),
  awakenings: z.number(),
});

export type ZScores = z.infer<typeof ZScoresSchema>;

export const TrendAnalysisSchema = z.object({
  efficiency_slope: z.number(),
  deep_slope: z.number(),
  rem_slope: z.number(),
  awakenings_slope: z.number(),
  efficiency_pvalue: z.number(),
  has_significant_trend: z.boolean(),
});

export type TrendAnalysis = z.infer<typeof TrendAnalysisSchema>;

export const SHDIScoreSchema = z.object({
  score: z.number().min(0).max(100),
  category: z.enum(['stable', 'moderate_drift', 'significant_drift']),
  confidence: z.number().min(0).max(1),
});

export type SHDIScore = z.infer<typeof SHDIScoreSchema>;

export const RiskPhenotypeSchema = z.object({
  primary_pattern: z.enum([
    'fragmentation_dominant',
    'deep_sleep_reduction',
    'rem_instability',
    'efficiency_instability',
  ]),
  confidence: z.number().min(0).max(1),
  associated_domains: z.array(z.string()),
  evidence_strength: z.enum(['strong', 'moderate', 'emerging']),
});

export type RiskPhenotype = z.infer<typeof RiskPhenotypeSchema>;

export const SleepAnalysisResultSchema = z.object({
  days_analyzed: z.number(),
  start_date: z.string(),
  end_date: z.string(),
  baseline: BaselineMetricsSchema,
  z_scores: ZScoresSchema,
  trends: TrendAnalysisSchema,
  svi: z.number(),
  shdi: SHDIScoreSchema,
  phenotype: RiskPhenotypeSchema,
});

export type SleepAnalysisResultTS = z.infer<typeof SleepAnalysisResultSchema>;

export interface ValidationResult {
  valid: boolean;
  error_message?: string;
  num_records: number;
  date_range?: { start: Date; end: Date };
}

/**
 * Helper function to interpret z-score magnitude
 */
export function interpretZScore(z: number): string {
  const abs_z = Math.abs(z);
  if (abs_z < 1) return 'Within normal variation';
  if (abs_z < 2) return 'Moderate deviation';
  return 'Significant deviation';
}

/**
 * Helper function to determine SHDI category from score
 */
export function determineSHDICategory(score: number): 'stable' | 'moderate_drift' | 'significant_drift' {
  if (score < 30) return 'stable';
  if (score < 60) return 'moderate_drift';
  return 'significant_drift';
}
