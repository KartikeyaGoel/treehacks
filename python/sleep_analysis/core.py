"""
Core sleep analysis engine with scientifically rigorous statistical methods.

Methodology aligned with:
- Nature Medicine: "A multimodal sleep foundation model for disease prediction"
  (SleepFM, Stanford; 2026) — sleep staging, variability, longitudinal deviation.
- Z-scores use SEM (std/√n) for the recent window; confidence from sample size
  and phenotype separation (effect size).
"""

import pandas as pd
import numpy as np
from scipy import stats
from statsmodels.regression.linear_model import OLS
from statsmodels.tools import add_constant
from typing import List
from .models import (
    SleepRecord,
    BaselineMetrics,
    ZScores,
    TrendAnalysis,
    SHDIScore,
    RiskPhenotype,
    SleepAnalysisResult
)


class SleepAnalyzer:
    """
    Evidence-based sleep deviation detection system.

    Implements statistical analysis of consumer wearable sleep data to detect
    longitudinal deviations from personal baseline patterns.
    """

    # Phenotype classification thresholds
    FRAGMENTATION_THRESHOLD = 1.5  # z-score for awakenings
    DEEP_REDUCTION_THRESHOLD = -1.5  # z-score for deep sleep
    REM_INSTABILITY_THRESHOLD = 1.5  # z-score for REM variability
    EFFICIENCY_DECLINE_THRESHOLD = -0.02  # slope per day

    # SHDI weights (sum to 1.0)
    WEIGHTS = {
        'fragmentation': 0.30,
        'deep_sleep': 0.25,
        'rem_sleep': 0.20,
        'efficiency': 0.15,
        'variability': 0.10
    }

    def __init__(self):
        pass

    def analyze(self, records: List[SleepRecord]) -> SleepAnalysisResult:
        """
        Run complete sleep analysis pipeline

        Args:
            records: List of SleepRecord objects (minimum 14 days)

        Returns:
            SleepAnalysisResult with complete analysis
        """
        # Convert to DataFrame for analysis
        df = pd.DataFrame([r.model_dump() for r in records])
        df = df.sort_values('date').reset_index(drop=True)

        # Compute baseline statistics (30-day window)
        baseline = self.compute_baseline_stats(df)
        baseline_window_size = min(30, len(df))

        # Calculate z-scores for recent data (last 7 days)
        recent_df = df.tail(7)
        z_scores = self.calculate_z_scores(recent_df, baseline)

        # Detect trends
        trends = self.detect_trends(df)

        # Compute Sleep Variability Index
        svi = self.compute_sleep_variability_index(df)

        # Calculate SHDI (confidence from sample size)
        shdi = self.calculate_shdi(
            z_scores, trends, svi,
            n_baseline_days=baseline_window_size,
            n_recent_days=len(recent_df)
        )

        # Classify phenotype
        phenotype = self.classify_phenotype(z_scores, trends, svi)

        return SleepAnalysisResult(
            days_analyzed=len(df),
            start_date=df['date'].iloc[0],
            end_date=df['date'].iloc[-1],
            baseline=baseline,
            z_scores=z_scores,
            trends=trends,
            svi=svi,
            shdi=shdi,
            phenotype=phenotype
        )

    def compute_baseline_stats(self, df: pd.DataFrame) -> BaselineMetrics:
        """
        Compute 30-day baseline statistics

        Args:
            df: DataFrame with sleep records

        Returns:
            BaselineMetrics with mean, std, and RMSSD
        """
        if len(df) < 14:
            raise ValueError("Insufficient data: minimum 14 days required")

        # Use last 30 days for baseline (or all data if less)
        baseline_window = df.tail(min(30, len(df)))

        # Calculate means and standard deviations
        metrics = {
            'mean_total_sleep': float(baseline_window['total_sleep_min'].mean()),
            'std_total_sleep': float(baseline_window['total_sleep_min'].std()),
            'mean_efficiency': float(baseline_window['sleep_efficiency'].mean()),
            'std_efficiency': float(baseline_window['sleep_efficiency'].std()),
            'mean_deep': float(baseline_window['deep_sleep_min'].mean()),
            'std_deep': float(baseline_window['deep_sleep_min'].std()),
            'mean_rem': float(baseline_window['rem_sleep_min'].mean()),
            'std_rem': float(baseline_window['rem_sleep_min'].std()),
            'mean_awakenings': float(baseline_window['awakenings'].mean()),
            'std_awakenings': float(baseline_window['awakenings'].std())
        }

        # Calculate RMSSD (root mean square of successive differences) for total sleep
        sleep_times = baseline_window['total_sleep_min'].values
        successive_diffs = np.diff(sleep_times)
        metrics['rmssd'] = float(np.sqrt(np.mean(successive_diffs ** 2)))

        return BaselineMetrics(**metrics)

    def calculate_z_scores(
        self,
        current_df: pd.DataFrame,
        baseline: BaselineMetrics
    ) -> ZScores:
        """
        Calculate z-score deviations using SEM (std/sqrt(n)) for the recent window
        so that "7-day mean vs 30-day baseline" is tested correctly (standard error
        of the mean for small-sample inference).
        """
        n = len(current_df)
        if n == 0:
            return ZScores(efficiency=0.0, deep_sleep=0.0, rem_sleep=0.0, awakenings=0.0)

        recent_means = {
            'efficiency': current_df['sleep_efficiency'].mean(),
            'deep': current_df['deep_sleep_min'].mean(),
            'rem': current_df['rem_sleep_min'].mean(),
            'awakenings': current_df['awakenings'].mean()
        }

        eps = 1e-6

        def sem(std: float, mean: float) -> float:
            return max(std / np.sqrt(n), eps * (abs(mean) + 1), eps)

        z_efficiency = (recent_means['efficiency'] - baseline.mean_efficiency) / sem(
            baseline.std_efficiency, baseline.mean_efficiency
        )
        z_deep = (recent_means['deep'] - baseline.mean_deep) / sem(baseline.std_deep, baseline.mean_deep)
        z_rem = (recent_means['rem'] - baseline.mean_rem) / sem(baseline.std_rem, baseline.mean_rem)
        z_awakenings = (recent_means['awakenings'] - baseline.mean_awakenings) / sem(
            baseline.std_awakenings, baseline.mean_awakenings
        )

        return ZScores(
            efficiency=float(z_efficiency),
            deep_sleep=float(z_deep),
            rem_sleep=float(z_rem),
            awakenings=float(z_awakenings)
        )

    def detect_trends(self, df: pd.DataFrame) -> TrendAnalysis:
        """
        Detect linear trends using regression

        Args:
            df: Full sleep dataset

        Returns:
            TrendAnalysis with slopes and significance
        """
        # Use last 30 days for trend detection
        trend_window = df.tail(min(30, len(df))).copy()
        trend_window['day_index'] = range(len(trend_window))

        # Fit linear regression for each metric
        X = add_constant(trend_window['day_index'])

        # Efficiency trend
        eff_model = OLS(trend_window['sleep_efficiency'], X).fit()
        eff_slope = float(eff_model.params['day_index'])
        eff_pvalue = float(eff_model.pvalues['day_index'])

        # Deep sleep trend
        deep_model = OLS(trend_window['deep_sleep_min'], X).fit()
        deep_slope = float(deep_model.params['day_index'])

        # REM trend
        rem_model = OLS(trend_window['rem_sleep_min'], X).fit()
        rem_slope = float(rem_model.params['day_index'])

        # Awakenings trend
        awake_model = OLS(trend_window['awakenings'], X).fit()
        awake_slope = float(awake_model.params['day_index'])

        # Determine if there's a significant declining trend
        has_significant_trend = (eff_pvalue < 0.05 and eff_slope < self.EFFICIENCY_DECLINE_THRESHOLD)

        return TrendAnalysis(
            efficiency_slope=eff_slope,
            deep_slope=deep_slope,
            rem_slope=rem_slope,
            awakenings_slope=awake_slope,
            efficiency_pvalue=eff_pvalue,
            has_significant_trend=has_significant_trend
        )

    def compute_sleep_variability_index(self, df: pd.DataFrame) -> float:
        """
        Compute Sleep Variability Index (SVI)

        Aggregate variability across metrics, normalized to 0-100

        Args:
            df: Sleep data

        Returns:
            SVI score (0-100, higher = more variable)
        """
        # Calculate coefficient of variation for each metric
        cv_efficiency = df['sleep_efficiency'].std() / (df['sleep_efficiency'].mean() + 1e-6)
        cv_deep = df['deep_sleep_min'].std() / (df['deep_sleep_min'].mean() + 1e-6)
        cv_rem = df['rem_sleep_min'].std() / (df['rem_sleep_min'].mean() + 1e-6)
        cv_awakenings = df['awakenings'].std() / (df['awakenings'].mean() + 1e-6)

        # Calculate RMSSD for total sleep time (normalized)
        sleep_times = df['total_sleep_min'].values
        successive_diffs = np.diff(sleep_times)
        rmssd_normalized = np.sqrt(np.mean(successive_diffs ** 2)) / (sleep_times.mean() + 1e-6)

        # Aggregate (weighted average)
        svi_raw = (
            0.25 * cv_efficiency +
            0.25 * cv_deep +
            0.20 * cv_rem +
            0.15 * cv_awakenings +
            0.15 * rmssd_normalized
        )

        # Normalize to 0-100 percentile
        # Typical CV values range from 0-0.3, RMSSD from 0-0.2
        svi_normalized = min(100, svi_raw * 200)

        return float(svi_normalized)

    def calculate_shdi(
        self,
        z_scores: ZScores,
        trends: TrendAnalysis,
        svi: float,
        n_baseline_days: int = 30,
        n_recent_days: int = 7
    ) -> SHDIScore:
        """
        Calculate Sleep Health Deviation Index (SHDI).
        Confidence is based on sample size (baseline and recent window).
        """
        frag_component = max(0, z_scores.awakenings) * 10
        deep_component = max(0, -z_scores.deep_sleep) * 10
        rem_component = abs(z_scores.rem_sleep) * 10
        eff_component = max(0, -trends.efficiency_slope * 50)
        var_component = svi / 10

        shdi_raw = (
            self.WEIGHTS['fragmentation'] * frag_component
            + self.WEIGHTS['deep_sleep'] * deep_component
            + self.WEIGHTS['rem_sleep'] * rem_component
            + self.WEIGHTS['efficiency'] * eff_component
            + self.WEIGHTS['variability'] * var_component
        )
        shdi_score = min(100, shdi_raw)

        if shdi_score < 30:
            category = "stable"
        elif shdi_score < 60:
            category = "moderate_drift"
        else:
            category = "significant_drift"

        baseline_factor = min(1.0, n_baseline_days / 30)
        recent_factor = min(1.0, n_recent_days / 7)
        confidence = min(1.0, 0.35 + 0.35 * baseline_factor + 0.3 * recent_factor)

        return SHDIScore(
            score=float(shdi_score),
            category=category,
            confidence=float(confidence)
        )

    def classify_phenotype(
        self,
        z_scores: ZScores,
        trends: TrendAnalysis,
        svi: float
    ) -> RiskPhenotype:
        """
        Classify sleep pattern into risk phenotypes

        Phenotypes:
        1. Fragmentation-Dominant: High awakenings
        2. Deep Sleep Reduction: Low deep sleep
        3. REM Instability: High REM variability
        4. Efficiency Instability: Declining efficiency

        Args:
            z_scores: Z-score deviations
            trends: Trend analysis
            svi: Sleep Variability Index

        Returns:
            RiskPhenotype classification
        """
        scores = {
            'fragmentation_dominant': max(0, z_scores.awakenings),
            'deep_sleep_reduction': max(0, -z_scores.deep_sleep),
            'rem_instability': abs(z_scores.rem_sleep) + (svi / 50),
            'efficiency_instability': max(0, -trends.efficiency_slope * 30) + (svi / 50)
        }

        primary_pattern = max(scores, key=scores.get)
        sorted_keys = sorted(scores, key=scores.get, reverse=True)
        score_primary = scores[sorted_keys[0]]
        score_second = scores[sorted_keys[1]] if len(sorted_keys) > 1 else 0
        separation = max(0, score_primary - score_second)
        confidence = min(1.0, max(0.2, 0.2 + 0.8 * min(1, separation / 2)))

        # Map to associated health domains and evidence strength
        phenotype_mapping = {
            'fragmentation_dominant': {
                'domains': ['cardiovascular', 'metabolic'],
                'evidence': 'strong'
            },
            'deep_sleep_reduction': {
                'domains': ['cardiometabolic', 'cognitive'],
                'evidence': 'strong'
            },
            'rem_instability': {
                'domains': ['cognitive', 'neurological'],
                'evidence': 'moderate'
            },
            'efficiency_instability': {
                'domains': ['metabolic', 'mental_health'],
                'evidence': 'moderate'
            }
        }

        mapping = phenotype_mapping[primary_pattern]

        return RiskPhenotype(
            primary_pattern=primary_pattern,
            confidence=float(confidence),
            associated_domains=mapping['domains'],
            evidence_strength=mapping['evidence']
        )
