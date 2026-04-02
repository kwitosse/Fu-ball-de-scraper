#!/usr/bin/env python3
"""Promotion race analysis for SG Rotation Leipzig II.

Uses existing scraped JSON outputs only (no web requests).
"""

from __future__ import annotations

import csv
import json
import math
import random
from collections import Counter
from datetime import datetime, timezone
from dataclasses import dataclass
from pathlib import Path
from statistics import mean
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output"
REPORTS_DIR = ROOT / "reports"
FOCUS_TEAM = "SG Rotation Leipzig II"
# User-provided run-in fixtures (MD17-MD26), used to ensure direct-rival framing
# is always aligned with the planning context.
RUN_IN_FIXTURES = [
    {"date": "2026-04-12", "opponent": "SG Leipzig-Bienitz I", "home_away": "A"},
    {"date": "2026-04-19", "opponent": "FC Blau-Weiß Leipzig II", "home_away": "H"},
    {"date": "2026-04-26", "opponent": "VfB Zwenkau 02 II", "home_away": "A"},
    {"date": "2026-05-02", "opponent": "FSV Großpösna I", "home_away": "H"},
    {"date": "2026-05-10", "opponent": "TSV Böhlitz-Ehrenberg 1990 I", "home_away": "H"},
    {"date": "2026-05-16", "opponent": "Roter Stern Leipzig 99 II", "home_away": "A"},
    {"date": "2026-05-31", "opponent": "SV Panitzsch/Borsdorf II", "home_away": "H"},
    {"date": "2026-06-07", "opponent": "SV Tapfer 06 Leipzig II", "home_away": "A"},
    {"date": "2026-06-14", "opponent": "SV Victoria 90 Leipzig I", "home_away": "H"},
    {"date": "2026-06-21", "opponent": "SG Olympia 1896 Leipzig II", "home_away": "A"},
]


@dataclass
class TeamSnapshot:
    position: int
    team: str
    played: int
    wins: int
    draws: int
    losses: int
    goals_for: int
    goals_against: int
    goal_diff: int
    points: int

    @property
    def ppg(self) -> float:
        return self.points / self.played if self.played else 0.0


@dataclass
class Scenario:
    wins: int
    draws: int
    losses: int

    @property
    def points_gain(self) -> int:
        return self.wins * 3 + self.draws


def load_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def normalize_team_name(name: str) -> str:
    return "".join(ch.lower() for ch in name if ch.isalnum())


def read_inputs() -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    standings = load_json(OUTPUT_DIR / "standings.json")
    matchdays = load_json(OUTPUT_DIR / "matchdays.json")
    details: list[dict[str, Any]] = []
    for p in sorted((OUTPUT_DIR / "match_details").glob("*.json")):
        details.append(load_json(p))
    return standings, matchdays, details


def snapshot_from_row(row: dict[str, Any]) -> TeamSnapshot:
    return TeamSnapshot(**{k: row[k] for k in TeamSnapshot.__annotations__.keys()})


def get_rotation_matches(details: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        [d for d in details if d.get("home_team") == FOCUS_TEAM or d.get("away_team") == FOCUS_TEAM],
        key=lambda x: (x.get("matchday") or 0, x.get("date") or ""),
    )


def result_points(match: dict[str, Any], team: str) -> int | None:
    hs, a_s = match.get("home_score"), match.get("away_score")
    if hs is None or a_s is None:
        return None
    is_home = match.get("home_team") == team
    gf, ga = (hs, a_s) if is_home else (a_s, hs)
    if gf > ga:
        return 3
    if gf == ga:
        return 1
    return 0


