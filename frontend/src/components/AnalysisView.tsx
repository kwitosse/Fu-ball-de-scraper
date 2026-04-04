import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAppState } from '../store'
import { Badge } from './ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
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

export default function AnalysisView() {
  const { appData } = useAppState()

  if (!appData) {
    return <div className="page-title">Keine Daten verfügbar</div>
  }

  const report = appData.analysisReport
  const markdown = appData.analysisMarkdown
  const matchPlan = appData.matchPlan ?? report?.match_plan ?? null

  if (!report && !markdown) {
    return (
      <div>
        <div className="mb-4">
          <div className="page-title">Analyse</div>
          <p className="text-sm text-[var(--text2)]">Die Frontend-Daten sind geladen, aber es wurden keine Analyse-Reports unter `frontend/public/reports` gefunden.</p>
        </div>
        <Card>
          <CardHeader>
            <Badge variant="secondary">Reports fehlen</Badge>
            <CardTitle className="text-base">Analyse derzeit nicht verfuegbar</CardTitle>
            <CardDescription>
              Fuehre `bash scripts/copy_data.sh` aus, damit die Report-Dateien in den statischen Frontend-Ordner kopiert werden.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="page-title">Analyse</div>
        <p className="text-sm text-[var(--text2)]">Projektziel, Promotion-Race-Report und die wichtigsten Kennzahlen direkt im Frontend.</p>
      </div>

      <Card className="bg-[linear-gradient(180deg,rgba(15,52,96,0.95),rgba(12,39,73,0.95))]">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Projektziel</Badge>
            {report ? <Badge variant="secondary">{report.context.season}</Badge> : null}
          </div>
          <CardTitle>Promotion-Race fuer SG Rotation Leipzig II sichtbar machen</CardTitle>
          <CardDescription className="max-w-3xl">
            Der Kern dieses Projekts ist eine reproduzierbare Analyse des Aufstiegskampfs mit lokalen Repo-Daten. Praktisches Ziel: SG Rotation Leipzig II in Richtung Top 2 planen und die Zielpfade transparent machen.
          </CardDescription>
        </CardHeader>
        {report ? (
          <CardContent className="grid gap-3 pt-0 text-sm text-[var(--text2)] sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em]">Wettbewerb</div>
              <div className="mt-2 text-[var(--text)]">{report.context.league}</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em]">Analyse erstellt</div>
              <div className="mt-2 text-[var(--text)]">{new Date(report.context.analysis_generated_at).toLocaleString('de-DE')}</div>
            </div>
          </CardContent>
        ) : null}
      </Card>

      {report ? (
        <>
          <Card>
            <CardHeader className="pb-3">
              <Badge variant="secondary">Snapshot</Badge>
              <CardTitle className="text-base">Aktuelle Ausgangslage</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 pt-0 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Tabellenplatz" value={`#${report.current_state.position}`} hint={`${report.current_state.points} Punkte`} />
              <MetricCard label="Rueckstand auf Rang 2" value={`${report.current_state.gap_to_rank2}`} hint={`Rang 1: ${report.current_state.gap_to_rank1}`} />
              <MetricCard label="Restspiele" value={String(report.current_state.remaining_matches)} hint={`Maximal ${report.current_state.max_possible_points} Punkte`} />
              <MetricCard label="Torverhaeltnis" value={`${report.current_state.goals.for}:${report.current_state.goals.against}`} hint={`Differenz ${report.current_state.goals.diff >= 0 ? '+' : ''}${report.current_state.goals.diff}`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <Badge variant="secondary">Zielkorridor</Badge>
              <CardTitle className="text-base">Was fuer Top 2 noetig ist</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 pt-0 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Realistisches Top-2-Ziel" value={`${report.conclusions.realistic_top2_total_points} Punkte`} hint={report.pace_projection.required_record_hint.realistic_target} />
              <MetricCard label="Punkte aus den letzten 10" value={`${report.conclusions.minimum_acceptable_points_from_last_10}+`} hint={`Konservativ ${report.pace_projection.required_points_from_last_10.conservative}`} />
              <MetricCard label="Direktduell-Linie" value={`${formatNumber(report.pace_projection.rank2_bands.direct_duel_adjusted)} Punkte`} hint={`Hold pace ${formatNumber(report.pace_projection.rank2_bands.hold_current_pace)}`} />
              <MetricCard label="Ziel-GD-Swing" value={`+${report.goal_difference.target_ranges.realistic_end_gd.net_gd_gain_needed}`} hint={`${formatNumber(report.goal_difference.target_ranges.realistic_end_gd.avg_gd_per_game_needed)}/Spiel`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <Badge variant="secondary">Simulation</Badge>
              <CardTitle className="text-base">Modellierte Chancen und Punktespanne</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 pt-0 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Top-2 Chance" value={formatPercent(report.simulation.fixture_strength_poisson.top2_probability)} hint={`Poisson-Modell, ${report.simulation.fixture_strength_poisson.iterations} Sims`} />
              <MetricCard label="Pace-Modell" value={formatPercent(report.simulation.pace_calibrated.top2_probability)} hint={`${report.simulation.pace_calibrated.iterations} Sims`} />
              <MetricCard label="Erwartete Endpunkte" value={formatNumber(report.simulation.fixture_strength_poisson.focus_expected_final_points)} hint={`Rest-xPts ${formatNumber(report.simulation.fixture_strength_poisson.focus_expected_points_from_remaining)}`} />
              <MetricCard label="P10 / P50 / P90" value={`${report.simulation.fixture_strength_poisson.focus_points_distribution.p10} / ${report.simulation.fixture_strength_poisson.focus_points_distribution.p50} / ${report.simulation.fixture_strength_poisson.focus_points_distribution.p90}`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <Badge variant="secondary">Form</Badge>
              <CardTitle className="text-base">Trend aus den vorhandenen Detaildaten</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 pt-0 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Punkte letzte 5" value={String(report.form_and_trends.points_last_5)} />
              <MetricCard label="Punkte letzte 8" value={String(report.form_and_trends.points_last_8)} />
              <MetricCard label="Schnitt Tore" value={`${formatNumber(report.form_and_trends.avg_gf_last_5)} : ${formatNumber(report.form_and_trends.avg_ga_last_5)}`} hint="GF : GA letzte 5" />
              <MetricCard label="Zu Null / 2+ Tore" value={`${formatPercent(report.form_and_trends.clean_sheet_rate)} / ${formatPercent(report.form_and_trends.games_2plus_goals_rate)}`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <Badge variant="secondary">Szenarien</Badge>
              <CardTitle className="text-base">Scenario Matrix</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-white/6 text-[var(--text)]">
                      <th className="border-b border-white/8 px-3 py-2">Szenario</th>
                      <th className="border-b border-white/8 px-3 py-2">Endpunkte</th>
                      <th className="border-b border-white/8 px-3 py-2">PPG</th>
                      <th className="border-b border-white/8 px-3 py-2">Top 2</th>
                      <th className="border-b border-white/8 px-3 py-2">Mit Rivalen-Drop</th>
                      <th className="border-b border-white/8 px-3 py-2">Titelchance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.scenario_matrix.map(row => (
                      <tr key={row.scenario} className="border-b border-white/8 last:border-b-0">
                        <td className="px-3 py-2 text-[var(--text)]">{row.scenario}</td>
                        <td className="px-3 py-2 text-[var(--text2)]">{row.final_points}</td>
                        <td className="px-3 py-2 text-[var(--text2)]">{formatNumber(row.final_ppg)}</td>
                        <td className="px-3 py-2 text-[var(--text2)]">{row.likely_top2_vs_rank2_pace}</td>
                        <td className="px-3 py-2 text-[var(--text2)]">{row.top2_if_rank2_drops_2pts_in_direct_duels}</td>
                        <td className="px-3 py-2 text-[var(--text2)]">{row.rank1_chance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {matchPlan ? (
            <Card>
              <CardHeader className="pb-3">
                <Badge variant="secondary">Run-in</Badge>
                <CardTitle className="text-base">Match Plan und Red-Line Checkpoints</CardTitle>
                <CardDescription>Ziel aus dem Run-in: {matchPlan.target_points_from_run_in} Punkte.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 pt-0 xl:grid-cols-[1.5fr_1fr]">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] border-collapse text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-white/6 text-[var(--text)]">
                        <th className="border-b border-white/8 px-3 py-2">#</th>
                        <th className="border-b border-white/8 px-3 py-2">Datum</th>
                        <th className="border-b border-white/8 px-3 py-2">Gegner</th>
                        <th className="border-b border-white/8 px-3 py-2">Tier</th>
                        <th className="border-b border-white/8 px-3 py-2">Minimum</th>
                        <th className="border-b border-white/8 px-3 py-2">Ziel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchPlan.matches.map(match => (
                        <tr key={`${match.match_number}-${match.opponent}`} className="border-b border-white/8 last:border-b-0">
                          <td className="px-3 py-2 text-[var(--text)]">{match.match_number}</td>
                          <td className="px-3 py-2 text-[var(--text2)]">{match.date}</td>
                          <td className="px-3 py-2 text-[var(--text2)]">{match.home_away} vs {match.opponent}</td>
                          <td className="px-3 py-2 text-[var(--text2)]">{match.tier}</td>
                          <td className="px-3 py-2 text-[var(--text2)]">{match.minimum_acceptable_result}</td>
                          <td className="px-3 py-2 text-[var(--text2)]">{match.target_result}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-3">
                  {matchPlan.checkpoints.map(checkpoint => (
                    <div key={checkpoint.after_match} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                      <div className="text-sm font-semibold text-[var(--text)]">Nach Spiel {checkpoint.after_match}</div>
                      <div className="mt-2 text-sm text-[var(--text2)]">Ziel kumuliert: {checkpoint.cumulative_target_points} Punkte</div>
                      <div className="text-sm text-[var(--text2)]">Minimum kumuliert: {checkpoint.cumulative_minimum_points} Punkte</div>
                      <div className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--accent)]">Red Line</div>
                      <div className="mt-1 text-sm text-[var(--text)]">{checkpoint.red_line.trigger}</div>
                      <div className="mt-1 text-sm text-[var(--text2)]">
                        Dann noch {checkpoint.red_line.revised_required_points_in_remaining_games} Punkte noetig
                        bei {formatNumber(checkpoint.red_line.required_ppg_in_remaining_games)} PPG.
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-3">
              <Badge variant="secondary">Schlussfolgerungen</Badge>
              <CardTitle className="text-base">Promotion-like Profile</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2 text-sm text-[var(--text2)]">
                {report.conclusions.promotion_like_profile.map(item => (
                  <li key={item} className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-[var(--text2)]">
                <span className="font-semibold text-[var(--text)]">Title path:</span> {report.conclusions.title_path_assessment}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      {markdown ? (
        <Card>
          <CardHeader className="pb-3">
            <Badge variant="secondary">Markdown Report</Badge>
            <CardTitle className="text-base">Vollstaendiger Analysebericht</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="analysis-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {markdown}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
