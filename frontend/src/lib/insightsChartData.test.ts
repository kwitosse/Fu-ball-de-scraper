import { describe, expect, it } from 'vitest'
import { buildRivalProjectionData, buildRivalTrendData, buildTrendSeries } from './insightsChartData'
import type { AnalysisReport, Fixture, TableRow } from '../types'

const makeFixture = (
  id: string,
  matchday: number,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number
): Fixture => ({
  match_id: id,
  matchday,
  home_team_id: `${homeTeam}-id`,
  away_team_id: `${awayTeam}-id`,
  home_team: homeTeam,
  away_team: awayTeam,
  date: null,
  time: null,
  status: 'played',
  home_score: homeScore,
  away_score: awayScore,
})

const baselineTable: TableRow[] = [
  { team_id: 'a', team: 'Alpha', played: 0, wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0, goal_diff: 0, points: 0, position: 1 },
  { team_id: 'b', team: 'Beta', played: 0, wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0, goal_diff: 0, points: 0, position: 2 },
  { team_id: 'c', team: 'Gamma', played: 0, wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0, goal_diff: 0, points: 0, position: 3 },
]

const analysisReport = {
  context: { league: 'League', season: '2025/26', focus_team: 'Alpha', analysis_generated_at: '2026-04-04T00:00:00Z', known_data_limitations: [] },
  current_state: {
    position: 2,
    points: 24,
    record: { wins: 7, draws: 3, losses: 2 },
    ppg: 2,
    remaining_matches: 10,
    max_possible_points: 54,
    gap_to_rank1: 2,
    gap_to_rank2: 1,
    goals: { for: 24, against: 12, diff: 12 },
  },
  pace_projection: {
    rival_projection: [
      { team: 'Alpha', position: 2, current_points: 24, ppg: 2, projected_final_points: 44 },
      { team: 'Beta', position: 1, current_points: 25, ppg: 2.08, projected_final_points: 46 },
    ],
    rank2_bands: { hold_current_pace: 45, slight_slowdown: 43, strong_finish: 47, direct_duel_adjusted: 44 },
    required_points_from_last_10: {
      to_match_rank2_hold_pace: 20,
      to_beat_rank2_hold_pace_by_1: 21,
      to_match_rank2_direct_duel_adjusted: 19,
      conservative: 21,
      realistic: 19,
      aggressive: 23,
    },
    required_record_hint: { realistic_target: '6-1-3', safer_target: '7-0-3' },
  },
  goal_difference: {
    target_ranges: {
      minimum_viable_end_gd: { net_gd_gain_needed: 4, avg_gd_per_game_needed: 0.4 },
      realistic_end_gd: { net_gd_gain_needed: 7, avg_gd_per_game_needed: 0.7 },
      strong_end_gd: { net_gd_gain_needed: 10, avg_gd_per_game_needed: 1 },
    },
  },
  remaining_fixtures: { count: 10, average_opponent_ppg: 1.5, direct_rival_matches_count: 2, fixtures: [] },
  form_and_trends: {
    known_played_matches: 12,
    points_last_5: 10,
    points_last_8: 15,
    avg_gf_last_5: 2.1,
    avg_ga_last_5: 1.1,
    clean_sheet_rate: 0.4,
    games_2plus_goals_rate: 0.6,
  },
  scenario_matrix: [],
  simulation: {
    pace_calibrated: { iterations: 1000, top2_probability: 0.45 },
    fixture_strength_poisson: {
      iterations: 1000,
      top2_probability: 0.49,
      focus_points_distribution: { p10: 38, p50: 43, p90: 47 },
      focus_expected_points_from_remaining: 18,
      focus_expected_final_points: 42,
    },
  },
  conclusions: {
    realistic_top2_total_points: 43,
    minimum_acceptable_points_from_last_10: 18,
    promotion_like_profile: [],
    title_path_assessment: 'possible',
  },
} satisfies AnalysisReport

describe('insights chart data', () => {
  it('builds focus-team trend points per played matchday', () => {
    const fixtures = [
      makeFixture('m1', 1, 'Alpha', 'Beta', 2, 1),
      makeFixture('m2', 2, 'Gamma', 'Alpha', 0, 0),
    ]

    expect(buildTrendSeries(fixtures, baselineTable, 'Alpha')).toEqual([
      { matchday: 1, points: 3, position: 1, goalDiff: 1 },
      { matchday: 2, points: 4, position: 1, goalDiff: 1 },
    ])
  })

  it('builds rival trend rows keyed by matchday', () => {
    const fixtures = [
      makeFixture('m1', 1, 'Alpha', 'Beta', 2, 1),
      makeFixture('m2', 1, 'Gamma', 'Delta', 0, 0),
      makeFixture('m3', 2, 'Beta', 'Gamma', 3, 0),
    ]

    expect(buildRivalTrendData(fixtures, baselineTable, ['Alpha', 'Beta', 'Gamma'])).toEqual([
      { matchday: 1, Alpha: 3, Beta: 0, Gamma: 1 },
      { matchday: 2, Alpha: 3, Beta: 3, Gamma: 1 },
    ])
  })

  it('maps rival projection rows for chart consumption', () => {
    expect(buildRivalProjectionData(analysisReport)).toEqual([
      { team: 'Alpha', position: 2, currentPoints: 24, projectedPoints: 44 },
      { team: 'Beta', position: 1, currentPoints: 25, projectedPoints: 46 },
    ])
  })
})
