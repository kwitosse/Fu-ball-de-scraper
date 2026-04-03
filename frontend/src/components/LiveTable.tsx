import React from 'react'
import { useAppState, useActiveScenario } from '../store'
import { computeTable } from '../tableEngine'

export default function LiveTable() {
  const { appData } = useAppState()
  const activeScenario = useActiveScenario()

  const table = React.useMemo(() => {
    if (!appData || !activeScenario) return []
    return computeTable(appData.fixtures, appData.predictions, activeScenario.overrides)
  }, [appData, activeScenario])

  const baselineMap = React.useMemo(() => {
    if (!appData) return new Map<string, number>()
    const m = new Map<string, number>()
    for (const row of appData.baselineTable) m.set(row.team_id, row.position)
    return m
  }, [appData])

  if (!appData || !activeScenario) {
    return <div className="page-title">Keine Daten verfügbar</div>
  }

  const total = table.length
  const promotionCount = Math.min(3, total)
  const relegationCount = Math.min(3, total)

  function renderDelta(teamId: string, pos: number) {
    const base = baselineMap.get(teamId)
    if (base === undefined) return <span className="delta-flat">—</span>
    const diff = base - pos
    if (diff > 0) return <span className="delta-up">▲{diff}</span>
    if (diff < 0) return <span className="delta-down">▼{Math.abs(diff)}</span>
    return <span className="delta-flat">=</span>
  }

  return (
    <div>
      <div className="page-title">Tabelle</div>
      <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 10 }}>
        Szenario: <strong style={{ color: 'var(--text)' }}>{activeScenario.name}</strong>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="league-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>Sp</th>
              <th>S</th>
              <th>U</th>
              <th>N</th>
              <th>Tore</th>
              <th>Td</th>
              <th>Pkt</th>
              <th>Δ</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row, i) => {
              const isPromotion = i < promotionCount
              const isRelegation = i >= total - relegationCount
              const rowClass = isPromotion ? 'promotion' : isRelegation ? 'relegation' : ''
              return (
                <tr key={row.team_id} className={rowClass}>
                  <td style={{ fontWeight: 700 }}>{row.position}</td>
                  <td style={{
                    maxWidth: 120,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: isPromotion ? 600 : 400,
                  }}>
                    {row.team}
                  </td>
                  <td>{row.played}</td>
                  <td>{row.wins}</td>
                  <td>{row.draws}</td>
                  <td>{row.losses}</td>
                  <td>{row.goals_for}:{row.goals_against}</td>
                  <td style={{ color: row.goal_diff > 0 ? 'var(--green)' : row.goal_diff < 0 ? 'var(--red)' : 'var(--text2)' }}>
                    {row.goal_diff > 0 ? '+' : ''}{row.goal_diff}
                  </td>
                  <td style={{ fontWeight: 700 }}>{row.points}</td>
                  <td>{renderDelta(row.team_id, row.position)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 16, fontSize: 11, color: 'var(--text2)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, background: 'rgba(76,175,80,0.3)', borderRadius: 2, display: 'inline-block' }} />
          Aufstieg
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, background: 'rgba(244,67,54,0.3)', borderRadius: 2, display: 'inline-block' }} />
          Abstieg
        </span>
      </div>
    </div>
  )
}
