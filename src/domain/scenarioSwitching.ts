import type { AppState } from "./model";
import { getActiveScenario } from "./toolbar";

export function nextScenarioId(state: AppState, direction: -1 | 1 = 1) {
  if (state.scenarios.length === 0) {
    return state.settings.activeScenarioId;
  }

  const activeScenario = getActiveScenario(state);
  const activeIndex = state.scenarios.findIndex((scenario) => scenario.id === activeScenario.id);
  const normalizedIndex = activeIndex >= 0 ? activeIndex : 0;
  const nextIndex = (normalizedIndex + direction + state.scenarios.length) % state.scenarios.length;

  return state.scenarios[nextIndex].id;
}
