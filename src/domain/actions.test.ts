import { describe, expect, it } from "vitest";
import { createDefaultAppState } from "./defaults";
import {
  createCustomPromptAction,
  deleteAction,
  duplicateTranslateAction,
  getActionUsage,
  updateAction,
} from "./actions";

describe("Action Library management", () => {
  it("creates custom Prompt Actions from prompt templates", () => {
    const state = createCustomPromptAction(createDefaultAppState(), {
      name: "Make Friendlier",
      instruction: "Rewrite the selected text in a warmer tone.",
    });
    const action = state.actions.find((item) => item.id === "make-friendlier");

    expect(action?.type).toBe("prompt");
    expect(action?.instruction).toBe("Rewrite the selected text in a warmer tone.");
    expect(action?.color).toBe("#2563EB");
    expect(action?.icon).toBe("wand");
  });

  it("updates reusable Actions in place", () => {
    const state = updateAction(createDefaultAppState(), "explain", {
      name: "Explain Simply",
      icon: "bulb",
      iconSvg: "<path d=\"M1 1h2\" />",
      color: "#111111",
      instruction: "Explain this simply.",
    });
    const action = state.actions.find((item) => item.id === "explain");

    expect(action?.name).toBe("Explain Simply");
    expect(action?.icon).toBe("bulb");
    expect(action?.iconSvg).toBe("<path d=\"M1 1h2\" />");
    expect(action?.color).toBe("#111111");
    expect(action?.instruction).toBe("Explain this simply.");
  });

  it("duplicates Translate for additional targets", () => {
    const state = duplicateTranslateAction(createDefaultAppState(), "Japanese");
    const action = state.actions.find((item) => item.id === "translate-to-japanese");

    expect(action?.name).toBe("Translate to Japanese");
    expect(action?.config?.translationTargetLanguage).toBe("Japanese");
    expect(action?.isBuiltIn).toBe(false);
  });

  it("reports Action usage across Scenarios", () => {
    const state = createDefaultAppState();

    expect(getActionUsage(state, "translate").map((scenario) => scenario.id)).toEqual([
      "learning",
      "workplace",
    ]);
  });

  it("deletes shared Actions from the library and affected Scenarios", () => {
    const state = deleteAction(createDefaultAppState(), "translate");

    expect(state.actions.some((action) => action.id === "translate")).toBe(false);
    expect(state.scenarios.find((scenario) => scenario.id === "learning")?.actionIds).not.toContain("translate");
    expect(state.scenarios.find((scenario) => scenario.id === "workplace")?.actionIds).not.toContain("translate");
  });
});
