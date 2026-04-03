import React, { useRef, useState } from 'react'
import { useAppState, useAppDispatch, useActiveScenario } from '../store'
import { Scenario } from '../types'

export default function ScenariosView() {
  const { scenarios } = useAppState()
  const activeScenario = useActiveScenario()
  const dispatch = useAppDispatch()
  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleCreate() {
    const name = newName.trim() || `Szenario ${scenarios.length + 1}`
    dispatch({ type: 'CREATE_SCENARIO', name })
    setNewName('')
  }

  function handleExport(s: Scenario) {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${s.name.replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const scenario = JSON.parse(ev.target?.result as string) as Scenario
        if (!scenario.id || !scenario.overrides) throw new Error('Invalid format')
        dispatch({ type: 'IMPORT_SCENARIO', scenario })
      } catch {
        alert('Ungültige Datei')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function startRename(s: Scenario) {
    setRenamingId(s.id)
    setRenameValue(s.name)
  }

  function commitRename(id: string) {
    if (renameValue.trim()) {
      dispatch({ type: 'RENAME_SCENARIO', id, name: renameValue.trim() })
    }
    setRenamingId(null)
  }

  return (
    <div>
      <div className="page-title">Szenarien</div>

      {/* Create new */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Name des Szenarios"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          style={{ flex: 1 }}
        />
        <button className="primary-btn" style={{ width: 'auto', padding: '10px 16px' }} onClick={handleCreate}>
          + Neu
        </button>
      </div>

      {/* Scenario list */}
      {scenarios.map(s => (
        <div key={s.id} className={`scenario-item${s.id === activeScenario?.id ? ' active-scenario' : ''}`}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {renamingId === s.id ? (
              <input
                type="text"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onBlur={() => commitRename(s.id)}
                onKeyDown={e => e.key === 'Enter' && commitRename(s.id)}
                autoFocus
              />
            ) : (
              <>
                <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {s.id === activeScenario?.id && <span style={{ color: 'var(--accent)' }}>✓</span>}
                  {s.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
                  Zuletzt geändert: {new Date(s.updated_at).toLocaleString('de-DE')}
                </div>
              </>
            )}
          </div>
          <div className="scenario-actions">
            {s.id !== activeScenario?.id && (
              <button className="icon-btn" onClick={() => dispatch({ type: 'SWITCH_SCENARIO', id: s.id })}>
                Laden
              </button>
            )}
            <button className="icon-btn" onClick={() => startRename(s)}>✎</button>
            <button className="icon-btn" onClick={() => handleExport(s)}>↓</button>
            {scenarios.length > 1 && (
              <button className="icon-btn danger" onClick={() => {
                if (confirm(`"${s.name}" löschen?`)) dispatch({ type: 'DELETE_SCENARIO', id: s.id })
              }}>✕</button>
            )}
          </div>
        </div>
      ))}

      {/* Import */}
      <div style={{ marginTop: 16 }}>
        <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        <button className="secondary-btn" style={{ width: '100%' }} onClick={() => fileRef.current?.click()}>
          ↑ Szenario importieren
        </button>
      </div>

      {/* Apply baseline */}
      <div style={{ marginTop: 8 }}>
        <button
          className="secondary-btn"
          style={{ width: '100%' }}
          onClick={() => {
            if (confirm('Aktives Szenario auf KI-Vorhersagen zurücksetzen?')) {
              dispatch({ type: 'APPLY_BASELINE' })
            }
          }}
        >
          ↺ Aktives Szenario zurücksetzen
        </button>
      </div>
    </div>
  )
}
