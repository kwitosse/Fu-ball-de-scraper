import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useAppState } from '../store'
import { GoalBin, PerformanceSplit, RotationFinding, RotationPerformanceMatch } from '../types'
import { Badge } from './ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function formatMinute(value: number | null): string {
  return value === null ? 'n/a' : `${value.toFixed(1)}'`
}

function toneClass(tone: RotationFinding['tone']): string {
  if (tone === 'good') return 'text-[var(--green)]'
  if (tone === 'warn') return 'text-[var(--yellow)]'
  return 'text-[var(--accent)]'
}

function resultTone(result: RotationPerformanceMatch['result']): string {
  if (result === 'win') return 'text-[var(--green)]'
  if (result === 'loss') return 'text-[var(--red)]'
  return 'text-[var(--yellow)]'
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.18em] text-[var(--text2)]">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-[var(--text)]">{value}</div>
      {hint ? <div className="mt-2 text-sm text-[var(--text2)]">{hint}</div> : null}
    </div>
  )
}

function SplitCard({ title, split, hint }: { title: string; split: PerformanceSplit; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-[var(--text)]">{title}</div>
        <Badge variant="secondary">{split.played} Spiele</Badge>
      </div>
      <div className="mt-3 text-lg font-semibold text-[var(--text)]">{split.record}</div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-[var(--text2)]">
        <div>PPG: {split.ppg.toFixed(2)}</div>
        <div>GF/GA: {split.gf_per_game.toFixed(2)} / {split.ga_per_game.toFixed(2)}</div>
      </div>
      {hint ? <div className="mt-3 text-sm text-[var(--text2)]">{hint}</div> : null}
    </div>
  )
}

