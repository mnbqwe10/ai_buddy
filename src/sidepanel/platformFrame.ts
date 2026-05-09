const desktopFrameMinimumWidths: Record<string, number> = {
  whatsapp: 860,
};

export function minimumFrameWidthForPlatform(platformId: string) {
  return desktopFrameMinimumWidths[platformId];
}
