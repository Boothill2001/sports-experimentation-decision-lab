from __future__ import annotations

from sports_exp.analysis import analyze_experiment
from sports_exp.generator import generate_experiment


def report(scenario: str):
    return analyze_experiment(generate_experiment(scenario, users=10_000), scenario)


def test_clean_experiment_is_shippable() -> None:
    result = report("clean")
    assert result.decision == "SHIP"
    assert result.primary.ci_low > 0
    assert not result.srm_detected
    assert not any(guardrail.breached for guardrail in result.guardrails)


def test_srm_invalidates_result() -> None:
    result = report("srm")
    assert result.decision == "INVALID"
    assert result.srm_p_value < 0.001


def test_guardrail_can_veto_conversion_win() -> None:
    result = report("guardrail")
    assert result.primary.absolute_lift > 0
    assert any(guardrail.breached for guardrail in result.guardrails)
    assert result.decision == "HOLD"


def test_novelty_requires_more_time() -> None:
    result = report("novelty")
    assert result.early_lift > result.late_lift
    assert result.novelty_detected
    assert result.decision == "WAIT"


def test_simpson_paradox_is_detected() -> None:
    result = report("simpson")
    assert result.primary.absolute_lift < 0
    assert all(segment.absolute_lift > 0 for segment in result.segments)
    assert result.simpson_detected
    assert result.decision == "INVALID"


def test_exposure_filter_changes_estimate() -> None:
    result = report("exposure_bias")
    assert abs(result.exposed_only_lift - result.primary.absolute_lift) > 0.005
    assert result.decision == "INVALID"


def test_cuped_reduces_variance() -> None:
    result = report("clean")
    assert result.cuped_variance_reduction > 0.5

