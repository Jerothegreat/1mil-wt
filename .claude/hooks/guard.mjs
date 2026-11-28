#!/usr/bin/env node
// PreToolUse guard for pushes: `git push` asks the owner; force-push, mirror, prune, and remote delete are denied.
// Rules and limits: docs/workflow/playbook.md "Enforced Rules".
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Commit and tag messages are text, not commands: `-m "..."`, heredoc and here-string bodies.
const MESSAGE_ARG = /(\s(?:-m|--message)(?:=|\s+))("[^"]*"|'[^']*')/g;
const COMMIT_HEREDOC = /^([^\n]*\bgit\s+(?:commit|tag)\b[^\n]*<<-?\s*(['"]?)(\w+)\2[^\n]*)\n[\s\S]*?\n[ \t]*\3[ \t]*$/gm;
const COMMIT_HERESTRING = /^([^\n]*\bgit\s+(?:commit|tag)\b[^\n]*@(['"])[ \t]*)\n(?:(?!\n\2@)[\s\S])*?\n\2@/gm;
const PIPED_HERESTRING = /^[ \t]*@(['"])[ \t]*\n(?:(?!\n\1@)[\s\S])*?\n\1@(?=[ \t]*\|[ \t]*git(?:\.exe)?\s+(?:-[cC]\s+\S+\s+)*(?:commit|tag)\b)/gm;
const GIT_PUSH = /\bgit(?:\.exe)?\s+(?:(?:-C|-c)\s+\S+\s+|--?[\w-]+(?:=\S+)?\s+)*push(?=[\s)"';]|$)/;
const DESTRUCTIVE = /\s(?:--force(?:-with-lease)?(?:=\S*)?|--mirror|--delete|--prune|-[a-zA-Z]*[fd][a-zA-Z]*|["']?[+:]\S*)(?=[\s"')]|$)/;

const DENY =
  "Force-push, mirror, prune, and remote-branch deletion are never run by an agent (docs/standards/git-workflow.md). " +
  "If history must change, ask the owner to do it by hand.";
const ASK =
  "Pushing publishes work (and a push to the production branch deploys it). Approve only if the owner asked for this push " +
  "in the current chat (AGENTS.md: do not push unless explicitly asked).";

// Returns { decision, reason } or null. A deny anywhere in the command wins over an ask.
export function decide(command) {
  const text = command
    .replace(COMMIT_HEREDOC, "$1")
    .replace(COMMIT_HERESTRING, "$1")
    .replace(PIPED_HERESTRING, "")
    .replace(MESSAGE_ARG, '$1""');
  let result = null;
  for (const segment of text.split(/&&|\|\||[;|&\n]/)) {
    const at = segment.search(GIT_PUSH);
    if (at === -1) continue;
    if (DESTRUCTIVE.test(segment.slice(at))) return { decision: "deny", reason: DENY };
    result = { decision: "ask", reason: ASK };
  }
  return result;
}

function respond(result) {
  if (!result) return;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: result.decision, permissionDecisionReason: result.reason },
    }),
  );
}

function main() {
  let data = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => (data += chunk));
  process.stdin.on("end", () => {
    try {
      const input = JSON.parse(data || "{}");
      if (input.tool_name === "Bash" || input.tool_name === "PowerShell") respond(decide(String(input.tool_input?.command ?? "")));
    } catch (error) {
      respond({ decision: "deny", reason: `The guard hook failed (${error.message}), so the call is blocked. The owner fixes .claude/hooks/guard.mjs by hand.` });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
