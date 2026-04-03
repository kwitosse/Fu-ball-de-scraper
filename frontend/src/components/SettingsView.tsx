declare const __APP_VERSION__: string
import React from 'react'
import { useAppState, useAppDispatch } from '../store'

export default function SettingsView() {
  const { appData } = useAppState()
  const dispatch = useAppDispatch()

  return (
    <div>
      <div className="page-title">Einstellungen</div>

      {appData && (
        <>
          <div className="section-label">Datenstatus</div>
          <div className="card">
            <div className="info-row">
              <span>Datenstand</span>
              <span className="info-value">
                {new Date(appData.dataVersion.generated_at).toLocaleString('de-DE')}
              </span>
            </div>
            <div className="info-row">
              <span>Modellversion</span>
              <span className="info-value">{appData.dataVersion.model_version}</span>
            </div>
            <div className="info-row">
              <span>Teams</span>
              <span className="info-value">{appData.teams.length}</span>
            </div>
            <div className="info-row">
              <span>Spiele gesamt</span>
              <span className="info-value">{appData.fixtures.length}</span>
            </div>
            <div className="info-row">
              <span>Gespielt</span>
              <span className="info-value">
                {appData.fixtures.filter(f => f.status === 'played').length}
              </span>
            </div>
            <div className="info-row">
              <span>Ausstehend</span>
              <span className="info-value">
                {appData.fixtures.filter(f => f.status !== 'played').length}
              </span>
            </div>
          </div>
        </>
      )}

      <div className="section-label">Aktionen</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          className="secondary-btn"
          onClick={() => {
            if (confirm('Alle Änderungen im aktiven Szenario zurücksetzen?')) {
              dispatch({ type: 'RESET_ALL' })
            }
          }}
        >
          ↺ Alle Overrides zurücksetzen
        </button>
        <button
          className="secondary-btn"
          style={{ color: 'var(--red)' }}
          onClick={() => {
            if (confirm('Alle Szenarien aus dem Speicher löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
              localStorage.removeItem('fu-ball-scenarios')
              window.location.reload()
            }
          }}
        >
          ✕ Alle Szenarien löschen
        </button>
      </div>

      <div className="section-label">Info</div>
      <div className="card">
        <div className="info-row">
          <span>App-Version</span>
          <span className="info-value">{__APP_VERSION__}</span>
        </div>
        <div className="info-row">
          <span>Datenspeicher</span>
          <span className="info-value">localStorage</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 10, lineHeight: 1.5 }}>
          Das Standard-Szenario folgt automatisch dem aktuellen Datenstand. Eigene Szenarien bleiben beim nächsten Datenupdate erhalten.
        </div>
      </div>
    </div>
  )
}
