from __future__ import annotations

LABS = {
    "L01": {
        "scenario": "clean",
        "title": "Can we ship Match Center v2?",
        "question": "Is the primary lift credible, precise and safe enough to ship?",
        "clarify": [
            "What is the randomization unit?",
            "Is the primary metric defined before reading results?",
            "Which guardrails can veto a win?",
        ],
        "evidence": (
            "Check SRM first, then confidence interval, "
            "then crash/cancellation guardrails."
        ),
    },
    "L02": {
        "scenario": "srm",
        "title": "The dashboard says +lift, but allocation is 58/42",
        "question": "Can the team interpret treatment effect when assignment is broken?",
        "clarify": [
            "Was 50/50 allocation planned?",
            "Is mismatch present before or after exposure?",
            "Did eligibility differ by variant?",
        ],
        "evidence": "SRM p-value is a trust gate, not another secondary metric.",
    },
    "L03": {
        "scenario": "guardrail",
        "title": "Conversion rises while crash rate regresses",
        "question": "Should Product ship a primary-metric winner that harms reliability?",
        "clarify": [
            "Was crash rate declared as a guardrail?",
            "How large is the absolute regression?",
            "Can the affected platform be isolated?",
        ],
        "evidence": "A statistically credible guardrail breach changes SHIP into HOLD.",
    },
    "L04": {
        "scenario": "novelty",
        "title": "The first week wins, the last week fades",
        "question": "Is the effect durable or just novelty?",
        "clarify": [
            "How long is the user decision cycle?",
            "Are early and late cohorts comparable?",
            "Was duration chosen before looking?",
        ],
        "evidence": "Compare early and late cohort lift; do not stop at cumulative significance.",
    },
    "L05": {
        "scenario": "simpson",
        "title": "Aggregate and platform effects disagree",
        "question": "Which result should leadership trust?",
        "clarify": [
            "Was randomization balanced within platform?",
            "Does platform predict baseline conversion?",
            "Was stratification planned?",
        ],
        "evidence": "Audit allocation mix before averaging segments with different baselines.",
    },
    "L06": {
        "scenario": "exposure_bias",
        "title": "Assigned users and exposed users tell different stories",
        "question": "Why can filtering to exposed users bias the estimate?",
        "clarify": [
            "Can treatment affect exposure?",
            "Was exposure measured after assignment?",
            "Which estimand does Product need?",
        ],
        "evidence": "Intent-to-treat preserves randomization; exposed-only is a diagnostic.",
    },
    "L07": {
        "scenario": "clean",
        "title": "Use CUPED without changing the estimand",
        "question": "Can pre-period behavior reduce variance without leaking post-treatment data?",
        "clarify": [
            "Was the covariate measured before assignment?",
            "Is it correlated with the outcome?",
            "Is the same adjustment applied to both variants?",
        ],
        "evidence": "Report variance reduction and keep raw plus adjusted estimates auditable.",
    },
    "L08": {
        "scenario": "clean",
        "title": "Write the one-minute experiment decision",
        "question": "Can you communicate result, uncertainty, guardrails and limitation?",
        "clarify": [
            "Who owns the ship decision?",
            "What is the absolute effect and confidence interval?",
            "What monitoring continues after launch?",
        ],
        "evidence": "Recommendation must include effect, uncertainty, guardrails and next action.",
    },
}
