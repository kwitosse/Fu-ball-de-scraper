import { describe, it, expect } from 'vitest'
import { computeTable } from './tableEngine'
import type { Fixture, Prediction, ScoreOverride, TableRow } from './types'

const makeFixture = (id: string, home_id: string, home: string, away_id: string, away: string, matchday = 1, status = 'played', home_score: number | null = null, away_score: number | null = null): Fixture => ({
  match_id: id,
  matchday,
  home_team_id: home_id,
  away_team_id: away_id,
  home_team: home,
  away_team: away,
  date: null,
  time: null,
  status,
  home_score,
  away_score,
})

describe('computeTable', () => {
  it('accumulates points correctly for played matches', () => {
    const fixtures: Fixture[] = [
      makeFixture('m1', 'A', 'Alpha', 'B', 'Beta', 1, 'played', 2, 1),
      makeFixture('m2', 'B', 'Beta', 'C', 'Gamma', 1, 'played', 0, 0),
      makeFixture('m3', 'C', 'Gamma', 'A', 'Alpha', 1, 'played', 1, 3),
    ]
    const table = computeTable(fixtures, {}, {})
    const alpha = table.find(r => r.team_id === 'A')!
    const beta = table.find(r => r.team_id === 'B')!
    const gamma = table.find(r => r.team_id === 'C')!
    // Alpha: beat Beta 2-1 (3pts), beat Gamma 3-1 (3pts) = 6pts
    expect(alpha.wins).toBe(2)
    expect(alpha.points).toBe(6)
    expect(alpha.position).toBe(1)
    // Beta: lost 2-1 (0pts), drew 0-0 (1pt) = 1pt
    expect(beta.draws).toBe(1)
    expect(beta.losses).toBe(1)
    expect(beta.points).toBe(1)
    // Gamma: drew 0-0 (1pt), lost 1-3 (0pts) = 1pt
    expect(gamma.points).toBe(1)
  })

  it('user override takes priority over prediction', () => {
    const fixtures: Fixture[] = [
      makeFixture('m1', 'A', 'Alpha', 'B', 'Beta', 1, 'scheduled'),
    ]
    const predictions: Record<string, Prediction> = {
      m1: { home_score: 2, away_score: 0, xg_home: 2.1, xg_away: 0.9, confidence: 'high', rationale: 'test' },
    }
    const overrides: Record<string, ScoreOverride> = {
      m1: { home_score: 1, away_score: 1 },
    }
    const table = computeTable(fixtures, predictions, overrides)
    const alpha = table.find(r => r.team_id === 'A')!
    const beta = table.find(r => r.team_id === 'B')!
    // Override says 1-1 draw
    expect(alpha.draws).toBe(1)
    expect(beta.draws).toBe(1)
    expect(alpha.points).toBe(1)
    expect(beta.points).toBe(1)
  })

  it('prediction used when no override and fixture is unplayed', () => {
    const fixtures: Fixture[] = [
      makeFixture('m1', 'A', 'Alpha', 'B', 'Beta', 1, 'scheduled'),
    ]
    const predictions: Record<string, Prediction> = {
      m1: { home_score: 3, away_score: 0, xg_home: 3.0, xg_away: 0.5, confidence: 'high', rationale: 'test' },
    }
    const table = computeTable(fixtures, predictions, {})
    const alpha = table.find(r => r.team_id === 'A')!
    expect(alpha.wins).toBe(1)
    expect(alpha.points).toBe(3)
  })

  it('skips unplayed fixture with no prediction and no override', () => {
    const fixtures: Fixture[] = [
      makeFixture('m1', 'A', 'Alpha', 'B', 'Beta', 1, 'scheduled'),
    ]
    const table = computeTable(fixtures, {}, {})
    // Teams should exist but have 0 played
    const alpha = table.find(r => r.team_id === 'A')!
    expect(alpha.played).toBe(0)
    expect(alpha.points).toBe(0)
  })

  it('tie-break by goal difference', () => {
    const fixtures: Fixture[] = [
      makeFixture('m1', 'A', 'Alpha', 'C', 'Gamma', 1, 'played', 3, 0), // A: +3
      makeFixture('m2', 'B', 'Beta', 'C', 'Gamma', 1, 'played', 1, 0),  // B: +1 same pts as A
    ]
    const table = computeTable(fixtures, {}, {})
    const alpha = table.find(r => r.team_id === 'A')!
    const beta = table.find(r => r.team_id === 'B')!
    expect(alpha.position).toBe(1) // better goal diff
    expect(beta.position).toBe(2)
  })

  it('official score takes priority over override for played matches', () => {
    const fixtures: Fixture[] = [
      makeFixture('m1', 'A', 'Alpha', 'B', 'Beta', 1, 'played', 2, 0),
    ]
    const overrides: Record<string, ScoreOverride> = {
      m1: { home_score: 0, away_score: 5 }, // should be ignored
    }
    const table = computeTable(fixtures, {}, overrides)
    const alpha = table.find(r => r.team_id === 'A')!
    expect(alpha.wins).toBe(1) // 2-0 official result used
    expect(alpha.goals_for).toBe(2)
  })

  it('assigns positions 1..N', () => {
    const fixtures: Fixture[] = [
      makeFixture('m1', 'A', 'Alpha', 'B', 'Beta', 1, 'played', 1, 0),
      makeFixture('m2', 'C', 'Gamma', 'D', 'Delta', 1, 'played', 1, 0),
    ]
    const table = computeTable(fixtures, {}, {})
    expect(table.map(r => r.position)).toEqual([1, 2, 3, 4])
  })

  it('uses official baseline table and applies only unplayed fixtures on top', () => {
    const fixtures: Fixture[] = [
      makeFixture('played', 'A', 'Alpha', 'B', 'Beta', 1, 'played', 9, 0),
      makeFixture('future', 'B', 'Beta', 'A', 'Alpha', 2, 'scheduled'),
    ]
    const baseline: TableRow[] = [
      {
        team_id: 'A',
        team: 'Alpha',
        played: 1,
        wins: 0,
        draws: 1,
        losses: 0,
        goals_for: 1,
        goals_against: 1,
        goal_diff: 0,
        points: 1,
        position: 1,
      },
      {
        team_id: 'B',
        team: 'Beta',
        played: 1,
        wins: 0,
        draws: 1,
        losses: 0,
        goals_for: 1,
        goals_against: 1,
        goal_diff: 0,
        points: 1,
        position: 2,
      },
    ]
    const predictions: Record<string, Prediction> = {
      future: { home_score: 0, away_score: 2, xg_home: 0.7, xg_away: 1.9, confidence: 'high', rationale: 'test' },
    }

    const table = computeTable(fixtures, predictions, {}, baseline)
    const alpha = table.find(r => r.team_id === 'A')!
    const beta = table.find(r => r.team_id === 'B')!

    expect(alpha.played).toBe(2)
    expect(alpha.wins).toBe(1)
    expect(alpha.draws).toBe(1)
    expect(alpha.goals_for).toBe(3)
    expect(alpha.goals_against).toBe(1)
    expect(alpha.points).toBe(4)
    expect(beta.played).toBe(2)
    expect(beta.losses).toBe(1)
  })
})
