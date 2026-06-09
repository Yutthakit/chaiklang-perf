/**
 * perf.ts — pure core for `maw perf`: measure your own work performance from
 * git history, day over day, against a baseline.
 *
 * Honesty first: this is an **activity** signal (commits, files touched, line
 * churn), NOT a quality judgement. A refactor that deletes 500 lines is great
 * work and shows as high churn; a one-line bug-fix that saves the day shows as
 * low. Read the trend as "how much did I move", not "how good was it". Stated
 * loudly because Nat's brain says: patterns over intentions, show facts not vanity.
 *
 * Pure: (git log text) → daily metrics → day-over-day deltas → baseline compare.
 */

export interface DailyMetric {
  date: string;
  commits: number;
  filesTouched: number;
  linesAdded: number;
  linesDeleted: number;
  score: number;        // transparent composite, see scoreOf()
}

export interface DayDelta extends DailyMetric {
  prevScore: number | null;
  delta: number | null;       // score - prevScore (day over day)
  arrow: "↑" | "↓" | "→" | "·";
}

export interface Baseline {
  date: string;
  score: number;
}

/** Transparent score: commits weigh most, then files, then churn (damped). */
export function scoreOf(m: Omit<DailyMetric, "score" | "date"> & { date?: string }): number {
  const churn = m.linesAdded + m.linesDeleted;
  return m.commits * 10 + m.filesTouched * 2 + Math.round(churn / 50);
}

/**
 * Parse `git log --all --date=short --pretty=tformat:§%ad --numstat`.
 * Each `§<date>` starts a commit; following `add\tdel\tpath` rows are its files.
 */
export function parseDaily(output: string): DailyMetric[] {
  const days = new Map<string, { commits: number; files: number; add: number; del: number }>();
  let date = "";
  for (const raw of output.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (line.startsWith("§")) {
      date = line.slice(1).trim();
      if (!date) continue;
      const d = days.get(date) ?? { commits: 0, files: 0, add: 0, del: 0 };
      d.commits++;
      days.set(date, d);
      continue;
    }
    const m = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
    if (!m || !date) continue;
    const d = days.get(date)!;
    d.files++;
    d.add += m[1] === "-" ? 0 : parseInt(m[1], 10);
    d.del += m[2] === "-" ? 0 : parseInt(m[2], 10);
  }

  return [...days.entries()]
    .map(([date, d]) => {
      const base = { date, commits: d.commits, filesTouched: d.files, linesAdded: d.add, linesDeleted: d.del };
      return { ...base, score: scoreOf(base) };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Attach day-over-day deltas (compares each day to the previous *active* day). */
export function dayOverDay(metrics: DailyMetric[]): DayDelta[] {
  return metrics.map((m, i) => {
    const prev = i > 0 ? metrics[i - 1].score : null;
    const delta = prev === null ? null : m.score - prev;
    const arrow: DayDelta["arrow"] =
      delta === null ? "·" : delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
    return { ...m, prevScore: prev, delta, arrow };
  });
}

/** The baseline = the first active day, unless a saved baseline is supplied. */
export function pickBaseline(metrics: DailyMetric[], saved?: Baseline | null): Baseline | null {
  if (saved) return saved;
  if (!metrics.length) return null;
  return { date: metrics[0].date, score: metrics[0].score };
}

export function vsBaseline(score: number, baseline: Baseline | null): { delta: number; pct: number } | null {
  if (!baseline || baseline.score === 0) return baseline ? { delta: score - baseline.score, pct: 0 } : null;
  return { delta: score - baseline.score, pct: Math.round(((score - baseline.score) / baseline.score) * 100) };
}

export function formatPerf(metrics: DailyMetric[], baseline: Baseline | null, repoLabel = "."): string {
  if (!metrics.length) return `📈 Perf — ${repoLabel}: no commits yet`;
  const days = dayOverDay(metrics);
  const out: string[] = [];
  out.push(`📈 Perf (day-over-day) — ${repoLabel}`);
  out.push(`   score = commits×10 + files×2 + churn÷50   (activity, not quality)`);
  out.push("");
  out.push("🕒 Timeline:");
  for (const d of days) {
    const dlt = d.delta === null ? "baseline" : `${d.arrow}${d.delta >= 0 ? "+" : ""}${d.delta}`;
    out.push(
      `   ${d.date}  score ${String(d.score).padStart(4)}  ${dlt.padEnd(10)}` +
      `  (${d.commits}c · ${d.filesTouched}f · +${d.linesAdded}/−${d.linesDeleted})`,
    );
  }
  const latest = metrics[metrics.length - 1];
  const base = pickBaseline(metrics, baseline);
  const vb = vsBaseline(latest.score, base);
  out.push("");
  out.push("📋 Summary:");
  out.push(`   baseline : ${base?.date} (score ${base?.score})`);
  out.push(`   latest   : ${latest.date} (score ${latest.score})`);
  if (vb) {
    const trend = vb.delta > 0 ? "↑ ดีขึ้น" : vb.delta < 0 ? "↓ ลดลง" : "→ คงที่";
    out.push(`   vs base  : ${vb.delta >= 0 ? "+" : ""}${vb.delta}  (${vb.pct >= 0 ? "+" : ""}${vb.pct}%)  ${trend}`);
  }
  const best = [...metrics].sort((a, b) => b.score - a.score)[0];
  out.push(`   best day : ${best.date} (score ${best.score})`);
  return out.join("\n");
}
