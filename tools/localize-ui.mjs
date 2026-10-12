// Mechanical JSX localization: route presentation strings through the locale dictionary.
import ts from "../apps/web/node_modules/typescript/lib/typescript.js";
import { readFile, writeFile } from "node:fs/promises";
const path = new URL("../apps/web/src/components/workspace-app.tsx", import.meta.url);
const source = await readFile(path, "utf8");
const file = ts.createSourceFile(
  path.pathname,
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const edits = [];
const strings = new Set();
function visit(node) {
  if (ts.isJsxText(node)) {
    const value = node.text.replace(/\s+/g, " ").trim();
    if (value && !["qaamuus", "Ai", "qaamuusAi", "SOOMAALI", "Af"].includes(value)) {
      strings.add(value);
      edits.push({ start: node.pos, end: node.end, value: `{tr(${JSON.stringify(value)})}` });
    }
  }
  if (
    ts.isJsxAttribute(node) &&
    node.initializer &&
    ts.isStringLiteral(node.initializer) &&
    ["title", "placeholder", "aria-label", "label", "eyebrow", "description"].includes(
      node.name.text,
    )
  ) {
    const value = node.initializer.text;
    strings.add(value);
    edits.push({
      start: node.initializer.getStart(file),
      end: node.initializer.end,
      value: `{tr(${JSON.stringify(value)})}`,
    });
  }
  ts.forEachChild(node, visit);
}
visit(file);
let output = source;
for (const edit of edits.sort((a, b) => b.start - a.start))
  output = output.slice(0, edit.start) + edit.value + output.slice(edit.end);
await writeFile(path, output);
console.log(JSON.stringify([...strings], null, 2));
