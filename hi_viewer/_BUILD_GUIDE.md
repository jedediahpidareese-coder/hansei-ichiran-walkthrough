# Hansei Ichiran Source-Page Viewer — Build Guide & Methodology

**PERMANENT REFERENCE. Read this fully before adding pages, annotating, or expanding the viewer to new domains.**
Created 2026-06-25, distilled from the build-out of the focal-4 + Kanazawa/Nagoya/Kumamoto pages.
This is a cumulative methodology doc — append new lessons as the site grows; do not let it go stale.

---

## 0. Orientation & the golden rules

**What it is:** a static OpenSeadragon deep-zoom viewer that shows the 1870 *Hansei Ichiran* (藩制一覧表) domain-survey scans with bounding-box annotations over every data value, plus an extracted-values table. Each box carries a verbatim transcription, a modern-Japanese reading, and an English translation.

**Where it lives:**
- **Working repo (edit here):** `outputs/walkthrough/hi_viewer/` (inside the research project)
- **Deploy mirror (push from here):** `C:\Users\jedre\meiji-qing-walkthrough\hi_viewer\`
- **Live site:** `https://jedediahpidareese-coder.github.io/hansei-ichiran-walkthrough/` (the viewer is the `hi_viewer/` sub-site)
- **GitHub repo for Pages:** `jedediahpidareese-coder/hansei-ichiran-walkthrough`

**THE GOLDEN RULES (these bit us repeatedly — internalize them):**
1. **Bump `VER` on EVERY deploy.** `viewer.js` has `const VER = '...'` and `viewer.html` has `?v=...` on its css/js links; the JSON data files are fetched as `…/x.json?v=${VER}`. If you change a JSON file but DON'T bump VER, browsers serve the **cached old JSON** and the user sees stale data (we burned several rounds on this). Bump it every single deploy.
2. **The GitHub Pages build often does NOT auto-trigger on push.** After pushing, force it: `gh api -X POST repos/jedediahpidareese-coder/hansei-ichiran-walkthrough/pages/builds`, then poll `…/pages/builds/latest` until `status=built` **and** the commit matches.
3. **Measure boxes by ink-projection, never by eyeball.** Numpy/PIL threshold + projection gives the true glyph bbox; visual estimates drift 30–60px and clip glyphs.
4. **HI reads RIGHT-to-LEFT, top-to-bottom.** A `○` before a domain name is a boundary marker: content to its **RIGHT belongs to the PREVIOUS domain**, content to its LEFT is the current one. This single fact, misapplied, produced a wrong "11/8 officials = Kanazawa" claim (the counts were the preceding domain's).
5. **Verify transcriptions glyph-by-glyph against the zoomed scan.** Don't trust prior notes, OCR, or a first agent's read — especially numerals and the old/new-kanji distinctions. Use arithmetic checks (高 + 新田高 = 合高; 男 + 女 = total).
6. **When adding a domain, add ALL of its pages** (every fascicle it appears in, and both halves of any spread). Pages get silently left out otherwise — that is exactly the gap that prompted this guide.

---

## 1. The source: *Hansei Ichiran* (藩制一覧表) structure

- **Nine fascicles** (冊), printed as running headers `藩制一覧表第一` … `藩制一覧表第九`. They are **numbered fascicles, not data themes.** A domain does **NOT** appear in every fascicle — it appears **exactly twice in the whole work**: once in the civil/economic register (in **one** of fascicles 1–7, as a contiguous run of page-sides) and once in the officials+military register (fascicle 8 **or** 9). So a domain's COMPLETE record = its **civil block + its officials/military block** — a bounded, knowable set (typically ~3–6 civil sides + ~2–4 officials/military sides), NOT "all nine fascicles." Confirmed 2026-06-26 from MASTER (each domain's data lives in one civil fascicle + one mil fascicle; `table_number` is a provenance pointer, not a theme).
  - **Fascicles 1–7** = civil/economic register (kokudaka, demographics, products, taxes, etc.); each domain's civil entry sits in one of them. (vol1/upper holds fascicles 1–5; vol2/lower holds 6–7.)
  - **Fascicles 8–9** = officials + military register, in vol2/lower (covering ALL domains). A domain's officials+military often spans a 2-page spread.
  - **Fascicle boundaries can fall mid-spread.** The two halves of one PDF spread can be in DIFFERENT fascicles (and so different domains): e.g. `upper_p183_right` is fascicle 4 (野村/Nomura) while its facing `upper_p183_left` is fascicle 5 (Kumamoto). **Always read the `藩制一覧表第N` fascicle number in each page's header before treating a facing half as part of a domain's block** — a facing page that's a different fascicle is a different domain, not a continuation.
