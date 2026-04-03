import React, { useState } from 'react'
import { useAppState, useAppDispatch, useActiveScenario } from '../store'
import FixtureCard from './FixtureCard'

export default function MatchdayView() {
  const { appData } = useAppState()
  const dispatch = useAppDispatch()
  const activeScenario = useActiveScenario()

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
