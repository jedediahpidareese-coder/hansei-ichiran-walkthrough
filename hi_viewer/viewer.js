/* HI page viewer — focal-4 sample
 *
 * Static-image + data-table architecture (crop-based verification):
 *
 *   Left pane:  the full HI page as a plain <img> (clickable → lightbox)
 *   Right pane: data table with an extra "Source column" cell on each row
 *               containing a JPG crop of that exact column from the source
 *               page. Reader visually confirms data ↔ source by reading
 *               the cropped kanji.
 *
 * No OpenSeadragon, no Annotorious, no coordinate-system overlays. The
 * cropped thumbnails are pre-rendered by outputs/scripts/generate_hi_viewer_crops.py
 * and saved under crops/<page_id>/, mapped by data/crops_manifest.json.
 */

let pages = [];
let extracts = {};
let glossary = {};
let cropsManifest = {};  // page_id -> [{ident, crop_path, x, y, w, h}]
let currentPage = 0;

const $ = (sel) => document.querySelector(sel);

async function loadJson(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`);
  return r.json();
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

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function findCropForField(pageId, fieldJp) {
  const entries = cropsManifest[pageId] || [];
  return entries.find(e => e.ident === fieldJp);
}

function renderExtractTable(pageId) {
  const tbody = $('#extract-rows');
  tbody.innerHTML = '';
  const rows = extracts[pageId] || [];
  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:#888;text-align:center;padding:20px">No MASTER extract rows recorded for this page.</td></tr>';
    return;
  }
  rows.forEach((r, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.fieldJp = r.field_jp;
    const gloss = glossary[r.field_jp] || {};
    const en = gloss.en || '';
    const crop = findCropForField(pageId, r.field_jp);
    const cropCell = crop
      ? `<img class="col-crop" src="${escapeHtml(crop.crop_path)}" alt="source column for ${escapeHtml(r.field_jp)}" data-field="${escapeHtml(r.field_jp)}" title="Click to enlarge" />`
      : '';
    tr.innerHTML = `
      <td class="field-jp">${renderFieldWithFurigana(r.field_jp)}</td>
      <td class="field-en">${escapeHtml(en)}</td>
      <td class="value">${escapeHtml(r.parsed)}</td>
      <td class="unit">${escapeHtml(r.unit || '')}</td>
      <td class="crop-cell">${cropCell}</td>
    `;
    tr.title = `raw: ${r.raw || ''}\n${r.notes || ''}\nconfidence: ${r.confidence || '—'}`;
    tbody.appendChild(tr);
    if (!crop) tr.classList.add('no-crop-row');
  });

  // Click any crop thumbnail → open in lightbox at full size
  tbody.querySelectorAll('.col-crop').forEach(img => {
    img.addEventListener('click', () => openLightbox(img.src, `${img.dataset.field} — source column crop`));
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

async function loadPage(idx) {
  if (idx < 0 || idx >= pages.length) return;
  currentPage = idx;
  const page = pages[idx];

  $('#prev-page').disabled = idx === 0;
  $('#next-page').disabled = idx === pages.length - 1;
  $('#page-select').value = idx;

  renderPageMeta(page);
  $('#page-img').src = page.image;
  $('#page-img').alt = `HI page — ${page.domain_canonical}, ${page.page_topic}`;

  renderExtractTable(page.id);
}

async function init() {
  try {
    const manifest = await loadJson('data/pages.json');
    pages = manifest.pages;
    extracts = await loadJson('data/master_extracts.json');
    glossary = await loadJson('data/hi_field_glossary.json');
    cropsManifest = await loadJson('data/crops_manifest.json');
  } catch (e) {
    document.body.innerHTML = `<p style="padding:40px;color:#c00">Failed to load viewer data: ${e.message}</p>`;
    return;
  }

  populatePageSelect();
  $('#page-select').addEventListener('change', (e) => loadPage(parseInt(e.target.value, 10)));
  $('#prev-page').addEventListener('click', () => loadPage(currentPage - 1));
  $('#next-page').addEventListener('click', () => loadPage(currentPage + 1));

  // Lightbox: click the full page image, or any crop, to enlarge
  $('#page-img').addEventListener('click', () => {
    openLightbox($('#page-img').src, `Full HI page — ${pages[currentPage].domain_canonical}`);
  });
  $('#lightbox').addEventListener('click', closeLightbox);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });

  await loadPage(0);
}

init();
