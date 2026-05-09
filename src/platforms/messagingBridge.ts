const bridgeSource = "ai-buddy-messaging-bridge";

interface BridgeMessage {
  source?: string;
  type?: string;
  requestId?: string;
  promptText?: string;
  submit?: boolean;
}

type BridgeResult = { ok: true; mode: "sent" | "drafted" } | { ok: false; error: string };

const sendButtonWaitMs = 3_000;
const sendButtonDiscoveryWaitMs = 250;
const sendButtonPollMs = 50;

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
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

  if (composer.isContentEditable || composer.hasAttribute("contenteditable")) {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(composer);
    selection?.removeAllRanges();
    selection?.addRange(range);
    const inserted =
      typeof document.execCommand === "function" && document.execCommand("insertText", false, promptText);
    if (!inserted || composer.textContent !== promptText) {
      composer.replaceChildren(document.createTextNode(promptText));
    }
    composer.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: promptText }));
    return true;
  }

  return false;
}

function buttonIsEnabled(button: HTMLButtonElement) {
  return (
    !button.disabled &&
    button.getAttribute("aria-disabled") !== "true" &&
    button.getAttribute("data-disabled") !== "true"
  );
}

function findSendButtonCandidates(doc = document): HTMLButtonElement[] {
  const selectors = [
    "button[aria-label*='send' i]",
    "button[title*='send' i]",
    "button[data-testid*='send' i]",
    "button[type='submit']",
    "button.btn-send",
    "button.Button.send",
  ];
  const candidates = new Set<HTMLButtonElement>();

  for (const selector of selectors) {
    for (const button of doc.querySelectorAll<HTMLButtonElement>(selector)) {
      candidates.add(button);
    }
  }

  return Array.from(candidates);
}

function findSendButton(doc = document): HTMLButtonElement | null {
  return findSendButtonCandidates(doc).find((button) => buttonIsEnabled(button) && visible(button)) ?? null;
}

async function waitForSendButton(doc = document) {
  const deadline = Date.now() + sendButtonWaitMs;
  const discoveryDeadline = Date.now() + sendButtonDiscoveryWaitMs;
  let sawCandidate = false;

  while (Date.now() <= deadline) {
    const candidates = findSendButtonCandidates(doc);
    sawCandidate = sawCandidate || candidates.length > 0;
    const button = candidates.find((candidate) => buttonIsEnabled(candidate) && visible(candidate)) ?? null;
    if (button) {
      return { button, sawCandidate };
    }

    if (!sawCandidate && Date.now() > discoveryDeadline) {
      return { button: null, sawCandidate };
    }

    await delay(sendButtonPollMs);
  }

  return { button: null, sawCandidate };
}

function dispatchEnter(composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement) {
  for (const type of ["keydown", "keypress", "keyup"]) {
    composer.dispatchEvent(
      new KeyboardEvent(type, {
        bubbles: true,
        cancelable: true,
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        charCode: type === "keypress" ? 13 : 0,
      }),
    );
  }
}

async function submitComposer(composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement) {
  const { button, sawCandidate } = await waitForSendButton();
  if (button) {
    button.click();
    return true;
  }

  if (sawCandidate) {
    return false;
  }

  dispatchEnter(composer);
  return true;
}

export async function injectPrompt(promptText: string, submit: boolean): Promise<BridgeResult> {
  const composer = findComposer();
  if (!composer) {
    return { ok: false, error: "Messaging composer not found" };
  }

  if (!setComposerText(composer, promptText)) {
    return { ok: false, error: "Unable to draft message" };
  }

  if (submit && !(await submitComposer(composer))) {
    return { ok: false, error: "Message drafted, but the send button was not ready." };
  }

  return { ok: true, mode: submit ? "sent" : "drafted" };
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

  const result = await injectPrompt(message.promptText, Boolean(message.submit));
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

export {};
