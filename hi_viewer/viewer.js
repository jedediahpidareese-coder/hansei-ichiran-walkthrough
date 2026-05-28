/* HI page viewer — focal-4 sample
 *
 * Loads:
 *   data/pages.json           — page manifest (sequence, image path, metadata)
 *   data/master_extracts.json — per-page MASTER rows for the side table
 *   data/annotations/<page_id>.json — W3C-flavored annotations for each page
 *
 * State:
 *   currentPage    : index into pages.json
 *   currentLang    : 'kanji' | 'modern_jp' | 'en'
 *   viewer         : OpenSeadragon instance (rebuilt on page change)
 *   anno           : Annotorious instance (rebuilt on page change)
 */

let pages = [];
let extracts = {};
let viewer = null;
let anno = null;
let currentPage = 0;
let currentLang = 'en';

const $ = (sel) => document.querySelector(sel);

async function loadJson(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`);
  return r.json();
}

async function loadAnnotations(pageId) {
  try {
    return await loadJson(`data/annotations/${pageId}.json`);
  } catch (e) {
    // No annotations file yet — return empty
    return [];
  }
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

function renderExtractTable(pageId) {
  const tbody = $('#extract-rows');
  tbody.innerHTML = '';
  const rows = extracts[pageId] || [];
  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="color:#888;text-align:center;padding:20px">No MASTER extract rows recorded for this page.</td></tr>';
    return;
  }
  rows.forEach((r, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.extractIdx = idx;
    tr.dataset.fieldJp = r.field_jp;
    const confClass = `conf-${r.confidence || 'low'}`;
    tr.innerHTML = `
      <td class="field-jp">${escapeHtml(r.field_jp)}</td>
      <td class="value">${escapeHtml(r.parsed)}</td>
      <td class="unit">${escapeHtml(r.unit || '')}</td>
      <td><span class="${confClass}">${escapeHtml(r.confidence || '—')}</span></td>
    `;
    tr.title = `raw: ${r.raw || ''}\n${r.notes || ''}`;
    tr.addEventListener('click', () => onExtractRowClick(r));
    tbody.appendChild(tr);
  });
}

function onExtractRowClick(row) {
  // If an annotation links to this field_jp, zoom to it
  if (!anno) return;
  const annotations = anno.getAnnotations();
  const match = annotations.find(a => {
    const linked = (a.body || []).find(b => b.purpose === 'identifying' && b.value === row.field_jp);
    return !!linked;
  });
  if (match && match.target && match.target.selector) {
    const sel = match.target.selector.value;
    const m = sel.match(/xywh=pixel:([0-9.]+),([0-9.]+),([0-9.]+),([0-9.]+)/);
    if (m && viewer) {
      const [_, x, y, w, h] = m.map(Number);
      const imgPt = viewer.viewport.imageToViewportRectangle(x, y, w, h);
      viewer.viewport.fitBounds(imgPt, false);
    }
  }
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
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

function buildAnnotationPopup(annotation) {
  // annotation.body is an array; we pull kanji, modern_jp, en, value, field_jp
  const bodyByPurpose = {};
  (annotation.body || []).forEach(b => {
    const key = b.purpose || 'unknown';
    bodyByPurpose[key] = b.value;
  });

  // Choose primary text by current language
  let primary = '';
  if (currentLang === 'kanji') primary = bodyByPurpose['transcribing'] || bodyByPurpose['describing'] || '';
  else if (currentLang === 'modern_jp') primary = bodyByPurpose['modern_jp_reading'] || bodyByPurpose['describing'] || '';
  else primary = bodyByPurpose['english_translation'] || bodyByPurpose['describing'] || '';

  const kanji = bodyByPurpose['transcribing'] || '';
  const modernJp = bodyByPurpose['modern_jp_reading'] || '';
  const en = bodyByPurpose['english_translation'] || '';
  const value = bodyByPurpose['extracted_value'] || '';
  const fieldJp = bodyByPurpose['identifying'] || '';

  return `
    <div class="annotation-body">
      ${kanji ? `<div class="anno-kanji">${escapeHtml(kanji)}</div>` : ''}
      ${modernJp ? `<div class="anno-modern-jp"><strong>現代語:</strong> ${escapeHtml(modernJp)}</div>` : ''}
      ${en ? `<div class="anno-en">${escapeHtml(en)}</div>` : ''}
      ${value ? `<div class="anno-meta">Extracted: <span class="anno-value">${escapeHtml(value)}</span> ${fieldJp ? `(MASTER field: <code>${escapeHtml(fieldJp)}</code>)` : ''}</div>` : ''}
    </div>
  `;
}

async function loadPage(idx) {
  if (idx < 0 || idx >= pages.length) return;
  currentPage = idx;
  const page = pages[idx];

  // Update nav state
  $('#prev-page').disabled = idx === 0;
  $('#next-page').disabled = idx === pages.length - 1;
  $('#page-select').value = idx;

  renderPageMeta(page);
  renderExtractTable(page.id);

  // Destroy existing viewer + anno
  if (anno) { anno.destroy(); anno = null; }
  if (viewer) { viewer.destroy(); viewer = null; }

  // Build OpenSeadragon with simple image source
  viewer = OpenSeadragon({
    id: 'osd-viewer',
    prefixUrl: 'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/',
    tileSources: { type: 'image', url: page.image },
    showNavigator: true,
    navigatorPosition: 'BOTTOM_LEFT',
    navigatorHeight: '100px',
    navigatorWidth: '80px',
    visibilityRatio: 1,
    minZoomLevel: 0.5,
    defaultZoomLevel: 0.9,
    constrainDuringPan: true,
  });

  // Initialize Annotorious overlaid on the OSD viewer
  anno = OpenSeadragon.Annotorious(viewer, {
    readOnly: true,
    formatters: [(annotation) => {
      return { 'data-purpose': 'hi-annotation' };
    }],
  });

  // Custom popup
  anno.on('mouseEnterAnnotation', (annotation, element) => {
    const popup = document.createElement('div');
    popup.className = 'a9s-popup';
    popup.innerHTML = buildAnnotationPopup(annotation);
    popup.style.position = 'absolute';
    popup.style.left = (element.getBoundingClientRect().right + 10) + 'px';
    popup.style.top = element.getBoundingClientRect().top + 'px';
    popup.style.background = 'white';
    popup.style.border = '1px solid #888';
    popup.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    popup.style.zIndex = 9999;
    popup.id = 'hi-anno-popup';
    document.body.appendChild(popup);

    // Highlight matching row in side table
    const fieldJp = (annotation.body || []).find(b => b.purpose === 'identifying')?.value;
    if (fieldJp) {
      document.querySelectorAll('.extract-table tr').forEach(tr => {
        tr.classList.toggle('linked-highlight', tr.dataset.fieldJp === fieldJp);
      });
    }
  });

  anno.on('mouseLeaveAnnotation', () => {
    const popup = document.getElementById('hi-anno-popup');
    if (popup) popup.remove();
    document.querySelectorAll('.extract-table tr.linked-highlight').forEach(tr => {
      tr.classList.remove('linked-highlight');
    });
  });

  // Load annotations for this page
  const annotations = await loadAnnotations(page.id);
  if (annotations && annotations.length > 0) {
    // Normalize to W3C-compliant shape: each body item needs type: 'TextualBody'.
    // Our annotation JSON files omit this for brevity; add it here.
    annotations.forEach(a => {
      if (!a['@context']) a['@context'] = 'http://www.w3.org/ns/anno.jsonld';
      (a.body || []).forEach(b => {
        if (!b.type) b.type = 'TextualBody';
      });
    });
    anno.setAnnotations(annotations);
  }
}

async function init() {
  try {
    const manifest = await loadJson('data/pages.json');
    pages = manifest.pages;
    extracts = await loadJson('data/master_extracts.json');
  } catch (e) {
    document.body.innerHTML = `<p style="padding:40px;color:#c00">Failed to load viewer data: ${e.message}</p>`;
    return;
  }

  populatePageSelect();

  $('#page-select').addEventListener('change', (e) => loadPage(parseInt(e.target.value, 10)));
  $('#prev-page').addEventListener('click', () => loadPage(currentPage - 1));
  $('#next-page').addEventListener('click', () => loadPage(currentPage + 1));
  $('#lang-select').addEventListener('change', (e) => {
    currentLang = e.target.value;
    // No-op rerender required because popups regenerate on hover
  });

  await loadPage(0);
}

init();
