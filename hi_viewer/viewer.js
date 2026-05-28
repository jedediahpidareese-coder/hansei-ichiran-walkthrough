/* HI page viewer — side-by-side with CSS-overlay column highlights.
 *
 *   Left:  HI page <img> + absolutely-positioned amber rectangles, one per
 *          annotation, computed from each annotation's image-pixel bbox.
 *   Right: data table; hovering a row highlights its column on the page;
 *          hovering a column highlights its row here.
 *
 * No OSD, no Annotorious. Bbox positions come from data/annotations/*.json
 * (auto-detected by outputs/scripts/auto_align_hi_annotations.py).
 */

let pages = [];
let extracts = {};
let glossary = {};
let annotationsByPage = {};   // page_id -> [annotation objects]
let cropsManifest = {};       // page_id -> [{ident, crop_path, x, y, w, h}]
let currentPage = 0;
let currentAnnotations = [];
let activeFieldJp = null;

const $ = (sel) => document.querySelector(sel);
const xywhRe = /xywh=pixel:([0-9.]+),([0-9.]+),([0-9.]+),([0-9.]+)/;

async function loadJson(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`);
  return r.json();
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function parseXywh(selectorValue) {
  const m = xywhRe.exec(selectorValue);
  return m ? { x: +m[1], y: +m[2], w: +m[3], h: +m[4] } : null;
}

function findAnnotationByField(fieldJp) {
  return currentAnnotations.find(a => {
    const ident = (a.body || []).find(b => b.purpose === 'identifying')?.value;
    return ident === fieldJp;
  });
}

function findCropByField(pageId, fieldJp) {
  const entries = cropsManifest[pageId] || [];
  return entries.find(e => e.ident === fieldJp);
}

function populatePageSelect() {
  const sel = $('#page-select');
  sel.innerHTML = '';
  pages.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${p.sequence}. ${p.domain_en} — ${p.page_topic}`;
    sel.appendChild(opt);
  });
}

function renderFieldWithFurigana(fieldJp) {
  const entry = glossary[fieldJp];
  if (entry && entry.furigana) {
    return `<ruby>${escapeHtml(fieldJp)}<rt>${escapeHtml(entry.furigana)}</rt></ruby>`;
  }
  return escapeHtml(fieldJp);
}

function setActiveField(fieldJp) {
  activeFieldJp = fieldJp;
  document.querySelectorAll('.highlight-box').forEach(el => {
    el.classList.toggle('active', el.dataset.fieldJp === fieldJp);
  });
  document.querySelectorAll('.extract-table tr[data-field-jp]').forEach(tr => {
    tr.classList.toggle('active', tr.dataset.fieldJp === fieldJp);
  });
}

function clearActiveField() {
  activeFieldJp = null;
  document.querySelectorAll('.highlight-box.active').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.extract-table tr.active').forEach(tr => tr.classList.remove('active'));
}

function renderExtractTable(pageId) {
  const tbody = $('#extract-rows');
  tbody.innerHTML = '';
  const rows = extracts[pageId] || [];
  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="color:#888;text-align:center;padding:20px">No MASTER extract rows for this page.</td></tr>';
    return;
  }
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    tr.dataset.fieldJp = r.field_jp;
    const gloss = glossary[r.field_jp] || {};
    const en = gloss.en || '';
    const hasAnno = !!findAnnotationByField(r.field_jp);
    if (hasAnno) tr.classList.add('has-anno');
    tr.innerHTML = `
      <td class="field-jp">${renderFieldWithFurigana(r.field_jp)}</td>
      <td class="field-en">${escapeHtml(en)}</td>
      <td class="value">${escapeHtml(r.parsed)}</td>
      <td class="unit">${escapeHtml(r.unit || '')}</td>
    `;
    tr.addEventListener('mouseenter', () => setActiveField(r.field_jp));
    tr.addEventListener('mouseleave', clearActiveField);
    tr.addEventListener('click', () => {
      const crop = findCropByField(pageId, r.field_jp);
      if (crop) openLightbox(crop.crop_path, `${r.field_jp} — source column crop`);
    });
    tbody.appendChild(tr);
  });
}

