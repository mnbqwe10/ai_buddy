import { ensureAppState } from "../shared/storage";
import type { RuntimeMessage } from "../shared/messages";
import { createPromptRouter } from "./promptRouter";
import { platformFrameRules } from "./platformFrameRules";

const promptRouter = createPromptRouter();

function installPlatformFrameRules() {
  const rules = platformFrameRules();
  void chrome.declarativeNetRequest
    .updateDynamicRules({
      addRules: rules,
      removeRuleIds: rules.map((rule) => rule.id),
    })
    .catch((error) => {
      console.warn("[AI Buddy] Unable to install platform frame rules", error);
    });
}

installPlatformFrameRules();

chrome.runtime.onInstalled.addListener(() => {
  ensureAppState();
  installPlatformFrameRules();
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
