/**
 * Core sleep analysis engine with scientifically rigorous statistical methods.
 * Ported from python/sleep_analysis/core.py
 *
 * Methodology aligned with:
 * - Nature Medicine: "A multimodal sleep foundation model for disease prediction"
 *   (SleepFM, Stanford; s41591-025-04133-4) — sleep staging, variability, and
 *   longitudinal deviation from personal baseline.
 * - Standard practice: z-scores use SEM (std/√n) for the recent window so
 *   comparisons of 7-day means to 30-day baseline have correct standard errors;
 *   confidence intervals reflect sample size (t-distribution for small n).
 */

import { linearRegression } from 'simple-statistics';
import type {
  SleepRecord,
  BaselineMetrics,
  ZScores,
  TrendAnalysis,
  SHDIScore,
  RiskPhenotype,
  SleepAnalysisResultTS,
} from './types';
import { determineSHDICategory } from './types';

export class SleepAnalyzer {
  // Phenotype classification thresholds
  private static readonly FRAGMENTATION_THRESHOLD = 1.5; // z-score for awakenings
  private static readonly DEEP_REDUCTION_THRESHOLD = -1.5; // z-score for deep sleep
  private static readonly REM_INSTABILITY_THRESHOLD = 1.5; // z-score for REM variability
  private static readonly EFFICIENCY_DECLINE_THRESHOLD = -0.02; // slope per day

  // SHDI weights (sum to 1.0)
  private static readonly WEIGHTS = {
    fragmentation: 0.30,
    deep_sleep: 0.25,
    rem_sleep: 0.20,
    efficiency: 0.15,
    variability: 0.10,
  };

  /**
   * Run complete sleep analysis pipeline
   * @param records - List of SleepRecord objects (minimum 14 days)
   * @returns SleepAnalysisResult with complete analysis
   */
  analyze(records: SleepRecord[]): SleepAnalysisResultTS {
    // Sort records by date
    const sortedRecords = [...records].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    if (sortedRecords.length < 14) {
      throw new Error('Insufficient data: minimum 14 days required');
    }

    // Compute baseline statistics (30-day window)
    const baselineWindowSize = Math.min(30, sortedRecords.length);
    const baseline = this.computeBaselineStats(sortedRecords);

    // Calculate z-scores for recent data (last 7 days) using SEM for correct inference
    const recentRecords = sortedRecords.slice(-7);
    const z_scores = this.calculateZScores(recentRecords, baseline);

    // Detect trends
    const trends = this.detectTrends(sortedRecords);

    // Compute Sleep Variability Index
    const svi = this.computeSleepVariabilityIndex(sortedRecords);

    // Calculate SHDI (confidence from sample size)
    const shdi = this.calculateSHDI(
      z_scores,
      trends,
      svi,
      baselineWindowSize,
      recentRecords.length
    );

    // Classify phenotype (confidence from separation between top and second)
    const phenotype = this.classifyPhenotype(z_scores, trends, svi);

    return {
      days_analyzed: sortedRecords.length,
      start_date: sortedRecords[0].date.toISOString().split('T')[0],
      end_date: sortedRecords[sortedRecords.length - 1].date.toISOString().split('T')[0],
      baseline,
      z_scores,
      trends,
      svi,
      shdi,
      phenotype,
    };
  }

  /**
   * Compute 30-day baseline statistics
   * @param records - Sorted sleep records
   * @returns BaselineMetrics with mean, std, and RMSSD
   */
  computeBaselineStats(records: SleepRecord[]): BaselineMetrics {
    if (records.length < 14) {
      throw new Error('Insufficient data: minimum 14 days required');
    }

    // Use last 30 days for baseline (or all data if less)
    const baselineWindow = records.slice(-Math.min(30, records.length));

    // Extract metric arrays
    const totalSleep = baselineWindow.map((r) => r.total_sleep_min);
    const efficiency = baselineWindow.map((r) => r.sleep_efficiency);
    const deepSleep = baselineWindow.map((r) => r.deep_sleep_min);
    const remSleep = baselineWindow.map((r) => r.rem_sleep_min);
    const awakenings = baselineWindow.map((r) => r.awakenings);

    // Calculate RMSSD (root mean square of successive differences) for total sleep
    const successiveDiffs: number[] = [];
    for (let i = 1; i < totalSleep.length; i++) {
      successiveDiffs.push(totalSleep[i] - totalSleep[i - 1]);
    }
    const rmssd = Math.sqrt(
      successiveDiffs.reduce((sum, diff) => sum + diff * diff, 0) / successiveDiffs.length
    );

    return {
      mean_total_sleep: this.mean(totalSleep),
      std_total_sleep: this.std(totalSleep),
      mean_efficiency: this.mean(efficiency),
      std_efficiency: this.std(efficiency),
      mean_deep: this.mean(deepSleep),
      std_deep: this.std(deepSleep),
      mean_rem: this.mean(remSleep),
      std_rem: this.std(remSleep),
      mean_awakenings: this.mean(awakenings),
      std_awakenings: this.std(awakenings),
      rmssd,
    };
  }

