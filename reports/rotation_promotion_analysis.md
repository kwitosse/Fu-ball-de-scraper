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
- Current GD gaps (Rotation minus rival) vs direct rivals (2/3/5/6/7): SV Lipsia 93 Eutritzsch II: -9, SG Olympia 1896 Leipzig II: -19, VfB Zwenkau 02 II: -6, SG LVB I: -10, FC Blau-Weiß Leipzig II: -4.
- Projected rank-2 (SV Lipsia 93 Eutritzsch II) end-GD on current rates: **+13.0**.
- Projected rank-3 (SG Olympia 1896 Leipzig II) end-GD on current rates: **+29.2**.

### Tiebreak safety target vs direct rivals
- To win a points tie vs projected rank-2, Rotation likely needs about **+15** GD gain from now.
- To win a points tie vs projected rank-3, Rotation likely needs about **+32** GD gain from now.
- Practical run-in target (GF:GA over last 10): minimum **42:10**, preferred **43:9**.

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

## Simple projections
- Monte Carlo lightweight model top-2 probability: **7.3%** (based on 4,000 sims, pace-calibrated).
- Sensitivity takeaway: one extra win (vs draw/loss) materially shifts top-2 odds because rank-2 line is near Rotation's reachable range.

## Practical football conclusions
1. **Realistic target**: finish around **51–53 points** (≈ 24–26 points from last 10).
2. **Minimum acceptable return**: **24+ points** (e.g., 8W-0D-2L) to stay in likely top-2 contention.
3. **Most promotion-like profile**: **7–8 wins**, **max 1–2 losses**, and positive GD swing of **+11 to +16** in run-in.
4. **Rank-1/title path**: still mathematically possible but near-miracle; requires both elite Rotation run and significant leader slowdown.
5. **Strategic priority order**: win must-win games first, then maximize points in direct six-pointers, while tightening defense to protect GD gains.

## Match plan (run-in tactical targets)
| # | Date | H/A | Opponent | Tier | Min | Target | Stretch | Cum target |
|---:|---|:---:|---|---|---|---|---|---:|
| 1 | 2026-04-12 | A | SG Leipzig-Bienitz I | acceptable_draw | draw | win | win_by_2+ | 3 |
| 2 | 2026-04-19 | H | FC Blau-Weiß Leipzig II | upset_bonus | draw | win | win_by_2+ | 6 |
| 3 | 2026-04-26 | A | VfB Zwenkau 02 II | acceptable_draw | draw | win | win_by_2+ | 9 |
| 4 | 2026-05-02 | H | FSV Großpösna I | must_win | win | win | win_by_2+ | 12 |
| 5 | 2026-05-10 | H | TSV Böhlitz-Ehrenberg 1990 I | must_win | win | win | win_by_2+ | 15 |
| 6 | 2026-05-16 | A | Roter Stern Leipzig 99 II | must_win | draw | win | win_by_2+ | 18 |
| 7 | 2026-05-31 | H | SV Panitzsch/​Borsdorf II | upset_bonus | draw | win | win_by_2+ | 21 |
| 8 | 2026-06-07 | A | SV Tapfer 06 Leipzig II | promotion_six_pointer | draw | win | win_by_2+ | 24 |
| 9 | 2026-06-14 | H | SV Victoria 90 Leipzig I | must_win | win | win | win_by_2+ | 27 |
| 10 | 2026-06-21 | A | SG Olympia 1896 Leipzig II | promotion_six_pointer | draw | win | win_by_2+ | 30 |

### Cumulative checkpoints and red-line triggers
| After match | Cum min pts | Cum target pts | Remaining games | Red-line trigger | Revised points needed | Revised PPG needed |
|---:|---:|---:|---:|---|---:|---:|
| 3 | 3 | 9 | 7 | if points <= 2 after match 3 | 22 | 3.14 |
| 5 | 9 | 15 | 5 | if points <= 8 after match 5 | 16 | 3.20 |
| 7 | 11 | 21 | 3 | if points <= 10 after match 7 | 14 | 4.67 |
| 10 | 16 | 30 | 0 | if points <= 15 after match 10 | 9 | 0.00 |
