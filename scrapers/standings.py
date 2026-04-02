import re
import logging
from typing import List, Optional

from bs4 import BeautifulSoup

from models import StandingsRow
from scrapers.base import BaseScraper

logger = logging.getLogger(__name__)


def _extract_team_id(href: str) -> str:
    m = re.search(r"/team-id/([^/\?#]+)", href)
    return m.group(1) if m else ""


def _cell_int(cell, default: int = 0) -> int:
    try:
        return int(cell.get_text(strip=True).rstrip("."))
    except (ValueError, AttributeError):
        return default


class StandingsScraper:
    def __init__(self, base: BaseScraper):
        self.base = base

    def scrape(self) -> List[StandingsRow]:
        """
        Fetch the league standings via the confirmed AJAX endpoint:
        /ajax.actual.table/-/staffel/{staffel_id}
        Returns a server-rendered HTML fragment with class 'table-striped'.
        """
        url = (
            f"{self.base.BASE_URL}/ajax.actual.table/-"
            f"/staffel/{self.base.STAFFEL_ID}"
        )
        soup = self.base.get(url)
        if soup is None:
            logger.warning("AJAX standings endpoint failed; falling back to spieltag page")
            soup = self.base.get(self.base.current_matchday_url())
        if soup is None:
            logger.error("Could not fetch standings from any source")
            return []
        return self._parse(soup)

    def _parse(self, soup: BeautifulSoup) -> List[StandingsRow]:
        # The confirmed table class from live inspection
        table = (
            soup.find("table", class_="table-striped") or
            soup.find("table", class_="table-full-width") or
            soup.find("table")
        )
        if table is None:
            logger.warning("No standings table found in response")
            return []

        standings: List[StandingsRow] = []
        position = 0

        for row in table.find_all("tr"):
            # Skip header row
            if row.get("class") and "thead" in row.get("class", []):
                continue
            if row.find("th"):
                continue

            entry = self._parse_row(row)
            if entry:
                position += 1
                entry.position = position
                standings.append(entry)

        return standings

    def _parse_row(self, row) -> Optional[StandingsRow]:
        # Position: td.column-rank
        rank_td = row.find("td", class_="column-rank")
        if rank_td is None:
            return None
        try:
            position = int(rank_td.get_text(strip=True).rstrip("."))
        except ValueError:
            return None

        # Team: td.column-club → a.club-wrapper or div.club-name
        club_td = row.find("td", class_="column-club")
        if club_td is None:
            return None
        club_link = club_td.find("a", class_="club-wrapper")
        if club_link:
            team_id = _extract_team_id(club_link.get("href", ""))
            name_div = club_link.find("div", class_="club-name")
            team_name = name_div.get_text(strip=True) if name_div else club_link.get_text(strip=True)
        else:
            team_name = club_td.get_text(strip=True)
            team_id = ""

        if not team_name:
            return None

        # Numeric stats: collect all <td> without the structural classes
        # Column order (confirmed): played | wins | draws | losses | goals | goal_diff | points
        # goals cell has class 'no-wrap'; points has 'column-points'
        goals_td = row.find("td", class_="no-wrap")
        points_td = row.find("td", class_="column-points")

        goals_text = goals_td.get_text(strip=True) if goals_td else "0:0"
        goals_m = re.match(r"(\d+)\s*:\s*(\d+)", goals_text)
        goals_for = int(goals_m.group(1)) if goals_m else 0
        goals_against = int(goals_m.group(2)) if goals_m else 0

        points = _cell_int(points_td) if points_td else 0

        # Find all td's with class 'hidden-small' in order: wins, draws, losses, goal_diff
        hidden = row.find_all("td", class_="hidden-small")
        # The 'column-icon' td appears first with no stats; the pattern is:
        # [icon] [rank] [club] [played] [wins] [draws] [losses] [no-wrap goals] [hidden goal_diff] [column-points]
        # hidden-small tds in order: wins(G), draws(U), losses(V), goal_diff(Tordifferenz)
        wins = _cell_int(hidden[0]) if len(hidden) > 0 else 0
        draws = _cell_int(hidden[1]) if len(hidden) > 1 else 0
        losses = _cell_int(hidden[2]) if len(hidden) > 2 else 0
        goal_diff = _cell_int(hidden[3]) if len(hidden) > 3 else goals_for - goals_against

        # Played: plain <td> after column-club and before hidden-small cells
        # It's the td that is NOT column-icon, NOT column-rank, NOT column-club,
        # NOT hidden-small, NOT no-wrap, NOT column-points
        all_tds = row.find_all("td")
        structural = {"column-icon", "column-rank", "column-club", "hidden-small", "no-wrap", "column-points"}
        plain_tds = [
            td for td in all_tds
            if not any(c in (td.get("class") or []) for c in structural)
        ]
        played = _cell_int(plain_tds[0]) if plain_tds else 0

        return StandingsRow(
            position=position,
            team=team_name,
            team_id=team_id,
            played=played,
            wins=wins,
            draws=draws,
            losses=losses,
            goals_for=goals_for,
            goals_against=goals_against,
            goal_diff=goal_diff,
            points=points,
        )
