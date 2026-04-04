# Club Dual-Use Analysis

This subproject analyzes whether players appeared for both the first and second teams of selected clubs in season `2526`.

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

Outputs are written to `club_dual_use_analysis/output/` by default:

- `report.md`
- `analysis.json`
- `dual_appearance_cases.csv`
- `shared_players.csv`
- `cache/`

