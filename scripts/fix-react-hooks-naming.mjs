import fs from "fs";
import path from "path";

const ROOT = path.join(import.meta.dirname, "..");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".next") {
      walk(full, files);
    } else if (/\.(tsx?)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

// Rename tableData hooks -> useTableData
const tableDataFiles = [
  "src/components/expenses/table/tableData.tsx",
  "src/components/dashboard/people/depts/DeptartmentTable.tsx",
  "src/components/dashboard/people/users/UserTable.tsx",
  "src/components/dashboard/people/role/RoleTable.tsx",
];

for (const rel of tableDataFiles) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, "utf8");
  content = content.replace(/export const tableData/g, "export const useTableData");
  fs.writeFileSync(file, content);
}

// Update all references tableData( -> useTableData(
for (const file of walk(path.join(ROOT, "src"))) {
  let content = fs.readFileSync(file, "utf8");
  const updated = content
    .replace(/\btableData\(/g, "useTableData(")
    .replace(/import \{ tableData \}/g, "import { useTableData }")
    .replace(/import \{([^}]*?)tableData([^}]*?)\}/g, (_, a, b) =>
      `import {${a}useTableData${b}}`.replace("useTableData, useTableData", "useTableData")
    );
  if (updated !== content) fs.writeFileSync(file, updated);
}

// Rename lowercase page components: const page = () => { ... export default page
for (const file of walk(path.join(ROOT, "src"))) {
  let content = fs.readFileSync(file, "utf8");
  if (!/const page = \(\)/.test(content)) continue;
  content = content.replace(/const page = \(\)/g, "const Page = ()");
  content = content.replace(/export default page\b/g, "export default Page");
  fs.writeFileSync(file, content);
}

console.log("Renamed tableData hooks and page components");
