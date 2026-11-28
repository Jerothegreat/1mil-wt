# Review Instructions

Claude Code Review and `claude-code-action` read this file. Every review-tier prompt and the `verifier` agent name it as well. Review the diff against the owning plan packet: `spec.md` says what was agreed, and `plan.md` says how it is built.

## Passes

Run three passes and tag each finding with its pass.

1. **Bugs:** logic errors, edge cases, regressions, and any test edited to make a fix pass.
2. **Security:** injection, auth gaps, secrets or PII in code, logs, or docs, and server-only values reaching the client.
3. **Compliance:** the diff does what `spec.md` agreed, the way `plan.md` says. If the build diverged, `plan.md` changed in the same diff. Design values come from `docs/standards/design-brief.md` tokens only. One home per fact: flag any statement that restates a fact owned by another file (table in `docs/workflow/README.md`), including the same meaning in different words.

## What Important Means Here

Reserve Important for findings that would break behavior, leak data, breach a rule in `AGENTS.md`, or change agreed scope without the owner. Style and naming are nits.

## Cap The Nits

Report at most five nits per review and summarize the rest as a count.

## Do Not Report

- Anything `{{CHECK_CMD}}` already enforces: types, lint, tests, and the packet check (`scripts/check-packet.mjs`).
- Generated files and lockfiles.
- Placeholder copy that is labeled as owed.

## Separation Of Duties

Findings never approve or block on their own. The session that wrote a change cannot approve it. The owner decides, or the review tier for flash-tier tickets.
