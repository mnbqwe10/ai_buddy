# AI Sidebar Extension

This context describes the user-facing language for a Chrome extension that helps users send selected page content into a chat platform through scenario-specific toolbar actions.

## Language

**Scenario**:
A named user situation that defines which toolbar actions are available and how they are arranged.
_Avoid_: Mode, profile, preset

**Action**:
A user-triggered command available from the toolbar.
_Avoid_: Button, tool

**Action Library**:
The reusable collection of actions that Scenarios can reference.
_Avoid_: Global actions

**Scenario Color**:
The visual color assigned to a Scenario so users can recognize the active Scenario at a glance.
_Avoid_: Theme color

**Learning Scenario**:
A starter **Scenario** for understanding selected text through explanation, translation, summarization, and follow-up questions.
_Avoid_: Study mode

**Workplace Scenario**:
A starter **Scenario** for everyday workplace writing and reading tasks such as drafting replies, polishing text, summarizing documents, and translating messages.
_Avoid_: Office, Productivity, Communication

**Creative Scenario**:
A starter **Scenario** for generating ideas and prompt-based visual artifacts from selected context.
_Avoid_: Creating, Design Studio

**Starter Scenario**:
A default Scenario created for new users to make the extension useful immediately.
_Avoid_: System scenario, locked scenario

**Local Action**:
An **Action** that completes inside the page or extension without sending a prompt to a chat platform.
_Avoid_: Utility action

**Prompt Action**:
An **Action** that expands a prompt template from the current page context and sends it to a chat platform.
_Avoid_: Template, prompt

**Prompt Template**:
The reusable text pattern a **Prompt Action** fills with selected page context before sending or drafting.
_Avoid_: Prompt, instruction

**Action Instruction**:
The plain-language request a **Non-Technical User** writes to define a custom **Prompt Action**.
_Avoid_: Prompt Template

**Input Prompt Action**:
A **Prompt Action** that asks the user for extra input before sending.
_Avoid_: Ask mode

**Panel Action**:
An **Action** that controls the side panel rather than the selected page content.
_Avoid_: Navigation button

**Chat Platform**:
The AI chat service loaded in the side panel.
_Avoid_: Provider, chatbot

**AI Chat Platform**:
A **Chat Platform** with a single assistant-style conversation destination where auto-submit is acceptable by default.
_Avoid_: Direct platform

**Messaging Platform**:
A **Chat Platform** where the active recipient or conversation can vary, such as WhatsApp, Telegram, or Discord.
_Avoid_: Social platform

**Auto-Send Lock**:
A side panel toggle that allows a **Messaging Platform** to auto-submit prompts after the user has opened the intended bot dialog.
_Avoid_: Target Lock, default chat, selected chat

**Review Before Sending**:
A user preference that drafts prompts on **AI Chat Platforms** instead of auto-submitting them.
_Avoid_: Safe mode

**Include Page URL**:
A privacy preference that allows prompt rendering to include the selected page's URL.
_Avoid_: URL context

**Response Language**:
The user's preferred language for normal chat platform responses.
_Avoid_: Target language

**Translation Target Language**:
The language a Translate **Action** should translate selected text into.
_Avoid_: Response Language

**Long Selection Warning**:
A prompt shown when selected text is large enough that sending may be slow, costly, or rejected.
_Avoid_: Hard limit

**Options Page**:
The full management surface for Scenarios, Actions, platform settings, and defaults.
_Avoid_: Settings popup

**Popup**:
The minimal browser-action surface for quick switching and simple toggles.
_Avoid_: Options page

**First-Run Onboarding**:
A lightweight initial setup that helps users choose starting defaults and understand send safety.
_Avoid_: Setup wizard

**Restore Missing Defaults**:
A non-destructive action that recreates missing starter Scenarios and built-in Actions without overwriting user edits.
_Avoid_: Reset defaults

**Reset Everything**:
A destructive action that replaces user configuration with the starter defaults after explicit confirmation.
_Avoid_: Restore defaults

**Non-Technical User**:
The primary user who wants predefined prompt workflows without copying, pasting, or writing complex templates.
_Avoid_: Power user

## Relationships

