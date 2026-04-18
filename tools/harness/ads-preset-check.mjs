import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const args = new Set(process.argv.slice(2));
const stagedOnly = args.has("--staged");

const MAX_LINES = 250;
const TARGET_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

const getChangedFiles = () => {
  const command = stagedOnly
    ? "git diff --cached --name-only --diff-filter=ACMRTUXB"
    : "git diff --name-only --diff-filter=ACMRTUXB HEAD";

  const out = execSync(command, { encoding: "utf8" }).trim();
  if (!out) return [];

  return out
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean)
    .filter((file) => {
      const dot = file.lastIndexOf(".");
      if (dot < 0) return false;
      return TARGET_EXTENSIONS.has(file.slice(dot));
    });
};

const countLines = (content) => content.split("\n").length;

const run = () => {
  const files = getChangedFiles();
  if (files.length === 0) {
    console.log("[ads-harness] No changed JS/TS files to validate.");
    return;
  }

  const lineViolations = [];
  const inlineStyleViolations = [];

  for (const relativePath of files) {
    const absPath = resolve(process.cwd(), relativePath);
    if (!existsSync(absPath)) continue;

    const content = readFileSync(absPath, "utf8");
    const lines = countLines(content);

    if (lines > MAX_LINES) {
      lineViolations.push({ file: relativePath, lines });
    }

    if (/style=\{\{/.test(content)) {
      inlineStyleViolations.push(relativePath);
    }
  }

  if (lineViolations.length === 0 && inlineStyleViolations.length === 0) {
    console.log("[ads-harness] Passed: no line-limit or inline-style violations.");
    return;
  }

  console.error("\n[ads-harness] Preset check failed.");

  if (lineViolations.length > 0) {
    console.error(`\n- Files exceeding ${MAX_LINES} lines:`);
    for (const violation of lineViolations) {
      console.error(`  - ${violation.file}: ${violation.lines} lines`);
    }
    console.error(`\n  Action required: get user code-review approval before allowing any >${MAX_LINES} line exception.`);
  }

  if (inlineStyleViolations.length > 0) {
    console.error("\n- Inline style usage detected (style={{ ... }}):");
    for (const file of inlineStyleViolations) {
      console.error(`  - ${file}`);
    }
  }

  console.error("\nSplit files into composable sections/components and use Tailwind tokens instead of inline styles.");
  process.exit(1);
};

run();
