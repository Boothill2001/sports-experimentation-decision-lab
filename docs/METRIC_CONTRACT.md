# Match Center v2 metric contract

## Business question

Does Match Center v2 increase seven-day subscription conversion without harming app
reliability or early subscriber quality?

## Experiment contract

| Field | Definition |
|---|---|
| Randomization unit | `user_id` |
| Allocation | 50/50 control/treatment unless a lab deliberately breaks it |
| Analysis population | All eligible assigned users (intent-to-treat) |
| Primary metric | Users with a subscription within seven days / assigned users |
| Guardrails | Seven-day crash rate and seven-day cancellation rate |
| Diagnostic metrics | Exposure, watch minutes, revenue, platform and cohort-day lift |
| Confidence level | 95%, two-sided |
| Decision order | SRM → lineage → effect/CI → guardrails → durability/segments |

## Metric boundaries

- Exposure is measured after assignment and cannot replace the ITT denominator.
- CUPED may use `pre_watch_minutes` because it is observed before treatment.
- Segment results are planned diagnostics, not permission to hunt for a winning subgroup.
- A guardrail breach can veto a statistically significant primary result.
- Synthetic effect sizes are learning fixtures, not production estimates.

