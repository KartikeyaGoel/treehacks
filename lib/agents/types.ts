/**
 * Type definitions for multi-agent orchestration system
 */

export interface SleepAnalysisResult {
  days_analyzed: number;
  start_date: string;
  end_date: string;
  baseline: BaselineMetrics;
  z_scores: ZScores;
  trends: TrendAnalysis;
  svi: number;
  shdi: SHDIScore;
  phenotype: RiskPhenotype;
}

export interface BaselineMetrics {
  mean_total_sleep: number;
  std_total_sleep: number;
  mean_efficiency: number;
  std_efficiency: number;
  mean_deep: number;
  std_deep: number;
  mean_rem: number;
  std_rem: number;
  mean_awakenings: number;
  std_awakenings: number;
  rmssd: number;
}

export interface ZScores {
  efficiency: number;
  deep_sleep: number;
  rem_sleep: number;
  awakenings: number;
}

export interface TrendAnalysis {
  efficiency_slope: number;
  deep_slope: number;
  rem_slope: number;
  awakenings_slope: number;
  efficiency_pvalue: number;
  has_significant_trend: boolean;
}

export interface SHDIScore {
  score: number;
  category: 'stable' | 'moderate_drift' | 'significant_drift';
  confidence: number;
}

export interface RiskPhenotype {
  primary_pattern: 'fragmentation_dominant' | 'deep_sleep_reduction' | 'rem_instability' | 'efficiency_instability';
  confidence: number;
  associated_domains: string[];
  evidence_strength: 'strong' | 'moderate' | 'emerging';
}

export interface PubMedResult {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: number;
  abstract: string;
  doi?: string;
}

export interface O1ReasoningResult {
  ranked_risk_domains: string[];
  confidence_levels: Record<string, number>;
  preventive_screening: string[];
  reasoning_trace: string;
}

export interface GuidelineData {
  statistics: Array<{
    metric: string;
    value: string;
    source: string;
  }>;
  guidelines: Array<{
    title: string;
    recommendation: string;
    organization: string;
  }>;
  disparities: Array<{
    population: string;
    finding: string;
  }>;
}

export interface ConsensusResult {
  consensus: string;
  citations: Array<{
    url: string;
    title: string;
  }>;
}

export interface ResearchEvidence {
  title: string;
  authors: string;
  journal: string;
  year: number;
  study_type: string;
  sample_size: number;
  effect_size_description: string;
  hazard_ratio?: number;
  confidence_interval?: string;
  key_finding: string;
  evidence_strength: 'strong' | 'moderate' | 'emerging';
  pattern_description: string;
  health_domain: string;
}

export interface DualReport {
  patient_report: string;
  clinical_report: string;
  evidence: ResearchEvidence[];
}

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: any;
}

export interface ConsistencyScore {
  consistent: boolean;
  reason?: string;
  action?: 'refine_query' | 'broaden_query' | 'proceed';
}
