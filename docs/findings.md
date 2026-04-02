# fussball.de Scraping Findings

Technical findings from reverse-engineering the fussball.de website for the
Kreisliga A Herren Kreis Leipzig (Sachsen, Season 25/26) league scraper.

---

## Target League

| Field | Value |
|---|---|
| League name | Herren Stadtklasse, Kreis Leipzig, Kreisliga A |
| Season | 2025/2026 |
| Region | Sachsen |
| Staffel ID | `02TKCSME94000008VS5489BUVUD1610F-G` |
| League slug | `herren-stadtklasse-kreis-leipzig-kreisliga-a-herren-saison2526-sachsen` |
| Teams | 14 |
| Matchdays | 26 |
| Matches per matchday | ~7 (201 total) |

---

## Rendering Model

fussball.de uses a **mixed rendering approach**:

| Page | Rendering | Scraping approach |
|---|---|---|
| Spieltag (matchday schedule) | Angular shell + server-side rows | `requests` + BeautifulSoup |
| `ajax.actual.table` | Server-side HTML fragment | `requests` + BeautifulSoup |
| `ajax.match.course` | Server-side HTML fragment | `requests` + BeautifulSoup |
| Torjäger (top scorers) | Server-side HTML table | `requests` + BeautifulSoup |
| Scores on matchday page | JS-obfuscated (font encoding) | Not extractable without JS |
| Player names | JS-obfuscated (font encoding) | Not extractable without JS |
| Match dates on matchday page | JS-obfuscated | Not extractable without JS |

**No headless browser is required.** All useful structured data is available in
server-rendered HTML fragments, primarily via AJAX endpoints that fussball.de
calls internally to populate the page.

---

## URL Patterns

### Static pages

```
# Current matchday (redirects to latest active matchday)
https://www.fussball.de/spieltag/{league-slug}/-/staffel/{staffel-id}

# Specific matchday N (N = 1..26)
https://www.fussball.de/spieltag/{league-slug}/-/spieltag/{N}/staffel/{staffel-id}

# Match detail page
https://www.fussball.de/spiel/{match-slug}/-/spiel/{match-id}

# Top scorers
https://www.fussball.de/torjaeger/{league-slug}/-/staffel/{staffel-id}

# All matchdays overview
https://www.fussball.de/spieltagsuebersicht/{league-slug}/-/staffel/{staffel-id}
```

### AJAX endpoints (key discovery)

These endpoints are called by Angular to populate the page. They return
**clean, server-rendered HTML fragments** — no JavaScript execution needed.

```
# Current league standings table
GET /ajax.actual.table/-/staffel/{staffel-id}

# Standings at a specific matchday (historical)
GET /ajax.table/-/spieltag/{N}/staffel/{staffel-id}

# Home/Away round splits
GET /ajax.actual.table.rounds/-/staffel/{staffel-id}

# Match event timeline (goals, cards, substitutions)
GET /ajax.match.course/-/mode/PAGE/spiel/{match-id}

# Match lineup
GET /ajax.match.lineup/-/mode/PAGE/spiel/{match-id}/ticker-id/selectedTickerId

# Comparative season stats for both teams
GET /ajax.season.stats/-/mode/PAGE/spiel/{match-id}

# Fever curve / form chart
GET /ajax.fevercurve/-/mode/PAGE/spiel/{match-id}
```

---

## JavaScript Obfuscation

fussball.de encodes sensitive values using a **private-use Unicode font**
(`\uE000`–`\uF8FF` range). This applies to:

- Player names in match detail and match course pages
- Scores in matchday schedule tables (`span.score-left`, `span.score-right`)
- Match dates in matchday schedule tables (`td.column-date`)
- Some venue/location data on the main match detail page

Obfuscated elements carry a `data-obfuscation="<key>"` attribute. JavaScript
uses the key to look up the decoded glyph mapping at runtime.

**Values that are NOT obfuscated:**
- Team names (everywhere)
- Match IDs (in href URLs)
- Team IDs (in href URLs)
- Player profile URLs (only the href, not the displayed name)
- Goal minutes, card minutes, substitution minutes
- Event types (goal/card/substitution) — identified via CSS classes
- Venue address (via `<a class="location">` element)
- Attendance (plain text "Zuschauer: N")
- Match date — available unobfuscated in the `<title>` tag

---

## HTML Structure: Matchday Schedule Page

The matchday page contains **two tables** with class `table-striped`:

1. **Match schedule table** — additionally has class `thead` in its class list
2. **Standings table** — same classes but without `thead`

### Match table row structure

