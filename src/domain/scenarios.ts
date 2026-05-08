import { defaultScenarios } from "./defaults";
import type { ActionId, AppState, Scenario } from "./model";
import { normalizeAppState } from "./state";

const fallbackScenarioColor = "#64748B";

function uniqueId(base: string, existingIds: Set<string>) {
  const normalized = base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "scenario";

  let candidate = normalized;
  let index = 2;
  while (existingIds.has(candidate)) {
    candidate = `${normalized}-${index++}`;
  }
  return candidate;
}

function withNormalizedState(state: AppState, scenarios: Scenario[], activeScenarioId = state.settings.activeScenarioId) {
  return normalizeAppState({
    ...state,
    scenarios,
    settings: {
      ...state.settings,
      activeScenarioId,
    },
  });
}

export function createBlankScenario(state: AppState): AppState {
  const existingIds = new Set(state.scenarios.map((scenario) => scenario.id));
  const scenario: Scenario = {
    id: uniqueId("new-scenario", existingIds),
    name: "New Scenario",
    color: fallbackScenarioColor,
    actionIds: [],
  };

  return withNormalizedState(state, [...state.scenarios, scenario], scenario.id);
}

export function duplicateScenario(state: AppState, scenarioId: string): AppState {
  const source = state.scenarios.find((scenario) => scenario.id === scenarioId);
  if (!source) {
    return state;
  }

  const existingIds = new Set(state.scenarios.map((scenario) => scenario.id));
  const scenario: Scenario = {
    ...source,
    id: uniqueId(`${source.id}-copy`, existingIds),
    name: `${source.name} Copy`,
    isStarter: false,
  };

  return withNormalizedState(state, [...state.scenarios, scenario], scenario.id);
}

export function updateScenario(
  state: AppState,
  scenarioId: string,
  patch: Partial<Pick<Scenario, "name" | "color" | "actionIds">>,
): AppState {
  return withNormalizedState(
    state,
    state.scenarios.map((scenario) =>
      scenario.id === scenarioId
        ? {
            ...scenario,
            ...patch,
          }
        : scenario,
    ),
  );
}

export function deleteScenario(state: AppState, scenarioId: string): AppState {
  const remaining = state.scenarios.filter((scenario) => scenario.id !== scenarioId);

  if (remaining.length === 0) {
    const learning = structuredClone(defaultScenarios[0]);
    return withNormalizedState(state, [learning], learning.id);
  }

  const activeScenarioId =
    state.settings.activeScenarioId === scenarioId ? remaining[0].id : state.settings.activeScenarioId;

  return withNormalizedState(state, remaining, activeScenarioId);
}

export function moveScenario(state: AppState, scenarioId: string, direction: -1 | 1): AppState {
  const scenarios = [...state.scenarios];
  const index = scenarios.findIndex((scenario) => scenario.id === scenarioId);
  const nextIndex = index + direction;

  if (index < 0 || nextIndex < 0 || nextIndex >= scenarios.length) {
    return state;
  }

  const [scenario] = scenarios.splice(index, 1);
  scenarios.splice(nextIndex, 0, scenario);
  return withNormalizedState(state, scenarios);
}

export function addActionToScenario(state: AppState, scenarioId: string, actionId: ActionId): AppState {
  const scenario = state.scenarios.find((item) => item.id === scenarioId);
  if (!scenario || scenario.actionIds.includes(actionId)) {
    return state;
  }

  return updateScenario(state, scenarioId, {
    actionIds: [...scenario.actionIds, actionId],
  });
}

export function removeActionFromScenario(state: AppState, scenarioId: string, actionId: ActionId): AppState {
  const scenario = state.scenarios.find((item) => item.id === scenarioId);
  if (!scenario) {
    return state;
  }

  return updateScenario(state, scenarioId, {
    actionIds: scenario.actionIds.filter((id) => id !== actionId),
  });
}

export function moveScenarioAction(
  state: AppState,
  scenarioId: string,
  actionId: ActionId,
  direction: -1 | 1,
): AppState {
  const scenario = state.scenarios.find((item) => item.id === scenarioId);
  if (!scenario) {
    return state;
  }

  const actionIds = [...scenario.actionIds];
  const index = actionIds.indexOf(actionId);
  const nextIndex = index + direction;

  if (index < 0 || nextIndex < 0 || nextIndex >= actionIds.length) {
    return state;
  }

  const [id] = actionIds.splice(index, 1);
  actionIds.splice(nextIndex, 0, id);
  return updateScenario(state, scenarioId, { actionIds });
}
