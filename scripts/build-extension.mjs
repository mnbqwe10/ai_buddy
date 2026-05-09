import react from "@vitejs/plugin-react";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "vite";

const root = process.cwd();
const watch = process.argv.includes("--watch");

const output = {
  entryFileNames: "assets/[name].js",
  chunkFileNames: "assets/[name]-[hash].js",
  assetFileNames: "assets/[name]-[hash][extname]",
};

const appInputs = {
  background: resolve(root, "src/background/index.ts"),
  popup: resolve(root, "popup.html"),
  options: resolve(root, "options.html"),
  sidepanel: resolve(root, "sidepanel.html"),
};

const classicScripts = [
  {
    entry: resolve(root, "src/content/index.ts"),
    fileName: "content",
    globalName: "AiBuddyContent",
  },
  {
    entry: resolve(root, "src/platforms/aiChatBridge.ts"),
    fileName: "aiChatBridge",
    globalName: "AiBuddyAiChatBridge",
  },
  {
    entry: resolve(root, "src/platforms/copilotBridge.ts"),
    fileName: "copilotBridge",
    globalName: "AiBuddyCopilotBridge",
  },
  {
    entry: resolve(root, "src/platforms/messagingBridge.ts"),
    fileName: "messagingBridge",
    globalName: "AiBuddyMessagingBridge",
  },
];

rmSync(resolve(root, "dist"), { recursive: true, force: true });

await build({
  configFile: false,
  plugins: [react()],
  publicDir: resolve(root, "public"),
  build: {
    outDir: resolve(root, "dist"),
    emptyOutDir: false,
    sourcemap: true,
    watch: watch ? {} : null,
    rollupOptions: {
      input: appInputs,
      output,
    },
  },
});

for (const script of classicScripts) {
  await build({
    configFile: false,
    publicDir: false,
    build: {
      outDir: resolve(root, "dist"),
      emptyOutDir: false,
      sourcemap: true,
      watch: watch ? {} : null,
      lib: {
        entry: script.entry,
        name: script.globalName,
        formats: ["iife"],
        fileName: () => `assets/${script.fileName}.js`,
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  });
}
