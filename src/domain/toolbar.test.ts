import { describe, expect, it } from "vitest";
import { createDefaultAppState } from "./defaults";
import { getActiveScenario, getScenarioActions, getToolbarActions } from "./toolbar";

describe("toolbar action projection", () => {
  it("returns the active Scenario from settings", () => {
    const state = createDefaultAppState();
    state.settings.activeScenarioId = "creative";

    expect(getActiveScenario(state).name).toBe("Creative");
  });

  it("treats included Scenario Actions as visible toolbar Actions", () => {
    const state = createDefaultAppState();
    const learning = state.scenarios.find((scenario) => scenario.id === "learning")!;

    expect(getScenarioActions(state, learning).map((action) => action.id)).toEqual([
      "copy",
      "explain",
      "translate",
      "summarize",
      "ask",
    ]);
  });

  it("moves later Actions behind overflow after the direct Action limit", () => {
    const state = createDefaultAppState();
    const workplace = state.scenarios.find((scenario) => scenario.id === "workplace")!;
    const toolbarActions = getToolbarActions(state, workplace, 5);

    expect(toolbarActions.directActions.map((action) => action.id)).toEqual([
      "copy",
      "draftReply",
      "polish",
      "summarize",
      "translate",
    ]);
    expect(toolbarActions.overflowActions.map((action) => action.id)).toEqual(["ask"]);
  });
});
