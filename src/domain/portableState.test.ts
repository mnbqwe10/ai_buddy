import { describe, expect, it } from "vitest";
import { createDefaultAppState } from "./defaults";
import { createPortableAppState, parsePortableAppState, serializePortableAppState } from "./portableState";

describe("portable App State", () => {
  it("exports App State with a stable envelope", () => {
    const state = createDefaultAppState();
    const portable = createPortableAppState(state, "2026-05-24T00:00:00.000Z");

    expect(portable).toMatchObject({
      app: "AI Buddy",
      kind: "app-state-export",
      version: 1,
      exportedAt: "2026-05-24T00:00:00.000Z",
    });
    expect(portable.state.settings.activeScenarioId).toBe("learning");
  });

  it("round-trips exported settings through normalization", () => {
    const state = createDefaultAppState();
    state.settings.activeScenarioId = "coding";
    const imported = parsePortableAppState(serializePortableAppState(state));

    expect(imported.settings.activeScenarioId).toBe("coding");
    expect(imported.scenarios).toHaveLength(10);
  });

  it("rejects invalid JSON and non-AI Buddy files", () => {
    expect(() => parsePortableAppState("{nope")).toThrow("not valid JSON");
    expect(() => parsePortableAppState(JSON.stringify({ app: "Other" }))).toThrow("not an AI Buddy");
  });
});
