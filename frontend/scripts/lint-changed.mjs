import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const repoRoot = path.dirname(frontendRoot);

function getChangedFiles() {
  let diffRange;

  if (process.env.LINT_BASE_REF) {
    diffRange = `${process.env.LINT_BASE_REF}...HEAD`;
  } else if (process.env.GITHUB_BASE_REF) {
    diffRange = `origin/${process.env.GITHUB_BASE_REF}...HEAD`;
  } else {
    diffRange = "HEAD~1...HEAD";
  }

  let output = "";
  try {
    output = execSync(`git diff --name-only --diff-filter=ACMRTUXB ${diffRange}`, {
      encoding: "utf8",
      cwd: repoRoot,
    });
  } catch {
    return [];
  }

  return output
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean)
    .filter((file) => file.startsWith("frontend/"))
    .filter((file) => /\.(ts|tsx|js|jsx|mjs)$/.test(file))
    .map((file) => file.slice("frontend/".length));
}

const files = getChangedFiles();

if (files.length === 0) {
  console.log("No changed frontend source files to lint.");
  process.exit(0);
}

console.log(`Linting ${files.length} changed frontend file(s)...`);
execSync(`npx eslint ${files.map((file) => `"${file}"`).join(" ")}`, {
  stdio: "inherit",
  cwd: frontendRoot,
  shell: true,
});