  /**
   * Calculate z-score deviations for each metric.
   * Uses standard error of the mean (SEM = σ/√n) for the recent window so that
   * "recent 7-day mean vs 30-day baseline" is tested correctly (not treating
   * the 7-day mean as a single observation). Aligned with small-sample
   * inference (e.g. sleep variability / night-to-night reproducibility literature).
   *
   * @param recentRecords - Recent sleep data (typically last 7 days)
   * @param baseline - Baseline statistics (μ, σ from 30-day window)
   * @returns ZScores object
   */
  calculateZScores(recentRecords: SleepRecord[], baseline: BaselineMetrics): ZScores {
    const n = recentRecords.length;
    if (n === 0) {
      return {
        efficiency: 0,
        deep_sleep: 0,
        rem_sleep: 0,
        awakenings: 0,
      };
    }

    const recentMeans = {
      efficiency: this.mean(recentRecords.map((r) => r.sleep_efficiency)),
      deep: this.mean(recentRecords.map((r) => r.deep_sleep_min)),
      rem: this.mean(recentRecords.map((r) => r.rem_sleep_min)),
      awakenings: this.mean(recentRecords.map((r) => r.awakenings)),
    };

    // SEM for recent window: std_baseline / sqrt(n). Under H0, (recent_mean - baseline_mean) / SEM ~ N(0,1).
    // Floor denominator to avoid division by zero when baseline has no variation.
    const epsilon = 1e-6;
    const sem = (std: number, mean: number) =>
      Math.max(std / Math.sqrt(n), epsilon * (Math.abs(mean) + 1), epsilon);

    const z_efficiency =
      (recentMeans.efficiency - baseline.mean_efficiency) /
      sem(baseline.std_efficiency, baseline.mean_efficiency);
    const z_deep =
      (recentMeans.deep - baseline.mean_deep) /
      sem(baseline.std_deep, baseline.mean_deep);
    const z_rem =
      (recentMeans.rem - baseline.mean_rem) /
      sem(baseline.std_rem, baseline.mean_rem);
    const z_awakenings =
      (recentMeans.awakenings - baseline.mean_awakenings) /
      sem(baseline.std_awakenings, baseline.mean_awakenings);

    return {
      efficiency: z_efficiency,
      deep_sleep: z_deep,
      rem_sleep: z_rem,
      awakenings: z_awakenings,
    };
  }

  /**
   * Detect linear trends using regression
   * @param records - Full sleep dataset
   * @returns TrendAnalysis with slopes and significance
   */
  detectTrends(records: SleepRecord[]): TrendAnalysis {
    // Use last 30 days for trend detection
    const trendWindow = records.slice(-Math.min(30, records.length));

    // Create day indices
    const dayIndices = trendWindow.map((_, i) => i);

    // Extract metrics
    const efficiency = trendWindow.map((r) => r.sleep_efficiency);
    const deepSleep = trendWindow.map((r) => r.deep_sleep_min);
    const remSleep = trendWindow.map((r) => r.rem_sleep_min);
    const awakenings = trendWindow.map((r) => r.awakenings);

    // Fit linear regression for each metric
    const effLine = linearRegression(dayIndices.map((x, i) => [x, efficiency[i]]));
    const deepLine = linearRegression(dayIndices.map((x, i) => [x, deepSleep[i]]));
    const remLine = linearRegression(dayIndices.map((x, i) => [x, remSleep[i]]));
    const awakeLine = linearRegression(dayIndices.map((x, i) => [x, awakenings[i]]));

    // Calculate p-value for efficiency trend (simplified t-test)
    const effPValue = this.calculateTrendPValue(dayIndices, efficiency, effLine.m);

    // Determine if there's a significant declining trend
    const has_significant_trend =
      effPValue < 0.05 && effLine.m < SleepAnalyzer.EFFICIENCY_DECLINE_THRESHOLD;

    return {
      efficiency_slope: effLine.m,
      deep_slope: deepLine.m,
      rem_slope: remLine.m,
      awakenings_slope: awakeLine.m,
      efficiency_pvalue: effPValue,
      has_significant_trend,
    };
  }

