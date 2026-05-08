import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const manifestPath = resolve(root, "dist/manifest.json");

if (!existsSync(manifestPath)) {
  throw new Error("dist/manifest.json is missing. Run npm run build first.");
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const classicScriptPaths = manifest.content_scripts.flatMap((entry) => entry.js ?? []);

for (const scriptPath of classicScriptPaths) {
  const absolutePath = resolve(root, "dist", scriptPath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Manifest references missing content script: ${scriptPath}`);
  }

  const source = readFileSync(absolutePath, "utf8");
  if (/^\s*import\s/m.test(source) || /^\s*export\s/m.test(source)) {
    throw new Error(
      `${scriptPath} contains an ES module import/export. Chrome static content scripts must be classic scripts.`,
    );
  }
}

console.log(`Verified ${classicScriptPaths.length} classic content scripts.`);
