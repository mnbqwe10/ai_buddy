import {
  createDefaultAppState,
  createDefaultSettings,
  defaultActions,
  defaultPlatforms,
  defaultScenarios,
} from "./defaults";
import type { Action, ActionButtonStyle, ActionType, AppState, ChatPlatform, Scenario, UserSettings } from "./model";

function mergeById<T extends { id: string }>(current: T[] | undefined, defaults: T[]): T[] {
  const existing = Array.isArray(current) ? current : [];
  const existingIds = new Set(existing.map((item) => item.id));
  return [
    ...existing,
    ...defaults.filter((item) => !existingIds.has(item.id)).map((item) => structuredClone(item)),
  ];
}

function knownIds<T extends { id: string }>(items: T[]): Set<string> {
  return new Set(items.map((item) => item.id));
}

const actionTypes = new Set<ActionType>(["local", "prompt", "inputPrompt", "panel"]);
const actionButtonStyles = new Set<ActionButtonStyle>(["iconOnly", "iconText"]);
const legacyIconTextByName: Record<string, string> = {
  "Cp": "copy",
  "?": "question-mark",
  "Tr": "language",
  "Sm": "list-details",
  "Ask": "message-circle-question",
  "Rp": "message-reply",
  "Po": "sparkles",
  "Br": "bulb",
  "Vz": "chart-dots",
  "Nm": "tag",
  "Pr": "wand",
  copy: "copy",
  explain: "question-mark",
  translate: "language",
  summarize: "list-details",
  ask: "message-circle-question",
  reply: "message-reply",
  polish: "sparkles",
  brainstorm: "bulb",
  visualize: "chart-dots",
  name: "tag",
  prompt: "wand",
  "help-circle": "question-mark",
  languages: "language",
  list: "list-details",
  "message-circle": "message-circle-question",
  lightbulb: "bulb",
  shapes: "chart-dots",
  badge: "tag",
};

const legacyInstructionByActionId: Record<string, string> = {
  explain:
    "Explain the selected text in clear, simple language. Define important terms and briefly note why it matters.",
  translate:
    "Translate the selected text into the configured Translation Target Language. Preserve meaning, tone, and formatting.",
  summarize:
    "Start with a short summary, then list the key points. Preserve important names, dates, numbers, and decisions.",
  ask: "Answer the user's question using the selected text as context.",
  draftReply:
    "Draft a concise, professional reply. Do not invent facts, commitments, dates, prices, attachments, or approvals; use placeholders when information is missing.",
  polish:
    "Polish the selected text for clarity, grammar, flow, and professionalism while preserving meaning and avoiding new facts.",
  brainstorm: "Generate multiple creative directions or concepts from the selected text.",
  visualize:
    "Choose and produce the best supported visual format for the selected text. Use Mermaid, a chart spec, image idea, icon concept, SVG, or generation prompt as appropriate. If direct visual creation is unavailable, provide a high-quality generation prompt or specification.",
  nameIdeas:
    "If the selected text includes name candidates, compare them and recommend the best fit with reasoning. Otherwise, generate strong name, title, label, or tagline ideas.",
  makePrompt: "Turn the selected text into a strong prompt for image generation or design exploration.",
};

function normalizeActionIcon(rawIcon: unknown, fallbackIcon: string) {
  if (typeof rawIcon !== "string" || !rawIcon.trim()) {
    return fallbackIcon;
  }

  return legacyIconTextByName[rawIcon] ?? rawIcon.trim();
}

function normalizeActionInstruction(rawInstruction: unknown, fallback: Action, actionId: string) {
  if (typeof rawInstruction !== "string") {
    return fallback.instruction;
  }

  return rawInstruction === legacyInstructionByActionId[actionId]
    ? fallback.instruction
    : rawInstruction;
}

function normalizeAction(rawAction: Partial<Action>, defaultAction?: Action): Action {
  const fallback = defaultAction ?? defaultActions[1];
  const rawType = rawAction.type as ActionType | undefined;
  const id = typeof rawAction.id === "string" && rawAction.id.trim() ? rawAction.id : fallback.id;

  return {
    id,
    name: typeof rawAction.name === "string" && rawAction.name.trim() ? rawAction.name : fallback.name,
    type: rawType && actionTypes.has(rawType) ? rawType : fallback.type,
    icon: normalizeActionIcon(rawAction.icon, fallback.icon),
    iconSvg:
      typeof rawAction.iconSvg === "string" && rawAction.iconSvg.trim()
        ? rawAction.iconSvg
        : fallback.iconSvg,
    color: typeof rawAction.color === "string" && rawAction.color.trim() ? rawAction.color : fallback.color,
    instruction: normalizeActionInstruction(rawAction.instruction, fallback, id),
    config: rawAction.config ?? fallback.config,
    isBuiltIn: rawAction.isBuiltIn ?? fallback.isBuiltIn,
  };
}

