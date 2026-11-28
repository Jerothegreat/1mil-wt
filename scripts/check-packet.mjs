#!/usr/bin/env node
// Plan packet check: every plan has its files, and each fact has one home
// (docs/workflow/README.md "One Home Per Fact"). Fails with how-to-fix messages.
// Usage: node scripts/check-packet.mjs [repo-root]
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const PACKET_FILES = ["intent.md", "spec.md", "plan.md", "tasks.md", "evidence.md", "gate.md"];
const SPEC_ONLY = /^#{1,6}\s+(problem|solution|outcome|design spec|round \d+ decisions|acceptance criteria|out of scope)\b.*$/gim;
const PLAN_ONLY = /^#{1,6}\s+(implementation decisions|order of work|testing decisions)\b.*$/gim;
const ID = /\b(?!ADR-)[A-Z]{1,4}-\d+\b/g;
const REQUIREMENTS = "docs/product/requirements-engineering.md";

const status = (text = "") => (text.match(/^\*\*Status:\*\*\s*(\w+)/im)?.[1] ?? "").toLowerCase();

export function requirementIds(text) {
  return new Set(text.match(ID) ?? []);
}

export function checkPacket(name, files, knownIds) {
  const errors = [];
  for (const file of PACKET_FILES) {
    if (files[file] === undefined) errors.push(`${name}: missing ${file}. Copy it from docs/workflow/plans/plan-00-template/ and fill it.`);
  }
  for (const m of (files["plan.md"] ?? "").matchAll(SPEC_ONLY)) {
    errors.push(`${name}/plan.md: "${m[0].trim()}" belongs in spec.md (the WHAT). Move it there and link it from plan.md.`);
  }
  for (const m of (files["spec.md"] ?? "").matchAll(PLAN_ONLY)) {
    errors.push(`${name}/spec.md: "${m[0].trim()}" belongs in plan.md (the HOW). Move it there and link it from spec.md if needed.`);
  }
  for (const file of ["spec.md", "plan.md", "tasks.md"]) {
    for (const line of (files[file] ?? "").split("\n")) {
      const cited = line.match(/Requirements:\**(.*)$/i)?.[1] ?? "";
      for (const id of cited.match(ID) ?? []) {
        if (!knownIds.has(id)) errors.push(`${name}/${file}: ${id} is not in ${REQUIREMENTS}. Add it there first, or fix the ID.`);
      }
    }
  }
  if (status(files["spec.md"]) === "approved" && status(files["intent.md"]) !== "accepted") {
    errors.push(`${name}: spec.md is Approved but intent.md is not. Set intent.md to "**Status:** Accepted → spec.md".`);
  }
  return errors;
}

export function checkRepo(root) {
  const plansDir = join(root, "docs/workflow/plans");
  if (!existsSync(plansDir)) return { plans: 0, errors: [] };
  const reqPath = join(root, REQUIREMENTS);
  const knownIds = requirementIds(existsSync(reqPath) ? readFileSync(reqPath, "utf8") : "");
  const plans = readdirSync(plansDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  const errors = plans.flatMap((dir) => {
    const files = {};
    for (const file of PACKET_FILES) {
      const path = join(plansDir, dir.name, file);
      if (existsSync(path)) files[file] = readFileSync(path, "utf8");
    }
    return checkPacket(dir.name, files, knownIds);
  });
  return { plans: plans.length, errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { plans, errors } = checkRepo(resolve(process.argv[2] ?? "."));
  for (const error of errors) console.error(`packet check: ${error}`);
  console.log(`packet check: ${plans} plan(s), ${errors.length} problem(s)`);
  process.exitCode = errors.length ? 1 : 0;
}
