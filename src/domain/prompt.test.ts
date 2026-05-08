import { describe, expect, it } from "vitest";
import { createDefaultAppState } from "./defaults";
import { isLongSelection, longSelectionCharacterLimit, renderPrompt } from "./prompt";
import { resolveSendMode } from "./sendPolicy";

describe("prompt rendering", () => {
  it("renders selected text and page title without URL by default", () => {
    const state = createDefaultAppState();
    const explain = state.actions.find((action) => action.id === "explain")!;
    const rendered = renderPrompt(
      explain,
      {
        selectedText: "Revenue grew 18%",
        pageTitle: "Quarterly report",
      },
      state.settings,
    );

    expect(rendered.promptText).toContain("Revenue grew 18%");
    expect(rendered.promptText).toContain("Page title: Quarterly report");
    expect(rendered.promptText).not.toContain("https://example.com/private");
  });

  it("ignores page URL even when a legacy setting is enabled", () => {
    const state = createDefaultAppState();
    const explain = state.actions.find((action) => action.id === "explain")!;
    state.settings.includePageUrl = true;
    state.settings.responseLanguage = "Japanese";

    const rendered = renderPrompt(
      explain,
      {
        selectedText: "Revenue grew 18%",
        pageTitle: "Quarterly report",
      },
      state.settings,
    );

    expect(rendered.promptText).not.toContain("Page URL:");
    expect(rendered.promptText).not.toContain("https://example.com/report");
    expect(rendered.promptText).toContain("Respond in Japanese.");
  });

  it("renders Translate with the Translation Target Language", () => {
    const state = createDefaultAppState();
    const translate = state.actions.find((action) => action.id === "translate")!;
    const rendered = renderPrompt(
      translate,
      {
        selectedText: "hola",
        pageTitle: "Message",
      },
      state.settings,
    );

    expect(rendered.promptText).toContain("Translate the following text into English");
  });

  it("renders Ask user input without requiring a custom Input Prompt Action", () => {
    const state = createDefaultAppState();
    const ask = state.actions.find((action) => action.id === "ask")!;
    const rendered = renderPrompt(
      ask,
      {
        selectedText: "Revenue grew 18%",
        pageTitle: "Report",
        userInput: "What does this imply?",
      },
      state.settings,
    );

    expect(rendered.promptText).toContain("Question:\nWhat does this imply?");
  });

  it("flags selections above the long selection threshold", () => {
    expect(isLongSelection("a".repeat(longSelectionCharacterLimit))).toBe(false);
    expect(isLongSelection("a".repeat(longSelectionCharacterLimit + 1))).toBe(true);
  });

  it("renders Workplace guardrails for Draft Reply and Polish", () => {
    const state = createDefaultAppState();
    const draftReply = state.actions.find((action) => action.id === "draftReply")!;
    const polish = state.actions.find((action) => action.id === "polish")!;

    const replyPrompt = renderPrompt(
      draftReply,
      {
        selectedText: "Can you send the contract by Friday?",
        pageTitle: "Inbox",
      },
      state.settings,
    ).promptText;
    const polishPrompt = renderPrompt(
      polish,
      {
        selectedText: "please send thing soon",
        pageTitle: "Draft",
      },
      state.settings,
    ).promptText;

    expect(replyPrompt).toContain("Do not invent facts, commitments, dates, prices, attachments, or approvals");
    expect(polishPrompt).toContain("preserving meaning and avoiding new facts");
  });

  it("renders Creative action instructions for Visualize and Name Ideas", () => {
    const state = createDefaultAppState();
    const visualize = state.actions.find((action) => action.id === "visualize")!;
    const nameIdeas = state.actions.find((action) => action.id === "nameIdeas")!;

    const visualPrompt = renderPrompt(
      visualize,
      {
        selectedText: "A workflow for approving expenses",
        pageTitle: "Design notes",
      },
      state.settings,
    ).promptText;
    const namingPrompt = renderPrompt(
      nameIdeas,
      {
        selectedText: "Candidate names: QuickNote, NoteFlow, MemoPilot",
        pageTitle: "Naming notes",
      },
      state.settings,
    ).promptText;

    expect(visualPrompt).toContain("Mermaid");
    expect(visualPrompt).toContain("generation prompt");
    expect(namingPrompt).toContain("compare them and recommend the best fit");
  });
});

describe("send policy", () => {
  it("auto-submits to AI Chat Platforms", () => {
    const state = createDefaultAppState();
    const chatgpt = state.platforms.find((platform) => platform.id === "chatgpt")!;

    expect(resolveSendMode({ platform: chatgpt })).toBe("autoSubmit");
  });

  it("drafts on Messaging Platforms unless Auto-Send Lock is enabled", () => {
    const state = createDefaultAppState();
    const whatsapp = state.platforms.find((platform) => platform.id === "whatsapp")!;

    expect(resolveSendMode({ platform: whatsapp })).toBe("draftOnly");
    expect(
      resolveSendMode({
        platform: whatsapp,
        autoSendLockEnabled: true,
      }),
    ).toBe("autoSubmit");
  });
});