function normalizeScenario(rawScenario: Partial<Scenario>, defaultScenario?: Scenario): Scenario {
  const fallback = defaultScenario ?? defaultScenarios[0];

  return {
    id: typeof rawScenario.id === "string" && rawScenario.id.trim() ? rawScenario.id : fallback.id,
    name: typeof rawScenario.name === "string" && rawScenario.name.trim() ? rawScenario.name : fallback.name,
    color:
      typeof rawScenario.color === "string" && rawScenario.color.trim()
        ? rawScenario.color
        : fallback.color,
    actionIds: Array.isArray(rawScenario.actionIds)
      ? rawScenario.actionIds.filter((actionId): actionId is string => typeof actionId === "string")
      : [...fallback.actionIds],
    isStarter: rawScenario.isStarter ?? fallback.isStarter,
  };
}

export function normalizeSettings(
  rawSettings: Partial<UserSettings> | undefined,
  scenarios: Scenario[],
  platforms: ChatPlatform[],
): UserSettings {
  const defaults = createDefaultSettings();
  const scenarioIds = knownIds(scenarios);
  const platformIds = knownIds(platforms);
  const candidate = rawSettings ?? {};

  return {
    activeScenarioId:
      typeof candidate.activeScenarioId === "string" && scenarioIds.has(candidate.activeScenarioId)
        ? candidate.activeScenarioId
        : defaults.activeScenarioId,
    activePlatformId:
      typeof candidate.activePlatformId === "string" && platformIds.has(candidate.activePlatformId)
        ? candidate.activePlatformId
        : defaults.activePlatformId,
    includePageUrl: false,
    responseLanguage:
      typeof candidate.responseLanguage === "string" && candidate.responseLanguage.trim()
        ? candidate.responseLanguage.trim()
        : defaults.responseLanguage,
    actionButtonStyle:
      candidate.actionButtonStyle && actionButtonStyles.has(candidate.actionButtonStyle)
        ? candidate.actionButtonStyle
        : defaults.actionButtonStyle,
    toolbarEnabled:
      typeof candidate.toolbarEnabled === "boolean"
        ? candidate.toolbarEnabled
        : defaults.toolbarEnabled,
    blockedSites: Array.isArray(candidate.blockedSites)
      ? candidate.blockedSites.filter((site): site is string => typeof site === "string")
      : defaults.blockedSites,
  };
}

export function normalizeAppState(rawState: Partial<AppState> | undefined): AppState {
  const defaults = createDefaultAppState();
  const state = rawState ?? {};
  const defaultScenariosById = new Map(defaultScenarios.map((scenario) => [scenario.id, scenario]));
  let scenarios = Array.isArray(state.scenarios) && state.scenarios.length > 0
    ? (state.scenarios as Partial<Scenario>[]).map((scenario) =>
        normalizeScenario(scenario, defaultScenariosById.get(scenario.id ?? "")),
      )
    : defaults.scenarios;
  const defaultActionsById = new Map(defaultActions.map((action) => [action.id, action]));
  const rawActions = Array.isArray(state.actions) ? (state.actions as Partial<Action>[]) : defaultActions;
  const actions = rawActions.map((action) => normalizeAction(action, defaultActionsById.get(action.id ?? "")));
  const platforms = Array.isArray(state.platforms) ? (state.platforms as ChatPlatform[]) : defaultPlatforms;

  if (scenarios.length === 0) {
    scenarios = [structuredClone(defaultScenarios[0])];
  }

  return {
    meta: {
      schemaVersion: 1,
      hasCompletedOnboarding:
        typeof state.meta?.hasCompletedOnboarding === "boolean"
          ? state.meta.hasCompletedOnboarding
          : defaults.meta.hasCompletedOnboarding,
    },
    scenarios,
    actions,
    platforms,
    settings: normalizeSettings(state.settings as Partial<UserSettings> | undefined, scenarios, platforms),
  };
}

export function restoreMissingDefaults(state: AppState): AppState {
  const scenarios = mergeById(state.scenarios, defaultScenarios);
  const actions = mergeById(state.actions, defaultActions);
  const platforms = mergeById(state.platforms, defaultPlatforms);

  return normalizeAppState({
    ...state,
    scenarios,
    actions,
    platforms,
  });
}

export function resetEverything(): AppState {
  return createDefaultAppState();
}

export function completeOnboarding(
  state: AppState,
  selectedScenarioId: string,
  selectedPlatformId: string,
): AppState {
  return normalizeAppState({
    ...state,
    meta: {
      ...state.meta,
      hasCompletedOnboarding: true,
    },
    settings: {
      ...state.settings,
      activeScenarioId: selectedScenarioId,
      activePlatformId: selectedPlatformId,
    },
  });
}
