from __future__ import annotations

import math

import numpy as np
import pandas as pd

from sports_exp.config import SCENARIOS
from sports_exp.generator import ExperimentData, joined_frame
from sports_exp.models import (
    ExperimentReport,
    GuardrailResult,
    MetricResult,
    SegmentResult,
)


def _two_proportion(
    control_success: int,
    control_n: int,
    treatment_success: int,
    treatment_n: int,
) -> MetricResult:
    control_rate = control_success / control_n
    treatment_rate = treatment_success / treatment_n
    lift = treatment_rate - control_rate
    pooled = (control_success + treatment_success) / (control_n + treatment_n)
    pooled_se = math.sqrt(max(pooled * (1 - pooled) * (1 / control_n + 1 / treatment_n), 1e-12))
    z_score = lift / pooled_se
    p_value = math.erfc(abs(z_score) / math.sqrt(2))
    ci_se = math.sqrt(
        control_rate * (1 - control_rate) / control_n
        + treatment_rate * (1 - treatment_rate) / treatment_n
    )
    relative = lift / control_rate if control_rate else 0
    return MetricResult(
        control_n=control_n,
        treatment_n=treatment_n,
        control_rate=round(control_rate, 6),
        treatment_rate=round(treatment_rate, 6),
        absolute_lift=round(lift, 6),
        relative_lift=round(relative, 6),
        ci_low=round(lift - 1.96 * ci_se, 6),
        ci_high=round(lift + 1.96 * ci_se, 6),
        p_value=round(p_value, 8),
    )


def _metric(frame: pd.DataFrame, column: str) -> MetricResult:
    control = frame.loc[frame["variant"] == "control", column]
    treatment = frame.loc[frame["variant"] == "treatment", column]
    return _two_proportion(
        int(control.sum()),
        len(control),
        int(treatment.sum()),
        len(treatment),
    )


def _srm_p_value(frame: pd.DataFrame) -> float:
    counts = frame["variant"].value_counts()
    total = len(frame)
    expected = total / 2
    chi_square = sum(
        (counts.get(variant, 0) - expected) ** 2 / expected
        for variant in ("control", "treatment")
    )
    return math.erfc(math.sqrt(chi_square / 2))


def _cuped_variance_reduction(frame: pd.DataFrame) -> float:
    pre = frame["pre_watch_minutes"].to_numpy()
    post = frame["watch_minutes_7d"].to_numpy()
    theta = np.cov(pre, post, ddof=1)[0, 1] / np.var(pre, ddof=1)
    adjusted = post - theta * (pre - pre.mean())
    return max(0.0, 1 - float(np.var(adjusted, ddof=1) / np.var(post, ddof=1)))


def _period_lift(frame: pd.DataFrame, start: int, end: int) -> float:
    period = frame.loc[frame["assignment_day"].between(start, end)]
    if period.empty or period["variant"].nunique() < 2:
        return 0.0
    return float(
        period.loc[period["variant"] == "treatment", "subscribed_7d"].mean()
        - period.loc[period["variant"] == "control", "subscribed_7d"].mean()
    )


def analyze_experiment(data: ExperimentData, scenario: str) -> ExperimentReport:
    frame = joined_frame(data)
    primary = _metric(frame, "subscribed_7d")
    srm_p = _srm_p_value(frame)
    srm_detected = srm_p < 0.001

    guardrails = []
    for column, label, tolerance in (
        ("crash_7d", "Crash rate", 0.005),
        ("cancelled_7d", "Cancellation rate", 0.004),
    ):
        metric = _metric(frame, column)
        guardrails.append(
            GuardrailResult(
                metric=label,
                control_rate=metric.control_rate,
                treatment_rate=metric.treatment_rate,
                absolute_change=metric.absolute_lift,
                p_value=metric.p_value,
                breached=metric.absolute_lift > tolerance and metric.p_value < 0.05,
            )
        )

    segments = []
    segment_lifts = []
    for platform, segment in frame.groupby("platform", observed=True):
        metric = _metric(segment, "subscribed_7d")
        segment_lifts.append(metric.absolute_lift)
        segments.append(
            SegmentResult(
                segment=str(platform),
                control_rate=metric.control_rate,
                treatment_rate=metric.treatment_rate,
                absolute_lift=metric.absolute_lift,
                users=len(segment),
            )
        )
    simpson_detected = bool(
        segment_lifts
        and all(lift > 0 for lift in segment_lifts)
        and primary.absolute_lift < 0
    )

    max_day = int(frame["assignment_day"].max())
    early_lift = _period_lift(frame, 0, min(6, max_day))
    late_lift = _period_lift(frame, max(0, max_day - 6), max_day)
    novelty_detected = early_lift - late_lift > 0.012

    exposed = frame.loc[frame["exposed"] == 1]
    exposed_lift = (
        float(
            exposed.loc[exposed["variant"] == "treatment", "subscribed_7d"].mean()
            - exposed.loc[exposed["variant"] == "control", "subscribed_7d"].mean()
        )
        if exposed["variant"].nunique() == 2
        else 0.0
    )

    breached = any(guardrail.breached for guardrail in guardrails)
    if srm_detected:
        decision = "INVALID"
        rationale = (
            "Assignment is inconsistent with the planned 50/50 split; "
            "fix randomization first."
        )
    elif breached:
        decision = "HOLD"
        rationale = "Primary conversion improved, but a statistically credible guardrail regressed."
    elif simpson_detected:
        decision = "INVALID"
        rationale = (
            "Aggregate direction conflicts with both platform-level effects; "
            "audit allocation mix."
        )
    elif novelty_detected:
        decision = "WAIT"
        rationale = (
            "The early lift decays materially in later cohorts; "
            "extend the observation window."
        )
    elif primary.p_value < 0.05 and primary.ci_low > 0:
        decision = "SHIP"
        rationale = (
            "Primary lift is positive with a 95% interval above zero and healthy guardrails."
        )
    else:
        decision = "INCONCLUSIVE"
        rationale = "The current sample does not establish a durable positive primary effect."

    if scenario == "exposure_bias" and abs(exposed_lift - primary.absolute_lift) > 0.005:
        decision = "INVALID"
        rationale = (
            "Exposed-only analysis changes the estimate materially; preserve intent-to-treat."
        )

    return ExperimentReport(
        scenario=scenario,
        title=SCENARIOS[scenario]["title"],
        assigned_users=len(frame),
        exposed_users=int(frame["exposed"].sum()),
        exposure_rate=round(float(frame["exposed"].mean()), 6),
        srm_p_value=round(srm_p, 10),
        srm_detected=srm_detected,
        primary=primary,
        guardrails=guardrails,
        segments=segments,
        cuped_variance_reduction=round(_cuped_variance_reduction(frame), 6),
        early_lift=round(early_lift, 6),
        late_lift=round(late_lift, 6),
        novelty_detected=novelty_detected,
        simpson_detected=simpson_detected,
        exposed_only_lift=round(exposed_lift, 6),
        decision=decision,
        rationale=rationale,
        limitation=(
            "Deterministic synthetic portfolio data demonstrates the method, not a production "
            "effect or Unity Sport result."
        ),
    )
