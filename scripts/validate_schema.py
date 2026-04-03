#!/usr/bin/env python3
"""Validate that all output/app_data/*.json files have the correct schema."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
DATA = ROOT / "output" / "app_data"

errors = []

def check(cond, msg):
    if not cond:
        errors.append(msg)

def load(name):
    path = DATA / name
    if not path.exists():
        errors.append(f"Missing file: {path}")
        return None
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError as e:
        errors.append(f"Invalid JSON in {name}: {e}")
        return None

# teams.json
teams = load("teams.json")
if teams is not None:
    check(isinstance(teams, list), "teams.json must be a list")
    if teams:
        check("id" in teams[0], "teams[].id missing")
        check("name" in teams[0], "teams[].name missing")

# fixtures.json
fixtures = load("fixtures.json")
if fixtures is not None:
    check(isinstance(fixtures, list), "fixtures.json must be a list")
    if fixtures:
        f = fixtures[0]
        for field in ["match_id", "matchday", "home_team_id", "away_team_id", "home_team", "away_team", "status"]:
            check(field in f, f"fixtures[].{field} missing")

# prefill_predictions.json
preds = load("prefill_predictions.json")
if preds is not None:
    check(isinstance(preds, dict), "prefill_predictions.json must be a dict")
    if preds:
        sample = next(iter(preds.values()))
        for field in ["home_score", "away_score", "confidence", "rationale"]:
            check(field in sample, f"predictions[].{field} missing")

# baseline_table.json
table = load("baseline_table.json")
if table is not None:
    check(isinstance(table, list), "baseline_table.json must be a list")
    if table:
        row = table[0]
        for field in ["team_id", "team", "played", "wins", "draws", "losses", "goals_for", "goals_against", "goal_diff", "points", "position"]:
            check(field in row, f"baseline_table[].{field} missing")

# data_version.json
version = load("data_version.json")
if version is not None:
    for field in ["generated_at", "model_version"]:
        check(field in version, f"data_version.{field} missing")

if errors:
    print("SCHEMA VALIDATION FAILED:")
    for e in errors:
        print(f"  \u2715 {e}")
    sys.exit(1)
else:
    print(f"Schema validation passed: {len([t for t in [teams,fixtures,preds,table,version] if t is not None])} files OK")
