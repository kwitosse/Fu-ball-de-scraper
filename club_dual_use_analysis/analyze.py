#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import logging
import re
import sys
import time
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Sequence
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup, Tag

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scrapers.base import HEADERS

LOGGER = logging.getLogger("club_dual_use_analysis")
LOCAL_TZ = ZoneInfo("Europe/Berlin")
OFFICIAL_COMPETITION_CODES = {"ME", "PO"}
MATCH_ID_RE = re.compile(r"/spiel/[^/]+/-/spiel/([A-Z0-9]+)")
TEAM_ID_RE = re.compile(r"/team-id/([^/\?#]+)")
PROFILE_ID_RE = re.compile(r"/(player-id|userid)/([^/\?#]+)")
DATE_RE = re.compile(r"(\d{2}\.\d{2}\.\d{2})")
TIME_RE = re.compile(r"(\d{2}:\d{2})")
TITLE_SUFFIX_RE = re.compile(r"\s+\|\s+FUSSBALL\.DE\s*$", re.I)
PROFILE_TITLE_KIND_RE = re.compile(r"\s+(Basisprofil|Spielerprofil)\s*$", re.I)
TRAILING_CLUB_RE = re.compile(r"\s+\([^)]+\)\s*$")
GENERIC_SITE_TITLES = {
    "FUSSBALL.DE",
    "FUSSBALL.DE - Die Heimat des Amateurfußballs",
}


@dataclass(frozen=True)
class TeamRef:
    club_key: str
    club_name: str
    tier: str
    team_name: str
    team_id: str


@dataclass(frozen=True)
class ClubPair:
    key: str
    club_name: str
    first_team_name: str
    first_team_id: str
    second_team_name: str
    second_team_id: str

    def teams(self) -> Sequence[TeamRef]:
        return (
            TeamRef(
                club_key=self.key,
                club_name=self.club_name,
                tier="first",
                team_name=self.first_team_name,
                team_id=self.first_team_id,
            ),
            TeamRef(
                club_key=self.key,
                club_name=self.club_name,
                tier="second",
                team_name=self.second_team_name,
                team_id=self.second_team_id,
            ),
        )


@dataclass
class MatchRecord:
    club_key: str
    club_name: str
    team_tier: str
    team_id: str
    team_name: str
    opponent_id: str
    opponent_name: str
    match_id: str
    detail_url: str
    competition_name: str
    competition_code: str
    kickoff: datetime
    tracked_side: str
    home_team: str
    away_team: str


@dataclass
class AppearanceRecord:
    player_key: str
    player_name: str
    profile_url: str
    club_key: str
    club_name: str
    team_tier: str
    team_name: str
    team_id: str
    match_id: str
    kickoff: datetime
    competition_name: str
    competition_code: str
    opponent_name: str
    home_team: str
    away_team: str


@dataclass
class CoverageSummary:
    official_matches_total: int = 0
    official_matches_played: int = 0
    processed_matches: int = 0
    matches_missing_lineup: int = 0
    matches_missing_course: int = 0
    unresolved_player_profiles: int = 0


@dataclass
class ClubAnalysisResult:
    club_key: str
    club_name: str
    coverage: CoverageSummary
    first_to_second_cases: List[dict]
    second_to_first_cases: List[dict]
    shared_players: List[dict]
    appearances: List[dict]


def load_club_pairs() -> Dict[str, ClubPair]:
    config_path = Path(__file__).with_name("clubs.json")
    with open(config_path, encoding="utf-8") as handle:
        payload = json.load(handle)
    return {
        key: ClubPair(
            key=key,
            club_name=value["club_name"],
            first_team_name=value["first_team_name"],
            first_team_id=value["first_team_id"],
            second_team_name=value["second_team_name"],
            second_team_id=value["second_team_id"],
        )
        for key, value in payload.items()
    }


CLUB_PAIRS: Dict[str, ClubPair] = load_club_pairs()


def normalize_profile_url(url: str) -> str:
    if not url or url == "#":
        return ""
    parsed = urlparse(url)
    path = parsed.path or url
    if path.startswith("http"):
        return url
    if not path.startswith("/"):
        path = f"/{path}"
    return f"https://www.fussball.de{path}"


