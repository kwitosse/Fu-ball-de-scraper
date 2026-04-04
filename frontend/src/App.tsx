import React, { useEffect, useState } from 'react'
import { useAppState, useAppDispatch } from './store'
import { loadAppData } from './dataLoader'
import BottomNav from './components/BottomNav'
import MatchdayView from './components/MatchdayView'
import LiveTable from './components/LiveTable'
import AnalysisView from './components/AnalysisView'
import ScenariosView from './components/ScenariosView'
import SettingsView from './components/SettingsView'

type Page = 'matchdays' | 'table' | 'analysis' | 'scenarios' | 'settings'

export default function App() {
  const [page, setPage] = useState<Page>('matchdays')
  const { loading, error, appData } = useAppState()
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: true })
    loadAppData()
      .then(data => dispatch({ type: 'SET_DATA', payload: data }))
      .catch(err => dispatch({ type: 'SET_ERROR', payload: String(err) }))
  }, [dispatch])

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Lade Daten...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="loading-screen">
        <span style={{ color: 'var(--red)', fontSize: 32 }}>⚠</span>
        <span>Fehler beim Laden</span>
        <span style={{ fontSize: 12, color: 'var(--text2)', maxWidth: 300, textAlign: 'center' }}>{error}</span>
        <button
          className="secondary-btn"
          style={{ width: 'auto', marginTop: 8 }}
          onClick={() => {
            dispatch({ type: 'SET_LOADING', payload: true })
            loadAppData()
              .then(data => dispatch({ type: 'SET_DATA', payload: data }))
              .catch(err => dispatch({ type: 'SET_ERROR', payload: String(err) }))
          }}
        >
          Nochmal versuchen
        </button>
      </div>
    )
  }

  const generated_at = appData?.dataVersion?.generated_at
  const formattedDate = generated_at
    ? new Date(generated_at).toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
    : ''

  return (
    <div className="app-shell">
      {formattedDate && (
        <div className="topbar-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-3 py-[calc(0.5rem+var(--safe-top))] text-[10px] text-[var(--text2)] sm:px-4 sm:text-[11px]">
            <span className="min-w-0 truncate">Datenstand: {formattedDate}</span>
            <span className="shrink-0 font-semibold tracking-[0.2em] text-[var(--accent)] uppercase">Fu-ball Live</span>
          </div>
        </div>
      )}
      <main className="page-frame">
        {page === 'matchdays' && <MatchdayView />}
        {page === 'table' && <LiveTable />}
        {page === 'analysis' && <AnalysisView />}
        {page === 'scenarios' && <ScenariosView />}
        {page === 'settings' && <SettingsView />}
      </main>
      <BottomNav activePage={page} onNavigate={setPage} />
    </div>
  )
}
