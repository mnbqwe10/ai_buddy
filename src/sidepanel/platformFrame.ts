const desktopFrameMinimumWidths: Record<string, number> = {
  whatsapp: 1120,
};

export function minimumFrameWidthForPlatform(platformId: string) {
  return desktopFrameMinimumWidths[platformId];
}

export function messageOriginForPlatformUrl(platformUrl: string) {
  return new URL(platformUrl).origin;
}
