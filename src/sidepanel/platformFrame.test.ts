import { describe, expect, it } from "vitest";
import { messageOriginForPlatformUrl, minimumFrameWidthForPlatform } from "./platformFrame";

describe("platform frame layout", () => {
  it("loads WhatsApp Web in a desktop-width frame", () => {
    expect(minimumFrameWidthForPlatform("whatsapp")).toBe(1120);
  });

  it("does not force a desktop-width frame for other platforms", () => {
    expect(minimumFrameWidthForPlatform("telegram")).toBeUndefined();
    expect(minimumFrameWidthForPlatform("chatgpt")).toBeUndefined();
  });

  it("uses an origin, not a full path URL, for platform postMessage calls", () => {
    expect(messageOriginForPlatformUrl("https://gemini.google.com/app")).toBe("https://gemini.google.com");
    expect(messageOriginForPlatformUrl("https://copilot.microsoft.com/")).toBe("https://copilot.microsoft.com");
  });
});
