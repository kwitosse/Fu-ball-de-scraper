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
  analysisReport: AnalysisReport | null
  analysisMarkdown: string | null
  matchPlan: MatchPlan | null
}

export interface AnalysisReport {
  context: {
    league: string
    season: string
    focus_team: string
    analysis_generated_at: string
    known_data_limitations: string[]
  }
  current_state: {
    position: number
    points: number
    ppg: number
    remaining_matches: number
    max_possible_points: number
    gap_to_rank1: number
    gap_to_rank2: number
    goals: {
      for: number
      against: number
      diff: number
    }
  }
  pace_projection: {
    rank2_bands: {
      hold_current_pace: number
      slight_slowdown: number
      strong_finish: number
      direct_duel_adjusted: number
    }
    required_points_from_last_10: {
      to_match_rank2_hold_pace: number
      to_beat_rank2_hold_pace_by_1: number
      to_match_rank2_direct_duel_adjusted: number
      conservative: number
      realistic: number
      aggressive: number
    }
    required_record_hint: {
      realistic_target: string
      safer_target: string
    }
  }
  goal_difference: {
    target_ranges: {
      minimum_viable_end_gd: {
        net_gd_gain_needed: number
        avg_gd_per_game_needed: number
      }
      realistic_end_gd: {
        net_gd_gain_needed: number
        avg_gd_per_game_needed: number
      }
      strong_end_gd: {
        net_gd_gain_needed: number
        avg_gd_per_game_needed: number
      }
    }
  }
  remaining_fixtures: {
    count: number
    average_opponent_ppg: number
    direct_rival_matches_count: number
  }
  form_and_trends: {
    known_played_matches: number
    points_last_5: number
    points_last_8: number
    avg_gf_last_5: number
    avg_ga_last_5: number
    clean_sheet_rate: number
    games_2plus_goals_rate: number
  }
  scenario_matrix: ScenarioMatrixRow[]
  simulation: {
    pace_calibrated: {
      iterations: number
      top2_probability: number
    }
    fixture_strength_poisson: {
      iterations: number
      top2_probability: number
      focus_points_distribution: {
        p10: number
        p50: number
        p90: number
      }
      focus_expected_points_from_remaining: number
      focus_expected_final_points: number
    }
  }
  conclusions: {
    realistic_top2_total_points: number
    minimum_acceptable_points_from_last_10: number
    promotion_like_profile: string[]
    title_path_assessment: string
  }
  match_plan?: MatchPlan
}

export interface ScenarioMatrixRow {
  scenario: string
  final_points: number
  final_ppg: number
  likely_top2_vs_rank2_pace: string
  top2_if_rank2_drops_2pts_in_direct_duels: string
  rank1_chance: string
  min_avg_gd_per_game_to_reach_plus10: number
}

export interface MatchPlan {
  target_points_from_run_in: number
  matches: MatchPlanMatch[]
  checkpoints: MatchPlanCheckpoint[]
}

export interface MatchPlanMatch {
  match_number: number
  date: string
  home_away: 'H' | 'A'
  opponent: string
  opponent_position: number
  tier: string
  minimum_acceptable_result: string
  target_result: string
  stretch_result: string
  minimum_points: number
  target_points: number
  cumulative_target_points: number
}

export interface MatchPlanCheckpoint {
  after_match: number
  cumulative_minimum_points: number
  cumulative_target_points: number
  cumulative_stretch_points: number
  remaining_games: number
  red_line: {
    trigger: string
    revised_required_points_in_remaining_games: number
    required_ppg_in_remaining_games: number
  }
}
