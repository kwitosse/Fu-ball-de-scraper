# Fu-ball-de-scraper

A focused Python scraping and analysis project for **fussball.de** league data, centered on:

- Herren Stadtklasse, Kreis Leipzig, Kreisliga A
- Season 2025/2026
- Region Sachsen

This repository combines:

1. a production-style scraper for standings, matchdays, match details, and top scorers, and
2. a downstream promotion-race analysis workflow for **SG Rotation Leipzig II**.

## Project goals

- Collect structured, machine-readable league data from fussball.de pages and AJAX fragments.
- Preserve raw-ish outputs as JSON snapshots for reproducible offline analysis.
- Analyze the promotion race using only repository-local datasets (no live requests in analysis scripts).
- Document scraping constraints (especially obfuscation) and practical extraction boundaries.

## What this repo already contains

### Scraper and data model

- `scraper.py` is the CLI entrypoint that orchestrates all scrape targets and writes output files.
- `scrapers/` holds modular scrapers (`standings`, `matchdays`, `match_detail`, `top_scorers`) built on a shared `BaseScraper` HTTP layer.
- `models.py` defines typed dataclasses (`Match`, `MatchDetail`, `StandingsRow`, `TopScorer`, etc.) used for serialization.

### Generated outputs

- `output/standings.json` — current standings table snapshot.
- `output/matchdays.json` — full fixture/matchday list.
- `output/top_scorers.json` — top scorer table snapshot.
- `output/match_details/*.json` — one JSON file per match detail page.
- `output/summary.json` — scrape metadata and summary counts.

### Analysis outputs

- `scripts/analyze_promotion_race.py` computes promotion scenarios and match-plan views from local output JSONs.
- `reports/rotation_promotion_analysis.md` is the human-readable analysis report.
- `reports/rotation_promotion_analysis.json` is the machine-readable analysis payload.
- `reports/rotation_promotion_scenarios.csv` stores scenario matrix rows.
- `reports/rotation_match_plan.json` captures run-in plan/checkpoint targets.

## Documentation map (where to read what)

If you want orientation fast, read in this order:

1. **`docs/findings.md`**
   - Reverse-engineering notes for fussball.de.
   - URL patterns, key AJAX endpoints, rendering model, obfuscation constraints.
   - HTML structure notes for matchday tables, standings, and match-course events.

2. **`reports/DATA_SOURCES.md`**
   - Explicit statement of which files are used by the promotion analysis.
   - Clarifies that analysis consumes pre-existing scraped outputs only.

3. **`reports/rotation_promotion_analysis.md`**
   - Current project-level football conclusions and target bands.
   - Scenario matrix, GD targets, run-in fixture difficulty, and checkpoint logic.

## Quick start

### 1) Install dependencies

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2) Run scraper

```bash
# default behavior: scrape everything
python scraper.py

# examples
python scraper.py --standings
python scraper.py --matchdays
python scraper.py --top-scorers
python scraper.py --match-details --resume
python scraper.py --all --no-details
```

### 3) Run analysis from saved outputs

```bash
python scripts/analyze_promotion_race.py
```

Outputs are written under `reports/`.

## Known constraints and caveats

- fussball.de obfuscates some values (private-use Unicode font + JS decoding), including many visible scores/names on some pages.
- The scraper intentionally relies on non-obfuscated and/or server-rendered AJAX fragments for robust extraction.
- Analysis quality depends on completeness/freshness of `output/` snapshots in this repo.

For technical detail, see `docs/findings.md`.

## Tech stack

- Python 3
- `requests`
- `beautifulsoup4`
- `lxml`

## Suggested next improvements

- Add regression tests for parser selectors against saved HTML fixtures.
- Add a small Makefile (`make scrape`, `make analyze`) for repeatable runs.
- Add data freshness metadata and change logs between scrape snapshots.
- Add optional export to Parquet/SQLite for richer analysis workflows.
