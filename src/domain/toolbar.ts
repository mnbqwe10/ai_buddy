import type { Action, AppState, Scenario } from "./model";

export interface ToolbarActions {
  directActions: Action[];
  overflowActions: Action[];
}

export function getActiveScenario(state: AppState): Scenario {
  return (
    state.scenarios.find((scenario) => scenario.id === state.settings.activeScenarioId) ??
    state.scenarios[0]
  );
}

export function getScenarioActions(state: AppState, scenario: Scenario): Action[] {
  const actionsById = new Map(state.actions.map((action) => [action.id, action]));
  return scenario.actionIds
    .map((actionId) => actionsById.get(actionId))
    .filter((action): action is Action => Boolean(action));
}

function dedupeActions(actions: Action[]) {
  const seen = new Set<string>();
  return actions.filter((action) => {
    if (seen.has(action.id)) {
      return false;
    }

    seen.add(action.id);
    return true;
  });
}

export function getToolbarActions(
  state: AppState,
  scenario: Scenario = getActiveScenario(state),
  directActionLimit = 5,
): ToolbarActions {
  const actionsById = new Map(state.actions.map((action) => [action.id, action]));
  const pinnedActions = state.settings.pinnedActionIds
    .map((actionId) => actionsById.get(actionId))
    .filter((action): action is Action => Boolean(action));
  const actions = dedupeActions([...pinnedActions, ...getScenarioActions(state, scenario)]);

  return {
    directActions: actions.slice(0, directActionLimit),
    overflowActions: actions.slice(directActionLimit),
  };
}
