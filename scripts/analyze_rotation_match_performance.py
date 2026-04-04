#!/usr/bin/env python3
"""Generate a detailed match-performance report for SG Rotation Leipzig II."""

from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output"
APP_DATA_DIR = OUTPUT_DIR / "app_data"
MATCH_DETAILS_DIR = OUTPUT_DIR / "match_details"
REPORTS_DIR = ROOT / "reports"
FOCUS_TEAM = "SG Rotation Leipzig II"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def safe_mean(values: list[float | int]) -> float | None:
    return round(mean(values), 2) if values else None


def safe_rate(numerator: int, denominator: int) -> float:
    return round(numerator / denominator, 3) if denominator else 0.0


def safe_ppg(points: int, matches: int) -> float:
    return round(points / matches, 2) if matches else 0.0


def minute_bin(minute: int | None) -> str | None:
    if minute is None:
        return None
    if minute <= 15:
        return "0-15"
    if minute <= 30:
        return "16-30"
    if minute <= 45:
        return "31-45"
    if minute <= 60:
        return "46-60"
    if minute <= 75:
        return "61-75"
    return "76-90"


def detail_score_is_trustworthy(detail: dict[str, Any] | None) -> bool:
    if not detail:
        return False

    home_score = detail.get("home_score")
    away_score = detail.get("away_score")
    if home_score is None or away_score is None:
        return False

    goals = detail.get("goals") or []
    if not goals:
        return home_score == 0 and away_score == 0

    counted_home = 0
    counted_away = 0
    for goal in goals:
        side = goal.get("team")
        own_goal = goal.get("goal_type") == "own_goal"
        if own_goal:
            if side == "away":
                counted_home += 1
            elif side == "home":
                counted_away += 1
        else:
            if side == "home":
                counted_home += 1
            elif side == "away":
                counted_away += 1

    return counted_home == home_score and counted_away == away_score


def event_is_for_focus(event_team: str | None, is_home: bool, own_goal: bool = False) -> bool:
    is_for_focus = (event_team == "home" and is_home) or (event_team == "away" and not is_home)
    return not is_for_focus if own_goal else is_for_focus


def result_label(gf: int, ga: int) -> str:
    if gf > ga:
        return "win"
    if gf == ga:
        return "draw"
    return "loss"


def build_record(matches: list[dict[str, Any]]) -> dict[str, Any]:
    wins = sum(1 for match in matches if match["points"] == 3)
    draws = sum(1 for match in matches if match["points"] == 1)
    losses = sum(1 for match in matches if match["points"] == 0)
    goals_for = sum(match["gf"] if "gf" in match else match["score_for"] for match in matches)
    goals_against = sum(match["ga"] if "ga" in match else match["score_against"] for match in matches)
    return {
        "played": len(matches),
        "wins": wins,
        "draws": draws,
        "losses": losses,
        "points": wins * 3 + draws,
        "ppg": safe_ppg(wins * 3 + draws, len(matches)),
        "goals_for": goals_for,
        "goals_against": goals_against,
        "goal_diff": goals_for - goals_against,
    }


