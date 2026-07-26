from __future__ import annotations

from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / "data" / "generated"
OUTPUT_DIR = ROOT_DIR / "output"
PUBLIC_DIR = ROOT_DIR / "public"
DB_PATH = DATA_DIR / "experiments.duckdb"
EXPERIMENT_ID = "match_center_v2"
SEED = 42

PROFILES = {
    "smoke": {"users": 10_000, "days": 14},
    "portfolio": {"users": 100_000, "days": 28},
}

SCENARIOS = {
    "clean": {
        "title": "Clean measurable win",
        "lesson": "A valid lift still needs power, confidence bounds and healthy guardrails.",
    },
    "srm": {
        "title": "Sample-ratio mismatch",
        "lesson": "Do not interpret lift when assignment itself is broken.",
    },
    "guardrail": {
        "title": "Conversion up, crashes up",
        "lesson": "A primary metric win can still be a HOLD decision.",
    },
    "novelty": {
        "title": "Novelty effect",
        "lesson": "An early spike is not the same as a durable product effect.",
    },
    "simpson": {
        "title": "Simpson's paradox",
        "lesson": "Aggregate movement can reverse after controlling for platform mix.",
    },
    "exposure_bias": {
        "title": "Exposure-selection bias",
        "lesson": "Post-assignment filtering can destroy randomization.",
    },
}


def ensure_directories() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (PUBLIC_DIR / "data").mkdir(parents=True, exist_ok=True)

