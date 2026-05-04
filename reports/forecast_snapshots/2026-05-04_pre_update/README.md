# Pre-Update Forecast Snapshot

- Snapshot time: 2026-05-04T16:07:38+02:00
- Source commit: 7cfbf2f
- Purpose: preserve the forecast and app-data baseline before scraping newly played games.
- Included files: `prefill_predictions.json`, `fixtures.json`, `baseline_table.json`, `data_version.json`, `qa_report.json`.

Use this folder as the fixed forecast baseline when comparing predictions against games that become played after the refresh.