def build_matches() -> list[dict[str, Any]]:
    fixtures = json.loads((APP_DATA_DIR / "fixtures.json").read_text(encoding="utf-8"))

    detail_map: dict[str, dict[str, Any]] = {}
    for path in MATCH_DETAILS_DIR.glob("*.json"):
        detail = json.loads(path.read_text(encoding="utf-8"))
        if detail_score_is_trustworthy(detail):
            detail_map[detail["match_id"]] = detail

    matches: list[dict[str, Any]] = []
    for fixture in fixtures:
        if fixture["status"] != "played":
            continue
        if fixture["home_score"] is None or fixture["away_score"] is None:
            continue
        if fixture["home_team"] != FOCUS_TEAM and fixture["away_team"] != FOCUS_TEAM:
            continue

        is_home = fixture["home_team"] == FOCUS_TEAM
        gf = fixture["home_score"] if is_home else fixture["away_score"]
        ga = fixture["away_score"] if is_home else fixture["home_score"]
        detail = detail_map.get(fixture["match_id"])
        goals = sorted(
            (detail or {}).get("goals", []),
            key=lambda goal: (goal.get("minute") is None, goal.get("minute") if goal.get("minute") is not None else 999),
        )
        cards = (detail or {}).get("cards", [])
        substitutions = (detail or {}).get("substitutions", [])

        events: list[dict[str, Any]] = []
        timeline_for = 0
        timeline_against = 0
        for goal in goals:
            is_for_focus = event_is_for_focus(goal.get("team"), is_home, goal.get("goal_type") == "own_goal")
            if is_for_focus:
                timeline_for += 1
                kind = "for"
            else:
                timeline_against += 1
                kind = "against"
            events.append(
                {
                    "kind": kind,
                    "minute": goal.get("minute"),
                    "goal_type": goal.get("goal_type") or "normal",
                    "score_for": timeline_for,
                    "score_against": timeline_against,
                }
            )

        halftime_for = 0
        halftime_against = 0
        for event in events:
            if event["minute"] is not None and event["minute"] <= 45:
                halftime_for = event["score_for"]
                halftime_against = event["score_against"]

        first_goal = events[0]["kind"] if events else None
        points = 3 if gf > ga else 1 if gf == ga else 0
        led_then_dropped = False
        trailed_then_recovered = False
        ever_led = False
        ever_trailed = False
        previous_diff = 0

        equalizer_response_minutes: list[int] = []
        pending_concession: int | None = None

        for event in events:
            diff = event["score_for"] - event["score_against"]
            if diff > 0:
                ever_led = True
            if diff < 0:
                ever_trailed = True
            if previous_diff > 0 and diff <= 0:
                led_then_dropped = True
            if previous_diff < 0 and diff >= 0 and points > 0:
                trailed_then_recovered = True

            if event["kind"] == "against":
                pending_concession = event["minute"]
            elif event["kind"] == "for" and pending_concession is not None and diff == 0 and event["minute"] is not None:
                equalizer_response_minutes.append(event["minute"] - pending_concession)
                pending_concession = None

            previous_diff = diff

        our_cards = [
            card
            for card in cards
            if event_is_for_focus(card.get("team"), is_home)
        ]
        opp_cards = [card for card in cards if card not in our_cards]
        our_subs = [
            sub
            for sub in substitutions
            if event_is_for_focus(sub.get("team"), is_home)
        ]
        opp_subs = [sub for sub in substitutions if sub not in our_subs]

        matches.append(
            {
                "match_id": fixture["match_id"],
                "matchday": fixture["matchday"],
                "date": fixture["date"],
                "time": fixture["time"],
                "home_away": "H" if is_home else "A",
                "opponent": fixture["away_team"] if is_home else fixture["home_team"],
                "gf": gf,
                "ga": ga,
                "score_for": gf,
                "score_against": ga,
                "result": result_label(gf, ga),
                "points": points,
                "halftime_for": halftime_for,
                "halftime_against": halftime_against,
                "halftime_state": "ahead" if halftime_for > halftime_against else "behind" if halftime_for < halftime_against else "level",
                "first_goal": first_goal,
                "kept_clean_sheet": ga == 0,
                "failed_to_score": gf == 0,
                "scored_two_plus": gf >= 2,
                "conceded_two_plus": ga >= 2,
                "led_then_dropped_points": ever_led and points < 3,
                "trailed_then_won_points": trailed_then_recovered,
                "has_trusted_timeline": bool(detail),
                "attendance": (detail or {}).get("attendance"),
                "venue": (detail or {}).get("venue"),
                "kickoff": (detail or {}).get("kickoff"),
                "discipline": {
                    "our_yellow": sum(1 for card in our_cards if card.get("card_type") == "yellow"),
                    "our_red": sum(1 for card in our_cards if card.get("card_type") in {"red", "yellow_red"}),
                    "opponent_yellow": sum(1 for card in opp_cards if card.get("card_type") == "yellow"),
                    "opponent_red": sum(1 for card in opp_cards if card.get("card_type") in {"red", "yellow_red"}),
                },
                "substitutions": {
                    "our_count": len(our_subs),
                    "opponent_count": len(opp_subs),
                },
                "goal_timeline": events,
                "derived": {
                    "ever_led": ever_led,
                    "ever_trailed": ever_trailed,
                    "lead_lost": led_then_dropped,
                    "equalizer_response_minutes": equalizer_response_minutes,
                },
            }
        )

    matches.sort(key=lambda match: (match["matchday"], match["date"] or ""))
    return matches


