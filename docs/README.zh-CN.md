# AI Buddy

厌倦了反复复制网页内容、切换标签页、再把上下文粘贴给 AI 机器人？AI Buddy 让你在网页上选中文字，点击一个动作，就能把整理好的提示词发送到 Chrome 侧边栏中的常用聊天平台。

[English README](../README.md)

![AI Buddy demo](demo.gif)

AI Buddy 是一个 Chrome 扩展，会在网页选中文本后显示快捷工具栏，帮助你把选中的内容发送到 AI 聊天平台。它会在 Chrome 侧边栏中打开目标平台，并提供 Explain、Translate、Summarize、Draft Reply、Polish、Brainstorm、Visualize 等可复用场景动作。

## 重要说明

- AI Buddy 是个人项目。它不隶属于任何 AI 聊天平台或消息平台，也未获得这些平台的背书、赞助或维护支持。
- 使用前，你需要先在目标平台登录自己的账号。AI Buddy 不提供账号、订阅、模型访问权限或平台凭据。
- AI Buddy 只保存扩展配置，例如偏好设置、场景、动作、平台选择和回复语言。
- AI Buddy 不保存你的提示词，也不保存平台对话内容。只有当你主动点击动作时，选中的文本和生成的提示词才会发送到你选择的平台。

## 本地安装

1. 安装依赖：

   ```bash
   npm install
   ```

2. 构建扩展：

   ```bash
   npm run build
   ```

3. 打开 Chrome，进入 `chrome://extensions`。
4. 启用 **Developer mode**。
5. 点击 **Load unpacked**，选择 `dist/` 文件夹。
6. 在 Chrome 扩展菜单中固定 **AI Buddy**，方便快速访问。

## 开始使用

1. 打开 AI Buddy 弹窗。
2. 选择当前 **Scenario**、**Chat Platform** 和 **Response Language**。
3. 保持选择工具栏开启。
4. 打开普通网页，选中文字，然后点击 **Explain** 或 **Translate** 等动作按钮。
5. AI Buddy 会打开侧边栏，生成提示词，并在 AI 聊天平台中自动发送。

WhatsApp、Telegram 和 Discord 等消息平台默认只会草拟提示词；只有在侧边栏中打开 **Allow auto-send** 后才会自动发送。

## 自定义

打开扩展选项页即可管理偏好设置、场景和可复用动作。场景中的动作顺序会决定工具栏中的按钮顺序。编辑一个可复用动作后，所有使用该动作的场景都会同步更新。

## 开发

```bash
npm test
npm run build
```

`npm test` 会运行 `src/` 下的 Vitest 测试套件。`npm run build` 会执行类型检查，构建扩展到 `dist/`，并验证 Chrome content scripts 是否为 classic scripts。
