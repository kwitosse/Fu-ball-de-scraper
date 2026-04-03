#!/usr/bin/env python3
"""
build_app_data.py

Reads raw scraped data from output/ and generates normalized app data files
into output/app_data/ for the football league prediction app.
"""

import json
import os
import math
from pathlib import Path
from datetime import datetime, timezone
from collections import defaultdict

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = REPO_ROOT / "output"
APP_DATA_DIR = OUTPUT_DIR / "app_data"
MATCH_DETAILS_DIR = OUTPUT_DIR / "match_details"

APP_DATA_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def clamp(value, lo, hi):
    return max(lo, min(hi, value))


def safe_div(numerator, denominator, default=1.0):
    if denominator and denominator != 0:
        return numerator / denominator
    return default


def parse_date(date_str):
    """Parse DD.MM.YYYY to a sortable string YYYY-MM-DD, or return '' on failure."""
    if not date_str:
        return ""
    try:
        dt = datetime.strptime(date_str, "%d.%m.%Y")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        return date_str


# ---------------------------------------------------------------------------
# Step 1: Load data
# ---------------------------------------------------------------------------
print("=== Step 1: Loading data ===")

standings_path = OUTPUT_DIR / "standings.json"
matchdays_path = OUTPUT_DIR / "matchdays.json"

with open(standings_path) as f:
    standings_raw = json.load(f)

with open(matchdays_path) as f:
    matchdays_raw = json.load(f)

# Build canonical team map from standings
team_map = {}  # team_id -> {id, name}
for entry in standings_raw:
    tid = entry["team_id"]
    team_map[tid] = {"id": tid, "name": entry["team"]}

print(f"  Teams from standings: {len(team_map)}")

# Load all match details files
# match_details don't have team_ids, so we cross-ref via matchdays
# Build a lookup: match_id -> {home_team_id, away_team_id, time, ...} from matchdays
matchday_lookup = {}  # match_id -> match dict
for md in matchdays_raw:
    for m in md["matches"]:
        mid = m["match_id"]
        if mid not in matchday_lookup:
            matchday_lookup[mid] = m
        # else duplicate - skip

# Also enrich team_map with any team_ids seen in matchdays not in standings
for m in matchday_lookup.values():
    for tid_key, name_key in [("home_team_id", "home_team"), ("away_team_id", "away_team")]:
        tid = m.get(tid_key)
        name = m.get(name_key)
        if tid and tid not in team_map:
            team_map[tid] = {"id": tid, "name": name}

print(f"  Teams total (incl. from matchdays): {len(team_map)}")

# Load match details
detail_files = list(MATCH_DETAILS_DIR.glob("*.json"))
detail_map = {}  # match_id -> detail dict
skipped_duplicates = 0
for fp in detail_files:
    with open(fp) as f:
        d = json.load(f)
    mid = d.get("match_id")
    if not mid:
        continue
    if mid in detail_map:
        skipped_duplicates += 1
        continue
    detail_map[mid] = d

print(f"  Match detail files: {len(detail_files)}, unique: {len(detail_map)}, duplicates skipped: {skipped_duplicates}")

# ---------------------------------------------------------------------------
# Build merged fixture list
# ---------------------------------------------------------------------------
# Primary source: matchdays.json (has team_ids, matchday grouping)
# Enrich with match_details (has actual scores, date, kickoff)

seen_match_ids = set()
fixtures = []  # list of unified fixture dicts

