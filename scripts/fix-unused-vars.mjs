import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = path.join(import.meta.dirname, "..");

let report;
try {
  report = JSON.parse(
    execSync("npx eslint . -f json", {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    })
  );
} catch (error) {
  report = JSON.parse(error.stdout?.toString() ?? "[]");
}

const unusedVarFixes = new Map();

for (const fileResult of report) {
  if (!fileResult.messages?.length) continue;
  const rel = path.relative(ROOT, fileResult.filePath).replace(/\\/g, "/");
  for (const msg of fileResult.messages) {
    if (msg.ruleId !== "unused-imports/no-unused-vars") continue;
    if (!msg.line || !msg.message) continue;
    const match = msg.message.match(/^'([^']+)'/);
    if (!match) continue;
    const varName = match[1];
    if (varName.startsWith("_")) continue;
    if (!unusedVarFixes.has(rel)) unusedVarFixes.set(rel, new Map());
    unusedVarFixes.get(rel).set(msg.line, varName);
  }
}

let fixed = 0;
for (const [rel, lineMap] of unusedVarFixes) {
  const filePath = path.join(ROOT, rel);
  if (!fs.existsSync(filePath)) continue;
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  for (const [lineNum, varName] of lineMap) {
    const idx = lineNum - 1;
    if (idx < 0 || idx >= lines.length) continue;
    const line = lines[idx];
    const re = new RegExp(`\\b${varName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    if (re.test(line) && !line.includes(`_${varName}`)) {
      lines[idx] = line.replace(re, `_${varName}`);
      fixed++;
    }
  }
  fs.writeFileSync(filePath, lines.join("\n"));
}

console.log(`Prefixed ${fixed} unused variables with _`);