def player_key_from_url(url: str) -> str:
    normalized = normalize_profile_url(url)
    match = PROFILE_ID_RE.search(normalized)
    if match:
        return f"{match.group(1)}:{match.group(2)}"
    return normalized


def extract_match_id(url: str) -> str:
    match = MATCH_ID_RE.search(url)
    return match.group(1) if match else ""


def extract_team_id(url: str) -> str:
    match = TEAM_ID_RE.search(url)
    return match.group(1) if match else ""


def parse_local_kickoff(date_text: str, time_text: Optional[str]) -> datetime:
    if time_text:
        return datetime.strptime(f"{date_text} {time_text}", "%d.%m.%y %H:%M").replace(tzinfo=LOCAL_TZ)
    return datetime.strptime(f"{date_text} 12:00", "%d.%m.%y %H:%M").replace(tzinfo=LOCAL_TZ)


def parse_player_name_from_html(html: str) -> Optional[str]:
    soup = BeautifulSoup(html, "lxml")
    if not soup.title:
        return None
    title = soup.title.get_text(" ", strip=True)
    title = TITLE_SUFFIX_RE.sub("", title).strip()
    title = PROFILE_TITLE_KIND_RE.sub("", title).strip()
    title = TRAILING_CLUB_RE.sub("", title).strip()
    if title in GENERIC_SITE_TITLES or title.upper().startswith("FUSSBALL.DE"):
        return None
    return title or None


def parse_lineup_html(html: str) -> Dict[str, Dict[str, List[str]]]:
    result = {
        "home": {"starting": [], "bench": []},
        "away": {"starting": [], "bench": []},
    }
    if "Leider sind zur Aufstellung keine Daten verfügbar" in html:
        return result

    soup = BeautifulSoup(html, "lxml")
    containers = {
        "starting": soup.find("div", class_="starting"),
        "bench": soup.find("div", class_="substitutes"),
    }
    for bucket, container in containers.items():
        if container is None:
            continue
        for side in ("home", "away"):
            urls = []
            for anchor in container.select(f"a.player-wrapper.{side}[href]"):
                href = anchor.get("href")
                if href and PROFILE_ID_RE.search(href):
                    normalized = normalize_profile_url(href)
                    if normalized:
                        urls.append(normalized)
            seen = []
            for url in urls:
                if url not in seen:
                    seen.append(url)
            if bucket == "starting":
                result[side]["starting"] = seen
            else:
                result[side]["bench"] = seen
    return result


def _event_side(event: Tag) -> str:
    classes = event.get("class", [])
    if "event-right" in classes:
        return "away"
    if "event-left" in classes:
        return "home"
    return "unknown"


def parse_substitution_html(html: str) -> Dict[str, Dict[str, List[str]]]:
    result = {
        "home": {"in": [], "out": []},
        "away": {"in": [], "out": []},
    }
    soup = BeautifulSoup(html, "lxml")
    for event in soup.find_all("div", class_="row-event"):
        icon = event.find("i", class_="icon-substitute")
        if icon is None:
            continue
        side = _event_side(event)
        if side not in result:
            continue
        links = [
            normalize_profile_url(anchor.get("href"))
            for anchor in event.find_all("a", href=PROFILE_ID_RE)
            if anchor.get("href")
        ]
        links = [link for link in links if link]
        if links:
            result[side]["in"].append(links[0])
        if len(links) > 1:
            result[side]["out"].append(links[1])
    for side in ("home", "away"):
        for key in ("in", "out"):
            deduped = []
            for url in result[side][key]:
                if url not in deduped:
                    deduped.append(url)
            result[side][key] = deduped
    return result


def build_actual_participants(
    lineup: Dict[str, Dict[str, List[str]]],
    substitutions: Dict[str, Dict[str, List[str]]],
    side: str,
) -> List[str]:
    players: List[str] = []
    for bucket in ("starting",):
        players.extend(lineup.get(side, {}).get(bucket, []))
    players.extend(substitutions.get(side, {}).get("in", []))
    players.extend(substitutions.get(side, {}).get("out", []))

    deduped: List[str] = []
    for url in players:
        if url not in deduped:
            deduped.append(url)
    return deduped


