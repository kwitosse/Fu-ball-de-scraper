import { computeTable } from '../tableEngine'
import type { AnalysisReport, Fixture, TableRow } from '../types'

export type TrendPoint = {
  matchday: number
  points: number
  position: number
  goalDiff: number
}

export type RivalTrendDatum = {
  matchday: number
} & Record<string, number>

export type RivalProjectionDatum = {
  team: string
  position: number
  currentPoints: number
  projectedPoints: number
}

function getPlayedFixtures(fixtures: Fixture[]) {
  return fixtures
    .filter(fixture => fixture.status === 'played' && fixture.home_score !== null && fixture.away_score !== null)
    .sort((a, b) => a.matchday - b.matchday)
}

function getPlayedMatchdays(fixtures: Fixture[]) {
  return Array.from(new Set(getPlayedFixtures(fixtures).map(fixture => fixture.matchday))).sort((a, b) => a - b)
}

export function buildTrendSeries(fixtures: Fixture[], baselineTable: TableRow[], focusTeam: string): TrendPoint[] {
  const playedFixtures = getPlayedFixtures(fixtures)
  const matchdays = getPlayedMatchdays(fixtures)

  return matchdays.map(matchday => {
    const partial = playedFixtures.filter(fixture => fixture.matchday <= matchday)
    const table = computeTable(partial, {}, {}, [])
    const row = table.find(entry => entry.team === focusTeam)
    const baseline = baselineTable.find(entry => entry.team === focusTeam)

    return {
      matchday,
      points: row?.points ?? baseline?.points ?? 0,
      position: row?.position ?? baseline?.position ?? 0,
      goalDiff: row?.goal_diff ?? baseline?.goal_diff ?? 0,
    }
  })
}

export function buildRivalTrendData(fixtures: Fixture[], baselineTable: TableRow[], teams: string[]): RivalTrendDatum[] {
  const playedFixtures = getPlayedFixtures(fixtures)
  const matchdays = getPlayedMatchdays(fixtures)

  return matchdays.map(matchday => {
    const partial = playedFixtures.filter(fixture => fixture.matchday <= matchday)
    const table = computeTable(partial, {}, {}, [])
    const row: RivalTrendDatum = { matchday }

    for (const team of teams) {
      const tableRow = table.find(entry => entry.team === team)
      const baseline = baselineTable.find(entry => entry.team === team)
      row[team] = tableRow?.points ?? baseline?.points ?? 0
    }

    return row
  })
}

export function buildRivalProjectionData(report: AnalysisReport): RivalProjectionDatum[] {
  return (report.pace_projection.rival_projection ?? []).map(row => ({
    team: row.team,
    position: row.position,
    currentPoints: row.current_points,
    projectedPoints: row.projected_final_points,
  }))
}
