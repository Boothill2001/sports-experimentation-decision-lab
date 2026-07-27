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


def test_workday_simulator_has_seven_stage_learning_contract() -> None:
    html = (PUBLIC / "workday.html").read_text(encoding="utf-8")
    css = (PUBLIC / "assets" / "workday.css").read_text(encoding="utf-8")
    javascript = (PUBLIC / "assets" / "workday.js").read_text(encoding="utf-8")

    assert "Một ngày đi làm" in html
    assert 'id="timeline"' in html
    assert 'id="question-list"' in html
    assert 'id="action-options"' in html
    assert 'id="deliverable"' in html
    assert javascript.count("questions: [") == 7
    assert "reports.guardrail" in javascript
    assert "localStorage" in javascript
    assert "prefers-reduced-motion" in css
