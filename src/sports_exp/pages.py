from __future__ import annotations

import json
from pathlib import Path

from sports_exp.analysis import analyze_experiment
from sports_exp.config import PUBLIC_DIR, SCENARIOS, SEED, ensure_directories
from sports_exp.generator import generate_experiment
from sports_exp.labs import LABS


def portfolio_payload(users: int = 20_000) -> dict[str, object]:
    reports = {}
    for scenario in SCENARIOS:
        data = generate_experiment(scenario=scenario, users=users, seed=SEED)
        reports[scenario] = analyze_experiment(data, scenario).model_dump(mode="json")
    return {
        "mode": "recorded",
        "seed": SEED,
        "synthetic": True,
        "users_per_scenario": users,
        "reports": reports,
        "labs": LABS,
    }


def export_pages(target: Path = PUBLIC_DIR / "data" / "experiments.json") -> Path:
    ensure_directories()
    target.write_text(
        json.dumps(portfolio_payload(), ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    return target

