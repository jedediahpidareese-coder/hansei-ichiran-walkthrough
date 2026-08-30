# MASTER candidate adjudication — round 1 (2026-08-05)

Jed approved working through the candidates on 2026-08-05. **Nothing in MASTER has been edited.**
This file records verdicts and the evidence for them; applying any of it to MASTER is a separate
step that still needs his go-ahead.

Source list: `master_vs_agent_diffs.json` (180 candidates = 134 substantive + 46 precision-only),
produced by `outputs/scripts/hi_expand_master_diff.py`. Categories are those in
`MASTER_DISCREPANCIES.md`.

## Method
For each candidate, crop the agent's own box from the page scan and read the printed value
directly. The relative-difference figure only decides which candidates to look at first; it never
decides the verdict.

---

## A. CONFIRMED MASTER ERRORS — agent right, MASTER wrong (7)

All read off the scan; the printed value is unambiguous in each.

| Domain | Field | MASTER | Correct (printed) | Page |
|---|---|---|---|---|
| 豐津藩 | 士族人口 | 16,253 | **6,253** | `toyotsu_upper_p054_right` |
| 姫路藩 | 社家戸數 | 645 | **135** | `himeji_lower_p101_left` |
| 須坂藩 | 神職戸數 | 12 | **2** | `suzaka_lower_p120_right` |
| 須坂藩 | 修驗戸數 | 12 | **2** | `suzaka_lower_p120_right` |
| 小諸藩 | 社寺領 | 158.04 | **58.14** koku | `komoro_lower_p017_right` |
| 丸亀藩 | 権大参事 | 2 | **3** | `marugame_lower_p210_left` |
| 宮川藩 | 士族 | 145 | **312** (男145 + 女167) | `miyagawa_lower_p077_left` |

(the last two are documented in §D2 below)

Evidence per row:
- **豐津藩 士族人口.** The column prints 「（士族　人口六千二百五十三人　内」. There is no 壹萬
  anywhere between 人口 and 六千, and the box begins at the 士族 label itself, so nothing is clipped
  above. MASTER's 壹萬六千二百五十三人 inserts a 萬 that is not on the page. **This one matters most:
  it overstates a shizoku population by 10,000 people**, and retainer counts feed the paper's
  measures — worth checking whether 豐津 has been used in any derived column.
- **姫路藩 社家戸數.** Prints 社家戸數百三十五戸. MASTER's 六百四十五戸 shares no digits with it.
- **須坂藩 神職戸數 / 修驗戸數.** Both print 貳戸 plainly. MASTER has 拾貳戸 and 壹拾貳戸 — the same
  spurious 拾 twice on one page, which is what makes it look systematic rather than a one-off slip.
- **小諸藩 社寺領.** Prints 社寺領 五十八石 壹斗四升 = 58.14. MASTER's 壹百五拾八石四升 adds a 百 and
  moves the sub-koku place.

## B. NOT a value disagreement — the join compared two different fields (1 so far)

- **日出藩 社領** (`hirose_lower_p109_right`), rel 34.4. The agent read 社領 (shrine land),
  78.558 koku. The MASTER row it joined to carries field_jp normalizing to 社領 but its own raw
  text reads **寺領 (新田共)** — temple land, 2.218 koku. These are different fields, so the
  "disagreement" is spurious. What it does expose is a **labelling inconsistency inside MASTER**
  (a row labelled 社領 whose raw says 寺領); worth a look, but it is not a transcription error.

## C. Units / definition, not transcription — needs a convention decision, not a fix (~25)

This is the whole military-count group and it dominates the top of the rel-sorted list, which is
why the ranking is misleading: 大山領 兵隊 (3,734 vs 10), 島原藩 豫備七小隊 (420 vs 7), 壬生藩 兵隊
(12 vs 360), 高遠藩 兵制八小隊 (8 vs 320), 伊勢崎藩 兵士隊/卒隊, 大洲藩 銃隊, 飯田藩 和蘭陀式銃兵,
蓮池藩 銃卒, 小城藩 大砲隊, 三春藩 兵隊, 大泉藩 破隊附属銃手, 小田原藩 兵隊, 杵築藩 藩卒.
One side counts **platoons**, the other **persons** (platoons × men-per-platoon, the rate often
printing in a neighbouring column). Both readings are correct. 水口藩 兵隊 is the same shape plus a
question of whether the 隊長以下 officers are inside or outside the total.
**Nothing here should be "corrected" — it is a decision about what the column means.**

Related but separate: **岡崎藩 少参事** (`okazaki_lower_p155_left`) — both raws contain BOTH numbers
(「少參事（七員）四員」). 七員 is evidently the authorised establishment and 四員 the men actually in
post; agent took 4, MASTER took 7. Also a definition question, not an error.

## D. Agent under-read — MASTER right (2)

- **高瀬藩 公議人** (`takase_lower_p188_left`): agent recorded 1 name (笠間英之進); MASTER lists 4,
  including that one. MASTER is richer and internally plausible.