for md in matchdays_raw:
    md_number = md["matchday_number"]
    for m in md["matches"]:
        mid = m["match_id"]
        if mid in seen_match_ids:
            continue
        seen_match_ids.add(mid)

        detail = detail_map.get(mid, {})

        # Determine scores: prefer match_details if available
        home_score = detail.get("home_score") if detail else m.get("home_score")
        away_score = detail.get("away_score") if detail else m.get("away_score")

        # Flag as played if both scores are not None
        is_played = (home_score is not None) and (away_score is not None)

        # Date: match_details has date in DD.MM.YYYY, matchdays may have null
        date_raw = detail.get("date") or m.get("date")
        date_sortable = parse_date(date_raw)

        # Time / kickoff
        time_val = detail.get("kickoff") or m.get("time")

        fixture = {
            "match_id": mid,
            "matchday": md_number,
            "home_team_id": m.get("home_team_id", ""),
            "away_team_id": m.get("away_team_id", ""),
            "home_team": m.get("home_team", detail.get("home_team", "")),
            "away_team": m.get("away_team", detail.get("away_team", "")),
            "date": date_raw or "",
            "date_sortable": date_sortable,
            "time": time_val or "",
            "status": "played" if is_played else "unplayed",
            "home_score": home_score,
            "away_score": away_score,
        }
        fixtures.append(fixture)

# Also add any match_details entries not found in matchdays
for mid, detail in detail_map.items():
    if mid not in seen_match_ids:
        seen_match_ids.add(mid)
        home_score = detail.get("home_score")
        away_score = detail.get("away_score")
        is_played = (home_score is not None) and (away_score is not None)
        date_raw = detail.get("date")
        date_sortable = parse_date(date_raw)
        fixture = {
            "match_id": mid,
            "matchday": detail.get("matchday", 0),
            "home_team_id": "",
            "away_team_id": "",
            "home_team": detail.get("home_team", ""),
            "away_team": detail.get("away_team", ""),
            "date": date_raw or "",
            "date_sortable": date_sortable,
            "time": detail.get("kickoff") or "",
            "status": "played" if is_played else "unplayed",
            "home_score": home_score,
            "away_score": away_score,
        }
        fixtures.append(fixture)

# Sort by matchday then date
fixtures.sort(key=lambda x: (x["matchday"], x["date_sortable"] or "9999"))

played_fixtures = [f for f in fixtures if f["status"] == "played"]
unplayed_fixtures = [f for f in fixtures if f["status"] != "played"]

print(f"  Total fixtures: {len(fixtures)}")
print(f"  Played: {len(played_fixtures)}, Unplayed: {len(unplayed_fixtures)}")


# ---------------------------------------------------------------------------
# Step 2: Feature Engineering
# ---------------------------------------------------------------------------
print("\n=== Step 2: Feature Engineering ===")

# Per-team stats from played matches
# team_stats[team_id] = {matches: [...], home_matches: [...], away_matches: [...]}
team_matches = defaultdict(list)  # team_id -> list of (gf, ga, is_home, date_sortable)

for f in played_fixtures:
    htid = f["home_team_id"]
    atid = f["away_team_id"]
    hs = f["home_score"]
    as_ = f["away_score"]

    if htid:
        team_matches[htid].append({
            "gf": hs, "ga": as_, "is_home": True,
            "date_sortable": f["date_sortable"],
            "matchday": f["matchday"],
        })
    if atid:
        team_matches[atid].append({
            "gf": as_, "ga": hs, "is_home": False,
            "date_sortable": f["date_sortable"],
            "matchday": f["matchday"],
        })

# Sort each team's matches by matchday then date
for tid in team_matches:
    team_matches[tid].sort(key=lambda x: (x["matchday"], x["date_sortable"] or "9999"))


