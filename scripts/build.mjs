import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(rootDir, "dist");
const extensionDir = resolve(rootDir, "extension");

await rm(distDir, { force: true, recursive: true });
await mkdir(resolve(distDir, "popup"), { recursive: true });

await esbuild.build({
  entryPoints: [
    resolve(extensionDir, "src/background.ts"),
    resolve(extensionDir, "src/content/linkedinExtractor.ts"),
    resolve(extensionDir, "src/popup/popup.ts"),
  ],
  bundle: true,
  outbase: resolve(extensionDir, "src"),
  outdir: distDir,
  format: "iife",
  target: "chrome120",
  sourcemap: true,
  minify: false,
  logLevel: "info",
});

await cp(
  resolve(extensionDir, "manifest.json"),
  resolve(distDir, "manifest.json"),
);
await cp(
  resolve(extensionDir, "src/popup/popup.html"),
  resolve(distDir, "popup/popup.html"),
);
await cp(
  resolve(extensionDir, "src/popup/popup.css"),
  resolve(distDir, "popup/popup.css"),
);
await cp(
  resolve(extensionDir, "src/popup/fonts"),
  resolve(distDir, "popup/fonts"),
  { recursive: true },
);

console.log(`Built extension to ${distDir}`);
