import React, { useState } from 'react'
import { Fixture, Prediction, ScoreOverride } from '../types'
import { useAppDispatch } from '../store'

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
  const confClass = conf === 'high' ? 'conf-high' : conf === 'medium' ? 'conf-medium' : 'conf-low'
  const confLabel = conf === 'high' ? '●●●' : conf === 'medium' ? '●●○' : conf === 'low' ? '●○○' : ''

  if (isPlayed) {
    return (
      <div>
        <div className="fixture-row" style={{ opacity: 0.55 }}>
          <span className="fixture-team home">{fixture.home_team}</span>
          <div className="fixture-played">
            {fixture.home_score} – {fixture.away_score}
          </div>
          <span className="fixture-team away">{fixture.away_team}</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="fixture-row">
        {/* Home team */}
        <span className="fixture-team home">{fixture.home_team}</span>

        {/* Score editor */}
        <div className="fixture-score-area">
          <button
            className="score-btn"
            onClick={() => setScore(displayHome - 1, displayAway)}
            aria-label="Heimtor verringern"
          >
            −
          </button>
          <input
            className="score-display"
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
          <button
            className="score-btn"
            onClick={() => setScore(displayHome + 1, displayAway)}
            aria-label="Heimtor erhöhen"
          >
            +
          </button>

          <span className="score-sep">:</span>

          <button
            className="score-btn"
            onClick={() => setScore(displayHome, displayAway - 1)}
            aria-label="Auswärtstor verringern"
          >
            −
          </button>
          <input
            className="score-display"
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
          <button
            className="score-btn"
            onClick={() => setScore(displayHome, displayAway + 1)}
            aria-label="Auswärtstor erhöhen"
          >
            +
          </button>
        </div>

        {/* Away team */}
        <span className="fixture-team away">{fixture.away_team}</span>
      </div>

      {/* Meta row: confidence + rationale toggle + reset */}
      <div className="fixture-meta">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {conf && (
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onClick={() => setShowRationale(v => !v)}
              aria-label="Begründung anzeigen"
            >
              <span className={confClass}>{confLabel} KI</span>
            </button>
          )}
          {hasOverride && (
            <span style={{ fontSize: 10, color: 'var(--accent)' }}>editiert</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {fixture.date && (
            <span style={{ fontSize: 10, color: 'var(--text2)' }}>
              {fixture.date}{fixture.time ? ` ${fixture.time}` : ''}
            </span>
          )}
          {hasOverride && (
            <button className="reset-btn" onClick={handleReset}>↺ Reset</button>
          )}
        </div>
      </div>

      {showRationale && prediction?.rationale && (
        <div className="rationale-text">{prediction.rationale}</div>
      )}
    </div>
  )
}
