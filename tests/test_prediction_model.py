import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from prediction_model import (  # noqa: E402
    blend_strength,
    choose_scoreline,
    confidence_from_outcome_probabilities,
    expected_goals,
    outcome_probabilities,
)


class PredictionModelTests(unittest.TestCase):
    def test_blend_strength_shrinks_small_samples_toward_season_average(self):
        blended = blend_strength(1.8, 1.1, sample_size=2, full_weight_matches=8)
        self.assertAlmostEqual(blended, 1.275)

    def test_expected_goals_uses_league_base_without_extra_home_factor(self):
        xg = expected_goals(
            league_goal_base=1.7,
            attack_strength=1.0,
            defense_weakness=1.0,
            attack_form=1.0,
            defense_form=1.0,
        )
        self.assertAlmostEqual(xg, 1.7)

    def test_choose_scoreline_prefers_most_likely_exact_result(self):
        self.assertEqual(choose_scoreline(2.4, 0.8), (2, 0))
        self.assertEqual(choose_scoreline(1.4, 1.4), (1, 1))

    def test_outcome_probabilities_sum_to_one(self):
        home_win, draw, away_win = outcome_probabilities(1.2, 1.0)
        self.assertAlmostEqual(home_win + draw + away_win, 1.0)

    def test_confidence_thresholds_use_outcome_probabilities(self):
        self.assertEqual(confidence_from_outcome_probabilities(0.55, 0.20, 0.25), "high")
        self.assertEqual(confidence_from_outcome_probabilities(0.41, 0.30, 0.29), "medium")
        self.assertEqual(confidence_from_outcome_probabilities(0.37, 0.33, 0.30), "low")


if __name__ == "__main__":
    unittest.main()
