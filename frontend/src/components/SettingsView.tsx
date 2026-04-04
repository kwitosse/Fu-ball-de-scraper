declare const __APP_VERSION__: string
import React from 'react'
import { useAppState, useAppDispatch } from '../store'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { RefreshCcw, Trash2 } from 'lucide-react'

export default function SettingsView() {
  const { appData } = useAppState()
  const dispatch = useAppDispatch()

  const infoRows = appData ? [
    ['Datenstand', new Date(appData.dataVersion.generated_at).toLocaleString('de-DE')],
    ['Modellversion', appData.dataVersion.model_version],
    ['Teams', String(appData.teams.length)],
    ['Spiele gesamt', String(appData.fixtures.length)],
    ['Gespielt', String(appData.fixtures.filter(f => f.status === 'played').length)],
    ['Ausstehend', String(appData.fixtures.filter(f => f.status !== 'played').length)],
  ] : []

  return (
    <div>
      <div className="page-title">Einstellungen</div>

      {appData && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Datenstatus</Badge>
            </div>
            <CardTitle className="text-base">Aktueller Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0">
            {infoRows.map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1 rounded-2xl border border-white/8 bg-white/4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-[var(--text)]">{label}</span>
                <span className="text-sm text-[var(--text2)]">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardHeader className="pb-3">
          <Badge variant="secondary">Aktionen</Badge>
          <CardTitle className="text-base">Lokale Szenarien verwalten</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-0">
          <Button
            variant="secondary"
            className="w-full justify-start"
            onClick={() => {
              if (confirm('Alle Änderungen im aktiven Szenario zurücksetzen?')) {
                dispatch({ type: 'RESET_ALL' })
              }
            }}
          >
            <RefreshCcw className="size-4" />
            Alle Overrides zurücksetzen
          </Button>
          <Button
            variant="destructive"
            className="w-full justify-start"
            onClick={() => {
              if (confirm('Alle Szenarien aus dem Speicher löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
                localStorage.removeItem('fu-ball-scenarios')
                window.location.reload()
              }
            }}
          >
            <Trash2 className="size-4" />
            Alle Szenarien löschen
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <Badge variant="secondary">Info</Badge>
          <CardTitle className="text-base">App und Speicher</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex flex-col gap-1 rounded-2xl border border-white/8 bg-white/4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-[var(--text)]">App-Version</span>
            <span className="text-sm text-[var(--text2)]">{__APP_VERSION__}</span>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl border border-white/8 bg-white/4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-[var(--text)]">Datenspeicher</span>
            <span className="text-sm text-[var(--text2)]">localStorage</span>
          </div>
          <div className="text-sm leading-6 text-[var(--text2)]">
            Das Standard-Szenario folgt automatisch dem aktuellen Datenstand. Eigene Szenarien bleiben beim nächsten Datenupdate erhalten.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
