/**
 * maw perf — measure your own work performance from git, day over day.
 *
 *   maw perf [repo]              show the day-over-day timeline + baseline compare
 *   maw perf baseline [repo]     pin the latest day as your baseline (saved)
 *   maw perf [repo] --json       machine-readable metrics
 *
 * A command in the Maw Engine (P'Nat's rule). Thin dispatcher over perf.ts.
 */
import type { InvokeContext, InvokeResult } from "maw-js/plugin/types";
import { spawnSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import { parseDaily, formatPerf, pickBaseline, type Baseline } from "./perf";

export const command = { name: "perf", description: "Day-over-day work performance from git history." };

const STATE = join(homedir(), ".chaiklang-perf", "baseline.json");

function loadBaseline(repo: string): Baseline | null {
  try {
    const all = JSON.parse(readFileSync(STATE, "utf8"));
    return all[repo] ?? null;
  } catch { return null; }
}
function saveBaseline(repo: string, b: Baseline) {
  let all: Record<string, Baseline> = {};
  try { all = JSON.parse(readFileSync(STATE, "utf8")); } catch { /* fresh */ }
  all[repo] = b;
  if (!existsSync(dirname(STATE))) mkdirSync(dirname(STATE), { recursive: true });
  writeFileSync(STATE, JSON.stringify(all, null, 2));
}

function gitDaily(repo: string) {
  const r = spawnSync("git", ["-C", repo, "log", "--all", "--date=short", "--pretty=tformat:§%ad", "--numstat"],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(r.stderr?.trim() || "git log failed");
  return parseDaily(r.stdout);
}

export default async function handler(ctx: InvokeContext): Promise<InvokeResult> {
  const out: string[] = [];
  const log = (s: string) => (ctx.writer ? ctx.writer(s) : out.push(s));
  const done = (ok: boolean): InvokeResult => ({
    ok, output: ctx.writer ? "" : out.join("\n"), error: ok ? undefined : "", exitCode: ok ? 0 : 1,
  });

  const args = (ctx.args as string[]) ?? [];
  if (args[0] === "--help" || args[0] === "-h") {
    log("maw perf [repo] [--json] | maw perf baseline [repo]  — day-over-day work performance from git");
    return done(true);
  }

  const setBaseline = args[0] === "baseline";
  const rest = setBaseline ? args.slice(1) : args;
  const json = rest.includes("--json");
  const repo = rest.find((a) => !a.startsWith("-")) ?? ".";

  try {
    const metrics = gitDaily(repo);
    if (setBaseline) {
      const b = pickBaseline(metrics, null); // latest? no — pin the most recent active day
      const latest = metrics[metrics.length - 1];
      if (!latest) { log("no commits to baseline"); return done(false); }
      const pin: Baseline = { date: latest.date, score: latest.score };
      saveBaseline(repo, pin);
      log(`📌 baseline pinned for ${repo}: ${pin.date} (score ${pin.score})`);
      return done(true);
    }
    if (json) { log(JSON.stringify(metrics, null, 2)); return done(true); }
    log(formatPerf(metrics, loadBaseline(repo), repo));
    return done(true);
  } catch (e) {
    log(`✗ ${(e as Error).message}  (is '${repo}' a git repo?)`);
    return done(false);
  }
}
