#!/usr/bin/env node
/**
 * Keeps AGENTS.md in sync with git history and docs/context/BACKLOG.md.
 * Run: npm run agent:sync | agent:commit | agent:finish
 */
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AGENTS_PATH = path.join(ROOT, "AGENTS.md");
const BACKLOG_PATH = path.join(ROOT, "docs/context/BACKLOG.md");
const COMMIT_COUNT = 8;
const META_COMMIT_RE = /^docs:\s*sync AGENTS/i;

function git(args, { allowFail = false } = {}) {
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0 && !allowFail) {
    throw new Error(`git ${args.join(" ")} failed: ${r.stderr || r.stdout}`);
  }
  return (r.stdout || "").trim();
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function write(file, content) {
  fs.writeFileSync(path.join(ROOT, file), content.endsWith("\n") ? content : `${content}\n`);
}

function replaceSection(content, heading, bodyLines) {
  const lines = content.split("\n");
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start === -1) throw new Error(`Section not found: ${heading}`);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      end = i;
      break;
    }
  }
  const body = bodyLines.length ? ["", ...bodyLines, ""] : [""];
  return [...lines.slice(0, start + 1), ...body, ...lines.slice(end)].join("\n");
}

export function parseBacklog(text = read("docs/context/BACKLOG.md")) {
  const shipped = [];
  const next = [];
  let section = "";
  for (const line of text.split("\n")) {
    if (line.startsWith("## ")) section = line.slice(3).trim();
    else if (section === "Shipped" && /^- \[x\] /.test(line)) {
      shipped.push(
        line
          .replace(/^- \[x\] /, "")
          .replace(/\s*\(`[a-f0-9]{7}`\)\s*$/, "")
          .trim(),
      );
    } else if (section.startsWith("Next") && /^\d+\. \*\*/.test(line)) {
      const m = line.match(/^\d+\. \*\*(.+?)\*\*/);
      if (m) next.push(m[1]);
    }
  }
  return { shipped, next };
}

export function formatRecentCommits(logLines) {
  return logLines
    .filter((line) => {
      const subj = line.split("|").slice(1).join("|");
      return !META_COMMIT_RE.test(subj);
    })
    .map((line) => {
      const pipe = line.indexOf("|");
      const hash = line.slice(0, pipe);
      const subj = line.slice(pipe + 1);
      return `- \`${hash}\` ${subj}`;
    });
}

export function buildDoneNextRow({ shipped, next }) {
  const done = shipped.slice(-4).join(", ") || "—";
  const nxt = next.slice(0, 2).join(", ") || "—";
  return `| ${done} | ${nxt} |`;
}

export function replaceDoneNextTable(agents, row) {
  const lines = agents.split("\n");
  const header = lines.findIndex((l) => l.trim() === "| Done | Next |");
  if (header === -1) throw new Error("Done vs next table not found");
  const sep = header + 1;
  let end = sep + 1;
  while (end < lines.length && lines[end].startsWith("|")) {
    end++;
  }
  return [...lines.slice(0, sep + 1), row, ...lines.slice(end)].join("\n");
}

export function syncAgents() {
  let agents = read("AGENTS.md");
  const logRaw = git(["log", `-${COMMIT_COUNT}`, '--format=%h|%s'], {
    allowFail: true,
  });
  const commitLines = logRaw ? formatRecentCommits(logRaw.split("\n").filter(Boolean)) : [];
  agents = replaceSection(agents, "## Commits (recent)", commitLines);

  const backlog = parseBacklog();
  agents = replaceDoneNextTable(agents, buildDoneNextRow(backlog));

  write("AGENTS.md", agents);
  return { commits: commitLines.length, done: backlog.shipped.length, next: backlog.next.length };
}

