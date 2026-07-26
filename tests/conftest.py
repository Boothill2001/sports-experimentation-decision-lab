from __future__ import annotations

import pytest

from sports_exp.generator import ExperimentData, generate_experiment


@pytest.fixture(scope="session")
def clean_data() -> ExperimentData:
    return generate_experiment("clean", users=10_000)