- **小野藩 公議人** (`ono_lower_p158_right`): agent's raw is the bare label 公議人 with no names;
  MASTER has 2 names.

## D2. Round 2 (scans read 2026-08-05) — two more MASTER errors, two non-errors

**宮川藩 士族 — MASTER ERROR, and I initially called this one the wrong way.** On the raw strings
alone it looked like MASTER was right: its 百四十五人 男七十五人 女七十人 sums correctly. The scan
disproves that. The page carries three boxes — a bare 士族 label, 士族男 = 男百四十五人 (145) and
士族女 = 女百六十七人 (167). So **145 is the MALE count, not the total; the total is 312**, which is
exactly the agent's figure. MASTER's male/female split (75 / 70) matches nothing on the page.
→ `宮川藩 士族` should be **312**, and MASTER's sex breakdown for it is also wrong.
Lesson: an internally consistent MASTER row is not evidence — 75 + 70 = 145 is arithmetically
sound and still wrong. Read the scan.

**丸亀藩 権大参事 — MASTER ERROR.** The column prints 權大參事 三人. MASTER has 2, apparently the
count of names it could read rather than the printed number. → **3**.

**郡山藩 金 — NOT an error, a mispaired join.** The page has TWO 金 columns:
`金（二兩）` = 二兩壹分二朱永十六文八分 (2.3918) and `金三十九兩` = 三十九兩永三十六文七分 (≈39.367).
MASTER's 39.367 matches the second box exactly. Both sides are right; the diff compared the wrong
pair. **Drop this candidate** — and treat same-field-twice-on-a-page as a standing false-positive
class for `hi_expand_master_diff.py`.

**静岡藩 鰹節 / 静岡藩 錢 — UNRESOLVED, and probably the 郡山 pattern again. Do not treat as
MASTER errors.** Querying `MASTER_hansei_ichiran.csv` directly (not `master_extracts.json`, which is
written from the AGENT's data by the apply script and so cannot corroborate anything):

| page | MASTER raw | MASTER | agent raw | agent |
|---|---|---|---|---|
| p080 **L** 錢 | 貳千六百八拾五貫三百十六文 | 2,685.316 | 錢貳千六百八拾五貫三百十六文 | 2,685.316 |
| p080 **R** 錢 | 九千三百三十六貫三百五十七文 | 9,336.357 | 錢百貳拾三貫四十文 | 123.04 |
| p081 R 鰹節 | 貳千百八十七貫目餘 | 2,187 | 鰹節　七千貳百六拾貫目餘 | 7,260 |

**The two sources agree to the character on p080 L.** That makes a systematic MASTER failure on the
adjacent half-leaf unlikely, and points instead at p080 R carrying TWO 錢 figures with each source
having captured a different one — exactly the 郡山藩 金 pattern. Same likely story for 鰹節 (two
grades or districts of dried bonito on one page). Note also that the agent's box on p080 R is
identified `錢（靜岡藩分）`, i.e. flagged as neighbour-owned, which is a further hint that more than
one 錢 column is in play on that leaf.
**To settle:** inventory every column on `lower_p080_right` and `lower_p081_right` and check whether
a second 錢 / 鰹節 column exists that neither side boxed. Until then neither row should be edited.
Relevant background: HI 産物 quantities have a known phantom 千/百 inflation failure mode
(~11% error rate in the 2026-05-31 products sweep), so 鰹節 could plausibly go either way.

## E. Still to do

- 静岡藩 鰹節 (7,260 vs 2,187 貫目餘), 静岡藩 錢, 郡山藩 金, 丸亀藩 権大参事, 一關藩 銃士小長,
  and the remaining substantive candidates below rel 0.43.
- The 46 precision-only candidates (trailing sub-koku decimals) — lowest stakes, triage last.
## F. Where the 豐津 error currently sits in the analytic dataset

`outputs/hansei_ichiran_reocr/analytic_wide.csv`, row 豊津藩:
- `hi_shizoku_jinin` = **16253** — MASTER's wrong value, live in the dataset.
- `shizoku_persons` = 6253, `wiki_shizoku_persons` = 6253.

⚠️ **Do not read that as corroboration.** `shizoku_persons` is byte-identical to
`wiki_shizoku_persons` in all 260 populated rows — it IS the wiki column, not an HI-derived or
corrected figure. So the agreement at 6,253 is Wikipedia agreeing with the scan, and per the
project's own sourcing rule wiki is an internal sanity check, not evidence. **The verdict rests on
the scan alone**, which is unambiguous; the wiki match is a weak secondary comfort.

Related and worth NOT over-reading: `hi_shizoku_jinin` differs from `shizoku_persons` by >2% in
**74 of the 226 rows** that have both. That is just HI disagreeing with Wikipedia across the board
— expected, given they are different sources measuring at different dates, and given that the wiki
extraction is known-unreliable. **It is not a list of 74 MASTER errors** and must not be used as one.
A real error sweep of this class would have to compare MASTER against the scans, which is what the
viewer expansion is already doing page by page.
