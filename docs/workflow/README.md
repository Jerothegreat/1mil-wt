# {{PROJECT}} Workflow Documentation

This is the canonical entrypoint for implementation work.

## Routing

```text
docs/workflow/README.md
  -> intents/NN-*.md (intake, until accepted)
  -> roadmap.md
  -> plans/plan-XX-*/spec.md (WHAT, owner-approved)
  -> plan.md (HOW, review-tier-approved)
  -> tasks.md
  -> evidence.md
  -> gate.md
  -> verified SHA and promotion
```

**How a build moves (the loop):** [`playbook.md`](playbook.md): requirements, design first (wireframes and a reference board), plan packet, build slices, verify, owner feedback passes, promote, owed list.

Read the owning plan's `spec.md`, `plan.md`, `tasks.md`, `evidence.md`, and `gate.md` before changing code or documentation. Supporting design or runbook files are optional and must be linked from `plan.md`. A plan is not complete because source code exists; its evidence and gate files must agree with `traceability/requirements-map.md`.

## Spec-Driven Flow

0. An idea, feedback batch, review finding, or incident starts as `intents/NN-<slug>.md` (copy `plans/plan-00-template/intent.md`). The owner accepts or closes it.
1. Requirements live in `docs/product/requirements-engineering.md` with stable IDs.
2. `grill-with-docs` resolves open product questions for the next plan. UI work uses `grill-with-design` instead: app flow, ASCII wireframes, and a rendered first-look board, and the owner picks before the spec is approved (playbook step 2).
3. `to-spec` writes the agreed WHAT into that plan's `spec.md`, naming requirement IDs. The owner approves it; the intent is marked Accepted and moved into the plan folder.
4. Plan mode writes the HOW into `plan.md` (files, order, proving tests). The review tier approves it. Nothing is implemented without an approved plan.
5. `to-tickets` slices the plan into `.scratch/<feature>/issues/`; `tasks.md` indexes them.
6. `implement` builds one ticket at a time (with `tdd` where a seam exists). If the build diverges, `plan.md` changes in the same commit.
7. Observed results go to `evidence.md`, including the browser script (playbook step 5); `code-review` against `REVIEW.md`, the `verifier` agent, and the independent audit go to `gate.md`.
7a. Owner feedback on a running build becomes one numbered task and one evidence row per pass (playbook step 6).
8. `traceability/requirements-map.md` is updated only after evidence passes.

New plans start as a copy of `plans/plan-00-template/`.

## One Home Per Fact

Each fact lives in exactly one file. Every other file cites it by ID or links to it, and never restates it, even in different words. `scripts/check-packet.mjs` (part of `{{CHECK_CMD}}`) catches the structural cases; the `REVIEW.md` compliance pass catches the restated meaning.

| Fact | Lives only in | Everywhere else |
| --- | --- | --- |
| Requirement wording | `docs/product/requirements-engineering.md` | Cite the ID (`PG-03`) |
| Problem and outcome | `intent.md` until Accepted, then `spec.md` | The Accepted intent is history and frozen |
| What, design, decisions, acceptance, scope | `spec.md` | `plan.md` and tickets link `spec.md#...` |
| How: files, order, interfaces, tests | `plan.md` | Tickets link plan sections |
| Task status | `tasks.md` (index) and the ticket (detail) | |
| Observed results | `evidence.md` | `gate.md` links rows |
| A rule from a recurring mistake | `AGENTS.md` "Recurring Mistakes" (or code) | `issue-log.md` keeps the incident and links the rule |
| A build-loop rule | `playbook.md` "Rules Learned" | |

## Active Categories

- `intents/` owns intake not yet accepted, plus Closed intents (kept to see what survives).
- `plans/` owns executable plan packets.
- `traceability/` owns the current requirement-to-implementation map.
- `runbooks/` (created when first needed) owns reusable operational procedures.
- `archive/` owns historical snapshots and is not implementation input.
- `playbook.md` owns the build loop; improve it in place after each promotion.

## Status Vocabulary

- `Planned`: artifact or execution has not started.
- `In progress`: work is actively being executed.
- `Partial`: implementation or evidence is incomplete.
- `Complete but evidence pending`: implementation is present but required evidence or review is incomplete.
- `Ready for independent review`: implementation and evidence are ready for audit by a separate session/model.
- `Complete`: required evidence, review, independent result, verified SHA, and promotion record exist.
- `Deferred`: intentionally owned by a later plan.

## Safety

- Preserve unrelated dirty files.
- Do not treat archived documents as current sources of truth.
- Do not commit, merge, push, or delete branches without explicit current-chat authorization.
