import { describe, expect, it } from "vitest";
import {
  createDefaultAppState,
  defaultGlobalSystemPrompt,
  defaultActions,
  defaultPlatformId,
  defaultScenarioId,
  defaultScenarios,
  defaultTranslationTargetLanguage,
  transformActionIds,
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
    expect(state.settings.globalSystemPrompt).toBe(defaultGlobalSystemPrompt);
    expect(state.settings.pinnedActionIds).toEqual([]);
    expect(state.settings.includePageUrl).toBe(false);
    expect(state.settings.actionButtonStyle).toBe("iconText");
    expect(state.meta.hasCompletedOnboarding).toBe(false);
    expect(state.scenarios.map((scenario) => [scenario.id, scenario.color])).toEqual([
      ["learning", "#2563EB"],
      ["workplace", "#059669"],
      ["creative", "#DB2777"],
      ["research", "#0F766E"],
      ["writing", "#4F46E5"],
      ["coding", "#334155"],
      ["marketingSales", "#BE123C"],
      ["customerSupport", "#0284C7"],
      ["dataAnalysis", "#2563EB"],
      ["planning", "#059669"],
    ]);
    expect(state.scenarios).toHaveLength(10);
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
    expect(state.platforms.find((platform) => platform.id === "copilot")).toMatchObject({
      name: "Microsoft Copilot",
      url: "https://copilot.microsoft.com/",
      hostPattern: "https://copilot.microsoft.com/*",
      sendBehavior: "autoSubmit",
    });
    expect(state.actions.find((action) => action.id === "translate")?.config?.translationTargetLanguage).toBe(
      defaultTranslationTargetLanguage,
    );
    expect(state.actions.find((action) => action.id === "explain")).toMatchObject({
      icon: "question-mark",
      color: "#2563EB",
    });
  });

  it("keeps every default Scenario wired to known default Actions", () => {
    const actionIds = new Set(defaultActions.map((action) => action.id));

    expect(defaultScenarios).toHaveLength(10);
    expect(defaultScenarios.flatMap((scenario) => scenario.actionIds)).toEqual(
      expect.arrayContaining(["researchBrief", "debugCode", "supportReply", "analyzeData", "actionPlan"]),
    );
    expect(defaultActions.map((action) => action.id)).toEqual(expect.arrayContaining(transformActionIds));
    expect(
      defaultScenarios.flatMap((scenario) =>
        scenario.actionIds.filter((actionId) => !actionIds.has(actionId)),
      ),
    ).toEqual([]);
  });

  it("normalizes invalid settings back to known defaults", () => {
    const state = createDefaultAppState();
    const settings = normalizeSettings(
      {
        activeScenarioId: "missing",
        activePlatformId: "missing",
        includePageUrl: true,
        responseLanguage: " Japanese ",
        globalSystemPrompt: "",
        pinnedActionIds: ["summarize", "summarize", "ask", 123 as unknown as string, "translate"],
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
    expect(settings.globalSystemPrompt).toBe(defaultGlobalSystemPrompt);
    expect(settings.pinnedActionIds).toEqual(["summarize", "ask", "translate"]);
    expect(settings.actionButtonStyle).toBe("iconOnly");
    expect(settings.toolbarEnabled).toBe(false);
    expect(settings.blockedSites).toEqual(["example.com"]);
  });

  it("trims custom global instructions", () => {
    const state = createDefaultAppState();
    const settings = normalizeSettings(
      {
        ...state.settings,
        globalSystemPrompt: " Use a warm tone. ",
      },
      state.scenarios,
      state.platforms,
    );

    expect(settings.globalSystemPrompt).toBe("Use a warm tone.");
  });

  it("refreshes built-in platform metadata from current defaults", () => {
    const state = createDefaultAppState();
    const legacy = normalizeAppState({
      ...state,
      platforms: state.platforms.map((platform) =>
        platform.id === "copilot"
          ? {
              ...platform,
              name: "Microsoft 365 Copilot",
              url: "https://m365.cloud.microsoft/chat",
              hostPattern: "https://m365.cloud.microsoft/*",
              sendBehavior: "draftOnly" as const,
            }
          : platform,
      ),
      settings: {
        ...state.settings,
        activePlatformId: "copilot",
      },
    });

    expect(legacy.platforms.find((platform) => platform.id === "copilot")).toMatchObject({
      name: "Microsoft Copilot",
      url: "https://copilot.microsoft.com/",
      hostPattern: "https://copilot.microsoft.com/*",
      sendBehavior: "draftOnly",
    });
    expect(legacy.settings.activePlatformId).toBe("copilot");
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
    expect(restored.scenarios.map((scenario) => scenario.id)).toEqual([
      "learning",
      "workplace",
      "creative",
      "research",
      "writing",
      "coding",
      "marketingSales",
      "customerSupport",
      "dataAnalysis",
      "planning",
    ]);
    expect(restored.actions.some((action) => action.id === "translate")).toBe(true);
    expect(restored.actions.some((action) => action.id === "researchBrief")).toBe(true);
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
