import type { PromptImageAttachment, ScreenshotCaptureRegion } from "../shared/messages";

export interface ImageCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function viewportRegionToImageCrop(
  region: ScreenshotCaptureRegion,
  imageWidth: number,
  imageHeight: number,
): ImageCrop | null {
  if (
    region.viewportWidth <= 0 ||
    region.viewportHeight <= 0 ||
    imageWidth <= 0 ||
    imageHeight <= 0 ||
    region.width === 0 ||
    region.height === 0
  ) {
    return null;
  }

  const left = clamp(Math.min(region.x, region.x + region.width), 0, region.viewportWidth);
  const right = clamp(Math.max(region.x, region.x + region.width), 0, region.viewportWidth);
  const top = clamp(Math.min(region.y, region.y + region.height), 0, region.viewportHeight);
  const bottom = clamp(Math.max(region.y, region.y + region.height), 0, region.viewportHeight);

  if (right - left < 1 || bottom - top < 1) {
    return null;
  }

  const scaleX = imageWidth / region.viewportWidth;
  const scaleY = imageHeight / region.viewportHeight;
  const x = Math.floor(left * scaleX);
  const y = Math.floor(top * scaleY);
  const width = Math.max(1, Math.ceil(right * scaleX) - x);
  const height = Math.max(1, Math.ceil(bottom * scaleY) - y);

  return {
    x,
    y,
    width: Math.min(width, imageWidth - x),
    height: Math.min(height, imageHeight - y),
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

async function blobToDataUrl(blob: Blob) {
  return `data:${blob.type || "image/png"};base64,${arrayBufferToBase64(await blob.arrayBuffer())}`;
}

export async function cropScreenshotDataUrl(
  screenshotDataUrl: string,
  region: ScreenshotCaptureRegion,
): Promise<PromptImageAttachment> {
  const sourceBlob = await fetch(screenshotDataUrl).then((response) => response.blob());
  const sourceImage = await createImageBitmap(sourceBlob);
  const crop = viewportRegionToImageCrop(region, sourceImage.width, sourceImage.height);

  if (!crop) {
    sourceImage.close();
    throw new Error("Screenshot region is empty.");
  }

  const canvas = new OffscreenCanvas(crop.width, crop.height);
  const context = canvas.getContext("2d");
  if (!context) {
    sourceImage.close();
    throw new Error("Unable to prepare screenshot crop.");
  }

  context.drawImage(
    sourceImage,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );
  sourceImage.close();

  const blob = await canvas.convertToBlob({ type: "image/png" });

  return {
    id: `screenshot-${Date.now()}`,
    kind: "image",
    mimeType: "image/png",
    fileName: "ai-buddy-screenshot.png",
    dataUrl: await blobToDataUrl(blob),
    width: crop.width,
    height: crop.height,
  };
}
