# SG Rotation Leipzig II – Promotion Race Analysis (MD16 snapshot)

## Data sources and schema
- `output/standings.json`: table snapshot with per-team points, W/D/L, GF/GA/GD.
- `output/matchdays.json`: full fixture list (26 matchdays, each with matches and IDs).
- `output/match_details/*.json`: match-level results/events used for form and fixture context.

## Current league situation
- Rotation rank **3**, **36 pts**, goals **28:26** (GD +2).
- Gap to rank 2: **1 pts** | gap to rank 1: **13 pts**.
- Remaining matches: **7** | max final points: **57**.

## Promotion race summary
- Current rank-2 pace projects to ~**50.6** points.
- Realistic top-2 target band: **51–53** points.
- Rotation therefore likely needs **15 to 17** points from last 10.

## Scenario matrix
| Scenario | Final pts | Final PPG | Top-2 pace check | Rank-1 chance |
|---|---:|---:|---|---|
| 6W 2D 2L | 56 | 2.154 | yes | low |
| 7W 1D 2L | 58 | 2.231 | yes | meaningful |
| 7W 2D 1L | 59 | 2.269 | yes | meaningful |
| 8W 0D 2L | 60 | 2.308 | yes | meaningful |
| 8W 1D 1L | 61 | 2.346 | yes | meaningful |
| 9W 0D 1L | 63 | 2.423 | yes | meaningful |

## Goal-difference analysis
- Current GD gaps to promotion rivals: SV Tapfer 06 Leipzig II: -46, SV Lipsia 93 Eutritzsch II: -9, SG Olympia 1896 Leipzig II: -16.
- Minimum viable end-GD target: **+5** (needs +3 swing).
- Realistic tiebreak-safe target: **+10** (needs +8 swing, ~+1.14/game).
- Practical run-in profile for +10 GD: roughly score ~21 and concede ~10 over last 10.

## Remaining fixtures and difficulty
- Remaining fixtures identified in data: **7**.
- Average opponent PPG in run-in: **1.554**.
- Direct rival fixtures in your run-in: **2** (SV Lipsia 93 Eutritzsch II, SV Tapfer 06 Leipzig II).
- Buckets used: must-win / favorable but dangerous / six-pointer / difficult upset opportunity.
- Adjusted rank-2 line (assuming rivals drop points in direct duels): **48.6** points.
- Planned run-in fixtures considered in this analysis:
  - 14.03.2026 | A vs SG LVB I (pos 6, 1.4 ppg, favorable but dangerous)
  - 29.03.2026 | H vs SV Lipsia 93 Eutritzsch II (pos 2, 1.947 ppg, six-pointer / direct rival)
  - 13.05.2026 | H vs FC Blau-Weiß Leipzig II (pos 5, 1.579 ppg, difficult upset opportunity)
  - 10.05.2026 | H vs TSV Böhlitz-Ehrenberg 1990 I (pos 10, 1.158 ppg, favorable but dangerous)
  - 16.05.2026 | A vs Roter Stern Leipzig 99 II (pos 12, 0.85 ppg, must-win)
  - 31.05.2026 | H vs SV Panitzsch/​Borsdorf II (pos 7, 1.368 ppg, favorable but dangerous)
  - 07.06.2026 | A vs SV Tapfer 06 Leipzig II (pos 1, 2.579 ppg, six-pointer / direct rival)

## Direct-opponent leverage (important for your situation)
- You are currently **4 points** behind rank 2 (37 vs 36).
- Beating a direct rival is effectively a **6-point swing** in promotion race terms.
- If direct rivals trade points among themselves, the practical top-2 line can move down by ~2-4 points.
- That lowers your likely target from ~51 to roughly **49** points.

## Form and trend snapshot (from available played detail files)
- Known played matches in detail files for Rotation: **17**.
- Points last 5: **15** | points last 8: **15**.
- Avg GF last 5: **1.6** | Avg GA last 5: **0.6**.
- Clean-sheet rate: **35.3%** | 2+ goals scored rate: **47.1%**.

## Simple projections
- Monte Carlo lightweight model top-2 probability: **33.9%** (based on 4,000 sims, pace-calibrated).
- Fixture-strength Poisson model top-2 probability: **19.6%** (8,000 sims across 57 modeled fixtures).
- Fixture-strength expected final points: **47.79** (remaining xPts: **11.79**).
- Final-points distribution (Poisson model): **P10 43 / P50 48 / P90 53**.
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
| 1 | 14.03.2026 | A | SG LVB I | acceptable_draw | draw | win | win_by_2+ | 3 |
| 2 | 29.03.2026 | H | SV Lipsia 93 Eutritzsch II | promotion_six_pointer | win | win | win_by_2+ | 6 |
| 3 | 13.05.2026 | H | FC Blau-Weiß Leipzig II | upset_bonus | draw | win | win_by_2+ | 9 |
| 4 | 10.05.2026 | H | TSV Böhlitz-Ehrenberg 1990 I | must_win | win | win | win_by_2+ | 12 |
| 5 | 16.05.2026 | A | Roter Stern Leipzig 99 II | must_win | draw | win | win_by_2+ | 15 |
| 6 | 31.05.2026 | H | SV Panitzsch/​Borsdorf II | upset_bonus | draw | win | win_by_2+ | 18 |
| 7 | 07.06.2026 | A | SV Tapfer 06 Leipzig II | promotion_six_pointer | draw | win | win_by_2+ | 21 |

### Cumulative checkpoints and red-line triggers
| After match | Cum min pts | Cum target pts | Remaining games | Red-line trigger | Revised points needed | Revised PPG needed |
|---:|---:|---:|---:|---|---:|---:|
| 3 | 5 | 9 | 4 | if points <= 4 after match 3 | 11 | 2.75 |
| 5 | 9 | 15 | 2 | if points <= 8 after match 5 | 7 | 3.50 |
| 7 | 11 | 21 | 0 | if points <= 10 after match 7 | 5 | 0.00 |
