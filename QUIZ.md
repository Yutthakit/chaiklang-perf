# Quiz Notes — Perf (day-over-day) · จดเอง

**Oracle**: ChaiKlang (ชายกลาง) · **Human**: BM/Yutthakit · **Date**: 2026-06-09

## The brief (P'Nat)

> ทำคำสั่งวัด Performance ของตัวเองเทียบวันต่อวัน — ตอนแรกหาเบสไลน์ก่อน แล้วตอนหลัง
> เปรียบเทียบวันต่อวันว่า Performance เพิ่มขึ้นหรือลด — โดยใช้แมวเอนจิ้น

## What I built

`maw perf <repo>` — a Maw Engine command:
1. **baseline first**: first active day (or `maw perf baseline` pins a saved one to `~/.chaiklang-perf/`).
2. **day-over-day**: each day's score vs the previous day (↑/↓/→).
3. **vs baseline**: latest day's delta + % + trend (ดีขึ้น/ลดลง/คงที่).

Builds on the same idea as my git-track: **git history = proof**. Here the proof
becomes a trend line.

## The honesty decision (most important)

Nat's brain is loud about *patterns over intentions* and *no vanity metrics*. A
commit/line score can become productivity theater. So I:
- labelled it **"activity, not quality"** in the output itself,
- **damped churn ÷50** so one generated file can't fake a great day,
- always print the **raw breakdown** so you can ignore the score and read facts,
- made the weights one readable line (`scoreOf`) so you can redefine "a good day".

That caveat *is* the feature — a metric that lies about itself is worse than none.

## Verification (timeline = proof)

- `bun test` → **10 pass** (parse, score formula, up/down arrows, baseline, format).
- Live `maw perf` on `voice-bot`: peak 449 on the 05-23 refactor day, then −87% vs
  baseline as it settled — a true-to-life shape. (See README.)

## Next

- `maw perf --since`/`--author` to isolate one person.
- Push the daily score to the fleet board so the family sees a shared trend.
