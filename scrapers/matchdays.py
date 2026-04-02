import re
import logging
from typing import List, Optional, Tuple

from bs4 import BeautifulSoup, Tag

from models import Match, Matchday
from scrapers.base import BaseScraper

logger = logging.getLogger(__name__)

# Match detail URL pattern: /spiel/[slug]/-/spiel/[MATCH_ID]
MATCH_HREF_RE = re.compile(r"/spiel/([^/]+)/-/spiel/([A-Z0-9]+)")
TEAM_ID_RE = re.compile(r"/team-id/([^/\?#]+)")


def _extract_match_id(href: str) -> str:
    m = MATCH_HREF_RE.search(href)
    return m.group(2) if m else ""


def _extract_team_id(href: str) -> str:
    m = TEAM_ID_RE.search(href)
    return m.group(1) if m else ""


class MatchdaysScraper:
    def __init__(self, base: BaseScraper):
        self.base = base

    def scrape_matchday(self, matchday: int) -> Matchday:
        url = self.base.matchday_url(matchday)
        soup = self.base.get(url)
        md = Matchday(matchday_number=matchday)
        if soup is None:
            logger.warning(f"Could not fetch matchday {matchday}")
            return md
        md.matches = self._parse_matches(soup, matchday)
        return md

    def scrape_all(self) -> List[Matchday]:
        all_matchdays: List[Matchday] = []
        for n in range(1, self.base.TOTAL_MATCHDAYS + 1):
            print(f"  Fetching matchday {n}/{self.base.TOTAL_MATCHDAYS}...", end="\r", flush=True)
            md = self.scrape_matchday(n)
            all_matchdays.append(md)
        print()
        return all_matchdays

    def _parse_matches(self, soup: BeautifulSoup, matchday: int) -> List[Match]:
        """
        Parse match rows from the spieltag page.

        Confirmed table structure (from live inspection):
          Table class: ['table', 'table-striped', 'table-full-width', 'thead']
          Header row:  tr.thead.hidden-small — skip
          Group row:   tr.row-headline — skip
          Match row:   tr.odd / tr.even

          Column layout per match row:
            td.column-date       → date/time (data-obfuscation, JS-rendered → None)
            td.column-club       → home team (a.club-wrapper > div.club-name)
            td.strong.no-border  → ":" separator
            td.column-club.no-border → away team (a.club-wrapper > div.club-name)
            td.column-score      → score link (data-obfuscation, JS-rendered → extracted from href)
            td.column-detail     → "Zum Spiel" link
            ...additional info tds
        """
        matches: List[Match] = []
        seen_ids: set = set()

        # Find the match schedule table (has 'thead' in its class list)
        match_table = None
        for table in soup.find_all("table"):
            classes = table.get("class", [])
            if "thead" in classes and "table-striped" in classes:
                match_table = table
                break

        if match_table is None:
            # Fallback: first table with column-score tds
            for table in soup.find_all("table"):
                if table.find("td", class_="column-score"):
                    match_table = table
                    break

        if match_table is None:
            logger.warning(f"Match table not found for matchday {matchday}")
            return []

        for row in match_table.find_all("tr"):
            classes = row.get("class", [])
            # Skip header and group-label rows
            if "thead" in classes or "row-headline" in classes or "hidden-small" in classes:
                continue
            # Match rows either have class 'odd', class 'even', or no class at all
            # (fussball.de omits the 'even' class on alternate rows)
            skip_classes = {"thead", "row-headline", "hidden-small", "visible-small"}
            if classes and all(c in skip_classes for c in classes):
                continue

            match = self._parse_row(row, matchday)
            if match and match.match_id not in seen_ids:
                seen_ids.add(match.match_id)
                matches.append(match)

        return matches

    def _parse_row(self, row: Tag, matchday: int) -> Optional[Match]:
        # --- Team cells (both have class 'column-club') ---
        club_tds = row.find_all("td", class_="column-club")
        if len(club_tds) < 2:
            return None

        home_team, home_team_id = self._extract_club(club_tds[0])
        away_team, away_team_id = self._extract_club(club_tds[1])

        if not home_team or not away_team:
            return None

        # --- Match ID & detail URL from any /spiel/ link in the row ---
        match_id = ""
        detail_url = ""
        for a in row.find_all("a", href=MATCH_HREF_RE):
            href = a.get("href", "")
            mid = _extract_match_id(href)
            if mid:
                match_id = mid
                detail_url = href if href.startswith("http") else f"{self.base.BASE_URL}{href}"
                break

        if not match_id:
            return None

        # --- Score: score spans use data-obfuscation (JS-rendered), so unavailable ---
        # We still detect if a score link exists vs a "Liveticker" placeholder
        home_score: Optional[int] = None
        away_score: Optional[int] = None
        score_td = row.find("td", class_="column-score")
        status = "scheduled"
        if score_td:
            score_link = score_td.find("a")
            if score_link:
                # Score spans: score-left and score-right
                left = score_link.find("span", class_="score-left")
                right = score_link.find("span", class_="score-right")
                # If they have text (non-obfuscated path), extract it
                if left and right:
                    left_text = left.get_text(strip=True)
                    right_text = right.get_text(strip=True)
                    try:
                        home_score = int(left_text)
                        away_score = int(right_text)
                        status = "played"
                    except (ValueError, TypeError):
                        pass  # Still JS-obfuscated

        return Match(
            match_id=match_id,
            matchday=matchday,
            home_team=home_team,
            home_team_id=home_team_id,
            away_team=away_team,
            away_team_id=away_team_id,
            home_score=home_score,
            away_score=away_score,
            date=None,      # Obfuscated on this page; available from match detail
            time=None,
            status=status,
            detail_url=detail_url,
        )

    def _extract_club(self, td: Tag) -> Tuple[str, str]:
        """Extract (team_name, team_id) from a column-club td."""
        club_link = td.find("a", class_="club-wrapper")
        if club_link:
            team_id = _extract_team_id(club_link.get("href", ""))
            name_div = club_link.find("div", class_="club-name")
            name = name_div.get_text(strip=True) if name_div else club_link.get_text(strip=True)
            return name, team_id
        # Fallback: any link in the td
        link = td.find("a")
        if link:
            return link.get_text(strip=True), _extract_team_id(link.get("href", ""))
        return td.get_text(strip=True), ""
