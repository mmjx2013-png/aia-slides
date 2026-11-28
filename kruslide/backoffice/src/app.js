{
'use strict';
/* KruSlide back office: catalog + work-order console. Data comes from build.py (#bo-data). No network. */
const D = JSON.parse(document.getElementById('bo-data').textContent);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (id, cls = 'ic') => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
const NF = new Intl.NumberFormat('en-US');
const num = n => NF.format(n);

/* ---------- storage (may be missing or throw inside the viewer) ---------- */
const store = {
  ok: (() => { try { localStorage.setItem('ksbo:t', '1'); localStorage.removeItem('ksbo:t'); return true; } catch (e) { return false; } })(),
  get(k, d) { try { const v = localStorage.getItem('ksbo:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ksbo:' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
};

/* ---------- words ---------- */
const STR = {
  th: {
    backoffice: 'หลังบ้าน', see: 'ดู', search_all: 'ค้นหารหัสหรือชื่อ', close: 'ปิด', built: 'สร้างเมื่อ {0}',
    add: 'ใส่ในใบสั่งงาน', in_order: 'อยู่ในใบสั่งงาน', open: 'เปิด', open_live: 'เปิดดูสด', all: 'ทั้งหมด',
    hint_slides: 'เปลี่ยนสไลด์', hint_img: 'เลื่อนดูภาพ', slide_n: 'สไลด์ {0}', n_slides: '{0} สไลด์', more: '+{0}',
    ov_sub: 'ทุกอย่างที่ Claude ทำไว้ เปิดดูสดและหยิบรหัสไปสั่งงานได้ทันที · อัปเดต {0}', new_order: 'สร้างใบสั่งงาน',
    k_samples: 'ตัวอย่างบทเรียน', k_samples_s: 'เปิดดูสดได้ทุกชุด', k_styles: 'สไตล์', k_styles_s: '{0} สไตล์ขาย · {1} จากตัวอย่าง',
    k_mech: 'กลไก / เครื่องมือ', k_mech_s: '{0} มาตรฐาน · {1} ในตัวอย่าง', k_prod: 'ผลงานอื่น', k_prod_s: 'วิดีโอ เว็บ งานนำเสนอ แบรนด์',
    k_order: 'ใบสั่งงาน', k_order_s: '{0} รายการในใบนี้ · {1} ร่าง',
    recent: 'เพิ่มล่าสุด', status: 'สถานะงาน', doing: 'กำลังทำ', done: 'เสร็จแล้ว', see_all: 'ดูทั้งหมด',
    auto_found: 'build พบโฟลเดอร์ที่ยังไม่ครบ (ยังไม่ขึ้นในหลังบ้าน):', no_json: 'ยังไม่มี sample.json', missing: 'ขาด {0}',
    view_img: 'ดูภาพ', updated: 'อัปเดต {0}',
    keys: 'คีย์ลัด', k_search: 'ค้นหา', k_sec: 'สลับหมวด', k_close: 'ปิดหน้าต่าง', k_add: 'ใส่ใบสั่งงาน (ในช่องค้นหา)',
    s_sub: 'แตะภาพเพื่อเปิดดูสดในหน้านี้ ใช้ลูกศร ← → เปลี่ยนสไลด์', search_samples: 'ค้นหาชื่อ รหัส สไตล์…',
    subject: 'วิชา', level: 'ระดับ', mech: 'กลไก', sort_new: 'ใหม่ล่าสุด', sort_code: 'ตามรหัส', sort_name: 'ตามชื่อ', sort_level: 'ตามระดับ',
    showing: '{0} จาก {1}', view_grid: 'การ์ด', view_list: 'ตาราง', no_match: 'ไม่พบรายการที่ตรงกัน',
    col_code: 'รหัส', col_name: 'ชื่อ', col_style: 'สไตล์', col_mech: 'กลไก',
    st_sub: 'ทุกสไตล์ภาพที่ทำได้ สไตล์ที่ซ้ำกันรวมเป็นรหัสเดียว', st_sales: 'สไตล์ขาย A–F + ธีม', st_sample: 'สไตล์จากตัวอย่าง',
    search_styles: 'ค้นหาสไตล์…', used_in: 'ใช้ใน', live: 'พร้อมใช้', mockup: 'ภาพ mock-up', in_progress: 'กำลังทำ', none_yet: 'ยังไม่มีตัวอย่างสด',
    m_sub: 'ทุกแบบที่นักเรียนโต้ตอบบนจอได้ แตะชิปเพื่อเปิดดูในสไลด์จริง', search_mech: 'ค้นหากลไก…', see_in: 'ดูใน', coming: 'กำลังทำ: {0}',
    p_sub: 'งานอื่นนอกจากสไลด์บทเรียน พร้อมราคา', price: 'ราคา', public_link: 'ลิงก์สาธารณะ', copy_link: 'คัดลอกลิงก์',
    colors: 'สีแบรนด์ (แตะเพื่อคัดลอก)', fonts: 'ฟอนต์', not_deployed: 'ยังไม่ขึ้นออนไลน์: ดูจากภาพหน้าจอ',
    o_sub: 'เลือกงาน ใส่รหัสสไตล์ กลไก และตัวอย่าง แล้วคัดลอกใบสั่งงานไปให้ Claude', job: 'ประเภทงาน',
    book: 'หนังสือ', unit: 'หน่วย', topic: 'หัวข้อ / เรื่อง', school: 'ชื่อโรงเรียน', slides: 'จำนวนสไลด์', units: 'จำนวนหน่วย',
    minutes: 'ความยาว (นาที)', vkind: 'แบบวิดีโอ', v2d: '2D แอนิเมชัน', v3d: '3D / ภาพยนตร์', pages: 'จำนวนหน้า', package: 'แพ็กเกจเว็บ',
    lang: 'ภาษา', l_th: 'ไทย', l_en: 'อังกฤษ', l_both: 'ไทย + อังกฤษ', voice: 'เสียงบรรยาย', yes: 'มี', no: 'ไม่มี',
    extras: 'ส่วนเสริม', theme: 'ธีมโรงเรียน', answers: 'เฉลย + เว็บเฉลย', care: 'ดูแลเว็บ 1 ปี', deadline: 'กำหนดส่ง', notes: 'หมายเหตุถึง Claude',
    notes_ph: 'เช่น อยากให้หน้าแรกมีภาพถ่ายจริง เน้นให้นักเรียนตอบบนจอ…', details: 'รายละเอียดงาน', picked: 'รายการที่เลือก',
    quick_ph: 'พิมพ์รหัส เช่น M-05 ST-08 แล้วกด Enter', quick_add: 'เพิ่ม', picked_empty: 'ยังไม่ได้เลือก กด “+ ใส่ในใบสั่งงาน” ที่การ์ดไหนก็ได้ในแอป หรือพิมพ์รหัสด้านบน',
    g_style: 'สไตล์', g_mech: 'กลไก', g_sample: 'ตัวอย่างอ้างอิง', g_prod: 'ผลงานอ้างอิง',
    brief: 'ใบสั่งงานสำหรับ Claude', estimate: 'ราคาประเมิน', copy: 'คัดลอก', save: 'บันทึกร่าง', new: 'ใบใหม่', clear: 'ล้างรายการ',
    copied: 'คัดลอกแล้ว', copy_fail: 'คัดลอกอัตโนมัติไม่ได้ เลือกข้อความไว้ให้แล้ว กด Ctrl+C (⌘C)', saved: 'บันทึกร่างแล้ว',
    no_storage: 'หน้านี้บันทึกร่างในเครื่องไม่ได้ คัดลอกใบสั่งงานเก็บไว้แทน', drafts: 'ร่างที่บันทึกไว้', drafts_empty: 'ยังไม่มีร่าง',
    restore: 'เปิด', del: 'ลบ', added_x: 'เพิ่ม {0} แล้ว', unknown_x: 'ไม่พบรหัส {0}', go_order: 'ไปที่ใบสั่งงาน', items: '{0} รายการ',
    per_month: '/เดือน', per_year: '/ปี', once: 'ครั้งเดียว', monthly: 'รายเดือน', yearly: 'รายปี', baht: 'บาท', quote: 'ประเมินเพิ่ม',
    pr_sub: 'ราคาภายในจาก BRIEF.md (เจ้าของอนุมัติ 28 พ.ย. 2569) ใส่จำนวนเพื่อคำนวณ', pr_item: 'รายการ', pr_price: 'ราคา (บาท)',
    pr_qty: 'จำนวน', pr_sum: 'รวม', total: 'รวมทั้งหมด', reset: 'ล้าง', pr_note: 'ราคาตั้งต่ำโดยตั้งใจและอาจปรับขึ้นภายหลัง ห้ามพิมพ์วันหมดโปรโมชัน',
    copybox: 'คัดลอกข้อความนี้', palette_ph: 'พิมพ์รหัส (S-01, ST-08, M-05, P-01) หรือชื่อ…', p_enter: 'เปิด', p_shift: 'ใส่/เอาออกจากใบสั่งงาน',
    p_move: 'เลื่อน', section: 'หมวด', k_sample: 'ตัวอย่าง', k_style: 'สไตล์', k_mechanic: 'กลไก', k_product: 'ผลงาน',
  },
  en: {
    backoffice: 'Back office', see: 'See', search_all: 'Search codes or names', close: 'Close', built: 'Built {0}',
    add: 'Add to order', in_order: 'In the order', open: 'Open', open_live: 'Open live', all: 'All',
    hint_slides: 'change slide', hint_img: 'scroll the image', slide_n: 'slide {0}', n_slides: '{0} slides', more: '+{0}',
    ov_sub: 'Everything Claude has made: open it live and pick codes for a work order · updated {0}', new_order: 'New work order',
    k_samples: 'Lesson samples', k_samples_s: 'every one opens live', k_styles: 'Styles', k_styles_s: '{0} sales · {1} from samples',
    k_mech: 'Mechanics / tools', k_mech_s: '{0} standard · {1} in samples', k_prod: 'Other products', k_prod_s: 'video, web, decks, brand',
    k_order: 'Work order', k_order_s: '{0} items in this order · {1} drafts',
    recent: 'Recently added', status: 'Work status', doing: 'In progress', done: 'Done', see_all: 'See all',
    auto_found: 'The build found unfinished folders (not shown yet):', no_json: 'no sample.json yet', missing: 'missing {0}',
    view_img: 'View image', updated: 'updated {0}',
    keys: 'Shortcuts', k_search: 'search', k_sec: 'switch section', k_close: 'close', k_add: 'add to order (in search)',
    s_sub: 'Tap a picture to open it live here; ← → change slides', search_samples: 'Search name, code, style…',
    subject: 'Subject', level: 'Level', mech: 'Mechanic', sort_new: 'Newest', sort_code: 'By code', sort_name: 'By name', sort_level: 'By level',
    showing: '{0} of {1}', view_grid: 'Cards', view_list: 'Table', no_match: 'Nothing matches',
    col_code: 'Code', col_name: 'Name', col_style: 'Style', col_mech: 'Mechanics',
    st_sub: 'Every visual style we can make; duplicates share one code', st_sales: 'Sales styles A–F + theme', st_sample: 'Sample styles',
    search_styles: 'Search styles…', used_in: 'Used in', live: 'Live', mockup: 'Mock-up', in_progress: 'In progress', none_yet: 'No live sample yet',
    m_sub: 'Every way students interact on screen; tap a chip to see it in a real slide', search_mech: 'Search mechanics…', see_in: 'See it in', coming: 'coming: {0}',
    p_sub: 'Work beyond lesson slides, with prices', price: 'Price', public_link: 'Public link', copy_link: 'Copy link',
    colors: 'Brand colours (tap to copy)', fonts: 'Fonts', not_deployed: 'Not online yet: shown as screenshots',
    o_sub: 'Pick the job, add style, mechanic and sample codes, then copy the brief for Claude', job: 'Job type',
    book: 'Book', unit: 'Unit', topic: 'Topic', school: 'School name', slides: 'Slides', units: 'Units',
    minutes: 'Length (minutes)', vkind: 'Video kind', v2d: '2D animation', v3d: '3D / cinematic', pages: 'Pages', package: 'Website package',
    lang: 'Language', l_th: 'Thai', l_en: 'English', l_both: 'Thai + English', voice: 'Narration', yes: 'Yes', no: 'No',
    extras: 'Add-ons', theme: 'School theme', answers: 'Answer keys + site', care: 'Website care 1 year', deadline: 'Deadline', notes: 'Notes for Claude',
    notes_ph: 'e.g. real photos on the title slide, students answer on screen…', details: 'Job details', picked: 'Picked items',
    quick_ph: 'Type codes like M-05 ST-08 and press Enter', quick_add: 'Add', picked_empty: 'Nothing yet: press “+ Add to order” on any card, or type codes above',
    g_style: 'Styles', g_mech: 'Mechanics', g_sample: 'Reference samples', g_prod: 'Reference products',
    brief: 'Brief for Claude', estimate: 'Estimate', copy: 'Copy', save: 'Save draft', new: 'New order', clear: 'Clear items',
    copied: 'Copied', copy_fail: 'Automatic copy is blocked here; the text is selected, press Ctrl+C (⌘C)', saved: 'Draft saved',
    no_storage: 'This page cannot save drafts here; copy the brief instead', drafts: 'Saved drafts', drafts_empty: 'No drafts yet',
    restore: 'Open', del: 'Delete', added_x: 'Added {0}', unknown_x: 'Unknown code {0}', go_order: 'Go to the order', items: '{0} items',
    per_month: '/month', per_year: '/year', once: 'One-off', monthly: 'Monthly', yearly: 'Yearly', baht: 'baht', quote: 'quote',
    pr_sub: 'Internal price list from BRIEF.md (owner-approved 28 Nov 2026); enter quantities to calculate', pr_item: 'Item', pr_price: 'Price (baht)',
    pr_qty: 'Qty', pr_sum: 'Total', total: 'Total', reset: 'Reset', pr_note: 'Prices are low on purpose and may rise later. Never print a promotion end date.',
    copybox: 'Copy this text', palette_ph: 'Type a code (S-01, ST-08, M-05, P-01) or a name…', p_enter: 'open', p_shift: 'add to / remove from order',
    p_move: 'move', section: 'Section', k_sample: 'Sample', k_style: 'Style', k_mechanic: 'Mechanic', k_product: 'Product',
  },
};
let lang = store.get('lang', 'th') === 'en' ? 'en' : 'th';
const t = (k, ...a) => { let s = STR[lang][k]; if (s == null) s = STR.th[k] == null ? k : STR.th[k]; a.forEach((v, i) => { s = s.split('{' + i + '}').join(v); }); return s; };
const L = (o, f) => { if (!o) return ''; const a = f ? o[f + '_' + lang] : o[lang]; const b = f ? o[f + '_th'] : o.th; return a || b || ''; };

/* ---------- indexes ---------- */
const SAMPLES = D.samples, STYLES = D.styles, MECHS = D.mechanics, PRODS = D.products;
const BY = new Map();
SAMPLES.forEach(o => BY.set(o.code, { kind: 'sample', o }));
STYLES.forEach(o => BY.set(o.code, { kind: 'style', o }));
MECHS.forEach(o => BY.set(o.code, { kind: 'mech', o }));
PRODS.forEach(o => BY.set(o.code, { kind: 'prod', o }));
const TAG_CODE = D.tag_code;
const CODE_TAG = Object.fromEntries(Object.entries(TAG_CODE).map(([k, v]) => [v, k]));
const SHORT = { th: { tap: 'แตะ', drag: 'ลาก', type: 'พิมพ์', draw: 'วาด', sort: 'จัดกลุ่ม', slider: 'แถบเลื่อน', sim: 'จำลอง', explore: 'สำรวจ', audio: 'เสียง' },
  en: { tap: 'Tap', drag: 'Drag', type: 'Type', draw: 'Draw', sort: 'Sort', slider: 'Slider', sim: 'Simulation', explore: 'Explore', audio: 'Sound' } };
const tagName = tag => SHORT[lang][tag] || tag;
const subj = k => (D.subjects[k] ? L(D.subjects[k]) : k);
const levelIdx = l => { const i = D.levels.indexOf(l); return i < 0 ? 99 : i; };
const codeNum = c => parseInt(String(c).split('-')[1], 10) || 0;
const repoPath = href => 'kruslide/' + href.replace(/index\.html(#.*)?$/, '');

const SECS = [
  { id: 'overview', icon: 'i-home', th: 'ภาพรวม', en: 'Overview' },
  { id: 'samples', icon: 'i-play', th: 'ตัวอย่าง', en: 'Samples', n: SAMPLES.length },
  { id: 'styles', icon: 'i-style', th: 'สไตล์', en: 'Styles', n: STYLES.length },
  { id: 'mechanics', icon: 'i-hand', th: 'กลไก / เครื่องมือ', en: 'Mechanics', n: MECHS.length },
  { id: 'products', icon: 'i-box', th: 'ผลงานอื่น', en: 'Other products', n: PRODS.length },
  { id: 'order', icon: 'i-order', th: 'สั่งงาน', en: 'Work order', pick: true },
  { id: 'prices', icon: 'i-tag', th: 'ราคา', en: 'Prices' },
];
const KIND_SEC = { sample: 'samples', style: 'styles', mech: 'mechanics', prod: 'products' };

/* ---------- state ---------- */
const UI0 = { samples: { q: '', subject: '', level: '', mech: '', sort: 'new', view: 'grid' }, styles: { tab: 'sales', q: '' }, mechanics: { tab: 'tools', q: '' }, products: { tab: 'video' }, prices: { qty: {} } };
const ui = store.get('ui', {});
Object.keys(UI0).forEach(k => { ui[k] = Object.assign({}, UI0[k], ui[k] || {}); });
const saveUi = () => store.set('ui', ui);
const JOBS = [
  { id: 'book', th: 'ทั้งเล่ม', en: 'Whole book' }, { id: 'unit', th: 'หน่วยเดียว', en: 'One unit' },
  { id: 'custom', th: 'หน่วยตามแผนครู', en: 'Custom unit' }, { id: 'video', th: 'วิดีโอ', en: 'Video' },
  { id: 'deck', th: 'งานนำเสนอ', en: 'Presentation' }, { id: 'web', th: 'เว็บไซต์', en: 'Website' },
];
const SLIDE_JOBS = ['book', 'unit', 'custom'];
const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `KS-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; };
const blankOrder = () => ({ id: stamp(), type: 'unit', subject: 'math', level: 'ม.1-3', book: '', unit: '', slides: 30, units: 1, minutes: 5, vkind: '2d', pages: 15, web: 'web10', lang: 'th', voice: false, theme: false, answers: false, care: false, deadline: '', notes: '', items: [], updated: Date.now() });
let order = Object.assign(blankOrder(), store.get('order', {}) || {});
order.items = (order.items || []).filter(c => BY.has(c));
let drafts = (store.get('drafts', []) || []).filter(d => d && d.id);
const saveOrder = () => { order.updated = Date.now(); store.set('order', order); };
let trayOpen = false, pendingFocus = null, lastSec = null;

/* ---------- small builders ---------- */
const PRICE = Object.fromEntries(D.prices.items.map(p => [p.id, p]));
const range = (a, b) => (a === b ? num(a) : num(a) + '–' + num(b));
const priceText = p => `${range(p.min, p.max)} ${t('baht')} / ${L(p, 'per')}`;
function addBtn(code, short) {
  const on = order.items.includes(code);
  return `<button type="button" class="add" data-act="add" data-code="${code}" aria-pressed="${on}">${icon(on ? 'i-check' : 'i-plus')}<span>${on ? t('in_order') : t('add')}</span></button>`;
}
function syncAdds() {
  $$('[data-act="add"]').forEach(b => {
    const on = order.items.includes(b.dataset.code);
    b.setAttribute('aria-pressed', on);
    b.innerHTML = `${icon(on ? 'i-check' : 'i-plus')}<span>${on ? t('in_order') : t('add')}</span>`;
  });
  renderNav(); renderTray();
}
function head(title, sub, acts) {
  return `<header class="sec-head"><div class="grow"><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${acts ? `<div class="acts">${acts}</div>` : ''}</header>`;
}
function searchField(id, val, ph, sec) {
  return `<label class="field">${icon('i-search')}<span class="sr">${esc(ph)}</span><input class="input" id="${id}" type="search" value="${esc(val)}" placeholder="${esc(ph)}" data-in="q" data-sec="${sec}" autocomplete="off"></label>`;
}
function tabsHtml(list, cur, sec) {
  return `<div class="tabs" role="tablist">${list.map(x => `<button type="button" role="tab" data-act="tab" data-sec="${sec}" data-v="${x.id}" aria-selected="${cur === x.id}">${esc(x.label)}${x.n != null ? `<span class="n">${x.n}</span>` : ''}</button>`).join('')}</div>`;
}
const sampleThumb = (s, extra = '') => `<button type="button" class="thumb strip" data-act="open" data-code="${s.code}" aria-label="${esc(t('open_live') + ': ' + L(s))}">
  <img src="${s.strip}" alt="" loading="lazy" decoding="async"><span class="play">${icon('i-tri')}${t('open_live')}</span>${extra}</button>`;
function linkChip(l) {
  if (l.s) {
    const s = BY.get(l.s) && BY.get(l.s).o; if (!s) return '';
    const sub = l.n ? t('slide_n', l.n) : '';
    return `<button type="button" class="lk" data-act="open" data-code="${s.code}" data-href="${s.href}${l.n ? '#' + l.n : ''}" data-sub="${esc(sub)}" title="${esc(L(s))}"><b>${s.code}</b><span>${esc(L(s))}</span>${sub ? `<span class="sub">· ${esc(sub)}</span>` : ''}</button>`;
  }
  if (l.x) {
    const x = D.extras[l.x]; if (!x) return '';
    const sub = l.n ? t('slide_n', l.n) : '';
    return `<button type="button" class="lk" data-act="open" data-href="${x.href}${l.n ? '#' + l.n : ''}" data-title="${esc(L(x))}" data-sub="${esc(sub)}"><b>${esc(l.x === 'unit4' ? 'Unit 4' : L(x))}</b>${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</button>`;
  }
  if (l.p) {
    const p = BY.get(l.p) && BY.get(l.p).o; if (!p) return '';
    return `<button type="button" class="lk" data-act="card" data-code="${p.code}"><b>${p.code}</b><span>${esc(L(p))}</span></button>`;
  }
  if (l.url) return `<a class="lk" href="${esc(l.url)}" rel="noopener noreferrer">${icon('i-ext')}<span>${esc(L(l))}</span></a>`;
  return '';
}
function chipList(links, max, id) {
  const html = links.map(linkChip).filter(Boolean);
  if (html.length <= max) return html.join('');
  return html.slice(0, max).join('') + `<button type="button" class="lk more" data-act="more" data-id="${id}" data-rest="${esc(JSON.stringify(links.slice(max)))}">${t('more', html.length - max)}</button>`;
}
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2200); }

/* ---------- copy (clipboard only from a click; fallback to a selected textarea) ---------- */
function copyText(text, fallbackEl, msgEl) {
  const done = ok => {
    if (ok) { if (msgEl) { msgEl.className = 'msg ok'; msgEl.textContent = t('copied'); } toast(t('copied')); return; }
    let el = fallbackEl;
    if (!el) { showCopyBox(text); return; }
    el.focus(); el.select();
    let ok2 = false; try { ok2 = document.execCommand('copy'); } catch (e) { ok2 = false; }
    if (msgEl) { msgEl.className = 'msg ' + (ok2 ? 'ok' : 'no'); msgEl.textContent = ok2 ? t('copied') : t('copy_fail'); }
    if (ok2) toast(t('copied'));
  };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(() => done(true), () => done(false)); return; }
  } catch (e) { /* fall through */ }
  done(false);
}
function showCopyBox(text) {
  let box = $('#copybox');
  if (!box) {
    box = document.createElement('div'); box.id = 'copybox'; box.className = 'tray open';
    box.style.cssText = 'left:50%;right:auto;transform:translateX(-50%);bottom:80px;z-index:70';
    document.body.appendChild(box);
  }
  box.hidden = false;
  box.innerHTML = `<div class="tray-hd"><span>${t('copybox')}</span><span class="sp"></span><button type="button" class="btn sm" data-act="copybox-x">${t('close')}</button></div><div class="tray-bd" style="display:flex"><textarea class="textarea" rows="2" readonly>${esc(text)}</textarea><p class="msg no">${t('copy_fail')}</p></div>`;
  const ta = $('textarea', box); ta.focus(); ta.select();
}

/* ---------- nav, tray ---------- */
function renderNav() {
  const cur = currentSec();
  const item = (s, chip) => {
    const n = s.pick ? (order.items.length ? `<span class="n pick">${order.items.length}</span>` : '') : (s.n != null && !chip ? `<span class="n">${s.n}</span>` : '');
    return `<a href="#${s.id}" ${cur === s.id ? 'aria-current="page"' : ''}>${chip ? '' : icon(s.icon)}<span>${esc(L(s))}</span>${n}</a>`;
  };
  $('#nav').innerHTML = SECS.map(s => item(s, false)).join('');
  $('#chipnav').innerHTML = SECS.map(s => item(s, true)).join('');
  $$('[data-act="lang"]').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === lang));
  $('#built').textContent = t('built', lang === 'th' ? D.meta.built_th : D.meta.built);
  $$('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
  document.documentElement.lang = lang;
}
function itemName(code) { const x = BY.get(code); return x ? L(x.o) : code; }
function groupedItems() {
  const g = { style: [], mech: [], sample: [], prod: [] };
  order.items.forEach(c => { const x = BY.get(c); if (x) g[x.kind].push(c); });
  return g;
}
const GROUP_LABEL = { style: 'g_style', mech: 'g_mech', sample: 'g_sample', prod: 'g_prod' };
function pickedHtml() {
  const g = groupedItems();
  if (!order.items.length) return `<p class="sub">${t('picked_empty')}</p>`;
  return Object.keys(g).filter(k => g[k].length).map(k => `<div class="pk-grp">${t(GROUP_LABEL[k])}</div>` + g[k].map(c =>
    `<div class="pk"><span class="code">${c}</span><span class="nm">${esc(itemName(c))}</span><button type="button" class="x" data-act="rm" data-code="${c}" aria-label="${esc(t('del') + ' ' + c)}">${icon('i-x')}</button></div>`).join('')).join('');
}
function renderTray() {
  const tray = $('#tray');
  const hide = !order.items.length || currentSec() === 'order';
  tray.hidden = hide;
  if (hide) return;
  tray.classList.toggle('open', trayOpen);
  tray.innerHTML = `<button type="button" class="tray-hd" data-act="tray" aria-expanded="${trayOpen}">${icon('i-order')}<span>${t('k_order')}</span><span class="n">${order.items.length}</span><span class="sp"></span>${icon('i-chev', 'ic chev')}</button>
    <div class="tray-bd">${pickedHtml()}</div>
    <div class="tray-ft"><button type="button" class="btn" data-act="clear">${t('clear')}</button><a class="btn pri" href="#order">${t('go_order')} →</a></div>`;
}

/* ---------- router ---------- */
function currentSec() { const h = location.hash.slice(1); return SECS.some(s => s.id === h) ? h : 'overview'; }
const view = $('#view');
function render() {
  const sec = currentSec();
  renderNav();
  const fresh = sec !== lastSec;
  ({ overview: renderOverview, samples: renderSamples, styles: renderStyles, mechanics: renderMechanics, products: renderProducts, order: renderOrder, prices: renderPrices })[sec]();
  renderTray();
  if (fresh) { window.scrollTo(0, 0); if (lastSec !== null && !pendingFocus) view.focus({ preventScroll: true }); }
  lastSec = sec;
  if (pendingFocus) {
    const el = $(`[data-card="${pendingFocus}"]`, view); pendingFocus = null;
    if (el) { el.scrollIntoView({ block: 'center' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); const f = $('button, a', el); if (f) f.focus({ preventScroll: true }); }
  }
}
function rerender() {
  const a = document.activeElement; let sel = null;
  if (a && a !== document.body && view.contains(a)) {
    if (a.id) sel = '#' + CSS.escape(a.id);
    else if (a.dataset.act) sel = ['act', 'sec', 'k', 'v', 'code', 'id'].filter(k => a.dataset[k] != null).map(k => `[data-${k}="${CSS.escape(a.dataset[k])}"]`).join('');
  }
  render();
  if (sel) { const n = $(sel, view); if (n) n.focus({ preventScroll: true }); }
}
function go(sec) { if (location.hash.slice(1) !== sec) location.hash = sec; else render(); }
function focusCard(code) {
  const x = BY.get(code); if (!x) return;
  if (x.kind === 'sample') Object.assign(ui.samples, { q: '', subject: '', level: '', mech: '', view: 'grid' });
  if (x.kind === 'style') Object.assign(ui.styles, { tab: 'all', q: '' });
  if (x.kind === 'mech') Object.assign(ui.mechanics, { tab: 'all', q: '' });
  if (x.kind === 'prod') ui.products.tab = x.o.tab;
  pendingFocus = code; go(KIND_SEC[x.kind]);
}

/* ---------- 1. overview ---------- */
function openStatus(it) {
  if (!it.open) return '';
  if (D.extras[it.open]) return `<button type="button" class="btn sm" data-act="open" data-href="${D.extras[it.open].href}" data-title="${esc(L(D.extras[it.open]))}">${t('open')}</button>`;
  const s = SAMPLES.find(x => x.slug === it.open || x.dir === it.open);
  if (s) return `<button type="button" class="btn sm" data-act="open" data-code="${s.code}">${t('open')}</button>`;
  if (BY.has(it.open)) return `<button type="button" class="btn sm" data-act="card" data-code="${it.open}">${t('see')} ${it.open}</button>`;
  return '';
}
function renderOverview() {
  const sales = STYLES.filter(s => s.kind === 'sales').length;
  const std = MECHS.filter(m => m.group === 'tools').length;
  const recent = SAMPLES.slice().sort((a, b) => (b.added > a.added ? 1 : b.added < a.added ? -1 : codeNum(b.code) - codeNum(a.code))).slice(0, 6);
  const st = D.status.items;
  const stRow = it => `<div class="st ${it.state}"><i class="dot"></i><div><span>${esc(L(it))}</span>${L(it, 'wait') ? `<span class="w">${esc(L(it, 'wait'))}</span>` : ''}</div><span class="acts">${it.image ? `<button type="button" class="btn sm" data-act="img" data-src="${it.image}" data-title="${esc(L(it))}">${icon('i-img')}${t('view_img')}</button>` : ''}${openStatus(it)}</span></div>`;
  const inc = D.incomplete.map(i => `<b>${esc(i.dir)}</b> (${esc(i.why === 'no sample.json yet' ? t('no_json') : t('missing', i.why))})`).join(', ');
  view.innerHTML = head(L(SECS[0]), esc(t('ov_sub', lang === 'th' ? D.meta.built_th : D.meta.built)), `<a class="btn pri" href="#order">${icon('i-order')}${t('new_order')}</a>`) +
  `<div class="kpis">
    <a class="kpi" href="#samples"><b>${SAMPLES.length}</b><span>${t('k_samples')}</span><small>${t('k_samples_s')}</small></a>
    <a class="kpi" href="#styles"><b>${STYLES.length}</b><span>${t('k_styles')}</span><small>${t('k_styles_s', sales, STYLES.length - sales)}</small></a>
    <a class="kpi" href="#mechanics"><b>${MECHS.length}</b><span>${t('k_mech')}</span><small>${t('k_mech_s', std, MECHS.length - std)}</small></a>
    <a class="kpi" href="#products"><b>${PRODS.length}</b><span>${t('k_prod')}</span><small>${t('k_prod_s')}</small></a>
    <a class="kpi hi" href="#order"><b>${order.items.length}</b><span>${t('k_order')}</span><small>${t('k_order_s', order.items.length, drafts.length)}</small></a>
  </div>
  <div class="ov">
    <section class="panel"><h2>${t('recent')}<a class="btn sm ghost" href="#samples">${t('see_all')} →</a></h2><div class="rows">
      ${recent.map(s => `<div class="row"><button type="button" class="tn" data-act="open" data-code="${s.code}" aria-label="${esc(t('open_live') + ': ' + L(s))}"><img src="${s.strip}" alt="" loading="lazy"></button>
        <div class="tx"><b><span class="code lite">${s.code}</span> ${esc(L(s))}</b><small>${esc(s.level)} · ${esc(subj(s.subject))} · ${esc(lang === 'th' ? s.added_th : s.added)}</small></div>${addBtn(s.code)}</div>`).join('')}
    </div></section>
    <section class="panel"><h2>${t('status')}<span class="sub">${esc(t('updated', D.status.updated))}</span></h2>
      <div class="status"><div><h3><i class="dot" style="width:8px;height:8px;border-radius:50%;background:var(--sun)"></i>${t('doing')}</h3>${st.filter(i => i.state !== 'done').map(stRow).join('')}</div>
      <div><h3><i class="dot" style="width:8px;height:8px;border-radius:50%;background:var(--ok)"></i>${t('done')}</h3>${st.filter(i => i.state === 'done').map(stRow).join('')}</div></div>
      ${inc ? `<p class="auto">${t('auto_found')} ${inc}</p>` : ''}
    </section>
  </div>
  <div class="keys"><b>${t('keys')}</b><span><kbd>/</kbd><kbd>Ctrl</kbd>+<kbd>K</kbd> ${t('k_search')}</span><span><kbd>1</kbd>–<kbd>7</kbd> ${t('k_sec')}</span><span><kbd>Esc</kbd> ${t('k_close')}</span><span><kbd>Shift</kbd>+<kbd>Enter</kbd> ${t('k_add')}</span></div>`;
}

/* ---------- 2. samples ---------- */
function sampleMatches(s, q) {
  if (!q) return true;
  const st = BY.get(s.style);
  const hay = [s.code, s.slug, s.th, s.en, s.level, subj(s.subject), s.style_th, s.style_en, s.style, st && st.o.th, st && st.o.en, s.blurb_th, s.blurb_en, ...s.tags.map(tagName), ...s.mech].join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).every(w => hay.includes(w));
}
function filteredSamples() {
  const f = ui.samples;
  let list = SAMPLES.filter(s => (!f.subject || s.subject === f.subject) && (!f.level || s.level === f.level) && (!f.mech || s.mech.includes(f.mech)) && sampleMatches(s, f.q.trim()));
  const by = { new: (a, b) => (b.added > a.added ? 1 : b.added < a.added ? -1 : codeNum(b.code) - codeNum(a.code)), code: (a, b) => codeNum(a.code) - codeNum(b.code), name: (a, b) => L(a).localeCompare(L(b), lang), level: (a, b) => levelIdx(a.level) - levelIdx(b.level) || codeNum(a.code) - codeNum(b.code) }[f.sort] || (() => 0);
  return list.sort(by);
}
function sampleCard(s) {
  const st = BY.get(s.style);
  return `<article class="card" data-card="${s.code}">${sampleThumb(s)}
    <div class="cbody"><h3><span class="code">${s.code}</span>${esc(L(s))}</h3><p class="meta">${esc(s.level)} · ${esc(subj(s.subject))}${s.slides ? ' · ' + t('n_slides', s.slides) : ''}</p>
      ${st ? `<div class="styleline"><span class="code lite">${st.o.code}</span><span>${esc(L(st.o))}</span></div>` : ''}
      <div class="tags">${s.tags.map(tg => `<span class="tag" title="${esc(TAG_CODE[tg] || '')}">${esc(tagName(tg))}</span>`).join('')}</div></div>
    <div class="cfoot">${addBtn(s.code)}<span class="sp"></span><button type="button" class="btn sm" data-act="open" data-code="${s.code}">${t('open')}</button></div></article>`;
}
function sampleRow(s) {
  const st = BY.get(s.style);
  return `<tr data-card="${s.code}"><td><button type="button" class="tn" data-act="open" data-code="${s.code}" aria-label="${esc(t('open_live') + ': ' + L(s))}"><img src="${s.strip}" alt="" loading="lazy"></button></td>
    <td><span class="code">${s.code}</span></td><td><b style="font-weight:600">${esc(L(s))}</b></td><td style="white-space:nowrap">${esc(s.level)}</td><td class="hide-sm">${esc(subj(s.subject))}</td>
    <td class="hide-sm">${st ? `<span class="code lite">${st.o.code}</span> ${esc(L(st.o))}` : ''}</td><td class="hide-sm"><div class="tags">${s.tags.map(tg => `<span class="tag">${esc(tagName(tg))}</span>`).join('')}</div></td><td>${addBtn(s.code)}</td></tr>`;
}
function renderSampleResults() {
  const list = filteredSamples();
  const box = $('#s-res'); if (!box) return;
  $('#s-count').textContent = t('showing', list.length, SAMPLES.length);
  if (!list.length) { box.innerHTML = `<div class="empty">${t('no_match')}</div>`; return; }
  box.innerHTML = ui.samples.view === 'list'
    ? `<table class="tbl"><thead><tr><th></th><th>${t('col_code')}</th><th>${t('col_name')}</th><th>${t('level')}</th><th class="hide-sm">${t('subject')}</th><th class="hide-sm">${t('col_style')}</th><th class="hide-sm">${t('col_mech')}</th><th></th></tr></thead><tbody>${list.map(sampleRow).join('')}</tbody></table>`
    : `<div class="grid">${list.map(sampleCard).join('')}</div>`;
}
function renderSamples() {
  const f = ui.samples;
  const subjects = [...new Set(SAMPLES.map(s => s.subject))].sort((a, b) => subj(a).localeCompare(subj(b), lang));
  const levels = D.levels.filter(l => SAMPLES.some(s => s.level === l));
  const mechCodes = [...new Set(SAMPLES.flatMap(s => s.mech))].sort((a, b) => codeNum(a) - codeNum(b));
  const cnt = (k, v) => SAMPLES.filter(s => (k === 'mech' ? s.mech.includes(v) : s[k] === v)).length;
  const chip = (k, v, label, n) => `<button type="button" class="chip" data-act="f" data-k="${k}" data-v="${esc(v)}" aria-pressed="${f[k] === v}">${esc(label)}${n != null ? `<span class="n">${n}</span>` : ''}</button>`;
  view.innerHTML = head(`${L(SECS[1])} (${SAMPLES.length})`, esc(t('s_sub'))) +
    `<div class="toolbar">${searchField('q-samples', f.q, t('search_samples'), 'samples')}
      <div class="seg" role="group" aria-label="${t('level')}">${['', ...levels].map(l => `<button type="button" data-act="f" data-k="level" data-v="${esc(l)}" aria-pressed="${f.level === l}">${esc(l || t('all'))}</button>`).join('')}</div>
      <label><span class="sr">sort</span><select class="select" data-in="sort">${['new', 'code', 'name', 'level'].map(k => `<option value="${k}" ${f.sort === k ? 'selected' : ''}>${t('sort_' + k)}</option>`).join('')}</select></label>
      <div class="seg" role="group" aria-label="view"><button type="button" data-act="f" data-k="view" data-v="grid" aria-pressed="${f.view === 'grid'}" title="${t('view_grid')}">${icon('i-grid')}</button><button type="button" data-act="f" data-k="view" data-v="list" aria-pressed="${f.view === 'list'}" title="${t('view_list')}">${icon('i-list')}</button></div>
      <span class="count" id="s-count"></span></div>
    <div class="chips"><span class="lbl">${t('subject')}</span>${chip('subject', '', t('all'))}${subjects.map(k => chip('subject', k, subj(k), cnt('subject', k))).join('')}</div>
    <div class="chips"><span class="lbl">${t('mech')}</span>${chip('mech', '', t('all'))}${mechCodes.map(c => chip('mech', c, CODE_TAG[c] ? tagName(CODE_TAG[c]) : L(BY.get(c).o), cnt('mech', c))).join('')}</div>
    <div id="s-res"></div>`;
  renderSampleResults();
}

/* ---------- 3. styles ---------- */
function styleThumb(st) {
  const img = st.img || [];
  if (img.length && img[0].strip) {
    const s = SAMPLES.find(x => x.strip === img[0].strip);
    return `<button type="button" class="thumb" data-act="open" data-code="${s ? s.code : ''}" ${s ? '' : 'disabled'} aria-label="${esc(t('open_live'))}"><img src="${img[0].strip}" alt="" loading="lazy">${s ? `<span class="play">${icon('i-tri')}${t('open_live')}</span>` : ''}</button>`;
  }
  if (img.length > 1) return `<div class="thumb trio">${img.map(i => `<button type="button" style="padding:0;border:0;background:none" data-act="img" data-src="${i.src}" data-title="${esc(L(st))}" data-fit="1"><img src="${i.src}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover"></button>`).join('')}</div>`;
  if (img.length) return `<button type="button" class="thumb" data-act="img" data-src="${img[0].src}" data-title="${esc(L(st))}" data-fit="1"><img src="${img[0].src}" alt="" loading="lazy"><span class="play">${icon('i-img')}${t('view_img')}</span></button>`;
  return `<div class="thumb"><div class="ph">${t('none_yet')}</div></div>`;
}
function styleCard(st) {
  const links = st.used.map(c => ({ s: c })).concat((st.opens || []).map(o => ({ x: o.x })));
  const pill = { live: `<span class="pill ok">${t('live')}</span>`, mockup: `<span class="pill blue">${t('mockup')}</span>`, doing: `<span class="pill warn">${t('in_progress')}</span>` }[st.status] || '';
  return `<article class="card stcard" data-card="${st.code}">${styleThumb(st)}
    <div class="cbody"><h3><span class="code">${st.code}</span>${st.letter ? `<span class="letter">${st.letter}</span>` : ''}<span>${esc(L(st))}</span><span class="en">${esc(lang === 'th' ? st.en : st.th)}</span></h3>
      <p class="desc">${esc(L(st, 'desc'))}</p>
      <div class="links">${links.length ? `<span class="sub" style="align-self:center">${t('used_in')}:</span>${chipList(links, 3, st.code)}` : `<span class="sub">${t('none_yet')}</span>`}</div></div>
    <div class="cfoot">${addBtn(st.code)}<span class="sp"></span>${pill}</div></article>`;
}
function renderStyleResults() {
  const f = ui.styles, q = f.q.trim().toLowerCase();
  const list = STYLES.filter(st => (f.tab === 'all' || st.kind === f.tab) && (!q || [st.code, st.letter, st.th, st.en, st.desc_th, st.desc_en, ...st.used.map(itemName)].join(' ').toLowerCase().includes(q)));
  $('#st-res').innerHTML = list.length ? `<div class="grid">${list.map(styleCard).join('')}</div>` : `<div class="empty">${t('no_match')}</div>`;
}
function renderStyles() {
  const f = ui.styles;
  const n = k => STYLES.filter(s => k === 'all' || s.kind === k).length;
  view.innerHTML = head(`${L(SECS[2])} (${STYLES.length})`, esc(t('st_sub'))) +
    tabsHtml([{ id: 'all', label: t('all'), n: n('all') }, { id: 'sales', label: t('st_sales'), n: n('sales') }, { id: 'sample', label: t('st_sample'), n: n('sample') }], f.tab, 'styles') +
    `<div class="toolbar">${searchField('q-styles', f.q, t('search_styles'), 'styles')}</div><div id="st-res"></div>`;
  renderStyleResults();
}

/* ---------- 4. mechanics ---------- */
function mechCard(m) {
  return `<article class="mcard" data-card="${m.code}"><div class="hd"><span class="code">${m.code}</span><div class="tx"><b>${esc(L(m))}</b><small>${esc(lang === 'th' ? m.en : m.th)}</small></div>${addBtn(m.code)}</div>
    ${L(m, 'desc') ? `<p>${esc(L(m, 'desc'))}</p>` : ''}
    <div class="links">${m.links.length ? chipList(m.links, 4, m.code) : ''}${m.coming.map(c => `<span class="lk soon">${esc(t('coming', c))}</span>`).join('')}</div></article>`;
}
function renderMechResults() {
  const f = ui.mechanics, q = f.q.trim().toLowerCase();
  const match = m => !q || [m.code, m.th, m.en, m.desc_th, m.desc_en, ...m.tags, ...m.links.map(l => l.s ? itemName(l.s) : '')].join(' ').toLowerCase().includes(q);
  const groups = D.mech_groups.filter(g => f.tab === 'all' || f.tab === g.id);
  const html = groups.map(g => { const list = MECHS.filter(m => m.group === g.id && match(m)); return list.length ? `<div class="grp"><h2>${esc(L(g))}</h2><span class="sub">${esc(L(g, 'sub'))}</span></div><div class="mgrid">${list.map(mechCard).join('')}</div>` : ''; }).join('');
  $('#m-res').innerHTML = html || `<div class="empty">${t('no_match')}</div>`;
}
function renderMechanics() {
  const f = ui.mechanics;
  view.innerHTML = head(`${L(SECS[3])} (${MECHS.length})`, esc(t('m_sub'))) +
    tabsHtml([{ id: 'all', label: t('all'), n: MECHS.length }, ...D.mech_groups.map(g => ({ id: g.id, label: L(g), n: MECHS.filter(m => m.group === g.id).length }))], f.tab, 'mechanics') +
    `<div class="toolbar">${searchField('q-mech', f.q, t('search_mech'), 'mechanics')}</div><div id="m-res"></div>`;
  renderMechResults();
}

/* ---------- 5. products ---------- */
function priceRows(ids) {
  const rows = (ids || []).map(id => PRICE[id]).filter(Boolean);
  return rows.length ? `<div class="plist">${rows.map(p => `<div><span>${esc(L(p))}</span><b>${esc(priceText(p))}</b></div>`).join('')}</div>` : '';
}
function prodInfo(p) {
  const x = p.open && D.extras[p.open];
  const links = (p.links || []).map(l => `<a class="btn sm" href="${esc(l.url)}" rel="noopener noreferrer">${icon('i-ext')}${esc(L(l))}</a><button type="button" class="btn sm ghost" data-act="copytext" data-text="${esc(l.url)}" title="${t('copy_link')}" aria-label="${t('copy_link')}">${icon('i-copy')}</button>`).join('');
  return `<div class="info"><h2><span class="code">${p.code}</span><span>${esc(L(p))}</span></h2><p>${esc(L(p, 'desc'))}</p>
    ${(p.facts_th || []).length ? `<div class="facts">${(lang === 'en' ? p.facts_en : p.facts_th).map(f => `<span class="pill">${esc(f)}</span>`).join('')}</div>` : ''}
    ${p.gallery && p.tab === 'web' ? `<div><span class="pill warn">${t('not_deployed')}</span></div>` : ''}
    ${p.style ? `<div class="styleline"><span class="code lite">${p.style}</span><span>${esc(itemName(p.style))}</span></div>` : ''}
    <div class="acts-row">${x ? `<button type="button" class="btn pri sm" data-act="open" data-href="${x.href}" data-title="${esc(L(p))}" data-code="${p.code}">${icon('i-tri')}${t('open_live')}</button>` : ''}${links}${addBtn(p.code)}</div>
    ${p.price ? `<div><div class="sub" style="margin-bottom:4px">${t('price')}</div>${priceRows(p.price)}</div>` : ''}</div>`;
}
function gallery(p, contain) {
  return `<div class="gal">${p.gallery.map(g => `<figure class="${contain ? 'contain' : ''}"><button type="button" data-act="img" data-src="${g.src}" data-title="${esc(L(p) + ' · ' + L(g))}" ${contain ? 'data-fit="1"' : ''}><img src="${g.src}" alt="${esc(L(g))}" loading="lazy"></button><figcaption>${esc(L(g))}</figcaption></figure>`).join('')}</div>`;
}
function prodBlock(p) {
  let media = '';
  if (p.video) media = `<div class="media"><video controls preload="metadata" playsinline poster="${p.poster}" src="${p.video}"></video></div>`;
  else if (p.preview) {
    const x = p.open && D.extras[p.open];
    media = x ? `<div class="media"><button type="button" class="thumb" data-act="open" data-href="${x.href}" data-title="${esc(L(p))}" data-code="${p.code}"><img src="${p.preview}" alt="" loading="lazy"><span class="code">${p.code}</span><span class="play" style="opacity:1">${icon('i-tri')}${t('open_live')}</span></button></div>`
      : `<div class="media"><button type="button" class="thumb" data-act="img" data-src="${p.preview}" data-title="${esc(L(p))}" data-fit="1"><img src="${p.preview}" alt="" loading="lazy"><span class="code">${p.code}</span></button></div>`;
  }
  const brand = p.colors ? `<div class="panel" style="display:flex;flex-direction:column;gap:10px"><div class="sub">${t('colors')}</div><div class="swatches">${p.colors.map(c => `<button type="button" class="sw" data-act="copytext" data-text="${c.hex}"><i style="background:${c.hex}"></i><span><b>${c.hex}</b><br>${esc(L(c))}</span></button>`).join('')}</div>
    <div class="sub">${t('fonts')}</div><div class="font-spec">${p.fonts.map(f => `<div><b style="font-family:${f.name}">${f.name === 'Anuphan' ? 'ครูสไลด์ กขค' : 'KruSlide Aa 123'}</b><span class="sub">${f.name} · ${esc(L(f))}</span></div>`).join('')}</div></div>` : '';
  if (p.gallery) {
    const side = brand ? `<div class="prod half">${prodInfo(p)}${brand}</div>` : prodInfo(p);
    return `<section data-card="${p.code}" style="margin-bottom:22px;display:flex;flex-direction:column;gap:12px">${side}${gallery(p, p.tab === 'brand')}</section>`;
  }
  return `<section class="prod" data-card="${p.code}">${media}${prodInfo(p)}</section>`;
}
function renderProducts() {
  const f = ui.products;
  const tabs = D.product_tabs.filter(tb => PRODS.some(p => p.tab === tb.id));
  if (!tabs.some(tb => tb.id === f.tab)) f.tab = tabs[0].id;
  view.innerHTML = head(`${L(SECS[4])} (${PRODS.length})`, esc(t('p_sub'))) +
    tabsHtml(tabs.map(tb => ({ id: tb.id, label: L(tb), n: PRODS.filter(p => p.tab === tb.id).length })), f.tab, 'products') +
    PRODS.filter(p => p.tab === f.tab).map(prodBlock).join('');
}

/* ---------- 6. order ---------- */
function estimate(o) {
  const lines = [], notes = [];
  const add = (id, qty) => { const p = PRICE[id]; if (!p || !qty) return; lines.push({ id, qty, min: p.min * qty, max: p.max * qty, each: range(p.min, p.max), period: p.period }); };
  const slides = Math.max(0, +o.slides || 0), units = Math.max(1, +o.units || 1), mins = Math.max(0, +o.minutes || 0);
  if (o.type === 'book' || o.type === 'unit') add('slides', slides);
  if (o.type === 'custom') add('custom_unit', units);
  if (SLIDE_JOBS.includes(o.type)) { if (o.theme) add('theme', 1); if (o.answers) add('answers', units); }
  if (o.type === 'video') {
    const m = Math.max(5, mins); if (mins < 5) notes.push({ th: 'คิดขั้นต่ำ 5 นาที', en: 'minimum 5 minutes' });
    add(o.vkind === '3d' ? 'video3d' : 'video2d', m);
    if (o.voice) add('voice', m);
  }
  if (o.type === 'deck') { add('deck', 1); if ((+o.pages || 0) > 15) notes.push({ th: 'เกิน 15 หน้า: หน้าที่เกินต้องประเมินราคาเพิ่ม', en: 'over 15 pages: quote the extra pages' }); }
  if (o.type === 'web') { add(o.web, 1); if (o.care) add('care', 1); }
  const tot = { once: [0, 0], month: [0, 0], year: [0, 0] };
  lines.forEach(l => { tot[l.period][0] += l.min; tot[l.period][1] += l.max; });
  return { lines, tot, notes };
}
const PERIOD = p => ({ once: t('once'), month: t('monthly'), year: t('yearly') }[p]);
function totText(tot) {
  return ['once', 'month', 'year'].filter(k => tot[k][1]).map(k => `${PERIOD(k)} ${range(tot[k][0], tot[k][1])} ${t('baht')}`).join(' · ') || '–';
}
function thaiDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00'); if (isNaN(d)) return iso;
  const m = 'ม.ค. ก.พ. มี.ค. เม.ย. พ.ค. มิ.ย. ก.ค. ส.ค. ก.ย. ต.ค. พ.ย. ธ.ค.'.split(' ');
  return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear() + 543}`;
}
function refText(l) {
  if (l.s) { const s = BY.get(l.s).o; return `${s.slug}${l.n ? ' สไลด์ ' + l.n : ''} (${repoPath(s.href)}${l.n ? 'index.html#' + l.n : ''})`; }
  if (l.x) { const x = D.extras[l.x]; return `${x.th}${l.n ? ' สไลด์ ' + l.n : ''} (${repoPath(x.href)}${l.n ? 'index.html#' + l.n : ''})`; }
  if (l.p) return `${l.p} ${itemName(l.p)}`;
  if (l.url) return l.url;
  return '';
}
function buildBrief(o) {
  const J = JOBS.find(j => j.id === o.type) || JOBS[1];
  const th = (x) => x.th;
  const out = [];
  const langTxt = { th: 'ไทย', en: 'อังกฤษ', both: 'ไทย + อังกฤษ' }[o.lang] || 'ไทย';
  out.push(`ใบสั่งงาน KruSlide · ${o.id}`);
  out.push(`วันที่สั่ง: ${thaiDate(new Date().toISOString().slice(0, 10))}`);
  out.push('');
  out.push(`งาน: ${th(J)}${o.type === 'video' ? ` (${o.vkind === '3d' ? '3D / ภาพยนตร์' : '2D แอนิเมชัน'})` : ''}`);
  if (SLIDE_JOBS.includes(o.type) || o.type === 'video') out.push(`วิชา: ${D.subjects[o.subject] ? D.subjects[o.subject].th : o.subject} · ระดับ: ${o.level}`);
  const bookLabel = { video: 'หัวข้อ', deck: 'หัวข้อ', web: 'โรงเรียน' }[o.type] || 'หนังสือ';
  const bu = [o.book && `${bookLabel}: ${o.book}`, SLIDE_JOBS.includes(o.type) && o.unit && `หน่วย: ${o.unit}`].filter(Boolean);
  if (bu.length) out.push(bu.join(' · '));
  const size = [];
  if (SLIDE_JOBS.includes(o.type)) { size.push(`${o.slides || 0} สไลด์`); if (o.type !== 'unit') size.push(`${o.units || 1} หน่วย`); }
  if (o.type === 'video') size.push(`ยาว ${o.minutes || 0} นาที`);
  if (o.type === 'deck') size.push(`${o.pages || 0} หน้า`);
  if (o.type === 'web') { const p = PRICE[o.web]; if (p) size.push(p.th); }
  size.push(`ภาษา: ${langTxt}`);
  if (o.type !== 'web') size.push(`เสียงบรรยาย: ${o.voice ? 'มี' : 'ไม่มี'}`);
  out.push(size.join(' · '));
  const extra = [SLIDE_JOBS.includes(o.type) && o.theme && 'ธีมโรงเรียน (โลโก้ + สี)', SLIDE_JOBS.includes(o.type) && o.answers && 'เฉลยละเอียด + เว็บเฉลยล็อกรหัส', o.type === 'web' && o.care && 'ดูแลเว็บ 1 ปี'].filter(Boolean);
  if (extra.length) out.push(`ส่วนเสริม: ${extra.join(', ')}`);
  out.push(`กำหนดส่ง: ${o.deadline ? thaiDate(o.deadline) : 'ยังไม่กำหนด'}`);
  const g = groupedItems();
  if (g.style.length) {
    out.push('', 'สไตล์ที่ต้องการ');
    g.style.forEach(c => { const st = BY.get(c).o; const ex = st.used.slice(0, 3).map(sc => refText({ s: sc })).concat((st.opens || []).map(x => refText({ x: x.x }))); out.push(`• ${c} ${st.th} (${st.en})${st.letter ? ` สไตล์ ${st.letter}` : ''} — ${st.desc_th || ''}${ex.length ? `\n  ตัวอย่าง: ${ex.join('; ')}` : ''}`); });
  }
  if (g.mech.length) {
    out.push('', 'กลไกที่ต้องมี');
    g.mech.forEach(c => { const m = BY.get(c).o; const ex = m.links.slice(0, 3).map(refText).filter(Boolean); out.push(`• ${c} ${m.th} (${m.en}) — ${m.desc_th}${ex.length ? `\n  ดูใน: ${ex.join('; ')}` : ''}`); });
  }
  if (g.sample.length) {
    out.push('', 'ตัวอย่างอ้างอิง');
    g.sample.forEach(c => { const s = BY.get(c).o; const st = BY.get(s.style); out.push(`• ${c} ${s.slug} — ${s.th} (${s.level}${st ? `, สไตล์ ${st.o.code} ${st.o.th}` : ''}) ${repoPath(s.href)}`); });
  }
  if (g.prod.length) {
    out.push('', 'ผลงานอ้างอิง');
    g.prod.forEach(c => { const p = BY.get(c).o; const x = p.open && D.extras[p.open]; const u = (p.links || [])[0]; out.push(`• ${c} ${p.th}${x ? ` (${repoPath(x.href)})` : u ? ` (${u.url})` : ''}`); });
  }
  const e = estimate(o);
  out.push('', 'ราคาประเมิน (ตาม kruslide/BRIEF.md)');
  if (!e.lines.length) out.push('• ยังคำนวณไม่ได้: กรอกจำนวนก่อน');
  e.lines.forEach(l => { const p = PRICE[l.id]; out.push(`• ${p.th}: ${num(l.qty)} ${p.qty_th} × ${l.each} บาท = ${range(l.min, l.max)} บาท${l.period === 'month' ? '/เดือน' : l.period === 'year' ? '/ปี' : ''}`); });
  e.notes.forEach(n => out.push(`• หมายเหตุ: ${n.th}`));
  if (e.lines.length) out.push(`รวม: ${['once', 'month', 'year'].filter(k => e.tot[k][1]).map(k => `${{ once: 'ครั้งเดียว', month: 'รายเดือน', year: 'รายปี' }[k]} ${range(e.tot[k][0], e.tot[k][1])} บาท`).join(' · ')}`);
  if (o.notes.trim()) out.push('', 'หมายเหตุจากเจ้าของ', o.notes.trim());
  out.push('', 'ข้อกำหนดการทำงาน');
  out.push('• อ่าน MEMORY.md และ kruslide/BRIEF.md ก่อนเริ่ม (repo เป็นสาธารณะ: ห้ามใส่ความลับหรือข้อมูลส่วนตัว)');
  out.push('• ทำ mock-up หยาบ 2–3 แบบต่อฉาก/สไลด์ ส่งเป็นภาพให้เจ้าของเลือกก่อนลงมือจริง');
  if (SLIDE_JOBS.includes(o.type)) out.push('• โครงไฟล์ตาม kruslide/samples/calculus/ (index.html, sample.json, shots/1–3) ใช้ engine.js + tools.js จาก teacher-slides/unit4; ทุกสไลด์มีแอนิเมชัน นักเรียนตอบบนจอ มีคู่มือครูและเฉลยพร้อมวิธีทำ');
  if (o.type === 'video') out.push('• ต้นฉบับ 4K (3840×2160) และไฟล์เว็บ 1080p; ใช้เฉพาะภาพที่สัญญาอนุญาตและใส่เครดิตทุกภาพ');
  if (o.type === 'deck') out.push('• ใช้ skill .claude/skills/type1-deck และใช้ reference/from-brand-to-place-cinematic.html เป็นมาตรฐานคุณภาพ (ไปให้ถึง แต่ห้ามเลียนแบบ)');
  if (o.type === 'web') out.push('• ไทย/อังกฤษ ห้ามแต่งข้อมูลโรงเรียนเอง: ทำเครื่องหมายว่ารอข้อมูล');
  out.push('• ฟอนต์ Anuphan + Inter แบบ self-hosted, ไม่มี request ภายนอก, ไม่มีหน้าตาแบบ AI (นีออน ข้อความไล่สี ตัวเอียงมีเชิง)');
  out.push('• QA: จับภาพทุกสไลด์/ทุกขั้น ไม่มีข้อความทับหรือล้น ไม่มี error ใน console แล้วอัปเดต MEMORY.md');
  return out.join('\n');
}
function draftLabel(d) {
  const J = JOBS.find(j => j.id === d.type);
  return [J ? L(J) : d.type, SLIDE_JOBS.includes(d.type) || d.type === 'video' ? subj(d.subject) : '', d.book].filter(Boolean).join(' · ');
}
function renderOrderOut() {
  const e = estimate(order);
  const box = $('#o-out'); if (!box) return;
  box.innerHTML = `<div class="est"><span class="sub">${t('estimate')}</span><b>${esc(totText(e.tot))}</b>${e.lines.map(l => `<small>${esc(L(PRICE[l.id]))}: ${num(l.qty)} × ${esc(l.each)} = ${range(l.min, l.max)} ${t('baht')}${l.period === 'month' ? t('per_month') : l.period === 'year' ? t('per_year') : ''}</small>`).join('')}${e.notes.map(n => `<small>${esc(L(n))}</small>`).join('')}</div>
    <label class="fl"><span>${t('brief')}</span><textarea class="textarea brief" id="brief" readonly rows="16">${esc(buildBrief(order))}</textarea></label>
    <div class="acts-row"><button type="button" class="btn pri" data-act="copy-brief">${icon('i-copy')}${t('copy')}</button><button type="button" class="btn" data-act="save-draft">${t('save')}</button><button type="button" class="btn" data-act="new-order">${icon('i-plus')}${t('new')}</button></div>
    <p class="msg" id="o-msg" role="status"></p>`;
}
function renderPicked() {
  const box = $('#o-picked'); if (!box) return;
  box.innerHTML = pickedHtml();
  const h = $('#o-picked-n'); if (h) h.textContent = order.items.length;
}
function renderDrafts() {
  const box = $('#o-drafts'); if (!box) return;
  box.innerHTML = !store.ok ? `<p class="sub">${t('no_storage')}</p>` : !drafts.length ? `<p class="sub">${t('drafts_empty')}</p>` :
    `<div class="rows">${drafts.map(d => `<div class="row"><div class="tx"><b>${esc(draftLabel(d))}</b><small>${esc(d.id)} · ${t('items', (d.items || []).length)}${d.id === order.id ? ' · ✓' : ''}</small></div><button type="button" class="btn sm" data-act="load-draft" data-id="${esc(d.id)}">${t('restore')}</button><button type="button" class="btn sm ghost" data-act="del-draft" data-id="${esc(d.id)}">${t('del')}</button></div>`).join('')}</div>`;
}
function renderOrder() {
  const o = order, slideJob = SLIDE_JOBS.includes(o.type);
  const seg = (field, opts) => `<div class="seg" role="group">${opts.map(([v, label]) => `<button type="button" data-act="oset" data-k="${field}" data-v="${v}" aria-pressed="${String(o[field]) === String(v)}">${esc(label)}</button>`).join('')}</div>`;
  const inp = (field, label, type = 'text', extra = '') => `<label class="fl"><span>${esc(label)}</span><input class="input" id="o-${field}" type="${type}" data-o="${field}" value="${esc(o[field])}" ${extra}></label>`;
  const bookLabel = { video: t('topic'), deck: t('topic'), web: t('school') }[o.type] || t('book');
  view.innerHTML = head(L(SECS[5]), esc(t('o_sub'))) + `<div class="order">
    <div class="form"><section class="panel"><h2 style="font-size:14px;font-weight:700">${t('details')}</h2>
      <div class="fl"><span>${t('job')}</span>${seg('type', JOBS.map(j => [j.id, L(j)]))}</div>
      ${slideJob || o.type === 'video' ? `<div class="two"><label class="fl"><span>${t('subject')}</span><select class="select" id="o-subject" data-o="subject">${Object.keys(D.subjects).map(k => `<option value="${k}" ${o.subject === k ? 'selected' : ''}>${esc(subj(k))}</option>`).join('')}</select></label>
        <label class="fl"><span>${t('level')}</span><select class="select" id="o-level" data-o="level">${D.levels.map(l => `<option ${o.level === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label></div>` : ''}
      <div class="two">${inp('book', bookLabel)}${slideJob ? inp('unit', t('unit')) : ''}</div>
      ${slideJob ? `<div class="two">${inp('slides', t('slides'), 'number', 'min="1" max="999" inputmode="numeric"')}${o.type !== 'unit' ? inp('units', t('units'), 'number', 'min="1" max="99" inputmode="numeric"') : ''}</div>` : ''}
      ${o.type === 'video' ? `<div class="two">${inp('minutes', t('minutes'), 'number', 'min="1" max="120" inputmode="numeric"')}<div class="fl"><span>${t('vkind')}</span>${seg('vkind', [['2d', t('v2d')], ['3d', t('v3d')]])}</div></div>` : ''}
      ${o.type === 'deck' ? inp('pages', t('pages'), 'number', 'min="1" max="99" inputmode="numeric"') : ''}
      ${o.type === 'web' ? `<div class="fl"><span>${t('package')}</span>${seg('web', ['web1', 'web10', 'web15'].map(id => [id, `${L(PRICE[id]).replace(/^(เว็บโรงเรียน|School website,)\s*/, '')} · ${num(PRICE[id].min)}`]))}</div>` : ''}
      <div class="two"><div class="fl"><span>${t('lang')}</span>${seg('lang', [['th', t('l_th')], ['en', t('l_en')], ['both', t('l_both')]])}</div>
        ${o.type !== 'web' ? `<div class="fl"><span>${t('voice')}</span>${seg('voice', [['false', t('no')], ['true', t('yes')]])}</div>` : ''}</div>
      ${slideJob || o.type === 'web' ? `<div class="fl"><span>${t('extras')}</span><div class="checks">
        ${slideJob ? `<label class="ck"><input type="checkbox" data-o="theme" ${o.theme ? 'checked' : ''}>${t('theme')} <small>990</small></label><label class="ck"><input type="checkbox" data-o="answers" ${o.answers ? 'checked' : ''}>${t('answers')} <small>590/${lang === 'th' ? 'หน่วย' : 'unit'}</small></label>` : ''}
        ${o.type === 'web' ? `<label class="ck"><input type="checkbox" data-o="care" ${o.care ? 'checked' : ''}>${t('care')} <small>1,990</small></label>` : ''}</div></div>` : ''}
      ${inp('deadline', t('deadline'), 'date')}
      <label class="fl"><span>${t('notes')}</span><textarea class="textarea" id="o-notes" data-o="notes" rows="4" placeholder="${esc(t('notes_ph'))}">${esc(o.notes)}</textarea></label>
    </section>
    <section class="panel drafts"><h2>${t('drafts')}</h2><div id="o-drafts"></div></section></div>
    <div class="form">
      <section class="panel"><h2>${t('picked')} <span class="code lite" id="o-picked-n">${o.items.length}</span>${o.items.length ? `<button type="button" class="btn sm ghost" data-act="clear">${t('clear')}</button>` : ''}</h2>
        <form class="quick" data-act-form="quick"><label class="sr" for="o-quick">${t('quick_ph')}</label><input class="input" id="o-quick" placeholder="${esc(t('quick_ph'))}" autocomplete="off" spellcheck="false"><button class="btn" type="submit">${t('quick_add')}</button></form>
        <div class="picked" id="o-picked"></div></section>
      <section class="panel" style="display:flex;flex-direction:column;gap:10px"><div id="o-out" style="display:flex;flex-direction:column;gap:10px"></div></section>
    </div></div>`;
  renderPicked(); renderOrderOut(); renderDrafts();
}
function normCode(raw) {
  const m = String(raw).trim().toUpperCase().match(/^(ST|S|M|P)-?(\d{1,3})$/);
  return m ? `${m[1]}-${m[2].padStart(2, '0')}` : null;
}
function toggleItem(code, force) {
  const i = order.items.indexOf(code);
  if (i >= 0 && force !== true) order.items.splice(i, 1);
  else if (i < 0 && force !== false) order.items.push(code);
  saveOrder(); syncAdds(); renderPicked(); renderOrderOut();
}
function saveDraft(quiet) {
  const copy = JSON.parse(JSON.stringify(order));
  const i = drafts.findIndex(d => d.id === order.id);
  if (i >= 0) drafts[i] = copy; else drafts.unshift(copy);
  drafts = drafts.slice(0, 30);
  const ok = store.set('drafts', drafts);
  if (!quiet) { const m = $('#o-msg'); if (m) { m.className = 'msg ' + (ok ? 'ok' : 'no'); m.textContent = ok ? t('saved') : t('no_storage'); } }
  renderDrafts();
}

/* ---------- 7. prices ---------- */
function renderPriceTotals() {
  const tot = { once: [0, 0], month: [0, 0], year: [0, 0] };
  D.prices.items.forEach(p => { const q = +ui.prices.qty[p.id] || 0; if (q > 0) { tot[p.period][0] += p.min * q; tot[p.period][1] += p.max * q; } });
  D.prices.items.forEach(p => { const c = $(`#ps-${p.id}`); const q = +ui.prices.qty[p.id] || 0; if (c) c.textContent = q > 0 ? range(p.min * q, p.max * q) : '–'; });
  const box = $('#p-tot'); if (!box) return;
  box.innerHTML = `<h2 style="font-size:14px;font-weight:700">${t('total')}</h2>${['once', 'month', 'year'].map(k => `<div class="line ${k === 'once' ? 'big' : ''}"><span>${PERIOD(k)}</span><b>${tot[k][1] ? range(tot[k][0], tot[k][1]) + ' ' + t('baht') : '–'}</b></div>`).join('')}
    <button type="button" class="btn sm" data-act="p-reset">${t('reset')}</button><p class="sub">${esc(t('pr_note'))}</p>`;
}
function renderPrices() {
  const groups = D.prices.groups;
  view.innerHTML = head(L(SECS[6]), esc(t('pr_sub'))) + `<div class="prices"><table class="tbl"><thead><tr><th>${t('pr_item')}</th><th class="num">${t('pr_price')}</th><th class="hide-sm">/</th><th class="num">${t('pr_qty')}</th><th class="num">${t('pr_sum')}</th></tr></thead><tbody>
    ${groups.map(g => `<tr class="grp-row"><td colspan="5">${esc(L(g))}</td></tr>` + D.prices.items.filter(p => p.group === g.id).map(p => `<tr><td><b style="font-weight:600">${esc(L(p))}</b>${L(p, 'note') ? `<br><span class="sub">${esc(L(p, 'note'))}</span>` : ''}</td>
      <td class="num">${range(p.min, p.max)}</td><td class="hide-sm sub">${esc(L(p, 'per'))}</td>
      <td class="num"><label class="sr" for="pq-${p.id}">${esc(L(p))}</label><input class="input qty" id="pq-${p.id}" type="number" min="0" inputmode="numeric" data-in="pq" data-id="${p.id}" value="${ui.prices.qty[p.id] || ''}" placeholder="0"></td>
      <td class="num" id="ps-${p.id}">–</td></tr>`).join('')).join('')}
    </tbody></table><aside class="panel tot" id="p-tot"></aside></div>`;
  renderPriceTotals();
}

/* ---------- viewer ---------- */
const viewer = $('#viewer'); let opener = null;
function setViewerHead(title, code, sub, hint) {
  $('#vtitle').innerHTML = (code ? `<span class="code">${esc(code)}</span>` : '') + `<b>${esc(title)}</b>` + (sub ? `<span class="sub" style="color:#AEB8D6">· ${esc(sub)}</span>` : '');
  $('#vhint').innerHTML = hint;
  $('#vadd').innerHTML = code && BY.has(code) ? addBtn(code) : '';
}
function showViewer() { opener = opener || document.activeElement; if (!viewer.open) { try { viewer.showModal(); } catch (e) { viewer.setAttribute('open', ''); } } }
function openFrame(href, title, code, sub) {
  opener = document.activeElement;
  setViewerHead(title, code, sub, `<kbd>←</kbd><kbd>→</kbd> ${t('hint_slides')}`);
  const body = $('#vbody'); body.innerHTML = '';
  const f = document.createElement('iframe');
  f.title = title; f.setAttribute('allow', 'fullscreen; autoplay');
  f.addEventListener('load', () => {
    try {
      const w = f.contentWindow;
      w.addEventListener('keydown', e => { if (e.key === 'Escape' && !e.defaultPrevented && !w.document.documentElement.classList.contains('pen-on')) { e.preventDefault(); closeViewer(); } });
      if (viewer.open && document.activeElement !== f) f.focus();
      w.focus();
    } catch (e) { /* another origin: the close button still works */ }
  });
  f.src = href;
  body.appendChild(f);
  showViewer();
  f.focus();
}
function openImage(src, title, fit) {
  opener = document.activeElement;
  setViewerHead(title, '', '', `${t('hint_img')}`);
  $('#vbody').innerHTML = `<div class="vimg ${fit ? 'fit' : ''}" tabindex="0"><img src="${esc(src)}" alt="${esc(title)}"></div>`;
  showViewer();
  $('#vbody .vimg').focus();
}
function closeViewer() { if (viewer.open) viewer.close(); }
viewer.addEventListener('close', () => { $('#vbody').innerHTML = ''; const o = opener; opener = null; if (o && o.isConnected && o.focus) o.focus({ preventScroll: true }); });

/* ---------- palette ---------- */
const pal = $('#palette'), pq = $('#pq'), plist = $('#plist');
let pitems = [], psel = 0;
function entries() {
  const k = kind => ({ sample: t('k_sample'), style: t('k_style'), mech: t('k_mechanic'), prod: t('k_product') }[kind]);
  return [
    ...SECS.map((s, i) => ({ type: 'sec', id: s.id, name: L(s), k: `${t('section')} · ${i + 1}`, hay: (s.th + ' ' + s.en).toLowerCase() })),
    ...[...BY.entries()].map(([code, x]) => ({ type: 'item', code, kind: x.kind, name: L(x.o), k: k(x.kind) + (x.kind === 'sample' ? ` · ${x.o.level} · ${subj(x.o.subject)}` : ''),
      hay: [code, x.o.th, x.o.en, x.o.slug, x.o.level, x.o.style_th, x.o.style_en, x.o.letter && 'style ' + x.o.letter].filter(Boolean).join(' ').toLowerCase() })),
  ];
}
let ENTRIES = entries();
function paletteRender() {
  const q = pq.value.trim().toLowerCase(), nc = normCode(q);
  let list = ENTRIES;
  if (q) {
    const words = q.split(/\s+/);
    list = ENTRIES.map(e => {
      let sc = 0; const code = (e.code || '').toLowerCase();
      if (nc && e.code === nc) sc = 100; else if (code && code.startsWith(q)) sc = 60;
      else if (words.every(w => e.hay.includes(w))) sc = e.name.toLowerCase().startsWith(q) ? 40 : 20;
      return { e, sc };
    }).filter(x => x.sc).sort((a, b) => b.sc - a.sc).map(x => x.e);
  }
  pitems = list.slice(0, 60); psel = Math.min(psel, Math.max(0, pitems.length - 1));
  plist.innerHTML = pitems.map((e, i) => `<li role="option" data-i="${i}" aria-selected="${i === psel}">${e.code ? `<span class="code">${e.code}</span>` : icon(SECS.find(s => s.id === e.id).icon)}<span class="nm">${esc(e.name)}</span><span class="k">${esc(e.k)}</span>${e.code ? addBtn(e.code) : ''}</li>`).join('') || `<li class="sub">${t('no_match')}</li>`;
  const cur = $('[aria-selected="true"]', plist); if (cur) cur.scrollIntoView({ block: 'nearest' });
}
function openPalette() { ENTRIES = entries(); pq.placeholder = t('palette_ph'); pq.value = ''; psel = 0; $('#pfoot').innerHTML = `<span><kbd>↑</kbd><kbd>↓</kbd> ${t('p_move')}</span><span><kbd>Enter</kbd> ${t('p_enter')}</span><span><kbd>Shift</kbd>+<kbd>Enter</kbd> ${t('p_shift')}</span><span><kbd>Esc</kbd> ${t('close')}</span>`; paletteRender(); try { pal.showModal(); } catch (e) { pal.setAttribute('open', ''); } pq.focus(); }
function paletteGo(i, addOnly) {
  const e = pitems[i]; if (!e) return;
  if (addOnly) { if (e.code) { toggleItem(e.code); paletteRender(); } return; }
  pal.close();
  if (e.type === 'sec') { go(e.id); return; }
  const x = BY.get(e.code);
  if (x.kind === 'sample') { openFrame(x.o.href, L(x.o), x.o.code); return; }
  if (x.kind === 'prod' && x.o.open && D.extras[x.o.open]) { openFrame(D.extras[x.o.open].href, L(x.o), x.o.code); return; }
  focusCard(e.code);
}
pq.addEventListener('input', () => { psel = 0; paletteRender(); });
pq.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); psel = Math.max(0, Math.min(pitems.length - 1, psel + (e.key === 'ArrowDown' ? 1 : -1))); paletteRender(); }
  else if (e.key === 'Enter') { e.preventDefault(); paletteGo(psel, e.shiftKey); }
});
plist.addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if (!li || e.target.closest('[data-act="add"]')) return; paletteGo(+li.dataset.i, false); });
pal.addEventListener('click', e => { if (e.target === pal) pal.close(); });

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, d = el.dataset;
  if (a === 'add') { e.stopPropagation(); toggleItem(d.code); if (order.items.includes(d.code) && currentSec() !== 'order') toast(t('added_x', d.code)); return; }
  if (a === 'rm') { toggleItem(d.code, false); return; }
  if (a === 'open') {
    const x = d.code && BY.get(d.code);
    const href = d.href || (x && x.kind === 'sample' && x.o.href); if (!href) return;
    openFrame(href, d.title || (x ? L(x.o) : ''), d.code || '', d.sub || ''); return;
  }
  if (a === 'img') { openImage(d.src, d.title || '', !!d.fit); return; }
  if (a === 'vclose') { closeViewer(); return; }
  if (a === 'card') { closeViewer(); focusCard(d.code); return; }
  if (a === 'palette') { openPalette(); return; }
  if (a === 'lang') { lang = d.v === 'en' ? 'en' : 'th'; store.set('lang', lang); rerender(); return; }
  if (a === 'tab') { ui[d.sec].tab = d.v; saveUi(); rerender(); return; }
  if (a === 'f') { const f = ui.samples; f[d.k] = (d.k !== 'view' && f[d.k] === d.v) ? '' : d.v; saveUi(); rerender(); return; }
  if (a === 'more') { const rest = JSON.parse(d.rest || '[]'); el.insertAdjacentHTML('beforebegin', rest.map(linkChip).join('')); el.remove(); return; }
  if (a === 'tray') { trayOpen = !trayOpen; renderTray(); const b = $('#tray .tray-hd'); if (b) b.focus(); return; }
  if (a === 'clear') { order.items = []; saveOrder(); syncAdds(); renderPicked(); renderOrderOut(); if (currentSec() === 'order') rerender(); return; }
  if (a === 'copytext') { copyText(d.text, null, null); return; }
  if (a === 'copybox-x') { const b = $('#copybox'); if (b) b.hidden = true; return; }
  if (a === 'oset') { order[d.k] = d.v === 'true' ? true : d.v === 'false' ? false : d.v; saveOrder(); if (d.k === 'type') rerender(); else { $$(`[data-act="oset"][data-k="${d.k}"]`).forEach(b => b.setAttribute('aria-pressed', b.dataset.v === d.v)); renderOrderOut(); } return; }
  if (a === 'copy-brief') { const ta = $('#brief'); copyText(ta.value, ta, $('#o-msg')); return; }
  if (a === 'save-draft') { saveDraft(false); return; }
  if (a === 'new-order') { if (order.items.length || order.book || order.notes) saveDraft(true); order = blankOrder(); saveOrder(); syncAdds(); rerender(); return; }
  if (a === 'load-draft') { const dr = drafts.find(x => x.id === d.id); if (dr) { order = Object.assign(blankOrder(), JSON.parse(JSON.stringify(dr))); order.items = order.items.filter(c => BY.has(c)); saveOrder(); syncAdds(); rerender(); } return; }
  if (a === 'del-draft') { drafts = drafts.filter(x => x.id !== d.id); store.set('drafts', drafts); renderDrafts(); return; }
  if (a === 'p-reset') { ui.prices.qty = {}; saveUi(); rerender(); return; }
});
document.addEventListener('input', e => {
  const el = e.target, d = el.dataset;
  if (d.in === 'q') { ui[d.sec].q = el.value; saveUi(); ({ samples: renderSampleResults, styles: renderStyleResults, mechanics: renderMechResults })[d.sec](); return; }
  if (d.in === 'pq') { ui.prices.qty[d.id] = Math.max(0, parseInt(el.value, 10) || 0); saveUi(); renderPriceTotals(); return; }
  if (d.o) { order[d.o] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? '' : Math.max(0, parseInt(el.value, 10) || 0)) : el.value; saveOrder(); renderOrderOut(); }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.in === 'sort') { ui.samples.sort = el.value; saveUi(); renderSampleResults(); }
  if (el.dataset.o && el.tagName === 'SELECT') { order[el.dataset.o] = el.value; saveOrder(); renderOrderOut(); }
});
document.addEventListener('submit', e => {
  const f = e.target; if (f.dataset.actForm !== 'quick') return;
  e.preventDefault();
  const inp = $('#o-quick'); const parts = inp.value.split(/[\s,;]+/).filter(Boolean);
  const added = [], bad = [];
  parts.forEach(p => { const c = normCode(p); if (c && BY.has(c)) { if (!order.items.includes(c)) order.items.push(c); added.push(c); } else bad.push(p); });
  saveOrder(); syncAdds(); renderPicked(); renderOrderOut();
  const m = $('#o-msg'); if (m) { m.className = 'msg ' + (bad.length ? 'no' : 'ok'); m.textContent = [added.length ? t('added_x', added.join(' ')) : '', bad.length ? t('unknown_x', bad.join(' ')) : ''].filter(Boolean).join(' · '); }
  inp.value = bad.join(' '); inp.focus();
});
document.addEventListener('keydown', e => {
  const tg = e.target, typing = tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable);
  const modal = viewer.open || pal.open;
  if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (!viewer.open) (pal.open ? pal.close() : openPalette()); return; }
  if (typing || modal || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === '/') { e.preventDefault(); openPalette(); return; }
  if (/^[1-7]$/.test(e.key)) { go(SECS[+e.key - 1].id); return; }
  if (e.key === 'Escape' && trayOpen) { trayOpen = false; renderTray(); }
});
addEventListener('hashchange', render);
addEventListener('storage', e => { if (e.key === 'ksbo:order') { order = Object.assign(blankOrder(), store.get('order', {})); syncAdds(); if (currentSec() === 'order') rerender(); } });

render();
}
