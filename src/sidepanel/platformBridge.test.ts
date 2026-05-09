import { describe, expect, it } from "vitest";
import { bridgeSourceForPlatform } from "./platformBridge";

describe("platform bridge source", () => {
  it("uses a dedicated bridge source for Copilot", () => {
    expect(bridgeSourceForPlatform("copilot", "aiChat")).toBe("ai-buddy-copilot-bridge");
  });

  it("uses shared bridge sources for other platform types", () => {
    expect(bridgeSourceForPlatform("chatgpt", "aiChat")).toBe("ai-buddy-ai-chat-bridge");
    expect(bridgeSourceForPlatform("telegram", "messaging")).toBe("ai-buddy-messaging-bridge");
  });
});
