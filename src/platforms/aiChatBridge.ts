const bridgeSource = "ai-buddy-ai-chat-bridge";

interface BridgeMessage {
  source?: string;
  type?: string;
  requestId?: string;
  promptText?: string;
  submit?: boolean;
}

type BridgeResult = { ok: true; mode: "sent" | "drafted" } | { ok: false; error: string };

const sendButtonWaitMs = 3_000;
const sendButtonPollMs = 50;
const sendButtonSelectors = [
  "button[data-testid='send-button']",
  "button[aria-label='Send']",
  "button[aria-label*='send' i]",
  "button[type='submit']",
];

type SearchRoot = Document | ShadowRoot | Element;

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function querySelectorAllDeep<T extends Element>(root: SearchRoot, selector: string): T[] {
  const results = Array.from(root.querySelectorAll<T>(selector));

  for (const element of Array.from(root.querySelectorAll<Element>("*"))) {
    if (element.shadowRoot) {
      results.push(...querySelectorAllDeep<T>(element.shadowRoot, selector));
    }
  }

  return results;
}

function visible(element: Element) {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function findComposer(doc = document): HTMLElement | HTMLTextAreaElement | HTMLInputElement | null {
  const selectors = [
    "#prompt-textarea",
    "[data-placeholder='Ask anything']",
    "[aria-label='Enter a prompt here']",
    "[aria-label*='prompt' i]",
    "[aria-label*='message' i]",
    "[role='textbox'][contenteditable]",
    "[contenteditable='plaintext-only']",
    "[contenteditable='true']",
    "[contenteditable]",
    ".ProseMirror",
    "textarea",
  ];

  for (const selector of selectors) {
    const elements = querySelectorAllDeep<HTMLElement | HTMLTextAreaElement | HTMLInputElement>(doc, selector)
      .filter((candidate) => !("disabled" in candidate && candidate.disabled));
    const element = elements.filter(visible).at(-1) ?? elements.at(-1);
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

function dispatchTextInputEvent(
  element: HTMLElement | HTMLTextAreaElement | HTMLInputElement,
  type: "beforeinput" | "input",
  inputType: string,
  data: string,
) {
  const event = new InputEvent(type, {
    bubbles: true,
    cancelable: type === "beforeinput",
    inputType,
    data,
  });

  return element.dispatchEvent(event);
}

function setComposerText(
  composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement,
  promptText: string,
) {
  composer.focus();

  if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) {
    dispatchTextInputEvent(composer, "beforeinput", "insertText", promptText);
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

    const shouldInsert = dispatchTextInputEvent(composer, "beforeinput", "insertText", promptText);
    const inserted =
      shouldInsert &&
      typeof document.execCommand === "function" &&
      document.execCommand("insertText", false, promptText);
    if (!inserted || composer.textContent !== promptText) {
      composer.replaceChildren(document.createTextNode(promptText));
    }
    dispatchTextInputEvent(composer, "input", "insertText", promptText);
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

function buttonLabel(button: HTMLButtonElement) {
  return `${button.getAttribute("aria-label") ?? ""} ${button.textContent ?? ""}`.trim().toLowerCase();
}

function buttonLooksLikeSend(button: HTMLButtonElement) {
  const label = buttonLabel(button);
  return label === "send" || label.includes("send prompt");
}

function findSendButtonCandidates(doc = document): HTMLButtonElement[] {
  const candidates = new Set<HTMLButtonElement>();

  for (const selector of sendButtonSelectors) {
    for (const button of doc.querySelectorAll<HTMLButtonElement>(selector)) {
      candidates.add(button);
    }
  }

  for (const button of doc.querySelectorAll<HTMLButtonElement>("button")) {
    if (buttonLooksLikeSend(button)) {
      candidates.add(button);
    }
  }

  return Array.from(candidates);
}

function findSendButton(doc = document): HTMLButtonElement | null {
  return findSendButtonCandidates(doc).find(buttonIsEnabled) ?? null;
}

async function waitForSendButton(doc = document) {
  const deadline = Date.now() + sendButtonWaitMs;

  while (Date.now() <= deadline) {
    const button = findSendButton(doc);
    if (button) {
      return button;
    }

    await delay(sendButtonPollMs);
  }

  return null;
}

function dispatchEnter(composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement) {
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
}

async function submitComposer(composer: HTMLElement | HTMLTextAreaElement | HTMLInputElement) {
  const button = await waitForSendButton();
  if (button) {
    button.click();
    return true;
  }

  if (findSendButtonCandidates().length > 0) {
    return false;
  }

  dispatchEnter(composer);
  return true;
}

export async function injectPrompt(promptText: string, submit: boolean): Promise<BridgeResult> {
  const composer = findComposer();
  if (!composer) {
    return { ok: false, error: "Composer not found" };
  }

  if (!setComposerText(composer, promptText)) {
    return { ok: false, error: "Unable to draft prompt" };
  }

  if (submit && !(await submitComposer(composer))) {
    return { ok: false, error: "Prompt drafted, but the send button was not ready." };
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
