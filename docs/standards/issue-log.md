# Issue Log

Record recurring bugs and setup issues once, newest first: symptom, root cause, fix, prevention.

## 2026-11-28

### Shell-text guard rules never converged

- Symptom: a hook that blocked test-lock removal and env-file access from the shell failed five verifier rounds in a row. Each round found a new phrasing (pipelines, `if … then rm`, `% { Remove-Item $_ }`) or a false block on an ordinary commit message.
- Root cause: matching shell command text cannot cover every way to remove a file or read a secret.
- Fix: the hook now enforces only push rules (`.claude/hooks/guard.mjs`); the rest is guidance checked by `REVIEW.md` and the verifier ("Enforced Rules" in `docs/workflow/playbook.md`).
- Prevention: put a rule in a hook only when a tool call can check it reliably; otherwise leave it to review, or to a sandbox or permission settings.

## YYYY-MM-DD

### <Short symptom title>

- Symptom:
- Root cause:
- Fix:
- Prevention:
