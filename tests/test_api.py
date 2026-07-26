from __future__ import annotations

from sports_exp.api import health, index


def test_health_is_transparent() -> None:
    assert health() == {
        "status": "ok",
        "mode": "local",
        "synthetic": True,
        "seed": 42,
    }


def test_index_serves_decision_room() -> None:
    response = index()
    assert str(response.path).replace("\\", "/").endswith("public/index.html")
