# AI Buddy

AI Buddy is a Chrome extension that adds a selection toolbar for sending selected page text to an AI chat platform. It opens the platform in Chrome's side panel and uses reusable scenario actions such as Explain, Translate, Summarize, Draft Reply, Polish, Brainstorm, and Visualize.

## Install Locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build the extension:

   ```bash
   npm run build
   ```

3. Open Chrome and go to `chrome://extensions`.
4. Enable **Developer mode**.
5. Click **Load unpacked** and choose the `dist/` folder.
6. Pin **AI Buddy** from the Chrome extensions menu for quick access.

## Start Using

1. Open the AI Buddy popup.
2. Choose an active **Scenario**, **Chat Platform**, and **Response Language**.
3. Keep the selection toolbar enabled.
4. Open a normal webpage, select text, then click an action button such as **Explain** or **Translate**.
5. AI Buddy opens the side panel, drafts the prompt, and auto-sends it for AI chat platforms.

Messaging platforms such as WhatsApp, Telegram, and Discord draft prompts only unless **Auto-Send Lock** is enabled inside the side panel.

## Customize

Open the extension options page to manage preferences, scenarios, and reusable actions. Scenario action order controls the toolbar order. Editing a reusable action updates every scenario that uses it.

## Development

```bash
npm test
npm run build
```

`npm test` runs the Vitest suite. `npm run build` type-checks, builds the extension into `dist/`, and verifies that Chrome content scripts are classic scripts.