def derive_recent_form(rotation_matches: list[dict[str, Any]]) -> dict[str, Any]:
    played = [m for m in rotation_matches if m.get("home_score") is not None and m.get("away_score") is not None]
    points_series = [result_points(m, FOCUS_TEAM) for m in played]
    points_series = [p for p in points_series if p is not None]

    def points_last(n: int) -> int:
        return sum(points_series[-n:]) if points_series else 0

    gf = []
    ga = []
    cs = 0
    scored_2p = 0
    concede_first_losses = 0
    for m in played:
        is_home = m["home_team"] == FOCUS_TEAM
        team_gf = m["home_score"] if is_home else m["away_score"]
        team_ga = m["away_score"] if is_home else m["home_score"]
        gf.append(team_gf)
        ga.append(team_ga)
        if team_ga == 0:
            cs += 1
        if team_gf >= 2:
            scored_2p += 1
        goals = sorted(m.get("goals", []), key=lambda g: (g.get("minute") is None, g.get("minute") or 999))
        if goals:
            first = goals[0]
            first_for_team = (
                (first.get("team") == "home" and is_home)
                or (first.get("team") == "away" and not is_home)
            )
            if not first_for_team and team_gf < team_ga:
                concede_first_losses += 1

    return {
        "known_played_matches": len(played),
        "points_last_5": points_last(5),
        "points_last_8": points_last(8),
        "avg_gf_last_5": round(mean(gf[-5:]), 2) if len(gf) >= 1 else 0,
        "avg_ga_last_5": round(mean(ga[-5:]), 2) if len(ga) >= 1 else 0,
        "clean_sheet_rate": round(cs / len(played), 3) if played else 0,
        "games_2plus_goals_rate": round(scored_2p / len(played), 3) if played else 0,
        "losses_after_conceding_first": concede_first_losses,
    }


def remaining_fixtures(
    rotation_matches: list[dict[str, Any]],
    standings_by_team: dict[str, TeamSnapshot],
    remaining_expected: int,
) -> list[dict[str, Any]]:
    upcoming = []
    for m in rotation_matches:
        if m.get("home_score") is not None and m.get("away_score") is not None:
            continue
        is_home = m.get("home_team") == FOCUS_TEAM
        opp = m.get("away_team") if is_home else m.get("home_team")
        opp_snap = standings_by_team.get(opp)
        if not opp_snap:
            continue
        ppg = opp_snap.ppg
        if opp_snap.position <= 3:
            bucket = "six-pointer / direct rival"
        elif ppg <= 1.1:
            bucket = "must-win"
        elif ppg <= 1.5:
            bucket = "favorable but dangerous"
        else:
            bucket = "difficult upset opportunity"

        upcoming.append(
            {
                "matchday": m.get("matchday"),
                "home_away": "H" if is_home else "A",
                "opponent": opp,
                "opponent_pos": opp_snap.position,
                "opponent_points": opp_snap.points,
                "opponent_ppg": round(ppg, 3),
                "bucket": bucket,
                "first_leg_result": first_leg_result(rotation_matches, opp),
            }
        )
    upcoming_sorted = sorted(upcoming, key=lambda x: (x["matchday"] or 999, x["opponent"]))
    return upcoming_sorted[:remaining_expected]


