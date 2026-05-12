// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { injectPrompt } from "./messagingBridge";

function markVisible(element: HTMLElement) {
  element.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    width: 100,
    height: 24,
    top: 0,
    right: 100,
    bottom: 24,
    left: 0,
    toJSON: () => ({}),
  });
}

describe("messaging bridge", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("waits for a Telegram send button to become enabled after drafting", async () => {
    const composer = document.createElement("div");
    composer.setAttribute("role", "textbox");
    composer.setAttribute("contenteditable", "true");
    markVisible(composer);

    const sendButton = document.createElement("div");
    sendButton.setAttribute("role", "button");
    sendButton.setAttribute("title", "Send Message");
    sendButton.setAttribute("aria-disabled", "true");
    markVisible(sendButton);

    const clickSend = vi.fn();
    const enterSend = vi.fn();
    sendButton.addEventListener("click", () => {
      clickSend();
      composer.textContent = "";
    });
    composer.addEventListener("keydown", enterSend);
    composer.addEventListener("beforeinput", (event) => {
      const inputEvent = event as InputEvent;
      event.preventDefault();
      composer.textContent = inputEvent.data;
      window.setTimeout(() => {
        sendButton.setAttribute("aria-disabled", "false");
      }, 25);
    });

    document.body.append(composer, sendButton);

    const result = await injectPrompt("Send this to Telegram", true);

    expect(result).toEqual({ ok: true, mode: "sent" });
    expect(composer.textContent).toBe("");
    expect(clickSend).toHaveBeenCalledTimes(1);
    expect(enterSend).not.toHaveBeenCalled();
  });

  it("tries Enter when Telegram keeps the prompt after clicking send", async () => {
    const composer = document.createElement("div");
    composer.setAttribute("role", "textbox");
    composer.setAttribute("contenteditable", "true");
    markVisible(composer);

    const sendButton = document.createElement("button");
    sendButton.setAttribute("title", "Send Message");
    markVisible(sendButton);

    const clickSend = vi.fn();
    const enterSend = vi.fn();
    sendButton.addEventListener("click", clickSend);
    composer.addEventListener("keydown", (event) => {
      if ((event as KeyboardEvent).key === "Enter") {
        enterSend();
        composer.textContent = "";
      }
    });

    document.body.append(composer, sendButton);

    const result = await injectPrompt("Fallback through Enter", true);

    expect(result).toEqual({ ok: true, mode: "sent" });
    expect(clickSend).toHaveBeenCalled();
    expect(enterSend).toHaveBeenCalledTimes(1);
    expect(composer.textContent).toBe("");
  });

  it("does not click Telegram's recorder button while waiting for the real send state", async () => {
    const composer = document.createElement("div");
    composer.setAttribute("contenteditable", "true");
    composer.className = "input-message-input is-empty";
    markVisible(composer);

    const sendButton = document.createElement("button");
    sendButton.className = "btn-icon btn-send record";
    markVisible(sendButton);

    const clickSend = vi.fn(() => {
      composer.textContent = "";
    });
    sendButton.addEventListener("click", clickSend);
    composer.addEventListener("input", () => {
      window.setTimeout(() => {
        composer.className = "input-message-input";
        sendButton.className = "btn-icon btn-send";
      }, 25);
    });

    document.body.append(composer, sendButton);

    const result = await injectPrompt("Wait for text send", true);

    expect(result).toEqual({ ok: true, mode: "sent" });
    expect(clickSend).toHaveBeenCalledTimes(1);
    expect(composer.textContent).toBe("");
  });

  it("uses Telegram's real composer instead of the fake input mirror", async () => {
    const container = document.createElement("div");
    container.className = "input-message-container";

    const realComposer = document.createElement("div");
    realComposer.setAttribute("contenteditable", "true");
    realComposer.setAttribute("data-peer-id", "8738912168");
    realComposer.className = "input-message-input is-empty scrollable scrollable-y no-scrollbar";
    markVisible(realComposer);

    const fakeComposer = document.createElement("div");
    fakeComposer.setAttribute("contenteditable", "true");
    fakeComposer.className = "input-message-input is-empty scrollable scrollable-y no-scrollbar input-field-input-fake";
    markVisible(fakeComposer);

    const sendButton = document.createElement("button");
    sendButton.className = "btn-icon btn-send";
    markVisible(sendButton);
    sendButton.addEventListener("click", () => {
      realComposer.textContent = "";
    });

    container.append(realComposer, fakeComposer, sendButton);
    document.body.append(container);

    const result = await injectPrompt("Use the real Telegram composer", true);

    expect(result).toEqual({ ok: true, mode: "sent" });
    expect(fakeComposer.textContent).toBe("");
    expect(realComposer.textContent).toBe("");
  });

  it("dispatches a Discord-compatible Enter sequence when no send button exists", async () => {
    const composer = document.createElement("div");
    composer.setAttribute("role", "textbox");
    composer.setAttribute("contenteditable", "true");
    markVisible(composer);

    const enterEvents: string[] = [];
    for (const eventName of ["keydown", "keypress", "keyup"]) {
      composer.addEventListener(eventName, (event) => {
        enterEvents.push(`${event.type}:${(event as KeyboardEvent).key}`);
      });
    }

    document.body.append(composer);

    const result = await injectPrompt("Send this to Discord", true);

    expect(result).toEqual({ ok: true, mode: "sent" });
    expect(composer.textContent).toBe("Send this to Discord");
    expect(enterEvents).toEqual(["keydown:Enter", "keypress:Enter", "keyup:Enter"]);
  });
});
