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

## Why direct matches matter more than normal matches
- Direct-opponent fixtures are marked as **leverage fixtures** because each result changes both your points and a rival's points.
- In one direct game, swing logic is: **Win = +6 swing**, **Draw = +3 swing**, **Loss = +0 swing**.
- Leverage fixtures in this run-in:
  - 2026-06-07 | A vs SV Tapfer 06 Leipzig II (baseline: Rotation 0.729 pts, rival 2.083 pts)
  - 2026-06-21 | A vs SG Olympia 1896 Leipzig II (baseline: Rotation 1.359 pts, rival 1.392 pts)
- Compact scenario cube (direct matches only):
| Scenario (W/D/L) | Prob. mass | Avg Rot pts | Avg Rival pts | Avg rival pts prevented | Avg swing | Target reduction |
|---|---:|---:|---:|---:|---:|---:|
| 1W/0D/1L | 30.2% | 3.0 | 3.0 | 0.475 | 6.0 | 0.48 |
| 0W/0D/2L | 24.1% | 0.0 | 6.0 | -2.525 | 0.0 | 0 |
| 0W/1D/1L | 22.9% | 1.0 | 4.0 | -0.525 | 3.0 | 0 |
| 1W/1D/0L | 11.5% | 4.0 | 1.0 | 2.475 | 9.0 | 2.48 |
| 2W/0D/0L | 6.7% | 6.0 | 0.0 | 3.475 | 12.0 | 3.48 |
| 0W/2D/0L | 4.7% | 2.0 | 2.0 | 1.475 | 6.0 | 1.48 |
- Based on the highest-probability direct-match scenarios, realistic top-2 target can drop by about **0.48** point(s), from **51** toward **51**.

## Form and trend snapshot (from available played detail files)
- Known played matches in detail files for Rotation: **14**.
- Points last 5: **9** | points last 8: **12**.
- Avg GF last 5: **2.8** | Avg GA last 5: **0.8**.
- Clean-sheet rate: **7.1%** | 2+ goals scored rate: **35.7%**.

## Simple projections
- Monte Carlo lightweight model top-2 probability: **7.5%** (based on 4,000 sims, pace-calibrated).
- Sensitivity takeaway: one extra win (vs draw/loss) materially shifts top-2 odds because rank-2 line is near Rotation's reachable range.

## Practical football conclusions
1. **Realistic target**: finish around **51–53 points** (≈ 24–26 points from last 10).
2. **Minimum acceptable return**: **24+ points** (e.g., 8W-0D-2L) to stay in likely top-2 contention.
3. **Most promotion-like profile**: **7–8 wins**, **max 1–2 losses**, and positive GD swing of **+11 to +16** in run-in.
4. **Rank-1/title path**: still mathematically possible but near-miracle; requires both elite Rotation run and significant leader slowdown.
5. **Strategic priority order**: win must-win games first, then maximize points in direct six-pointers, while tightening defense to protect GD gains.
