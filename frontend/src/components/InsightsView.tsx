import React from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAppState } from '../store'
import type { AnalysisReport, Fixture, TableRow } from '../types'
import { buildRivalProjectionData, buildRivalTrendData, buildTrendSeries } from '../lib/insightsChartData'
import { Badge } from './ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { CHART_AXIS, CHART_COLORS, CHART_GRID, ChartShell, ChartTooltipContent } from './ui/chart'

type SplitStats = {
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  points: number
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function formatSignedNumber(value: number): string {
  return value > 0 ? `+${formatNumber(value)}` : formatNumber(value)
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function clampRatio(value: number, max: number): number {
  if (max <= 0) return 0
  return Math.max(0, Math.min(1, value / max))
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

function StatPill({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'accent' | 'good' | 'warn' }) {
  const toneClass = tone === 'accent'
    ? 'text-[var(--accent)]'
    : tone === 'good'
      ? 'text-[var(--green)]'
      : tone === 'warn'
        ? 'text-[var(--yellow)]'
        : 'text-[var(--text)]'

  return (
    <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--text2)]">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${toneClass}`}>{value}</div>
    </div>
  )
}

function ProgressTrack({
  label,
  current,
  target,
  maximum,
  currentLabel,
  targetLabel,
}: {
  label: string
  current: number
  target: number
  maximum: number
  currentLabel: string
  targetLabel: string
}) {
  const currentWidth = `${clampRatio(current, maximum) * 100}%`
  const targetLeft = `${clampRatio(target, maximum) * 100}%`

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-[var(--text)]">{label}</div>
        <div className="text-xs text-[var(--text2)]">Skala 0-{formatNumber(maximum)}</div>
      </div>
      <div className="relative h-3 rounded-full bg-white/8">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),#ff8a65)]" style={{ width: currentWidth }} />
        <div className="absolute inset-y-[-5px] w-px bg-[var(--yellow)]" style={{ left: targetLeft }} />
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-[var(--text2)]">
        <span>{currentLabel}</span>
        <span>{targetLabel}</span>
      </div>
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

function TrendChart({
  title,
  subtitle,
  data,
  dataKey,
  color,
  invert = false,
  valueFormatter,
}: {
  title: string
  subtitle: string
  data: Array<{ matchday: number; [key: string]: number }>
  dataKey: 'points' | 'position' | 'goalDiff'
  color: string
  invert?: boolean
  valueFormatter: (value: number) => string
}) {
  if (!data.length) {
    return (
      <div>
        <div className="mb-2 text-sm text-[var(--text2)]">{title}</div>
        <ChartEmptyState message="Noch keine gespielten Spieltage vorhanden." />
        <div className="mt-2 text-xs text-[var(--text2)]">{subtitle}</div>
      </div>
    )
  }

  const yDomain = dataKey === 'position'
    ? [1, Math.max(...data.map(point => point[dataKey]), 4)]
    : undefined

  return (
    <div>
      <div className="mb-2 text-sm text-[var(--text2)]">{title}</div>
      <ChartShell heightClassName="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 10, left: -18, bottom: 2 }}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="matchday"
              tick={{ fill: CHART_AXIS, fontSize: 12 }}
              tickLine={{ stroke: CHART_GRID }}
              axisLine={{ stroke: CHART_GRID }}
              tickFormatter={value => `MD ${value}`}
            />
            <YAxis
              reversed={invert}
              domain={yDomain}
              allowDecimals={false}
              tick={{ fill: CHART_AXIS, fontSize: 12 }}
              tickLine={{ stroke: CHART_GRID }}
              axisLine={{ stroke: CHART_GRID }}
              width={38}
            />
            <Tooltip
              content={(
                <ChartTooltipContent
                  labelFormatter={label => `Spieltag ${label}`}
                  valueFormatter={value => valueFormatter(Number(value ?? 0))}
                />
              )}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={3}
              dot={{ r: 2.5, strokeWidth: 0, fill: color }}
              activeDot={{ r: 5, strokeWidth: 0, fill: color }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>
      <div className="mt-2 text-xs text-[var(--text2)]">{subtitle}</div>
    </div>
  )
}

function buildColorMap(teams: string[], focusTeam: string) {
  const palette = [CHART_COLORS.accent, CHART_COLORS.yellow, CHART_COLORS.cyan, CHART_COLORS.violet, CHART_COLORS.green]
  return teams.reduce<Record<string, string>>((acc, team, index) => {
    acc[team] = team === focusTeam ? CHART_COLORS.accent : palette[index % palette.length]
    return acc
  }, {})
}

function summarizeSplit(fixtures: Fixture[], focusTeam: string, predicate: (fixture: Fixture) => boolean): SplitStats {
  const stats: SplitStats = { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }
  for (const fixture of fixtures) {
    if (fixture.status !== 'played' || fixture.home_score === null || fixture.away_score === null || !predicate(fixture)) {
      continue
    }
    const isHome = fixture.home_team === focusTeam
    const isAway = fixture.away_team === focusTeam
    if (!isHome && !isAway) continue

    const gf = isHome ? fixture.home_score : fixture.away_score
    const ga = isHome ? fixture.away_score : fixture.home_score
    stats.played += 1
    stats.goalsFor += gf
    stats.goalsAgainst += ga
    if (gf > ga) {
      stats.wins += 1
      stats.points += 3
    } else if (gf === ga) {
      stats.draws += 1
      stats.points += 1
    } else {
      stats.losses += 1
    }
  }
  return stats
}

function getHalfSplit(fixtures: Fixture[], focusTeam: string, baselineTable: TableRow[]) {
  const topHalf = new Set(baselineTable.slice(0, Math.floor(baselineTable.length / 2)).map(row => row.team))
  return {
    topHalf: summarizeSplit(fixtures, focusTeam, fixture => {
      const opponent = fixture.home_team === focusTeam ? fixture.away_team : fixture.home_team
      return topHalf.has(opponent)
    }),
    bottomHalf: summarizeSplit(fixtures, focusTeam, fixture => {
      const opponent = fixture.home_team === focusTeam ? fixture.away_team : fixture.home_team
      return !topHalf.has(opponent)
    }),
  }
}

function resultsString(stats: SplitStats): string {
  return `${stats.wins}-${stats.draws}-${stats.losses}`
}

function bucketTone(bucket: string): 'accent' | 'good' | 'warn' | 'neutral' {
  if (bucket.includes('six-pointer')) return 'accent'
  if (bucket.includes('must-win')) return 'good'
  if (bucket.includes('difficult')) return 'warn'
  return 'neutral'
}

function topTarget(report: AnalysisReport): number {
  return Math.max(
    report.current_state.max_possible_points,
    report.conclusions.realistic_top2_total_points,
    report.pace_projection.required_points_from_last_10.conservative + report.current_state.points,
    ...((report.pace_projection.rival_projection ?? []).map(row => row.projected_final_points)),
  )
}

function currentRecord(report: AnalysisReport): string {
  const record = report.current_state.record
  return record ? `${record.wins}-${record.draws}-${record.losses}` : 'n/a'
}

export default function InsightsView() {
  const { appData } = useAppState()

  if (!appData) {
    return <div className="page-title">Keine Daten verfügbar</div>
  }

  const report = appData.analysisReport
  if (!report) {
    return (
      <div>
        <div className="mb-4">
          <div className="page-title">Insights</div>
          <p className="text-sm text-[var(--text2)]">Für das Dashboard wird `rotation_promotion_analysis.json` benötigt.</p>
        </div>
        <Card>
          <CardHeader>
            <Badge variant="secondary">Analyse fehlt</Badge>
            <CardTitle className="text-base">Insights derzeit nicht verfügbar</CardTitle>
            <CardDescription>
              Fuehre `python scripts/analyze_promotion_race.py` und danach `bash scripts/copy_data.sh` aus, damit die Reports im Frontend landen.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const focusTeam = report.context.focus_team
  const targetMax = topTarget(report)
  const trendSeries = buildTrendSeries(appData.fixtures, appData.baselineTable, focusTeam)
  const rivalTeams = Array.from(new Set([
    focusTeam,
    ...((report.pace_projection.rival_projection ?? []).slice(0, 4).map(row => row.team)),
  ]))
  const rivalTrendData = buildRivalTrendData(appData.fixtures, appData.baselineTable, rivalTeams)
  const rivalProjectionData = buildRivalProjectionData(report)
  const rivalColors = buildColorMap(rivalTeams, focusTeam)
  const homeSplit = summarizeSplit(appData.fixtures, focusTeam, fixture => fixture.home_team === focusTeam)
  const awaySplit = summarizeSplit(appData.fixtures, focusTeam, fixture => fixture.away_team === focusTeam)
  const halfSplit = getHalfSplit(appData.fixtures, focusTeam, appData.baselineTable)
  const remainingFixtures = report.remaining_fixtures.fixtures ?? []
  const groupedFixtures = remainingFixtures.reduce<Record<string, typeof remainingFixtures>>((acc, fixture) => {
    acc[fixture.bucket] ??= []
    acc[fixture.bucket].push(fixture)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div>
        <div className="page-title">Insights</div>
        <p className="text-sm text-[var(--text2)]">
          Offizieller Snapshot für den Aufstiegskampf von {focusTeam}. Diese Ansicht reagiert bewusst nicht auf Szenario-Edits.
        </p>
      </div>

      <Card className="bg-[linear-gradient(180deg,rgba(15,52,96,0.95),rgba(12,39,73,0.95))]">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Promotion Cockpit</Badge>
            <Badge variant="secondary">{report.context.season}</Badge>
          </div>
          <CardTitle>{focusTeam} im offiziellen Rennen um Platz 2</CardTitle>
          <CardDescription className="max-w-3xl">
            Rang {report.current_state.position}, {report.current_state.points} Punkte und noch {report.current_state.remaining_matches} Spiele bis zum Saisonende.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 pt-0 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Aktueller Record" value={currentRecord(report)} hint={`${formatNumber(report.current_state.ppg)} PPG`} />
          <MetricCard label="Punkte bis Rang 2" value={String(report.current_state.gap_to_rank2)} hint={`Rang 1: ${report.current_state.gap_to_rank1}`} />
          <MetricCard label="Noetig fuer realistischen Pfad" value={`${report.conclusions.realistic_top2_total_points - report.current_state.points}`} hint={`${report.conclusions.realistic_top2_total_points} Endpunkte`} />
          <MetricCard label="Noetig fuer Safety Line" value={`${report.pace_projection.required_points_from_last_10.conservative}`} hint={report.pace_projection.required_record_hint.safer_target} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <Badge variant="secondary">Zielkorridor</Badge>
          <CardTitle className="text-base">Punkte- und Zielpfade</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 lg:grid-cols-2">
          <ProgressTrack
            label="Aktueller Stand vs realistisches Top-2-Ziel"
            current={report.current_state.points}
            target={report.conclusions.realistic_top2_total_points}
            maximum={targetMax}
            currentLabel={`${report.current_state.points} aktuell`}
            targetLabel={`${report.conclusions.realistic_top2_total_points} realistisch`}
          />
          <ProgressTrack
            label="Aktueller Stand vs direkte Rang-2-Linie"
            current={report.current_state.points}
            target={report.pace_projection.rank2_bands.direct_duel_adjusted}
            maximum={targetMax}
            currentLabel={`${report.current_state.points} aktuell`}
            targetLabel={`${formatNumber(report.pace_projection.rank2_bands.direct_duel_adjusted)} direkte Linie`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <Badge variant="secondary">Rival Race</Badge>
          <CardTitle className="text-base">Aktuelle Punkte und Pace-Projektionen</CardTitle>
          <CardDescription>
            Interaktive Gegenüberstellung von Ist-Stand und projizierten Endpunkten.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {rivalProjectionData.length ? (
            <ChartShell heightClassName="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rivalProjectionData} layout="vertical" margin={{ top: 6, right: 18, left: 6, bottom: 2 }} barGap={10}>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: CHART_AXIS, fontSize: 12 }}
                    tickLine={{ stroke: CHART_GRID }}
                    axisLine={{ stroke: CHART_GRID }}
                  />
                  <YAxis
                    type="category"
                    dataKey="team"
                    tick={{ fill: CHART_AXIS, fontSize: 12 }}
                    tickLine={{ stroke: CHART_GRID }}
                    axisLine={{ stroke: CHART_GRID }}
                    width={118}
                  />
                  <Tooltip
                    content={(
                      <ChartTooltipContent
                        valueFormatter={(value, item) => {
                          if (item.dataKey === 'projectedPoints') return `${formatNumber(Number(value ?? 0))} proj`
                          if (item.dataKey === 'currentPoints') return `${formatNumber(Number(value ?? 0))} aktuell`
                          return formatNumber(Number(value ?? 0))
                        }}
                      />
                    )}
                  />
                  <Legend wrapperStyle={{ color: CHART_AXIS, fontSize: '12px' }} />
                  <Bar name="Aktuell" dataKey="currentPoints" fill={CHART_COLORS.accent} radius={[0, 6, 6, 0]} />
                  <Bar name="Projiziert" dataKey="projectedPoints" fill={CHART_COLORS.yellow} fillOpacity={0.76} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartShell>
          ) : (
            <ChartEmptyState message="Keine Rivalen-Projektionen im Report vorhanden." />
          )}
          {report.direct_rival_impact ? (
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-[var(--text2)]">
              <div className="font-semibold text-[var(--text)]">Direktduell-Hebel</div>
              <div className="mt-1">{report.direct_rival_impact.leverage_note}</div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <Badge variant="secondary">Trend</Badge>
            <CardTitle className="text-base">Rotation über die Spieltage</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-0 md:grid-cols-3">
            <TrendChart
              title="Punkte kumuliert"
              subtitle={`MD ${trendSeries[0]?.matchday ?? '-'} bis MD ${trendSeries[trendSeries.length - 1]?.matchday ?? '-'}`}
              data={trendSeries}
              dataKey="points"
              color={CHART_COLORS.accent}
              valueFormatter={value => `${value} Punkte`}
            />
            <TrendChart
              title="Tabellenplatz"
              subtitle="Niedriger ist besser"
              data={trendSeries}
              dataKey="position"
              color={CHART_COLORS.yellow}
              invert
              valueFormatter={value => `Platz ${value}`}
            />
            <TrendChart
              title="Torverhältnis-Differenz"
              subtitle={`Aktuell ${formatSignedNumber(report.current_state.goals.diff)}`}
              data={trendSeries}
              dataKey="goalDiff"
              color={CHART_COLORS.green}
              valueFormatter={value => formatSignedNumber(value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <Badge variant="secondary">Rivalen-Verlauf</Badge>
            <CardTitle className="text-base">Kumulative Punkte der Hauptkonkurrenten</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {rivalTrendData.length ? (
              <ChartShell heightClassName="h-[26rem]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rivalTrendData} margin={{ top: 12, right: 12, left: -16, bottom: 4 }}>
                    <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="matchday"
                      tick={{ fill: CHART_AXIS, fontSize: 12 }}
                      tickLine={{ stroke: CHART_GRID }}
                      axisLine={{ stroke: CHART_GRID }}
                      tickFormatter={value => `MD ${value}`}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: CHART_AXIS, fontSize: 12 }}
                      tickLine={{ stroke: CHART_GRID }}
                      axisLine={{ stroke: CHART_GRID }}
                      width={36}
                    />
                    <Tooltip
                      content={(
                        <ChartTooltipContent
                          labelFormatter={label => `Spieltag ${label}`}
                          valueFormatter={value => `${value} Punkte`}
                        />
                      )}
                    />
                    <Legend wrapperStyle={{ color: CHART_AXIS, fontSize: '12px' }} />
                    {rivalTeams.map(team => (
                      <Line
                        key={team}
                        type="monotone"
                        dataKey={team}
                        stroke={rivalColors[team]}
                        strokeWidth={team === focusTeam ? 3.2 : 2.4}
                        dot={false}
                        activeDot={{ r: 4.5, strokeWidth: 0 }}
                        name={team}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </ChartShell>
            ) : (
              <ChartEmptyState message="Noch keine Rivalen-Verlaufsdaten vorhanden." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <Badge variant="secondary">Run-in</Badge>
          <CardTitle className="text-base">Restprogramm und Match-Typen</CardTitle>
          <CardDescription>
            {remainingFixtures.length} verbleibende Spiele, durchschnittliche Gegnerstärke {formatNumber(report.remaining_fixtures.average_opponent_ppg)} PPG.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(groupedFixtures).map(([bucket, fixtures]) => (
              <div key={bucket} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-[var(--text)]">{bucket}</div>
                  <Badge variant="secondary">{fixtures.length}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {fixtures.map(fixture => (
                    <StatPill
                      key={`${fixture.date}-${fixture.opponent}`}
                      label={`${fixture.home_away} • #${fixture.opponent_pos}`}
                      value={fixture.opponent}
                      tone={bucketTone(bucket)}
                    />
                  ))}
                </div>
              </div>
            ))}
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="text-sm font-semibold text-[var(--text)]">Home / Away Split</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <StatPill label="Heim" value={String(remainingFixtures.filter(f => f.home_away === 'H').length)} tone="good" />
                <StatPill label="Auswärts" value={String(remainingFixtures.filter(f => f.home_away === 'A').length)} tone="warn" />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-white/6 text-[var(--text)]">
                  <th className="border-b border-white/8 px-3 py-2">Datum</th>
                  <th className="border-b border-white/8 px-3 py-2">Spiel</th>
                  <th className="border-b border-white/8 px-3 py-2">Bucket</th>
                  <th className="border-b border-white/8 px-3 py-2">PPG</th>
                  <th className="border-b border-white/8 px-3 py-2">Hinrunde</th>
                </tr>
              </thead>
              <tbody>
                {remainingFixtures.map(fixture => (
                  <tr key={`${fixture.date}-${fixture.opponent}`} className="border-b border-white/8 last:border-b-0">
                    <td className="px-3 py-2 text-[var(--text2)]">{fixture.date}</td>
                    <td className="px-3 py-2 text-[var(--text)]">{fixture.home_away} vs {fixture.opponent}</td>
                    <td className="px-3 py-2 text-[var(--text2)]">{fixture.bucket}</td>
                    <td className="px-3 py-2 text-[var(--text2)]">{formatNumber(fixture.opponent_ppg)}</td>
                    <td className="px-3 py-2 text-[var(--text2)]">{fixture.first_leg_result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <Badge variant="secondary">Formprofil</Badge>
            <CardTitle className="text-base">Heim/Auswärts und Gegner-Splits</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="text-sm font-semibold text-[var(--text)]">Heim</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <StatPill label="Bilanz" value={resultsString(homeSplit)} tone="good" />
                <StatPill label="Punkte" value={String(homeSplit.points)} />
                <StatPill label="Tore" value={`${homeSplit.goalsFor}:${homeSplit.goalsAgainst}`} />
                <StatPill label="Spiele" value={String(homeSplit.played)} />
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="text-sm font-semibold text-[var(--text)]">Auswärts</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <StatPill label="Bilanz" value={resultsString(awaySplit)} tone="warn" />
                <StatPill label="Punkte" value={String(awaySplit.points)} />
                <StatPill label="Tore" value={`${awaySplit.goalsFor}:${awaySplit.goalsAgainst}`} />
                <StatPill label="Spiele" value={String(awaySplit.played)} />
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="text-sm font-semibold text-[var(--text)]">vs Top-Half</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <StatPill label="Bilanz" value={resultsString(halfSplit.topHalf)} tone="accent" />
                <StatPill label="Punkte" value={String(halfSplit.topHalf.points)} />
                <StatPill label="Tore" value={`${halfSplit.topHalf.goalsFor}:${halfSplit.topHalf.goalsAgainst}`} />
                <StatPill label="Spiele" value={String(halfSplit.topHalf.played)} />
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="text-sm font-semibold text-[var(--text)]">vs Bottom-Half</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <StatPill label="Bilanz" value={resultsString(halfSplit.bottomHalf)} tone="good" />
                <StatPill label="Punkte" value={String(halfSplit.bottomHalf.points)} />
                <StatPill label="Tore" value={`${halfSplit.bottomHalf.goalsFor}:${halfSplit.bottomHalf.goalsAgainst}`} />
                <StatPill label="Spiele" value={String(halfSplit.bottomHalf.played)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <Badge variant="secondary">Recent Form</Badge>
            <CardTitle className="text-base">Letzte Samples aus dem Report</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0 sm:grid-cols-2">
            <MetricCard label="Punkte letzte 5" value={String(report.form_and_trends.points_last_5)} hint={`${formatNumber(report.form_and_trends.avg_gf_last_5)}:${formatNumber(report.form_and_trends.avg_ga_last_5)} Tore`} />
            <MetricCard label="Punkte letzte 8" value={String(report.form_and_trends.points_last_8)} hint={`${report.form_and_trends.known_played_matches} bekannte Spiele`} />
            <MetricCard label="Clean Sheet Rate" value={formatPercent(report.form_and_trends.clean_sheet_rate)} />
            <MetricCard label="2+ Tore Quote" value={formatPercent(report.form_and_trends.games_2plus_goals_rate)} hint={report.form_and_trends.losses_after_conceding_first !== undefined ? `${report.form_and_trends.losses_after_conceding_first} Niederlagen nach 0:1` : undefined} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <Badge variant="secondary">Data Confidence</Badge>
          <CardTitle className="text-base">Datenlage und Grenzen</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard label="Teams" value={String(appData.qaReport?.total_teams ?? appData.teams.length)} />
            <MetricCard label="Fixtures" value={String(appData.qaReport?.total_fixtures ?? appData.fixtures.length)} />
            <MetricCard label="Gespielt" value={String(appData.qaReport?.played_fixtures ?? appData.fixtures.filter(f => f.status === 'played').length)} />
            <MetricCard label="Offene Scores" value={String(appData.qaReport?.missing_scores ?? 0)} hint={appData.qaReport ? `QA vom ${new Date(appData.qaReport.generated_at).toLocaleString('de-DE')}` : 'Kein QA-Report geladen'} />
          </div>
          <div className="space-y-3">
            {(report.context.known_data_limitations ?? []).map(item => (
              <div key={item} className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-[var(--text2)]">
                {item}
              </div>
            ))}
            <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-[var(--text2)]">
              Insights bleiben am offiziellen Snapshot ausgerichtet und ignorieren bewusst die aktive Szenario-Logik.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
