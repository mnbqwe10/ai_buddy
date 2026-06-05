import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
        expect.objectContaining({
          action: expect.objectContaining({
            responseHeaders: expect.arrayContaining([
              { header: "content-security-policy", operation: "remove" },
              { header: "x-frame-options", operation: "remove" },
            ]),
          }),
          condition: expect.objectContaining({
            urlFilter: "https://m365.cloud.microsoft/*",
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

  it("ships a static Telegram frame rule before the background worker starts", () => {
    const root = process.cwd();
    const manifest = JSON.parse(readFileSync(resolve(root, "public/manifest.json"), "utf8"));
    const ruleset = manifest.declarative_net_request.rule_resources.find(
      (resource: { id: string }) => resource.id === "platform_frame_rules",
    );
    const rules = JSON.parse(readFileSync(resolve(root, "public", ruleset.path), "utf8"));

    expect(ruleset).toMatchObject({
      enabled: true,
      path: "platform-frame-rules.json",
    });
    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: expect.objectContaining({
            responseHeaders: expect.arrayContaining([
              { header: "content-security-policy", operation: "remove" },
              { header: "x-frame-options", operation: "remove" },
            ]),
          }),
          condition: {
            urlFilter: "https://web.telegram.org/*",
            resourceTypes: ["sub_frame"],
          },
        }),
      ]),
    );
  });
});
