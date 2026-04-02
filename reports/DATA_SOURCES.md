# Promotion analysis data sources

This analysis intentionally uses only pre-existing scraped outputs in this repository:

- `output/standings.json`
  - List of 14 table rows.
  - Fields: `position`, `team`, `team_id`, `played`, `wins`, `draws`, `losses`, `goals_for`, `goals_against`, `goal_diff`, `points`.

- `output/matchdays.json`
  - List of 26 matchday objects.
  - Each has `matchday_number` and `matches[]` with fixture-level identifiers and scheduling metadata.

- `output/match_details/*.json`
  - One file per match detail page (182 available files in this repo state).
  - Fields include `match_id`, teams, scores, `matchday`, and event arrays (`goals`, `cards`, `substitutions`).

Outputs produced by the promotion analysis script:

- `reports/rotation_promotion_analysis.md`
- `reports/rotation_promotion_analysis.json`
- `reports/rotation_promotion_scenarios.csv`

Planning overlay included in script:

- `RUN_IN_FIXTURES` constant in `scripts/analyze_promotion_race.py`
  - User-provided MD17-MD26 schedule for SG Rotation Leipzig II, used to ensure
    direct-rival and run-in strategy sections align with known upcoming fixtures.