def parse_matchplan_html(
    html: str,
    tracked_team: TeamRef,
    allowed_competition_codes: Optional[set[str]] = None,
) -> List[MatchRecord]:
    allowed_competition_codes = allowed_competition_codes or OFFICIAL_COMPETITION_CODES
    soup = BeautifulSoup(html, "lxml")
    tbody = soup.find("tbody")
    if tbody is None:
        return []

    current_context: dict | None = None
    records: List[MatchRecord] = []

    for row in tbody.find_all("tr", recursive=False):
        classes = set(row.get("class") or [])
        if "row-competition" in classes:
            date_cell = row.find("td", class_="column-date")
            comp_cell = row.find("td", class_="column-team")
            info_cells = row.find_all("td")
            info_text = info_cells[-1].get_text(" ", strip=True) if info_cells else ""
            date_text_match = DATE_RE.search(date_cell.get_text(" ", strip=True) if date_cell else "")
            time_text_match = TIME_RE.search(date_cell.get_text(" ", strip=True) if date_cell else "")
            code = info_text.split("|", 1)[0].strip() if info_text else ""
            current_context = {
                "competition_name": comp_cell.get_text(" ", strip=True) if comp_cell else "",
                "competition_code": code,
                "kickoff": parse_local_kickoff(
                    date_text_match.group(1),
                    time_text_match.group(1) if time_text_match else None,
                ) if date_text_match else None,
            }
            continue

        detail_anchor = row.find("a", href=MATCH_ID_RE)
        if detail_anchor is None or current_context is None or current_context["kickoff"] is None:
            continue
        if current_context["competition_code"] not in allowed_competition_codes:
            continue

        club_links = row.find_all("a", class_="club-wrapper")
        if len(club_links) < 2:
            continue
        home_href = club_links[0].get("href", "")
        away_href = club_links[1].get("href", "")
        home_name = club_links[0].get_text(" ", strip=True)
        away_name = club_links[1].get_text(" ", strip=True)
        home_team_id = extract_team_id(home_href)
        away_team_id = extract_team_id(away_href)
        if tracked_team.team_id == home_team_id:
            tracked_side = "home"
            opponent_id = away_team_id
            opponent_name = away_name
        elif tracked_team.team_id == away_team_id:
            tracked_side = "away"
            opponent_id = home_team_id
            opponent_name = home_name
        else:
            continue

        detail_url = detail_anchor.get("href", "")
        match_id = extract_match_id(detail_url)
        if not match_id:
            continue
        if not detail_url.startswith("http"):
            detail_url = f"https://www.fussball.de{detail_url}"

        records.append(
            MatchRecord(
                club_key=tracked_team.club_key,
                club_name=tracked_team.club_name,
                team_tier=tracked_team.tier,
                team_id=tracked_team.team_id,
                team_name=tracked_team.team_name,
                opponent_id=opponent_id,
                opponent_name=opponent_name,
                match_id=match_id,
                detail_url=detail_url,
                competition_name=current_context["competition_name"],
                competition_code=current_context["competition_code"],
                kickoff=current_context["kickoff"],
                tracked_side=tracked_side,
                home_team=home_name,
                away_team=away_name,
            )
        )

    return records


def collect_window_cases(
    appearances: Sequence[AppearanceRecord],
    source_tier: str,
    target_tier: str,
    max_gap_days: int = 5,
) -> List[dict]:
    by_player: Dict[str, List[AppearanceRecord]] = {}
    for appearance in appearances:
        by_player.setdefault(appearance.player_key, []).append(appearance)

    cases: List[dict] = []
    max_gap_seconds = max_gap_days * 24 * 60 * 60
    for player_entries in by_player.values():
        ordered = sorted(player_entries, key=lambda item: item.kickoff)
        for first in ordered:
            if first.team_tier != source_tier:
                continue
            for second in ordered:
                if second.team_tier != target_tier:
                    continue
                delta = (second.kickoff - first.kickoff).total_seconds()
                if delta <= 0 or delta > max_gap_seconds:
                    continue
                cases.append(
                    {
                        "player_key": first.player_key,
                        "player_name": first.player_name,
                        "from_team_tier": first.team_tier,
                        "from_team_name": first.team_name,
                        "from_match_id": first.match_id,
                        "from_kickoff": first.kickoff.isoformat(),
                        "from_competition_code": first.competition_code,
                        "from_competition_name": first.competition_name,
                        "from_opponent": first.opponent_name,
                        "to_team_tier": second.team_tier,
                        "to_team_name": second.team_name,
                        "to_match_id": second.match_id,
                        "to_kickoff": second.kickoff.isoformat(),
                        "to_competition_code": second.competition_code,
                        "to_competition_name": second.competition_name,
                        "to_opponent": second.opponent_name,
                        "gap_hours": round(delta / 3600.0, 2),
                    }
                )
    return sorted(cases, key=lambda item: (item["to_kickoff"], item["player_name"]))


