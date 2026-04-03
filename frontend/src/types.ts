export interface Team {
  id: string
  name: string
}

export interface Fixture {
  match_id: string
  matchday: number
  home_team_id: string
  away_team_id: string
  home_team: string
  away_team: string
  date: string | null
  time: string | null
  status: string
  home_score: number | null
  away_score: number | null
}

export interface Prediction {
  home_score: number
  away_score: number
  xg_home: number
  xg_away: number
  confidence: 'high' | 'medium' | 'low'
  rationale: string
}

export interface TableRow {
  team_id: string
  team: string
  played: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
  goal_diff: number
  points: number
  position: number
  baseline_position?: number
}

export interface ScoreOverride {
  home_score: number
  away_score: number
}

export interface Scenario {
  id: string
  name: string
  created_at: string
  updated_at: string
  overrides: Record<string, ScoreOverride>
}

export interface AppData {
  teams: Team[]
  fixtures: Fixture[]
  predictions: Record<string, Prediction>
  baselineTable: TableRow[]
  dataVersion: { generated_at: string; model_version: string; source: string }
}