- A **Scenario** references an ordered set of actions from the **Action Library**.
- A **Scenario** has exactly one **Scenario Color**.
- **Scenario Color** identifies the toolbar and active **Scenario**, not individual **Action** buttons.
- The **Learning Scenario** is part of the v1 starter set.
- The **Workplace Scenario** is part of the v1 starter set.
- The **Creative Scenario** is part of the v1 starter set.
- Default **Scenario Colors** are Learning `#2563EB`, Workplace `#059669`, and Creative `#DB2777`.
- First-run defaults are the **Learning Scenario** and ChatGPT.
- The default **Learning Scenario** actions are Copy, Explain, Translate, Summarize, and Ask.
- The default **Workplace Scenario** actions are Copy, Draft Reply, Polish, Summarize, Translate, and Ask.
- The default **Creative Scenario** actions are Brainstorm, Visualize, Name Ideas, Make Prompt, and Ask.
- Name Ideas generates names when no candidates are present and compares existing candidates when the selection includes them.
- Draft Reply produces a concise, professional reply without inventing facts, commitments, dates, prices, attachments, or approvals.
- Polish improves clarity, grammar, flow, and professionalism while preserving meaning and avoiding new facts.
- Explain describes selected text in clear, simple language, defines important terms, and notes why it matters.
- Summarize gives a short summary followed by key bullet points while preserving important facts.
- Visualize asks the **Chat Platform** to choose and produce the best supported visual format for the selected text, with fallback to a generation prompt or specification when direct creation is unavailable.
- A **Starter Scenario** is editable and deletable by the user.
- Missing starter defaults can be restored without overwriting unrelated user customization.
- **Restore Missing Defaults** is non-destructive.
- **Reset Everything** requires explicit confirmation.
- The app always maintains at least one **Scenario**.
- Duplicating an existing **Scenario** is the preferred path for creating a custom **Scenario**.
- Creating a blank **Scenario** is available but secondary.
- An **Action** referenced by the active **Scenario** is visible in the toolbar.
- The toolbar may place later **Scenario** actions behind overflow when space is limited.
- An **Action** has one action type: **Local Action**, **Prompt Action**, **Input Prompt Action**, or **Panel Action**.
- Copy is a reusable **Local Action** included in the default **Learning Scenario** and **Workplace Scenario**.
- Copy is removable from any **Scenario** like any other **Action**.
- Ask is a reusable **Input Prompt Action** included in every **Starter Scenario** by default.
- Ask is removable from any **Scenario** like any other **Action**.
- Custom **Input Prompt Actions** are not supported in v1.
- Updating an **Action** changes it for every **Scenario** that references it.
- Deleting an **Action** used by **Scenarios** requires confirmation and removes that **Action** from affected **Scenarios**.
- No **Action** is mandatory for every **Scenario**.
- A custom user-created **Action** is a **Prompt Action** unless a future design explicitly expands the action model.
- A user-created **Prompt Action** may customize its label, icon, description, and **Action Instruction**.
- A user-created **Prompt Action** must not run arbitrary scripts in v1.
- Raw **Prompt Template** editing is hidden or deferred in v1.
- The default experience optimizes for **Non-Technical Users** with predefined prompt workflows.
- Research and design-oriented **Actions** are **Prompt Actions** in v1, not native **Chat Platform** feature toggles.
- v1 **AI Chat Platforms** include ChatGPT, Claude, Gemini, DeepSeek, and Microsoft 365 Copilot.
- Microsoft 365 Copilot appears lower in the default **Chat Platform** order.
- v1 **Messaging Platforms** include WhatsApp Web, Telegram Web, and Discord.
- The default **Chat Platform** order is ChatGPT, Claude, Gemini, DeepSeek, WhatsApp Web, Telegram Web, Discord, then Microsoft 365 Copilot.
- A **Messaging Platform** requires **Auto-Send Lock** before any **Action** may auto-submit.
- **Auto-Send Lock** is off by default.
- **Auto-Send Lock** lasts only for the current side panel session.
- When **Auto-Send Lock** is off, a **Messaging Platform** may draft a prompt but must not send it.
- **Review Before Sending** can make **AI Chat Platforms** draft prompts instead of auto-submitting them.
- **Include Page URL** is off by default.
- **Response Language** is a user setting for normal **Prompt Actions**.
- **Response Language** defaults to Auto, which adds no explicit response-language instruction.
- **Translation Target Language** belongs to a Translate **Action**.
- **Translation Target Language** defaults to English.
- v1 seeds one reusable Translate **Action**.
- Users can duplicate Translate to create additional translation targets.
- Prompt rendering includes selected text and page title by default.
- Prompt rendering includes page URL only when **Include Page URL** is enabled.
- Prompt rendering does not include hidden page content or surrounding DOM in v1.
- A **Long Selection Warning** appears when selected text exceeds 12,000 characters.
- Long selections are not silently truncated.
- v1 prompt actions operate on the current text selection only.
- v1 does not persist prompt history, selected text, or generated prompts.
- Prompt delivery may use a short-lived in-memory queue only for the current send sequence.
- Failed prompt deliveries show an error but do not persist failed prompts or offer prompt history recovery.
- The **Popup** stays minimal and does not manage **Scenarios** or **Actions** in depth.
- The **Options Page** manages **Scenarios**, **Actions**, defaults, and detailed settings.
- The side panel shows compact working controls for active **Chat Platform**, active **Scenario**, status, and **Auto-Send Lock** when relevant.
- User settings include the active **Scenario**, active **Chat Platform**, **Review Before Sending**, **Include Page URL**, **Response Language**, toolbar enablement, and blocked sites.
- The toolbar appears automatically after text selection unless disabled globally or blocked for the current site.
- The **Popup** provides quick toolbar on/off control.
- The extension uses broad page access for the selection toolbar and tight host permissions for supported **Chat Platforms** only.
- **First-Run Onboarding** lets users choose default **Chat Platform**, choose default **Scenario**, and understand send safety without forcing customization.
- A user may switch between **Scenarios** depending on their current task.
- Users switch **Scenarios** from the selection toolbar and from the side panel.

