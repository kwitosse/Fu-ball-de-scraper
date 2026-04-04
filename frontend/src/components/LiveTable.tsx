import React, { useState } from 'react'
import { useAppState, useActiveScenario } from '../store'
import { computeTable } from '../tableEngine'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Download, Info, Pin, PinOff } from 'lucide-react'

export default function LiveTable() {
  const { appData } = useAppState()
  const activeScenario = useActiveScenario()
  const [pinnedTeamId, setPinnedTeamId] = useState<string | null>(null)
  const [showTiebreak, setShowTiebreak] = useState(false)

  const table = React.useMemo(() => {
    if (!appData || !activeScenario) return []
    return computeTable(appData.fixtures, appData.predictions, activeScenario.overrides, appData.baselineTable)
  }, [appData, activeScenario])

  const baselineMap = React.useMemo(() => {
    if (!appData) return new Map<string, number>()
    const m = new Map<string, number>()
    for (const row of appData.baselineTable) m.set(row.team_id, row.position)
    return m
  }, [appData])

  if (!appData || !activeScenario) {
    return (
      <div className="space-y-3">
        <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
        <div className="page-title">Tabelle</div>
        <div className="overflow-hidden rounded-3xl border border-white/8 bg-white/4">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} style={{
              display: 'flex', gap: 8, padding: '12px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
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
    if (base === undefined) return <span className="text-[var(--text2)]">—</span>
    const diff = base - pos
    if (diff > 0) return <span className="text-[var(--green)]">▲{diff}</span>
    if (diff < 0) return <span className="text-[var(--red)]">▼{Math.abs(diff)}</span>
    return <span className="text-[var(--text2)]">=</span>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="page-title mb-0">Tabelle</div>
          <div className="text-sm text-[var(--text2)]">Optimiert für Mobilgeräte: volle Teamnamen, keine Pflicht zum horizontalen Scrollen.</div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="w-full sm:w-auto"
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
          <Download className="size-4" />
          CSV exportieren
        </Button>
      </div>
      {pinnedTeamId && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            <Pin className="mr-1 size-3" />
            {table.find(r => r.team_id === pinnedTeamId)?.team}
          </Badge>
          <Button onClick={() => setPinnedTeamId(null)} variant="outline" size="sm">
            <PinOff className="size-3.5" />
            Lösen
          </Button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text2)]">
        <Badge variant="secondary">Szenario</Badge>
        <strong className="text-[var(--text)]">{activeScenario.name}</strong>
        <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-[11px]" onClick={() => setShowTiebreak(v => !v)}>
          <Info className="size-3.5" />
          Wertung
        </Button>
      </div>
      {showTiebreak && (
        <Card className="bg-[rgba(255,255,255,0.04)]">
          <CardContent className="space-y-2 p-4 text-sm leading-6 text-[var(--text2)]">
          <strong className="text-[var(--text)]">Wertungsreihenfolge:</strong><br />
          1. Punkte · 2. Tordifferenz · 3. Erzielte Tore · 4. Alphabetisch
          </CardContent>
        </Card>
      )}
      <div className="grid gap-3 md:hidden">
        {table.map((row, i) => {
          const isPromotion = i < promotionCount
          const isRelegation = i >= total - relegationCount
          const statItems = [
            { key: 'played', label: 'Sp', value: row.played },
            { key: 'record', label: 'S/U/N', value: `${row.wins}/${row.draws}/${row.losses}` },
            { key: 'delta', label: 'Δ', value: renderDelta(row.team_id, row.position) },
            { key: 'zone', label: 'Zone', value: isPromotion ? 'Auf' : isRelegation ? 'Ab' : '—' },
          ]
          return (
            <Card
              key={row.team_id}
              className={[
                pinnedTeamId === row.team_id ? 'ring-2 ring-[var(--accent)]' : '',
                isPromotion ? 'bg-[rgba(76,175,80,0.12)]' : '',
                isRelegation ? 'bg-[rgba(244,67,54,0.12)]' : '',
              ].join(' ')}
              onClick={() => setPinnedTeamId(id => id === row.team_id ? null : row.team_id)}
            >
              <CardContent className="space-y-3 p-4">
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                  <div className="text-xl font-bold">{row.position}</div>
                  <div className="min-w-0">
                    <div className="break-words text-sm font-semibold leading-5">{row.team}</div>
                    <div className="mt-1 text-xs text-[var(--text2)]">
                      Tore {row.goals_for}:{row.goals_against} · Td {row.goal_diff > 0 ? '+' : ''}{row.goal_diff}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">{row.points}</div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text2)]">Punkte</div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {statItems.map(item => (
                    <div key={item.key} className="rounded-2xl bg-white/6 px-2 py-2 text-center">
                      <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--text2)]">{item.label}</div>
                      <div className="mt-1 text-sm font-semibold">
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-3xl text-sm">
          <thead>
            <tr className="bg-white/6 text-[var(--text2)]">
              <th className="px-3 py-3 text-left">
                <span
                  onClick={() => setShowTiebreak(v => !v)}
                  className="cursor-pointer select-none"
                  title="Wertungsreihenfolge"
                >
                  # ⓘ
                </span>
              </th>
              <th className="px-3 py-3 text-left">Team</th>
              <th className="px-3 py-3 text-right">Sp</th>
              <th className="px-3 py-3 text-right">S</th>
              <th className="px-3 py-3 text-right">U</th>
              <th className="px-3 py-3 text-right">N</th>
              <th className="px-3 py-3 text-right">Tore</th>
              <th className="px-3 py-3 text-right">Td</th>
              <th className="px-3 py-3 text-right">Pkt</th>
              <th className="px-3 py-3 text-right">Δ</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row, i) => {
              const isPromotion = i < promotionCount
              const isRelegation = i >= total - relegationCount
              return (
                <tr
                  key={row.team_id}
                  onClick={() => setPinnedTeamId(id => id === row.team_id ? null : row.team_id)}
                  style={{
                    cursor: 'pointer',
                    background: row.team_id === pinnedTeamId
                      ? 'rgba(233,69,96,0.18)'
                      : isPromotion
                        ? 'rgba(76,175,80,0.08)'
                        : isRelegation
                          ? 'rgba(244,67,54,0.08)'
                          : undefined,
                    outline: row.team_id === pinnedTeamId ? '1px solid var(--accent)' : undefined,
                  }}
                >
                  <td className="border-b border-white/8 px-3 py-3 font-bold">{row.position}</td>
                  <td className="border-b border-white/8 px-3 py-3 text-left font-medium">
                    {row.team}
                  </td>
                  <td className="border-b border-white/8 px-3 py-3 text-right">{row.played}</td>
                  <td className="border-b border-white/8 px-3 py-3 text-right">{row.wins}</td>
                  <td className="border-b border-white/8 px-3 py-3 text-right">{row.draws}</td>
                  <td className="border-b border-white/8 px-3 py-3 text-right">{row.losses}</td>
                  <td className="border-b border-white/8 px-3 py-3 text-right">{row.goals_for}:{row.goals_against}</td>
                  <td className="border-b border-white/8 px-3 py-3 text-right" style={{ color: row.goal_diff > 0 ? 'var(--green)' : row.goal_diff < 0 ? 'var(--red)' : 'var(--text2)' }}>
                    {row.goal_diff > 0 ? '+' : ''}{row.goal_diff}
                  </td>
                  <td className="border-b border-white/8 px-3 py-3 text-right font-bold">{row.points}</td>
                  <td className="border-b border-white/8 px-3 py-3 text-right">{renderDelta(row.team_id, row.position)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-[var(--text2)]">
        <span className="flex items-center gap-2">
          <span className="inline-block size-3 rounded-sm bg-[rgba(76,175,80,0.3)]" />
          Aufstieg
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block size-3 rounded-sm bg-[rgba(244,67,54,0.3)]" />
          Abstieg
        </span>
      </div>
    </div>
  )
}
