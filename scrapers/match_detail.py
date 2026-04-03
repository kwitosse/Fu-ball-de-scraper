"""
Match detail scraper for fussball.de

Key structure findings (from live HTML inspection):
  - Match main page: score, team names, venue, attendance, date are JS-obfuscated
  - AJAX match course: /ajax.match.course/-/mode/PAGE/spiel/{ID}
      - Returns clean HTML with all events
      - Goal events:  div.row-event (with span.score-left in column-event)
      - Own goals:    div.row-event.own-goal
      - Yellow card:  <i class="icon-card yellow-card">
      - Yellow-red:   span.icon-stack > span.icon-card-half + span.icon-card.red-card
      - Red card:     <i class="icon-card red-card">
      - Substitution: <i class="icon-substitute">
      - event-right = home team event
      - event-left  = away team event
  - Player names are obfuscated (data-obfuscation spans) → shown as None
  - Score: derived by counting goals from match course
  - Date: only available in page title (not obfuscated)
  - Attendance: "Zuschauer: N" pattern in page body
  - Venue: Google Maps link text
"""
import re
import logging
from typing import List, Optional, Tuple

from bs4 import BeautifulSoup, Tag

from models import MatchDetail, GoalEvent, CardEvent, SubstitutionEvent
from scrapers.base import BaseScraper

logger = logging.getLogger(__name__)

MINUTE_RE = re.compile(r"(\d{1,3})(?:\+\d+)?['\u2019\u0027]?")
TITLE_SCORE_RE = re.compile(r"Ergebnis:\s*(\d+)\s*:\s*(\d+)", re.I)


def _extract_minute(el: Tag) -> Optional[int]:
    time_el = el.find("div", class_="valign-inner")
    if time_el:
        m = MINUTE_RE.search(time_el.get_text(strip=True))
        if m:
            try:
                return int(m.group(1))
            except ValueError:
                pass
    return None


def _team_side(el: Tag) -> str:
    classes = el.get("class", [])
    if "event-right" in classes:
        return "away"
    if "event-left" in classes:
        return "home"
    return "unknown"


def _is_goal_event(el: Tag) -> bool:
    """Goal events have span.score-left inside div.column-event."""
    col_event = el.find("div", class_="column-event")
    return col_event is not None and col_event.find("span", class_="score-left") is not None


def _is_own_goal(el: Tag) -> bool:
    return "own-goal" in el.get("class", [])


