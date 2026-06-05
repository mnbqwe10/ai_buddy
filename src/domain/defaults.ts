import type { Action, AppState, ChatPlatform, Scenario, UserSettings } from "./model";

export const appName = "AI Buddy";

export const defaultScenarioId = "learning";
export const defaultPlatformId = "chatgpt";
export const defaultPlatformName = "ChatGPT";
export const defaultTranslationTargetLanguage = "English";
export const defaultGlobalSystemPrompt =
  "Respond in English. Use a concise, friendly tone. Be clear, practical, and avoid inventing facts.";
export const transformActionIds = [
  "transformTweet",
  "transformTable",
  "transformMindMap",
  "transformMermaid",
  "transformChecklist",
  "transformQuiz",
  "transformFlashcards",
  "transformUserStory",
];

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
  {
    id: "researchBrief",
    name: "Research Brief",
    type: "prompt",
    icon: "search",
    color: "#0F766E",
    instruction:
      "Turn the selected material into a concise research brief. Identify the main question, key facts, supporting evidence, uncertainties, and 3 follow-up questions.\n\nMaterial:\n\"{{selected_text}}\"\n\nPage title: {{page_title}}",
    isBuiltIn: true,
  },
  {
    id: "extractInsights",
    name: "Extract Insights",
    type: "prompt",
    icon: "report-analytics",
    color: "#2563EB",
    instruction:
      "Extract the most important insights from the selected material. Group them as Findings, Evidence, Risks or caveats, and Next steps. Preserve important names, numbers, dates, and quotes.\n\nMaterial:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "compareOptions",
    name: "Compare Options",
    type: "prompt",
    icon: "chart-dots",
    color: "#7C3AED",
    instruction:
      "Compare the options, claims, viewpoints, or tradeoffs in the selected text. Use a compact table when useful, then recommend the strongest option if the evidence supports one.\n\nText:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "outline",
    name: "Outline",
    type: "prompt",
    icon: "file-text",
    color: "#4F46E5",
    instruction:
      "Create a clear outline from the selected text. Organize it into logical sections, include the main argument or purpose, and add concise bullet points under each section.\n\nText:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "rewrite",
    name: "Rewrite",
    type: "prompt",
    icon: "notes",
    color: "#0891B2",
    instruction:
      "Rewrite the selected text for clarity, flow, and readability. Preserve the original meaning, important details, and factual claims. Keep the result ready to use.\n\nText:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "explainCode",
    name: "Explain Code",
    type: "prompt",
    icon: "code",
    color: "#334155",
    instruction:
      "Explain what this code does. Cover the purpose, important inputs and outputs, control flow, dependencies, and any assumptions or edge cases visible in the snippet.\n\nCode:\n```text\n{{selected_text}}\n```",
    isBuiltIn: true,
  },
  {
    id: "debugCode",
    name: "Debug Code",
    type: "prompt",
    icon: "bug",
    color: "#DC2626",
    instruction:
      "Review this code or error text for likely bugs. Identify the root cause, explain why it happens, and suggest the smallest safe fix. If information is missing, state what to check next.\n\nCode or error:\n```text\n{{selected_text}}\n```",
    isBuiltIn: true,
  },
  {
    id: "writeTests",
    name: "Write Tests",
    type: "prompt",
    icon: "checklist",
    color: "#16A34A",
    instruction:
      "Suggest focused tests for the selected code or behavior. Cover the main success path, edge cases, and one regression case. Use the apparent language or framework when possible.\n\nContext:\n```text\n{{selected_text}}\n```",
    isBuiltIn: true,
  },
  {
    id: "documentCode",
    name: "Document Code",
    type: "prompt",
    icon: "file-text",
    color: "#475569",
    instruction:
      "Create concise developer documentation for the selected code. Explain what it is for, how to use it, important parameters or data shapes, and any gotchas.\n\nCode:\n```text\n{{selected_text}}\n```",
    isBuiltIn: true,
  },
  {
    id: "campaignIdeas",
    name: "Campaign Ideas",
    type: "prompt",
    icon: "bulb",
    color: "#DB2777",
    instruction:
      "Generate marketing campaign ideas from the selected text. Include audience, angle, key message, channel suggestions, and one practical next step for each idea.\n\nBrief:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "marketingCopy",
    name: "Marketing Copy",
    type: "prompt",
    icon: "target",
    color: "#BE123C",
    instruction:
      "Write concise marketing copy from the selected text. Produce a headline, short value proposition, 3 benefit bullets, and a clear call to action. Avoid unsupported claims.\n\nBrief:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "socialPost",
    name: "Social Post",
    type: "prompt",
    icon: "message",
    color: "#0D9488",
    instruction:
      "Turn the selected text into a social media post. Keep it specific, skimmable, and platform-neutral. Include one hook, the body copy, and 3 optional hashtags.\n\nText:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "salesEmail",
    name: "Sales Email",
    type: "prompt",
    icon: "mail",
    color: "#EA580C",
    instruction:
      "Draft a short sales email from the selected context. Include a relevant opener, a clear value proposition, one proof point or reason to believe, and a low-pressure call to action.\n\nContext:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "handleObjection",
    name: "Handle Objection",
    type: "prompt",
    icon: "user-question",
    color: "#A16207",
    instruction:
      "Prepare a thoughtful response to the objection or concern in the selected text. Acknowledge the concern, answer directly, avoid pressure, and suggest a practical next step.\n\nObjection or context:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "ticketSummary",
    name: "Ticket Summary",
    type: "prompt",
    icon: "clipboard-list",
    color: "#7C2D12",
    instruction:
      "Summarize this support ticket or conversation. Include the customer's issue, impact, steps already tried, likely cause if clear, and recommended next action.\n\nTicket:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "supportReply",
    name: "Support Reply",
    type: "prompt",
    icon: "headset",
    color: "#0284C7",
    instruction:
      "Draft a helpful customer support reply. Be empathetic, specific, and action-oriented. Do not promise outcomes, refunds, timelines, or policy exceptions unless they appear in the selected text.\n\nCustomer message:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "kbArticle",
    name: "KB Article",
    type: "prompt",
    icon: "file-text",
    color: "#6366F1",
    instruction:
      "Turn the selected support or product context into a knowledge base article. Include a clear title, when to use it, step-by-step instructions, and troubleshooting notes.\n\nContext:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "analyzeData",
    name: "Analyze Data",
    type: "prompt",
    icon: "chart-bar",
    color: "#2563EB",
    instruction:
      "Analyze the selected data or notes. Identify trends, outliers, possible explanations, and decisions the data supports. Call out limitations before making recommendations.\n\nData:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "makeTable",
    name: "Make Table",
    type: "prompt",
    icon: "table",
    color: "#0891B2",
    instruction:
      "Convert the selected text into a clean table. Choose useful column names, preserve important values, and add a short note for any assumptions or missing data.\n\nText:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "meetingNotes",
    name: "Meeting Notes",
    type: "prompt",
    icon: "notes",
    color: "#4F46E5",
    instruction:
      "Convert the selected meeting text into concise notes. Include decisions, action items with owners if available, open questions, and follow-up deadlines mentioned in the text.\n\nMeeting text:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "actionPlan",
    name: "Action Plan",
    type: "prompt",
    icon: "list-check",
    color: "#059669",
    instruction:
      "Turn the selected text into a practical action plan. List goals, next steps, owners or roles if available, dependencies, risks, and a sensible order of execution.\n\nContext:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "prioritize",
    name: "Prioritize",
    type: "prompt",
    icon: "checklist",
    color: "#CA8A04",
    instruction:
      "Prioritize the items in the selected text. Group them into Now, Next, and Later, explain the reasoning briefly, and call out anything blocked or missing.\n\nItems:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "transformTweet",
    name: "Tweet",
    type: "prompt",
    icon: "message",
    color: "#0D9488",
    instruction:
      "Transform the selected text into a concise social post suitable for X/Twitter. Include one strong hook, a clear body, and an optional short call to action. Keep it under 280 characters unless the content needs a thread.\n\nText:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "transformTable",
    name: "Table",
    type: "prompt",
    icon: "table",
    color: "#0891B2",
    instruction:
      "Transform the selected text into a clean Markdown table. Choose useful column names, preserve important values, and add a brief note for assumptions or missing data.\n\nText:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "transformMindMap",
    name: "Mind Map",
    type: "prompt",
    icon: "chart-dots",
    color: "#7C3AED",
    instruction:
      "Transform the selected text into a mind map. Use a concise hierarchical outline with a central topic, major branches, and short supporting nodes.\n\nText:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "transformMermaid",
    name: "Mermaid",
    type: "prompt",
    icon: "chart-dots",
    color: "#9333EA",
    instruction:
      "Transform the selected text into the most appropriate Mermaid diagram. Return only a fenced Mermaid code block plus a one-sentence note explaining the diagram type.\n\nText:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "transformChecklist",
    name: "Checklist",
    type: "prompt",
    icon: "list-check",
    color: "#059669",
    instruction:
      "Transform the selected text into an actionable checklist. Group related tasks, use checkbox Markdown, and include only tasks supported by the text.\n\nText:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "transformQuiz",
    name: "Quiz",
    type: "prompt",
    icon: "question-mark",
    color: "#EA580C",
    instruction:
      "Transform the selected text into a short quiz. Include 5 questions, answer choices when useful, and an answer key with brief explanations.\n\nText:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "transformFlashcards",
    name: "Flashcards",
    type: "prompt",
    icon: "notes",
    color: "#4F46E5",
    instruction:
      "Transform the selected text into flashcards. Use a two-column Markdown table with Front and Back columns, focusing on important terms, facts, and relationships.\n\nText:\n\"{{selected_text}}\"",
    isBuiltIn: true,
  },
  {
    id: "transformUserStory",
    name: "User Story",
    type: "prompt",
    icon: "user-question",
    color: "#BE123C",
    instruction:
      "Transform the selected text into product user stories. Use the format: As a <actor>, I want <feature>, so that <benefit>. Add acceptance criteria when the text supports them.\n\nText:\n\"{{selected_text}}\"",
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
  {
    id: "research",
    name: "Research",
    color: "#0F766E",
    actionIds: ["copy", "researchBrief", "extractInsights", "compareOptions", "summarize", "ask"],
    isStarter: true,
  },
  {
    id: "writing",
    name: "Writing",
    color: "#4F46E5",
    actionIds: ["copy", "outline", "rewrite", "polish", "summarize", "ask"],
    isStarter: true,
  },
  {
    id: "coding",
    name: "Coding",
    color: "#334155",
    actionIds: ["copy", "explainCode", "debugCode", "writeTests", "documentCode", "ask"],
    isStarter: true,
  },
  {
    id: "marketingSales",
    name: "Marketing & Sales",
    color: "#BE123C",
    actionIds: ["brainstorm", "campaignIdeas", "marketingCopy", "socialPost", "salesEmail", "handleObjection"],
    isStarter: true,
  },
  {
    id: "customerSupport",
    name: "Customer Support",
    color: "#0284C7",
    actionIds: ["ticketSummary", "supportReply", "kbArticle", "draftReply", "ask"],
    isStarter: true,
  },
  {
    id: "dataAnalysis",
    name: "Data Analysis",
    color: "#2563EB",
    actionIds: ["extractInsights", "analyzeData", "makeTable", "visualize", "ask"],
    isStarter: true,
  },
  {
    id: "planning",
    name: "Planning",
    color: "#059669",
    actionIds: ["meetingNotes", "actionPlan", "prioritize", "draftReply", "ask"],
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
    sendBehavior: "autoSubmit",
  },
  {
    id: "claude",
    name: "Claude",
    type: "aiChat",
    url: "https://claude.ai/new",
    hostPattern: "https://claude.ai/*",
    sendBehavior: "autoSubmit",
  },
  {
    id: "gemini",
    name: "Gemini",
    type: "aiChat",
    url: "https://gemini.google.com/app",
    hostPattern: "https://gemini.google.com/*",
    sendBehavior: "autoSubmit",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    type: "aiChat",
    url: "https://chat.deepseek.com/",
    hostPattern: "https://chat.deepseek.com/*",
    sendBehavior: "autoSubmit",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Web",
    type: "messaging",
    url: "https://web.whatsapp.com/",
    hostPattern: "https://web.whatsapp.com/*",
    sendBehavior: "draftOnly",
  },
  {
    id: "telegram",
    name: "Telegram Web",
    type: "messaging",
    url: "https://web.telegram.org/a/",
    hostPattern: "https://web.telegram.org/*",
    sendBehavior: "draftOnly",
  },
  {
    id: "discord",
    name: "Discord",
    type: "messaging",
    url: "https://discord.com/channels/@me",
    hostPattern: "https://discord.com/*",
    sendBehavior: "draftOnly",
  },
  {
    id: "copilot",
    name: "Microsoft Copilot",
    type: "aiChat",
    url: "https://copilot.microsoft.com/",
    hostPattern: "https://copilot.microsoft.com/*",
    sendBehavior: "autoSubmit",
  },
];

export function createDefaultSettings(): UserSettings {
  return {
    activeScenarioId: defaultScenarioId,
    activePlatformId: defaultPlatformId,
    includePageUrl: false,
    responseLanguage: "auto",
    globalSystemPrompt: defaultGlobalSystemPrompt,
    pinnedActionIds: [],
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
