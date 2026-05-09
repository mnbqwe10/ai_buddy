const bridgeSource = "ai-buddy-copilot-bridge";

interface BridgeMessage {
  source?: string;
  type?: string;
  requestId?: string;
  promptText?: string;
  submit?: boolean;
}

type BridgeResult = { ok: true; mode: "sent" | "drafted" } | { ok: false; error: string };

const retryDelayMs = 250;
const maxInjectAttempts = 20;

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function findComposer(doc = document): HTMLElement | HTMLTextAreaElement | HTMLInputElement | null {
  const selectors = [
    "[data-testid='chat-input']",
    "#searchbox",
    "textarea[placeholder]",
    "[role='textbox']",
    ".ProseMirror",
    "[contenteditable='true']",
    "textarea",
  ];

  for (const selector of selectors) {
    const element = doc.querySelector<HTMLElement | HTMLTextAreaElement | HTMLInputElement>(selector);
    if (element && !("disabled" in element && element.disabled)) {
      return element;
    }
  }

  return null;
}

function buttonIsEnabled(button: HTMLButtonElement) {
  return !button.disabled && button.getAttribute("aria-disabled") !== "true";
}

function buttonLabel(button: HTMLButtonElement) {
  return `${button.getAttribute("aria-label") ?? ""} ${button.textContent ?? ""}`.trim().toLowerCase();
}

function findSendButton(doc = document): HTMLButtonElement | null {
  const directSelectors = [
    "button[data-testid='send-button']",
    "button[aria-label='Submit']",
    "button[aria-label='Send']",
    "button[aria-label='send']",
  ];

  for (const selector of directSelectors) {
    const button = doc.querySelector<HTMLButtonElement>(selector);
    if (button && buttonIsEnabled(button)) {
      return button;
    }
  }

  return (
    Array.from(doc.querySelectorAll<HTMLButtonElement>("button")).find((button) => {
      if (!buttonIsEnabled(button)) {
        return false;
      }

      return ["send", "submit", "send message", "send prompt"].includes(buttonLabel(button));
    }) ?? null
  );
}

function setNativeValue(element: HTMLTextAreaElement | HTMLInputElement, value: string) {
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

  if (descriptor?.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }
}

function dispatchInputEvent(target: HTMLElement | HTMLTextAreaElement | HTMLInputElement) {
  target.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      data: null,
      inputType: "insertText",
    }),
  );
}

function setComposerText(
  composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement,
  promptText: string,
) {
  composer.focus();

  if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) {
    setNativeValue(composer, promptText);
    dispatchInputEvent(composer);
    return true;
  }

  if (!composer.isContentEditable && !composer.hasAttribute("contenteditable")) {
    return false;
  }

  composer.textContent = "";

  const selection = window.getSelection();
  if (selection && document.createRange) {
    const range = document.createRange();
    range.selectNodeContents(composer);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  const inserted =
    typeof document.execCommand === "function" && document.execCommand("insertText", false, promptText);
  if (!inserted) {
    composer.textContent = promptText;
  }

  dispatchInputEvent(composer);
  return true;
}

function dispatchEnter(composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement) {
  return composer.dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
    }),
  );
}

function submitComposer(composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement) {
  const sendButton = findSendButton();
  if (sendButton) {
    sendButton.click();
    return true;
  }

  return dispatchEnter(composer);
}

export async function injectPrompt(promptText: string, submit: boolean): Promise<BridgeResult> {
  const composer = findComposer();
  if (!composer) {
    return { ok: false, error: "Copilot composer not found" };
  }

  if (!setComposerText(composer, promptText)) {
    return { ok: false, error: "Unable to populate Copilot composer" };
  }

  if (submit && !submitComposer(composer)) {
    return { ok: false, error: "Unable to submit Copilot prompt" };
  }

  return { ok: true, mode: submit ? "sent" : "drafted" };
}

async function injectPromptWithRetry(promptText: string, submit: boolean): Promise<BridgeResult> {
  let result = await injectPrompt(promptText, submit);
  for (let attempt = 1; !result.ok && attempt < maxInjectAttempts; attempt += 1) {
    await delay(retryDelayMs);
    result = await injectPrompt(promptText, submit);
  }

  return result;
}

async function handleBridgeMessage(event: MessageEvent) {
  const message = event.data as BridgeMessage;
  if (!message || message.source !== bridgeSource) {
    return;
  }

  const targetOrigin = event.origin || "*";
  const sourceWindow = event.source as Window | null;

  if (message.type === "bridge-ping") {
    sourceWindow?.postMessage({ source: bridgeSource, type: "bridge-ready" }, targetOrigin);
    return;
  }

  if (message.type !== "inject-prompt" || !message.requestId || !message.promptText) {
    return;
  }

  const result = await injectPromptWithRetry(message.promptText, Boolean(message.submit));
  sourceWindow?.postMessage(
    {
      source: bridgeSource,
      type: "inject-result",
      requestId: message.requestId,
      result,
    },
    targetOrigin,
  );
}

window.addEventListener("message", (event) => {
  void handleBridgeMessage(event);
});

window.parent.postMessage({ source: bridgeSource, type: "bridge-ready" }, "*");

export {};
