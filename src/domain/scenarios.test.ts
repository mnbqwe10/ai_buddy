import { describe, expect, it } from "vitest";
import { createDefaultAppState } from "./defaults";
import {
  addActionToScenario,
  createBlankScenario,
  deleteScenario,
  duplicateScenario,
  moveScenario,
  moveScenarioAction,
  removeActionFromScenario,
  updateScenario,
} from "./scenarios";

describe("Scenario management", () => {
  it("duplicates an existing Scenario and makes the copy active", () => {
    const state = duplicateScenario(createDefaultAppState(), "learning");

    expect(state.scenarios.map((scenario) => scenario.id)).toContain("learning-copy");
    expect(state.scenarios.find((scenario) => scenario.id === "learning-copy")?.actionIds).toEqual([
      "copy",
      "explain",
      "translate",
      "summarize",
      "ask",
    ]);
    expect(state.settings.activeScenarioId).toBe("learning-copy");
  });

  it("creates a blank Scenario as a secondary path", () => {
    const state = createBlankScenario(createDefaultAppState());
    const scenario = state.scenarios.find((item) => item.id === "new-scenario");

    expect(scenario?.name).toBe("New Scenario");
    expect(scenario?.actionIds).toEqual([]);
    expect(state.settings.activeScenarioId).toBe("new-scenario");
  });

  it("updates Scenario presentation and action references", () => {
    const state = updateScenario(createDefaultAppState(), "learning", {
      name: "Focused Learning",
      color: "#111111",
      actionIds: ["copy"],
    });
    const scenario = state.scenarios.find((item) => item.id === "learning");

    expect(scenario?.name).toBe("Focused Learning");
    expect(scenario?.color).toBe("#111111");
    expect(scenario?.actionIds).toEqual(["copy"]);
  });

  it("keeps at least one Scenario when deleting the last one", () => {
    const defaultState = createDefaultAppState();
    const singleScenarioState = {
      ...defaultState,
      scenarios: [defaultState.scenarios[1]],
      settings: {
        ...defaultState.settings,
        activeScenarioId: "workplace",
      },
    };

    const state = deleteScenario(singleScenarioState, "workplace");

    expect(state.scenarios).toHaveLength(1);
    expect(state.scenarios[0].id).toBe("learning");
    expect(state.settings.activeScenarioId).toBe("learning");
  });

  it("reorders Scenarios and Scenario Actions", () => {
    let state = moveScenario(createDefaultAppState(), "creative", -1);
    expect(state.scenarios.map((scenario) => scenario.id)).toEqual(["learning", "creative", "workplace"]);

    state = moveScenarioAction(state, "learning", "ask", -1);
    expect(state.scenarios.find((scenario) => scenario.id === "learning")?.actionIds).toEqual([
      "copy",
      "explain",
      "translate",
      "ask",
      "summarize",
    ]);
  });

  it("adds and removes Action references without duplicates", () => {
    let state = addActionToScenario(createDefaultAppState(), "learning", "polish");
    state = addActionToScenario(state, "learning", "polish");

    expect(state.scenarios.find((scenario) => scenario.id === "learning")?.actionIds.filter((id) => id === "polish")).toHaveLength(1);

    state = removeActionFromScenario(state, "learning", "polish");
    expect(state.scenarios.find((scenario) => scenario.id === "learning")?.actionIds).not.toContain("polish");
  });
});