```html
<tr class="odd">                          <!-- or no class for "even" rows -->
  <td class="column-date">               <!-- date/time: JS-obfuscated -->
    <span data-obfuscation="..."></span>
  </td>
  <td class="column-club">              <!-- home team -->
    <a class="club-wrapper" href="/mannschaft/.../-/saison/2526/team-id/TEAM_ID">
      <div class="club-logo table-image">...</div>
      <div class="club-name">SG LVB I</div>
    </a>
  </td>
  <td class="strong no-border no-padding">:</td>
  <td class="column-club no-border">    <!-- away team (same structure) -->
    <a class="club-wrapper" href="/mannschaft/.../-/saison/2526/team-id/TEAM_ID">
      <div class="club-name">FSV Großpösna I</div>
    </a>
  </td>
  <td class="column-score">             <!-- score: JS-obfuscated -->
    <a href="/spiel/{match-slug}/-/spiel/{MATCH_ID}">
      <span class="score-left" data-obfuscation="..."></span>
      <span class="colon">:</span>
      <span class="score-right" data-obfuscation="..."></span>
    </a>
  </td>
  <td class="column-detail">            <!-- "Zum Spiel" link -->
    <a href="/spiel/{match-slug}/-/spiel/{MATCH_ID}">Zum Spiel</a>
  </td>
  ...
</tr>
```

**Key classes:**
- `column-club` — team cells (appears twice per row: home and away)
- `club-wrapper` — the anchor element containing the club logo and name
- `club-name` — the `<div>` with the human-readable team name (not obfuscated)
- `column-score` — contains the match detail link and obfuscated score spans
- `column-date` — date/time cell (obfuscated)

**Row class quirk:** "Even" rows have no class at all (empty `class` attribute).
"Odd" rows have `class="odd"`. Group-label rows have `class="row-headline visible-small"`.

---

## HTML Structure: Standings Table (`ajax.actual.table`)

Table class: `table table-striped table-full-width`

```html
<tr class="thead">                       <!-- header row — skip -->
  <th colspan="2">Pl.</th>
  <th class="column-large">Mannschaft</th>
  <th>Sp.</th>
  <th class="hidden-small">G</th>
  <th class="hidden-small">U</th>
  <th class="hidden-small">V</th>
  <th>Torv.</th>
  <th class="hidden-small">Tordifferenz</th>
  <th>Pkt.</th>
</tr>

<tr class="row-promotion">              <!-- data row (1st, 2nd place promotions) -->
  <td class="column-icon">...</td>      <!-- promotion/relegation arrow icon -->
  <td class="column-rank">1.</td>       <!-- position -->
  <td class="column-club">             <!-- team name + ID -->
    <a class="club-wrapper" href="/mannschaft/.../-/saison/2526/team-id/TEAM_ID">
      <div class="club-name">SV Tapfer 06 Leipzig II</div>
    </a>
  </td>
  <td>16</td>                           <!-- Sp. (matches played) -->
  <td class="hidden-small">12</td>      <!-- G (wins) -->
  <td class="hidden-small">4</td>       <!-- U (draws) -->
  <td class="hidden-small">0</td>       <!-- V (losses) -->
  <td class="no-wrap">48 : 9</td>       <!-- Torv. (goals for:against) -->
  <td class="hidden-small">39</td>      <!-- Tordifferenz (goal difference) -->
  <td class="column-points">40</td>     <!-- Pkt. (points) -->
</tr>
```

**Column order** (after team cell):
`Sp.` → `G` → `U` → `V` → `Torv. (N:M)` → `Tordifferenz` → `Pkt.`

---

## HTML Structure: Match Course (`ajax.match.course`)

Returns a full event timeline in `div#match_course_body`. The match is split
into `div.first-half` and `div.second-half` sections.

### Event structure

Every event is a `div.row-event` with the team side encoded in its class:

- `event-right` → **home team** event
- `event-left` → **away team** event

```html
<div class="row-event event-right">        <!-- event-right = home team -->
  <div class="column-time">
    <div class="hexagon black">
      <div class="valign-inner">65'</div>  <!-- minute — not obfuscated -->
    </div>
  </div>
  <div class="column-event">
    <!-- event type indicator (see below) -->
  </div>
  <div class="column-player">
    <a href="/spielerprofil/-/player-id/PLAYER_ID">
      <div class="player-name">
        <span data-obfuscation="..."></span>  <!-- player name: OBFUSCATED -->
      </div>
    </a>
  </div>
</div>
```

### Event type detection

| Event | Detection method |
|---|---|
| **Regular goal** | `div.column-event` contains `span.score-left` |
| **Own goal** | `div.row-event.own-goal` + `span.score-left` in column-event |
| **Yellow card** | `<i class="icon-card yellow-card">` |
| **Yellow-red card** | `<span class="icon-stack">` containing `span.icon-card-half` + `span.icon-card.red-card` |
| **Red card** | `<i class="icon-card red-card">` (standalone, no icon-stack) |
| **Substitution** | `<i class="icon-substitute">` |

### Goal score spans (also obfuscated)

Goal events include the running score at the time of the goal inside
`div.column-event`, but these are also obfuscated:

```html
<div class="column-event">
  <div class="valign-cell">
    <div class="even">                        <!-- or "odd" -->
      <span class="score-left" data-obfuscation="..."></span>
      <span class="score-right" data-obfuscation="..."></span>
    </div>
  </div>
</div>
```

**Score derivation strategy:** Instead of reading the obfuscated spans, the
final score is computed by counting goal events:

```
home_score = count(event-right goals, not own-goal)
           + count(event-left own-goals)
away_score = count(event-left goals, not own-goal)
           + count(event-right own-goals)
```

