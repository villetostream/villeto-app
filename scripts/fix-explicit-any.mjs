import fs from "fs";
import path from "path";

const ROOT = path.join(import.meta.dirname, "..", "src");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function fixAny(content) {
  let next = content;
  next = next.replace(/\bcatch\s*\(\s*(\w+)\s*:\s*any\s*\)/g, "catch ($1: unknown)");
  next = next.replace(/Record<string,\s*any>/g, "Record<string, unknown>");
  next = next.replace(/Record<string,\s*unknown>/g, "Record<string, unknown>");
  next = next.replace(/Promise<any>/g, "Promise<unknown>");
  next = next.replace(/Array<any>/g, "Array<unknown>");
  next = next.replace(/\bany\[\]/g, "unknown[]");
  next = next.replace(/<any>/g, "<unknown>");
  next = next.replace(/\bas any\b/g, "as unknown");
  next = next.replace(/:\s*any\b/g, ": unknown");
  return next;
}

let changed = 0;
for (const file of walk(ROOT)) {
  const original = fs.readFileSync(file, "utf8");
  const updated = fixAny(original);
  if (updated !== original) {
    fs.writeFileSync(file, updated);
    changed++;
  }
}
console.log(`Updated ${changed} files`);
