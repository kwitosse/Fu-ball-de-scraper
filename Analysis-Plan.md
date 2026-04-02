You are working inside a repository that already contains scraped fussball.de data for:

- League: Herren Stadtklasse, Kreis Leipzig, Kreisliga A
- Season: 2025/2026
- 14 teams, 26 matchdays
- Current analysis point: after matchday 16
- Focus team: SG Rotation Leipzig II
- Promotion target: finish in the top 2

The scraping is already complete. The repo already contains all relevant outputs, including standings, matchdays, top scorers, summary data, and around 201 match detail files. Do not rescrape unless absolutely necessary.

Your task is to build a reproducible promotion analysis workflow for SG Rotation Leipzig II using the existing repo outputs only.

Current known table snapshot after matchday 16:
- SG Rotation Leipzig II: 27 points, goals 22:23, goal difference -1, rank 4
- Rank 1: 40 points
- Rank 2: 31 points
- Rank 3: 28 points
- 10 matches remain
- Main realistic goal: rank 2
- Rank 1 should be treated as a stretch / low-probability scenario

What to do:

1. Inspect the repo and identify the available data files, schemas, and relevant parsing/utilities already present.

2. Create a reusable analysis script or module that reads the existing outputs and generates a promotion-race analysis for SG Rotation Leipzig II.

3. Compute the current baseline:
- rank, points, W/D/L, goals for, goals against, goal difference
- points per game
- goals scored and conceded per game
- remaining matches
- maximum possible final points
- gaps to rank 1 and rank 2

4. Build competitor-based target analysis:
- identify the main promotion rivals
- project their final points if they keep their current pace
- estimate a realistic top-2 target points total for Rotation
- distinguish between minimum viable, realistic, and aggressive target totals

5. Build run-in scenario analysis for the final 10 matches, for example:
- 6W 2D 2L
- 7W 1D 2L
- 7W 2D 1L
- 8W 0D 2L
- 8W 1D 1L
- 9W 0D 1L

For each scenario, calculate:
- final points
- whether it likely reaches top 2
- whether it creates any realistic chance for rank 1
- what kind of goal difference improvement would still be needed

6. Add goal-difference / tiebreak analysis:
- compare Rotation’s current goal difference to the main rivals
- estimate what end-of-season goal difference range would make Rotation competitive in tie situations
- translate that into practical run-in targets such as:
  - goals to score in the final 10 matches
  - goals to concede at most
  - target average goal difference per game

7. If the repo data allows it, analyze remaining fixtures and opponent difficulty using:
- current table position
- opponent points-per-game
- goals for / against
- home vs away
- first-leg result, if available

Classify remaining matches into buckets such as:
- must-win
- favorable but tricky
- direct rival / six-pointer
- difficult upset opportunity

8. If match sequence data is available, include trend/form analysis:
- last 5 and last 8 matches
- recent points per game
- recent goals for / against
- clean-sheet rate
- performance vs top-half and bottom-half teams

9. If feasible, add a simple projection model or lightweight simulation to estimate:
- likely final position range
- top-2 chances under different assumptions
- sensitivity to one extra win, draw, or loss

Keep the modeling transparent and interpretable. Prefer simple, explainable methods over black-box logic.

10. Generate practical outputs:
- a markdown report, e.g. reports/rotation_promotion_analysis.md
- optionally JSON/CSV summaries for scenarios and projections

The report should clearly answer:
- What total points likely gets top 2?
- How many points does Rotation need from the final 10 matches?
- What W-D-L records are realistic targets?
- What goal-scoring and defensive level is needed in the run-in?
- How important is goal difference?
- What is the realistic promotion path versus the stretch path?

Implementation requirements:
- reuse existing code where sensible
- avoid unnecessary refactors
- keep the code modular and runnable from the repo root
- add short usage notes if needed
- state assumptions and data limitations clearly

Deliver:
- analysis code
- generated report(s)
- a concise summary of the key findings for SG Rotation Leipzig II

Start by exploring the repo structure and existing outputs, then propose a short implementation plan, and then execute it.