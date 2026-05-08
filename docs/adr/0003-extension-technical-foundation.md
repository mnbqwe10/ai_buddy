# Extension technical foundation

The new extension needs richer state and management UI than the prototype, especially for **Scenarios**, the **Action Library**, defaults, prompt rendering, and platform send policy. We decided to use TypeScript and Vite for the extension build, React for the Options page, Popup, and side panel shell, and lean vanilla TypeScript for content scripts that run on arbitrary pages. This preserves a small injected surface while giving the configuration UI typed models and maintainable state management.