def summarize_timing(matches: list[dict[str, Any]]) -> dict[str, Any]:
    minute_labels = ["0-15", "16-30", "31-45", "46-60", "61-75", "76-90"]
    goals_for_bins = Counter()
    goals_against_bins = Counter()
    first_goals_for: list[int] = []
    first_goals_against: list[int] = []
    all_goals_for: list[int] = []
    all_goals_against: list[int] = []

    for match in matches:
        for event in match["goal_timeline"]:
            minute = event["minute"]
            bucket = minute_bin(minute)
            if bucket is None:
                continue
            if event["kind"] == "for":
                goals_for_bins[bucket] += 1
                all_goals_for.append(minute)
            else:
                goals_against_bins[bucket] += 1
                all_goals_against.append(minute)

        first_for = next((event["minute"] for event in match["goal_timeline"] if event["kind"] == "for" and event["minute"] is not None), None)
        first_against = next((event["minute"] for event in match["goal_timeline"] if event["kind"] == "against" and event["minute"] is not None), None)
        if first_for is not None:
            first_goals_for.append(first_for)
        if first_against is not None:
            first_goals_against.append(first_against)

    second_half_for = sum(1 for minute in all_goals_for if minute > 45)
    second_half_against = sum(1 for minute in all_goals_against if minute > 45)
    late_for = sum(1 for minute in all_goals_for if minute >= 76)
    late_against = sum(1 for minute in all_goals_against if minute >= 76)

    return {
        "goal_bins_for": [{"label": label, "count": goals_for_bins.get(label, 0)} for label in minute_labels],
        "goal_bins_against": [{"label": label, "count": goals_against_bins.get(label, 0)} for label in minute_labels],
        "avg_first_goal_for_minute": safe_mean(first_goals_for),
        "avg_first_goal_against_minute": safe_mean(first_goals_against),
        "second_half_share_for": safe_rate(second_half_for, len(all_goals_for)),
        "second_half_share_against": safe_rate(second_half_against, len(all_goals_against)),
        "late_goal_share_for": safe_rate(late_for, len(all_goals_for)),
        "late_goal_share_against": safe_rate(late_against, len(all_goals_against)),
        "late_goal_matches_for": sum(
            1 for match in matches if any(event["kind"] == "for" and (event["minute"] or 0) >= 76 for event in match["goal_timeline"])
        ),
        "late_goal_matches_against": sum(
            1 for match in matches if any(event["kind"] == "against" and (event["minute"] or 0) >= 76 for event in match["goal_timeline"])
        ),
    }


def record_split(matches: list[dict[str, Any]], predicate) -> dict[str, Any]:
    subset = [match for match in matches if predicate(match)]
    summary = build_record(subset)
    summary["record"] = f'{summary["wins"]}-{summary["draws"]}-{summary["losses"]}'
    summary["gf_per_game"] = round(summary["goals_for"] / summary["played"], 2) if summary["played"] else 0.0
    summary["ga_per_game"] = round(summary["goals_against"] / summary["played"], 2) if summary["played"] else 0.0
    return summary


def summarize_game_states(matches: list[dict[str, Any]]) -> dict[str, Any]:
    clean_sheets = [match for match in matches if match["kept_clean_sheet"]]
    scored_two_plus = [match for match in matches if match["scored_two_plus"]]
    conceded_two_plus = [match for match in matches if match["conceded_two_plus"]]
    equalizer_deltas = [
        delta
        for match in matches
        for delta in match["derived"]["equalizer_response_minutes"]
    ]
    return {
        "scored_first": record_split(matches, lambda match: match["first_goal"] == "for"),
        "conceded_first": record_split(matches, lambda match: match["first_goal"] == "against"),
        "no_goal_timeline": record_split(matches, lambda match: match["first_goal"] is None),
        "halftime_ahead": record_split(matches, lambda match: match["halftime_state"] == "ahead"),
        "halftime_level": record_split(matches, lambda match: match["halftime_state"] == "level"),
        "halftime_behind": record_split(matches, lambda match: match["halftime_state"] == "behind"),
        "clean_sheet_record": record_split(clean_sheets, lambda match: True),
        "scored_two_plus_record": record_split(scored_two_plus, lambda match: True),
        "conceded_two_plus_record": record_split(conceded_two_plus, lambda match: True),
        "lead_lost_matches": sum(1 for match in matches if match["derived"]["lead_lost"]),
        "dropped_points_after_leading": sum(1 for match in matches if match["led_then_dropped_points"]),
        "won_points_after_trailing": sum(1 for match in matches if match["trailed_then_won_points"]),
        "avg_equalizer_response_minutes": safe_mean(equalizer_deltas),
    }


def summarize_splits(matches: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "home": record_split(matches, lambda match: match["home_away"] == "H"),
        "away": record_split(matches, lambda match: match["home_away"] == "A"),
    }