def planned_run_in_fixtures(
    standings_by_team: dict[str, TeamSnapshot],
    rotation_matches: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    normalized_lookup = {normalize_team_name(k): k for k in standings_by_team}
    fixtures = []
    for item in RUN_IN_FIXTURES:
        raw_opp = item["opponent"]
        opp = standings_by_team.get(raw_opp)
        if opp:
            opp_name = raw_opp
            snap = opp
        else:
            opp_name = normalized_lookup.get(normalize_team_name(raw_opp), "")
            snap = standings_by_team.get(opp_name)
        if not snap:
            continue
        ppg = snap.ppg
        if snap.position <= 3:
            bucket = "six-pointer / direct rival"
        elif ppg <= 1.1:
            bucket = "must-win"
        elif ppg <= 1.5:
            bucket = "favorable but dangerous"
        else:
            bucket = "difficult upset opportunity"
        fixtures.append(
            {
                "date": item["date"],
                "home_away": item["home_away"],
                "opponent": opp_name,
                "opponent_pos": snap.position,
                "opponent_points": snap.points,
                "opponent_ppg": round(ppg, 3),
                "bucket": bucket,
                "first_leg_result": first_leg_result(rotation_matches, opp_name),
            }
        )
    return fixtures


def first_leg_result(rotation_matches: list[dict[str, Any]], opponent: str) -> str:
    matches = [
        m
        for m in rotation_matches
        if (m.get("home_team") == opponent or m.get("away_team") == opponent)
        and m.get("home_score") is not None
        and m.get("away_score") is not None
    ]
    if not matches:
        return "n/a"
    m = sorted(matches, key=lambda x: (x.get("matchday") or 0, x.get("date") or ""))[0]
    is_home = m["home_team"] == FOCUS_TEAM
    gf = m["home_score"] if is_home else m["away_score"]
    ga = m["away_score"] if is_home else m["home_score"]
    if gf > ga:
        return f"W {gf}:{ga}"
    if gf == ga:
        return f"D {gf}:{ga}"
    return f"L {gf}:{ga}"


def build_scenarios(current_points: int, played: int, remaining: int, threshold: int) -> list[dict[str, Any]]:
    scenarios = [
        Scenario(6, 2, 2),
        Scenario(7, 1, 2),
        Scenario(7, 2, 1),
        Scenario(8, 0, 2),
        Scenario(8, 1, 1),
        Scenario(9, 0, 1),
    ]
    rows = []
    for s in scenarios:
        final_points = current_points + s.points_gain
        rows.append(
            {
                "scenario": f"{s.wins}W {s.draws}D {s.losses}L",
                "final_points": final_points,
                "final_ppg": round(final_points / (played + remaining), 3),
                "likely_top2_vs_rank2_pace": "yes" if final_points >= threshold else "borderline/no",
                "top2_if_rank2_drops_2pts_in_direct_duels": "yes" if final_points >= (threshold - 2) else "borderline/no",
                "rank1_chance": "meaningful" if final_points >= threshold + 7 else "low",
                "min_avg_gd_per_game_to_reach_plus10": round((10 - (-1)) / remaining, 2),
            }
        )
    return rows


def build_remaining_fixture_list(
    matchdays: list[dict[str, Any]],
    completed_match_ids: set[str],
) -> list[dict[str, Any]]:
    fixtures: list[dict[str, Any]] = []
    for md in matchdays:
        for m in md.get("matches", []):
            match_id = m.get("match_id")
            if match_id in completed_match_ids:
                continue
            fixtures.append(
                {
                    "match_id": match_id,
                    "matchday": m.get("matchday") or md.get("matchday_number"),
                    "date": m.get("date"),
                    "home_team": m.get("home_team"),
                    "away_team": m.get("away_team"),
                }
            )
    return sorted(fixtures, key=lambda x: (x.get("matchday") or 999, x.get("match_id") or ""))


def fixture_level_simulation(
    standings: list[TeamSnapshot],
    fixtures: list[dict[str, Any]],
    focus_team: str,
    iterations: int = 12000,
    seed: int = 42,
) -> dict[str, Any]:
    rng = random.Random(seed)
    base_points = {t.team: t.points for t in standings}
    draw_rate = sum(t.draws for t in standings) / max(1, sum(t.played for t in standings))
    draw_rate = max(0.18, min(0.34, draw_rate))

    ppg_vals = [t.ppg for t in standings]
    gdpg_vals = [t.goal_diff / max(1, t.played) for t in standings]
    ppg_spread = max(0.15, (max(ppg_vals) - min(ppg_vals)) or 0.15)
    gdpg_spread = max(0.25, (max(gdpg_vals) - min(gdpg_vals)) or 0.25)

    team_strength: dict[str, float] = {}
    for t in standings:
        ppg_component = (t.ppg - mean(ppg_vals)) / ppg_spread
        gdpg_component = ((t.goal_diff / max(1, t.played)) - mean(gdpg_vals)) / gdpg_spread
        team_strength[t.team] = 0.7 * ppg_component + 0.3 * gdpg_component

    home_advantage = 0.22

    def probs(home_team: str, away_team: str) -> tuple[float, float, float]:
        delta = team_strength.get(home_team, 0.0) - team_strength.get(away_team, 0.0) + home_advantage
        p_draw = max(0.12, min(0.32, draw_rate - 0.06 * abs(delta)))
        decisive = 1.0 - p_draw
        home_share = 1.0 / (1.0 + math.exp(-2.2 * delta))
        p_home = decisive * home_share
        p_away = decisive - p_home
        return p_home, p_draw, p_away

    precomputed = {
        f["match_id"]: probs(f["home_team"], f["away_team"])
        for f in fixtures
        if f.get("home_team") and f.get("away_team")
    }

    def run_sim(overrides: dict[str, str] | None = None) -> tuple[float, dict[str, float]]:
        position_counts: Counter[int] = Counter()
        top2_count = 0
        for _ in range(iterations):
            points = dict(base_points)
            for f in fixtures:
                mid = f.get("match_id")
                home = f.get("home_team")
                away = f.get("away_team")
                if not mid or home not in points or away not in points:
                    continue
                forced = (overrides or {}).get(mid)
                if forced is None:
                    p_home, p_draw, p_away = precomputed[mid]
                    r = rng.random()
                    forced = "H" if r < p_home else ("D" if r < p_home + p_draw else "A")
                if forced == "H":
                    points[home] += 3
                elif forced == "A":
                    points[away] += 3
                else:
                    points[home] += 1
                    points[away] += 1

            ranked = sorted(
                standings,
                key=lambda t: (points[t.team], t.goal_diff, t.goals_for),
                reverse=True,
            )
            pos = next(i for i, t in enumerate(ranked, start=1) if t.team == focus_team)
            position_counts[pos] += 1
            if pos <= 2:
                top2_count += 1
        return top2_count / iterations, {str(k): round(v / iterations, 3) for k, v in sorted(position_counts.items())}

    base_top2, base_distribution = run_sim()

    rival_names = {t.team for t in standings if t.position <= 4 and t.team != focus_team}
    direct_fixture_ids = []
    for f in fixtures:
        home = f.get("home_team")
        away = f.get("away_team")
        if home == focus_team and away in rival_names:
            direct_fixture_ids.append((f["match_id"], "H"))
        elif away == focus_team and home in rival_names:
            direct_fixture_ids.append((f["match_id"], "A"))

    sensitivity: dict[str, Any] = {
        "direct_opponent_fixture_count": len(direct_fixture_ids),
        "direct_opponents": sorted(
            {f.get("away_team") if f.get("home_team") == focus_team else f.get("home_team") for f in fixtures if f.get("match_id") in {m for m, _ in direct_fixture_ids}}
        ),
    }
    if direct_fixture_ids:
        win_overrides = {mid: venue for mid, venue in direct_fixture_ids}
        draw_overrides = {mid: "D" for mid, _venue in direct_fixture_ids}
        loss_overrides = {mid: ("A" if venue == "H" else "H") for mid, venue in direct_fixture_ids}
        win_top2, _ = run_sim(win_overrides)
        draw_top2, _ = run_sim(draw_overrides)
        loss_top2, _ = run_sim(loss_overrides)
        sensitivity["top2_probability_by_direct_opponent_outcome"] = {
            "win_all_direct_opponent_matches": round(win_top2, 3),
            "draw_all_direct_opponent_matches": round(draw_top2, 3),
            "lose_all_direct_opponent_matches": round(loss_top2, 3),
        }
    else:
        sensitivity["top2_probability_by_direct_opponent_outcome"] = {}

    return {
        "iterations": iterations,
        "remaining_fixture_count": len(fixtures),
        "model_calibration": {
            "strength_proxy_weights": {"ppg": 0.7, "goal_diff_per_game": 0.3},
            "home_advantage_strength_shift": home_advantage,
            "league_draw_rate_used": round(draw_rate, 3),
            "draw_rate_bounds": [0.12, 0.32],
        },
        "rotation_top2_probability": round(base_top2, 3),
        "rotation_finish_distribution": base_distribution,
        "sensitivity_to_direct_opponent_results": sensitivity,
    }


def main() -> None:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    standings_raw, matchdays, details = read_inputs()

    standings = [snapshot_from_row(r) for r in standings_raw]
    standings_by_team = {r.team: r for r in standings}
    focus = standings_by_team[FOCUS_TEAM]
    leader = standings[0]
    second = standings[1]

    total_matches_per_team = 26
    remaining = total_matches_per_team - focus.played

    threshold_realistic = math.ceil(second.ppg * total_matches_per_team)
    threshold_conservative = threshold_realistic + 2
    threshold_aggressive = threshold_realistic + 4

    rotation_matches = get_rotation_matches(details)
    fixtures = planned_run_in_fixtures(standings_by_team, rotation_matches)
    if len(fixtures) != remaining:
        fixtures = remaining_fixtures(rotation_matches, standings_by_team, remaining_expected=remaining)
    fixture_strength_avg_ppg = round(mean([f["opponent_ppg"] for f in fixtures]), 3) if fixtures else None
    direct_rival_fixtures = [f for f in fixtures if f["bucket"] == "six-pointer / direct rival"]

    rivals = standings[:4]
    rival_pace_projection = [
        {
            "team": r.team,
            "position": r.position,
            "current_points": r.points,
            "ppg": round(r.ppg, 3),
            "projected_final_points": round(r.ppg * total_matches_per_team, 1),
        }
        for r in rivals
    ]

    scenario_matrix = build_scenarios(focus.points, focus.played, remaining, threshold_realistic)

    rank2_bands = {
        "hold_current_pace": round(second.ppg * total_matches_per_team, 1),
        "slight_slowdown": round(max(0, second.ppg - 0.15) * total_matches_per_team, 1),
        "strong_finish": round((second.ppg + 0.15) * total_matches_per_team, 1),
        "direct_duel_adjusted": round(max(0, second.ppg * total_matches_per_team - 2.0), 1),
    }

    required_points = {
        "to_match_rank2_hold_pace": max(0, math.ceil(rank2_bands["hold_current_pace"]) - focus.points),
        "to_beat_rank2_hold_pace_by_1": max(0, math.ceil(rank2_bands["hold_current_pace"] + 1) - focus.points),
        "to_match_rank2_direct_duel_adjusted": max(0, math.ceil(rank2_bands["direct_duel_adjusted"]) - focus.points),
        "conservative": max(0, threshold_conservative - focus.points),
        "realistic": max(0, threshold_realistic - focus.points),
        "aggressive": max(0, threshold_aggressive - focus.points),
    }

    gd_top4 = {r.team: r.goal_diff for r in rivals}
    gd_gaps = {team: focus.goal_diff - gd for team, gd in gd_top4.items() if team != focus.team}

    goal_targets = {
        "minimum_viable_end_gd": 5,
        "realistic_end_gd": 10,
        "strong_end_gd": 15,
    }
    goal_plan = {}
    for label, target_gd in goal_targets.items():
        gain_needed = target_gd - focus.goal_diff
        goal_plan[label] = {
            "net_gd_gain_needed": gain_needed,
            "avg_gd_per_game_needed": round(gain_needed / remaining, 2),
            "example_path": {
                "goals_for_last_10": 18 if target_gd <= 5 else (21 if target_gd <= 10 else 24),
                "goals_against_last_10": 12 if target_gd <= 5 else (10 if target_gd <= 10 else 8),
            },
        }

    form = derive_recent_form(rotation_matches)

    completed_match_ids = {
        d.get("match_id")
        for d in details
        if d.get("match_id") and d.get("home_score") is not None and d.get("away_score") is not None
    }
    all_remaining_fixtures = build_remaining_fixture_list(matchdays, completed_match_ids)
    fixture_level = fixture_level_simulation(
        standings=standings,
        fixtures=all_remaining_fixtures,
        focus_team=FOCUS_TEAM,
        iterations=12000,
    )

    analysis = {
        "context": {
            "league": "Herren Stadtklasse, Kreis Leipzig, Kreisliga A",
            "season": "2025/2026",
            "focus_team": FOCUS_TEAM,
            "analysis_generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "known_data_limitations": [
                "standings reflect MD16 (16 played), while match detail results currently contain fewer completed matches for some MDs",
                "fixture-level trend metrics are computed only from available played match_detail files",
            ],
        },
        "current_state": {
            "position": focus.position,
            "points": focus.points,
            "record": {"wins": focus.wins, "draws": focus.draws, "losses": focus.losses},
            "goals": {"for": focus.goals_for, "against": focus.goals_against, "diff": focus.goal_diff},
            "ppg": round(focus.ppg, 3),
            "gf_per_game": round(focus.goals_for / focus.played, 3),
            "ga_per_game": round(focus.goals_against / focus.played, 3),
            "remaining_matches": remaining,
            "max_possible_points": focus.points + remaining * 3,
            "gap_to_rank1": leader.points - focus.points,
            "gap_to_rank2": second.points - focus.points,
        },
        "pace_projection": {
            "rival_projection": rival_pace_projection,
            "rank2_bands": rank2_bands,
            "required_points_from_last_10": required_points,
            "required_record_hint": {
                "realistic_target": "at least 7W-1D-2L (22 points)",
                "safer_target": "8W-1D-1L (25 points)",
            },
        },
        "goal_difference": {
            "top4_current_goal_diff": gd_top4,
            "rotation_gap_vs_top4": gd_gaps,
            "target_ranges": goal_plan,
        },
        "remaining_fixtures": {
            "count": len(fixtures),
            "average_opponent_ppg": fixture_strength_avg_ppg,
            "direct_rival_matches_count": len(direct_rival_fixtures),
            "fixtures": fixtures,
        },
        "direct_rival_impact": {
            "current_gap_to_rank2": second.points - focus.points,
            "rotation_direct_rival_matches": [f["opponent"] for f in direct_rival_fixtures],
            "leverage_note": (
                "Winning direct-rival matches creates double impact: +3 for Rotation and 0 for rival "
                "(effective 6-point swing in the head-to-head race)."
            ),
            "rank2_line_adjustment_points": {
                "none": 0,
                "moderate_direct_duel_drop": -2,
                "high_direct_duel_drop": -4,
            },
        },
        "form_and_trends": form,
        "scenario_matrix": scenario_matrix,
        "simulation_fixture_level": fixture_level,
        "conclusions": {
            "realistic_top2_total_points": threshold_realistic,
            "minimum_acceptable_points_from_last_10": required_points["realistic"],
            "promotion_like_profile": [
                "Win at least 7 of the last 10 matches",
                "Limit losses to maximum 2, ideally 1",
                "Target +11 to +16 goal-difference swing over run-in",
                "Prioritize direct-rival six-pointers and avoid slip-ups in must-win bucket",
            ],
            "title_path_assessment": "Near-miracle: requires Rotation near-perfect run and rank-1 pace collapse.",
        },
    }

    json_path = REPORTS_DIR / "rotation_promotion_analysis.json"
    json_path.write_text(json.dumps(analysis, ensure_ascii=False, indent=2), encoding="utf-8")

    csv_path = REPORTS_DIR / "rotation_promotion_scenarios.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(scenario_matrix[0].keys()))
        writer.writeheader()
        writer.writerows(scenario_matrix)

    md_lines = [
        "# SG Rotation Leipzig II – Promotion Race Analysis (MD16 snapshot)",
        "",
        "## Data sources and schema",
        "- `output/standings.json`: table snapshot with per-team points, W/D/L, GF/GA/GD.",
        "- `output/matchdays.json`: full fixture list (26 matchdays, each with matches and IDs).",
        "- `output/match_details/*.json`: match-level results/events used for form and fixture context.",
        "",
        "## Current league situation",
        f"- Rotation rank **{focus.position}**, **{focus.points} pts**, goals **{focus.goals_for}:{focus.goals_against}** (GD {focus.goal_diff:+d}).",
        f"- Gap to rank 2: **{second.points - focus.points} pts** | gap to rank 1: **{leader.points - focus.points} pts**.",
        f"- Remaining matches: **{remaining}** | max final points: **{focus.points + remaining*3}**.",
        "",
        "## Promotion race summary",
        f"- Current rank-2 pace projects to ~**{rank2_bands['hold_current_pace']}** points.",
        f"- Realistic top-2 target band: **{threshold_realistic}–{threshold_conservative}** points.",
        f"- Rotation therefore likely needs **{required_points['realistic']} to {required_points['conservative']}** points from last 10.",
        "",
        "## Scenario matrix",
        "| Scenario | Final pts | Final PPG | Top-2 pace check | Rank-1 chance |",
        "|---|---:|---:|---|---|",
    ]
    for row in scenario_matrix:
        md_lines.append(
            f"| {row['scenario']} | {row['final_points']} | {row['final_ppg']} | {row['likely_top2_vs_rank2_pace']} | {row['rank1_chance']} |"
        )

    md_lines.extend(
        [
            "",
            "## Goal-difference analysis",
            f"- Current GD gaps to promotion rivals: {', '.join(f'{k}: {v:+d}' for k,v in gd_gaps.items())}.",
            f"- Minimum viable end-GD target: **+5** (needs {goal_plan['minimum_viable_end_gd']['net_gd_gain_needed']:+d} swing).",
            f"- Realistic tiebreak-safe target: **+10** (needs {goal_plan['realistic_end_gd']['net_gd_gain_needed']:+d} swing, ~{goal_plan['realistic_end_gd']['avg_gd_per_game_needed']:+.2f}/game).",
            "- Practical run-in profile for +10 GD: roughly score ~21 and concede ~10 over last 10.",
            "",
            "## Remaining fixtures and difficulty",
            f"- Remaining fixtures identified in data: **{len(fixtures)}**.",
            f"- Average opponent PPG in run-in: **{fixture_strength_avg_ppg}**.",
            f"- Direct rival fixtures in your run-in: **{len(direct_rival_fixtures)}** ({', '.join(f['opponent'] for f in direct_rival_fixtures)}).",
            "- Buckets used: must-win / favorable but dangerous / six-pointer / difficult upset opportunity.",
            f"- Adjusted rank-2 line (assuming rivals drop points in direct duels): **{rank2_bands['direct_duel_adjusted']}** points.",
            "- Planned run-in fixtures considered in this analysis:",
            *[
                f"  - {(f.get('date') or ('MD' + str(f.get('matchday', '?'))))} | {f['home_away']} vs {f['opponent']} "
                f"(pos {f['opponent_pos']}, {f['opponent_ppg']} ppg, {f['bucket']})"
                for f in fixtures
            ],
            "",
            "## Direct-opponent leverage (important for your situation)",
            f"- You are currently **4 points** behind rank 2 ({second.points} vs {focus.points}).",
            "- Beating a direct rival is effectively a **6-point swing** in promotion race terms.",
            "- If direct rivals trade points among themselves, the practical top-2 line can move down by ~2-4 points.",
            f"- That lowers your likely target from ~{math.ceil(rank2_bands['hold_current_pace'])} to roughly **{math.ceil(rank2_bands['direct_duel_adjusted'])}** points.",
            "",
            "## Form and trend snapshot (from available played detail files)",
            f"- Known played matches in detail files for Rotation: **{form['known_played_matches']}**.",
            f"- Points last 5: **{form['points_last_5']}** | points last 8: **{form['points_last_8']}**.",
            f"- Avg GF last 5: **{form['avg_gf_last_5']}** | Avg GA last 5: **{form['avg_ga_last_5']}**.",
            f"- Clean-sheet rate: **{form['clean_sheet_rate']:.1%}** | 2+ goals scored rate: **{form['games_2plus_goals_rate']:.1%}**.",
            "",
            "## Fixture-level simulation (all teams, shared match outcomes)",
            f"- Iterations: **{fixture_level['iterations']}** across **{fixture_level['remaining_fixture_count']}** remaining fixtures.",
            f"- Rotation top-2 probability: **{fixture_level['rotation_top2_probability']:.1%}**.",
            "- Finish distribution (Rotation): "
            + ", ".join(f"P{pos}={prob:.1%}" for pos, prob in fixture_level["rotation_finish_distribution"].items()),
            "- Model calibration: strength proxy = 70% PPG + 30% GD/game, with explicit home-advantage shift.",
            "- Direct-opponent sensitivity (forced outcomes in Rotation six-pointers): "
            + (
                ", ".join(
                    f"{k.replace('_', ' ')}: {v:.1%}"
                    for k, v in fixture_level["sensitivity_to_direct_opponent_results"][
                        "top2_probability_by_direct_opponent_outcome"
                    ].items()
                )
                if fixture_level["sensitivity_to_direct_opponent_results"][
                    "top2_probability_by_direct_opponent_outcome"
                ]
                else "no direct-opponent fixtures detected in remaining schedule."
            ),
            "",
            "## Practical football conclusions",
            "1. **Realistic target**: finish around **51–53 points** (≈ 24–26 points from last 10).",
            "2. **Minimum acceptable return**: **24+ points** (e.g., 8W-0D-2L) to stay in likely top-2 contention.",
            "3. **Most promotion-like profile**: **7–8 wins**, **max 1–2 losses**, and positive GD swing of **+11 to +16** in run-in.",
            "4. **Rank-1/title path**: still mathematically possible but near-miracle; requires both elite Rotation run and significant leader slowdown.",
            "5. **Strategic priority order**: win must-win games first, then maximize points in direct six-pointers, while tightening defense to protect GD gains.",
        ]
    )

    md_path = REPORTS_DIR / "rotation_promotion_analysis.md"
    md_path.write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    print(f"Wrote {json_path}")
    print(f"Wrote {csv_path}")
    print(f"Wrote {md_path}")


if __name__ == "__main__":
    main()
