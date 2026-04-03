import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { AppData, Scenario, ScoreOverride } from './types'

// ---- State ----

interface AppState {
  scenarios: Scenario[]
  activeScenarioId: string
  appData: AppData | null
  loading: boolean
  error: string | null
}

// ---- Actions ----

type Action =
  | { type: 'SET_DATA'; payload: AppData }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SCORE_OVERRIDE'; match_id: string; home_score: number; away_score: number }
  | { type: 'RESET_MATCH'; match_id: string }
  | { type: 'RESET_MATCHDAY'; matchday: number }
  | { type: 'RESET_ALL' }
  | { type: 'CREATE_SCENARIO'; name: string }
  | { type: 'SWITCH_SCENARIO'; id: string }
  | { type: 'DELETE_SCENARIO'; id: string }
  | { type: 'RENAME_SCENARIO'; id: string; name: string }
  | { type: 'IMPORT_SCENARIO'; scenario: Scenario }
  | { type: 'DUPLICATE_SCENARIO'; id: string }
  | { type: 'APPLY_BASELINE' }

// ---- Helpers ----

const LS_KEY = 'fu-ball-scenarios'

function makePrefillOverrides(appData: AppData): Record<string, ScoreOverride> {
  const overrides: Record<string, ScoreOverride> = {}
  for (const fixture of appData.fixtures) {
    if (fixture.status !== 'played') {
      const pred = appData.predictions[fixture.match_id]
      if (pred) {
        overrides[fixture.match_id] = {
          home_score: pred.home_score,
          away_score: pred.away_score,
        }
      }
    }
  }
  return overrides
}

function makeDefaultScenario(appData: AppData): Scenario {
  return {
    id: 'default',
    name: 'Standard',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    overrides: makePrefillOverrides(appData),
  }
}

function loadScenariosFromLS(): Scenario[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Scenario[]
  } catch {
    return null
  }
}

function saveScenariosToLS(scenarios: Scenario[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(scenarios))
  } catch {
    // ignore
  }
}

function updateActiveScenario(
  state: AppState,
  updater: (s: Scenario) => Scenario
): AppState {
  const scenarios = state.scenarios.map(s =>
    s.id === state.activeScenarioId ? updater(s) : s
  )
  return { ...state, scenarios }
}

