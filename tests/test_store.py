from __future__ import annotations

import duckdb

from sports_exp.store import persist_experiment


def test_persist_experiment_creates_queryable_tables(clean_data, tmp_path) -> None:
    path = persist_experiment(clean_data, "clean", tmp_path / "lab.duckdb")
    with duckdb.connect(str(path), read_only=True) as connection:
        users = connection.execute(
            "SELECT COUNT(*) FROM experiment_lab.clean_users"
        ).fetchone()[0]
        assignments = connection.execute(
            "SELECT COUNT(*) FROM experiment_lab.clean_assignments"
        ).fetchone()[0]
    assert users == len(clean_data.users)
    assert assignments == len(clean_data.assignments)

