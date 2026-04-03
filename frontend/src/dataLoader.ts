import { AppData } from './types'

export async function loadAppData(): Promise<AppData> {
  const [teams, fixtures, predictions, baselineTable, dataVersion] = await Promise.all([
    fetch('/data/teams.json').then(r => r.json()),
    fetch('/data/fixtures.json').then(r => r.json()),
    fetch('/data/prefill_predictions.json').then(r => r.json()),
    fetch('/data/baseline_table.json').then(r => r.json()),
    fetch('/data/data_version.json').then(r => r.json()),
  ])
  return { teams, fixtures, predictions, baselineTable, dataVersion }
}
