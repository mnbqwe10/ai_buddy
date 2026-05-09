import { describe, expect, it } from "vitest";
import { minimumFrameWidthForPlatform } from "./platformFrame";

describe("platform frame layout", () => {
  it("loads WhatsApp Web in a desktop-width frame", () => {
    expect(minimumFrameWidthForPlatform("whatsapp")).toBe(860);
  });

  it("does not force a desktop-width frame for other platforms", () => {
    expect(minimumFrameWidthForPlatform("telegram")).toBeUndefined();
    expect(minimumFrameWidthForPlatform("chatgpt")).toBeUndefined();
  });
});
