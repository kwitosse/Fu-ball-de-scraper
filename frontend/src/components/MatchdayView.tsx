import React, { useState } from 'react'
import { useAppState, useAppDispatch, useActiveScenario } from '../store'
import FixtureCard from './FixtureCard'
import { computeTable } from '../tableEngine'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { ChevronDown, ChevronUp, Dice5, RotateCcw } from 'lucide-react'

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
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="page-title">Spieltage</div>
          <p className="text-sm text-[var(--text2)]">Ergebnisse direkt auf dem Handy anpassen und die Tabelle sofort neu berechnen.</p>
        </div>
      </div>
      {focusRow && (
        <Card className="mb-4 bg-[linear-gradient(180deg,rgba(15,52,96,0.95),rgba(12,39,73,0.95))]">
          <CardContent className="flex flex-wrap items-center gap-2 p-4 text-sm">
            <Badge variant="secondary">Fokus</Badge>
            <span className="font-semibold text-[var(--text)]">{focusRow.team}</span>
            <span className="text-[var(--text2)]">Platz <strong className="text-[var(--accent)]">#{focusRow.position}</strong></span>
            <span className="text-[var(--text2)]">{focusRow.points} Pkt</span>
          {baselinePos !== null && baselinePos !== focusRow.position && (
            <span className={baselinePos > focusRow.position ? 'text-[var(--green)]' : 'text-[var(--red)]'}>
              {baselinePos > focusRow.position ? '▲' : '▼'}{Math.abs(baselinePos - focusRow.position)} vs. Baseline
            </span>
          )}
          </CardContent>
        </Card>
      )}
      {matchdays.map(({ num, fixtures }) => {
        const isOpen = openMatchday === num
        const edits = overrideCount(num)
        const allPlayed = fixtures.every(f => f.status === 'played')

        return (
          <Card key={num} className="mb-4 overflow-hidden p-0">
            <div
              className="flex flex-col gap-3 bg-[linear-gradient(180deg,rgba(15,52,96,0.96),rgba(12,39,73,0.96))] p-4 sm:flex-row sm:items-center sm:justify-between"
              onClick={() => setOpenMatchday(isOpen ? -1 : num)}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold">Spieltag {num}</span>
                {allPlayed && (
                  <Badge variant="secondary">gespielt</Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {edits > 0 && <Badge>{edits} Änderung{edits !== 1 ? 'en' : ''}</Badge>}
                {!allPlayed && (
                  <button
                    className="rounded-xl border border-white/12 px-3 py-2 text-xs text-[var(--text2)] transition-colors hover:bg-white/6 hover:text-[var(--text)]"
                    onClick={e => {
                      e.stopPropagation()
                      dispatch({ type: 'RESET_MATCHDAY', matchday: num })
                    }}
                  >
                    Gesamt zurücksetzen
                  </button>
                )}
                <span className="text-[var(--text2)]">{isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</span>
              </div>
            </div>

            {isOpen && (
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      fixtures.filter(f => f.status !== 'played').forEach(f => {
                        const pred = appData.predictions[f.match_id]
                        if (pred) dispatch({ type: 'SET_SCORE_OVERRIDE', match_id: f.match_id, home_score: pred.home_score, away_score: pred.away_score })
                      })
                    }}
                  >
                    <RotateCcw className="size-4" />
                    Baseline
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
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
                    <Dice5 className="size-4" />
                    Zufällig
                  </Button>
                </div>
                {fixtures.map(f => (
                  <FixtureCard
                    key={f.match_id}
                    fixture={f}
                    prediction={appData.predictions[f.match_id]}
                    override={activeScenario.overrides[f.match_id]}
                  />
                ))}
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
