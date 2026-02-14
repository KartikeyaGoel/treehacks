"""
Pydantic models for strict typing and validation
"""

from datetime import date, datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, field_validator


class SleepRecord(BaseModel):
    """Individual sleep record from wearable device"""
    date: date
    total_sleep_min: int = Field(ge=0, le=720, description="Total sleep time in minutes")
    sleep_efficiency: float = Field(ge=0, le=100, description="Sleep efficiency percentage")
    deep_sleep_min: int = Field(ge=0, le=360, description="Deep sleep duration in minutes")
    rem_sleep_min: int = Field(ge=0, le=360, description="REM sleep duration in minutes")
    awakenings: int = Field(ge=0, le=50, description="Number of awakenings")

    @field_validator('date', mode='before')
    def parse_date(cls, v):
        if isinstance(v, str):
            return datetime.strptime(v, '%Y-%m-%d').date()
        return v


class BaselineMetrics(BaseModel):
    """30-day baseline statistics"""
    mean_total_sleep: float
    std_total_sleep: float
    mean_efficiency: float
    std_efficiency: float
    mean_deep: float
    std_deep: float
    mean_rem: float
    std_rem: float
    mean_awakenings: float
    std_awakenings: float
    rmssd: float = Field(description="Root mean square of successive differences")


class ZScores(BaseModel):
    """Z-score deviations from baseline"""
    efficiency: float
    deep_sleep: float
    rem_sleep: float
    awakenings: float

    def get_interpretation(self, metric: str) -> str:
        """Interpret z-score magnitude"""
        z = getattr(self, metric)
        abs_z = abs(z)
        if abs_z < 1:
            return "Within normal variation"
        elif abs_z < 2:
            return "Moderate deviation"
        else:
            return "Significant deviation"


class TrendAnalysis(BaseModel):
    """Linear trend detection"""
    efficiency_slope: float
    deep_slope: float
    rem_slope: float
    awakenings_slope: float
    efficiency_pvalue: float
    has_significant_trend: bool


class SHDIScore(BaseModel):
    """Sleep Health Deviation Index composite score"""
    score: float = Field(ge=0, le=100)
    category: Literal["stable", "moderate_drift", "significant_drift"]
    confidence: float = Field(ge=0, le=1)

    @field_validator('category', mode='before')
    def determine_category(cls, v, info):
        if v:
            return v
        score = info.data.get('score', 0)
        if score < 30:
            return "stable"
        elif score < 60:
            return "moderate_drift"
        else:
            return "significant_drift"


class RiskPhenotype(BaseModel):
    """Risk phenotype classification"""
    primary_pattern: Literal[
        "fragmentation_dominant",
        "deep_sleep_reduction",
        "rem_instability",
        "efficiency_instability"
    ]
    confidence: float = Field(ge=0, le=1)
    associated_domains: List[str] = Field(
        description="Risk domains: cardiovascular, metabolic, cognitive, etc."
    )
    evidence_strength: Literal["strong", "moderate", "emerging"]


class SleepAnalysisResult(BaseModel):
    """Complete analysis result"""
    days_analyzed: int
    start_date: date
    end_date: date
    baseline: BaselineMetrics
    z_scores: ZScores
    trends: TrendAnalysis
    svi: float = Field(description="Sleep Variability Index (0-100)")
    shdi: SHDIScore
    phenotype: RiskPhenotype


class ValidationResult(BaseModel):
    """Data validation result"""
    valid: bool
    error_message: Optional[str] = None
    num_records: int = 0
    date_range: Optional[tuple] = None


class ResearchEvidence(BaseModel):
    """Research evidence from literature"""
    title: str
    authors: str
    journal: str
    year: int
    study_type: str
    sample_size: int
    effect_size_description: str
    hazard_ratio: Optional[float] = None
    confidence_interval: Optional[str] = None
    key_finding: str
    evidence_strength: Literal["strong", "moderate", "emerging"]
    pattern_description: str
    health_domain: str
