import type { GoalBin, PerformanceSplit, RotationPerformanceReport } from '../types'

export type GoalTimingDatum = {
  window: string
  scored: number
  conceded: number
}

export type SplitComparisonDatum = {
  label: string
  played: number
  record: string
  ppg: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  gfPerGame: number
  gaPerGame: number
}

function goalCountForBin(bins: GoalBin[], label: string) {
  return bins.find(bin => bin.label === label)?.count ?? 0
}

function toSplitComparisonDatum(label: string, split: PerformanceSplit): SplitComparisonDatum {
  return {
    label,
    played: split.played,
    record: split.record,
    ppg: split.ppg,
    goalsFor: split.goals_for,
    goalsAgainst: split.goals_against,
    goalDiff: split.goal_diff,
    gfPerGame: split.gf_per_game,
    gaPerGame: split.ga_per_game,
  }
}

export function buildGoalTimingData(report: RotationPerformanceReport): GoalTimingDatum[] {
  const labels = Array.from(
    new Set([
      ...report.timing.goal_bins_for.map(bin => bin.label),
      ...report.timing.goal_bins_against.map(bin => bin.label),
    ])
  )

  return labels.map(label => ({
    window: label,
    scored: goalCountForBin(report.timing.goal_bins_for, label),
    conceded: goalCountForBin(report.timing.goal_bins_against, label),
  }))
}

export function buildGameStateSplitData(report: RotationPerformanceReport): SplitComparisonDatum[] {
  return [
    toSplitComparisonDatum('Scored First', report.game_states.scored_first),
    toSplitComparisonDatum('Conceded First', report.game_states.conceded_first),
    toSplitComparisonDatum('Halftime Ahead', report.game_states.halftime_ahead),
    toSplitComparisonDatum('Halftime Level', report.game_states.halftime_level),
    toSplitComparisonDatum('Halftime Behind', report.game_states.halftime_behind),
  ]
}

export function buildStabilitySplitData(report: RotationPerformanceReport): SplitComparisonDatum[] {
  return [
    toSplitComparisonDatum('Home', report.splits.home),
    toSplitComparisonDatum('Away', report.splits.away),
    toSplitComparisonDatum('Clean Sheet', report.game_states.clean_sheet_record),
    toSplitComparisonDatum('2+ Goals', report.game_states.scored_two_plus_record),
    toSplitComparisonDatum('2+ Conceded', report.game_states.conceded_two_plus_record),
  ]
}
