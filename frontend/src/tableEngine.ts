import { Fixture, TableRow, Prediction, ScoreOverride } from './types'

interface TeamStats {
  team_id: string
  team: string
  played: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
}

export function computeTable(
  fixtures: Fixture[],
  predictions: Record<string, Prediction>,
  overrides: Record<string, ScoreOverride>
): TableRow[] {
  // 1. Build team set from fixtures
  const teamMap = new Map<string, TeamStats>()

  const ensureTeam = (id: string, name: string) => {
    if (!teamMap.has(id)) {
      teamMap.set(id, {
        team_id: id,
        team: name,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals_for: 0,
        goals_against: 0,
      })
    }
  }

  for (const f of fixtures) {
    ensureTeam(f.home_team_id, f.home_team)
    ensureTeam(f.away_team_id, f.away_team)
  }

  // 2. For each fixture, determine score
  for (const f of fixtures) {
    let home: number
    let away: number

    if (
      f.status === 'played' &&
      f.home_score !== null &&
      f.away_score !== null
    ) {
      // Official result
      home = f.home_score
      away = f.away_score
    } else if (overrides[f.match_id] !== undefined) {
      // User override
      home = overrides[f.match_id].home_score
      away = overrides[f.match_id].away_score
    } else if (predictions[f.match_id] !== undefined) {
      // Prediction fallback
      home = predictions[f.match_id].home_score
      away = predictions[f.match_id].away_score
    } else {
      // No result - skip
      continue
    }

    // 3. Accumulate stats
    const homeStats = teamMap.get(f.home_team_id)!
    const awayStats = teamMap.get(f.away_team_id)!

    homeStats.played += 1
    awayStats.played += 1
    homeStats.goals_for += home
    homeStats.goals_against += away
    awayStats.goals_for += away
    awayStats.goals_against += home

    if (home > away) {
      homeStats.wins += 1
      awayStats.losses += 1
    } else if (home < away) {
      awayStats.wins += 1
      homeStats.losses += 1
    } else {
      homeStats.draws += 1
      awayStats.draws += 1
    }
  }

  // 4. Convert to TableRow and sort
  const rows: TableRow[] = Array.from(teamMap.values()).map(s => {
    const goal_diff = s.goals_for - s.goals_against
    const points = s.wins * 3 + s.draws
    return {
      team_id: s.team_id,
      team: s.team,
      played: s.played,
      wins: s.wins,
      draws: s.draws,
      losses: s.losses,
      goals_for: s.goals_for,
      goals_against: s.goals_against,
      goal_diff,
      points,
      position: 0, // assigned below
    }
  })

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goal_diff !== a.goal_diff) return b.goal_diff - a.goal_diff
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for
    return a.team.localeCompare(b.team)
  })

  // 5. Assign positions
  rows.forEach((r, i) => {
    r.position = i + 1
  })

  return rows
}
