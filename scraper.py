#!/usr/bin/env python3
"""
fussball.de Kreisliga A Leipzig scraper
========================================

Scrapes all match data for the Herren Stadtklasse Kreis Leipzig 25/26 league:
  - All 26 matchdays with match schedules and results
  - Per-match events: goals (minute, scorer, type), yellow/red cards
  - Current league standings/leaderboard
  - Top scorers list

Usage examples:
  python scraper.py                         # Scrape everything
  python scraper.py --standings             # Only standings table
  python scraper.py --matchdays             # All matchday schedules
  python scraper.py --top-scorers           # Top scorers list
  python scraper.py --match-details         # Match event details (slow: ~182 pages)
  python scraper.py --matchday 5            # Single matchday schedule
  python scraper.py --match-id <MATCH_ID>   # Single match detail
  python scraper.py --all --no-details      # Everything except match details
  python scraper.py --delay 2.0             # Custom request delay (seconds)
  python scraper.py --resume                # Skip match details already saved
"""

import argparse
import json
import logging
import sys
from datetime import datetime
from pathlib import Path

from models import to_dict, Matchday
from scrapers.base import BaseScraper
from scrapers.matchdays import MatchdaysScraper
from scrapers.standings import StandingsScraper
from scrapers.match_detail import MatchDetailScraper
from scrapers.top_scorers import TopScorersScraper

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("scraper")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def save_json(data, filepath: Path) -> None:
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(to_dict(data), f, ensure_ascii=False, indent=2)
    print(f"  -> Saved: {filepath}")


def load_json(filepath: Path):
    if not filepath.exists():
        return None
    with open(filepath, encoding="utf-8") as f:
        return json.load(f)


def print_header(title: str) -> None:
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")


# ---------------------------------------------------------------------------
# Scrape tasks
# ---------------------------------------------------------------------------

def run_standings(base: BaseScraper, output_dir: Path):
    print_header("Scraping Standings (Tabelle)")
    scraper = StandingsScraper(base)
    standings = scraper.scrape()
    if standings:
        print(f"  Found {len(standings)} teams")
        for row in standings[:3]:
            print(f"    {row.position}. {row.team} — {row.points} Pkt.")
        if len(standings) > 3:
            print(f"    ... and {len(standings) - 3} more")
    else:
        print("  WARNING: No standings data found")
    save_json(standings, output_dir / "standings.json")
    return standings


def run_matchdays(base: BaseScraper, output_dir: Path, matchday: int = None):
    if matchday:
        print_header(f"Scraping Matchday {matchday}")
    else:
        print_header(f"Scraping All {base.TOTAL_MATCHDAYS} Matchdays")

    scraper = MatchdaysScraper(base)

    if matchday:
        md = scraper.scrape_matchday(matchday)
        matchdays = [md]
    else:
        matchdays = scraper.scrape_all()

    total = sum(len(md.matches) for md in matchdays)
    played = sum(
        1 for md in matchdays
        for m in md.matches
        if m.home_score is not None
    )
    print(f"  Found {total} matches across {len(matchdays)} matchdays ({played} played)")
    save_json(matchdays, output_dir / "matchdays.json")
    return matchdays


def run_match_details(
    base: BaseScraper,
    output_dir: Path,
    matchdays=None,
    single_match_id: str = None,
    single_match_url: str = None,
    resume: bool = False,
):
    print_header("Scraping Match Details")
    details_dir = output_dir / "match_details"
    details_dir.mkdir(parents=True, exist_ok=True)

    # Build list of (match_id, detail_url, matchday_number)
    if single_match_id:
        url = single_match_url or f"https://www.fussball.de/spiel/match/-/spiel/{single_match_id}"
        pairs = [(single_match_id, url, None)]
    else:
        if matchdays is None:
            data = load_json(output_dir / "matchdays.json")
            if data is None:
                print("  ERROR: matchdays.json not found. Run --matchdays first.")
                return []
            # Reconstruct from dict
            pairs = [
                (m["match_id"], m.get("detail_url", ""), md.get("matchday_number"))
                for md in data
                for m in md.get("matches", [])
            ]
        else:
            pairs = [
                (m.match_id, m.detail_url or "", md.matchday_number)
                for md in matchdays
                for m in md.matches
            ]

    # Filter to only played matches with a real match ID (not placeholder)
    pairs = [
        (mid, url, mday)
        for mid, url, mday in pairs
        if mid and not mid.startswith("MD") and url
    ]

    scraper = MatchDetailScraper(base)
    details = []
    total = len(pairs)
    print(f"  {total} matches to fetch detail data for")

    for i, (match_id, detail_url, matchday_num) in enumerate(pairs, 1):
        out_file = details_dir / f"{match_id}.json"

        if resume and out_file.exists():
            logger.debug(f"[{i}/{total}] Skipping (already saved): {match_id}")
            continue

        print(f"  [{i:3d}/{total}] {match_id}", end="")
        detail = scraper.scrape(match_id, detail_url, matchday=matchday_num)
        if detail:
            save_json(detail, out_file)
            details.append(detail)
            score = f"{detail.home_score}:{detail.away_score}" if detail.home_score is not None else "n/a"
            print(f" -> {detail.home_team} {score} {detail.away_team} "
                  f"({len(detail.goals)} goals, {len(detail.cards)} cards)")
        else:
            print(" -> no data")

    print(f"  Scraped {len(details)} match detail files")
    return details