def compute_team_stats(tid):
    matches = team_matches.get(tid, [])
    n = len(matches)
    home_matches = [m for m in matches if m["is_home"]]
    away_matches = [m for m in matches if not m["is_home"]]

    total_gf = sum(m["gf"] for m in matches)
    total_ga = sum(m["ga"] for m in matches)
    wins = sum(1 for m in matches if m["gf"] > m["ga"])
    draws = sum(1 for m in matches if m["gf"] == m["ga"])
    losses = sum(1 for m in matches if m["gf"] < m["ga"])

    season_gf_per_game = safe_div(total_gf, n, 0.0)
    season_ga_per_game = safe_div(total_ga, n, 0.0)
    win_rate = safe_div(wins, n, 0.0)
    draw_rate = safe_div(draws, n, 0.0)
    loss_rate = safe_div(losses, n, 0.0)

    hn = len(home_matches)
    an = len(away_matches)
    home_gf_per_game = safe_div(sum(m["gf"] for m in home_matches), hn, 0.0)
    home_ga_per_game = safe_div(sum(m["ga"] for m in home_matches), hn, 0.0)
    away_gf_per_game = safe_div(sum(m["gf"] for m in away_matches), an, 0.0)
    away_ga_per_game = safe_div(sum(m["ga"] for m in away_matches), an, 0.0)

    last3 = matches[-3:]
    last5 = matches[-5:]
    form_last3_gf = safe_div(sum(m["gf"] for m in last3), len(last3), 0.0) if last3 else 0.0
    form_last3_ga = safe_div(sum(m["ga"] for m in last3), len(last3), 0.0) if last3 else 0.0
    form_last5_gf = safe_div(sum(m["gf"] for m in last5), len(last5), 0.0) if last5 else 0.0
    form_last5_ga = safe_div(sum(m["ga"] for m in last5), len(last5), 0.0) if last5 else 0.0

    return {
        "played": n,
        "wins": wins,
        "draws": draws,
        "losses": losses,
        "goals_for": total_gf,
        "goals_against": total_ga,
        "season_gf_per_game": season_gf_per_game,
        "season_ga_per_game": season_ga_per_game,
        "win_rate": win_rate,
        "draw_rate": draw_rate,
        "loss_rate": loss_rate,
        "home_gf_per_game": home_gf_per_game,
        "home_ga_per_game": home_ga_per_game,
        "away_gf_per_game": away_gf_per_game,
        "away_ga_per_game": away_ga_per_game,
        "form_last3_gf": form_last3_gf,
        "form_last3_ga": form_last3_ga,
        "form_last5_gf": form_last5_gf,
        "form_last5_ga": form_last5_ga,
        "home_played": hn,
        "away_played": an,
    }


team_stats = {}
for tid in team_map:
    team_stats[tid] = compute_team_stats(tid)

# League-wide averages
all_played = [f for f in fixtures if f["status"] == "played"]
total_goals = sum((f["home_score"] or 0) + (f["away_score"] or 0) for f in all_played)
total_home_goals = sum(f["home_score"] or 0 for f in all_played)
total_away_goals = sum(f["away_score"] or 0 for f in all_played)
n_played = len(all_played)

league_avg_gf_per_game = safe_div(total_goals, n_played * 2, 1.5)
league_avg_home_gf_per_game = safe_div(total_home_goals, n_played, 1.5)
league_avg_away_gf_per_game = safe_div(total_away_goals, n_played, 1.2)

print(f"  League avg goals/game (per team): {league_avg_gf_per_game:.3f}")
print(f"  League avg home goals/game: {league_avg_home_gf_per_game:.3f}")
print(f"  League avg away goals/game: {league_avg_away_gf_per_game:.3f}")

# Attack strength & defense weakness (split by home/away)
for tid, stats in team_stats.items():
    n = stats["played"]
    gf_pg = stats["season_gf_per_game"]
    ga_pg = stats["season_ga_per_game"]

    stats["attack_strength"] = safe_div(gf_pg, league_avg_gf_per_game, 1.0) if n > 0 else 1.0
    stats["defense_weakness"] = safe_div(ga_pg, league_avg_gf_per_game, 1.0) if n > 0 else 1.0

    hn = stats["home_played"]
    an = stats["away_played"]
    stats["home_attack_strength"] = (
        safe_div(stats["home_gf_per_game"], league_avg_home_gf_per_game, 1.0) if hn > 0 else 1.0
    )
    stats["away_attack_strength"] = (
        safe_div(stats["away_gf_per_game"], league_avg_away_gf_per_game, 1.0) if an > 0 else 1.0
    )
    stats["home_defense_weakness"] = (
        safe_div(stats["home_ga_per_game"], league_avg_away_gf_per_game, 1.0) if hn > 0 else 1.0
    )
    stats["away_defense_weakness"] = (
        safe_div(stats["away_ga_per_game"], league_avg_home_gf_per_game, 1.0) if an > 0 else 1.0
    )

