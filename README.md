# 📈 ChaiKlang Perf — measure your own work, day over day

> Oracle School · Quiz 2026-06-09 · **Performance tracker** · by ChaiKlang Oracle (ชายกลาง) for BM/Yutthakit

A Maw Engine command that reads your git history and tells you, day by day,
whether your work output went **up or down** vs a **baseline**. First it picks a
baseline (your first active day, or one you pin); then every later day is
compared — to the baseline *and* to the day before.

> **Honesty up front:** the score is an **activity** signal (commits, files
> touched, line churn) — *not* a quality judgement. A big refactor scores high; a
> game-saving one-line fix scores low. Read it as "how much did I move," not "how
> good was it." (Patterns over intentions — no vanity metrics.)

## Run (in the engine)

```bash
ln -sfn "$PWD" ~/.maw/plugins/perf      # install
maw perf <repo>            # day-over-day timeline + baseline compare
maw perf baseline <repo>   # pin the latest day as your saved baseline
maw perf <repo> --json     # machine-readable
```

## Real output (`Soul-Brews-Studio/voice-bot`)

```
📈 Perf (day-over-day) — .../voice-bot
   score = commits×10 + files×2 + churn÷50   (activity, not quality)

🕒 Timeline:
   2026-05-22  score  294  baseline    (1c · 55f · +8687/−0)
   2026-05-23  score  449  ↑+155       (10c · 82f · +3723/−5507)   ← peak (the big refactor)
   2026-05-24  score  214  ↓-235       (14c · 23f · +1033/−368)
   2026-05-26  score   37  ↓-177       (2c · 2f · +564/−63)
   2026-06-05  score   38  ↑+1         (1c · 9f · +488/−2)

📋 Summary:
   baseline : 2026-05-22 (score 294)
   latest   : 2026-06-05 (score 38)
   vs base  : -256  (-87%)  ↓ ลดลง
   best day : 2026-05-23 (score 449)
```

The shape tells a true story: a burst of building (05-22→23), then settling down.

## The score (transparent on purpose)

```
score = commits × 10  +  filesTouched × 2  +  round(churn / 50)
```
Churn is damped (÷50) so one giant generated file doesn't dominate. Weights are
in `scoreOf()` — change them to fit what *you* think "a good day" means. The raw
breakdown (`Nc · Nf · +adds/−dels`) is always shown so you can ignore the score
and read the facts.

## How it works

| Piece | Role |
|---|---|
| `perf.ts` | **pure core** — `git log --numstat` text → daily metrics → day-over-day deltas → baseline compare. Tested. |
| `index.ts` | **maw verb** — runs git, loads/saves the baseline (`~/.chaiklang-perf/baseline.json`), prints. |
| `perf.test.ts` | **10 tests** — parsing, scoring, up/down arrows, baseline, formatting. |

One git read: `git log --all --date=short --pretty=tformat:§%ad --numstat`.

## Sibling

Pairs with [`chaiklang-git-track`](https://github.com/Yutthakit/chaiklang-git-track)
(the file-lifecycle timeline). git-track = *what* changed; perf = *how much*, over time.

```bash
bun test   # 10 pass
```

🍺 *Some days you brew a lot, some days you just clean the tanks. Both are work — this just plots it.*
