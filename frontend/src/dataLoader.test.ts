import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadAppData } from './dataLoader'

describe('loadAppData', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads the optional rotation performance report when present', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const payloads: Record<string, unknown> = {
        '/data/teams.json': [{ id: '1', name: 'SG Rotation Leipzig II' }],
        '/data/fixtures.json': [],
        '/data/prefill_predictions.json': {},
        '/data/baseline_table.json': [],
        '/data/data_version.json': { generated_at: '2026-04-04T12:00:00Z', model_version: 'v1', source: 'output/' },
        '/data/qa_report.json': { total_teams: 1, total_fixtures: 0, played_fixtures: 0, unplayed_fixtures: 0, matchdays: 0, missing_scores: 0, generated_at: '2026-04-04T12:00:00Z' },
        '/reports/rotation_promotion_analysis.json': null,
        '/reports/rotation_match_plan.json': null,
        '/reports/rotation_match_performance.json': {
          context: { focus_team: 'SG Rotation Leipzig II', generated_at: '2026-04-04T12:00:00Z', known_limitations: [] },
          coverage: { played_match_count: 0, timeline_match_count: 0, timeline_coverage_rate: 0, card_coverage_rate: 0 },
          summary: { played: 0, wins: 0, draws: 0, losses: 0, points: 0, ppg: 0, goals_for: 0, goals_against: 0, goal_diff: 0, record: '0-0-0', clean_sheets: 0, failed_to_score: 0 },
          timing: {
            goal_bins_for: [],
            goal_bins_against: [],
            avg_first_goal_for_minute: null,
            avg_first_goal_against_minute: null,
            second_half_share_for: 0,
            second_half_share_against: 0,
            late_goal_share_for: 0,
            late_goal_share_against: 0,
            late_goal_matches_for: 0,
            late_goal_matches_against: 0,
          },
          game_states: {
            scored_first: { played: 0, wins: 0, draws: 0, losses: 0, points: 0, ppg: 0, goals_for: 0, goals_against: 0, goal_diff: 0, record: '0-0-0', gf_per_game: 0, ga_per_game: 0 },
            conceded_first: { played: 0, wins: 0, draws: 0, losses: 0, points: 0, ppg: 0, goals_for: 0, goals_against: 0, goal_diff: 0, record: '0-0-0', gf_per_game: 0, ga_per_game: 0 },
            no_goal_timeline: { played: 0, wins: 0, draws: 0, losses: 0, points: 0, ppg: 0, goals_for: 0, goals_against: 0, goal_diff: 0, record: '0-0-0', gf_per_game: 0, ga_per_game: 0 },
            halftime_ahead: { played: 0, wins: 0, draws: 0, losses: 0, points: 0, ppg: 0, goals_for: 0, goals_against: 0, goal_diff: 0, record: '0-0-0', gf_per_game: 0, ga_per_game: 0 },
            halftime_level: { played: 0, wins: 0, draws: 0, losses: 0, points: 0, ppg: 0, goals_for: 0, goals_against: 0, goal_diff: 0, record: '0-0-0', gf_per_game: 0, ga_per_game: 0 },
            halftime_behind: { played: 0, wins: 0, draws: 0, losses: 0, points: 0, ppg: 0, goals_for: 0, goals_against: 0, goal_diff: 0, record: '0-0-0', gf_per_game: 0, ga_per_game: 0 },
            clean_sheet_record: { played: 0, wins: 0, draws: 0, losses: 0, points: 0, ppg: 0, goals_for: 0, goals_against: 0, goal_diff: 0, record: '0-0-0', gf_per_game: 0, ga_per_game: 0 },
            scored_two_plus_record: { played: 0, wins: 0, draws: 0, losses: 0, points: 0, ppg: 0, goals_for: 0, goals_against: 0, goal_diff: 0, record: '0-0-0', gf_per_game: 0, ga_per_game: 0 },
            conceded_two_plus_record: { played: 0, wins: 0, draws: 0, losses: 0, points: 0, ppg: 0, goals_for: 0, goals_against: 0, goal_diff: 0, record: '0-0-0', gf_per_game: 0, ga_per_game: 0 },
            lead_lost_matches: 0,
            dropped_points_after_leading: 0,
            won_points_after_trailing: 0,
            avg_equalizer_response_minutes: null,
          },
          splits: {
            home: { played: 0, wins: 0, draws: 0, losses: 0, points: 0, ppg: 0, goals_for: 0, goals_against: 0, goal_diff: 0, record: '0-0-0', gf_per_game: 0, ga_per_game: 0 },
            away: { played: 0, wins: 0, draws: 0, losses: 0, points: 0, ppg: 0, goals_for: 0, goals_against: 0, goal_diff: 0, record: '0-0-0', gf_per_game: 0, ga_per_game: 0 },
          },
          discipline: { total_yellow: 0, total_red: 0, red_card_matches: 0, avg_cards_in_wins: 0, avg_cards_in_draws: 0, avg_cards_in_losses: 0 },
          findings: [],
          matches: [],
        },
      }

      if (url === '/reports/rotation_promotion_analysis.md') {
        return { ok: true, status: 200, text: async (): Promise<string> => '' }
      }

      const payload = payloads[url]
      return {
        ok: true,
        status: 200,
        json: async () => payload,
        text: async (): Promise<string> => '',
      }
    })

    vi.stubGlobal('fetch', fetchMock)

    const data = await loadAppData()

    expect(data.rotationPerformanceReport?.context.focus_team).toBe('SG Rotation Leipzig II')
    expect(fetchMock).toHaveBeenCalledWith('/reports/rotation_match_performance.json')
  })
})
