import React, { useState } from 'react'
import { Fixture, Prediction, ScoreOverride } from '../types'
import { useAppDispatch } from '../store'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card, CardContent } from './ui/card'
import { Input } from './ui/input'
import { RotateCcw } from 'lucide-react'

interface FixtureCardProps {
  fixture: Fixture
  prediction: Prediction | undefined
  override: ScoreOverride | undefined
}

export default function FixtureCard({ fixture, prediction, override }: FixtureCardProps) {
  const dispatch = useAppDispatch()
  const [showRationale, setShowRationale] = useState(false)

  const isPlayed = fixture.status === 'played' && fixture.home_score !== null && fixture.away_score !== null

  // Displayed scores: override > prediction > 0
  const displayHome = override?.home_score ?? prediction?.home_score ?? 0
  const displayAway = override?.away_score ?? prediction?.away_score ?? 0

  const hasOverride = override !== undefined

  function setScore(home: number, away: number) {
    dispatch({
      type: 'SET_SCORE_OVERRIDE',
      match_id: fixture.match_id,
      home_score: Math.max(0, Math.min(9, home)),
      away_score: Math.max(0, Math.min(9, away)),
    })
  }

  function handleReset() {
    dispatch({ type: 'RESET_MATCH', match_id: fixture.match_id })
  }

  const conf = prediction?.confidence
  const confClass = conf === 'high'
    ? 'text-[var(--green)]'
    : conf === 'medium'
      ? 'text-[var(--yellow)]'
      : 'text-[var(--text2)]'
  const confLabel = conf === 'high' ? '●●●' : conf === 'medium' ? '●●○' : conf === 'low' ? '●○○' : ''

  if (isPlayed) {
    return (
      <Card className="mb-3 overflow-hidden bg-[rgba(255,255,255,0.03)]">
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
            <div className="space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text2)]">Heim</div>
              <div className="break-words text-sm font-semibold text-[var(--text)]/85">{fixture.home_team}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-center text-xl font-bold text-[var(--text2)]">
              {fixture.home_score} - {fixture.away_score}
            </div>
            <div className="space-y-1 sm:text-right">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text2)]">Auswaerts</div>
              <div className="break-words text-sm font-semibold text-[var(--text)]/85">{fixture.away_team}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text2)]">
            <Badge variant="secondary">Bereits gespielt</Badge>
            {fixture.date && <span>{fixture.date}{fixture.time ? ` ${fixture.time}` : ''}</span>}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-3 overflow-hidden">
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-4">
          <div className="grid gap-3 rounded-2xl border border-white/8 bg-white/4 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text2)]">Heim</div>
                <div className="mt-1 break-words text-sm font-semibold leading-5 text-[var(--text)]">{fixture.home_team}</div>
              </div>
              <div className="rounded-full bg-[rgba(255,255,255,0.06)] px-2 py-1 text-[10px] font-medium text-[var(--text2)]">H</div>
            </div>

            <div className="grid grid-cols-1 items-center gap-2 min-[420px]:grid-cols-[1fr_auto_1fr]">
              <div className="flex items-center justify-center gap-2">
                <Button variant="secondary" size="icon" onClick={() => setScore(displayHome - 1, displayAway)} aria-label="Heimtor verringern">
                  -
                </Button>
                <Input
                  className="h-11 w-14 text-center text-lg font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  type="number"
                  min={0}
                  max={9}
                  value={displayHome}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10)
                    if (!isNaN(v)) setScore(v, displayAway)
                  }}
                  inputMode="numeric"
                />
                <Button variant="secondary" size="icon" onClick={() => setScore(displayHome + 1, displayAway)} aria-label="Heimtor erhöhen">
                  +
                </Button>
              </div>

              <div className="text-center text-lg font-bold text-[var(--text2)]">:</div>

              <div className="flex items-center justify-center gap-2">
                <Button variant="secondary" size="icon" onClick={() => setScore(displayHome, displayAway - 1)} aria-label="Auswärtstor verringern">
                  -
                </Button>
                <Input
                  className="h-11 w-14 text-center text-lg font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  type="number"
                  min={0}
                  max={9}
                  value={displayAway}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10)
                    if (!isNaN(v)) setScore(displayHome, v)
                  }}
                  inputMode="numeric"
                />
                <Button variant="secondary" size="icon" onClick={() => setScore(displayHome, displayAway + 1)} aria-label="Auswärtstor erhöhen">
                  +
                </Button>
              </div>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text2)]">Auswaerts</div>
                <div className="mt-1 break-words text-sm font-semibold leading-5 text-[var(--text)]">{fixture.away_team}</div>
              </div>
              <div className="rounded-full bg-[rgba(255,255,255,0.06)] px-2 py-1 text-[10px] font-medium text-[var(--text2)]">A</div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {conf && (
                <button
                  className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[11px] text-[var(--text2)] transition-colors hover:text-[var(--text)]"
                  onClick={() => setShowRationale(v => !v)}
                  aria-label="Begründung anzeigen"
                >
                  <span className={confClass}>{confLabel} KI</span>
                </button>
              )}
              {hasOverride && <Badge>editiert</Badge>}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text2)]">
              {fixture.date && <span>{fixture.date}{fixture.time ? ` ${fixture.time}` : ''}</span>}
              {hasOverride && (
                <Button className="gap-1" variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="size-3.5" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {showRationale && prediction?.rationale && (
            <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2 text-sm leading-6 text-[var(--text2)]">
              {prediction.rationale}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
