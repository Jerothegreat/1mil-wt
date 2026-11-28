import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { decide, TEST_LOCK } from "./guard.mjs";

const root = resolve("/repo");
const fsWith = (files = {}) => ({
  exists: (rel) => rel in files,
  read: (rel) => files[rel] ?? "",
});
const run = (tool, toolInput, files) => decide({ tool_name: tool, tool_input: toolInput }, fsWith(files), root);
const shell = (command) => run("Bash", { command });
const edit = (rel, files) => run("Edit", { file_path: join(root, rel) }, files);

test("git push asks the owner, in Bash and PowerShell, alone or chained", () => {
  assert.equal(shell("git push origin test").decision, "ask");
  assert.equal(shell("pnpm check && git push").decision, "ask");
  assert.equal(shell("git -C ../app push").decision, "ask");
  assert.equal(run("PowerShell", { command: "git push origin master" }).decision, "ask");
});

test("force-push, mirror, and remote delete are denied", () => {
  for (const cmd of ["git push -f", "git push --force origin test", "git push --force-with-lease", "git push origin +master", "git push origin :old", "git push --delete origin x", "git push --mirror"]) {
    assert.equal(shell(cmd).decision, "deny", cmd);
  }
});

test("non-push git and look-alikes pass", () => {
  assert.equal(shell("git status"), null);
  assert.equal(shell('git commit -m "feat: push notifications"'), null);
  assert.equal(shell("git push-notes"), null);
  assert.equal(shell("git push && rm -f x").decision, "ask");
});

test("shell cannot create, move, or remove the test lock", () => {
  for (const cmd of [`rm ${TEST_LOCK}`, `rm -f ./${TEST_LOCK}`, `touch ${TEST_LOCK}`, `mv ${TEST_LOCK} x`, `Remove-Item ${TEST_LOCK}`, `echo > ${TEST_LOCK}`]) {
    assert.equal(shell(cmd).decision, "deny", cmd);
  }
});

test("merely mentioning the test lock is allowed", () => {
  assert.equal(shell(`git commit -m "deny test edits under ${TEST_LOCK}"`), null);
  assert.equal(shell(`ls ${TEST_LOCK}`), null);
});

test("test files are locked only while the lock exists", () => {
  const locked = { [TEST_LOCK]: "" };
  for (const rel of ["src/a.test.ts", "src/__tests__/a.ts", "e2e/home.spec.ts", "tests/x.py"]) {
    assert.equal(edit(rel, locked).decision, "deny", rel);
    assert.equal(edit(rel, {}), null, rel);
  }
  assert.equal(edit("src/a.ts", locked), null);
  assert.equal(run("Write", { file_path: join(root, TEST_LOCK) }, {}), null);
});

test("env files are denied for read and edit; .env.example is allowed", () => {
  assert.equal(run("Read", { file_path: join(root, ".env") }).decision, "deny");
  assert.equal(edit("apps/web/.env.local").decision, "deny");
  assert.equal(edit(".env.example"), null);
  assert.equal(run("Read", { file_path: join(root, "src/env.ts") }), null);
});

test("guardrail files ask before edits", () => {
  assert.equal(edit(".claude/settings.json").decision, "ask");
  assert.equal(edit(".claude/hooks/guard.mjs").decision, "ask");
  assert.equal(edit(".claude/agents/verifier.md"), null);
});

test("an Approved spec asks; a Draft spec and plan.md do not", () => {
  const spec = "docs/workflow/plans/plan-01-home/spec.md";
  assert.equal(edit(spec, { [spec]: "# S\n\n**Status:** Approved\n" }).decision, "ask");
  assert.equal(edit(spec, { [spec]: "# S\n\n**Status:** Draft\n" }), null);
  assert.equal(edit("docs/workflow/plans/plan-01-home/plan.md", {}), null);
});

test("an Accepted intent is frozen, in a plan or in intents/", () => {
  const inPlan = "docs/workflow/plans/plan-01-home/intent.md";
  const queued = "docs/workflow/intents/03-search.md";
  assert.equal(edit(inPlan, { [inPlan]: "**Status:** Accepted → spec.md" }).decision, "deny");
  assert.equal(edit(queued, { [queued]: "**Status:** Draft" }), null);
});

test("paths outside the project and tools without paths pass", () => {
  assert.equal(run("Edit", { file_path: resolve("/elsewhere/a.test.ts") }, { [TEST_LOCK]: "" }), null);
  assert.equal(run("Glob", { pattern: "**/*" }), null);
});