def build_shared_players(appearances: Sequence[AppearanceRecord]) -> List[dict]:
    by_player: Dict[str, List[AppearanceRecord]] = {}
    for appearance in appearances:
        by_player.setdefault(appearance.player_key, []).append(appearance)

    shared_players: List[dict] = []
    for player_key, player_entries in by_player.items():
        tiers = {entry.team_tier for entry in player_entries}
        if tiers != {"first", "second"}:
            continue
        ordered = sorted(player_entries, key=lambda item: item.kickoff)
        first_team_entries = [entry for entry in ordered if entry.team_tier == "first"]
        second_team_entries = [entry for entry in ordered if entry.team_tier == "second"]
        shared_players.append(
            {
                "player_key": player_key,
                "player_name": ordered[0].player_name,
                "profile_url": ordered[0].profile_url,
                "first_team_appearances": len(first_team_entries),
                "second_team_appearances": len(second_team_entries),
                "first_seen": ordered[0].kickoff.isoformat(),
                "last_seen": ordered[-1].kickoff.isoformat(),
                "first_team_dates": [entry.kickoff.isoformat() for entry in first_team_entries],
                "second_team_dates": [entry.kickoff.isoformat() for entry in second_team_entries],
                "first_team_matches": [
                    {
                        "date": entry.kickoff.isoformat(),
                        "team_name": entry.team_name,
                        "opponent_name": entry.opponent_name,
                        "match_id": entry.match_id,
                    }
                    for entry in first_team_entries
                ],
                "second_team_matches": [
                    {
                        "date": entry.kickoff.isoformat(),
                        "team_name": entry.team_name,
                        "opponent_name": entry.opponent_name,
                        "match_id": entry.match_id,
                    }
                    for entry in second_team_entries
                ],
            }
        )
    return sorted(shared_players, key=lambda item: item["player_name"])