### Substitution text format

Substitution player names are also obfuscated, but jersey numbers appear
in the plain text as `k.A. (21)` (where 21 is the shirt number):

```
"Auswechslung k.A. (21) für k.A. (15)"
```

---

## HTML Structure: Top Scorers (Torjäger)

The torjaeger page contains an HTML `<table>` with columns:
`Pl.` | `Spieler` | `Mannschaft` | `Tore`

Player names on this page are **not obfuscated** — they appear as plain text.

```html
<tr>
  <td>1.</td>
  <td>
    <a href="/spielerprofil/-/player-id/PLAYER_ID">Philipp Anders</a>
  </td>
  <td>
    <a href="/mannschaft/sv-tapfer-06-leipzig-ii-.../-/saison/2526/team-id/TEAM_ID">
      SV Tapfer 06 Leipzig II
    </a>
  </td>
  <td>11</td>
</tr>
```

A "Mehr laden" (load more) button at the bottom suggests lazy pagination,
but for a Kreisliga with ~30 scorers the initial page render contains all entries.

---

## Match Detail Page

The main `/spiel/.../-/spiel/{ID}` page is mostly obfuscated. The useful
**non-obfuscated** data points:

| Data | Location | Extraction method |
|---|---|---|
| Home team name | `<a href="/mannschaft/...">` (first) | Link text |
| Away team name | `<a href="/mannschaft/...">` (second) | Link text |
| Match date | `<title>` tag | Regex `\d{2}\.\d{2}\.\d{4}` |
| Kickoff time | Page body | Regex `(\d{2}:\d{2})\s*Uhr` |
| Venue address | `<a class="location">` | Link text |
| Attendance | Page body | Regex `Zuschauer[:\s]+(\d+)` |
| AJAX links | `data-ajax-resource` attributes | Direct attribute read |

The score displayed on the match page (`[0 : 0]`) is a placeholder rendered
before JavaScript runs — it does not reflect the actual result.

---

## ID Extraction Patterns

### Match ID

```
URL: /spiel/{match-slug}/-/spiel/{MATCH_ID}
Regex: /spiel/([^/]+)/-/spiel/([A-Z0-9]+)
Group 2 = match ID

Example: 02TP6B44GO000000VS5489BUVSPHI8RP
```

### Team ID

```
URL: /mannschaft/{slug}/-/saison/2526/team-id/{TEAM_ID}
Regex: /team-id/([^/\?#]+)
Group 1 = team ID

Example: 011MIBOCFK000000VTVG0001VTR8C1K7
```

### Player ID

```
URL: /spielerprofil/-/player-id/{PLAYER_ID}
     /spielerprofil/-/userid/{USER_ID}
Regex: /player-id/([^/\?#]+)

Example: 00LNS4THJ4000000VV0AG85VVVPI7ST7
```

---

## HTTP Headers

The following headers are required for successful requests. Without a
German `Accept-Language`, the site may return different content:

```python
{
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.fussball.de/",
}
```

---

## Rate Limiting & Robustness

- **Default request delay:** 1.5 seconds between all requests
- **Retry policy:** 3 attempts with exponential backoff (2 s → 4 s → 8 s)
- **HTTP 404:** treated as permanent failure (no retry), returns `None`
- **HTTP 429:** would require longer backoff (not yet observed in testing)
- **Session reuse:** `requests.Session` is shared across all requests to
  maintain cookies and HTTP connection pooling, mimicking real browser behavior

**Total request count for a full scrape:**

| Task | Requests |
|---|---|
| Standings | 1 |
| 26 matchdays | 26 |
| Top scorers | 1 |
| Match details (~182 played) | 182 × 2 (main page + ajax.match.course) |
| **Total** | **~392** |

Estimated duration at 1.5 s delay: **~10 minutes** for a full scrape.
Use `--resume` to continue interrupted runs without re-fetching saved files.

---

## Known Limitations

| Limitation | Reason | Workaround |
|---|---|---|
| Player names are `null` | Font-based obfuscation, JS-only decoding | Player profile URLs are captured |
| Scores not in matchday overview | Score spans obfuscated | Derived from match course goal count |
| Match dates not in matchday overview | Date spans obfuscated | Available on match detail page |
| `--match-details` is slow | ~182 × 2 requests needed | Use `--resume` flag |
| "Mehr laden" on top scorers not followed | Would require JS click simulation | Initial render contains all ~30 scorers |

---

## Data Quality Notes

- **Own goals:** Correctly identified via `div.row-event.own-goal` class and
  attributed to the scoring team (i.e. the team that benefits, not the player)
- **Yellow-red cards:** Use a different icon structure (`span.icon-stack`) than
  yellow/red cards (`<i>`) — both are handled separately
- **Preliminary matches:** Matchdays for future fixtures show team names and
  match IDs but no dates or scores. These are labeled `status: "scheduled"`
- **Obfuscation check:** Private-use Unicode characters (`\uE000`–`\uF8FF`)
  are filtered out of venue strings to avoid garbage in the output
