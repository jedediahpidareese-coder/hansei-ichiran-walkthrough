# Agent-vs-MASTER discrepancies surfaced by the viewer expansion (2026-07-11)

**Status: CANDIDATES — adjudicate before touching MASTER. Do NOT bulk-apply.**

Machine-readable list: `master_vs_agent_diffs.json` (each entry: page_id, domain, field_jp,
agent_parsed/agent_raw, master_parsed/master_raw, rel = relative difference, precision_only).

## How it was produced (repeatable, no agent tokens)
**`PYTHONIOENCODING=utf-8 python outputs/scripts/hi_expand_master_diff.py [OUT.json] [--verbose]`**
(durable as of 2026-07-17 — the original was ad-hoc and lost; only its JSON output survived.
Re-run after every annotation batch to collect new candidates.)

For each expansion page, join the agent's `master_extracts` rows to MASTER rows on
(volume, pdf_page, page_side) + `normField(field_jp)`, and diff `parsed`.
**Only fields that are UNIQUE on the page in BOTH sources are compared** — pages carry several
人口 / 兵隊 / 金 columns (one per status group), so a non-unique join compares different fields
and produces garbage (an unfiltered run gave 51 hits, several of them pure join artifacts).

Two things the rebuild had to get right, both verified against the stored list:
- **`domain` is the matched MASTER row's `domain_jp`, NOT the page's primary domain.** The
  right-of-marker rule puts a neighbour's rows on the page (`sakurai_lower_p058_right` yields both
  櫻井藩 and 岸和田藩 rows), and MASTER is keyed by domain — this names whose record is in question.
- **Values need comma-stripping + Decimal**, not float: agent values sometimes carry thousands
  separators (`43,235.01754`) and these run to 5 sub-koku places.

### 47 vs 54 — read this before worrying about the count
The rebuilt script emits **54 candidates over the same 105 pages: a strict superset of the stored
47** (every stored entry reproduces with an identical `rel`). The 7 extras are all `precision_only`.
The stored 47 is **not reproducible by any consistent rule** — it excludes those 7 while including
`郡山藩 草高` (152912.29987 vs 152912.299), which is the same truncation class — so it was
evidently hand-pruned. Rather than fit an arbitrary threshold to a lost script, the rebuild emits
the superset and flags the class. Nothing was dropped; 7 low-stakes candidates were added.

## They are NOT all MASTER errors. Four distinct causes:
1. **Genuine MASTER errors** — the scan supports the agent. e.g.
   - `佐貫藩 平民戸數` agent **3,314** (三千三百十四軒) vs MASTER 3,344 — agent verified by counting
     seven glyph rows and distinguishing 十 (plain cross) from 千 (slanted stroke on top).
   - `喜連川藩 平均米` agent **1,788.40984** (千七百八拾八石…) vs MASTER 1,780.40984 — MASTER dropped a 八.
2. **Semantics / units, NOT errors** — both sides right, measuring different things:
   - `壬生藩 兵隊` agent 12 (*小隊* = platoons) vs MASTER 360 (*persons*, 12 platoons x 30/platoon).
   - `三春藩 兵隊` agent 5 (platoons) vs MASTER 60 (persons per platoon). Same shape.
   - `水口藩 兵隊` agent 128 (includes the 28 隊長以下 officers) vs MASTER 100 (excludes them).
   -> Any fix here is a UNIT/DEFINITION decision, not a transcription correction.
3. **Genuine conflicts needing scan adjudication** — the two readings are incompatible; only the
   image settles it. e.g. `佐伯藩 修驗人員` (agent 男十八 vs MASTER 男貳十八), `麻生藩 士族` (405 vs 450),
   `西條藩 高` (agent 四萬八百壹石八斗 = 40,801.8 vs MASTER 三萬石 = 30,000), `小諸藩 社寺領` (58.14 vs 158.04).
4. **`precision_only: true` — trailing sub-koku decimals only** (15 of the 54; ~7 sig figs agree).
   Mostly MASTER truncating the same reading (`赤穂藩 惣合米` …六合貳勺六才: agent 10209.19626 vs
   MASTER 10209.1962), sometimes a transposed tail digit (`朝日山藩 ○合高` .87059 vs .87509).
   Lowest-stakes class — triage separately, but they are still unadjudicated.

## Why this matters
MASTER feeds `analytic_wide.csv` and the paper's empirics. Note the standing trap already in the
project: `build_analytic_wide.py`'s PRESERVE_FROM_EXISTING overlay silently clobbers MASTER
corrections on rebuild for ~20 HI columns — so a MASTER fix must be checked through to analytic.

## Suggested next step (a SEPARATE task — ASK THE USER BEFORE STARTING IT)
Not part of the annotation batches. Confirmed with the user 2026-07-17: keep collecting
candidates, do not adjudicate without asking.

Run one adjudication agent per candidate: re-read the specific column on the scan at
single-character zoom, decide agent-vs-MASTER, and emit {verdict, corrected_value, evidence}.
Then apply only category-1 verdicts to MASTER via CORRECTIONS_LOG, and record category-2 as a
units convention. Re-run `hi_expand_master_diff.py` after every future batch to keep collecting.

## Log
- 2026-07-11: 47 candidates over the first 105 new pages (batches recovered-15, A, B, C).
- 2026-07-17: diff script rebuilt durably as `outputs/scripts/hi_expand_master_diff.py`; re-run over
  the same 105 pages -> **54** (39 substantive + 15 precision_only), a strict superset of the 47.
  Original list backed up to `master_vs_agent_diffs.json.bak_47_2026_07_11`. None adjudicated.
- 2026-07-17: **batch D applied (135 pages) -> 89 candidates** (62 substantive + 27 precision_only).
  +35 new, all on batch-D pages; 0 pre-existing candidates lost and 0 `rel` values changed, so the
  re-run is purely additive. None adjudicated. Notable new ones, spanning all four categories:
  - cat 1 (MASTER looks wrong): `島原藩 修驗` MASTER parsed 4.0 while its OWN raw reads 五軒 (=5);
    `三池藩 草高` agent 11,997.38574 vs MASTER 11,977.38574 (九十七/七十七);
    `新發田藩 銀` 75.55664 vs 75.65664 (五百五十六/六百五十六).
  - cat 2 (units/semantics): `島原藩 豫備七小隊` agent 420 *persons* vs MASTER 7 *platoons* — and
    MASTER's raw for that field is `(以下三行附筆)`, a note rather than a figure, so this join is
    also partly an artifact; `宮川藩 士族` agent 312 (raw is the bare label 士族) vs MASTER 145.
  - cat 3 (real conflict): `静岡藩 鰹節` 7,260 vs 2,187 貫目; `静岡藩 錢` 123.04 vs 9,336.357 貫.