// ---- Reducer ----

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_DATA': {
      const appData = action.payload
      // If we already have scenarios loaded from LS, keep them but ensure default exists
      if (state.scenarios.length === 0) {
        const defaultScenario = makeDefaultScenario(appData)
        return {
          ...state,
          appData,
          loading: false,
          scenarios: [defaultScenario],
          activeScenarioId: defaultScenario.id,
        }
      }
      return { ...state, appData, loading: false }
    }

    case 'SET_LOADING':
      return { ...state, loading: action.payload }

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }

    case 'SET_SCORE_OVERRIDE': {
      const { match_id, home_score, away_score } = action
      return updateActiveScenario(state, s => ({
        ...s,
        updated_at: new Date().toISOString(),
        overrides: {
          ...s.overrides,
          [match_id]: { home_score, away_score },
        },
      }))
    }

    case 'RESET_MATCH': {
      return updateActiveScenario(state, s => {
        const overrides = { ...s.overrides }
        delete overrides[action.match_id]
        return { ...s, updated_at: new Date().toISOString(), overrides }
      })
    }

    case 'RESET_MATCHDAY': {
      if (!state.appData) return state
      const matchIds = state.appData.fixtures
        .filter(f => f.matchday === action.matchday)
        .map(f => f.match_id)
      return updateActiveScenario(state, s => {
        const overrides = { ...s.overrides }
        for (const id of matchIds) delete overrides[id]
        return { ...s, updated_at: new Date().toISOString(), overrides }
      })
    }

    case 'RESET_ALL': {
      return updateActiveScenario(state, s => ({
        ...s,
        updated_at: new Date().toISOString(),
        overrides: {},
      }))
    }

    case 'CREATE_SCENARIO': {
      const newScenario: Scenario = {
        id: `scenario-${Date.now()}`,
        name: action.name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        overrides: state.appData ? makePrefillOverrides(state.appData) : {},
      }
      return {
        ...state,
        scenarios: [...state.scenarios, newScenario],
        activeScenarioId: newScenario.id,
      }
    }

    case 'SWITCH_SCENARIO':
      return { ...state, activeScenarioId: action.id }

    case 'DELETE_SCENARIO': {
      if (state.scenarios.length <= 1) return state
      const scenarios = state.scenarios.filter(s => s.id !== action.id)
      const activeScenarioId =
        state.activeScenarioId === action.id
          ? scenarios[0].id
          : state.activeScenarioId
      return { ...state, scenarios, activeScenarioId }
    }

    case 'RENAME_SCENARIO': {
      const scenarios = state.scenarios.map(s =>
        s.id === action.id
          ? { ...s, name: action.name, updated_at: new Date().toISOString() }
          : s
      )
      return { ...state, scenarios }
    }

    case 'IMPORT_SCENARIO': {
      // Avoid duplicate IDs
      const imported = { ...action.scenario, id: `scenario-${Date.now()}` }
      return {
        ...state,
        scenarios: [...state.scenarios, imported],
        activeScenarioId: imported.id,
      }
    }

    case 'DUPLICATE_SCENARIO': {
      const source = state.scenarios.find(s => s.id === action.id)
      if (!source) return state
      const clone: Scenario = {
        ...source,
        id: `scenario-${Date.now()}`,
        name: `${source.name} (Kopie)`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        overrides: { ...source.overrides },
      }
      return {
        ...state,
        scenarios: [...state.scenarios, clone],
        activeScenarioId: clone.id,
      }
    }

    case 'APPLY_BASELINE': {
      if (!state.appData) return state
      const overrides = makePrefillOverrides(state.appData)
      return updateActiveScenario(state, s => ({
        ...s,
        updated_at: new Date().toISOString(),
        overrides,
      }))
    }

    default:
      return state
  }
}

export function hasUnsavedChanges(
  activeScenario: Scenario | null,
  appData: AppData | null
): boolean {
  if (!activeScenario || !appData) return false
  const baseline = makePrefillOverrides(appData)
  const overrides = activeScenario.overrides
  const allKeys = new Set([...Object.keys(baseline), ...Object.keys(overrides)])
  for (const key of allKeys) {
    const b = baseline[key]
    const o = overrides[key]
    if (!b && o) return true
    if (b && !o) return true
    if (b && o && (b.home_score !== o.home_score || b.away_score !== o.away_score)) return true
  }
  return false
}

// ---- Context ----

const StateContext = createContext<AppState | null>(null)
const DispatchContext = createContext<React.Dispatch<Action> | null>(null)

const initialState: AppState = {
  scenarios: [],
  activeScenarioId: '',
  appData: null,
  loading: true,
  error: null,
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Try to load scenarios from localStorage on init
  const storedScenarios = loadScenariosFromLS()
  const init: AppState = storedScenarios
    ? {
        ...initialState,
        scenarios: storedScenarios,
        activeScenarioId: storedScenarios[0]?.id ?? '',
      }
    : initialState

  const [state, dispatch] = useReducer(reducer, init)

  // Persist scenarios whenever they change
  useEffect(() => {
    if (state.scenarios.length > 0) {
      saveScenariosToLS(state.scenarios)
    }
  }, [state.scenarios])

  return React.createElement(
    StateContext.Provider,
    { value: state },
    React.createElement(DispatchContext.Provider, { value: dispatch }, children)
  )
}

export function useAppState(): AppState {
  const ctx = useContext(StateContext)
  if (!ctx) throw new Error('useAppState must be used within AppProvider')
  return ctx
}

export function useAppDispatch(): React.Dispatch<Action> {
  const ctx = useContext(DispatchContext)
  if (!ctx) throw new Error('useAppDispatch must be used within AppProvider')
  return ctx
}

export function useActiveScenario(): Scenario | null {
  const { scenarios, activeScenarioId } = useAppState()
  return scenarios.find(s => s.id === activeScenarioId) ?? null
}
