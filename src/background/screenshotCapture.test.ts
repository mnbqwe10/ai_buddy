import { describe, expect, it } from "vitest";
import { viewportRegionToImageCrop } from "./screenshotCapture";

describe("screenshot capture crop math", () => {
  it("scales viewport coordinates into image pixels", () => {
    expect(
      viewportRegionToImageCrop(
        {
          x: 100,
          y: 50,
          width: 200,
          height: 100,
          viewportWidth: 800,
          viewportHeight: 600,
        },
        1600,
        1200,
      ),
    ).toEqual({ x: 200, y: 100, width: 400, height: 200 });
  });

  it("handles reversed drag direction", () => {
    expect(
      viewportRegionToImageCrop(
        {
          x: 300,
          y: 180,
          width: -200,
          height: -100,
          viewportWidth: 800,
          viewportHeight: 600,
        },
        1600,
        1200,
      ),
    ).toEqual({ x: 200, y: 160, width: 400, height: 200 });
  });

  it("rejects zero-size regions", () => {
    expect(
      viewportRegionToImageCrop(
        {
          x: 100,
          y: 50,
          width: 0,
          height: 100,
          viewportWidth: 800,
          viewportHeight: 600,
        },
        1600,
        1200,
      ),
    ).toBeNull();
  });
});
