import assert from "node:assert/strict";
import { test } from "node:test";
import { checkPacket, PACKET_FILES, requirementIds } from "./check-packet.mjs";

const known = requirementIds("| PG-01 | Home | ... |\n| NFR-01 | Speed | ... |\n- G-1 goal");
const packet = (overrides = {}) => ({
  ...Object.fromEntries(PACKET_FILES.map((f) => [f, `# ${f}\n`])),
  ...overrides,
});

test("a complete, clean packet passes", () => {
  assert.deepEqual(checkPacket("p", packet({ "spec.md": "**Requirements:** PG-01, NFR-01; ADR-0002\n## Problem\n" }), known), []);
});

test("each missing file is named with the fix", () => {
  const files = packet();
  delete files["intent.md"];
  delete files["gate.md"];
  const errors = checkPacket("p", files, known);
  assert.equal(errors.length, 2);
  assert.match(errors[0], /missing intent\.md\. Copy it from docs\/workflow\/plans\/plan-00-template/);
});

test("spec-owned headings in plan.md fail", () => {
  const errors = checkPacket("p", packet({ "plan.md": "## Problem Statement\n### Round 2 decisions (2026-11-28)\n## Out Of Scope\n" }), known);
  assert.equal(errors.length, 3);
  assert.match(errors[0], /plan\.md: "## Problem Statement" belongs in spec\.md/);
});

test("plan-owned headings in spec.md fail", () => {
  const errors = checkPacket("p", packet({ "spec.md": "## Testing Decisions\n## Implementation Decisions\n" }), known);
  assert.equal(errors.length, 2);
  assert.match(errors[0], /spec\.md: "## Testing Decisions" belongs in plan\.md/);
});

test("cited requirement IDs must exist; task IDs and ADRs are ignored", () => {
  const errors = checkPacket("p", packet({ "tasks.md": "- [ ] `RO-14` Ticket 14: x. Requirements: PG-01, PG-99.\n", "plan.md": "**Requirements:** SF-03; ADR-0001\n" }), known);
  assert.deepEqual(errors, [
    "p/plan.md: SF-03 is not in docs/product/requirements-engineering.md. Add it there first, or fix the ID.",
    "p/tasks.md: PG-99 is not in docs/product/requirements-engineering.md. Add it there first, or fix the ID.",
  ]);
});

test("an Approved spec requires an Accepted intent", () => {
  const draftIntent = packet({ "spec.md": "**Status:** Approved\n", "intent.md": "**Status:** Draft\n" });
  assert.match(checkPacket("p", draftIntent, known)[0], /spec\.md is Approved but intent\.md is not/);
  const accepted = packet({ "spec.md": "**Status:** Approved\n", "intent.md": "**Status:** Accepted → spec.md\n" });
  assert.deepEqual(checkPacket("p", accepted, known), []);
});
