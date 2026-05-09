export function bridgeSourceForPlatform(platformId: string, platformType: string) {
  if (platformId === "copilot") {
    return "ai-buddy-copilot-bridge";
  }

  return platformType === "messaging"
    ? "ai-buddy-messaging-bridge"
    : "ai-buddy-ai-chat-bridge";
}
