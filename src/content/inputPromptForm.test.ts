// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createInputPromptForm, focusInputPromptForm, setInputPromptFormVisible } from "./inputPromptForm";

describe("input prompt form", () => {
  it("submits trimmed input through the inline form", () => {
    const onSubmit = vi.fn();
    const form = createInputPromptForm({ onSubmit, onCancel: vi.fn() });
    document.body.appendChild(form);

    const input = form.querySelector<HTMLInputElement>(".ai-buddy-input");
    expect(input).not.toBeNull();
    input!.value = "  what matters here?  ";

    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));

    expect(onSubmit).toHaveBeenCalledWith("what matters here?");
  });

  it("does not submit an empty question", () => {
    const onSubmit = vi.fn();
    const form = createInputPromptForm({ onSubmit, onCancel: vi.fn() });

    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("hides, clears, and refocuses the native input", () => {
    const form = createInputPromptForm({ onSubmit: vi.fn(), onCancel: vi.fn() });
    document.body.appendChild(form);
    const input = form.querySelector<HTMLInputElement>(".ai-buddy-input");
    input!.value = "draft";

    setInputPromptFormVisible(form, true);
    expect(form.hidden).toBe(false);

    setInputPromptFormVisible(form, false, { clear: true });
    expect(form.hidden).toBe(true);
    expect(input!.value).toBe("");

    setInputPromptFormVisible(form, true);
    focusInputPromptForm(form);
    expect(document.activeElement).toBe(input);
  });

  it("cancels on Escape", () => {
    const onCancel = vi.fn();
    const form = createInputPromptForm({ onSubmit: vi.fn(), onCancel });
    const input = form.querySelector<HTMLInputElement>(".ai-buddy-input");

    input!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
