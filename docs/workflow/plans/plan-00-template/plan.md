# Plan 00: <Name>

**Status:** Planned
**Spec:** [spec.md](spec.md) (approved YYYY-MM-DD)
**Approved by:** <review-tier session and model, date>
**Dependencies:** <accounts, env vars, earlier plans>
**Requirements:** <IDs>

The HOW. This file owns files, order of work, interfaces, and the tests that prove the change. Link spec sections (`spec.md#acceptance-criteria`) instead of restating them. Readiness test: someone who never saw the conversation could build the change from `spec.md` and this file alone. Nothing is implemented before this file is approved. When the build diverges, update this file in the same commit.

## Implementation Decisions

- **<Area>.** <Decision with exact files, interfaces, limits.> Serves: <spec.md acceptance item>.

## Order Of Work

<Waves, matching tasks.md. Tasks that share files run in sequence.>

## Testing Decisions

<Which seams get test-first, with literal expected values. Bug fixes: commit the failing test, then create `.scratch/test-lock` so test files stay locked until the fix passes.>

## Divergences

<YYYY-MM-DD: what changed from the approved plan and why.>
