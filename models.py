from dataclasses import dataclass, field, asdict
from typing import Optional, List
import dataclasses


def to_dict(obj):
    """Recursively convert dataclass (or list thereof) to dict."""
    if dataclasses.is_dataclass(obj) and not isinstance(obj, type):
        return {k: to_dict(v) for k, v in dataclasses.asdict(obj).items()}
    if isinstance(obj, list):
        return [to_dict(i) for i in obj]
    return obj


@dataclass
class Match:
    match_id: str
    matchday: int
    home_team: str
    home_team_id: str
    away_team: str
    away_team_id: str
    home_score: Optional[int]
    away_score: Optional[int]
    date: Optional[str]
    time: Optional[str]
    status: str  # "played", "scheduled", "preliminary"
    detail_url: Optional[str] = None


@dataclass
class GoalEvent:
    minute: Optional[int]
    scorer: Optional[str]      # None if "k.A."
    team: str                  # "home", "away", or "unknown"
    goal_type: str             # "normal", "own_goal", "penalty"
    player_profile_url: Optional[str] = None


@dataclass
class CardEvent:
    minute: Optional[int]
    player: Optional[str]
    team: str
    card_type: str             # "yellow", "yellow_red", "red"
    player_profile_url: Optional[str] = None


@dataclass
class SubstitutionEvent:
    minute: Optional[int]
    player_out: str
    player_in: str
    team: str


@dataclass
class MatchDetail:
    match_id: str
    home_team: str
    away_team: str
    home_score: Optional[int]
    away_score: Optional[int]
    date: Optional[str]
    kickoff: Optional[str]
    venue: Optional[str]
    attendance: Optional[int]
    matchday: Optional[int] = None
    goals: List[GoalEvent] = field(default_factory=list)
    cards: List[CardEvent] = field(default_factory=list)
    substitutions: List[SubstitutionEvent] = field(default_factory=list)


@dataclass
class StandingsRow:
    position: int
    team: str
    team_id: str
    played: int
    wins: int
    draws: int
    losses: int
    goals_for: int
    goals_against: int
    goal_diff: int
    points: int


@dataclass
class TopScorer:
    rank: int
    player: str
    player_id: Optional[str]
    team: str
    goals: int


@dataclass
class Matchday:
    matchday_number: int
    matches: List[Match] = field(default_factory=list)
