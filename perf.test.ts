import { expect, test, describe } from "bun:test";
import { parseDaily, scoreOf, dayOverDay, pickBaseline, vsBaseline, formatPerf } from "./perf";

// canned `git log --date=short --pretty=tformat:§%ad --numstat`
const LOG = [
  "§2026-06-09",
  "50\t10\tsrc/big.ts",
  "5\t0\tREADME.md",
  "§2026-06-09",          // second commit, same day
  "3\t1\tsrc/small.ts",
  "§2026-06-08",
  "20\t0\tsrc/a.ts",
  "§2026-06-07",
  "200\t0\tnote.md",      // churn 200 → score 16 (so 06-08 is a clear drop)
].join("\n");

describe("parseDaily", () => {
  const days = parseDaily(LOG);
  test("groups commits per day, sorted oldest→newest", () => {
    expect(days.map((d) => d.date)).toEqual(["2026-06-07", "2026-06-08", "2026-06-09"]);
  });
  test("06-09 aggregates two commits + their files/churn", () => {
    const d = days.find((x) => x.date === "2026-06-09")!;
    expect(d.commits).toBe(2);
    expect(d.filesTouched).toBe(3);            // big, README, small
    expect(d.linesAdded).toBe(58);             // 50+5+3
    expect(d.linesDeleted).toBe(11);           // 10+1
  });
});

describe("scoreOf", () => {
  test("transparent formula commits*10 + files*2 + churn/50", () => {
    expect(scoreOf({ commits: 2, filesTouched: 3, linesAdded: 58, linesDeleted: 11 }))
      .toBe(2 * 10 + 3 * 2 + Math.round(69 / 50)); // 20 + 6 + 1 = 27
  });
});

describe("dayOverDay", () => {
  const deltas = dayOverDay(parseDaily(LOG));
  test("first day is the baseline (no delta)", () => {
    expect(deltas[0].delta).toBeNull();
    expect(deltas[0].arrow).toBe("·");
  });
  test("marks up/down vs previous day", () => {
    // 06-07 score=12, 06-08 score=10 → down; 06-09 score=27 → up
    expect(deltas[1].arrow).toBe("↓");
    expect(deltas[2].arrow).toBe("↑");
    expect(deltas[2].delta).toBe(deltas[2].score - deltas[1].score);
  });
});

describe("baseline", () => {
  const m = parseDaily(LOG);
  test("defaults to first active day", () => {
    expect(pickBaseline(m, null)).toEqual({ date: "2026-06-07", score: m[0].score });
  });
  test("saved baseline overrides", () => {
    expect(pickBaseline(m, { date: "x", score: 5 })).toEqual({ date: "x", score: 5 });
  });
  test("vsBaseline computes delta + pct", () => {
    const vb = vsBaseline(20, { date: "x", score: 10 });
    expect(vb).toEqual({ delta: 10, pct: 100 });
  });
});

describe("formatPerf", () => {
  test("renders timeline + summary with trend", () => {
    const out = formatPerf(parseDaily(LOG), null, "demo");
    expect(out).toContain("Perf (day-over-day) — demo");
    expect(out).toContain("baseline");
    expect(out).toContain("best day");
  });
  test("empty repo is handled", () => {
    expect(formatPerf([], null, "demo")).toContain("no commits");
  });
});