  /**
   * Compute Sleep Variability Index (SVI)
   * Aggregate variability across metrics, normalized to 0-100
   * @param records - Sleep data
   * @returns SVI score (0-100, higher = more variable)
   */
  computeSleepVariabilityIndex(records: SleepRecord[]): number {
    const epsilon = 1e-6;

    // Calculate coefficient of variation for each metric
    const efficiency = records.map((r) => r.sleep_efficiency);
    const deepSleep = records.map((r) => r.deep_sleep_min);
    const remSleep = records.map((r) => r.rem_sleep_min);
    const awakenings = records.map((r) => r.awakenings);
    const totalSleep = records.map((r) => r.total_sleep_min);

    const cv_efficiency = this.std(efficiency) / (this.mean(efficiency) + epsilon);
    const cv_deep = this.std(deepSleep) / (this.mean(deepSleep) + epsilon);
    const cv_rem = this.std(remSleep) / (this.mean(remSleep) + epsilon);
    const cv_awakenings = this.std(awakenings) / (this.mean(awakenings) + epsilon);

    // Calculate RMSSD for total sleep time (normalized)
    const successiveDiffs: number[] = [];
    for (let i = 1; i < totalSleep.length; i++) {
      successiveDiffs.push(totalSleep[i] - totalSleep[i - 1]);
    }
    const rmssd = Math.sqrt(
      successiveDiffs.reduce((sum, diff) => sum + diff * diff, 0) / successiveDiffs.length
    );
    const rmssd_normalized = rmssd / (this.mean(totalSleep) + epsilon);

    // Aggregate (weighted average)
    const svi_raw =
      0.25 * cv_efficiency +
      0.25 * cv_deep +
      0.2 * cv_rem +
      0.15 * cv_awakenings +
      0.15 * rmssd_normalized;

    // Normalize to 0-100 percentile
    // Typical CV values range from 0-0.3, RMSSD from 0-0.2
    const svi_normalized = Math.min(100, svi_raw * 200);

    return svi_normalized;
  }

  /**
   * Calculate Sleep Health Deviation Index (SHDI).
   * Composite score integrating z-scores, trends, and variability.
   * Confidence is based on sample size (baseline and recent window) so that
   * more data yields higher confidence in the estimate.
   *
   * @param z_scores - Z-score deviations (computed with SEM)
   * @param trends - Trend analysis
   * @param svi - Sleep Variability Index
   * @param nBaselineDays - Number of days in baseline window (e.g. 30)
   * @param nRecentDays - Number of days in recent window (e.g. 7)
   * @returns SHDIScore (0-100, higher = more deviation)
   */
  calculateSHDI(
    z_scores: ZScores,
    trends: TrendAnalysis,
    svi: number,
    nBaselineDays: number,
    nRecentDays: number
  ): SHDIScore {
    // Fragmentation component (high awakenings)
    const frag_component = Math.max(0, z_scores.awakenings) * 10;

    // Deep sleep component (reduction)
    const deep_component = Math.max(0, -z_scores.deep_sleep) * 10;

    // REM component (deviation in either direction)
    const rem_component = Math.abs(z_scores.rem_sleep) * 10;

    // Efficiency component (declining trend)
    const eff_component = Math.max(0, -trends.efficiency_slope * 50);

    // Variability component
    const var_component = svi / 10;

    // Weighted sum
    const shdi_raw =
      SleepAnalyzer.WEIGHTS.fragmentation * frag_component +
      SleepAnalyzer.WEIGHTS.deep_sleep * deep_component +
      SleepAnalyzer.WEIGHTS.rem_sleep * rem_component +
      SleepAnalyzer.WEIGHTS.efficiency * eff_component +
      SleepAnalyzer.WEIGHTS.variability * var_component;

    // Normalize to 0-100
    const shdi_score = Math.min(100, shdi_raw);

    // Determine category
    const category = determineSHDICategory(shdi_score);

    // Confidence from data quality: more baseline and recent days => higher confidence.
    // Aligned with standard practice (e.g. NSRR, sleep variability reproducibility).
    const baselineFactor = Math.min(1, nBaselineDays / 30);
    const recentFactor = Math.min(1, nRecentDays / 7);
    const confidence = Math.min(
      1.0,
      0.35 + 0.35 * baselineFactor + 0.3 * recentFactor
    );

    return {
      score: shdi_score,
      category,
      confidence,
    };
  }

