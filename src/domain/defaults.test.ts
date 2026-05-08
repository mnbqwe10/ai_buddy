import { describe, expect, it } from "vitest";
import {
  createDefaultAppState,
  defaultPlatformId,
  defaultScenarioId,
  defaultTranslationTargetLanguage,
} from "./defaults";
import {
  completeOnboarding,
  normalizeAppState,
  normalizeSettings,
  resetEverything,
  restoreMissingDefaults,
} from "./state";

describe("starter defaults", () => {
  it("seeds the first-run Scenario, platform, colors, and language defaults", () => {
    const state = createDefaultAppState();

    expect(state.settings.activeScenarioId).toBe(defaultScenarioId);
    expect(state.settings.activePlatformId).toBe(defaultPlatformId);
    expect(state.settings.responseLanguage).toBe("auto");
    expect(state.settings.includePageUrl).toBe(false);
    expect(state.settings.actionButtonStyle).toBe("iconText");
    expect(state.meta.hasCompletedOnboarding).toBe(false);
    expect(state.scenarios.map((scenario) => [scenario.id, scenario.color])).toEqual([
      ["learning", "#2563EB"],
      ["workplace", "#059669"],
      ["creative", "#DB2777"],
    ]);
    expect(state.platforms.map((platform) => platform.id)).toEqual([
      "chatgpt",
      "claude",
      "gemini",
      "deepseek",
      "whatsapp",
      "telegram",
      "discord",
      "copilot",
    ]);
    expect(state.actions.find((action) => action.id === "translate")?.config?.translationTargetLanguage).toBe(
      defaultTranslationTargetLanguage,
    );
    expect(state.actions.find((action) => action.id === "explain")).toMatchObject({
      icon: "question-mark",
      color: "#2563EB",
    });
  });

  it("normalizes invalid settings back to known defaults", () => {
    const state = createDefaultAppState();
    const settings = normalizeSettings(
      {
        activeScenarioId: "missing",
        activePlatformId: "missing",
        includePageUrl: true,
        responseLanguage: " Japanese ",
        actionButtonStyle: "iconOnly",
        toolbarEnabled: false,
        blockedSites: ["example.com", 123 as unknown as string],
      },
      state.scenarios,
      state.platforms,
    );

    expect(settings.activeScenarioId).toBe("learning");
    expect(settings.activePlatformId).toBe("chatgpt");
    expect(settings.includePageUrl).toBe(false);
    expect(settings.responseLanguage).toBe("Japanese");
    expect(settings.actionButtonStyle).toBe("iconOnly");
    expect(settings.toolbarEnabled).toBe(false);
    expect(settings.blockedSites).toEqual(["example.com"]);
  });

  it("restores missing defaults without overwriting user edits", () => {
    const state = createDefaultAppState();
    const {
      color: _legacyColor,
      ...legacyAction
    } = {
      ...state.actions[0],
      name: "Copy Now",
    };
    const edited = normalizeAppState({
      ...state,
      scenarios: [
        {
          ...state.scenarios[0],
          name: "My Learning",
        },
      ],
      actions: [legacyAction as typeof state.actions[number]],
    });

    const restored = restoreMissingDefaults(edited);

    expect(restored.scenarios.find((scenario) => scenario.id === "learning")?.name).toBe("My Learning");
    expect(restored.actions.find((action) => action.id === "copy")?.name).toBe("Copy Now");
    expect(restored.actions.find((action) => action.id === "copy")?.color).toBe("#475569");
    expect(restored.scenarios.map((scenario) => scenario.id)).toEqual(["learning", "workplace", "creative"]);
    expect(restored.actions.some((action) => action.id === "translate")).toBe(true);
  });

  it("separates onboarding completion from destructive reset", () => {
    const state = createDefaultAppState();
    const completed = completeOnboarding(state, "creative", "claude");

    expect(completed.meta.hasCompletedOnboarding).toBe(true);
    expect(completed.settings.activeScenarioId).toBe("creative");
    expect(completed.settings.activePlatformId).toBe("claude");

    const reset = resetEverything();

    expect(reset.meta.hasCompletedOnboarding).toBe(false);
    expect(reset.settings.activeScenarioId).toBe("learning");
    expect(reset.settings.activePlatformId).toBe("chatgpt");
  });
});
