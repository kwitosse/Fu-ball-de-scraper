import re
import logging
from typing import List, Optional

from bs4 import BeautifulSoup

from models import TopScorer
from scrapers.base import BaseScraper

logger = logging.getLogger(__name__)


def _safe_int(text: str, default: int = 0) -> int:
    try:
        return int(text.strip().rstrip("."))
    except (ValueError, AttributeError):
        return default


def _extract_player_id(href: str) -> Optional[str]:
    m = re.search(r"/player-id/([^/\?#]+)", href)
    if m:
        return m.group(1)
    # Also try /spielerprofil/-/player-id/ID
    m2 = re.search(r"/spielerprofil/[^/]*/?(?:player-id/)?([A-Z0-9]{20,})", href)
    return m2.group(1) if m2 else None


class TopScorersScraper:
    def __init__(self, base: BaseScraper):
        self.base = base

    def scrape(self) -> List[TopScorer]:
        """Fetch the top scorers (Torjäger) page and parse the list."""
        url = self.base.top_scorers_url()
        soup = self.base.get(url)
        if soup is None:
            logger.error("Could not fetch top scorers page")
            return []
        return self._parse(soup)

    def _parse(self, soup: BeautifulSoup) -> List[TopScorer]:
        scorers: List[TopScorer] = []

        # Strategy 1: find a <table> with a 'Tore' or 'Tor' column
        table = self._find_scorers_table(soup)
        if table:
            scorers = self._parse_table(table)

        # Strategy 2: structured list items / divs
        if not scorers:
            scorers = self._parse_list_items(soup)

        # Strategy 3: brute-force text scan
        if not scorers:
            scorers = self._parse_from_text(soup)

        return sorted(scorers, key=lambda s: s.rank)

    def _find_scorers_table(self, soup: BeautifulSoup):
        """Find the table containing scorer data by looking for 'Tore' header."""
        for table in soup.find_all("table"):
            headers = [th.get_text(strip=True).lower() for th in table.find_all(["th", "td"])[:8]]
            if any("tor" in h for h in headers):
                return table
            text = table.get_text()
            if "Tore" in text and ("Spieler" in text or "Mannschaft" in text):
                return table
        return None

    def _parse_table(self, table) -> List[TopScorer]:
        scorers: List[TopScorer] = []
        rows = table.find_all("tr")

        for row in rows:
            cells = row.find_all(["td", "th"])
            if len(cells) < 3:
                continue
            cell_texts = [c.get_text(strip=True) for c in cells]

            # Skip header rows
            if any(t.lower() in ("pl.", "spieler", "mannschaft", "tore") for t in cell_texts):
                continue

            # Rank is first cell
            rank = _safe_int(cell_texts[0])
            if rank == 0:
                continue

            # Player in cell containing /spielerprofil/ link
            player_link = row.find("a", href=re.compile(r"/spielerprofil/"))
            player_name = player_link.get_text(strip=True) if player_link else cell_texts[1] if len(cell_texts) > 1 else "k.A."
            player_id = _extract_player_id(player_link.get("href", "")) if player_link else None

            # Team — link to /mannschaft/
            team_link = row.find("a", href=re.compile(r"/mannschaft/"))
            team_name = team_link.get_text(strip=True) if team_link else ""
            if not team_name and len(cell_texts) > 2:
                team_name = cell_texts[2]

            # Goals: last numeric cell
            goals = 0
            for ct in reversed(cell_texts):
                if re.match(r"^\d+$", ct.strip()):
                    goals = int(ct.strip())
                    break

            if player_name:
                scorers.append(TopScorer(
                    rank=rank,
                    player=player_name,
                    player_id=player_id,
                    team=team_name,
                    goals=goals,
                ))

        return scorers

    def _parse_list_items(self, soup: BeautifulSoup) -> List[TopScorer]:
        """Fallback: parse scorer entries from <li> or <div> elements."""
        scorers: List[TopScorer] = []
        candidates = soup.find_all(
            ["li", "div"],
            class_=re.compile(r"item|row|scorer|player|torjaeger|entry", re.I),
        )
        rank = 0
        for el in candidates:
            text = el.get_text(" ", strip=True)
            rank_m = re.match(r"^(\d+)\.?\s*", text)
            if not rank_m:
                continue
            rank = int(rank_m.group(1))
            goals_m = re.search(r"(\d+)\s*$", text)
            goals = int(goals_m.group(1)) if goals_m else 0

            player_link = el.find("a", href=re.compile(r"/spielerprofil/"))
            player_name = player_link.get_text(strip=True) if player_link else "k.A."
            player_id = _extract_player_id(player_link.get("href", "")) if player_link else None
            team_link = el.find("a", href=re.compile(r"/mannschaft/"))
            team_name = team_link.get_text(strip=True) if team_link else "k.A."

            scorers.append(TopScorer(
                rank=rank,
                player=player_name,
                player_id=player_id,
                team=team_name,
                goals=goals,
            ))

        return scorers

    def _parse_from_text(self, soup: BeautifulSoup) -> List[TopScorer]:
        """Last-resort: scan raw text lines for scorer patterns."""
        scorers: List[TopScorer] = []
        lines = soup.get_text("\n").split("\n")
        rank = 0

        for i, line in enumerate(lines):
            line = line.strip()
            m = re.match(r"^(\d+)\.?\s+(.+?)\s+(\d+)$", line)
            if m:
                rank = int(m.group(1))
                player = m.group(2).strip()
                goals = int(m.group(3))
                # Try to get team from next line
                team = lines[i + 1].strip() if i + 1 < len(lines) else "k.A."
                scorers.append(TopScorer(
                    rank=rank, player=player, player_id=None,
                    team=team, goals=goals,
                ))

        return scorers