# Head-to-head records
h2h = defaultdict(lambda: {"played": 0, "home_wins": 0, "draws": 0, "away_wins": 0,
                            "home_goals": 0, "away_goals": 0})
for f in all_played:
    htid = f["home_team_id"]
    atid = f["away_team_id"]
    if not htid or not atid:
        continue
    key = (htid, atid)
    hs = f["home_score"] or 0
    as_ = f["away_score"] or 0
    h2h[key]["played"] += 1
    h2h[key]["home_goals"] += hs
    h2h[key]["away_goals"] += as_
    if hs > as_:
        h2h[key]["home_wins"] += 1
    elif hs == as_:
        h2h[key]["draws"] += 1
    else:
        h2h[key]["away_wins"] += 1

print(f"  Head-to-head pairings computed: {len(h2h)}")


# ---------------------------------------------------------------------------
# Step 3: Prediction Engine
# ---------------------------------------------------------------------------
print("\n=== Step 3: Prediction Engine ===")

HOME_FACTOR = 1.10
league_home_goal_base = max(league_avg_home_gf_per_game, 1.5)
league_away_goal_base = max(league_avg_away_gf_per_game, 1.2)


def get_form_factor_atk(form_last5_gf, season_gf_pg):
    if season_gf_pg and season_gf_pg > 0:
        return clamp(form_last5_gf / season_gf_pg, 0.90, 1.10)
    return 1.0


def get_form_factor_def(form_last5_ga, season_ga_pg):
    if season_ga_pg and season_ga_pg > 0:
        return clamp(form_last5_ga / season_ga_pg, 0.90, 1.10)
    return 1.0


def build_rationale(htid, atid, xg_home, xg_away, home_stats, away_stats):
    factors = []

    home_atk = home_stats.get("home_attack_strength", 1.0)
    away_def = away_stats.get("away_defense_weakness", 1.0)
    away_atk = away_stats.get("away_attack_strength", 1.0)
    home_def = home_stats.get("home_defense_weakness", 1.0)

    if home_atk >= 1.3:
        factors.append(f"Strong home attack ({home_atk:.1f}x avg)")
    elif home_atk <= 0.75:
        factors.append(f"Weak home attack ({home_atk:.1f}x avg)")

    if away_def >= 1.3:
        factors.append(f"Weak away defense ({away_def:.1f}x avg)")
    elif away_def <= 0.75:
        factors.append(f"Strong away defense ({away_def:.1f}x avg)")

    if away_atk >= 1.3:
        factors.append(f"Strong away attack ({away_atk:.1f}x avg)")
    elif away_atk <= 0.75:
        factors.append(f"Weak away attack ({away_atk:.1f}x avg)")

    if home_def >= 1.3:
        factors.append(f"Leaky home defense ({home_def:.1f}x avg)")
    elif home_def <= 0.75:
        factors.append(f"Solid home defense ({home_def:.1f}x avg)")

    # Form
    home_form_gf = home_stats.get("form_last5_gf", 0.0)
    home_season_gf = home_stats.get("season_gf_per_game", 0.0)
    if home_season_gf > 0 and home_form_gf / home_season_gf > 1.05:
        factors.append("Home team in good scoring form")
    elif home_season_gf > 0 and home_form_gf / home_season_gf < 0.95:
        factors.append("Home team struggling to score recently")

    # H2H
    h2h_key = (htid, atid)
    if h2h_key in h2h:
        rec = h2h[h2h_key]
        if rec["played"] >= 2:
            if rec["home_wins"] > rec["away_wins"]:
                factors.append(f"Home team leads H2H ({rec['home_wins']}W-{rec['draws']}D-{rec['away_wins']}L)")
            elif rec["away_wins"] > rec["home_wins"]:
                factors.append(f"Away team leads H2H ({rec['away_wins']}W-{rec['draws']}D-{rec['home_wins']}L)")

    if not factors:
        diff = xg_home - xg_away
        if diff > 0.5:
            factors.append("Home advantage")
        elif diff < -0.5:
            factors.append("Strong away side expected")
        else:
            factors.append("Evenly matched sides")

    return "; ".join(factors[:3])


