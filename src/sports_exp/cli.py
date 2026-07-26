from __future__ import annotations

import argparse
import json

from sports_exp.analysis import analyze_experiment
from sports_exp.config import PROFILES, SCENARIOS, SEED, ensure_directories
from sports_exp.generator import generate_experiment
from sports_exp.labs import LABS
from sports_exp.pages import export_pages
from sports_exp.store import persist_experiment, validate_relationships


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="sports-exp")
    commands = parser.add_subparsers(dest="command", required=True)

    generate = commands.add_parser("generate")
    generate.add_argument("--profile", choices=PROFILES, default="smoke")
    generate.add_argument("--scenario", choices=SCENARIOS, default="clean")
    generate.add_argument("--seed", type=int, default=SEED)

    analyze = commands.add_parser("analyze")
    analyze.add_argument("--profile", choices=PROFILES, default="smoke")
    analyze.add_argument("--scenario", choices=SCENARIOS, default="clean")

    lab = commands.add_parser("run-lab")
    lab.add_argument("lab_id", choices=LABS)

    commands.add_parser("export-pages")
    commands.add_parser("validate")
    return parser


def _report(scenario: str, profile: str = "smoke") -> dict[str, object]:
    data = generate_experiment(scenario=scenario, profile=profile)
    report = analyze_experiment(data, scenario)
    return report.model_dump(mode="json")


def main() -> None:
    args = build_parser().parse_args()
    ensure_directories()
    if args.command == "generate":
        data = generate_experiment(args.scenario, args.profile, args.seed)
        db_path = persist_experiment(data, args.scenario)
        print(
            json.dumps(
                {
                    "scenario": args.scenario,
                    "users": len(data.users),
                    "exposures": len(data.exposures),
                    "database": str(db_path),
                },
                indent=2,
            )
        )
    elif args.command == "analyze":
        print(json.dumps(_report(args.scenario, args.profile), indent=2))
    elif args.command == "run-lab":
        lab = LABS[args.lab_id]
        print(
            json.dumps(
                {"lab": lab, "report": _report(str(lab["scenario"]))},
                indent=2,
            )
        )
    elif args.command == "export-pages":
        print(export_pages())
    elif args.command == "validate":
        decisions = {}
        for scenario in SCENARIOS:
            data = generate_experiment(scenario=scenario, profile="smoke")
            errors = validate_relationships(data)
            if errors:
                raise SystemExit(f"{scenario}: {'; '.join(errors)}")
            decisions[scenario] = analyze_experiment(data, scenario).decision
        print(json.dumps({"status": "PASS", "decisions": decisions}, indent=2))

