const modifyHeaders = "modifyHeaders" as chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS;
const removeHeader = "remove" as chrome.declarativeNetRequest.HeaderOperation.REMOVE;
const setHeader = "set" as chrome.declarativeNetRequest.HeaderOperation.SET;
const mainFrame = "main_frame" as chrome.declarativeNetRequest.ResourceType.MAIN_FRAME;
const subFrame = "sub_frame" as chrome.declarativeNetRequest.ResourceType.SUB_FRAME;

const frameRuleUrls = [
  "https://chatgpt.com/*",
  "https://chat.openai.com/*",
  "https://claude.ai/*",
  "https://gemini.google.com/*",
  "https://chat.deepseek.com/*",
  "https://copilot.microsoft.com/*",
  "https://web.whatsapp.com/*",
  "https://web.telegram.org/*",
  "https://discord.com/*",
];

const frameResponseHeaders: chrome.declarativeNetRequest.ModifyHeaderInfo[] = [
  {
    header: "content-security-policy",
    operation: removeHeader,
  },
  {
    header: "x-frame-options",
    operation: removeHeader,
  },
];

const whatsappFrameRequestHeaders: chrome.declarativeNetRequest.ModifyHeaderInfo[] = [
  {
    header: "Sec-Fetch-Dest",
    operation: setHeader,
    value: "document",
  },
  {
    header: "Sec-Fetch-Site",
    operation: setHeader,
    value: "none",
  },
  {
    header: "Host",
    operation: setHeader,
    value: "web.whatsapp.com",
  },
];

function sharedFrameRules(): chrome.declarativeNetRequest.Rule[] {
  return frameRuleUrls.map((urlFilter, index) => ({
    id: index + 1,
    priority: 1,
    action: {
      type: modifyHeaders,
      responseHeaders: frameResponseHeaders,
    },
    condition: {
      urlFilter,
      resourceTypes: [mainFrame, subFrame],
    },
  }));
}

function whatsappFrameRule(): chrome.declarativeNetRequest.Rule {
  return {
    id: 100,
    priority: 2,
    action: {
      type: modifyHeaders,
      requestHeaders: whatsappFrameRequestHeaders,
      responseHeaders: frameResponseHeaders,
    },
    condition: {
      urlFilter: "https://web.whatsapp.com/*",
      resourceTypes: [subFrame],
    },
  };
}

export function platformFrameRules(): chrome.declarativeNetRequest.Rule[] {
  return [...sharedFrameRules(), whatsappFrameRule()];
}
