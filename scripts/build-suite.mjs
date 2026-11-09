import fs from "fs";
import path from "path";
import { PAGE_BUNDLE, shellFile, suiteDir, suiteIndexHtml, suitePageBundle } from "../server/suite.mjs";

const dist = path.resolve(suiteDir, "..", "dist");

for (const entry of fs.readdirSync(dist)) {
  if (entry !== "app") fs.rmSync(path.join(dist, entry), { recursive: true, force: true });
}
fs.cpSync(suiteDir, dist, { recursive: true });
fs.writeFileSync(path.join(dist, "index.html"), suiteIndexHtml());
fs.writeFileSync(path.join(dist, PAGE_BUNDLE), suitePageBundle());
fs.copyFileSync(shellFile, path.join(dist, "suite-shell.js"));
console.log("Built the site into dist/ (pages 1–2 plus the /app modules).");
