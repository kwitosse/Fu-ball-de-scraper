Data directory for Fu-ball Live Table app
==========================================

This directory must contain the following JSON files before running the dev server or build:

  teams.json              - [{id, name}]
  fixtures.json           - [{match_id, matchday, home_team_id, away_team_id, home_team, away_team, date, time, status, home_score, away_score}]
  prefill_predictions.json - {match_id: {home_score, away_score, xg_home, xg_away, confidence, rationale}}
  baseline_table.json     - [{team_id, team, played, wins, draws, losses, goals_for, goals_against, goal_diff, points, position}]
  data_version.json       - {generated_at, model_version, source}

To populate this directory, run:
  python scripts/build_app_data.py

Or use the copy script:
  bash scripts/copy_data.sh