class AnalyzerClient:
    def __init__(self, output_dir: Path, season: str, delay: float = 0.2, refresh: bool = False):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.cache_dir = self.output_dir / "cache"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.refresh = refresh
        self.delay = delay
        self.season = season
        self.now_local = datetime.now(LOCAL_TZ)

        self.session = requests.Session()
        self.session.headers.update(HEADERS)

        self.profile_name_cache_path = self.cache_dir / "player_names.json"
        self.profile_name_cache = self._load_json(self.profile_name_cache_path, default={})

    def _load_json(self, path: Path, default):
        if not path.exists():
            return default
        with open(path, encoding="utf-8") as handle:
            return json.load(handle)

    def _save_json(self, path: Path, payload) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)

    def _read_or_fetch_text(self, cache_path: Path, url: str) -> str:
        if cache_path.exists() and not self.refresh:
            return cache_path.read_text(encoding="utf-8")
        LOGGER.info("GET %s", url)
        response = self.session.get(url, timeout=30)
        response.raise_for_status()
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(response.text, encoding="utf-8")
        time.sleep(self.delay)
        return response.text

    def _read_or_fetch_json(self, cache_path: Path, url: str, params: dict) -> dict:
        if cache_path.exists() and not self.refresh:
            with open(cache_path, encoding="utf-8") as handle:
                return json.load(handle)
        LOGGER.info("GET %s", url)
        response = self.session.get(url, params=params, timeout=30)
        response.raise_for_status()
        payload = response.json()
        self._save_json(cache_path, payload)
        time.sleep(self.delay)
        return payload

    def _season_bounds(self) -> tuple[str, str]:
        if len(self.season) != 4 or not self.season.isdigit():
            raise ValueError(f"Unsupported season format: {self.season}")
        start_year = int(f"20{self.season[:2]}")
        end_year = int(f"20{self.season[2:]}")
        return (f"01.07.{start_year}", f"30.06.{end_year}")

    def fetch_matches_for_team(self, team: TeamRef) -> List[MatchRecord]:
        date_from, date_to = self._season_bounds()
        endpoint = (
            "https://www.fussball.de/ajax.team.matchplan/-/mime-type/JSON/mode/PAGE/"
            f"prev-season-allowed/false/show-filter/false/team-id/{team.team_id}"
        )
        cache_path = self.cache_dir / "matchplans" / f"{team.team_id}.json"
        payload = self._read_or_fetch_json(
            cache_path,
            endpoint,
            {
                "offset": 0,
                "max": 100,
                "datum-von": date_from,
                "datum-bis": date_to,
            },
        )
        return parse_matchplan_html(payload.get("html", ""), team)

    def fetch_actual_participants(
        self,
        match: MatchRecord,
        coverage: CoverageSummary,
    ) -> List[str]:
        lineup_cache = self.cache_dir / "lineups" / f"{match.match_id}.html"
        lineup_html = self._read_or_fetch_text(
            lineup_cache,
            f"https://www.fussball.de/ajax.match.lineup/-/mode/PAGE/spiel/{match.match_id}/ticker-id/selectedTickerId",
        )
        lineup = parse_lineup_html(lineup_html)
        if not lineup[match.tracked_side]["starting"]:
            coverage.matches_missing_lineup += 1
            return []

        course_cache = self.cache_dir / "courses" / f"{match.match_id}.html"
        try:
            course_html = self._read_or_fetch_text(
                course_cache,
                f"https://www.fussball.de/ajax.match.course/-/mode/PAGE/spiel/{match.match_id}",
            )
        except requests.RequestException:
            coverage.matches_missing_course += 1
            course_html = ""

        substitutions = parse_substitution_html(course_html)
        coverage.processed_matches += 1
        return build_actual_participants(lineup, substitutions, match.tracked_side)

    def resolve_player_name(self, profile_url: str, coverage: CoverageSummary) -> str:
        key = player_key_from_url(profile_url)
        cached = self.profile_name_cache.get(key)
        if cached:
            return cached

        cache_match = PROFILE_ID_RE.search(profile_url)
        cache_name = cache_match.group(2) if cache_match else re.sub(r"\W+", "_", key)
        profile_cache = self.cache_dir / "profiles" / f"{cache_name}.html"
        try:
            html = self._read_or_fetch_text(profile_cache, profile_url)
        except requests.RequestException:
            coverage.unresolved_player_profiles += 1
            return key

        name = parse_player_name_from_html(html)
        if not name:
            coverage.unresolved_player_profiles += 1
            name = key
        self.profile_name_cache[key] = name
        self._save_json(self.profile_name_cache_path, self.profile_name_cache)
        return name

    def analyze_club(self, pair: ClubPair) -> ClubAnalysisResult:
        coverage = CoverageSummary()
        appearances: List[AppearanceRecord] = []

        for team in pair.teams():
            matches = self.fetch_matches_for_team(team)
            coverage.official_matches_total += len(matches)
            for match in matches:
                if match.kickoff > self.now_local:
                    continue
                coverage.official_matches_played += 1
                participants = self.fetch_actual_participants(match, coverage)
                for profile_url in participants:
                    appearances.append(
                        AppearanceRecord(
                            player_key=player_key_from_url(profile_url),
                            player_name=self.resolve_player_name(profile_url, coverage),
                            profile_url=profile_url,
                            club_key=match.club_key,
                            club_name=match.club_name,
                            team_tier=match.team_tier,
                            team_name=match.team_name,
                            team_id=match.team_id,
                            match_id=match.match_id,
                            kickoff=match.kickoff,
                            competition_name=match.competition_name,
                            competition_code=match.competition_code,
                            opponent_name=match.opponent_name,
                            home_team=match.home_team,
                            away_team=match.away_team,
                        )
                    )

        appearances = sorted(
            appearances,
            key=lambda item: (item.player_name.casefold(), item.kickoff, item.team_tier),
        )
        first_to_second_cases = collect_window_cases(appearances, "first", "second")
        second_to_first_cases = collect_window_cases(appearances, "second", "first")
        shared_players = build_shared_players(appearances)

        return ClubAnalysisResult(
            club_key=pair.key,
            club_name=pair.club_name,
            coverage=coverage,
            first_to_second_cases=first_to_second_cases,
            second_to_first_cases=second_to_first_cases,
            shared_players=shared_players,
            appearances=[self._appearance_to_dict(item) for item in appearances],
        )

    def _appearance_to_dict(self, appearance: AppearanceRecord) -> dict:
        payload = asdict(appearance)
        payload["kickoff"] = appearance.kickoff.isoformat()
        return payload

    def write_outputs(self, results: Sequence[ClubAnalysisResult]) -> None:
        report_path = self.output_dir / "report.md"
        json_path = self.output_dir / "analysis.json"
        cases_csv_path = self.output_dir / "dual_appearance_cases.csv"
        shared_csv_path = self.output_dir / "shared_players.csv"

        json_payload = [
            {
                "club_key": result.club_key,
                "club_name": result.club_name,
                "coverage": asdict(result.coverage),
                "first_to_second_cases": result.first_to_second_cases,
                "second_to_first_cases": result.second_to_first_cases,
                "shared_players": result.shared_players,
                "appearances": result.appearances,
            }
            for result in results
        ]
        self._save_json(json_path, json_payload)
        report_path.write_text(render_markdown_report(results), encoding="utf-8")
        write_cases_csv(cases_csv_path, results)
        write_shared_players_csv(shared_csv_path, results)


