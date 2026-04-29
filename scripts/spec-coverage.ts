/**
 * spec-coverage.ts
 *
 * Builds the inverse map from spec scenarios to verification artifacts.
 * See specs/VERIFICATION.md for the convention.
 *
 * Run: pnpm spec:coverage
 */

import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SPEC_GLOB_ROOT = join(ROOT, "specs");
const REGISTRY_FILE = join(SPEC_GLOB_ROOT, "VERIFICATION.md");

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".astro",
  ".netlify",
  "playwright-report",
  ".tmp",
  "test-results",
]);

const SCANNABLE_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".svelte",
  ".astro",
  ".css",
  ".html",
  ".md",
  ".mdx",
  ".yaml",
  ".yml",
  ".sh",
]);

interface Scenario {
  specPath: string;
  name: string;
}

interface Tag {
  source: string;
  specPath: string;
  scenarioName: string;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".") continue;
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function collectScenarios(): Scenario[] {
  const out: Scenario[] = [];
  for (const file of walk(SPEC_GLOB_ROOT)) {
    if (!file.endsWith("spec.md")) continue;
    const lines = readFileSync(file, "utf8").split("\n");
    const relPath = relative(ROOT, file);
    for (const line of lines) {
      const m = /^####\s+Scenario:\s+(.+?)\s*$/.exec(line);
      if (m) out.push({ specPath: relPath, name: m[1].trim() });
    }
  }
  return out;
}

function normalize(line: string): string {
  return line.replace(/[`'"]/g, "");
}

function parseVerifies(line: string): { specPath: string; scenarioName: string } | null {
  const tagRe = /Verifies:\s*(\S+?\.md)\s*§\s*(.+?)\s*(?:\*\/|-->|$)/;
  const m = tagRe.exec(normalize(line));
  if (!m) return null;
  return { specPath: m[1].trim(), scenarioName: m[2].trim() };
}

function collectTags(): Tag[] {
  const out: Tag[] = [];
  for (const file of walk(ROOT)) {
    if (file === REGISTRY_FILE) continue;
    if (!SCANNABLE_EXTS.has(extname(file))) continue;
    const source = readFileSync(file, "utf8");
    if (!source.includes("Verifies:")) continue;
    const relSource = relative(ROOT, file);
    for (const line of source.split("\n")) {
      const parsed = parseVerifies(line);
      if (parsed) out.push({ source: relSource, ...parsed });
    }
  }
  return out;
}

function collectRegistryEntries(): Tag[] {
  const out: Tag[] = [];
  const text = readFileSync(REGISTRY_FILE, "utf8");
  const after = text.split(/^##\s+Registry/m)[1];
  if (!after) return out;

  // Walk registry section line-by-line so each Verifies: line is attributed to
  // the nearest preceding artifact bullet (e.g. `- biome.json overrides...`).
  let currentArtifact = "registry";
  for (const line of after.split("\n")) {
    const artifactMatch = /^-\s+(.+?):\s*$/.exec(line.trimEnd());
    if (artifactMatch) {
      currentArtifact = normalize(artifactMatch[1]);
      continue;
    }
    const parsed = parseVerifies(line);
    if (parsed) out.push({ source: currentArtifact, ...parsed });
  }
  return out;
}

function key(specPath: string, name: string): string {
  return `${specPath} §${normalize(name)}`;
}

const scenarios = collectScenarios();
const tags = [...collectTags(), ...collectRegistryEntries()];

const scenarioKeys = new Set(scenarios.map((s) => key(s.specPath, s.name)));
const coverage = new Map<string, string[]>();
const orphans: Tag[] = [];

for (const t of tags) {
  const k = key(t.specPath, t.scenarioName);
  if (!scenarioKeys.has(k)) {
    orphans.push(t);
    continue;
  }
  const list = coverage.get(k) ?? [];
  list.push(t.source);
  coverage.set(k, list);
}

const covered: Scenario[] = [];
const uncovered: Scenario[] = [];
for (const s of scenarios) {
  if (coverage.has(key(s.specPath, s.name))) covered.push(s);
  else uncovered.push(s);
}

console.log(`📋 Spec coverage report`);
console.log(`   scenarios: ${scenarios.length}`);
console.log(`   covered:   ${covered.length}`);
console.log(`   uncovered: ${uncovered.length} (legacy slots not yet migrated — informational)`);
console.log(`   orphans:   ${orphans.length}`);
console.log();

if (covered.length) {
  console.log(`✅ Covered scenarios:`);
  for (const s of covered) {
    const artifacts = coverage.get(key(s.specPath, s.name)) ?? [];
    console.log(`   ${s.specPath} §${s.name}`);
    for (const a of artifacts) console.log(`     ← ${a}`);
  }
  console.log();
}

if (orphans.length) {
  console.log(`❌ Orphan tags (point at non-existent scenarios — likely typo or renamed heading):`);
  for (const o of orphans) {
    console.log(`   ${o.source}`);
    console.log(`     → ${o.specPath} §${o.scenarioName}`);
  }
  process.exit(1);
}
