from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class MetricResult(BaseModel):
    control_n: int
    treatment_n: int
    control_rate: float
    treatment_rate: float
    absolute_lift: float
    relative_lift: float
    ci_low: float
    ci_high: float
    p_value: float


class GuardrailResult(BaseModel):
    metric: str
    control_rate: float
    treatment_rate: float
    absolute_change: float
    p_value: float
    breached: bool


class SegmentResult(BaseModel):
    segment: str
    control_rate: float
    treatment_rate: float
    absolute_lift: float
    users: int


class ExperimentReport(BaseModel):
    scenario: str
    title: str
    assigned_users: int
    exposed_users: int
    exposure_rate: float
    srm_p_value: float
    srm_detected: bool
    primary: MetricResult
    guardrails: list[GuardrailResult]
    segments: list[SegmentResult]
    cuped_variance_reduction: float = Field(ge=0, le=1)
    early_lift: float
    late_lift: float
    novelty_detected: bool
    simpson_detected: bool
    exposed_only_lift: float
    decision: Literal["SHIP", "HOLD", "WAIT", "INVALID", "INCONCLUSIVE"]
    rationale: str
    limitation: str