- **Vertical text, read right→left, top→bottom.** "Column" = one vertical run of glyphs. The rightmost column on a page is read first.
- **Old kanji (kyūjitai)** throughout. Transcribe what is printed:
  - 鹿**兒**島 (not 児), 佐**嘉** = Saga / 佐**倉** = Sakura (DIFFERENT domains — watch this), 金**澤** (not 沢), **覽** (not 覧), **髙**/高, **邨** (variant of 村), 雜稅 (not 雑税), 國/会/学/産 in old forms.
  - viewer.js `KANJI_VARIANTS` normalizes a handful for cross-highlighting, but the **transcription must stay verbatim-old**.
- **Numerals:** 壹貳參(=一二三) 四五六七八九 十百千萬. Sub-koku units after 石: **斗**(.1) **升**(.01) **合**(.001) **勺**(.0001) **才**(.00001) — and a unit may be **skipped** (e.g. 石→斗→合 means 升=0, so 二斗六合 = .206, not .26). Money: 兩/分/匁/貫/文. Goods: 斤/俵.
- **Domain-boundary marker `○○○藩`:** marks the START of that domain. Everything to the RIGHT (read earlier) = the **previous** domain; to the LEFT = this domain. In fascicles 8–9, a domain's military prints AFTER its officials and can **overflow to the right of the NEXT domain's ○ marker** — so military sitting right-of-a-marker belongs to the PREVIOUS domain.
- **Officials two-register layout:** rank order is 知事 → 大参事 → 権大参事 → 少参事 → 権少参事, flowing continuously across pages (a rank that ends on the right page picks up on the left). Rank HEADINGS sit in a top band; appointee NAMES hang in columns below. For a multi-name rank the heading commonly sits atop the **last (leftmost) column** of its block — so names to the *right* of a heading still belong to it (no-orphan reasoning). The daimyo's surname identifies the domain (前田 = Kaga/Kanazawa, 山内 = Tosa/Kōchi, etc.).
- **Warichu (割書 / 双行)** = small double-column inline notes; read **right sub-column top→bottom, then left**. Province/district territory lists are warichu (e.g. Sakura: 下總六郡・常陸二郡・…).
- **Running page header (柱):** `藩制一覧表第N（domain）`, a small vertical column in the **outer margin** (low-x on `*_left` pages, high-x on `*_right` pages). It is **provenance, not data**, and it can name a **different domain than the page's main data** (Saga's status/military pages print （佐倉）/Sakura because they fall in the Sakura section). Some pages print no domain at all (e.g. kumamoto_kokudaka header = just 藩制一覧表第五).
- **Red-ink (原朱 / 朱書) addenda:** later corrections/additions. The scans are **grayscale**, so red ink reads as *faint gray* — you cannot isolate it by color; use `ImageOps.autocontrast` or a lighter threshold to read it.

---

## 2. Viewer architecture & data formats

```
hi_viewer/
  viewer.html            entry page (references viewer.css/js with ?v=VER)
  viewer.js              app logic; const VER = '...'   <-- BUMP EVERY DEPLOY
  viewer.css             layout/styling
  images/*.jpg           the page scans (native res, ~3100x4500)
  data/
    pages.json           page manifest (nav order, metadata, per page)
    annotations/<id>.json  W3C Web Annotations, one file per page id
    master_extracts.json   the MASTER-extracted values table per page
    hi_field_glossary.json furigana + EN glosses by field_jp
    crops_manifest.json    generated detail-crop index (do NOT hand-edit)
```