def run_top_scorers(base: BaseScraper, output_dir: Path):
    print_header("Scraping Top Scorers (Torjäger)")
    scraper = TopScorersScraper(base)
    scorers = scraper.scrape()
    if scorers:
        print(f"  Found {len(scorers)} scorers")
        for s in scorers[:5]:
            print(f"    {s.rank}. {s.player} ({s.team}) — {s.goals} Tore")
    else:
        print("  WARNING: No top scorer data found")
    save_json(scorers, output_dir / "top_scorers.json")
    return scorers


def build_summary(standings, matchdays, scorers, output_dir: Path):
    total_matches = sum(len(md.matches) if hasattr(md, "matches") else len(md.get("matches", []))
                        for md in matchdays) if matchdays else 0
    played = sum(
        1 for md in (matchdays or [])
        for m in (md.matches if hasattr(md, "matches") else md.get("matches", []))
        if (m.home_score if hasattr(m, "home_score") else m.get("home_score")) is not None
    )

    top_scorer = None
    if scorers:
        s = scorers[0]
        top_scorer = {
            "player": s.player if hasattr(s, "player") else s.get("player"),
            "team": s.team if hasattr(s, "team") else s.get("team"),
            "goals": s.goals if hasattr(s, "goals") else s.get("goals"),
        }

    summary = {
        "league": "Kreisliga A Herren, Kreis Leipzig",
        "season": "2025/2026",
        "region": "Sachsen",
        "staffel_id": BaseScraper.STAFFEL_ID,
        "scraped_at": datetime.now().isoformat(timespec="seconds"),
        "total_matchdays": len(matchdays) if matchdays else 0,
        "total_matches": total_matches,
        "matches_played": played,
        "teams_in_standings": len(standings) if standings else 0,
        "top_scorer": top_scorer,
    }
    save_json(summary, output_dir / "summary.json")
    return summary


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(
        description="fussball.de Kreisliga A Leipzig scraper",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    targets = parser.add_argument_group("Scrape targets (default: --all)")
    targets.add_argument("--all", action="store_true", help="Scrape everything (default when no flag given)")
    targets.add_argument("--standings", action="store_true", help="Scrape current standings table")
    targets.add_argument("--matchdays", action="store_true", help="Scrape all matchday schedules")
    targets.add_argument("--match-details", action="store_true", help="Scrape per-match event details")
    targets.add_argument("--top-scorers", action="store_true", help="Scrape top scorers list")
    targets.add_argument("--matchday", type=int, metavar="N", help="Scrape single matchday N (1-26)")
    targets.add_argument("--match-id", metavar="ID", help="Scrape a single match by its ID")
    targets.add_argument("--no-details", action="store_true",
                         help="Skip match detail pages when running --all")

    cfg = parser.add_argument_group("Configuration")
    cfg.add_argument("--delay", type=float, default=1.5,
                     help="Seconds between requests (default: 1.5)")
    cfg.add_argument("--output", default="output", metavar="DIR",
                     help="Output directory (default: ./output)")
    cfg.add_argument("--resume", action="store_true",
                     help="Skip match detail files already saved in output/match_details/")
    cfg.add_argument("--verbose", action="store_true", help="Enable debug logging")

    return parser.parse_args()


def main():
    args = parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    base = BaseScraper(delay=args.delay)

    # Determine which tasks to run
    explicit = any([
        args.standings, args.matchdays, args.match_details,
        args.top_scorers, args.matchday, args.match_id,
    ])
    run_all = args.all or not explicit

    standings = None
    matchdays = None
    scorers = None

    print(f"\nfussball.de Kreisliga A Leipzig Scraper")
    print(f"Output directory: {output_dir.resolve()}")
    print(f"Request delay:    {args.delay}s")
    print(f"Started at:       {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    if run_all or args.standings:
        standings = run_standings(base, output_dir)

    if run_all or args.matchdays or args.matchday:
        matchdays = run_matchdays(base, output_dir, matchday=args.matchday)

    if args.match_id:
        run_match_details(
            base, output_dir,
            single_match_id=args.match_id,
            resume=args.resume,
        )
    elif (run_all and not args.no_details) or args.match_details:
        run_match_details(
            base, output_dir,
            matchdays=matchdays,
            resume=args.resume,
        )

    if run_all or args.top_scorers:
        scorers = run_top_scorers(base, output_dir)

    if run_all:
        # Load from files if not already in memory
        if standings is None:
            standings = load_json(output_dir / "standings.json") or []
        if matchdays is None:
            matchdays = load_json(output_dir / "matchdays.json") or []
        if scorers is None:
            scorers = load_json(output_dir / "top_scorers.json") or []
        summary = build_summary(standings, matchdays, scorers, output_dir)
        print_header("Summary")
        print(f"  Teams:         {summary['teams_in_standings']}")
        print(f"  Total matches: {summary['total_matches']} ({summary['matches_played']} played)")
        if summary["top_scorer"]:
            ts = summary["top_scorer"]
            print(f"  Top scorer:    {ts['player']} ({ts['team']}) — {ts['goals']} goals")

    print(f"\nDone at {datetime.now().strftime('%H:%M:%S')}")


if __name__ == "__main__":
    main()