class MatchDetailScraper:
    def __init__(self, base: BaseScraper):
        self.base = base

    def scrape(
        self,
        match_id: str,
        detail_url: str,
        matchday: Optional[int] = None,
    ) -> Optional[MatchDetail]:
        """
        Scrape a single match:
        1. Main match page  → team names, date, venue, attendance
        2. AJAX match course → goals, cards, substitutions
        """
        soup_main = self.base.get(detail_url)
        if soup_main is None:
            logger.warning(f"Could not fetch match page: {detail_url}")
            return None

        metadata = self._parse_metadata(soup_main, match_id, matchday)

        course_url = (
            f"{self.base.BASE_URL}/ajax.match.course/-/mode/PAGE/spiel/{match_id}"
        )
        soup_course = self.base.get(course_url)
        if soup_course:
            goals, cards, subs = self._parse_course(soup_course)
        else:
            goals, cards, subs = [], [], []

        # Derive score from goal events; if unavailable, use metadata fallback
        home_score, away_score = self._count_score(goals)
        if home_score is None or away_score is None:
            home_score = metadata.home_score
            away_score = metadata.away_score
        metadata.home_score = home_score
        metadata.away_score = away_score
        metadata.goals = goals
        metadata.cards = cards
        metadata.substitutions = subs
        return metadata

    def _parse_metadata(
        self, soup: BeautifulSoup, match_id: str, matchday: Optional[int]
    ) -> MatchDetail:
        full_text = soup.get_text(" ", strip=True)

        # Team names: first two /mannschaft/ links with non-empty text
        team_links = [
            a for a in soup.find_all("a", href=re.compile(r"/mannschaft/"))
            if a.get_text(strip=True)
        ]
        home_team = team_links[0].get_text(strip=True) if len(team_links) > 0 else "k.A."
        away_team = team_links[1].get_text(strip=True) if len(team_links) > 1 else "k.A."

        # Date: from page title ("19.10.2025") — not obfuscated
        date_str: Optional[str] = None
        if soup.title:
            title = soup.title.string or ""
            m = re.search(r"(\d{2}\.\d{2}\.\d{4})", title)
            if m:
                date_str = m.group(1)
        if not date_str:
            m = re.search(r"(\d{2}\.\d{2}\.\d{4})", full_text)
            date_str = m.group(1) if m else None

        # Kickoff time: "15:15 Uhr"
        kickoff: Optional[str] = None
        t_m = re.search(r"(\d{2}:\d{2})\s*Uhr", full_text, re.I)
        if t_m:
            kickoff = t_m.group(1)

        # Venue: fussball.de uses <a class="location"> for the venue link
        venue: Optional[str] = None
        location_link = soup.find("a", class_="location")
        if location_link:
            v = location_link.get_text(strip=True)
            if v and len(v) < 300:
                venue = v
        if not venue:
            # Fallback: Google Maps link text
            maps_link = soup.find("a", href=re.compile(r"maps\.google|google\.com/maps"))
            if maps_link:
                v = maps_link.get_text(separator=", ", strip=True)
                # Strip obfuscated PUA characters
                v_clean = re.sub(r"[\ue000-\uf8ff]+", "", v).strip()
                if v_clean and len(v_clean) < 300:
                    venue = v_clean

        # Attendance: "Zuschauer: N" or "Zuschauer N"
        attendance: Optional[int] = None
        att_m = re.search(r"Zuschauer[:\s]+(\d+)", full_text, re.I)
        if att_m:
            attendance = int(att_m.group(1))

        # Score fallback: title often contains "Ergebnis: X : Y" even when
        # match-course goal rows are incomplete or hidden.
        score_home: Optional[int] = None
        score_away: Optional[int] = None
        if soup.title and soup.title.string:
            t = soup.title.string
            m = TITLE_SCORE_RE.search(t)
            if m:
                score_home = int(m.group(1))
                score_away = int(m.group(2))
        return MatchDetail(
            match_id=match_id,
            home_team=home_team,
            away_team=away_team,
            home_score=score_home,
            away_score=score_away,
            date=date_str,
            kickoff=kickoff,
            venue=venue,
            attendance=attendance,
            matchday=matchday,
        )

    def _parse_course(
        self, soup: BeautifulSoup
    ) -> Tuple[List[GoalEvent], List[CardEvent], List[SubstitutionEvent]]:
        goals: List[GoalEvent] = []
        cards: List[CardEvent] = []
        subs: List[SubstitutionEvent] = []

        for ev in soup.find_all("div", class_="row-event"):
            minute = _extract_minute(ev)
            side = _team_side(ev)
            classes = ev.get("class", [])
            icon_i = ev.find("i")

            # --- GOAL ---
            if _is_goal_event(ev):
                own_goal = _is_own_goal(ev)
                goal_type = "own_goal" if own_goal else "normal"
                # player profile link (player name is obfuscated, only URL is clear)
                p_link = ev.find("a", href=re.compile(r"/spielerprofil/"))
                player_url = p_link.get("href") if p_link else None
                goals.append(GoalEvent(
                    minute=minute,
                    scorer=None,        # obfuscated → not extractable without JS
                    team=side,
                    goal_type=goal_type,
                    player_profile_url=player_url,
                ))

            # --- CARDS ---
            elif icon_i and "yellow-card" in icon_i.get("class", []) and "icon-card" in icon_i.get("class", []):
                if "red-card" in icon_i.get("class", []):
                    card_type = "red"
                else:
                    card_type = "yellow"
                p_link = ev.find("a", href=re.compile(r"/spielerprofil/"))
                player_url = p_link.get("href") if p_link else None
                cards.append(CardEvent(
                    minute=minute,
                    player=None,        # obfuscated
                    team=side,
                    card_type=card_type,
                    player_profile_url=player_url,
                ))

            elif icon_i and "red-card" in icon_i.get("class", []):
                p_link = ev.find("a", href=re.compile(r"/spielerprofil/"))
                player_url = p_link.get("href") if p_link else None
                cards.append(CardEvent(
                    minute=minute, player=None, team=side,
                    card_type="red", player_profile_url=player_url,
                ))

            elif ev.find("span", class_="icon-stack"):
                # Yellow-red: icon-stack with icon-card-half + icon-card.red-card
                p_link = ev.find("a", href=re.compile(r"/spielerprofil/"))
                player_url = p_link.get("href") if p_link else None
                # Distinguish yellow-red from double-card display
                text = ev.get_text(" ", strip=True).lower()
                ct = "yellow_red" if ("gelb" in text or "yellow" in text or "icon-card-half" in str(ev)) else "red"
                cards.append(CardEvent(
                    minute=minute, player=None, team=side,
                    card_type=ct, player_profile_url=player_url,
                ))

            # --- SUBSTITUTION ---
            elif icon_i and "icon-substitute" in icon_i.get("class", []):
                # Substitution: "Auswechslung k.A. (21) für k.A. (15)"
                text = ev.get_text(" ", strip=True)
                player_links = ev.find_all("a", href=re.compile(r"/spielerprofil/"))
                # Extract player numbers from "k.A. (N)" patterns
                nums = re.findall(r"\((\d+)\)", text)
                player_out = f"#{nums[0]}" if len(nums) > 0 else "k.A."
                player_in = f"#{nums[1]}" if len(nums) > 1 else "k.A."
                subs.append(SubstitutionEvent(
                    minute=minute,
                    player_out=player_out,
                    player_in=player_in,
                    team=side,
                ))

        return goals, cards, subs

    def _count_score(
        self, goals: List[GoalEvent]
    ) -> Tuple[Optional[int], Optional[int]]:
        """
        Derive final score from goal events.
        - event-right (home) regular goal → home +1
        - event-left  (away) regular goal → away +1
        - event-left  (away) own_goal     → home +1
        - event-right (home) own_goal     → away +1
        """
        if not goals:
            return None, None
        home = 0
        away = 0
        for g in goals:
            if g.goal_type == "own_goal":
                # Own goal benefits the opposing team
                if g.team == "away":
                    home += 1
                elif g.team == "home":
                    away += 1
            else:
                if g.team == "home":
                    home += 1
                elif g.team == "away":
                    away += 1
        return home, away
