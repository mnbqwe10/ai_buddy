import { ensureAppState } from "../shared/storage";
import type { RuntimeMessage } from "../shared/messages";
import { createPromptRouter } from "./promptRouter";

const promptRouter = createPromptRouter();

const frameRuleUrls = [
  "https://chatgpt.com/*",
  "https://chat.openai.com/*",
  "https://claude.ai/*",
  "https://gemini.google.com/*",
  "https://chat.deepseek.com/*",
  "https://copilot.microsoft.com/*",
  "https://web.whatsapp.com/*",
  "https://web.telegram.org/*",
  "https://discord.com/*",
];

function platformFrameRules(): chrome.declarativeNetRequest.Rule[] {
  return frameRuleUrls.map((urlFilter, index) => ({
    id: index + 1,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
      responseHeaders: [
        {
          header: "content-security-policy",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
        {
          header: "x-frame-options",
          operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
        },
      ],
    },
    condition: {
      urlFilter,
      resourceTypes: [
        chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
        chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
      ],
    },
  }));
}

chrome.runtime.onInstalled.addListener(() => {
  ensureAppState();
  const rules = platformFrameRules();
  chrome.declarativeNetRequest.updateDynamicRules({
    addRules: rules,
    removeRuleIds: rules.map((rule) => rule.id),
  });
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-sidebar") {
    openSidePanel({ windowId: chrome.windows.WINDOW_ID_CURRENT });
  }
});

function reportUnexpectedSidePanelError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (!/sidePanel\.open\(\) may only be called in response to a user gesture/i.test(message)) {
    console.warn("[AI Buddy] Unable to open side panel", error);
  }
}

function openSidePanel(target: chrome.runtime.MessageSender | { windowId: number }) {
  const windowId = "windowId" in target
    ? target.windowId
    : target.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT;

  try {
    void chrome.sidePanel.open({ windowId }).catch(reportUnexpectedSidePanelError);
  } catch (error) {
    reportUnexpectedSidePanelError(error);
  }
}

chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  if (!message) {
    return;
  }

  if (message.type === "open-side-panel") {
    openSidePanel(sender);
    return;
  }

  if (message.type === "prompt-action-request") {
    const delivered = promptRouter.deliverPrompt(message.prompt);
    if (!delivered) {
      openSidePanel(sender);
    }
    sendResponse({ ok: true, delivered });
    return;
  }

  if (message.type === "claim-pending-prompt") {
    sendResponse({ prompt: promptRouter.claimPendingPrompt() });
  }
});

chrome.runtime.onConnect.addListener((port) => {
  promptRouter.connect(port);
});