## V1 Out of Scope

- Prompt history.
- Multi-snippet collection.
- Native **Chat Platform** feature toggles such as actual Deep Research mode.
- Arbitrary user scripts or webhooks.
- Custom **Input Prompt Actions**.
- Per-platform custom prompt variants.
- Direct image or design-file editing.
- Team sync or cloud accounts.
- Prompt marketplace.
- Persistent **Auto-Send Lock** for **Messaging Platforms**.

## Example dialogue

> **Dev:** "Should Translate appear in every **Scenario**?"
> **Domain expert:** "No. It belongs in the Learning **Scenario** by default, but users can add it to other **Scenarios** if it helps their workflow."
>
> **Dev:** "Can users create an **Action** that runs JavaScript on the page?"
> **Domain expert:** "No. User-created **Actions** are **Prompt Actions**: they define labels and prompt templates, not arbitrary code."
>
> **Dev:** "What does a custom **Action** edit?"
> **Domain expert:** "Its label, icon, optional description, and plain-language **Action Instruction**."
>
> **Dev:** "If I edit the Explain **Action**, does that change Learning and Researching?"
> **Domain expert:** "Yes, if both **Scenarios** reference that same **Action**. Create a separate custom **Action** when the wording should diverge."
>
> **Dev:** "What happens if I delete an **Action** used by multiple **Scenarios**?"
> **Domain expert:** "The **Options Page** must confirm the affected **Scenarios** before removing that **Action** from them."
>
> **Dev:** "How should users know which **Scenario** is active?"
> **Domain expert:** "Each **Scenario** has a **Scenario Color**, and the toolbar must make the active **Scenario** obvious without requiring the user to read settings."
>
> **Dev:** "Should each **Action** have a strong color?"
> **Domain expert:** "No. **Scenario Color** accents the toolbar and active **Scenario**. **Actions** stay visually restrained."
>
> **Dev:** "Can an **Action** belong to a **Scenario** but stay hidden?"
> **Domain expert:** "No. If the active **Scenario** references an **Action**, it appears in the toolbar. Remove it from the **Scenario** to hide it."
>
> **Dev:** "Is switching **Scenarios** a settings-page task?"
> **Domain expert:** "No. Users choose the active **Scenario** while working, especially from the selection toolbar after selecting text."
>
> **Dev:** "What happens if a **Scenario** contains many **Actions**?"
> **Domain expert:** "The first actions stay one-click in toolbar order, and later actions move behind overflow when there is not enough space."
>
> **Dev:** "Does WebSearch activate a native search mode in the **Chat Platform**?"
> **Domain expert:** "No. In v1 it is a **Prompt Action** that asks the active **Chat Platform** to use search if available."
>
> **Dev:** "Can WhatsApp auto-send a selected text prompt immediately?"
> **Domain expert:** "Only after the user opens the intended bot dialog in the side panel and turns on **Auto-Send Lock**. Otherwise the extension must require confirmation."
>
> **Dev:** "Should **Auto-Send Lock** persist tomorrow?"
> **Domain expert:** "No. **Auto-Send Lock** is session-only and resets when the side panel reloads, the platform changes, or the extension restarts."
>
> **Dev:** "What happens when a user clicks Polish while WhatsApp is open and **Auto-Send Lock** is off?"
> **Domain expert:** "The extension may draft the prompt in the current dialog, but it must not send the message."
>
> **Dev:** "Can cautious users review prompts before sending to ChatGPT?"
> **Domain expert:** "Yes. Enable **Review Before Sending** to draft prompts on **AI Chat Platforms** instead of auto-submitting them."
>
> **Dev:** "Do prompts always include the current page URL?"
> **Domain expert:** "No. **Include Page URL** is off by default because URLs can be sensitive."
>
> **Dev:** "Is the language for Explain the same as the language for Translate?"
> **Domain expert:** "No. **Response Language** controls normal replies, while **Translation Target Language** belongs to a Translate **Action**."
>
> **Dev:** "What does Auto **Response Language** mean?"
> **Domain expert:** "It means prompts do not force a response language; the **Chat Platform** can respond naturally."
>
> **Dev:** "What language does Translate use on first install?"
> **Domain expert:** "The default **Translation Target Language** is English."
>
> **Dev:** "Can the extension send surrounding page content for extra context?"
> **Domain expert:** "No. In v1 prompt context is limited to selected text, page title, and optionally page URL."
>
> **Dev:** "What if a user selects a whole long document?"
> **Domain expert:** "Show a **Long Selection Warning** and let the user decide; do not silently truncate."
>
> **Dev:** "Can users collect multiple snippets and run one **Action** on all of them?"
> **Domain expert:** "No. v1 operates on the current text selection only."
>
> **Dev:** "Can users view previously sent prompts?"
> **Domain expert:** "No. v1 does not persist prompt history or selected text."
>
> **Dev:** "What if prompt delivery fails?"
> **Domain expert:** "Show an error. The user can fix the issue, reselect text, and trigger the **Action** again."
>
> **Dev:** "Can the extension keep a prompt while the side panel is opening?"
> **Domain expert:** "Yes, only in a short-lived in-memory queue for the current send sequence, never as long-term storage."
>
> **Dev:** "Where do users build a custom **Scenario**?"
> **Domain expert:** "In the **Options Page**. The **Popup** is only for quick switching and simple controls."
>
> **Dev:** "Should first launch force users to customize everything?"
> **Domain expert:** "No. **First-Run Onboarding** is lightweight and lets users start from defaults quickly."
>
> **Dev:** "Does the side panel edit **Scenarios**?"
> **Domain expert:** "No. It shows working controls like **Chat Platform**, active **Scenario**, status, and **Auto-Send Lock**."
>
> **Dev:** "Should custom prompts expose complex variables first?"
> **Domain expert:** "No. The extension is mainly for **Non-Technical Users** who want predefined prompt workflows and less copying or typing."
>
> **Dev:** "How does a user create Make Friendlier?"
> **Domain expert:** "They name the **Action** and write an **Action Instruction** like 'Rewrite the selected text in a warmer tone'; the extension handles the prompt structure."
>
> **Dev:** "Is the workplace starter for Microsoft Office only?"
> **Domain expert:** "No. The **Workplace Scenario** covers browser-based work like Gmail, Outlook, docs, messages, and other selected workplace text."
>
> **Dev:** "Does the **Creative Scenario** edit images or design files directly?"
> **Domain expert:** "No. In v1 it uses **Prompt Actions** to brainstorm, critique, and request visual artifacts from the active **Chat Platform**."
>
> **Dev:** "Does Name Ideas only generate new names?"
> **Domain expert:** "No. It compares existing candidates when the selected text includes them, otherwise it generates new ideas."
>
> **Dev:** "Can Draft Reply promise a delivery date?"
> **Domain expert:** "No. It should use placeholders when information is missing and avoid inventing commitments."
>
> **Dev:** "Can Polish add persuasive details that were not in the original?"
> **Domain expert:** "No. Polish improves expression while preserving the selected text's meaning."
>
> **Dev:** "Should Explain sound childish?"
> **Domain expert:** "No. It should be clear and simple without talking down to the user."
>
> **Dev:** "Should Summarize only produce bullets?"
> **Domain expert:** "No. It should start with a short summary, then list key points."
>
> **Dev:** "Does Visualize always produce an SVG?"
> **Domain expert:** "No. It should choose the best supported visual format for the selected text, such as Mermaid, a chart spec, an image, an icon concept, SVG, or a generation prompt."
>
> **Dev:** "Are **Starter Scenarios** locked?"
> **Domain expert:** "No. They are initial configuration. Users can edit or delete them, then restore missing defaults later if needed."
>
> **Dev:** "Does restore defaults overwrite my custom **Scenario**?"
> **Domain expert:** "No. **Restore Missing Defaults** only recreates missing defaults. **Reset Everything** is the separate destructive option."
>
> **Dev:** "What if the user deletes the last **Scenario**?"
> **Domain expert:** "Restore the **Learning Scenario** automatically because the app always needs at least one **Scenario**."
>
> **Dev:** "How should a non-technical user create a custom **Scenario**?"
> **Domain expert:** "Duplicate a useful **Scenario** and adjust it. Blank creation is available but secondary."
>
> **Dev:** "Is Copy always shown?"
> **Domain expert:** "No. Copy is a reusable **Local Action** and appears only in **Scenarios** that reference it."

## Flagged ambiguities

- "Mode" was used in early planning to mean a user task context. Resolved: use **Scenario** to avoid confusion with temporary UI states such as an Ask input being open.
