from __future__ import annotations

from pathlib import Path

import duckdb

from sports_exp.config import DATA_DIR, DB_PATH, ensure_directories
from sports_exp.generator import ExperimentData


def persist_experiment(
    data: ExperimentData,
    scenario: str,
    db_path: Path = DB_PATH,
) -> Path:
    ensure_directories()
    scenario_dir = DATA_DIR / scenario
    scenario_dir.mkdir(parents=True, exist_ok=True)
    frames = {
        "users": data.users,
        "assignments": data.assignments,
        "exposures": data.exposures,
        "outcomes": data.outcomes,
    }
    for name, frame in frames.items():
        frame.to_parquet(scenario_dir / f"{name}.parquet", index=False)

    with duckdb.connect(str(db_path)) as connection:
        connection.execute("CREATE SCHEMA IF NOT EXISTS experiment_lab")
        for name, frame in frames.items():
            relation = f"{scenario}_{name}"
            connection.register("_frame", frame)
            connection.execute(
                f"CREATE OR REPLACE TABLE experiment_lab.{relation} AS SELECT * FROM _frame"
            )
            connection.unregister("_frame")
    return db_path


def validate_relationships(data: ExperimentData) -> list[str]:
    errors = []
    for name, frame in (
        ("users", data.users),
        ("assignments", data.assignments),
        ("outcomes", data.outcomes),
    ):
        if frame["user_id"].duplicated().any():
            errors.append(f"{name}: duplicate user_id")
    user_ids = set(data.users["user_id"])
    if set(data.assignments["user_id"]) != user_ids:
        errors.append("assignments: user FK mismatch")
    if set(data.outcomes["user_id"]) != user_ids:
        errors.append("outcomes: user FK mismatch")
    if not set(data.exposures["user_id"]).issubset(user_ids):
        errors.append("exposures: unknown user FK")
    if not set(data.assignments["variant"]).issubset({"control", "treatment"}):
        errors.append("assignments: invalid variant")
    if not data.outcomes["subscribed_7d"].isin([0, 1]).all():
        errors.append("outcomes: subscribed_7d outside binary range")
    if (data.outcomes["revenue_30d"] < 0).any():
        errors.append("outcomes: negative revenue")
    return errors