**Annotation object** (one box):
```json
{
  "id": "anno-<pageid>-NN", "type": "Annotation",
  "body": [
    { "purpose": "transcribing",      "value": "verbatim old-kanji" },
    { "purpose": "modern_jp_reading", "value": "現代語 + furigana" },
    { "purpose": "english_translation","value": "English" },
    { "purpose": "identifying",       "value": "short field label (the row key)" }
  ],
  "target": { "source": "images/xxx.jpg",
    "selector": { "type": "FragmentSelector",
      "conformsTo": "http://www.w3.org/TR/media-frags/",
      "value": "xywh=pixel:X,Y,W,H" } }
}
```
- `identifying` is the cross-highlight key — it is matched (via `normField`) against the MASTER `field_jp` to link a box ⇄ its data-table row and its detail crop. Keep it concise and consistent with MASTER where a row exists; for markers/headers/notes that have no MASTER row, any clear label is fine.
- Coordinates are **image pixels** in the native .jpg resolution. OpenSeadragon positions overlays from these.
- A `*_left.jpg` / `*_right.jpg` pair is the two halves of one PDF spread; within a spread the **right page is the earlier (lower) book page** (read first).

**pages.json entry** (the fields that matter): `id, sequence, domain_canonical, domain_en, domain_hi_name, image, volume, pdf_page, page_side, book_page, page_header_kanji, page_header_en, table_number, page_topic, page_summary_en`. `sequence` sets nav order; the dropdown shows `"{sequence}. {domain_en} — {page_topic}"` (topic truncated ~50 chars).

**Viewer behaviors to remember:** default language = `english_translation`; `placeOverlays()` is re-run on open/resize and a ResizeObserver calls `forceResize()` (fixes background-tab overlay collapse); marker boxes (`ident` starts with `○`) render gold/dashed, data boxes red.

---

## 3. Box-fitting methodology (the core craft)

**Always set up the python correctly:** `PYTHONIOENCODING=utf-8`, **ASCII-only `print()` labels** (Japanese in stdout crashes cp1252), `Image.MAX_IMAGE_PIXELS=None`.

**3a. Ink-projection to find a column's true bbox** (this is the workhorse):
```python
from PIL import Image; import numpy as np
Image.MAX_IMAGE_PIXELS=None
a=np.array(Image.open(IMG).convert('L'))
sub=a[Y0:Y1, X0:X1]                 # rough region around the column
col=(sub<115).sum(axis=0); row=(sub<115).sum(axis=1)   # threshold ~110-120 = "ink"
xs=np.arange(X0,X1); ys=np.arange(Y0,Y1)
cx=xs[col>5]; cy=ys[row>5]
# glyph ink bbox = cx.min..cx.max , cy.min..cy.max ; pad ~8-10px for the box
```

**3b. Gridded crop to READ glyphs / verify placement:**
```python
c=im.crop((X0,Y0,X1,Y1)).resize((int((X1-X0)*S), int((Y1-Y0)*S)))  # S=1.4–3
# draw vertical gridlines every 50px (label every 100) and horizontal every 50–100px (labelled)
# read exact glyph x / title-top / value-bottom off the gridlines
```

**3c. Box rules (enforce uniformly):**
- **Main data column:** TOP = top of the **title** glyph; BOTTOM = bottom of the **last value** glyph (enclose title + value together). x on the column ink, width < ~130px, never overlap a neighbour.
- **男/女 (M/F) sub-columns:** TOP = the very top of the 男/女 glyph — **never above it into the parent total, never cutting it**; BOTTOM = that sub-column's last digit; x snapped to the sub-column. Male & female are **separate boxes sharing one top.** If an `内` ("of which") marker sits between the parent total and the split, it anchors the M/F top. **Failure mode:** long parent totals with splaying glyphs (八/十/人) fake a two-column pattern that fools automated M/F-top detectors → they place the top too high, inside the total (Tosa is worst, it has no `内` marker). When in doubt, read the 男/女 y off a gridded crop.
- **Marker `○`:** center the box on the glyph column; keep the vertical run of ○+name.
- **Roster (rank + names):** box spans the heading glyph **plus all names of that rank.** Determine rank membership by geometry + the no-orphan rule + the facing-page rank order (see §5).
- **Warichu note:** box the whole double-column unit. **Start it BELOW the value column above** — do not grab the trailing 才/sub-unit glyph of the value above it (caught on kumamoto 込高新田高).
- **Compound/staggered labels:** when a label is written in two staggered pieces (e.g. Saga `貮口合 平均`, where 平均 sits in the gutter left of the value), widen the box to enclose both pieces.