export function suggestCommitMessage() {
  const diff = git(["diff", "--name-only", "HEAD"], { allowFail: true })
    || git(["diff", "--name-only", "--cached"], { allowFail: true })
    || git(["diff", "--name-only"], { allowFail: true })
    || "";
  const files = diff.split("\n").filter(Boolean);
  if (!files.length) return "chore: update project files";

  const has = (re) => files.some((f) => re.test(f));
  if (has(/^docs\//) && !has(/^src\//)) return "docs: update progressive discovery";
  if (has(/src\/lib\/qc\//)) return "fix: QC flow and gates";
  if (has(/src\/components\/QcScreen/)) return "feat: QC screen updates";
  if (has(/src\/lib\/intake\//)) return "feat: intake changes";
  if (has(/src\/lib\/generator\//)) return "feat: checklist generator changes";
  if (has(/src\/components\//)) return "feat: UI updates";
  if (has(/src\/store\//)) return "feat: job store updates";
  if (has(/\.test\./)) return "test: add or update tests";
  if (has(/scripts\//)) return "chore: agent tooling";
  const top = files[0].replace(/^src\//, "");
  return `chore: update ${top}`;
}

export function discoveryCheck() {
  const index = read("docs/INDEX.md");
  const linkRe = /\]\(([^)]+\.md)\)/g;
  const missing = [];
  for (const m of index.matchAll(linkRe)) {
    const target = m[1].replace(/^\//, "");
    if (!target.startsWith("docs/") && !target.startsWith("topics/")) continue;
    const resolved = target.startsWith("topics/")
      ? path.join("docs", target)
      : target;
    if (!fs.existsSync(path.join(ROOT, resolved))) missing.push(resolved);
  }
  if (missing.length) {
    console.warn("discovery:check — broken INDEX links:", missing.join(", "));
    return 1;
  }
  console.log("discovery:check — OK");
  return 0;
}

function runTests() {
  const r = spawnSync("npm", ["test"], { cwd: ROOT, stdio: "inherit", shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function runBuild() {
  const r = spawnSync("npm", ["run", "build"], { cwd: ROOT, stdio: "inherit", shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function stageSensible() {
  git(["add", "-A"]);
  for (const p of ["dist", "node_modules", "coverage", "dev-dist"]) {
    git(["reset", "HEAD", "--", p], { allowFail: true });
  }
}

function commitWithMessage(message) {
  if (!message?.trim()) throw new Error("Commit message required");
  syncAgents();
  stageSensible();
  git(["add", "AGENTS.md"]);
  const staged = spawnSync("git", ["diff", "--cached", "--quiet"], { cwd: ROOT });
  if (staged.status === 0) {
    console.log("agent:commit — nothing staged");
    return;
  }
  const r = spawnSync("git", ["commit", "-m", message.trim()], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
  syncAgents();
  git(["add", "AGENTS.md"], { allowFail: true });
  const dirty = spawnSync("git", ["diff", "--quiet", "AGENTS.md"], { cwd: ROOT });
  if (dirty.status !== 0) {
    spawnSync("git", ["commit", "--amend", "--no-edit"], { cwd: ROOT, stdio: "inherit" });
  }
}

function parseArgs(argv) {
  const out = { message: null, auto: false, skipVerify: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "-m" || argv[i] === "--message") out.message = argv[++i];
    else if (argv[i] === "--auto") out.auto = true;
    else if (argv[i] === "--skip-verify") out.skipVerify = true;
    else if (!argv[i].startsWith("-")) out.message = argv[i];
  }
  return out;
}

function main() {
  const cmd = process.argv[2] || "sync";
  const rest = process.argv.slice(3);
  const args = parseArgs(rest);

  switch (cmd) {
    case "sync": {
      const r = syncAgents();
      console.log(
        `agent:sync — AGENTS.md updated (${r.commits} commits, ${r.done} shipped, ${r.next} next)`,
      );
      break;
    }
    case "suggest-message":
      console.log(suggestCommitMessage());
      break;
    case "check":
      process.exit(discoveryCheck());
      break;
    case "commit": {
      const msg =
        args.message ||
        (args.auto ? suggestCommitMessage() : null) ||
        process.env.AGENT_COMMIT_MESSAGE;
      if (!msg) {
        console.error("Usage: agent-sync.mjs commit -m \"message\"");
        process.exit(1);
      }
      commitWithMessage(msg);
      break;
    }
    case "finish": {
      if (!args.skipVerify) {
        runTests();
        runBuild();
      }
      const msg =
        args.message ||
        (args.auto ? suggestCommitMessage() : null) ||
        process.env.AGENT_COMMIT_MESSAGE;
      if (!msg) {
        console.error("Usage: agent-sync.mjs finish -m \"message\"");
        process.exit(1);
      }
      commitWithMessage(msg);
      console.log("agent:finish — verify, sync, and commit complete");
      break;
    }
    default:
      console.error(`Unknown command: ${cmd}`);
      process.exit(1);
  }
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
