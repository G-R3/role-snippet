import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(rootDir, "dist");
const extensionDir = resolve(rootDir, "extension");
const backendEnvPath = resolve(rootDir, "backend/.env.local");

async function loadLocalEnv(path) {
  let contents = "";

  try {
    contents = await readFile(path, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  for (const line of contents.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const name = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();

    process.env[name] ??= value;
  }
}

await loadLocalEnv(backendEnvPath);

await rm(distDir, { force: true, recursive: true });
await mkdir(resolve(distDir, "popup"), { recursive: true });

await esbuild.build({
  entryPoints: [
    resolve(extensionDir, "src/background.ts"),
    resolve(extensionDir, "src/content/jobExtractor.ts"),
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
  define: {
    __ROLE_SNIPPET_API_KEY__: JSON.stringify(process.env.ROLE_SNIPPET_API_KEY ?? ""),
  },
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
