from __future__ import annotations

import pandas as pd

from sports_exp.generator import generate_experiment, joined_frame
from sports_exp.store import validate_relationships


def test_generation_is_deterministic() -> None:
    first = generate_experiment("clean", users=1_000, seed=42)
    second = generate_experiment("clean", users=1_000, seed=42)
    pd.testing.assert_frame_equal(first.users, second.users)
    pd.testing.assert_frame_equal(first.assignments, second.assignments)
    pd.testing.assert_frame_equal(first.outcomes, second.outcomes)


def test_relationships_are_valid(clean_data) -> None:
    assert validate_relationships(clean_data) == []


def test_join_preserves_assignment_population(clean_data) -> None:
    frame = joined_frame(clean_data)
    assert len(frame) == len(clean_data.users)
    assert frame["user_id"].is_unique
    assert frame["exposed"].isin([0, 1]).all()


def test_invalid_inputs_raise() -> None:
    try:
        generate_experiment("missing")
    except ValueError as error:
        assert "Unknown scenario" in str(error)
    else:
        raise AssertionError("unknown scenario should fail")

