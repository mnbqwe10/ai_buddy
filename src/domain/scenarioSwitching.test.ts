import { describe, expect, it } from "vitest";
import { createDefaultAppState } from "./defaults";
import { nextScenarioId } from "./scenarioSwitching";

describe("Scenario switching", () => {
  it("cycles to the next Scenario in configured order", () => {
    const state = createDefaultAppState();

    expect(nextScenarioId(state)).toBe("workplace");
  });

  it("wraps from the last Scenario to the first", () => {
    const state = createDefaultAppState();
    state.settings.activeScenarioId = state.scenarios.at(-1)!.id;

    expect(nextScenarioId(state)).toBe("learning");
  });

  it("cycles backward when requested", () => {
    const state = createDefaultAppState();

    expect(nextScenarioId(state, -1)).toBe("planning");
  });

  it("falls back to the first Scenario when the active Scenario is missing", () => {
    const state = createDefaultAppState();
    state.settings.activeScenarioId = "missing";

    expect(nextScenarioId(state)).toBe("workplace");
  });
});
