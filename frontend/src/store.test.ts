import { describe, expect, it } from 'vitest'
import type { AppData, Scenario } from './types'
import {
  getScenarioDataKey,
  parseStoredScenarioState,
  reconcileStoredScenarioState,
} from './store'

const makeAppData = (generatedAt = '2026-04-03T16:01:50Z', modelVersion = 'v1.1.0'): AppData => ({
  teams: [
    { id: 'A', name: 'Alpha' },
    { id: 'B', name: 'Beta' },
  ],
  fixtures: [
    {
      match_id: 'm1',
      matchday: 1,
      home_team_id: 'A',
      away_team_id: 'B',
      home_team: 'Alpha',
      away_team: 'Beta',
      date: null,
      time: null,
      status: 'unplayed',
      home_score: null,
      away_score: null,
    },
  ],
  predictions: {
    m1: {
      home_score: 2,
      away_score: 1,
      xg_home: 1.8,
      xg_away: 0.9,
      confidence: 'medium',
      rationale: 'test',
    },
  },
  baselineTable: [
    {
      team_id: 'A',
      team: 'Alpha',
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goals_for: 0,
      goals_against: 0,
      goal_diff: 0,
      points: 0,
      position: 1,
    },
    {
      team_id: 'B',
      team: 'Beta',
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goals_for: 0,
      goals_against: 0,
      goal_diff: 0,
      points: 0,
      position: 2,
    },
  ],
  dataVersion: {
    generated_at: generatedAt,
    model_version: modelVersion,
    source: 'output/',
  },
  analysisReport: null,
  analysisMarkdown: null,
  matchPlan: null,
})

describe('store scenario persistence', () => {
  it('migrates legacy array-only local storage', () => {
    const scenarios: Scenario[] = [
      {
        id: 'default',
        name: 'Standard',
        created_at: '2026-04-03T10:00:00Z',
        updated_at: '2026-04-03T10:00:00Z',
        overrides: { m1: { home_score: 1, away_score: 0 } },
      },
    ]

    expect(parseStoredScenarioState(JSON.stringify(scenarios))).toEqual({
      dataKey: null,
      scenarios,
      activeScenarioId: 'default',
    })
  })

  it('creates a fresh default scenario when nothing is stored', () => {
    const appData = makeAppData()
    const reconciled = reconcileStoredScenarioState(null, appData)

    expect(reconciled.dataKey).toBe(getScenarioDataKey(appData))
    expect(reconciled.activeScenarioId).toBe('default')
    expect(reconciled.scenarios).toHaveLength(1)
    expect(reconciled.scenarios[0].overrides).toEqual({ m1: { home_score: 2, away_score: 1 } })
  })

  it('preserves scenarios when the data key matches', () => {
    const appData = makeAppData()
    const stored = {
      dataKey: getScenarioDataKey(appData),
      activeScenarioId: 'default',
      scenarios: [
        {
          id: 'default',
          name: 'Standard',
          created_at: '2026-04-03T10:00:00Z',
          updated_at: '2026-04-03T10:05:00Z',
          overrides: { m1: { home_score: 4, away_score: 0 } },
        },
      ],
    }

    const reconciled = reconcileStoredScenarioState(stored, appData)
    expect(reconciled.scenarios[0].overrides).toEqual({ m1: { home_score: 4, away_score: 0 } })
  })

  it('refreshes only the default scenario when the data key changes', () => {
    const oldAppData = makeAppData('2026-04-03T10:00:00Z', 'v1.0.0')
    const newAppData = makeAppData('2026-04-03T16:01:50Z', 'v1.1.0')
    const stored = {
      dataKey: getScenarioDataKey(oldAppData),
      activeScenarioId: 'custom-1',
      scenarios: [
        {
          id: 'default',
          name: 'Standard',
          created_at: '2026-04-03T10:00:00Z',
          updated_at: '2026-04-03T10:00:00Z',
          overrides: { m1: { home_score: 0, away_score: 3 } },
        },
        {
          id: 'custom-1',
          name: 'My Scenario',
          created_at: '2026-04-03T10:10:00Z',
          updated_at: '2026-04-03T10:10:00Z',
          overrides: { m1: { home_score: 5, away_score: 5 } },
        },
      ],
    }

    const reconciled = reconcileStoredScenarioState(stored, newAppData)
    expect(reconciled.activeScenarioId).toBe('custom-1')
    expect(reconciled.dataKey).toBe(getScenarioDataKey(newAppData))
    expect(reconciled.scenarios[0].id).toBe('default')
    expect(reconciled.scenarios[0].overrides).toEqual({ m1: { home_score: 2, away_score: 1 } })
    expect(reconciled.scenarios[1].overrides).toEqual({ m1: { home_score: 5, away_score: 5 } })
  })
})
