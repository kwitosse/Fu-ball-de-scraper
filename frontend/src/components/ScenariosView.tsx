import React, { useRef, useState } from 'react'
import { useAppState, useAppDispatch, useActiveScenario, hasUnsavedChanges } from '../store'
import { Scenario } from '../types'
import { computeTable } from '../tableEngine'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Copy, Download, Pencil, RefreshCcw, Trash2, Upload, FolderGit2 } from 'lucide-react'

export default function ScenariosView() {
  const { scenarios, appData } = useAppState()
  const activeScenario = useActiveScenario()
  const dispatch = useAppDispatch()
  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [compareId, setCompareId] = useState<string | null>(null)
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

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
          <Input
            type="text"
            placeholder="Name des Szenarios"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className="flex-1"
          />
          <Button className="w-full sm:w-auto" onClick={handleCreate}>
            + Neu
          </Button>
        </CardContent>
      </Card>

      {scenarios.map(s => (
        <Card key={s.id} className={`mb-3 ${s.id === activeScenario?.id ? 'ring-2 ring-[var(--accent)]' : ''}`}>
          <CardContent className="flex flex-col gap-4 p-4">
            {renamingId === s.id ? (
              <Input
                type="text"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onBlur={() => commitRename(s.id)}
                onKeyDown={e => e.key === 'Enter' && commitRename(s.id)}
                autoFocus
              />
            ) : (
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  {s.id === activeScenario?.id && <Badge>aktiv</Badge>}
                  {s.name}
                </div>
                <div className="mt-2 text-xs text-[var(--text2)]">
                  Zuletzt geändert: {new Date(s.updated_at).toLocaleString('de-DE')}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {s.id !== activeScenario?.id && (
                <Button variant="secondary" size="sm" onClick={() => {
                  if (hasUnsavedChanges(activeScenario, appData)) {
                    if (!confirm('Das aktive Szenario hat ungespeicherte Änderungen. Trotzdem wechseln?')) return
                  }
                  dispatch({ type: 'SWITCH_SCENARIO', id: s.id })
                }}>
                  <FolderGit2 className="size-3.5" />
                  Laden
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'DUPLICATE_SCENARIO', id: s.id })} title="Duplizieren">
                <Copy className="size-3.5" />
                Duplizieren
              </Button>
              {s.id !== activeScenario?.id && (
                <Button variant="outline" size="sm" onClick={() => setCompareId(id => id === s.id ? null : s.id)} title="Vergleichen">
                  {compareId === s.id ? 'Schließen' : 'Vergleichen'}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => startRename(s)}>
                <Pencil className="size-3.5" />
                Umbenennen
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport(s)}>
                <Download className="size-3.5" />
                Export
              </Button>
              {scenarios.length > 1 && (
                <Button variant="destructive" size="sm" onClick={() => {
                  if (confirm(`"${s.name}" löschen?`)) dispatch({ type: 'DELETE_SCENARIO', id: s.id })
                }}>
                  <Trash2 className="size-3.5" />
                  Löschen
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {compareId && appData && activeScenario && (() => {
        const compareScenario = scenarios.find(s => s.id === compareId)
        if (!compareScenario) return null
        const tableA = computeTable(appData.fixtures, appData.predictions, activeScenario.overrides, appData.baselineTable)
        const tableB = computeTable(appData.fixtures, appData.predictions, compareScenario.overrides, appData.baselineTable)
        const posMapB = new Map(tableB.map(r => [r.team_id, r.position]))
        return (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Szenariovergleich</CardTitle>
              <div className="text-sm text-[var(--text2)]">
                Vergleich: <strong style={{ color: 'var(--text)' }}>{activeScenario.name}</strong> vs <strong style={{ color: 'var(--text)' }}>{compareScenario.name}</strong>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 pt-0 md:hidden">
              {tableA.map(r => {
                const posB = posMapB.get(r.team_id) ?? r.position
                const diff = posB - r.position
                return (
                  <div key={r.team_id} className="rounded-2xl border border-white/8 bg-white/4 p-3">
                    <div className="break-words text-sm font-semibold">{r.team}</div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl bg-white/6 px-2 py-2">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--text2)]">{activeScenario.name.slice(0, 8)}</div>
                        <div className="mt-1 text-sm font-semibold">{r.position}</div>
                      </div>
                      <div className="rounded-xl bg-white/6 px-2 py-2">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--text2)]">{compareScenario.name.slice(0, 8)}</div>
                        <div className="mt-1 text-sm font-semibold">{posB}</div>
                      </div>
                      <div className="rounded-xl bg-white/6 px-2 py-2">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--text2)]">Δ</div>
                        <div className={`mt-1 text-sm font-semibold ${diff > 0 ? 'text-[var(--green)]' : diff < 0 ? 'text-[var(--red)]' : 'text-[var(--text2)]'}`}>
                          {diff > 0 ? `▲${diff}` : diff < 0 ? `▼${Math.abs(diff)}` : '='}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
            <CardContent className="hidden pt-0 md:block">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="text-[var(--text2)]">
                    <th className="border-b border-white/8 px-3 py-2 text-left">Team</th>
                    <th className="border-b border-white/8 px-3 py-2 text-right">{activeScenario.name.slice(0,8)}</th>
                    <th className="border-b border-white/8 px-3 py-2 text-right">{compareScenario.name.slice(0,8)}</th>
                    <th className="border-b border-white/8 px-3 py-2 text-right">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {tableA.map(r => {
                    const posB = posMapB.get(r.team_id) ?? r.position
                    const diff = posB - r.position
                    return (
                      <tr key={r.team_id}>
                        <td className="border-b border-white/8 px-3 py-2">{r.team}</td>
                        <td className="border-b border-white/8 px-3 py-2 text-right font-semibold">{r.position}</td>
                        <td className="border-b border-white/8 px-3 py-2 text-right">{posB}</td>
                        <td className={`border-b border-white/8 px-3 py-2 text-right ${diff > 0 ? 'text-[var(--green)]' : diff < 0 ? 'text-[var(--red)]' : 'text-[var(--text2)]'}`}>
                          {diff > 0 ? `▲${diff}` : diff < 0 ? `▼${Math.abs(diff)}` : '='}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )
      })()}

      <div className="mt-4 grid gap-3">
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        <Button variant="secondary" className="w-full" onClick={() => fileRef.current?.click()}>
          <Upload className="size-4" />
          Szenario importieren
        </Button>
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            if (confirm('Aktives Szenario auf KI-Vorhersagen zurücksetzen?')) {
              dispatch({ type: 'APPLY_BASELINE' })
            }
          }}
        >
          <RefreshCcw className="size-4" />
          Aktives Szenario zurücksetzen
        </Button>
      </div>
    </div>
  )
}
