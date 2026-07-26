from __future__ import annotations

import json

from sports_exp.pages import export_pages, portfolio_payload


def test_portfolio_payload_contains_all_labs_and_scenarios() -> None:
    payload = portfolio_payload(users=2_000)
    assert len(payload["labs"]) == 8
    assert len(payload["reports"]) == 6
    assert payload["synthetic"] is True


def test_export_pages_writes_recorded_payload(tmp_path) -> None:
    path = export_pages(tmp_path / "experiments.json")
    payload = json.loads(path.read_text(encoding="utf-8"))
    assert payload["mode"] == "recorded"
    assert payload["seed"] == 42

