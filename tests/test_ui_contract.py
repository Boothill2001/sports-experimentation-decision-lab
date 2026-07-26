from pathlib import Path

PUBLIC = Path(__file__).parents[1] / "public"


def test_review_board_information_architecture() -> None:
    html = (PUBLIC / "index.html").read_text(encoding="utf-8")

    for step in ("Design", "Integrity", "Effect", "Guardrails", "Decision"):
        assert f"<strong>{step}</strong>" in html

    assert "Recorded synthetic evidence · seed 42" in html
    assert 'id="scenario-select"' in html
    assert 'id="practice-drawer"' in html
    assert 'id="learning-overlay"' in html
    assert "sidebar" not in html.lower()


def test_review_board_supports_accessible_motion_and_keyboard_controls() -> None:
    css = (PUBLIC / "assets" / "styles.css").read_text(encoding="utf-8")
    javascript = (PUBLIC / "assets" / "app.js").read_text(encoding="utf-8")

    assert "prefers-reduced-motion" in css
    assert ":focus-visible" in css
    assert "event.key.toLowerCase() === \"k\"" in javascript
    assert 'event.key === "Escape"' in javascript
