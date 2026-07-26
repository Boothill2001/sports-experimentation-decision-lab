from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

import numpy as np
import pandas as pd

from sports_exp.config import EXPERIMENT_ID, PROFILES, SCENARIOS, SEED


@dataclass(frozen=True)
class ExperimentData:
    users: pd.DataFrame
    assignments: pd.DataFrame
    exposures: pd.DataFrame
    outcomes: pd.DataFrame


def _sigmoid(value: np.ndarray) -> np.ndarray:
    return 1 / (1 + np.exp(-value))


def generate_experiment(
    scenario: str = "clean",
    profile: str = "smoke",
    seed: int = SEED,
    users: int | None = None,
) -> ExperimentData:
    if scenario not in SCENARIOS:
        raise ValueError(f"Unknown scenario: {scenario}")
    if profile not in PROFILES:
        raise ValueError(f"Unknown profile: {profile}")

    size = users or PROFILES[profile]["users"]
    days = PROFILES[profile]["days"]
    rng = np.random.default_rng(seed)
    user_ids = np.arange(1, size + 1)
    platforms = rng.choice(["android", "ios"], size=size, p=[0.58, 0.42])
    channels = rng.choice(
        ["organic", "paid_search", "partner", "social"],
        size=size,
        p=[0.42, 0.24, 0.18, 0.16],
    )
    countries = rng.choice(["VN", "TH", "ID", "PH"], size=size, p=[0.42, 0.22, 0.2, 0.16])
    pre_watch = np.clip(rng.lognormal(mean=3.6, sigma=0.75, size=size), 0, 500)
    assignment_day = rng.integers(0, days, size=size)
    base_date = pd.Timestamp("2026-06-01", tz="UTC")
    assigned_at = base_date + pd.to_timedelta(assignment_day, unit="D")

    treatment_probability = np.full(size, 0.5)
    if scenario == "srm":
        treatment_probability[:] = 0.58
    elif scenario == "simpson":
        # Keep the global split near 50/50 while intentionally changing platform mix.
        treatment_probability = np.where(platforms == "ios", 0.2, 0.72)
    is_treatment = rng.random(size) < treatment_probability
    variants = np.where(is_treatment, "treatment", "control")

    intent = (np.log1p(pre_watch) - np.log1p(pre_watch).mean()) / np.log1p(pre_watch).std()
    exposure_probability = 0.84 + 0.02 * is_treatment
    if scenario == "exposure_bias":
        exposure_probability = np.where(
            is_treatment,
            _sigmoid(-0.3 + 2.0 * intent),
            0.85,
        )
    exposed = rng.random(size) < exposure_probability
    exposure_delay = pd.to_timedelta(rng.integers(5, 3_600, size=size), unit="s")
    exposed_at = assigned_at + exposure_delay

    baseline_conversion = (
        0.055
        + np.where(platforms == "ios", 0.07, 0.0)
        + np.where(channels == "organic", 0.018, 0.0)
        + 0.018 * intent
    )
    treatment_effect = np.zeros(size)
    if scenario in {"clean", "srm", "guardrail"}:
        treatment_effect[:] = 0.022
    elif scenario == "novelty":
        treatment_effect = 0.034 * np.exp(-assignment_day / 5.0) - 0.002
    elif scenario == "simpson":
        treatment_effect[:] = 0.030
    conversion_probability = np.clip(
        baseline_conversion + is_treatment * treatment_effect,
        0.002,
        0.45,
    )
    subscribed = rng.random(size) < conversion_probability

    crash_probability = np.full(size, 0.012)
    if scenario == "guardrail":
        crash_probability += is_treatment * 0.018
    else:
        crash_probability += is_treatment * 0.0005
    crashed = rng.random(size) < crash_probability

    cancellation_probability = 0.035 + is_treatment * 0.001
    cancelled = subscribed & (rng.random(size) < cancellation_probability)
    post_watch = np.clip(
        0.72 * pre_watch + rng.normal(24, 19, size=size) + is_treatment * 4.0,
        0,
        700,
    )
    revenue = np.where(
        subscribed,
        np.clip(rng.normal(10.5, 1.8, size=size), 2, 25),
        0,
    )
    revenue = np.where(cancelled, revenue * 0.25, revenue)

    users_frame = pd.DataFrame(
        {
            "user_id": user_ids,
            "platform": platforms,
            "acquisition_channel": channels,
            "country": countries,
            "pre_watch_minutes": pre_watch.round(3),
        }
    )
    assignments = pd.DataFrame(
        {
            "experiment_id": EXPERIMENT_ID,
            "user_id": user_ids,
            "variant": variants,
            "assigned_at": assigned_at,
            "assignment_day": assignment_day,
        }
    )
    exposures = pd.DataFrame(
        {
            "experiment_id": EXPERIMENT_ID,
            "user_id": user_ids[exposed],
            "variant_logged": variants[exposed],
            "exposed_at": exposed_at[exposed],
            "app_version": np.where(platforms[exposed] == "ios", "8.4.0", "8.4.1"),
        }
    )
    outcomes = pd.DataFrame(
        {
            "experiment_id": EXPERIMENT_ID,
            "user_id": user_ids,
            "subscribed_7d": subscribed.astype(int),
            "watch_minutes_7d": post_watch.round(3),
            "crash_7d": crashed.astype(int),
            "cancelled_7d": cancelled.astype(int),
            "revenue_30d": revenue.round(2),
        }
    )
    for frame in (users_frame, assignments, exposures, outcomes):
        frame.attrs["scenario"] = scenario
        frame.attrs["seed"] = seed
        frame.attrs["generated_at"] = datetime.now(UTC).isoformat()
    return ExperimentData(users_frame, assignments, exposures, outcomes)


def joined_frame(data: ExperimentData) -> pd.DataFrame:
    exposed_users = data.exposures[["user_id"]].assign(exposed=1)
    return (
        data.users.merge(data.assignments, on="user_id", validate="one_to_one")
        .merge(data.outcomes, on=["experiment_id", "user_id"], validate="one_to_one")
        .merge(exposed_users, on="user_id", how="left", validate="one_to_one")
        .assign(exposed=lambda frame: frame["exposed"].fillna(0).astype(int))
    )
