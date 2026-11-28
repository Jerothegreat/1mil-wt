# Issue Log

Record recurring bugs and setup issues once, newest first: symptom, root cause, fix, prevention.

## 2026-11-28

### Guard hook blocked a commit that only mentioned the test lock

- Symptom: `git commit` was denied because its message contained `.scratch/test-lock`.
- Root cause: the shell rule matched any command containing the path, not commands that change it.
- Fix: the rule now matches only commands that create, move, copy, or remove the lock (`.claude/hooks/guard.mjs`, `LOCK_CHANGE`).
- Prevention: regression test "merely mentioning the test lock is allowed" in `.claude/hooks/guard.test.mjs`. Hook rules match commands that act on a path, never the bare text.

## YYYY-MM-DD

### <Short symptom title>

- Symptom:
- Root cause:
- Fix:
- Prevention:
