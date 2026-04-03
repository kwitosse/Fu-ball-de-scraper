import unittest

from bs4 import BeautifulSoup

from models import GoalEvent
from scrapers.match_detail import MatchDetailScraper, _team_side


class MatchDetailScraperTests(unittest.TestCase):
    def test_team_side_maps_event_right_to_away(self):
        soup = BeautifulSoup('<div class="row-event event-right"></div>', "lxml")
        self.assertEqual(_team_side(soup.div), "away")

    def test_team_side_maps_event_left_to_home(self):
        soup = BeautifulSoup('<div class="row-event event-left"></div>', "lxml")
        self.assertEqual(_team_side(soup.div), "home")

    def test_count_score_uses_goal_team_side(self):
        scraper = MatchDetailScraper(base=None)
        goals = [
            GoalEvent(minute=4, scorer=None, team="away", goal_type="normal"),
            GoalEvent(minute=8, scorer=None, team="away", goal_type="normal"),
            GoalEvent(minute=11, scorer=None, team="home", goal_type="normal"),
            GoalEvent(minute=48, scorer=None, team="home", goal_type="normal"),
            GoalEvent(minute=75, scorer=None, team="away", goal_type="normal"),
            GoalEvent(minute=82, scorer=None, team="away", goal_type="normal"),
            GoalEvent(minute=89, scorer=None, team="away", goal_type="normal"),
        ]
        self.assertEqual(scraper._count_score(goals), (2, 5))


if __name__ == "__main__":
    unittest.main()
