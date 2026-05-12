import { describe, expect, it } from "vitest";
import { platformFrameRules } from "./platformFrameRules";

describe("platform frame rules", () => {
  it("keeps generic frame response header removal for supported platforms", () => {
    const rules = platformFrameRules();

    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: expect.objectContaining({
            responseHeaders: expect.arrayContaining([
              { header: "content-security-policy", operation: "remove" },
              { header: "x-frame-options", operation: "remove" },
            ]),
          }),
          condition: expect.objectContaining({
            urlFilter: "https://web.telegram.org/*",
            resourceTypes: ["main_frame", "sub_frame"],
          }),
        }),
      ]),
    );
  });

  it("loads WhatsApp subframes with document-style request metadata", () => {
    const whatsappRule = platformFrameRules().find((rule) => rule.id === 100);

    expect(whatsappRule).toMatchObject({
      priority: 2,
      action: {
        type: "modifyHeaders",
        requestHeaders: [
          { header: "Sec-Fetch-Dest", operation: "set", value: "document" },
          { header: "Sec-Fetch-Site", operation: "set", value: "none" },
          { header: "Host", operation: "set", value: "web.whatsapp.com" },
        ],
      },
      condition: {
        urlFilter: "https://web.whatsapp.com/*",
        resourceTypes: ["sub_frame"],
      },
    });
  });
});