def render_markdown_report(results: Sequence[ClubAnalysisResult]) -> str:
    lines = [
        "# Club Dual-Appearance Analysis",
        "",
        f"Generated at: {datetime.now(LOCAL_TZ).isoformat()}",
        "",
        "Rule window: ordered appearances within 5 days",
        "Match scope: official competitions only (`ME`, `PO`)",
        "",
    ]

    for result in results:
        coverage = result.coverage
        lines.extend(
            [
                f"## {result.club_name}",
                "",
                f"- Official matches in season feed: {coverage.official_matches_total}",
                f"- Played official matches checked: {coverage.official_matches_played}",
                f"- Matches processed with lineup data: {coverage.processed_matches}",
                f"- Matches missing lineup: {coverage.matches_missing_lineup}",
                f"- Matches missing match-course data: {coverage.matches_missing_course}",
                f"- Unresolved player profiles: {coverage.unresolved_player_profiles}",
                "",
                f"### First Team -> Second Team cases ({len(result.first_to_second_cases)})",
                "",
            ]
        )
        if result.first_to_second_cases:
            for case in result.first_to_second_cases:
                from_kickoff = datetime.fromisoformat(case["from_kickoff"]).astimezone(LOCAL_TZ)
                to_kickoff = datetime.fromisoformat(case["to_kickoff"]).astimezone(LOCAL_TZ)
                lines.append(
                    f"- {case['player_name']}: {case['from_team_name']} vs {case['from_opponent']} "
                    f"on {from_kickoff.strftime('%Y-%m-%d %H:%M')} -> "
                    f"{case['to_team_name']} vs {case['to_opponent']} on "
                    f"{to_kickoff.strftime('%Y-%m-%d %H:%M')}, gap {case['gap_hours']}h"
                )
        else:
            lines.append("- None")
        lines.extend(
            [
                "",
                f"### Second Team -> First Team cases ({len(result.second_to_first_cases)})",
                "",
            ]
        )
        if result.second_to_first_cases:
            for case in result.second_to_first_cases:
                from_kickoff = datetime.fromisoformat(case["from_kickoff"]).astimezone(LOCAL_TZ)
                to_kickoff = datetime.fromisoformat(case["to_kickoff"]).astimezone(LOCAL_TZ)
                lines.append(
                    f"- {case['player_name']}: {case['from_team_name']} vs {case['from_opponent']} "
                    f"on {from_kickoff.strftime('%Y-%m-%d %H:%M')} -> "
                    f"{case['to_team_name']} vs {case['to_opponent']} on "
                    f"{to_kickoff.strftime('%Y-%m-%d %H:%M')}, gap {case['gap_hours']}h"
                )
        else:
            lines.append("- None")
        lines.extend(
            [
                "",
                f"### Shared Players Across Both Teams ({len(result.shared_players)})",
                "",
            ]
        )
        if result.shared_players:
            for player in result.shared_players:
                lines.append(
                    f"- {player['player_name']}: first-team {player['first_team_appearances']}, "
                    f"second-team {player['second_team_appearances']}, "
                    f"first seen {datetime.fromisoformat(player['first_seen']).astimezone(LOCAL_TZ).strftime('%Y-%m-%d')}, "
                    f"last seen {datetime.fromisoformat(player['last_seen']).astimezone(LOCAL_TZ).strftime('%Y-%m-%d')}"
                )
                for match in player["first_team_matches"]:
                    lines.append(f"  First team: {_format_match_reference(match)}")
                for match in player["second_team_matches"]:
                    lines.append(f"  Second team: {_format_match_reference(match)}")
        else:
            lines.append("- None")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def _format_match_reference(match: dict) -> str:
    kickoff = datetime.fromisoformat(match["date"]).astimezone(LOCAL_TZ)
    return (
        f"{kickoff.strftime('%Y-%m-%d %H:%M')} - "
        f"{match['team_name']} vs {match['opponent_name']} ({match['match_id']})"
    )


