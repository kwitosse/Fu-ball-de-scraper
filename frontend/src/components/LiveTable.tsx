import React, { useState } from 'react'
import { useAppState, useActiveScenario } from '../store'
import { computeTable } from '../tableEngine'

export default function LiveTable() {
  const { appData } = useAppState()
  const activeScenario = useActiveScenario()
  const [pinnedTeamId, setPinnedTeamId] = useState<string | null>(null)
  const [showTiebreak, setShowTiebreak] = useState(false)

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
    return (
      <div>
        <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
        <div className="page-title">Tabelle</div>
        <div style={{ overflow: 'hidden', borderRadius: 8 }}>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} style={{
              display: 'flex', gap: 8, padding: '10px 8px',
              borderBottom: '1px solid var(--border)',
              animation: 'pulse 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.08}s`
            }}>
              <div style={{ width: 20, height: 14, background: 'var(--surface2)', borderRadius: 3 }} />
              <div style={{ flex: 1, height: 14, background: 'var(--surface2)', borderRadius: 3 }} />
              <div style={{ width: 30, height: 14, background: 'var(--surface2)', borderRadius: 3 }} />
              <div style={{ width: 30, height: 14, background: 'var(--surface2)', borderRadius: 3 }} />
            </div>
          ))}
        </div>
      </div>
    )
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Tabelle</div>
        <button
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text2)', fontSize: 11, padding: '6px 10px', cursor: 'pointer' }}
          onClick={() => {
            const header = '#,Team,Sp,S,U,N,Tore,Td,Pkt\n'
            const rows = table.map(r => `${r.position},"${r.team}",${r.played},${r.wins},${r.draws},${r.losses},${r.goals_for}:${r.goals_against},${r.goal_diff},${r.points}`).join('\n')
            const blob = new Blob([header + rows], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `tabelle-${activeScenario.name.replace(/\s+/g,'-')}-${new Date().toISOString().slice(0,10)}.csv`
            a.click()
            URL.revokeObjectURL(url)
          }}
        >
          CSV ↓
        </button>
      </div>
      {pinnedTeamId && (
        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>
            📍 {table.find(r => r.team_id === pinnedTeamId)?.team}
          </span>
          <button onClick={() => setPinnedTeamId(null)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text2)', fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 10 }}>
        Szenario: <strong style={{ color: 'var(--text)' }}>{activeScenario.name}</strong>
      </div>
      {showTiebreak && (
        <div style={{ fontSize: 11, color: 'var(--text2)', padding: '8px 10px', background: 'var(--surface2)', borderRadius: 6, marginBottom: 8, lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--text)' }}>Wertungsreihenfolge:</strong><br />
          1. Punkte · 2. Tordifferenz · 3. Erzielte Tore · 4. Alphabetisch
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table className="league-table">
          <thead>
            <tr>
              <th style={{ position: 'relative' }}>
                <span
                  onClick={() => setShowTiebreak(v => !v)}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title="Wertungsreihenfolge"
                >
                  # ⓘ
                </span>
              </th>
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
                <tr
                  key={row.team_id}
                  className={rowClass}
                  onClick={() => setPinnedTeamId(id => id === row.team_id ? null : row.team_id)}
                  style={{ cursor: 'pointer', ...(row.team_id === pinnedTeamId ? { background: 'rgba(233,69,96,0.18)', outline: '1px solid var(--accent)' } : {}) }}
                >
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