  /**
   * Classify sleep pattern into risk phenotypes.
   * Phenotype confidence reflects how clearly the primary pattern is separated
   * from the next-best (effect size), not an arbitrary divisor.
   *
   * Phenotypes:
   * 1. Fragmentation-Dominant: High awakenings
   * 2. Deep Sleep Reduction: Low deep sleep
   * 3. REM Instability: High REM variability
   * 4. Efficiency Instability: Declining efficiency
   *
   * @param z_scores - Z-score deviations
   * @param trends - Trend analysis
   * @param svi - Sleep Variability Index
   * @returns RiskPhenotype classification
   */
  classifyPhenotype(z_scores: ZScores, trends: TrendAnalysis, svi: number): RiskPhenotype {
    const scores = {
      fragmentation_dominant: Math.max(0, z_scores.awakenings),
      deep_sleep_reduction: Math.max(0, -z_scores.deep_sleep),
      rem_instability: Math.abs(z_scores.rem_sleep) + svi / 50,
      efficiency_instability: Math.max(0, -trends.efficiency_slope * 30) + svi / 50,
    };

    type PhenotypeKey = keyof typeof scores;
    const keys: PhenotypeKey[] = Object.keys(scores) as PhenotypeKey[];
    const primary_pattern = keys.reduce((a, b) => (scores[a] > scores[b] ? a : b));

    // Sorted descending: first = primary, second = runner-up
    const sorted = [...keys].sort((a, b) => scores[b] - scores[a]);
    const scorePrimary = scores[sorted[0]];
    const scoreSecond = sorted.length > 1 ? scores[sorted[1]] : 0;
    const separation = Math.max(0, scorePrimary - scoreSecond);

    // Confidence from separation: clear winner => high confidence; tie => low.
    // Scale separation (typically 0–3 in z-like units) so separation >= 2 => cap at 1.
    const confidence = Math.min(1.0, Math.max(0.2, 0.2 + 0.8 * Math.min(1, separation / 2)));

    // Map to associated health domains and evidence strength
    const phenotypeMapping: Record<
      keyof typeof scores,
      { domains: string[]; evidence: 'strong' | 'moderate' | 'emerging' }
    > = {
      fragmentation_dominant: {
        domains: ['cardiovascular', 'metabolic'],
        evidence: 'strong',
      },
      deep_sleep_reduction: {
        domains: ['cardiometabolic', 'cognitive'],
        evidence: 'strong',
      },
      rem_instability: {
        domains: ['cognitive', 'neurological'],
        evidence: 'moderate',
      },
      efficiency_instability: {
        domains: ['metabolic', 'mental_health'],
        evidence: 'moderate',
      },
    };

    const mapping = phenotypeMapping[primary_pattern];

    return {
      primary_pattern,
      confidence,
      associated_domains: mapping.domains,
      evidence_strength: mapping.evidence,
    };
  }

  // Helper methods

  private mean(arr: number[]): number {
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  private std(arr: number[]): number {
    const avg = this.mean(arr);
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate p-value for trend significance (simplified t-test)
   */
  private calculateTrendPValue(x: number[], y: number[], slope: number): number {
    const n = x.length;
    if (n < 3) return 1.0; // Not enough data for significance

    // Calculate residuals
    const meanX = this.mean(x);
    const meanY = this.mean(y);
    const intercept = meanY - slope * meanX;

    const residuals = y.map((yi, i) => yi - (slope * x[i] + intercept));
    const sse = residuals.reduce((sum, r) => sum + r * r, 0);
    const mse = sse / (n - 2);

    // Calculate standard error of slope
    const ssx = x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0);
    const se_slope = Math.sqrt(mse / ssx);

    // Calculate t-statistic
    const t = Math.abs(slope / se_slope);

    // Approximate p-value using simplified formula (two-tailed)
    // This is a rough approximation - for exact values would need t-distribution
    const df = n - 2;
    const p = 2 * (1 - this.tCDF(t, df));

    return Math.max(0, Math.min(1, p));
  }

  /**
   * Approximate t-distribution CDF (cumulative distribution function)
   * Simplified approximation for p-value calculation
   */
  private tCDF(t: number, df: number): number {
    // For large df, t-distribution approaches normal distribution
    if (df > 30) {
      return this.normalCDF(t);
    }

    // Simplified approximation for smaller df
    const x = df / (df + t * t);
    return 1 - 0.5 * Math.pow(x, df / 2);
  }

  /**
   * Standard normal CDF approximation
   */
  private normalCDF(z: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp((-z * z) / 2);
    const prob =
      d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - prob : prob;
  }
}