def write_cases_csv(path: Path, results: Sequence[ClubAnalysisResult]) -> None:
    fieldnames = [
        "club_key",
        "club_name",
        "direction",
        "player_name",
        "player_key",
        "from_team_name",
        "from_match_id",
        "from_kickoff",
        "from_opponent",
        "to_team_name",
        "to_match_id",
        "to_kickoff",
        "to_opponent",
        "gap_hours",
    ]
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for result in results:
            for direction, cases in (
                ("first_to_second", result.first_to_second_cases),
                ("second_to_first", result.second_to_first_cases),
            ):
                for case in cases:
                    row = {
                        "club_key": result.club_key,
                        "club_name": result.club_name,
                        "direction": direction,
                        "player_name": case["player_name"],
                        "player_key": case["player_key"],
                        "from_team_name": case["from_team_name"],
                        "from_match_id": case["from_match_id"],
                        "from_kickoff": case["from_kickoff"],
                        "from_opponent": case["from_opponent"],
                        "to_team_name": case["to_team_name"],
                        "to_match_id": case["to_match_id"],
                        "to_kickoff": case["to_kickoff"],
                        "to_opponent": case["to_opponent"],
                        "gap_hours": case["gap_hours"],
                    }
                    writer.writerow(row)


def write_shared_players_csv(path: Path, results: Sequence[ClubAnalysisResult]) -> None:
    fieldnames = [
        "club_key",
        "club_name",
        "player_name",
        "player_key",
        "profile_url",
        "first_team_appearances",
        "second_team_appearances",
        "first_seen",
        "last_seen",
    ]
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for result in results:
            for player in result.shared_players:
                writer.writerow(
                    {
                        "club_key": result.club_key,
                        "club_name": result.club_name,
                        "player_name": player["player_name"],
                        "player_key": player["player_key"],
                        "profile_url": player["profile_url"],
                        "first_team_appearances": player["first_team_appearances"],
                        "second_team_appearances": player["second_team_appearances"],
                        "first_seen": player["first_seen"],
                        "last_seen": player["last_seen"],
                    }
                )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Analyze players used across first and second teams.")
    parser.add_argument(
        "--club",
        action="append",
        choices=sorted(CLUB_PAIRS.keys()),
        help="Limit analysis to one or more configured clubs.",
    )
    parser.add_argument("--season", default="2526", help="Season code as YYZZ, default: 2526")
    parser.add_argument(
        "--output-dir",
        default="club_dual_use_analysis/output",
        help="Directory for reports and caches.",
    )
    parser.add_argument("--refresh", action="store_true", help="Ignore cached responses and refetch.")
    parser.add_argument("--delay", type=float, default=0.2, help="Delay between live requests in seconds.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )
    pairs = [CLUB_PAIRS[key] for key in (args.club or sorted(CLUB_PAIRS.keys()))]
    client = AnalyzerClient(
        output_dir=Path(args.output_dir),
        season=args.season,
        delay=args.delay,
        refresh=args.refresh,
    )
    results = [client.analyze_club(pair) for pair in pairs]
    client.write_outputs(results)

    print(f"Saved Markdown report to {Path(args.output_dir) / 'report.md'}")
    print(f"Saved JSON report to {Path(args.output_dir) / 'analysis.json'}")
    print(f"Saved cases CSV to {Path(args.output_dir) / 'dual_appearance_cases.csv'}")
    print(f"Saved shared players CSV to {Path(args.output_dir) / 'shared_players.csv'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
