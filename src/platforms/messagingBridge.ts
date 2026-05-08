const bridgeSource = "ai-buddy-messaging-bridge";

interface BridgeMessage {
  source?: string;
  type?: string;
  requestId?: string;
  promptText?: string;
  submit?: boolean;
}

function visible(element: Element) {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function findComposer(doc = document): HTMLElement | HTMLTextAreaElement | HTMLInputElement | null {
  const selectors = [
    "[role='textbox']",
    "[contenteditable='true']",
    "div[contenteditable='true']",
    "textarea",
    "input[type='text']",
  ];

  for (const selector of selectors) {
    const elements = Array.from(
      doc.querySelectorAll<HTMLElement | HTMLTextAreaElement | HTMLInputElement>(selector),
    ).filter(visible);
    const element = elements.at(-1);
    if (element && !("disabled" in element && element.disabled)) {
      return element;
    }
  }

  return null;
}

function setNativeValue(element: HTMLTextAreaElement | HTMLInputElement, value: string) {
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  descriptor?.set?.call(element, value);
}

function setComposerText(
  composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement,
  promptText: string,
) {
  composer.focus();

  if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) {
    setNativeValue(composer, promptText);
    composer.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: promptText }));
    return true;
  }

  if (composer.isContentEditable || composer.getAttribute("contenteditable") === "true") {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(composer);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
    const inserted = document.execCommand("insertText", false, promptText);
    if (!inserted) {
      composer.textContent = promptText;
    }
    composer.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: promptText }));
    return true;
  }

  return false;
}

function findSendButton(doc = document): HTMLButtonElement | null {
  const selectors = [
    "button[aria-label*='send' i]",
    "button[data-testid*='send' i]",
    "button[type='submit']",
  ];

  for (const selector of selectors) {
    const button = doc.querySelector<HTMLButtonElement>(selector);
    if (button && !button.disabled && visible(button)) {
      return button;
    }
  }

  return null;
}

function submitComposer(composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement) {
  const button = findSendButton();
  if (button) {
    button.click();
    return true;
  }

  composer.dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
    }),
  );
  return true;
}

function injectPrompt(promptText: string, submit: boolean) {
  const composer = findComposer();
  if (!composer) {
    return { ok: false, error: "Messaging composer not found" };
  }

  if (!setComposerText(composer, promptText)) {
    return { ok: false, error: "Unable to draft message" };
  }

  if (submit && !submitComposer(composer)) {
    return { ok: false, error: "Unable to send message" };
  }

  return { ok: true, mode: submit ? "sent" : "drafted" };
}

window.addEventListener("message", (event) => {
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

  const result = injectPrompt(message.promptText, Boolean(message.submit));
  sourceWindow?.postMessage(
    {
      source: bridgeSource,
      type: "inject-result",
      requestId: message.requestId,
      result,
    },
    targetOrigin,
  );
});

export {};
