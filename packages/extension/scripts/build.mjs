import { build } from "esbuild";
import { cpSync, mkdirSync } from "node:fs";

mkdirSync("dist", { recursive: true });

await build({
  entryPoints: ["src/background/background.ts"],
  outfile: "dist/background/background.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "chrome120",
});

await build({
  entryPoints: ["src/content/content.ts"],
  outfile: "dist/content/content.js",
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "chrome120",
});

await build({
  entryPoints: ["src/popup/popup.ts"],
  outfile: "dist/popup/popup.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "chrome120",
});

mkdirSync("dist/popup", { recursive: true });
cpSync("src/popup/popup.html", "dist/popup/popup.html");
cpSync("src/popup/popup.css", "dist/popup/popup.css");
cpSync("manifest.json", "dist/manifest.json");
cpSync("icons", "dist/icons", { recursive: true });

console.log("Extension built to dist/. Load dist/ as an unpacked extension in chrome://extensions.");
