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
- Average opponent PPG in run-in: **1.462**.
- Buckets used: must-win / favorable but dangerous / six-pointer / difficult upset opportunity.

## Form and trend snapshot (from available played detail files)
- Known played matches in detail files for Rotation: **14**.
- Points last 5: **9** | points last 8: **12**.
- Avg GF last 5: **2.8** | Avg GA last 5: **0.8**.
- Clean-sheet rate: **7.1%** | 2+ goals scored rate: **35.7%**.

## Simple projections
- Monte Carlo lightweight model top-2 probability: **6.6%** (based on 4,000 sims, pace-calibrated).
- Sensitivity takeaway: one extra win (vs draw/loss) materially shifts top-2 odds because rank-2 line is near Rotation's reachable range.

## Practical football conclusions
1. **Realistic target**: finish around **51–53 points** (≈ 24–26 points from last 10).
2. **Minimum acceptable return**: **24+ points** (e.g., 8W-0D-2L) to stay in likely top-2 contention.
3. **Most promotion-like profile**: **7–8 wins**, **max 1–2 losses**, and positive GD swing of **+11 to +16** in run-in.
4. **Rank-1/title path**: still mathematically possible but near-miracle; requires both elite Rotation run and significant leader slowdown.
5. **Strategic priority order**: win must-win games first, then maximize points in direct six-pointers, while tightening defense to protect GD gains.
