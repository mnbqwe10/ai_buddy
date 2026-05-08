// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { injectPrompt } from "./aiChatBridge";

describe("AI chat bridge", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("waits for the send button to become enabled after drafting the prompt", async () => {
    const composer = document.createElement("textarea");
    composer.id = "prompt-textarea";
    const sendButton = document.createElement("button");
    sendButton.dataset.testid = "send-button";
    sendButton.disabled = true;

    const clickSend = vi.fn();
    sendButton.addEventListener("click", clickSend);
    composer.addEventListener("input", () => {
      window.setTimeout(() => {
        sendButton.disabled = false;
      }, 25);
    });

    document.body.append(composer, sendButton);

    const result = await injectPrompt("Second prompt", true);

    expect(result).toEqual({ ok: true, mode: "sent" });
    expect(composer.value).toBe("Second prompt");
    expect(clickSend).toHaveBeenCalledTimes(1);
  });
});