prefill_predictions = {}
predicted_count = 0

for f in unplayed_fixtures:
    htid = f["home_team_id"]
    atid = f["away_team_id"]

    if not htid or not atid:
        continue

    home_stats = team_stats.get(htid, {})
    away_stats = team_stats.get(atid, {})

    # Attack/defense strengths with fallback to 1.0
    home_attack_str = home_stats.get("home_attack_strength", 1.0)
    away_attack_str = away_stats.get("away_attack_strength", 1.0)
    away_defense_weakness = away_stats.get("away_defense_weakness", 1.0)
    home_defense_weakness = home_stats.get("home_defense_weakness", 1.0)

    # Form factors
    form_atk_home = get_form_factor_atk(
        home_stats.get("form_last5_gf", 0.0),
        home_stats.get("season_gf_per_game", 0.0)
    ) if home_stats.get("played", 0) > 0 else 1.0

    form_def_away = get_form_factor_def(
        away_stats.get("form_last5_ga", 0.0),
        away_stats.get("season_ga_per_game", 0.0)
    ) if away_stats.get("played", 0) > 0 else 1.0

    form_atk_away = get_form_factor_atk(
        away_stats.get("form_last5_gf", 0.0),
        away_stats.get("season_gf_per_game", 0.0)
    ) if away_stats.get("played", 0) > 0 else 1.0

    form_def_home = get_form_factor_def(
        home_stats.get("form_last5_ga", 0.0),
        home_stats.get("season_ga_per_game", 0.0)
    ) if home_stats.get("played", 0) > 0 else 1.0

    xg_home = (league_home_goal_base
                * home_attack_str
                * away_defense_weakness
                * form_atk_home
                * form_def_away
                * HOME_FACTOR)

    xg_away = (league_away_goal_base
                * away_attack_str
                * home_defense_weakness
                * form_atk_away
                * form_def_home
                / HOME_FACTOR)

    xg_home = clamp(xg_home, 0.2, 4.5)
    xg_away = clamp(xg_away, 0.2, 4.5)

    # Banker's rounding (Python's built-in round() uses banker's rounding)
    pred_home = round(xg_home)
    pred_away = round(xg_away)

    diff = abs(xg_home - xg_away)
    if diff > 0.8:
        confidence = "high"
    elif diff > 0.4:
        confidence = "medium"
    else:
        confidence = "low"

    rationale = build_rationale(htid, atid, xg_home, xg_away, home_stats, away_stats)

    prefill_predictions[f["match_id"]] = {
        "home_score": pred_home,
        "away_score": pred_away,
        "xg_home": round(xg_home, 3),
        "xg_away": round(xg_away, 3),
        "confidence": confidence,
        "rationale": rationale,
    }
    predicted_count += 1

print(f"  Predictions generated: {predicted_count}")


# ---------------------------------------------------------------------------
# Step 4: Generate output files
# ---------------------------------------------------------------------------
print("\n=== Step 4: Writing output files ===")

generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

# --- teams.json ---
teams_out = sorted(team_map.values(), key=lambda t: t["name"])
teams_path = APP_DATA_DIR / "teams.json"
with open(teams_path, "w") as f:
    json.dump(teams_out, f, indent=2, ensure_ascii=False)
print(f"  Written: {teams_path} ({len(teams_out)} teams)")

# --- fixtures.json ---
fixtures_out = []
for f in fixtures:
    fixtures_out.append({
        "match_id": f["match_id"],
        "matchday": f["matchday"],
        "home_team_id": f["home_team_id"],
        "away_team_id": f["away_team_id"],
        "home_team": f["home_team"],
        "away_team": f["away_team"],
        "date": f["date"],
        "time": f["time"],
        "status": f["status"],
        "home_score": f["home_score"],
        "away_score": f["away_score"],
    })

