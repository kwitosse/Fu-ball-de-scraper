# SG Rotation Leipzig II – Promotion Race Analysis (MD16 snapshot)

## Data sources and schema
- `output/standings.json`: table snapshot with per-team points, W/D/L, GF/GA/GD.
- `output/matchdays.json`: full fixture list (26 matchdays, each with matches and IDs).
- `output/match_details/*.json`: match-level results/events used for form and fixture context.

## Current league situation
- Rotation rank **4**, **27 pts**, goals **22:23** (GD -1).
- Gap to rank 2: **4 pts** | gap to rank 1: **13 pts**.
- Remaining matches: **10** | max final points: **57**.

## Promotion race summary
- Current rank-2 pace projects to ~**50.4** points.
- Realistic top-2 target band: **51–53** points.
- Rotation therefore likely needs **24 to 26** points from last 10.

## Scenario matrix
| Scenario | Final pts | Final PPG | Top-2 pace check | Rank-1 chance |
|---|---:|---:|---|---|
| 6W 2D 2L | 47 | 1.808 | borderline/no | low |
| 7W 1D 2L | 49 | 1.885 | borderline/no | low |
| 7W 2D 1L | 50 | 1.923 | borderline/no | low |
| 8W 0D 2L | 51 | 1.962 | yes | low |
| 8W 1D 1L | 52 | 2.0 | yes | low |
| 9W 0D 1L | 54 | 2.077 | yes | low |

## Goal-difference analysis
- Current GD gaps to promotion rivals: SV Tapfer 06 Leipzig II: -40, SV Lipsia 93 Eutritzsch II: -9, SG Olympia 1896 Leipzig II: -19.
- Minimum viable end-GD target: **+5** (needs +6 swing).
- Realistic tiebreak-safe target: **+10** (needs +11 swing, ~+1.10/game).
- Practical run-in profile for +10 GD: roughly score ~21 and concede ~10 over last 10.

## Remaining fixtures and difficulty
- Remaining fixtures identified in data: **10**.
- Average opponent PPG in run-in: **1.331**.
- Direct rival fixtures in your run-in: **2** (SV Tapfer 06 Leipzig II, SG Olympia 1896 Leipzig II).
- Buckets used: must-win / favorable but dangerous / six-pointer / difficult upset opportunity.
- Adjusted rank-2 line (assuming rivals drop points in direct duels): **48.4** points.
- Planned run-in fixtures considered in this analysis:
  - 2026-04-12 | A vs SG Leipzig-Bienitz I (pos 8, 1.312 ppg, favorable but dangerous)
  - 2026-04-19 | H vs FC Blau-Weiß Leipzig II (pos 7, 1.5 ppg, favorable but dangerous)
  - 2026-04-26 | A vs VfB Zwenkau 02 II (pos 5, 1.625 ppg, difficult upset opportunity)
  - 2026-05-02 | H vs FSV Großpösna I (pos 11, 0.938 ppg, must-win)
  - 2026-05-10 | H vs TSV Böhlitz-Ehrenberg 1990 I (pos 10, 1.188 ppg, favorable but dangerous)
  - 2026-05-16 | A vs Roter Stern Leipzig 99 II (pos 13, 0.812 ppg, must-win)
  - 2026-05-31 | H vs SV Panitzsch/​Borsdorf II (pos 9, 1.25 ppg, favorable but dangerous)
  - 2026-06-07 | A vs SV Tapfer 06 Leipzig II (pos 1, 2.5 ppg, six-pointer / direct rival)
  - 2026-06-14 | H vs SV Victoria 90 Leipzig I (pos 14, 0.438 ppg, must-win)
  - 2026-06-21 | A vs SG Olympia 1896 Leipzig II (pos 3, 1.75 ppg, six-pointer / direct rival)

## Direct-opponent leverage (important for your situation)
- You are currently **4 points** behind rank 2 (31 vs 27).
- Beating a direct rival is effectively a **6-point swing** in promotion race terms.
- If direct rivals trade points among themselves, the practical top-2 line can move down by ~2-4 points.
- That lowers your likely target from ~51 to roughly **49** points.

## Form and trend snapshot (from available played detail files)
- Known played matches in detail files for Rotation: **14**.
- Points last 5: **9** | points last 8: **12**.
- Avg GF last 5: **2.8** | Avg GA last 5: **0.8**.
- Clean-sheet rate: **7.1%** | 2+ goals scored rate: **35.7%**.

## Fixture-level simulation (all teams, shared match outcomes)
- Iterations: **12000** across **77** remaining fixtures.
- Rotation top-2 probability: **12.9%**.
- Finish distribution (Rotation): P1=0.1%, P2=12.9%, P3=22.6%, P4=19.3%, P5=15.9%, P6=13.1%, P7=9.3%, P8=4.7%, P9=1.9%, P10=0.3%, P11=0.0%, P12=0.0%
- Model calibration: strength proxy = 70% PPG + 30% GD/game, with explicit home-advantage shift.
- Direct-opponent sensitivity (forced outcomes in Rotation six-pointers): win all direct opponent matches: 51.4%, draw all direct opponent matches: 10.2%, lose all direct opponent matches: 1.5%

## Practical football conclusions
1. **Realistic target**: finish around **51–53 points** (≈ 24–26 points from last 10).
2. **Minimum acceptable return**: **24+ points** (e.g., 8W-0D-2L) to stay in likely top-2 contention.
3. **Most promotion-like profile**: **7–8 wins**, **max 1–2 losses**, and positive GD swing of **+11 to +16** in run-in.
4. **Rank-1/title path**: still mathematically possible but near-miracle; requires both elite Rotation run and significant leader slowdown.
5. **Strategic priority order**: win must-win games first, then maximize points in direct six-pointers, while tightening defense to protect GD gains.
