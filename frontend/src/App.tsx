import React, { useEffect, useState } from 'react'
import { useAppState, useAppDispatch } from './store'
import { loadAppData } from './dataLoader'
import BottomNav from './components/BottomNav'
import MatchdayView from './components/MatchdayView'
import LiveTable from './components/LiveTable'
import ScenariosView from './components/ScenariosView'
import SettingsView from './components/SettingsView'

type Page = 'matchdays' | 'table' | 'scenarios' | 'settings'

export default function App() {
  const [page, setPage] = useState<Page>('matchdays')
  const { loading, error } = useAppState()
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

  return (
    <>
      <main className="page">
        {page === 'matchdays' && <MatchdayView />}
        {page === 'table' && <LiveTable />}
        {page === 'scenarios' && <ScenariosView />}
        {page === 'settings' && <SettingsView />}
      </main>
      <BottomNav activePage={page} onNavigate={setPage} />
    </>
  )
}