fixtures_path = APP_DATA_DIR / "fixtures.json"
with open(fixtures_path, "w") as f:
    json.dump(fixtures_out, f, indent=2, ensure_ascii=False)
print(f"  Written: {fixtures_path} ({len(fixtures_out)} fixtures)")

# --- prefill_predictions.json ---
pred_path = APP_DATA_DIR / "prefill_predictions.json"
with open(pred_path, "w") as f:
    json.dump(prefill_predictions, f, indent=2, ensure_ascii=False)
print(f"  Written: {pred_path} ({len(prefill_predictions)} predictions)")

# --- baseline_table.json ---
# Compute table from played matches only
baseline = {}  # team_id -> row
for tid, info in team_map.items():
    baseline[tid] = {
        "team_id": tid,
        "team": info["name"],
        "played": 0,
        "wins": 0,
        "draws": 0,
        "losses": 0,
        "goals_for": 0,
        "goals_against": 0,
        "goal_diff": 0,
        "points": 0,
    }

for f in played_fixtures:
    htid = f["home_team_id"]
    atid = f["away_team_id"]
    hs = f["home_score"] or 0
    as_ = f["away_score"] or 0

    for tid, gf, ga in [(htid, hs, as_), (atid, as_, hs)]:
        if not tid or tid not in baseline:
            continue
        row = baseline[tid]
        row["played"] += 1
        row["goals_for"] += gf
        row["goals_against"] += ga
        row["goal_diff"] = row["goals_for"] - row["goals_against"]
        if gf > ga:
            row["wins"] += 1
            row["points"] += 3
        elif gf == ga:
            row["draws"] += 1
            row["points"] += 1
        else:
            row["losses"] += 1

# Sort and assign positions
table = sorted(
    baseline.values(),
    key=lambda r: (-r["points"], -r["goal_diff"], -r["goals_for"], r["team"])
)
for i, row in enumerate(table):
    row["position"] = i + 1

baseline_path = APP_DATA_DIR / "baseline_table.json"
with open(baseline_path, "w") as f:
    json.dump(table, f, indent=2, ensure_ascii=False)
print(f"  Written: {baseline_path} ({len(table)} teams)")

# --- data_version.json ---
version_data = {
    "generated_at": generated_at,
    "model_version": "v1.0.0",
    "source": "output/",
}
version_path = APP_DATA_DIR / "data_version.json"
with open(version_path, "w") as f:
    json.dump(version_data, f, indent=2)
print(f"  Written: {version_path}")

# --- qa_report.json ---
matchday_numbers = set(f["matchday"] for f in fixtures)
missing_scores = sum(
    1 for f in fixtures
    if f["status"] == "unplayed" and f["home_score"] is None
)
qa_report = {
    "total_teams": len(team_map),
    "total_fixtures": len(fixtures),
    "played_fixtures": len(played_fixtures),
    "unplayed_fixtures": len(unplayed_fixtures),
    "matchdays": len(matchday_numbers),
    "missing_scores": missing_scores,
    "generated_at": generated_at,
}
qa_path = APP_DATA_DIR / "qa_report.json"
with open(qa_path, "w") as f:
    json.dump(qa_report, f, indent=2)
print(f"  Written: {qa_path}")


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
print("\n=== Summary ===")
print(f"  Teams:              {len(teams_out)}")
print(f"  Total fixtures:     {len(fixtures_out)}")
print(f"  Played fixtures:    {len(played_fixtures)}")
print(f"  Unplayed fixtures:  {len(unplayed_fixtures)}")
print(f"  Predictions:        {predicted_count}")
print(f"  Baseline table:     {len(table)} teams")
print(f"  Matchdays:          {len(matchday_numbers)}")
print(f"  Generated at:       {generated_at}")
print("\nAll output/app_data/ files written successfully.")
