import math


DEFAULT_MAX_GOALS = 6


def clamp(value, lo, hi):
    return max(lo, min(hi, value))


def blend_strength(split_strength, season_strength, sample_size, full_weight_matches=8):
    weight = clamp(sample_size / full_weight_matches, 0.0, 1.0)
    return (weight * split_strength) + ((1.0 - weight) * season_strength)


def get_form_factor(recent_goals_per_game, season_goals_per_game, lo=0.95, hi=1.05):
    if season_goals_per_game and season_goals_per_game > 0:
        return clamp(recent_goals_per_game / season_goals_per_game, lo, hi)
    return 1.0


def expected_goals(
    league_goal_base,
    attack_strength,
    defense_weakness,
    attack_form=1.0,
    defense_form=1.0,
    min_goals=0.35,
    max_goals=3.8,
):
    raw = league_goal_base * attack_strength * defense_weakness * attack_form * defense_form
    return clamp(raw, min_goals, max_goals)


def poisson_probability(expected_goals, goals):
    if goals < 0:
        return 0.0
    return math.exp(-expected_goals) * (expected_goals ** goals) / math.factorial(goals)


def goal_distribution(expected_goals, max_goals=DEFAULT_MAX_GOALS):
    exact = [poisson_probability(expected_goals, goals) for goals in range(max_goals)]
    tail = max(0.0, 1.0 - sum(exact))
    return exact + [tail]


def outcome_probabilities(xg_home, xg_away, max_goals=DEFAULT_MAX_GOALS):
    home_distribution = goal_distribution(xg_home, max_goals=max_goals)
    away_distribution = goal_distribution(xg_away, max_goals=max_goals)

    home_win = 0.0
    draw = 0.0
    away_win = 0.0

    for home_goals, home_prob in enumerate(home_distribution):
        for away_goals, away_prob in enumerate(away_distribution):
            joint_prob = home_prob * away_prob
            if home_goals > away_goals:
                home_win += joint_prob
            elif home_goals < away_goals:
                away_win += joint_prob
            else:
                draw += joint_prob

    total = home_win + draw + away_win
    if total <= 0:
        return 0.0, 1.0, 0.0
    return home_win / total, draw / total, away_win / total


def confidence_from_outcome_probabilities(home_win, draw, away_win):
    strongest = max(home_win, draw, away_win)
    if strongest >= 0.5:
        return "high"
    if strongest >= 0.4:
        return "medium"
    return "low"


def _scoreline_alignment(home_goals, away_goals, xg_edge):
    if xg_edge > 0:
        if home_goals > away_goals:
            return 2
        if home_goals == away_goals:
            return 1
        return 0
    if xg_edge < 0:
        if away_goals > home_goals:
            return 2
        if home_goals == away_goals:
            return 1
        return 0
    if home_goals == away_goals:
        return 2
    return 1


def choose_scoreline(xg_home, xg_away, max_goals=DEFAULT_MAX_GOALS):
    home_distribution = goal_distribution(xg_home, max_goals=max_goals)
    away_distribution = goal_distribution(xg_away, max_goals=max_goals)
    edge = 0
    if xg_home > xg_away:
        edge = 1
    elif xg_away > xg_home:
        edge = -1

    best_home = 0
    best_away = 0
    best_probability = -1.0
    best_total_goals = None
    best_alignment = None
    epsilon = 1e-12

    for home_goals, home_prob in enumerate(home_distribution):
        for away_goals, away_prob in enumerate(away_distribution):
            joint_prob = home_prob * away_prob
            total_goals = home_goals + away_goals
            alignment = _scoreline_alignment(home_goals, away_goals, edge)

            if joint_prob > best_probability + epsilon:
                best_home = home_goals
                best_away = away_goals
                best_probability = joint_prob
                best_total_goals = total_goals
                best_alignment = alignment
                continue

            if abs(joint_prob - best_probability) > epsilon:
                continue

            if total_goals < best_total_goals:
                best_home = home_goals
                best_away = away_goals
                best_total_goals = total_goals
                best_alignment = alignment
                continue

            if total_goals == best_total_goals and alignment > best_alignment:
                best_home = home_goals
                best_away = away_goals
                best_alignment = alignment
                continue

            if total_goals == best_total_goals and alignment == best_alignment:
                if home_goals < best_home or (home_goals == best_home and away_goals < best_away):
                    best_home = home_goals
                    best_away = away_goals

    return best_home, best_away
