import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { decide } from "./guard.mjs";

const decisionOf = (command) => decide(command)?.decision ?? null;

test("git push asks the owner, in any shell form", () => {
  for (const cmd of ["git push origin test", "pnpm check && git push", "git -C ../app push", "git.exe push", "(git push)", 'bash -c "git push"', "git push --dry-run origin HEAD:test"]) {
    assert.equal(decisionOf(cmd), "ask", cmd);
  }
});

test("force-push, mirror, prune, and remote delete are denied", () => {
  for (const cmd of ["git push -f", "git push --force origin test", "git push --force-with-lease", "git push -uf origin test", "git push origin +master", 'git push origin "+main"', "git push origin :old", "git push --delete origin x", "git push --mirror", "git push --prune origin"]) {
    assert.equal(decisionOf(cmd), "deny", cmd);
  }
});

test("a deny anywhere wins over an ask", () => {
  assert.equal(decisionOf("git push origin test; git push -f"), "deny");
});

test("non-push commands and commit messages that mention push pass", () => {
  for (const cmd of [
    "git status", "git push-notes", 'git commit -m "feat: push notifications"', 'git commit -m "docs: list git push -f as denied"',
    'git -C ../wt commit -m "docs: explain git push"', 'git tag -a v1 -m "git push --force is denied"',
    "git commit -q -F - <<'EOF'\nfeat: x\n\n- git push -f is denied\nEOF",
    "git commit -F - @'\nfeat: x\n\n- git push -f is denied\n'@",
    "@'\nfeat: x\n\n- git push -f is denied\n'@ | git commit -F -",
  ]) {
    assert.equal(decide(cmd), null, cmd);
  }
  assert.equal(decisionOf('git commit -m "x" && git push'), "ask");
});

test("the hook fails closed on input it cannot parse and ignores other tools", () => {
  const guard = fileURLToPath(new URL("./guard.mjs", import.meta.url));
  const bad = spawnSync(process.execPath, [guard], { input: "not json", encoding: "utf8" });
  assert.equal(JSON.parse(bad.stdout).hookSpecificOutput.permissionDecision, "deny");
  const edit = spawnSync(process.execPath, [guard], { input: JSON.stringify({ tool_name: "Edit", tool_input: { file_path: "a.txt" } }), encoding: "utf8" });
  assert.equal(edit.stdout, "");
});
