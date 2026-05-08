// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { shouldPreventToolbarMouseDown, targetIsNativeToolbarControl } from "./toolbarEvents";

describe("toolbar event policy", () => {
  it("allows native controls to keep their default mouse behavior", () => {
    const select = document.createElement("select");
    const input = document.createElement("input");

    expect(shouldPreventToolbarMouseDown(select)).toBe(false);
    expect(shouldPreventToolbarMouseDown(input)).toBe(false);
    expect(targetIsNativeToolbarControl(select)).toBe(true);
  });

  it("still prevents default mouse behavior for action buttons and non-control toolbar chrome", () => {
    const span = document.createElement("span");
    const button = document.createElement("button");

    expect(shouldPreventToolbarMouseDown(span)).toBe(true);
    expect(shouldPreventToolbarMouseDown(button)).toBe(true);
    expect(targetIsNativeToolbarControl(span)).toBe(false);
  });
});
