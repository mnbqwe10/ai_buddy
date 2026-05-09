// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { injectPrompt } from "./copilotBridge";

describe("Copilot bridge", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("uses Copilot-specific composer and submit selectors", async () => {
    const composer = document.createElement("textarea");
    composer.dataset.testid = "chat-input";
    const submitButton = document.createElement("button");
    submitButton.setAttribute("aria-label", "Submit");
    const clickSubmit = vi.fn();
    submitButton.addEventListener("click", clickSubmit);

    document.body.append(composer, submitButton);

    const result = await injectPrompt("Ask Copilot", true);

    expect(result).toEqual({ ok: true, mode: "sent" });
    expect(composer.value).toBe("Ask Copilot");
    expect(clickSubmit).toHaveBeenCalledTimes(1);
  });

  it("falls back to the searchbox composer", async () => {
    const composer = document.createElement("textarea");
    composer.id = "searchbox";
    document.body.append(composer);

    const result = await injectPrompt("Draft Copilot", false);

    expect(result).toEqual({ ok: true, mode: "drafted" });
    expect(composer.value).toBe("Draft Copilot");
  });
});