**3d. Always verify with an overlay:** draw ALL proposed boxes (green) + key neighbours (red) on a ~0.4x full page, Read it, and fix anything that clips a glyph, bleeds into a neighbour/marker/footer, or sits on whitespace. A value box that comes out far shorter than its neighbours has usually landed on a label/marker, not the value.

---

## 4. Reading & transcription accuracy

- Zoom to ≥2x to read numerals; verify **each digit.** Confirm with arithmetic where possible (高+新田高=合高/貮口合; 男+女=人員 total; 損高 = 草高 − 高).
- Watch the subtle pairs that bit us: **嘉 vs 倉** (Saga vs Sakura), **覽 vs 覧**, **邨 vs 郁**, **十 vs 拾** (拾 has the 扌 hand radical), **逐 vs 調尤依** (a 3-glyph run, not one). Old-form numerals 壹貳參.
- Red-ink notes: `ImageOps.autocontrast(crop.convert('L'), cutoff=1)` to bring up faint vermilion.
- Skipped sub-koku units change the decimal — read the unit glyphs, don't assume.

---

## 5. Domain boundaries & page identity (the part that tripped us hardest)

**Before annotating any new page, establish whose data it is — do not assume from the filename.**
1. Find every `○○○藩` marker on the page. Each marks a boundary.
2. Identify the domain by the **daimyo's surname in the 知事 line** (前田=Kaga, 山内=Tosa, …) — the marker name + the governor name together are unambiguous.
3. Apply the rule: **right of a marker = previous domain; left = current.** A page can hold a boundary and therefore TWO domains (e.g. page 300/`lower_p162_right`: the preceding domain's officials-tail + army on the right, Kanazawa's 知事/大参事/権大参事 on the left).
4. **Counts/officials right of the marker are the previous domain's**, not the page's nominal domain. (The "Kanazawa 少参事 11 / 権少参事 8" was actually the preceding domain's — those numbers sit right of the ○金澤藩 marker.)
5. **The running header can name a different domain** than the data (provenance vs content). Don't use it to attribute data.
6. **Facing pages are often a DIFFERENT domain, not a continuation.** The facing pages of the Nagoya spreads turned out to be Tsurumaki (鶴牧) and Nakatsu (中津). Verify each page's marker; don't assume `X_right.jpg` continues `X_left.jpg`.
7. **Officials grouping:** rank order flows continuously (知事/大参事/権大参事 may be on the right page, 少参事/権少参事 on the left). Membership of a multi-name rank = geometry (heading atop its last/leftmost column) + no-orphans (columns right of a heading with no other heading available belong to it) + the facing-page rank list. State the reasoning; don't lean on counts whose domain you haven't confirmed.

---

## 6. The propose → adversarial-verify workflow

For any batch (new pages, box repairs, headers), use a two-phase `Workflow` (`pipeline(items, propose, verify)`):
- **Propose agent (one per page):** renders the scan, identifies han/markers, fits boxes by ink-projection, drafts transcription + reading + translation, self-checks via an overlay. Returns a structured schema (page metadata + `[{ident, xywh, transcribing, modern_jp_reading, english_translation}]`).
- **Verify agent (one per page, adversarial):** assumes every box is wrong until the scan proves it; re-renders gridded zooms with the proposed rect drawn; returns `box_ok / transcription_ok` and `corrected_*` for each. It catches real errors (it corrected ~half the first-pass boxes on the new pages, and caught 調尤依, the 才-glyph grab, box overlaps, etc.).
- **Apply the verify-corrected values** (they echo the proposal when fine), then **spot-check anomalies yourself** before deploying (e.g. unusual box widths, the 嘉/倉 distinction, sparse pages).
- Existing scripts to copy from (in `outputs/scripts/`): `_repair_wf.js` (per-page bbox repair), `_unboxed_wf.js`/`_unboxed_wf2.js` (add missing boxes), `_heading_wf.js` (running headers), `_addpages_wf.js` (full new-page annotation). All use the same propose/verify pattern + the schemas.
- **Never run two viewer workflows at once.** Let one finish, apply, then launch the next.

---

## 7. Deploy procedure (do every step, in order)

```bash
# 1. regenerate detail crops (reads pages.json + annotations)
cd "<project>"; PYTHONIOENCODING=utf-8 python outputs/scripts/generate_hi_viewer_crops.py

# 2. BUMP VER in BOTH files (use a new, never-used value)
#    viewer.js:  const VER = 'YYYYMMDDhiNN'   ;  viewer.html: two ?v=... links
#    (simple in-place string replace of the old VER -> new VER)

# 3. mirror working -> deploy (PowerShell, NOT git-bash; /MIR, exclude scratch dirs)
robocopy "<working>\hi_viewer" "C:\Users\jedre\meiji-qing-walkthrough\hi_viewer" /MIR /XD _verify _backups /XF _BUILD_GUIDE.md /NFL /NDL /NJH /NJS /NP   # exit 1 = success; /XF keeps this internal guide off the public site

# 4. commit + push the deploy repo
git -C "C:\Users\jedre\meiji-qing-walkthrough" add -A && git -C ... commit -m "..." && git -C ... push

# 5. FORCE the Pages build (it does not reliably auto-trigger) and poll
gh api -X POST repos/jedediahpidareese-coder/hansei-ichiran-walkthrough/pages/builds
#    poll: gh api repos/.../pages/builds/latest --jq '.status' AND check the commit matches; wait for "built"
```
- Robocopy via **PowerShell** (git-bash mangles `/MIR` into a path). Exit code 1 = files copied OK.
- Tell the user to **hard-refresh once** (Ctrl+Shift+R) after a VER bump to drop the stale `viewer.html`.

---

## 8. Adding a new domain — add ALL of its pages (the expansion mandate)

The viewer was built as a curated focal subset; the standing instruction now is **completeness**: when a domain is added, add **every page of its record**, not a sampling.

1. **Inventory the domain's pages.** A domain's complete record = its civil block (one of fascicles 1–7) + its officials/military block (fascicle 8 or 9) — see §1. Many entries span a 2-page spread (officials+military especially), and the *facing* half is the easy-to-miss one. The fastest authoritative seed is MASTER (`outputs/hansei_ichiran_reocr/MASTER_hansei_ichiran.csv`): group by `domain_jp`, collect every `(volume, pdf_page, page_side)` — that is the domain's data-bearing page set (then expand at the block edges by tracing ○markers in the source, and drop false positives per §11). Audit method:
   - List images already present vs used by pages.json: `glob images/*.jpg` minus `{p.image for p in pages.json}` → the "exists but not in nav" gap (this is how page 300 + 9 others were found).
   - For pages we don't have **images** for yet, they must be **extracted from the source PDF first** (the HI vol1/vol2 PDFs). Identify the domain's page range via the vol-2 TOC (PDF p5–8 is the definitive domain→page index) and the per-domain page memory.
2. **For each new page:** identify the domain(s)/markers (§5) → create `data/annotations/<id>.json` (box the running header + every substantive column + any markers; handle boundaries) → add a `pages.json` entry.
3. **Slot it in `sequence`** next to that domain's other pages so the record reads continuously (right-page before left-page within a spread). Insert + renumber all sequences 1..N.
4. **Normalize `domain_en` / `domain_canonical`** so pages group cleanly. Pick ONE canonical string per domain and make all its pages match (done for the 43-page set: `Satsuma / Chōshū / Tosa / Saga / Kumamoto / Kanazawa (Kaga) / Nagoya (Owari) / Tsurumaki / Nakatsu`).
5. **Populate the data table (`master_extracts.json`) — don't skip this, or the new page renders boxes but an EMPTY side-table** (the gap we hit on the 2026-06-26 batch). The table renders `field_jp` + glossary furigana/EN + `parsed` + `unit`, and a row cross-highlights its box when `normField(field_jp) === normField(box.identifying)` (normField drops `（…）`parens + whitespace). So:
   - Give each DATA box a **clean Japanese `field_jp` ident** (e.g. `戸數`, `草高`, `兵隊`, `残反別`), with domain disambiguation as a `（…）`paren that normField strips (e.g. `戸數（山內）`). Markers/headers/page-numbers/editorial-notes/pure-name-roster boxes get NO row (officials pages that are all names legitimately have an empty table, like `kochi_officials`).
   - Write `master_extracts[pageId] = [{field_jp, parsed, unit, raw}]` per data box (`raw` = the box transcription; `parsed` = arabic w/ comma thousands; sub-koku 斗.1升.01合.001勺.0001才.00001, skipped unit = 0; area as integer 町/chō per MASTER convention, not pseudo-decimals).
   - Reliable recipe (used 2026-06-26): a small `parallel()` workflow, one agent per page, that READS the annotation JSON and returns `{orig_ident, include, field_jp, ident_clean, parsed, unit}` per box (pure text transform, no scan needed — fast, ~70s for 12 pages, low drop-risk). Then **independently re-parse every `raw` numeral and diff against the agent's `parsed`** — the LLM occasionally drops a sub-koku digit (caught tsurumaki 草高 19,909.**4**7325). Add glossary entries (`{en, furigana}`) for any new `field_jp` so the EN column isn't blank.
6. Regen crops (idents changed → run `generate_hi_viewer_crops.py`; clear the page's old `crops/<id>/` dir first since renamed idents leave orphan crop files), bump VER, deploy (§7).
7. **VERIFY THE COUNT after integration — the integration step can silently drop pages.** On 2026-06-30 two annotated half-pages (asao_civil_tail p045R, nomura_kokudaka p183R) were lost between annotation and pages.json: planned 45, shipped 43, and nobody noticed until a user hit the gap. Always reconcile: `annotation files == pages.json ids == images used`, and check `planned N == len(pages.json)`. A clean reconciliation with the WRONG total is still a bug. (Recovery is cheap: half-page images live in `藩制一覧英語/page_images/crops_pilot/`, and annotation JSON is reconstructable from the workflow task-output files under the session `tasks/` dir.)

**Box-geometry re-fit (flush/tight snapping) — the 2026-06-30 method.** First-pass boxes float loose off their columns; users notice. Fix = deterministic ink-snap + adversarial verify:
- **Snap (programmatic, no agents):** per box, in a small x-window pick the ink RUN under the box's x-center (run-based, so it can't grab a neighbour), set x to that run's edges ±3px; then y-extent = ink rows in that x-band overlapping the box (title-top→value-bottom). Use a NARROWER window for 男/女 sub-boxes (flag by ident+width<95) and EXCLUDE markers (keep ○+name as-is). Grow-only (`new = union(old, ink)`) when you only want to extend coverage without re-seeding a good box; full-snap when tightening.
- **Then adversarial-verify (workflow, one agent/page):** each renders the snapped boxes on the scan and returns `{ident, ok, corrected_xywh}`. This is ESSENTIAL for M/F: the snap merges adjacent 男/女 columns (they're ~50px apart) and the verifier re-separates them (male=right run, female=left run, shared top at the 男/女 glyph, parent column trimmed to end ABOVE the M/F label row). Apply `corrected_xywh` uniformly (it echoes when ok).
- **Do NOT blanket-snap the carefully-done focal demographics pages** — their M/F sub-boxes are intentionally short; an under-coverage detector false-flags them (it can't tell a correct M/F sub-box from a truncated one). Snap only first-pass pages; verify by eye which are actually loose.

---

## 9. CSS / JS gotchas already fixed (don't regress)

- **Nav next-arrow shoved off-screen:** `.page-nav select` must keep `min-width: 0` (a flex item with `flex: 0 1 420px` but `min-width:auto` balloons to its **longest `<option>`'s** content width — the long new-page topics pushed the select to 1480px and the `›` off-screen). Option labels are also truncated to ~50 chars in `populatePageSelect`.
- **Background-tab overlay collapse:** `placeOverlays()` bound to OSD `open`+`resize`, plus a ResizeObserver on `#osd` calling `viewer.forceResize()`.
- Marker boxes gold/dashed; data boxes red — keep that distinction.

---

## 10. Tooling reference (`outputs/scripts/`)

- `generate_hi_viewer_crops.py` — regenerates `data/crops_manifest.json` + crop images from annotations. **Run after every annotation change, before deploy.**
- `_hi_cols.py` — ink-projection column detection + crop-montage verification.
- `_hi_snap.py` — M/F box snapping (geometric pairing → ink-column detection → shared top).
- Workflow scripts (`_repair_wf.js`, `_unboxed_wf.js`, `_heading_wf.js`, `_addpages_wf.js`) — copy/adapt for new batches.
- **Local preview verification** (use for any CSS/layout change before deploy): `.claude/launch.json` has an `hi_viewer` config (`python -m http.server`, cwd = hi_viewer). `preview_start("hi_viewer")`; navigate to `…/viewer.html?cb=<n>` to bypass the browser's own stale cache; `preview_eval` to read computed styles / element rects; `preview_screenshot` for proof. (The preview browser also caches `viewer.css` — append a fresh `?cb=` or bump VER to force-fetch.)

---

## 11. Current state snapshot (2026-06-26) & cleanup debt

- **43 pages live**, VER `20260626hi29`, 42 images (all used; `lower_p163_right` is shared by satsuma_military + tosa_military).
- **Every domain currently on the viewer is now COMPLETE** — each shows its full civil block + officials/military block (per the §1 two-blocks model). Added 2026-06-26: Tosa tail/officials-cont., Saga officials roster, Kumamoto→Kurume closing boundary, Nagoya mid-civil-spread + whole officials/military block, Tsurumaki kokudaka-open/officials/military, Nakatsu taxes-demographics + officials/military. Chōshū & Kanazawa were already complete.
- **Domains present (all complete):** Satsuma, Tosa, Chōshū, Saga (focal-4) + Kanazawa, Nagoya, Kumamoto + the (now fully-built, per user) boundary domains **Tsurumaki** and **Nakatsu**.
- **Cleanup debt / notes:** (a) `domain_en`/`domain_canonical` were normalized to one canonical string per domain across all 43 (§8.4 — done); (b) the 2026-06-26 additions are *first-pass* (propose→adversarial-verify; 2 pages — `kurume_kokudaka_households`, `nakatsu_taxes_demographics` — had their verify agent drop connection and were spot-checked inline instead of full second-pass) — expect the odd off box/transcription and refine as flagged; (c) `master_extracts.json` was intentionally NOT generated for the new pages (their data tables are empty, matching the other recent additions) — boundary pages would otherwise mix neighbour-domain rows.

### Lessons from the 2026-06-26 completeness build (don't repeat)
- **Agents write scratch into the working dir → it gets mirrored + committed.** The propose/verify/finalize agents `.save()` debug PNGs/scripts (`_qa_*.png`, `_verify_*.png`, `_v_*.png`, `_measure_*.py`, `saga_work/`, `__pycache__/`) directly into `hi_viewer/`. robocopy `/MIR` copied the un-excluded ones to the deploy repo and `git add -A` committed ~250 of them (prior deploys had already accumulated many). **Before deploying, purge everything in `hi_viewer/` except `viewer.html/js/css`, `_BUILD_GUIDE.md`, and `images/ data/ crops/`.** robocopy `/XD <dir>` only *skips* a scratch dir (leaves it in the dest if already there) — it does NOT delete it; remove scratch dirs from the deploy tree by hand. Better: instruct agents to render into an OS temp dir, not the viewer dir.
- **`git push` over PowerShell prints progress to stderr → the tool reports a false "Exit code 255".** Check the actual ref-update line (`d19f14e..259f519 main -> main`) and `git status -sb` (no "ahead"), not the wrapper exit code.
- **MASTER can flag false-positive boundary pages.** A single spurious `…AUDIT` row attributed to domain X on a facing page does NOT mean X's data is there. Two pages (`nomura_kokudaka` f4, `asao_civil_tail` f6) turned out to be 100% the *previous* domain with zero target-domain marker/data — dropped. Verify a candidate page actually carries the target's ○marker or real data (read the boxes) before adding it.
- **Live preview can't screenshot the OSD deep-zoom canvas** (30s timeout) — validate instead by `preview_eval` (option count, `.hl-box` overlay count, `preview_console_logs level:error`) and render static overlay proofs with PIL.

---

## 12. The 2026-07-05 full-page clean-up pass (all 137 fascicle pages)

Goal (user): every fascicle page "clean and professional" — box any unhighlighted text (new box **and** table row, or a separate highlight tied to an existing row), make every box flush (no glyph outside, no dead margin), and no box overlapping another. Method = **deterministic geometry + per-page adversarial-verify agents + a deterministic no-overlap backstop**, in this order:

1. **Flush-snap (deterministic, all 137):** adapter over `outputs/scripts/_hi_snap.py` `snap_columns()` — Y/H snap for main columns (down-cap so a total never swallows its 内 M/F split), full x/y/w/h re-fit for 男/女 sub-boxes (two-column detect → shared top → ~48-56px each, mutually bounded so male/female never overlap), exemptions for ○markers / 藩制一覧表 headers / rank headings / wide rosters. **Safe on officials pages** (name columns tightened, headings kept). Back up each file `*.json.bak_snap` first. This alone fixed the bulk; visually validated on demographics / complex status+military / officials before mass-apply.
2. **Per-page workflow (propose → adversarial verify), one agent each:** propose reads the scan + the snapped boxes + a numbered overview PNG, enumerates every substantive element by ink-projection, returns `additions` (unboxed text, measured) + `edits` (only clearly-broken boxes: clip / wrong-content / overlap) + is_data/field_jp/parsed. Verify re-checks each glyph-by-glyph, runs the 男+女=total / status-sum / kokudaka-sum arithmetic net, and does a completeness `missed` sweep. **Arm the prompts with the two methodology docs** — `outputs/hansei_ichiran_reocr/_HI_CHARACTER_READING_GUIDE.md` (人/八/入, 十/千, 六/八, 大字, koku sub-units, arithmetic) and the `_VIEWER_HANDOFF` STANDARD (box every column, explain 但 subtexts, M/F male-right/female-left, **matcher-safe idents: disambiguate by PREFIX not paren**, "(page figure)" rows, MASTER cross-ref). Full run over 137 pages: 34 additions + 15 verifier-missed + 284 edits; 99/137 changed.
3. **Deterministic overlap-resolver backstop:** trims the box **spilling into empty space** (loser = larger ink-centroid distance from the overlap along its thin axis; ○markers/headers never lose) until no pair overlaps >6% of the smaller box. Cut 168→3 sub-visual residuals (genuine tight collisions where a trim would go < 18px).

**Apply-layer bugs that bit (fixed — re-use the hardened `apply_changes.py`):**
- **Verdict↔addition matching must key on the FULL ident string, not `normField`.** Two additions sharing a normalized label (`兵員内訳（十八）` vs `（千五百五十一）`) collapse onto one verdict → both get the wrong box → one self-overlaps and is dropped. Same class for EDITS: match an edit to its existing box by **exact ident + nearest position**, never normField-first (demographics pages repeat `男`/`女`).
- **Colliding idents:** if an addition's normField already exists on the page, auto-disambiguate by INLINING the paren (`兵員（總計）`→`兵員總計`) so it survives normField (which strips parens); set the data row's `field_jp` to match. Never silently drop a real box.
- **Agents sometimes return a bare `x,y,w,h`** (no `xywh=pixel:` prefix) — parse both.
- Workflow scripts persisted from Python: write **LF-only** (a `\r` is a "control character" the Workflow approval dialog rejects).

**Deploy hygiene reconfirmed:** agents rendered to an OS temp dir (not `hi_viewer/`) — no new scratch leaked. robocopy `/XF *.bak_snap` does NOT reliably match the compound `x.json.bak_snap` extension → the `.bak_*` safety backups slipped into the deploy tree; **delete `.bak_*` from the deploy dir by hand after the mirror.** VER `20260705hi52`. The `*.json.bak_snap` / `.bak_agent` / `.bak_overlap` files remain in the working `data/annotations/` as the revert path.
