#!/usr/bin/env python3
"""
Compare a saved pre-update forecast snapshot against refreshed app data.

The comparison focuses on fixtures that were unplayed in the snapshot and are
now played in output/app_data/fixtures.json.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CURRENT_FIXTURES = REPO_ROOT / "output" / "app_data" / "fixtures.json"


def load_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def outcome(home_score: int, away_score: int) -> str:
    if home_score > away_score:
        return "home"
    if home_score < away_score:
        return "away"
    return "draw"


def compare(snapshot_dir: Path, current_fixtures_path: Path) -> dict[str, Any]:
    snapshot_dir = snapshot_dir.resolve()
    current_fixtures_path = current_fixtures_path.resolve()
    snapshot_predictions = load_json(snapshot_dir / "prefill_predictions.json")
    snapshot_fixtures = load_json(snapshot_dir / "fixtures.json")
    current_fixtures = load_json(current_fixtures_path)

    before_by_id = {fixture["match_id"]: fixture for fixture in snapshot_fixtures}
    current_by_id = {fixture["match_id"]: fixture for fixture in current_fixtures}

    evaluated = []
    for match_id, prediction in snapshot_predictions.items():
        before = before_by_id.get(match_id)
        current = current_by_id.get(match_id)
        if not before or not current:
            continue
        if before.get("status") == "played" or current.get("status") != "played":
            continue

        actual_home = current.get("home_score")
        actual_away = current.get("away_score")
        pred_home = prediction.get("home_score")
        pred_away = prediction.get("away_score")
        if None in (actual_home, actual_away, pred_home, pred_away):
            continue

        actual_outcome = outcome(actual_home, actual_away)
        predicted_outcome = outcome(pred_home, pred_away)
        evaluated.append(
            {
                "match_id": match_id,
                "matchday": current.get("matchday"),
                "date": current.get("date"),
                "home_team": current.get("home_team"),
                "away_team": current.get("away_team"),
                "prediction": {"home_score": pred_home, "away_score": pred_away},
                "actual": {"home_score": actual_home, "away_score": actual_away},
                "predicted_outcome": predicted_outcome,
                "actual_outcome": actual_outcome,
                "outcome_correct": predicted_outcome == actual_outcome,
                "exact_score_correct": pred_home == actual_home and pred_away == actual_away,
                "goal_diff_error": abs((pred_home - pred_away) - (actual_home - actual_away)),
                "total_goals_error": abs((pred_home + pred_away) - (actual_home + actual_away)),
                "home_goal_error": abs(pred_home - actual_home),
                "away_goal_error": abs(pred_away - actual_away),
                "confidence": prediction.get("confidence"),
                "rationale": prediction.get("rationale"),
            }
        )

    count = len(evaluated)
    summary = {
        "snapshot_dir": str(snapshot_dir.relative_to(REPO_ROOT)),
        "current_fixtures": str(current_fixtures_path.relative_to(REPO_ROOT)),
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "evaluated_matches": count,
        "outcome_correct": sum(1 for row in evaluated if row["outcome_correct"]),
        "exact_score_correct": sum(1 for row in evaluated if row["exact_score_correct"]),
        "avg_goal_diff_error": round(
            sum(row["goal_diff_error"] for row in evaluated) / count, 3
        )
        if count
        else None,
        "avg_total_goals_error": round(
            sum(row["total_goals_error"] for row in evaluated) / count, 3
        )
        if count
        else None,
        "avg_home_goal_error": round(
            sum(row["home_goal_error"] for row in evaluated) / count, 3
        )
        if count
        else None,
        "avg_away_goal_error": round(
            sum(row["away_goal_error"] for row in evaluated) / count, 3
        )
        if count
        else None,
    }
    if count:
        summary["outcome_accuracy"] = round(summary["outcome_correct"] / count, 3)
        summary["exact_score_accuracy"] = round(summary["exact_score_correct"] / count, 3)
    else:
        summary["outcome_accuracy"] = None
        summary["exact_score_accuracy"] = None

    return {"summary": summary, "matches": evaluated}


def write_markdown(report: dict[str, Any], path: Path) -> None:
    summary = report["summary"]
    lines = [
        "# Forecast Snapshot Comparison",
        "",
        f"- Snapshot: `{summary['snapshot_dir']}`",
        f"- Compared against: `{summary['current_fixtures']}`",
        f"- Generated at: `{summary['generated_at']}`",
        f"- Evaluated newly played matches: **{summary['evaluated_matches']}**",
        f"- Outcome accuracy: **{summary['outcome_accuracy']}**",
        f"- Exact score accuracy: **{summary['exact_score_accuracy']}**",
        f"- Avg goal-difference error: **{summary['avg_goal_diff_error']}**",
        f"- Avg total-goals error: **{summary['avg_total_goals_error']}**",
        "",
        "| MD | Date | Match | Prediction | Actual | Outcome | Exact |",
        "|---:|---|---|---:|---:|---|---|",
    ]
    for row in report["matches"]:
        predicted = f"{row['prediction']['home_score']}:{row['prediction']['away_score']}"
        actual = f"{row['actual']['home_score']}:{row['actual']['away_score']}"
        outcome_mark = "yes" if row["outcome_correct"] else "no"
        exact_mark = "yes" if row["exact_score_correct"] else "no"
        lines.append(
            f"| {row.get('matchday') or ''} | {row.get('date') or ''} | "
            f"{row['home_team']} - {row['away_team']} | {predicted} | {actual} | "
            f"{outcome_mark} | {exact_mark} |"
        )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("snapshot_dir", type=Path)
    parser.add_argument("--current-fixtures", type=Path, default=DEFAULT_CURRENT_FIXTURES)
    parser.add_argument("--json-out", type=Path)
    parser.add_argument("--md-out", type=Path)
    args = parser.parse_args()

    report = compare(args.snapshot_dir, args.current_fixtures)
    json_out = args.json_out or args.snapshot_dir / "comparison_after_update.json"
    md_out = args.md_out or args.snapshot_dir / "comparison_after_update.md"

    json_out.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_markdown(report, md_out)

    summary = report["summary"]
    print(f"Evaluated matches: {summary['evaluated_matches']}")
    print(f"Outcome accuracy: {summary['outcome_accuracy']}")
    print(f"Exact score accuracy: {summary['exact_score_accuracy']}")
    print(f"Wrote {json_out}")
    print(f"Wrote {md_out}")


if __name__ == "__main__":
    main()