function MinuteBarChart({ title, bins, colorClass }: { title: string; bins: GoalBin[]; colorClass: string }) {
  const max = Math.max(...bins.map(bin => bin.count), 1)
  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
      <div className="mb-3 text-sm font-semibold text-[var(--text)]">{title}</div>
      <div className="space-y-3">
        {bins.map(bin => (
          <div key={bin.label} className="grid grid-cols-[56px_1fr_32px] items-center gap-3 text-sm">
            <span className="text-[var(--text2)]">{bin.label}</span>
            <div className="h-2 rounded-full bg-white/8">
              <div
                className={`h-2 rounded-full ${colorClass}`}
                style={{ width: `${(bin.count / max) * 100}%` }}
              />
            </div>
            <span className="text-right text-[var(--text)]">{bin.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MatchCard({ match }: { match: RotationPerformanceMatch }) {
  const [open, setOpen] = useState(false)
  const timeline = match.goal_timeline

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/4">
      <button
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
        onClick={() => setOpen(value => !value)}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[var(--text)]">MD {match.matchday}</span>
            <Badge variant="secondary">{match.home_away}</Badge>
            <span className={`text-sm font-semibold ${resultTone(match.result)}`}>
              {match.score_for}:{match.score_against}
            </span>
          </div>
          <div className="mt-1 truncate text-sm text-[var(--text)]">{match.opponent}</div>
          <div className="mt-1 text-xs text-[var(--text2)]">
            {match.date || 'Kein Datum'} · HT {match.halftime_for}:{match.halftime_against}
            {match.first_goal ? ` · Erstes Tor: ${match.first_goal === 'for' ? 'Rotation' : 'Gegner'}` : ' · Kein Torverlauf'}
          </div>
        </div>
        {open ? <ChevronUp className="size-4 shrink-0 text-[var(--text2)]" /> : <ChevronDown className="size-4 shrink-0 text-[var(--text2)]" />}
      </button>

      {open ? (
        <div className="border-t border-white/8 px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Kickoff" value={match.kickoff || match.time || 'n/a'} />
            <MetricCard label="Zuschauer" value={match.attendance === null ? 'n/a' : String(match.attendance)} />
            <MetricCard label="Karten" value={`${match.discipline.our_yellow + match.discipline.our_red}`} hint={`Rot ${match.discipline.our_red}`} />
            <MetricCard label="Wechsel" value={String(match.substitutions.our_count)} hint={`Gegner ${match.substitutions.opponent_count}`} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {match.kept_clean_sheet ? <Badge>Zu Null</Badge> : null}
            {match.failed_to_score ? <Badge variant="secondary">Ohne Tor</Badge> : null}
            {match.scored_two_plus ? <Badge>2+ Tore</Badge> : null}
            {match.conceded_two_plus ? <Badge variant="secondary">2+ Gegentore</Badge> : null}
            {match.led_then_dropped_points ? <Badge variant="secondary">Fuehrung nicht gehalten</Badge> : null}
            {match.trailed_then_won_points ? <Badge>Rueckstand in Punkte gedreht</Badge> : null}
          </div>

          <div className="mt-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--text2)]">Torverlauf</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {timeline.length === 0 ? (
                <span className="text-sm text-[var(--text2)]">Kein verifizierter Torverlauf vorhanden.</span>
              ) : (
                timeline.map((event, index) => (
                  <div
                    key={`${match.match_id}-${index}`}
                    className={`rounded-xl border px-3 py-2 text-sm ${event.kind === 'for' ? 'border-[rgba(76,175,80,0.25)] bg-[rgba(76,175,80,0.12)] text-[var(--text)]' : 'border-[rgba(244,67,54,0.25)] bg-[rgba(244,67,54,0.12)] text-[var(--text)]'}`}
                  >
                    <div className="font-semibold">{event.minute ?? '?'}'</div>
                    <div>{event.kind === 'for' ? 'Rotation' : 'Gegner'} · {event.score_for}:{event.score_against}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {match.venue ? <div className="mt-4 text-sm text-[var(--text2)]">{match.venue}</div> : null}
        </div>
      ) : null}
    </div>
  )
}

export default function RotationPerformanceView() {
  const { appData } = useAppState()

  if (!appData) {
    return <div className="page-title">Keine Daten verfügbar</div>
  }

  const report = appData.rotationPerformanceReport
  if (!report) {
    return (
      <div>
        <div className="mb-4">
          <div className="page-title">Performance</div>
          <p className="text-sm text-[var(--text2)]">Fuer dieses Dashboard wird `rotation_match_performance.json` benoetigt.</p>
        </div>
        <Card>
          <CardHeader>
            <Badge variant="secondary">Report fehlt</Badge>
            <CardTitle className="text-base">Performance-Analyse derzeit nicht verfügbar</CardTitle>
            <CardDescription>
              Fuehre `bash scripts/copy_data.sh` aus, nachdem `scripts/build_app_data.sh` den neuen Report erzeugt hat.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const matchesNewestFirst = [...report.matches].sort((a, b) => b.matchday - a.matchday)

  return (
    <div className="space-y-4">
      <div>
        <div className="page-title">Performance</div>
        <p className="text-sm text-[var(--text2)]">
          Match-Performance von {report.context.focus_team}: Timing, Match States, Stabilitaet und Drilldown pro Spiel.
        </p>
      </div>

      <Card className="bg-[linear-gradient(180deg,rgba(15,52,96,0.95),rgba(12,39,73,0.95))]">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Rotation Fokus</Badge>
            <Badge variant="secondary">{report.summary.played} Spiele</Badge>
            <Badge variant="secondary">{formatPercent(report.coverage.timeline_coverage_rate)} Timeline-Coverage</Badge>
          </div>
          <CardTitle>Was Rotation traegt und was Punkte kostet</CardTitle>
          <CardDescription>
            Die Resultate kommen aus den kanonischen Fixture-Daten. Timing-Charts und Goal-State-Metriken verwenden nur verifizierte Match-Detail-Dateien.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <Badge variant="secondary">Snapshot</Badge>
          <CardTitle className="text-base">Sofort lesbare Ausgangslage</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-0 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Record" value={report.summary.record} hint={`${report.summary.points} Punkte · ${report.summary.ppg.toFixed(2)} PPG`} />
          <MetricCard label="Torbilanz" value={`${report.summary.goals_for}:${report.summary.goals_against}`} hint={`Diff ${report.summary.goal_diff >= 0 ? '+' : ''}${report.summary.goal_diff}`} />
          <MetricCard label="Zu Null" value={String(report.summary.clean_sheets)} hint={`${report.summary.failed_to_score} Spiele ohne eigenes Tor`} />
          <MetricCard label="Erstes Tor" value={report.game_states.scored_first.record} hint={`Nach Rueckstand: ${report.game_states.conceded_first.record}`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <Badge variant="secondary">Headline Findings</Badge>
          <CardTitle className="text-base">Die wichtigsten Muster im aktuellen Datensatz</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-0 xl:grid-cols-2">
          {report.findings.map(finding => (
            <div key={finding.id} className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-semibold text-[var(--text)]">{finding.title}</div>
                <div className={`text-lg font-semibold ${toneClass(finding.tone)}`}>{finding.value}</div>
              </div>
              <div className="mt-3 text-sm text-[var(--text2)]">{finding.explanation}</div>
              <div className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--text2)]">Sample {finding.sample_size}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <Badge variant="secondary">When We Score / Concede</Badge>
          <CardTitle className="text-base">Timing der Tore</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 xl:grid-cols-2">
          <MinuteBarChart title="Rotation Tore nach Minutenfenster" bins={report.timing.goal_bins_for} colorClass="bg-[linear-gradient(90deg,var(--accent),#ff8a65)]" />
          <MinuteBarChart title="Rotation Gegentore nach Minutenfenster" bins={report.timing.goal_bins_against} colorClass="bg-[linear-gradient(90deg,#ffb300,#f44336)]" />
          <MetricCard
            label="Erstes Rotationstor"
            value={formatMinute(report.timing.avg_first_goal_for_minute)}
            hint={`${formatPercent(report.timing.second_half_share_for)} aller Rotationstore fallen nach der Pause`}
          />
          <MetricCard
            label="Erstes Gegentor"
            value={formatMinute(report.timing.avg_first_goal_against_minute)}
            hint={`${formatPercent(report.timing.late_goal_share_against)} aller Gegentore fallen ab Minute 76`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <Badge variant="secondary">Game State</Badge>
          <CardTitle className="text-base">Wie Rotation auf Spielstaende reagiert</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-0 md:grid-cols-2 xl:grid-cols-3">
          <SplitCard title="Scored First" split={report.game_states.scored_first} />
          <SplitCard title="Conceded First" split={report.game_states.conceded_first} />
          <SplitCard title="Halftime Ahead" split={report.game_states.halftime_ahead} />
          <SplitCard title="Halftime Level" split={report.game_states.halftime_level} />
          <SplitCard title="Halftime Behind" split={report.game_states.halftime_behind} />
          <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
            <div className="text-sm font-semibold text-[var(--text)]">Stabilitaet vs Reaktion</div>
            <div className="mt-3 space-y-2 text-sm text-[var(--text2)]">
              <div>Fuehrungen mit Punktverlust: <span className="text-[var(--text)]">{report.game_states.dropped_points_after_leading}</span></div>
              <div>Punkte nach Rueckstand: <span className="text-[var(--text)]">{report.game_states.won_points_after_trailing}</span></div>
              <div>Ø bis zum Ausgleich: <span className="text-[var(--text)]">{formatMinute(report.game_states.avg_equalizer_response_minutes)}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <Badge variant="secondary">Stability</Badge>
          <CardTitle className="text-base">Wann Rotation stabil ist und wann es kippt</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-0 md:grid-cols-2 xl:grid-cols-4">
          <SplitCard title="Zu Null" split={report.game_states.clean_sheet_record} />
          <SplitCard title="2+ Tore" split={report.game_states.scored_two_plus_record} />
          <SplitCard title="2+ Gegentore" split={report.game_states.conceded_two_plus_record} />
          <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
            <div className="text-sm font-semibold text-[var(--text)]">Disziplin</div>
            <div className="mt-3 space-y-2 text-sm text-[var(--text2)]">
              <div>Gelb gesamt: <span className="text-[var(--text)]">{report.discipline.total_yellow}</span></div>
              <div>Rot gesamt: <span className="text-[var(--text)]">{report.discipline.total_red}</span></div>
              <div>Karten in Niederlagen: <span className="text-[var(--text)]">{report.discipline.avg_cards_in_losses.toFixed(2)}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <Badge variant="secondary">Home / Away</Badge>
          <CardTitle className="text-base">Splits nach Spielort</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-0 md:grid-cols-2">
          <SplitCard title="Heimspiele" split={report.splits.home} />
          <SplitCard title="Auswaertsspiele" split={report.splits.away} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <Badge variant="secondary">Match Explorer</Badge>
          <CardTitle className="text-base">Drilldown pro Spiel</CardTitle>
          <CardDescription>Neueste Spiele zuerst. Jede Karte zeigt Resultat, Halbzeitbild, Goal Timeline und Disziplin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {matchesNewestFirst.map(match => (
            <MatchCard key={match.match_id} match={match} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <Badge variant="secondary">Limitationen</Badge>
          <CardTitle className="text-base">Was die Daten aktuell nicht leisten</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="space-y-2 text-sm text-[var(--text2)]">
            {report.context.known_limitations.map(item => (
              <li key={item} className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
