# AI Buddy

厌倦了反复复制网页内容、切换标签页、再把上下文粘贴给 AI 机器人？AI Buddy 让你在网页上选中文字或截取页面截图，点击一个动作，就能把整理好的提示词发送到 Chrome 侧边栏中的常用聊天平台。

[English README](../README.md)

## 截图提示词

在当前网页中框选截图，补充一句简短需求，然后把截图和提示词一起发送到支持的平台。AI Buddy 会处理 Claude、DeepSeek 和 WhatsApp Web 等平台各自不同的上传与发送流程。

<video src="ai_buddy_screenshot_demo.webm" poster="screenshot5.png" controls muted playsinline>
  <a href="ai_buddy_screenshot_demo.webm">观看截图提示词演示</a>
</video>

## 演示视频

<video src="ai_buddy_demo.webm" poster="screenshot1.png" controls muted playsinline>
  <a href="ai_buddy_demo.webm">观看选中文本工具栏演示</a>
</video>

AI Buddy 是一个 Chrome 扩展，会在网页选中文本后显示快捷工具栏，帮助你把选中的内容发送到 AI 聊天平台。它会在 Chrome 侧边栏中打开目标平台，并提供 Explain、Translate、Summarize、Draft Reply、Polish、Brainstorm、Visualize 等可复用场景动作。

## v1.2.0 新功能

- 默认场景扩展到 10 个：Learning、Workplace、Creative、Research、Writing、Coding、Marketing & Sales、Customer Support、Data Analysis 和 Planning。
- 新增全局指令、置顶常用动作，以及 **Transform** 菜单，可把选中文本转换成推文、表格、思维导图、Mermaid 图、清单、测验、闪卡或用户故事。
- 截图发送前可先标注：裁剪、高亮、模糊敏感区域、添加箭头和文字标签。
- 发送前会提示可能的敏感数据，例如邮箱、电话号码、API key、街道地址和金融号码。
- 新增快捷键：启用/禁用工具栏、打开侧边栏、截图、切换到下一个场景。可在选项页查看并跳转到 Chrome 快捷键设置。
- 新增设置导入/导出，以及每个平台的发送行为配置，例如自动发送、只草拟、只粘贴、先打开侧边栏。

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

打开扩展选项页即可管理偏好设置、场景、可复用动作、置顶动作、平台发送行为、全局指令和设置导入/导出。场景中的动作顺序会决定工具栏中的按钮顺序。编辑一个可复用动作后，所有使用该动作的场景都会同步更新。

## 快捷键

默认快捷键：

- 启用或禁用工具栏：`Ctrl+Shift+1`
- 打开侧边栏：`Ctrl+Shift+2`
- 截图：`Ctrl+Shift+3`
- 下一个场景：`Ctrl+Shift+4`

Chrome 会在 `chrome://extensions/shortcuts` 管理扩展快捷键。AI Buddy 选项页会显示当前快捷键，并提供跳转入口。

## 截图标注

先启动截图，拖拽裁剪页面区域，然后选择一个提示词动作。发送前，AI Buddy 会打开标注界面，你可以高亮、模糊、画箭头、添加文字标签、撤销修改，或跳过标注。

## 开发

```bash
npm test
npm run build
```

`npm test` 会运行 `src/` 下的 Vitest 测试套件。`npm run build` 会执行类型检查，构建扩展到 `dist/`，并验证 Chrome content scripts 是否为 classic scripts。
