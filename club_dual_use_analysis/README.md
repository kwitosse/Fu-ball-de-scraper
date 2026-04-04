# Club Dual-Use Analysis

This subproject analyzes whether players appeared for both the first and second teams of selected clubs in season `2526`.

Configured clubs live in `club_dual_use_analysis/clubs.json`.

The script is intended for the common amateur-football compliance question:

- did a player appear for the first team and then also for the second team within a short window,
- did the reverse order happen,
- which players were used by both teams across the season even when there is no short-window case.

Current rules in the script:

- only official matches are included (`ME`, `PO`)
- friendlies and other unofficial matches are excluded
- a dual-use case is an ordered appearance within `5 days`
- actual match participation is defined as starters plus players found in substitution events
- bench-only unused substitutes are not counted

Usage:

```bash
.venv/bin/python club_dual_use_analysis/analyze.py
```

Optional flags:

```bash
.venv/bin/python club_dual_use_analysis/analyze.py --club lipsia --refresh
.venv/bin/python club_dual_use_analysis/analyze.py --output-dir /tmp/dual-use-output
```

Examples:

```bash
# run all configured clubs and write repo-tracked outputs
.venv/bin/python club_dual_use_analysis/analyze.py --output-dir reports/club_dual_use

# rerun live requests instead of using the local cache
.venv/bin/python club_dual_use_analysis/analyze.py --club lipsia --refresh
```

Outputs are written to `club_dual_use_analysis/output/` by default:

- `report.md`
- `analysis.json`
- `dual_appearance_cases.csv`
- `shared_players.csv`
- `cache/`

Output meaning:

- `report.md` is the readable summary with per-club sections, flagged cases, and shared-player history including dates and opponents.
- `analysis.json` contains the full machine-readable payload for each configured club.
- `dual_appearance_cases.csv` is a flat export of ordered first-to-second and second-to-first cases.
- `shared_players.csv` is a flat export of players who appeared for both teams of the same club.
- `cache/` stores the fetched matchplan, lineup, match-course, and player-profile pages used to build the report.

How player appearances are determined:

- starters from the lineup are counted as having played,
- players found as either incoming or outgoing in substitution events are also counted,
- bench-only players without a substitution event are excluded.

How club configuration works:

- each entry in `clubs.json` defines a `club_name`, `first_team_name`, `first_team_id`, `second_team_name`, and `second_team_id`,
- the JSON key, for example `lipsia`, is the value used by `--club`.

Known limitations:

- the analysis depends on lineup availability on fussball.de; if a match has no lineup, it is reported in coverage and excluded from appearance-based conclusions,
- player names are resolved from profile pages because lineup and event fragments often contain obfuscated display names,
- the current window is fixed to `5 days` in the script.

Current repo-generated run:

- the latest committed report is in `reports/club_dual_use/`.
