<p align="center">
  <img src="assets/banner_light.png" width="400">
</p>

Tired of copying page text, switching tabs, and pasting the same context into your AI bot? AI Buddy lets you select text on any page, choose an action, and send a ready-made prompt to your preferred chat platform from Chrome's side panel.

[中文说明](docs/README.zh-CN.md)

![AI Buddy demo](docs/demo.gif)

AI Buddy is a Chrome extension that adds a selection toolbar for sending selected page text to an AI chat platform. It opens the platform in Chrome's side panel and uses reusable scenario actions such as Explain, Translate, Summarize, Draft Reply, Polish, Brainstorm, and Visualize.

## Important Notes

- AI Buddy is a personal project. It is not affiliated with, endorsed by, sponsored by, or maintained by any AI chat platform or messaging platform.
- You need to sign in to your own account on the target platform before using AI Buddy. The extension does not provide accounts, subscriptions, model access, or platform credentials.
- AI Buddy stores only your extension configuration, such as preferences, scenarios, actions, platform choices, and language settings.
- AI Buddy does not store your prompts or platform conversations. Selected text and generated prompts are sent to the chosen platform only when you trigger an action.

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

Messaging platforms such as WhatsApp, Telegram, and Discord draft prompts only unless **Allow auto-send** is switched on inside the side panel.

## Customize

Open the extension options page to manage preferences, scenarios, and reusable actions. Scenario action order controls the toolbar order. Editing a reusable action updates every scenario that uses it.

## Development

```bash
npm test
npm run build
```

`npm test` runs the Vitest suite. `npm run build` type-checks, builds the extension into `dist/`, and verifies that Chrome content scripts are classic scripts.
