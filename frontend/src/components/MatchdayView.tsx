import React, { useState } from 'react'
import { useAppState, useAppDispatch, useActiveScenario } from '../store'
import FixtureCard from './FixtureCard'
import { computeTable } from '../tableEngine'

export default function MatchdayView() {
  const { appData } = useAppState()
  const dispatch = useAppDispatch()
  const activeScenario = useActiveScenario()

  const liveTable = React.useMemo(() => {
    if (!appData || !activeScenario) return []
    return computeTable(appData.fixtures, appData.predictions, activeScenario.overrides, appData.baselineTable)
  }, [appData, activeScenario])

  // Pick focus team: team with most unplayed fixtures (or first from unplayed fixtures)
  const focusTeamId = React.useMemo(() => {
    if (!appData) return null
    const unplayed = appData.fixtures.filter(f => f.status !== 'played')
    if (unplayed.length === 0) return null
    // Count fixtures per team
    const counts = new Map<string, number>()
    unplayed.forEach(f => {
      counts.set(f.home_team_id, (counts.get(f.home_team_id) ?? 0) + 1)
      counts.set(f.away_team_id, (counts.get(f.away_team_id) ?? 0) + 1)
    })
    let maxId = unplayed[0].home_team_id
    let maxCount = 0
    counts.forEach((c, id) => { if (c > maxCount) { maxCount = c; maxId = id } })
    return maxId
  }, [appData])

  const focusRow = liveTable.find(r => r.team_id === focusTeamId)
  const baselinePos = appData?.baselineTable.find(r => r.team_id === focusTeamId)?.position ?? null

  // Group fixtures by matchday
  const matchdays = React.useMemo(() => {
    if (!appData) return []
    const map = new Map<number, typeof appData.fixtures>()
    for (const f of appData.fixtures) {
      if (!map.has(f.matchday)) map.set(f.matchday, [])
      map.get(f.matchday)!.push(f)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([num, fixtures]) => ({ num, fixtures }))
  }, [appData])

  // Auto-expand first unplayed matchday
  const defaultOpen = React.useMemo(() => {
    for (const { num, fixtures } of matchdays) {
      const hasUnplayed = fixtures.some(f => f.status !== 'played')
      if (hasUnplayed) return num
    }
    return matchdays[matchdays.length - 1]?.num ?? -1
  }, [matchdays])

  const [openMatchday, setOpenMatchday] = useState<number>(defaultOpen)

  if (!appData || !activeScenario) {
    return <div className="page-title">Keine Daten verfügbar</div>
  }

  const overrideCount = (num: number) => {
    const fixtures = matchdays.find(m => m.num === num)?.fixtures ?? []
    return fixtures.filter(f => {
      const pred = appData.predictions[f.match_id]
      const ov = activeScenario.overrides[f.match_id]
      if (!ov) return false
      if (f.status === 'played') return false
      if (!pred) return true
      return ov.home_score !== pred.home_score || ov.away_score !== pred.away_score
    }).length
  }

  return (
    <div>
      <div className="page-title">Spieltage</div>
      {focusRow && (
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>📍 {focusRow.team}</span>
          <span>Platz <strong style={{ color: 'var(--accent)' }}>#{focusRow.position}</strong></span>
          <span style={{ color: 'var(--text2)' }}>{focusRow.points} Pkt</span>
          {baselinePos !== null && baselinePos !== focusRow.position && (
            <span style={{ color: baselinePos > focusRow.position ? 'var(--green)' : 'var(--red)' }}>
              {baselinePos > focusRow.position ? '▲' : '▼'}{Math.abs(baselinePos - focusRow.position)} vs. Baseline
            </span>
          )}
        </div>
      )}
      {matchdays.map(({ num, fixtures }) => {
        const isOpen = openMatchday === num
        const edits = overrideCount(num)
        const allPlayed = fixtures.every(f => f.status === 'played')

        return (
          <div key={num} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              className="matchday-header"
              onClick={() => setOpenMatchday(isOpen ? -1 : num)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700 }}>Spieltag {num}</span>
                {allPlayed && (
                  <span style={{ fontSize: 10, color: 'var(--text2)' }}>✓ gespielt</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {edits > 0 && <span className="badge">{edits} Änderung{edits !== 1 ? 'en' : ''}</span>}
                {!allPlayed && (
                  <button
                    className="reset-btn"
                    onClick={e => {
                      e.stopPropagation()
                      dispatch({ type: 'RESET_MATCHDAY', matchday: num })
                    }}
                  >
                    ↺
                  </button>
                )}
                <span style={{ color: 'var(--text2)', fontSize: 12 }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>

            {isOpen && (
              <div style={{ padding: '0 12px 12px' }}>
                <div style={{ display: 'flex', gap: 8, padding: '8px 0 4px', flexWrap: 'wrap' }}>
                  <button
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 16, fontSize: 12, padding: '6px 14px', color: 'var(--text)', cursor: 'pointer', minHeight: 36 }}
                    onClick={() => {
                      // Apply baseline for this matchday: dispatch SET_SCORE_OVERRIDE for each unplayed fixture using prediction
                      fixtures.filter(f => f.status !== 'played').forEach(f => {
                        const pred = appData.predictions[f.match_id]
                        if (pred) dispatch({ type: 'SET_SCORE_OVERRIDE', match_id: f.match_id, home_score: pred.home_score, away_score: pred.away_score })
                      })
                    }}
                  >
                    ↺ Baseline
                  </button>
                  <button
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 16, fontSize: 12, padding: '6px 14px', color: 'var(--text)', cursor: 'pointer', minHeight: 36 }}
                    onClick={() => {
                      // Randomize: for each unplayed fixture, take prediction and add random -1/0/+1 to each score
                      fixtures.filter(f => f.status !== 'played').forEach(f => {
                        const pred = appData.predictions[f.match_id]
                        const base_h = pred?.home_score ?? 1
                        const base_a = pred?.away_score ?? 1
                        const delta_h = Math.floor(Math.random() * 3) - 1
                        const delta_a = Math.floor(Math.random() * 3) - 1
                        dispatch({ type: 'SET_SCORE_OVERRIDE', match_id: f.match_id, home_score: Math.max(0, Math.min(9, base_h + delta_h)), away_score: Math.max(0, Math.min(9, base_a + delta_a)) })
                      })
                    }}
                  >
                    🎲 Zufällig
                  </button>
                </div>
                {fixtures.map(f => (
                  <FixtureCard
                    key={f.match_id}
                    fixture={f}
                    prediction={appData.predictions[f.match_id]}
                    override={activeScenario.overrides[f.match_id]}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