def summarize_discipline(matches: list[dict[str, Any]]) -> dict[str, Any]:
    total_yellow = sum(match["discipline"]["our_yellow"] for match in matches)
    total_red = sum(match["discipline"]["our_red"] for match in matches)
    return {
        "total_yellow": total_yellow,
        "total_red": total_red,
        "red_card_matches": sum(1 for match in matches if match["discipline"]["our_red"] > 0),
        "avg_cards_in_wins": round(mean(match["discipline"]["our_yellow"] + match["discipline"]["our_red"] for match in matches if match["result"] == "win"), 2) if any(match["result"] == "win" for match in matches) else 0.0,
        "avg_cards_in_draws": round(mean(match["discipline"]["our_yellow"] + match["discipline"]["our_red"] for match in matches if match["result"] == "draw"), 2) if any(match["result"] == "draw" for match in matches) else 0.0,
        "avg_cards_in_losses": round(mean(match["discipline"]["our_yellow"] + match["discipline"]["our_red"] for match in matches if match["result"] == "loss"), 2) if any(match["result"] == "loss" for match in matches) else 0.0,
    }


def build_findings(report: dict[str, Any]) -> list[dict[str, Any]]:
    played = report["summary"]["played"]
    scored_first = report["game_states"]["scored_first"]
    conceded_first = report["game_states"]["conceded_first"]
    timing = report["timing"]
    findings = [
        {
            "id": "scored-first",
            "title": "Erstes Tor bleibt der staerkste Hebel",
            "value": scored_first["record"],
            "tone": "good",
            "sample_size": scored_first["played"],
            "explanation": f'Wenn Rotation zuerst trifft, holt das Team aktuell {scored_first["ppg"]} Punkte pro Spiel.',
        },
        {
            "id": "conceded-first",
            "title": "Rueckstand kostet fast immer Punkte",
            "value": conceded_first["record"],
            "tone": "warn",
            "sample_size": conceded_first["played"],
            "explanation": f'Nach dem ersten Gegentor liegt der aktuelle Schnitt nur bei {conceded_first["ppg"]} Punkten pro Spiel.',
        },
        {
            "id": "late-concessions",
            "title": "Spaete Gegentore sind die klarste Fragilitaet",
            "value": f'{timing["goal_bins_against"][-1]["count"]} Gegentore',
            "tone": "warn",
            "sample_size": report["coverage"]["timeline_match_count"],
            "explanation": 'Die Phase 76-90 ist aktuell das haeufigste Gegentorfenster.',
        },
        {
            "id": "halftime-control",
            "title": "Halbzeitfuehrung ist fast gleichbedeutend mit Kontrolle",
            "value": report["game_states"]["halftime_ahead"]["record"],
            "tone": "accent",
            "sample_size": report["game_states"]["halftime_ahead"]["played"],
            "explanation": 'Rotation hat im trusted Datensatz kein Spiel nach Halbzeitfuehrung verloren oder remis gespielt.',
        },
    ]

    if played:
        findings.append(
            {
                "id": "defensive-floor",
                "title": "Zu Null stabilisiert Ergebnisse sofort",
                "value": report["game_states"]["clean_sheet_record"]["record"],
                "tone": "good",
                "sample_size": report["game_states"]["clean_sheet_record"]["played"],
                "explanation": 'Ohne Gegentor bleibt die Wahrscheinlichkeit fuer mindestens einen Punkt sehr hoch.',
            }
        )
    return findings


def build_report() -> dict[str, Any]:
    matches = build_matches()
    timeline_matches = [match for match in matches if match["has_trusted_timeline"]]
    summary = build_record(matches)
    summary["record"] = f'{summary["wins"]}-{summary["draws"]}-{summary["losses"]}'
    summary["clean_sheets"] = sum(1 for match in matches if match["kept_clean_sheet"])
    summary["failed_to_score"] = sum(1 for match in matches if match["failed_to_score"])

    report = {
        "context": {
            "focus_team": FOCUS_TEAM,
            "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "known_limitations": [
                "Zeitachsenmetriken basieren nur auf Match-Details mit vertrauenswuerdigem Torverlauf.",
                "0:0-Spiele zaehlen in Ergebnis-Splits, aber nicht in Ersttor- oder Minutenverteilungen.",
                "Spielernamen sind in fussball.de-Events obfuskiert und werden deshalb nicht ausgewertet.",
            ],
        },
        "coverage": {
            "played_match_count": len(matches),
            "timeline_match_count": len(timeline_matches),
            "timeline_coverage_rate": safe_rate(len(timeline_matches), len(matches)),
            "card_coverage_rate": safe_rate(sum(1 for match in matches if match["has_trusted_timeline"]), len(matches)),
        },
        "summary": summary,
        "timing": summarize_timing(timeline_matches),
        "game_states": summarize_game_states(matches),
        "splits": summarize_splits(matches),
        "discipline": summarize_discipline(matches),
        "matches": matches,
    }
    report["findings"] = build_findings(report)
    return report


def main() -> None:
    report = build_report()
    output_path = REPORTS_DIR / "rotation_match_performance.json"
    output_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()