function renderHighlightLayer() {
  const layer = $('#highlight-layer');
  layer.innerHTML = '';
  const img = $('#page-img');
  if (!img.complete || !img.naturalWidth) {
    // Wait for image load
    img.addEventListener('load', renderHighlightLayer, { once: true });
    return;
  }

  // Compute the displayed image bounds inside its frame.
  // The img uses object-fit: contain inside .page-image-frame, so the
  // rendered image is centered with letterboxing on top/bottom OR left/right.
  const frame = $('#page-frame');
  const fW = frame.clientWidth;
  const fH = frame.clientHeight;
  const natW = img.naturalWidth;
  const natH = img.naturalHeight;
  const scale = Math.min(fW / natW, fH / natH);
  const dispW = natW * scale;
  const dispH = natH * scale;
  const offsetX = (fW - dispW) / 2;
  const offsetY = (fH - dispH) / 2;

  currentAnnotations.forEach(a => {
    if (!a.target || !a.target.selector) return;
    const box = parseXywh(a.target.selector.value);
    if (!box) return;
    const ident = (a.body || []).find(b => b.purpose === 'identifying')?.value || '';

    const div = document.createElement('div');
    div.className = 'highlight-box';
    div.dataset.fieldJp = ident;
    div.style.left = `${offsetX + box.x * scale}px`;
    div.style.top = `${offsetY + box.y * scale}px`;
    div.style.width = `${box.w * scale}px`;
    div.style.height = `${box.h * scale}px`;
    div.title = ident;

    div.addEventListener('mouseenter', () => setActiveField(ident));
    div.addEventListener('mouseleave', clearActiveField);
    div.addEventListener('click', () => {
      const crop = findCropByField(pages[currentPage].id, ident);
      if (crop) openLightbox(crop.crop_path, `${ident} — source column crop`);
    });
    layer.appendChild(div);
  });
}

function renderPageMeta(page) {
  $('#page-domain').textContent = `${page.domain_canonical} (${page.domain_en})`;
  $('#page-topic').textContent = `Table ${page.table_number} — ${page.page_topic}`;
  $('#page-book-page').textContent = `book p. ${page.book_page}`;
  $('#image-filename').textContent = `${page.image} • ${page.volume} PDF p${page.pdf_page}-${page.page_side}`;
  $('#page-summary').innerHTML = `
    <h3>Page summary</h3>
    <p><strong>${escapeHtml(page.page_header_kanji)}</strong> — ${escapeHtml(page.page_header_en)}</p>
    <p>${escapeHtml(page.page_summary_en)}</p>
  `;
}

function openLightbox(src, caption) {
  const lb = $('#lightbox');
  $('#lightbox-img').src = src;
  $('#lightbox-caption').textContent = caption || '';
  lb.hidden = false;
}

function closeLightbox() {
  $('#lightbox').hidden = true;
  $('#lightbox-img').src = '';
}

function loadPage(idx) {
  if (idx < 0 || idx >= pages.length) return;
  currentPage = idx;
  const page = pages[idx];

  $('#prev-page').disabled = idx === 0;
  $('#next-page').disabled = idx === pages.length - 1;
  $('#page-select').value = idx;

  renderPageMeta(page);

  currentAnnotations = annotationsByPage[page.id] || [];
  $('#highlight-layer').innerHTML = '';  // clear old highlights immediately

  // Reload the page image; the load event triggers renderHighlightLayer
  const img = $('#page-img');
  img.onload = () => renderHighlightLayer();
  img.src = `${page.image}?v=20260528d`;
  img.alt = `HI page — ${page.domain_canonical}, ${page.page_topic}`;

  renderExtractTable(page.id);
}

async function init() {
  try {
    const manifest = await loadJson('data/pages.json');
    pages = manifest.pages;
    extracts = await loadJson('data/master_extracts.json');
    glossary = await loadJson('data/hi_field_glossary.json');
    cropsManifest = await loadJson('data/crops_manifest.json');
    // Bulk-load all annotation files up front (only ~50 small files total)
    await Promise.all(pages.map(async p => {
      try {
        annotationsByPage[p.id] = await loadJson(`data/annotations/${p.id}.json`);
      } catch (e) {
        annotationsByPage[p.id] = [];
      }
    }));
  } catch (e) {
    document.body.innerHTML = `<p style="padding:40px;color:#c00">Failed to load viewer data: ${e.message}</p>`;
    return;
  }

  populatePageSelect();
  $('#page-select').addEventListener('change', (e) => loadPage(parseInt(e.target.value, 10)));
  $('#prev-page').addEventListener('click', () => loadPage(currentPage - 1));
  $('#next-page').addEventListener('click', () => loadPage(currentPage + 1));

  $('#page-img').addEventListener('click', (e) => {
    // Only opens lightbox if the click isn't on a highlight (highlight clicks open the crop)
    if (e.target === $('#page-img')) {
      openLightbox($('#page-img').src, `Full HI page — ${pages[currentPage].domain_canonical}`);
    }
  });
  $('#lightbox').addEventListener('click', closeLightbox);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
  window.addEventListener('resize', () => renderHighlightLayer());

  loadPage(0);
}

init();
