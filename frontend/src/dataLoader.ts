import { AnalysisReport, AppData, Fixture, MatchPlan, Prediction, QaReport, RotationPerformanceReport, TableRow, Team } from './types'

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`)
  }
  return response.json() as Promise<T>
}

async function fetchOptionalJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url)
  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`)
  }
  return response.json() as Promise<T>
}

async function fetchOptionalText(url: string): Promise<string | null> {
  const response = await fetch(url)
  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`)
  }
  return response.text()
}

export async function loadAppData(): Promise<AppData> {
  const [teams, fixtures, predictions, baselineTable, dataVersion, qaReport, analysisReport, analysisMarkdown, matchPlan, rotationPerformanceReport] = await Promise.all([
    fetchJson<Team[]>('/data/teams.json'),
    fetchJson<Fixture[]>('/data/fixtures.json'),
    fetchJson<Record<string, Prediction>>('/data/prefill_predictions.json'),
    fetchJson<TableRow[]>('/data/baseline_table.json'),
    fetchJson<AppData['dataVersion']>('/data/data_version.json'),
    fetchOptionalJson<QaReport>('/data/qa_report.json'),
    fetchOptionalJson<AnalysisReport>('/reports/rotation_promotion_analysis.json'),
    fetchOptionalText('/reports/rotation_promotion_analysis.md'),
    fetchOptionalJson<MatchPlan>('/reports/rotation_match_plan.json'),
    fetchOptionalJson<RotationPerformanceReport>('/reports/rotation_match_performance.json'),
  ])
  return { teams, fixtures, predictions, baselineTable, dataVersion, qaReport, analysisReport, analysisMarkdown, matchPlan, rotationPerformanceReport }
}
