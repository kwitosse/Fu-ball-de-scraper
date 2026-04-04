import { describe, expect, it } from 'vitest'
import { buildGameStateSplitData, buildGoalTimingData, buildStabilitySplitData } from './performanceChartData'
import type { RotationPerformanceReport } from '../types'

const report = {
  context: { focus_team: 'SG Rotation Leipzig II', generated_at: '2026-04-04T00:00:00Z', known_limitations: [] },
  coverage: { played_match_count: 16, timeline_match_count: 16, timeline_coverage_rate: 1, card_coverage_rate: 1 },
  summary: {
    played: 16,
    wins: 8,
    draws: 4,
    losses: 4,
    points: 28,
    ppg: 1.75,
    goals_for: 23,
    goals_against: 22,
    goal_diff: 1,
    record: '8-4-4',
    clean_sheets: 7,
    failed_to_score: 3,
  },
  timing: {
    goal_bins_for: [{ label: '0-15', count: 3 }, { label: '16-30', count: 2 }],
    goal_bins_against: [{ label: '0-15', count: 1 }, { label: '16-30', count: 4 }],
    avg_first_goal_for_minute: 42,
    avg_first_goal_against_minute: 39,
    second_half_share_for: 0.6,
    second_half_share_against: 0.5,
    late_goal_share_for: 0.2,
    late_goal_share_against: 0.3,
    late_goal_matches_for: 2,
    late_goal_matches_against: 3,
  },
  game_states: {
    scored_first: { played: 10, wins: 8, draws: 1, losses: 1, points: 25, ppg: 2.5, goals_for: 19, goals_against: 6, goal_diff: 13, record: '8-1-1', gf_per_game: 1.9, ga_per_game: 0.6 },
    conceded_first: { played: 4, wins: 0, draws: 1, losses: 3, points: 1, ppg: 0.25, goals_for: 4, goals_against: 16, goal_diff: -12, record: '0-1-3', gf_per_game: 1, ga_per_game: 4 },
    no_goal_timeline: { played: 2, wins: 0, draws: 2, losses: 0, points: 2, ppg: 1, goals_for: 0, goals_against: 0, goal_diff: 0, record: '0-2-0', gf_per_game: 0, ga_per_game: 0 },
    halftime_ahead: { played: 5, wins: 5, draws: 0, losses: 0, points: 15, ppg: 3, goals_for: 10, goals_against: 2, goal_diff: 8, record: '5-0-0', gf_per_game: 2, ga_per_game: 0.4 },
    halftime_level: { played: 8, wins: 3, draws: 4, losses: 1, points: 13, ppg: 1.62, goals_for: 11, goals_against: 6, goal_diff: 5, record: '3-4-1', gf_per_game: 1.38, ga_per_game: 0.75 },
    halftime_behind: { played: 3, wins: 0, draws: 0, losses: 3, points: 0, ppg: 0, goals_for: 2, goals_against: 14, goal_diff: -12, record: '0-0-3', gf_per_game: 0.67, ga_per_game: 4.67 },
    clean_sheet_record: { played: 7, wins: 5, draws: 2, losses: 0, points: 17, ppg: 2.43, goals_for: 9, goals_against: 0, goal_diff: 9, record: '5-2-0', gf_per_game: 1.29, ga_per_game: 0 },
    scored_two_plus_record: { played: 6, wins: 5, draws: 1, losses: 0, points: 16, ppg: 2.67, goals_for: 16, goals_against: 5, goal_diff: 11, record: '5-1-0', gf_per_game: 2.67, ga_per_game: 0.83 },
    conceded_two_plus_record: { played: 5, wins: 0, draws: 1, losses: 4, points: 1, ppg: 0.2, goals_for: 5, goals_against: 18, goal_diff: -13, record: '0-1-4', gf_per_game: 1, ga_per_game: 3.6 },
    lead_lost_matches: 3,
    dropped_points_after_leading: 3,
    won_points_after_trailing: 1,
    avg_equalizer_response_minutes: 31,
  },
  splits: {
    home: { played: 8, wins: 5, draws: 1, losses: 2, points: 16, ppg: 2, goals_for: 12, goals_against: 11, goal_diff: 1, record: '5-1-2', gf_per_game: 1.5, ga_per_game: 1.38 },
    away: { played: 8, wins: 3, draws: 3, losses: 2, points: 12, ppg: 1.5, goals_for: 11, goals_against: 11, goal_diff: 0, record: '3-3-2', gf_per_game: 1.38, ga_per_game: 1.38 },
  },
  discipline: { total_yellow: 20, total_red: 1, red_card_matches: 1, avg_cards_in_wins: 1.2, avg_cards_in_draws: 1.8, avg_cards_in_losses: 2.6 },
  findings: [],
  matches: [],
} satisfies RotationPerformanceReport

describe('performance chart data', () => {
  it('merges timing bins into grouped chart rows', () => {
    expect(buildGoalTimingData(report)).toEqual([
      { window: '0-15', scored: 3, conceded: 1 },
      { window: '16-30', scored: 2, conceded: 4 },
    ])
  })

  it('maps game-state split rows with ppg as the main measure', () => {
    expect(buildGameStateSplitData(report).map(row => row.label)).toEqual([
      'Scored First',
      'Conceded First',
      'Halftime Ahead',
      'Halftime Level',
      'Halftime Behind',
    ])
    expect(buildGameStateSplitData(report)[0].ppg).toBe(2.5)
  })

  it('maps stability and location splits into a single comparison series', () => {
    expect(buildStabilitySplitData(report).map(row => row.label)).toEqual([
      'Home',
      'Away',
      'Clean Sheet',
      '2+ Goals',
      '2+ Conceded',
    ])
    expect(buildStabilitySplitData(report)[2].record).toBe('5-2-0')
  })
})
