import type { Action, AppState, ChatPlatform, Scenario, UserSettings } from "./model";

export const appName = "AI Buddy";

export const defaultScenarioId = "learning";
export const defaultPlatformId = "chatgpt";
export const defaultPlatformName = "ChatGPT";
export const defaultTranslationTargetLanguage = "English";

export const defaultActions: Action[] = [
  {
    id: "copy",
    name: "Copy",
    type: "local",
    icon: "copy",
    color: "#475569",
    isBuiltIn: true,
  },
  {
    id: "explain",
    name: "Explain",
    type: "prompt",
    icon: "question-mark",
    color: "#2563EB",
    instruction:
      "Explain the following text in clear, simple language. Include a direct explanation, define any important terms, and briefly note why it matters in context.\n\nSelected text:\n\"{{selected_text}}\"\n\nPage title: {{page_title}}",
    isBuiltIn: true,
  },
  {
    id: "translate",
    name: "Translate",
    type: "prompt",
    icon: "language",
    color: "#0891B2",
    instruction:
      "Translate the following text into {{target_language}}. Preserve the original meaning, tone, and formatting. Do not add commentary unless a short clarification is needed to avoid ambiguity.\n\nText:\n\"{{selected_text}}\"",
    config: {
      translationTargetLanguage: defaultTranslationTargetLanguage,
    },
    isBuiltIn: true,
  },
  {
    id: "summarize",
    name: "Summarize",
    type: "prompt",
    icon: "list-details",
    color: "#7C3AED",
    instruction:
      "Summarize the following text. Start with a concise 1-2 sentence summary, then provide 3 bullet points with the key takeaways. Preserve important names, dates, numbers, and decisions.\n\nText:\n\"{{selected_text}}\"\n\nPage title: {{page_title}}",
    isBuiltIn: true,
  },
  {
    id: "ask",
    name: "Ask",
    type: "inputPrompt",
    icon: "message-circle-question",
    color: "#EA580C",
    instruction:
      "Answer the user's question using the selected text as context.\n\nQuestion:\n{{user_input}}\n\nSelected text:\n\"{{selected_text}}\"\n\nPage title: {{page_title}}",
    isBuiltIn: true,
  },
  {
    id: "draftReply",
    name: "Draft Reply",
    type: "prompt",
    icon: "message-reply",
    color: "#059669",
    instruction:
      "Draft a concise, professional reply to the selected message. Do not invent facts, commitments, dates, prices, attachments, or approvals; use placeholders when information is missing.\n\nMessage:\n\"{{selected_text}}\"\n\nPage title: {{page_title}}",
    isBuiltIn: true,
  },
  {
    id: "polish",
    name: "Polish",
    type: "prompt",
    icon: "sparkles",
    color: "#16A34A",
    instruction:
      "Polish the selected text for clarity, grammar, flow, and professionalism while preserving meaning and avoiding new facts.\n\nText:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "brainstorm",
    name: "Brainstorm",
    type: "prompt",
    icon: "bulb",
    color: "#DB2777",
    instruction:
      "Generate multiple creative directions or concepts from the selected text. Include varied options and briefly explain the strongest opportunities.\n\nText:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "visualize",
    name: "Visualize",
    type: "prompt",
    icon: "chart-dots",
    color: "#9333EA",
    instruction:
      "Choose and produce the best supported visual format for the selected text. Use Mermaid, a chart spec, image idea, icon concept, SVG, or generation prompt as appropriate. If direct visual creation is unavailable, provide a high-quality generation prompt or specification.\n\nText:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "nameIdeas",
    name: "Name Ideas",
    type: "prompt",
    icon: "tag",
    color: "#BE123C",
    instruction:
      "If the selected text includes name candidates, compare them and recommend the best fit with reasoning. Otherwise, generate strong name, title, label, or tagline ideas.\n\nText:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "makePrompt",
    name: "Make Prompt",
    type: "prompt",
    icon: "wand",
    color: "#A21CAF",
    instruction:
      "Turn the selected text into a strong prompt for image generation or design exploration. Make the prompt specific, visual, and easy to use in a creative AI tool.\n\nText:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
];

export const defaultScenarios: Scenario[] = [
  {
    id: "learning",
    name: "Learning",
    color: "#2563EB",
    actionIds: ["copy", "explain", "translate", "summarize", "ask"],
    isStarter: true,
  },
  {
    id: "workplace",
    name: "Workplace",
    color: "#059669",
    actionIds: ["copy", "draftReply", "polish", "summarize", "translate", "ask"],
    isStarter: true,
  },
  {
    id: "creative",
    name: "Creative",
    color: "#DB2777",
    actionIds: ["brainstorm", "visualize", "nameIdeas", "makePrompt", "ask"],
    isStarter: true,
  },
];

export const defaultPlatforms: ChatPlatform[] = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    type: "aiChat",
    url: "https://chatgpt.com/",
    hostPattern: "https://chatgpt.com/*",
  },
  {
    id: "claude",
    name: "Claude",
    type: "aiChat",
    url: "https://claude.ai/new",
    hostPattern: "https://claude.ai/*",
  },
  {
    id: "gemini",
    name: "Gemini",
    type: "aiChat",
    url: "https://gemini.google.com/app",
    hostPattern: "https://gemini.google.com/*",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    type: "aiChat",
    url: "https://chat.deepseek.com/",
    hostPattern: "https://chat.deepseek.com/*",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Web",
    type: "messaging",
    url: "https://web.whatsapp.com/",
    hostPattern: "https://web.whatsapp.com/*",
  },
  {
    id: "telegram",
    name: "Telegram Web",
    type: "messaging",
    url: "https://web.telegram.org/",
    hostPattern: "https://web.telegram.org/*",
  },
  {
    id: "discord",
    name: "Discord",
    type: "messaging",
    url: "https://discord.com/channels/@me",
    hostPattern: "https://discord.com/*",
  },
  {
    id: "copilot",
    name: "Microsoft Copilot",
    type: "aiChat",
    url: "https://copilot.microsoft.com/",
    hostPattern: "https://copilot.microsoft.com/*",
  },
];

export function createDefaultSettings(): UserSettings {
  return {
    activeScenarioId: defaultScenarioId,
    activePlatformId: defaultPlatformId,
    includePageUrl: false,
    responseLanguage: "auto",
    actionButtonStyle: "iconText",
    toolbarEnabled: true,
    blockedSites: [],
  };
}

export function createDefaultAppState(): AppState {
  return {
    meta: {
      schemaVersion: 1,
      hasCompletedOnboarding: false,
    },
    scenarios: structuredClone(defaultScenarios),
    actions: structuredClone(defaultActions),
    platforms: structuredClone(defaultPlatforms),
    settings: createDefaultSettings(),
  };
}
