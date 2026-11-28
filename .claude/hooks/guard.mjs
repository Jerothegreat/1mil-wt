#!/usr/bin/env node
// PreToolUse guard: the zero-exception rules from AGENTS.md, enforced in code.
// Every deny or ask explains itself and names the route to approval.
// Rules and the reasons behind them: docs/workflow/playbook.md "Enforced Rules".
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);
export const TEST_LOCK = ".scratch/test-lock";
const TEST_FILE = /(^|\/)(__tests__|tests?|e2e)\/|\.(test|spec)\.[^/]+$/i;
const ENV_FILE = /(^|\/)\.env(\.[^/]+)?$/i;
const SPEC_FILE = /^docs\/workflow\/plans\/[^/]+\/spec\.md$/;
const INTENT_FILE = /^docs\/workflow\/(intents\/[^/]+|plans\/[^/]+\/intent)\.md$/;
const GIT_PUSH = /\bgit\s+(?:(?:-C|-c)\s+\S+\s+|--?[\w-]+(?:=\S+)?\s+)*push(?=\s|$)/;
const LOCK_CHANGE = /\b(?:rm|del|erase|unlink|mv|move|ren|rename|cp|copy|touch|Remove-Item|Move-Item|Rename-Item|Copy-Item|New-Item|Set-Content|Out-File)\b.*test-lock|>\s*\S*test-lock/i;
const DESTRUCTIVE_PUSH = /\s(?:--force(?:-with-lease)?(?:=\S*)?|-f|--mirror|--delete|-d)(?=\s|$)|\s[+:]\S/;

const deny = (reason) => ({ decision: "deny", reason });
const ask = (reason) => ({ decision: "ask", reason });
const status = (text) => (text.match(/^\*\*Status:\*\*\s*(\w+)/im)?.[1] ?? "").toLowerCase();

function toRel(raw, projectDir) {
  const abs = isAbsolute(raw) ? raw : resolve(projectDir, raw);
  const rel = relative(projectDir, abs).replace(/\\/g, "/");
  return rel.startsWith("..") || isAbsolute(rel) ? null : rel;
}

function decideShell(command) {
  for (const segment of command.split(/&&|\|\||[;|\n]/)) {
    if (LOCK_CHANGE.test(segment)) {
      return deny(
        `Only the owner creates or removes ${TEST_LOCK} from the shell. Create it with the Write tool after committing the failing test; ` +
          "the owner removes it by typing `! rm .scratch/test-lock`. While it exists, fix the code, not the test.",
      );
    }
    if (GIT_PUSH.test(segment) && DESTRUCTIVE_PUSH.test(segment.slice(segment.search(GIT_PUSH)))) {
      return deny(
        "Force-push, mirror, and remote-branch deletion are never run by an agent (docs/standards/git-workflow.md). " +
          "If history must change, ask the owner to do it by hand.",
      );
    }
    if (GIT_PUSH.test(segment)) {
      return ask(
        "Pushing publishes work (and a push to the production branch deploys it). Approve only if the owner asked for this push " +
          "in the current chat (AGENTS.md: do not push unless explicitly asked).",
      );
    }
  }
  return null;
}

export function decide(input, fs, projectDir) {
  const tool = input.tool_name;
  const toolInput = input.tool_input ?? {};
  if (SHELL_TOOLS.has(tool)) return decideShell(String(toolInput.command ?? ""));

  const raw = toolInput.file_path ?? toolInput.notebook_path;
  if (!raw) return null;
  const rel = toRel(String(raw), projectDir);
  if (rel === null) return null;

  if (ENV_FILE.test(rel) && !rel.endsWith(".env.example")) {
    return deny("Env files hold secrets and stay out of agent context. Edit `.env.example` for new keys; the owner fills local values.");
  }
  if (!EDIT_TOOLS.has(tool)) return null;

  if (rel === ".claude/settings.json" || rel.startsWith(".claude/hooks/")) {
    return ask("This changes the agent's own guardrails. Approve only if the owner asked for this change in the current chat.");
  }
  if (TEST_FILE.test(rel) && fs.exists(TEST_LOCK)) {
    return deny(
      `Test files are locked during this fix (${TEST_LOCK} exists). Fix the code, not the test. ` +
        "If the test itself is wrong, stop and tell the owner; they remove the lock with `! rm .scratch/test-lock`.",
    );
  }
  if (SPEC_FILE.test(rel) && status(fs.read(rel)) === "approved") {
    return ask(
      "spec.md is Approved: editing it changes agreed scope. Approve only if the owner asked for this change, " +
        'and add a dated line under "Changes After Approval". Build detail belongs in plan.md.',
    );
  }
  if (INTENT_FILE.test(rel) && status(fs.read(rel)) === "accepted") {
    return deny("An Accepted intent is history; spec.md is now the live copy. Put the change in spec.md, or start a new intent.");
  }
  return null;
}

function main() {
  let data = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => (data += chunk));
  process.stdin.on("end", () => {
    const input = JSON.parse(data || "{}");
    const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
    const fs = {
      exists: (rel) => existsSync(resolve(projectDir, rel)),
      read: (rel) => {
        try {
          return readFileSync(resolve(projectDir, rel), "utf8");
        } catch {
          return "";
        }
      },
    };
    const result = decide(input, fs, projectDir);
    if (!result) return;
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: result.decision,
          permissionDecisionReason: result.reason,
        },
      }),
    );
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
