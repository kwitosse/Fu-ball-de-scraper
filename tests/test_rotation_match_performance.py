import unittest

from scripts.analyze_rotation_match_performance import (
    build_record,
    detail_score_is_trustworthy,
    event_is_for_focus,
    minute_bin,
    summarize_game_states,
    summarize_timing,
)


class RotationMatchPerformanceTests(unittest.TestCase):
    def test_detail_score_requires_goal_count_match(self):
        detail = {
            "home_score": 2,
            "away_score": 1,
            "goals": [
                {"team": "home", "goal_type": "normal"},
                {"team": "away", "goal_type": "normal"},
            ],
        }
        self.assertFalse(detail_score_is_trustworthy(detail))

    def test_detail_score_accepts_matching_own_goal_count(self):
        detail = {
            "home_score": 2,
            "away_score": 0,
            "goals": [
                {"team": "home", "goal_type": "normal"},
                {"team": "away", "goal_type": "own_goal"},
            ],
        }
        self.assertTrue(detail_score_is_trustworthy(detail))

    def test_event_is_for_focus_flips_own_goal(self):
        self.assertTrue(event_is_for_focus("home", True))
        self.assertFalse(event_is_for_focus("home", True, own_goal=True))
        self.assertTrue(event_is_for_focus("away", True, own_goal=True))

    def test_minute_bins_cover_match_segments(self):
        self.assertEqual(minute_bin(8), "0-15")
        self.assertEqual(minute_bin(29), "16-30")
        self.assertEqual(minute_bin(44), "31-45")
        self.assertEqual(minute_bin(58), "46-60")
        self.assertEqual(minute_bin(72), "61-75")
        self.assertEqual(minute_bin(88), "76-90")

    def test_timing_summary_counts_bins_and_late_goals(self):
        matches = [
            {
                "goal_timeline": [
                    {"kind": "for", "minute": 10},
                    {"kind": "against", "minute": 77},
                    {"kind": "for", "minute": 82},
                ]
            },
            {
                "goal_timeline": [
                    {"kind": "against", "minute": 35},
                ]
            },
        ]

        summary = summarize_timing(matches)
        self.assertEqual(summary["goal_bins_for"][0]["count"], 1)
        self.assertEqual(summary["goal_bins_for"][-1]["count"], 1)
        self.assertEqual(summary["goal_bins_against"][2]["count"], 1)
        self.assertEqual(summary["goal_bins_against"][-1]["count"], 1)
        self.assertEqual(summary["late_goal_matches_for"], 1)
        self.assertEqual(summary["late_goal_matches_against"], 1)

    def test_game_state_summary_derives_records_and_recovery(self):
        matches = [
            {
                "points": 3,
                "gf": 2,
                "ga": 0,
                "first_goal": "for",
                "halftime_state": "ahead",
                "kept_clean_sheet": True,
                "failed_to_score": False,
                "scored_two_plus": True,
                "conceded_two_plus": False,
                "derived": {"lead_lost": False, "equalizer_response_minutes": []},
                "led_then_dropped_points": False,
                "trailed_then_won_points": False,
            },
            {
                "points": 1,
                "gf": 2,
                "ga": 2,
                "first_goal": "against",
                "halftime_state": "level",
                "kept_clean_sheet": False,
                "failed_to_score": False,
                "scored_two_plus": True,
                "conceded_two_plus": True,
                "derived": {"lead_lost": True, "equalizer_response_minutes": [12]},
                "led_then_dropped_points": True,
                "trailed_then_won_points": True,
            },
            {
                "points": 0,
                "gf": 0,
                "ga": 3,
                "first_goal": "against",
                "halftime_state": "behind",
                "kept_clean_sheet": False,
                "failed_to_score": True,
                "scored_two_plus": False,
                "conceded_two_plus": True,
                "derived": {"lead_lost": False, "equalizer_response_minutes": []},
                "led_then_dropped_points": False,
                "trailed_then_won_points": False,
            },
        ]

        summary = summarize_game_states(matches)
        self.assertEqual(summary["scored_first"]["record"], "1-0-0")
        self.assertEqual(summary["conceded_first"]["record"], "0-1-1")
        self.assertEqual(summary["halftime_ahead"]["record"], "1-0-0")
        self.assertEqual(summary["halftime_behind"]["record"], "0-0-1")
        self.assertEqual(summary["lead_lost_matches"], 1)
        self.assertEqual(summary["dropped_points_after_leading"], 1)
        self.assertEqual(summary["won_points_after_trailing"], 1)
        self.assertEqual(summary["avg_equalizer_response_minutes"], 12)

    def test_build_record_returns_consistent_totals(self):
        record = build_record([
            {"points": 3, "gf": 3, "ga": 1},
            {"points": 1, "gf": 0, "ga": 0},
            {"points": 0, "gf": 1, "ga": 2},
        ])
        self.assertEqual(record["played"], 3)
        self.assertEqual(record["wins"], 1)
        self.assertEqual(record["draws"], 1)
        self.assertEqual(record["losses"], 1)
        self.assertEqual(record["points"], 4)
        self.assertEqual(record["goal_diff"], 1)


if __name__ == "__main__":
    unittest.main()
