# Repository Guidelines

## Project Structure & Module Organization

The new extension lives at the repo root and is built with TypeScript, Vite, and React. Root HTML entry points are `popup.html`, `options.html`, and `sidepanel.html`. Source lives under `src/`: `background/` for the MV3 service worker, `content/` for injected page code, `popup/`, `options/`, and `sidepanel/` for React surfaces, and `shared/` for common constants and models. `public/manifest.json` is copied into `dist/` at build time. `code_snippets/chatgpt_sidebar/` is a working prototype for reference only.

## Build, Test, and Development Commands

- `npm install`: install dependencies.
- `npm run build`: type-check and build the unpacked extension into `dist/`.
- `npm test`: run Vitest tests for the new TypeScript source under `src/`.
- `npm run dev`: run a watch build for extension development.
- Open `chrome://extensions/`, enable Developer mode, choose **Load unpacked**, and select `dist/`.
- Prototype-only tests: `cd code_snippets/chatgpt_sidebar && node --test lib/*.node.test.js content/chatgpt-bridge.test.js`.

## Coding Style & Naming Conventions

Use TypeScript for new code, two-space indentation, semicolons, and double quotes. React components use PascalCase; functions, variables, and action IDs use `camelCase`. Keep content scripts lean and avoid React in injected page code unless there is a strong reason. Prototype files remain plain JavaScript.

## Testing Guidelines

Prefer focused tests around deep modules such as Scenario normalization, Action Library behavior, prompt rendering, settings, platform registry, and send policy. Test external behavior through public interfaces. For bridge-style tests, use small DOM/window stubs like the prototype's `content/chatgpt-bridge.test.js` rather than requiring a browser.

## Commit & Pull Request Guidelines

The extension history mostly follows Conventional Commits, for example `feat(sidepanel): add in-panel platform switcher` and `fix(toolbar): open sidebar before sending prompts`. Use `type(scope): summary` with scopes matching touched areas such as `toolbar`, `popup`, `options`, `sidepanel`, or `platforms`.

Pull requests should describe user-visible behavior, list tested Chrome pages or Node test commands, and include screenshots or short recordings for UI changes. Link related issues when available and call out any new host permissions or security-sensitive manifest changes.

## Security & Configuration Tips

Keep `host_permissions` and dynamic header-rule changes as narrow as possible. Do not commit secrets, local profiles, generated extension packages, or dependency directories.

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for `mnbqwe10/ai_buddy`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five-label triage vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo using root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.
