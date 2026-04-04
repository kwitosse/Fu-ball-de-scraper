import unittest
from datetime import datetime

from club_dual_use_analysis.analyze import (
    AppearanceRecord,
    TeamRef,
    build_actual_participants,
    build_shared_players,
    collect_window_cases,
    parse_lineup_html,
    parse_matchplan_html,
    parse_player_name_from_html,
    parse_substitution_html,
)


class ClubDualUseAnalysisTests(unittest.TestCase):
    def test_parse_player_name_from_basisprofil_title(self):
        html = "<html><head><title>Max Kieselbach Basisprofil | FUSSBALL.DE</title></head></html>"
        self.assertEqual(parse_player_name_from_html(html), "Max Kieselbach")

    def test_parse_player_name_from_spielerprofil_title_with_club(self):
        html = (
            "<html><head><title>Fabian Benusch (SG Rotation Leipzig 1950) "
            "Spielerprofil | FUSSBALL.DE</title></head></html>"
        )
        self.assertEqual(parse_player_name_from_html(html), "Fabian Benusch")

    def test_parse_player_name_ignores_generic_site_title(self):
        html = (
            "<html><head><title>FUSSBALL.DE - Die Heimat des Amateurfußballs"
            "</title></head></html>"
        )
        self.assertIsNone(parse_player_name_from_html(html))

    def test_parse_matchplan_html_filters_unofficial_rows_and_detects_tracked_side(self):
        tracked_team = TeamRef(
            club_key="lipsia",
            club_name="SV Lipsia 93 Eutritzsch",
            tier="second",
            team_name="SV Lipsia 93 Eutritzsch II",
            team_id="TEAM2",
        )
        html = """
        <table><tbody>
          <tr class="row-competition hidden-small">
            <td class="column-date">So, 29.03.26 | 15:00</td>
            <td colspan="3" class="column-team"><a>1.Kreisliga (A)</a></td>
            <td colspan="2"><a>ME | 638001108</a></td>
          </tr>
          <tr class="odd">
            <td class="column-club">
              <a class="club-wrapper" href="https://www.fussball.de/mannschaft/home/-/saison/2526/team-id/HOME1">
                <div class="club-name">SG Rotation Leipzig II</div>
              </a>
            </td>
            <td class="column-colon">:</td>
            <td class="column-club no-border">
              <a class="club-wrapper" href="https://www.fussball.de/mannschaft/away/-/saison/2526/team-id/TEAM2">
                <div class="club-name">SV Lipsia 93 Eutritzsch II</div>
              </a>
            </td>
            <td class="column-score">
              <a href="https://www.fussball.de/spiel/rotation-lipsia/-/spiel/MATCH001">2:1</a>
            </td>
          </tr>
          <tr class="row-competition hidden-small">
            <td class="column-date">So, 22.03.26 | 15:00</td>
            <td colspan="3" class="column-team"><a>Kreisfreundschaftsspiele</a></td>
            <td colspan="2"><a>FS | 830015241</a></td>
          </tr>
          <tr>
            <td class="column-club">
              <a class="club-wrapper" href="https://www.fussball.de/mannschaft/away/-/saison/2526/team-id/TEAM2">
                <div class="club-name">SV Lipsia 93 Eutritzsch II</div>
              </a>
            </td>
            <td class="column-colon">:</td>
            <td class="column-club no-border">
              <a class="club-wrapper" href="https://www.fussball.de/mannschaft/opp/-/saison/2526/team-id/OPP1">
                <div class="club-name">TSV Example</div>
              </a>
            </td>
            <td class="column-score">
              <a href="https://www.fussball.de/spiel/lipsia-example/-/spiel/MATCH002">0:0</a>
            </td>
          </tr>
        </tbody></table>
        """
        records = parse_matchplan_html(html, tracked_team)
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0].match_id, "MATCH001")
        self.assertEqual(records[0].tracked_side, "away")
        self.assertEqual(records[0].opponent_name, "SG Rotation Leipzig II")
        self.assertEqual(records[0].competition_code, "ME")

    def test_parse_lineup_and_substitutions_build_actual_participants_without_bench_only(self):
        lineup_html = """
        <div class="starting">
          <a class="player-wrapper home" href="https://www.fussball.de/spielerprofil/-/player-id/P1"></a>
          <a class="player-wrapper home" href="https://www.fussball.de/spielerprofil/-/player-id/P2"></a>
          <a class="player-wrapper away" href="https://www.fussball.de/spielerprofil/-/player-id/A1"></a>
        </div>
        <div class="substitutes">
          <a class="player-wrapper home" href="https://www.fussball.de/spielerprofil/-/player-id/B1"></a>
          <a class="player-wrapper away" href="https://www.fussball.de/spielerprofil/-/player-id/B2"></a>
        </div>
        """
        course_html = """
        <div class="row-event event-left">
          <div class="column-event"><i class="icon-substitute"></i></div>
          <div class="column-player">
            <a href="https://www.fussball.de/spielerprofil/-/player-id/B1">in</a>
            <a href="https://www.fussball.de/spielerprofil/-/player-id/P2">out</a>
          </div>
        </div>
        """
        lineup = parse_lineup_html(lineup_html)
        substitutions = parse_substitution_html(course_html)
        participants = build_actual_participants(lineup, substitutions, "home")
        self.assertEqual(
            participants,
            [
                "https://www.fussball.de/spielerprofil/-/player-id/P1",
                "https://www.fussball.de/spielerprofil/-/player-id/P2",
                "https://www.fussball.de/spielerprofil/-/player-id/B1",
            ],
        )

    def test_collect_window_cases_and_shared_players(self):
        def dt(value: str) -> datetime:
            return datetime.fromisoformat(value)

        appearances = [
            AppearanceRecord(
                player_key="player-id:1",
                player_name="Fabian Benusch",
                profile_url="https://www.fussball.de/spielerprofil/-/player-id/1",
                club_key="lipsia",
                club_name="SV Lipsia 93 Eutritzsch",
                team_tier="first",
                team_name="SV Lipsia 93 Eutritzsch",
                team_id="FIRST",
                match_id="M1",
                kickoff=dt("2026-03-28T15:00:00+01:00"),
                competition_name="Landesliga",
                competition_code="ME",
                opponent_name="Opponent A",
                home_team="A",
                away_team="B",
            ),
            AppearanceRecord(
                player_key="player-id:1",
                player_name="Fabian Benusch",
                profile_url="https://www.fussball.de/spielerprofil/-/player-id/1",
                club_key="lipsia",
                club_name="SV Lipsia 93 Eutritzsch",
                team_tier="second",
                team_name="SV Lipsia 93 Eutritzsch II",
                team_id="SECOND",
                match_id="M2",
                kickoff=dt("2026-03-30T12:00:00+02:00"),
                competition_name="1.Kreisliga (A)",
                competition_code="ME",
                opponent_name="Opponent B",
                home_team="C",
                away_team="D",
            ),
            AppearanceRecord(
                player_key="player-id:2",
                player_name="Another Player",
                profile_url="https://www.fussball.de/spielerprofil/-/player-id/2",
                club_key="lipsia",
                club_name="SV Lipsia 93 Eutritzsch",
                team_tier="second",
                team_name="SV Lipsia 93 Eutritzsch II",
                team_id="SECOND",
                match_id="M3",
                kickoff=dt("2026-03-20T12:00:00+01:00"),
                competition_name="1.Kreisliga (A)",
                competition_code="ME",
                opponent_name="Opponent C",
                home_team="E",
                away_team="F",
            ),
        ]
        forward = collect_window_cases(appearances, "first", "second")
        reverse = collect_window_cases(appearances, "second", "first")
        shared = build_shared_players(appearances)
        self.assertEqual(len(forward), 1)
        self.assertEqual(len(reverse), 0)
        self.assertEqual(len(shared), 1)
        self.assertEqual(shared[0]["player_name"], "Fabian Benusch")
        self.assertEqual(len(shared[0]["first_team_matches"]), 1)
        self.assertEqual(len(shared[0]["second_team_matches"]), 1)
        self.assertEqual(shared[0]["first_team_matches"][0]["match_id"], "M1")
        self.assertEqual(shared[0]["second_team_matches"][0]["match_id"], "M2")


if __name__ == "__main__":
    unittest.main()
