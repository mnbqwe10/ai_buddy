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

    const sendButton = document.createElement("button");
    sendButton.setAttribute("aria-label", "Send Message");
    sendButton.disabled = true;
    markVisible(sendButton);

    const clickSend = vi.fn();
    const enterSend = vi.fn();
    sendButton.addEventListener("click", clickSend);
    composer.addEventListener("keydown", enterSend);
    composer.addEventListener("input", () => {
      window.setTimeout(() => {
        sendButton.disabled = false;
      }, 25);
    });

    document.body.append(composer, sendButton);

    const result = await injectPrompt("Send this to Telegram", true);

    expect(result).toEqual({ ok: true, mode: "sent" });
    expect(composer.textContent).toBe("Send this to Telegram");
    expect(clickSend).toHaveBeenCalledTimes(1);
    expect(enterSend).not.toHaveBeenCalled();
  });
});
