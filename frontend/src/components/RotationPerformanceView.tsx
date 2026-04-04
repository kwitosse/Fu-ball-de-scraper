import React, { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useAppState } from '../store'
import { buildGameStateSplitData, buildGoalTimingData, buildStabilitySplitData } from '../lib/performanceChartData'
import type { RotationFinding, RotationPerformanceMatch } from '../types'
import { Badge } from './ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { CHART_AXIS, CHART_COLORS, CHART_GRID, ChartShell, ChartTooltipContent } from './ui/chart'

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

function ChartEmptyState({ message }: { message: string }) {
  return (
    <ChartShell heightClassName="h-72">
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-[var(--text2)]">
        {message}
      </div>
    </ChartShell>
  )
}

function SplitComparisonTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload?: { label: string; played: number; record: string; ppg: number; gfPerGame: number; gaPerGame: number; goalDiff: number } }>
}) {
  const item = payload?.[0]?.payload
  if (!active || !item) {
    return null
  }

  return (
    <div className="min-w-[190px] rounded-2xl border border-white/10 bg-[rgba(10,16,30,0.96)] px-3 py-2 shadow-[0_18px_38px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text2)]">{item.label}</div>
      <div className="space-y-1 text-sm text-[var(--text)]">
        <div className="flex items-center justify-between gap-4"><span>PPG</span><span className="font-semibold">{item.ppg.toFixed(2)}</span></div>
        <div className="flex items-center justify-between gap-4"><span>Bilanz</span><span className="font-semibold">{item.record}</span></div>
        <div className="flex items-center justify-between gap-4"><span>Spiele</span><span className="font-semibold">{item.played}</span></div>
        <div className="flex items-center justify-between gap-4"><span>GF/GA</span><span className="font-semibold">{item.gfPerGame.toFixed(2)} / {item.gaPerGame.toFixed(2)}</span></div>
        <div className="flex items-center justify-between gap-4"><span>Tor-Diff</span><span className="font-semibold">{item.goalDiff > 0 ? '+' : ''}{item.goalDiff}</span></div>
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
  const goalTimingData = buildGoalTimingData(report)
  const gameStateData = buildGameStateSplitData(report)
  const stabilityData = buildStabilitySplitData(report)

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
        <CardContent className="grid gap-4 pt-0 xl:grid-cols-[1.45fr_0.55fr]">
          {goalTimingData.length ? (
            <ChartShell heightClassName="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={goalTimingData} margin={{ top: 10, right: 12, left: -16, bottom: 4 }} barGap={8}>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="window"
                    tick={{ fill: CHART_AXIS, fontSize: 12 }}
                    tickLine={{ stroke: CHART_GRID }}
                    axisLine={{ stroke: CHART_GRID }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: CHART_AXIS, fontSize: 12 }}
                    tickLine={{ stroke: CHART_GRID }}
                    axisLine={{ stroke: CHART_GRID }}
                    width={34}
                  />
                  <Tooltip
                    content={(
                      <ChartTooltipContent
                        labelFormatter={label => `${label} Minuten`}
                        valueFormatter={(value, item) => `${value ?? 0} ${item.dataKey === 'conceded' ? 'Gegentore' : 'Tore'}`}
                      />
                    )}
                  />
                  <Legend wrapperStyle={{ color: CHART_AXIS, fontSize: '12px' }} />
                  <Bar name="Rotation Tore" dataKey="scored" fill={CHART_COLORS.accent} radius={[6, 6, 0, 0]} />
                  <Bar name="Rotation Gegentore" dataKey="conceded" fill={CHART_COLORS.yellow} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartShell>
          ) : (
            <ChartEmptyState message="Keine Timingdaten im Report vorhanden." />
          )}
          <div className="grid gap-3">
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
            <MetricCard
              label="Late Goals For"
              value={String(report.timing.late_goal_matches_for)}
              hint={`${formatPercent(report.timing.late_goal_share_for)} aller Tore ab Minute 76`}
            />
            <MetricCard
              label="Late Goals Against"
              value={String(report.timing.late_goal_matches_against)}
              hint={`${formatPercent(report.timing.second_half_share_against)} aller Gegentore nach der Pause`}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <Badge variant="secondary">Game State</Badge>
          <CardTitle className="text-base">Wie Rotation auf Spielstaende reagiert</CardTitle>
          <CardDescription>
            Die Balken vergleichen Punkte pro Spiel. Hover zeigt Bilanz, Sample und Torprofil.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 xl:grid-cols-[1.2fr_0.8fr]">
          {gameStateData.length ? (
            <ChartShell heightClassName="h-[26rem]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gameStateData} layout="vertical" margin={{ top: 10, right: 12, left: 6, bottom: 4 }}>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: CHART_AXIS, fontSize: 12 }}
                    tickLine={{ stroke: CHART_GRID }}
                    axisLine={{ stroke: CHART_GRID }}
                    domain={[0, 3.2]}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fill: CHART_AXIS, fontSize: 12 }}
                    tickLine={{ stroke: CHART_GRID }}
                    axisLine={{ stroke: CHART_GRID }}
                    width={108}
                  />
                  <Tooltip content={<SplitComparisonTooltip />} />
                  <Bar dataKey="ppg" name="PPG" fill={CHART_COLORS.cyan} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartShell>
          ) : (
            <ChartEmptyState message="Keine Game-State-Daten im Report vorhanden." />
          )}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <MetricCard label="Scored First" value={report.game_states.scored_first.record} hint={`${report.game_states.scored_first.ppg.toFixed(2)} PPG`} />
            <MetricCard label="Conceded First" value={report.game_states.conceded_first.record} hint={`${report.game_states.conceded_first.ppg.toFixed(2)} PPG`} />
            <MetricCard label="Punktverluste nach Fuehrung" value={String(report.game_states.dropped_points_after_leading)} hint={`${report.game_states.lead_lost_matches} Spiele mit verlorener Fuehrung`} />
            <MetricCard label="Punkte nach Rueckstand" value={String(report.game_states.won_points_after_trailing)} hint={`Ø ${formatMinute(report.game_states.avg_equalizer_response_minutes)} bis zum Ausgleich`} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <Badge variant="secondary">Stability & Splits</Badge>
          <CardTitle className="text-base">Home/Away, Clean Sheets und Kipppunkte</CardTitle>
          <CardDescription>
            Vergleich derselben PPG-Skala über Standort- und Stabilitaets-Splits.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 xl:grid-cols-[1.2fr_0.8fr]">
          {stabilityData.length ? (
            <ChartShell heightClassName="h-[26rem]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stabilityData} layout="vertical" margin={{ top: 10, right: 12, left: 6, bottom: 4 }}>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: CHART_AXIS, fontSize: 12 }}
                    tickLine={{ stroke: CHART_GRID }}
                    axisLine={{ stroke: CHART_GRID }}
                    domain={[0, 3.2]}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fill: CHART_AXIS, fontSize: 12 }}
                    tickLine={{ stroke: CHART_GRID }}
                    axisLine={{ stroke: CHART_GRID }}
                    width={102}
                  />
                  <Tooltip content={<SplitComparisonTooltip />} />
                  <Bar dataKey="ppg" name="PPG" fill={CHART_COLORS.green} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartShell>
          ) : (
            <ChartEmptyState message="Keine Stability-Splits im Report vorhanden." />
          )}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <MetricCard label="Disziplin" value={`${report.discipline.total_yellow} Gelb`} hint={`${report.discipline.total_red} Rot`} />
            <MetricCard label="Cards in Wins" value={report.discipline.avg_cards_in_wins.toFixed(2)} />
            <MetricCard label="Cards in Draws" value={report.discipline.avg_cards_in_draws.toFixed(2)} />
            <MetricCard label="Cards in Losses" value={report.discipline.avg_cards_in_losses.toFixed(2)} hint={`${report.discipline.red_card_matches} Spiele mit Rot`} />
          </div>
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
