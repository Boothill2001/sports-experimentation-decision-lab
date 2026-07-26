-- W01: assignment and exposure reconciliation
WITH assignment_counts AS (
    SELECT variant, COUNT(*) AS assigned_users
    FROM experiment_lab.clean_assignments
    GROUP BY variant
),
exposure_counts AS (
    SELECT variant_logged AS variant, COUNT(DISTINCT user_id) AS exposed_users
    FROM experiment_lab.clean_exposures
    GROUP BY variant_logged
)
SELECT
    a.variant,
    a.assigned_users,
    COALESCE(e.exposed_users, 0) AS exposed_users,
    COALESCE(e.exposed_users, 0) / a.assigned_users::DOUBLE AS exposure_rate
FROM assignment_counts AS a
LEFT JOIN exposure_counts AS e USING (variant);

-- W02: sample-ratio mismatch input
SELECT
    variant,
    COUNT(*) AS observed_users,
    COUNT(*) OVER () / 2.0 AS expected_users_50_50,
    POWER(COUNT(*) - COUNT(*) OVER () / 2.0, 2)
        / (COUNT(*) OVER () / 2.0) AS chi_square_component
FROM experiment_lab.srm_assignments
GROUP BY variant;

-- W03: intent-to-treat subscription lift
SELECT
    a.variant,
    COUNT(*) AS assigned_users,
    AVG(o.subscribed_7d) AS subscription_rate,
    AVG(o.revenue_30d) AS revenue_per_assigned_user
FROM experiment_lab.clean_assignments AS a
INNER JOIN experiment_lab.clean_outcomes AS o USING (experiment_id, user_id)
GROUP BY a.variant;

-- W04: crash and cancellation guardrails
SELECT
    a.variant,
    AVG(o.crash_7d) AS crash_rate,
    AVG(o.cancelled_7d) AS cancellation_rate
FROM experiment_lab.guardrail_assignments AS a
INNER JOIN experiment_lab.guardrail_outcomes AS o USING (experiment_id, user_id)
GROUP BY a.variant;

-- W05: early-versus-late novelty cohorts
SELECT
    CASE WHEN assignment_day <= 6 THEN 'early' ELSE 'late' END AS cohort_window,
    variant,
    COUNT(*) AS users,
    AVG(subscribed_7d) AS subscription_rate
FROM experiment_lab.novelty_assignments
INNER JOIN experiment_lab.novelty_outcomes USING (experiment_id, user_id)
GROUP BY cohort_window, variant;

-- W06: Simpson's paradox by platform
SELECT
    u.platform,
    a.variant,
    COUNT(*) AS users,
    AVG(o.subscribed_7d) AS subscription_rate
FROM experiment_lab.simpson_users AS u
INNER JOIN experiment_lab.simpson_assignments AS a USING (user_id)
INNER JOIN experiment_lab.simpson_outcomes AS o USING (experiment_id, user_id)
GROUP BY u.platform, a.variant;

-- W07: assigned population versus exposed-only population
WITH joined AS (
    SELECT
        a.variant,
        o.subscribed_7d,
        e.user_id IS NOT NULL AS exposed
    FROM experiment_lab.exposure_bias_assignments AS a
    INNER JOIN experiment_lab.exposure_bias_outcomes AS o USING (experiment_id, user_id)
    LEFT JOIN experiment_lab.exposure_bias_exposures AS e USING (experiment_id, user_id)
)
SELECT
    'assigned' AS population,
    variant,
    AVG(subscribed_7d) AS subscription_rate
FROM joined
GROUP BY variant

UNION ALL

SELECT
    'exposed_only' AS population,
    variant,
    AVG(subscribed_7d) AS subscription_rate
FROM joined
WHERE exposed
GROUP BY variant;

-- W08: CUPED inputs from pre-period behavior
SELECT
    a.variant,
    CORR(u.pre_watch_minutes, o.watch_minutes_7d) AS pre_post_correlation,
    VAR_SAMP(u.pre_watch_minutes) AS pre_variance,
    COVAR_SAMP(u.pre_watch_minutes, o.watch_minutes_7d) AS covariance,
    AVG(o.watch_minutes_7d) AS raw_post_mean
FROM experiment_lab.clean_users AS u
INNER JOIN experiment_lab.clean_assignments AS a USING (user_id)
INNER JOIN experiment_lab.clean_outcomes AS o USING (experiment_id, user_id)
GROUP BY a.variant;

-- W09: cumulative result snapshots for peeking review
SELECT
    assignment_day,
    variant,
    SUM(COUNT(*)) OVER (
        PARTITION BY variant ORDER BY assignment_day
    ) AS cumulative_users,
    SUM(SUM(subscribed_7d)) OVER (
        PARTITION BY variant ORDER BY assignment_day
    ) AS cumulative_subscriptions
FROM experiment_lab.clean_assignments
INNER JOIN experiment_lab.clean_outcomes USING (experiment_id, user_id)
GROUP BY assignment_day, variant;

-- W10: data-quality and crossover gate
SELECT
    COUNT(*) AS assignment_rows,
    COUNT(DISTINCT a.user_id) AS assigned_users,
    COUNT_IF(a.variant <> e.variant_logged) AS variant_crossovers,
    COUNT_IF(e.exposed_at < a.assigned_at) AS exposure_before_assignment
FROM experiment_lab.clean_assignments AS a
LEFT JOIN experiment_lab.clean_exposures AS e USING (experiment_id, user_id);
