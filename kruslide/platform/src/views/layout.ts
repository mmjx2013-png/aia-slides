import type { Ctx, Subscription, Payment, Book, BookRequest } from '../env';
import { html, raw, Safe } from '../lib/html';
import { lineOa } from '../lib/config';
import { ICON_INNER } from './brand';

const TH_DATE = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' });
const TH_DATETIME = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' });

export function fmtDate(t: number | null | undefined): string { return t ? TH_DATE.format(new Date(t * 1000)) : '–'; }
export function fmtDateTime(t: number | null | undefined): string { return t ? TH_DATETIME.format(new Date(t * 1000)) : '–'; }
export function money(baht: number): string { return baht.toLocaleString('th-TH', { maximumFractionDigits: 2 }); }
/** "2027-05-16" -> "16 พ.ค. 2570" */
export function fmtIsoDate(d: string): string {
  const t = Date.parse(`${d}T00:00:00+07:00`);
  return Number.isFinite(t) ? TH_DATE.format(new Date(t)) : d;
}

export function csrfField(ctx: Ctx): Safe {
  return html`<input type="hidden" name="_csrf" value="${ctx.csrf}">`;
}

// ---------- icons (one inline sprite per page; drawn for KruSlide, stroke style like the sales site) ----------
const ICONS: Record<string, string> = {
  book: '<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5z"/><path d="M5 20.5A2.5 2.5 0 0 0 7.5 23H19v-5"/><path d="M9 7.5h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.4 8.2-8 9-4.6-.8-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  left: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M17.5 14.2A6.5 6.5 0 0 1 21.5 20"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" stroke-width="3"/>',
  copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/>',
  inbox: '<path d="M4 13.5L6.6 5.6A2 2 0 0 1 8.5 4.2h7a2 2 0 0 1 1.9 1.4L20 13.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M4 13.5h4.6l1.4 2.5h4l1.4-2.5H20"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  school: '<path d="M3 10l9-6 9 6"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5h4v5"/>',
  chart: '<path d="M4 20h16"/><path d="M7 16v-4M12 16V7M17 16v-8"/>',
  flask: '<path d="M9 3h6M10 3v6.2L4.8 18.1A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-2.9L14 9.2V3"/><path d="M7.4 15h9.2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  talk: '<path d="M4 5h16v11H10l-5 4v-4H4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  pen: '<path d="M4 20l4.2-1L19 8.2 15.8 5 5 15.8z"/><path d="M13.5 7.3l3.2 3.2"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.6v6.8l5.6-3.4z"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  wallet: '<path d="M4 7a2 2 0 0 1 2-2h12v4"/><rect x="3" y="9" width="18" height="11" rx="2.5"/><path d="M16 14.5h.01" stroke-width="3"/>',
  hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M11 10.5V4a1.5 1.5 0 0 1 3 0v6.5"/><path d="M14 10.5V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-.6a5 5 0 0 1-3.9-1.9L4 14.6a1.6 1.6 0 0 1 2.4-2.1L8 14"/>',
  wand: '<path d="M4 20L16 8"/><path d="M14 6l4 4"/><path d="M18 3v2M21 6h-2M5 4v2M6 5H4M19 15v2M20 16h-2"/>',
  note: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  chat: '<path d="M12 3.5c-5 0-9 3.2-9 7.2 0 3.6 3.2 6.6 7.5 7.1.3.1.7.2.8.5.1.3.1.7 0 1l-.1.8c0 .3-.2 1 .9.5s5.9-3.5 8.1-6c1.5-1.6 2.3-3.3 2.3-5C21 6.7 17 3.5 12 3.5z" fill="currentColor" stroke="none"/>',
};

export function icon(name: keyof typeof ICONS | string, cls = ''): Safe {
  return raw(`<svg class="ic${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${name}"/></svg>`);
}

const SPRITE = raw(`<svg class="sprite" aria-hidden="true" focusable="false"><defs>${Object.entries(ICONS)
  .map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('')}</defs></svg>`);

// ---------- flash messages ----------
/** Messages after a redirect are chosen by code, so a crafted link cannot put arbitrary text on our page. */
const FLASH: Record<string, [string, 'ok' | 'bad' | 'warn']> = {
  profile: ['บันทึกข้อมูลแล้ว', 'ok'],
  notified: ['แจ้งโอนแล้ว ทีมงานจะตรวจสอบและเปิดสิทธิ์ให้เร็วที่สุด', 'ok'],
  school: ['กรุณากรอกชื่อโรงเรียนก่อน (ใช้แสดงในสไลด์ว่าเป็นของคุณครู)', 'warn'],
  loggedout: ['ออกจากระบบแล้ว', 'ok'],
  cancelled: ['ยกเลิกการเข้าสู่ระบบแล้ว', 'warn'],
  welcome: ['ยินดีต้อนรับสู่ครูสไลด์! กรอกชื่อโรงเรียนเพื่อเริ่มใช้งาน', 'ok'],
  confirmed: ['ยืนยันการชำระเงินแล้ว สมาชิกเปิดสไลด์ได้ทันที', 'ok'],
  rejected: ['ปฏิเสธรายการนี้แล้ว', 'warn'],
  saved: ['บันทึกแล้ว', 'ok'],
  deleted: ['ลบแล้ว', 'ok'],
  uploaded: ['อัปโหลดสไลด์แล้ว', 'ok'],
  extended: ['ต่ออายุแล้ว', 'ok'],
  expired: ['ตั้งเป็นหมดอายุแล้ว', 'warn'],
  blocked: ['ระงับสมาชิกแล้ว และออกจากระบบทุกเครื่อง', 'warn'],
  unblocked: ['เปิดใช้งานสมาชิกแล้ว', 'ok'],
  already: ['รายการนี้ถูกจัดการไปแล้ว', 'warn'],
  erased: ['ลบข้อมูลส่วนตัวของสมาชิกแล้ว', 'ok'],
  changed: ['สมาชิกเปลี่ยนรายการหลังจากที่คุณเปิดหน้านี้ ยังไม่ได้ยืนยัน กรุณาตรวจยอดใหม่อีกครั้ง', 'bad'],
  sent: ['ส่งคำขอแล้ว ทีมงานจะติดต่อกลับทาง LINE', 'ok'],
  locked: ['คำขอนี้ส่งแล้ว แก้คำตอบไม่ได้ หากต้องการเปลี่ยน แจ้งทีมงานทาง LINE', 'warn'],
  request: ['บันทึกคำขอแล้ว', 'ok'],
};

export function flash(ctx: Ctx): Safe {
  const code = ctx.url.searchParams.get('m');
  const f = code ? FLASH[code] : undefined;
  return f ? html`<div class="flash ${f[1]}" role="status">${f[0]}</div>` : html``;
}

// ---------- badges ----------
export function subBadge(status: Subscription['status'] | 'none'): Safe {
  const map = { active: ['ใช้งานได้', 'ok'], pending: ['รอชำระเงิน', 'warn'], expired: ['หมดอายุ', 'bad'], none: ['ยังไม่สมัคร', ''] } as const;
  const [label, cls] = map[status];
  return html`<span class="badge ${cls}">${label}</span>`;
}

export function payBadge(p: Payment): Safe {
  if (p.status === 'confirmed') return html`<span class="badge ok">ยืนยันแล้ว</span>`;
  if (p.status === 'rejected') return html`<span class="badge bad">ไม่ผ่าน</span>`;
  return p.notified_at ? html`<span class="badge info">แจ้งโอนแล้ว รอตรวจ</span>` : html`<span class="badge warn">รอโอน</span>`;
}

export function bookStatusBadge(s: Book['status']): Safe {
  const map = { published: ['เปิดขาย', 'ok'], draft: ['ร่าง', 'warn'], archived: ['เก็บถาวร', ''] } as const;
  return html`<span class="badge ${map[s][1]}">${map[s][0]}</span>`;
}

/** Status of a book request; the teacher sees friendlier words than the owner for two of them. */
export const REQUEST_STATUS: Record<BookRequest['status'], { admin: string; teacher: string; cls: string }> = {
  draft: { admin: 'ยังทำแบบทดสอบไม่จบ', teacher: 'ยังเลือกสไตล์ไม่ครบ', cls: 'warn' },
  new: { admin: 'ใหม่', teacher: 'ส่งคำขอแล้ว', cls: 'info' },
  quoted: { admin: 'เสนอราคาแล้ว', teacher: 'ส่งใบเสนอราคาแล้ว', cls: 'warn' },
  building: { admin: 'กำลังทำ', teacher: 'กำลังทำสไลด์', cls: 'lilac' },
  done: { admin: 'เสร็จแล้ว', teacher: 'เสร็จแล้ว', cls: 'ok' },
  declined: { admin: 'ไม่รับทำ', teacher: 'ปิดคำขอแล้ว', cls: 'bad' },
};

export function requestBadge(s: BookRequest['status'], who: 'admin' | 'teacher'): Safe {
  const m = REQUEST_STATUS[s];
  return html`<span class="badge ${m.cls}">${who === 'admin' ? m.admin : m.teacher}</span>`;
}

// ---------- book cover art ----------
/** A colour theme and an icon from the subject, so every book has its own cover without uploaded art. */
export function subjectTheme(subject: string, id: number): { theme: string; icon: string } {
  const s = subject.toLowerCase();
  if (/คณิต|math/.test(s)) return { theme: 't-sky', icon: 'chart' };
  if (/วิทย|science|ฟิสิก|เคมี|ชีว/.test(s)) return { theme: 't-mint', icon: 'flask' };
  if (/อังกฤษ|english|ภาษาต่าง|จีน|ญี่ปุ่น/.test(s)) return { theme: 't-lilac', icon: 'talk' };
  if (/ไทย|thai/.test(s)) return { theme: 't-tom', icon: 'pen' };
  if (/สังคม|ประวัติ|social|history|ภูมิ/.test(s)) return { theme: 't-sun', icon: 'globe' };
  if (/ดนตรี|ศิลป|music|art/.test(s)) return { theme: 't-tom', icon: 'music' };
  const themes = ['t-sky', 't-mint', 't-tom', 't-sun', 't-lilac'];
  return { theme: themes[id % themes.length], icon: 'book' };
}

/** Cover art: a 3-D book in the subject's colour on a dotted, tinted panel. */
export function bookArt(b: { id: number; subject: string; grade: string }, tag?: Safe | string, tagRight?: Safe | string): Safe {
  const { theme, icon: ic } = subjectTheme(b.subject, b.id);
  return html`<div class="art ${theme}" aria-hidden="true"><span class="blob"></span><span class="blob b2"></span>
    ${tag ? html`<span class="tag">${tag}</span>` : ''}${tagRight ? html`<span class="tag r">${tagRight}</span>` : ''}
    <div class="book3d">${icon(ic)}<b>${b.grade}</b><i></i><i></i></div></div>`;
}

/** Kept for older callers: the cover is now the art panel. */
export function cover(b: { id: number; title: string; subject: string; grade: string }): Safe {
  return bookArt(b);
}

/** Tiny illustration for empty states: a stack of books and a spark, in brand colours. */
export function emptyArt(): Safe {
  return raw(`<svg class="ill" viewBox="0 0 150 112" aria-hidden="true"><ellipse cx="75" cy="104" rx="58" ry="6" fill="#EEE5D6"/>
<rect x="28" y="78" width="94" height="20" rx="5" fill="#3D7BFF"/><rect x="28" y="78" width="10" height="20" rx="3" fill="#2F66E8"/>
<rect x="36" y="58" width="82" height="20" rx="5" fill="#FFC83D"/><rect x="36" y="58" width="10" height="20" rx="3" fill="#E8AE1E"/>
<rect x="30" y="38" width="88" height="20" rx="5" fill="#F2553C" transform="rotate(-4 74 48)"/>
<rect x="60" y="84" width="50" height="4" rx="2" fill="#fff" opacity=".7"/><rect x="66" y="64" width="40" height="4" rx="2" fill="#fff" opacity=".8"/>
<path d="M124 14l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#18B07F"/><path d="M22 22l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#8B6CF6"/></svg>`);
}

/** First letter for the avatar, skipping Thai leading vowels (เ แ โ ใ ไ), so "เจ้าของ" shows "จ". */
export function initial(name: string): string {
  return [...(name || '?')].find((c) => !/[\u0E40-\u0E44\s"'(]/.test(c)) ?? '?';
}

// ---------- page frame ----------
interface PageOpts {
  title: string;
  body: Safe;
  nav?: string;
  wide?: boolean;
  /** Focus mode (the style quiz): a slim top bar with `top` in it, no menus and no footer. */
  focus?: { top: Safe };
  /** Load /app/static/app.js (progressive enhancement). The route must send scriptCsp(). */
  script?: boolean;
}

export function page(ctx: Ctx, o: PageOpts): Safe {
  const t = ctx.teacher;
  const cur = (k: string) => (o.nav === k ? raw(' aria-current="page"') : '');
  const logout = html`<form method="post" action="/app/logout">${csrfField(ctx)}<button type="submit" title="ออกจากระบบ">${icon('logout')}<span class="lbl">ออกจากระบบ</span></button></form>`;
  const nav = o.focus
    ? html`<div class="qtop">${o.focus.top}</div><a class="qx" href="/app/requests" title="ออกจากแบบทดสอบ (คำตอบที่ตอบแล้วยังอยู่)">${icon('x')}<span class="sr">ออกจากแบบทดสอบ</span></a>`
    : t
      ? html`<nav class="nav" aria-label="เมนู">
        <a class="hide-m" href="/app/"${cur('home')}>${icon('book')}<span class="lbl">หนังสือของฉัน</span></a>
        <a class="hide-m" href="/app/requests"${cur('requests')}>${icon('inbox')}<span class="lbl">คำขอทำหนังสือ</span></a>
        ${ctx.isAdmin ? html`<a class="hide-m" href="/app/admin/"${cur('admin')}>${icon('shield')}<span class="lbl">ผู้ดูแล</span></a>` : ''}
        <a class="cta hide-m" href="/app/requests/new"${cur('new')}>${icon('plus')}<span class="lbl">ขอทำหนังสือ</span></a>
        ${logout}
      </nav>
      <a class="who" href="/app/profile" title="ข้อมูลของฉัน"><span class="ava" aria-hidden="true">${initial(t.display_name)}</span><span>${t.display_name}</span></a>`
      : html`<nav class="nav" aria-label="เมนู"><a href="/app/privacy"${cur('privacy')}>ความเป็นส่วนตัว</a></nav>`;
  const tabs = t && !o.focus
    ? html`<nav class="tabs" aria-label="เมนูหลัก">
        <a href="/app/"${cur('home')}>${icon('book')}หนังสือ</a>
        <a href="/app/requests"${cur('requests')}>${icon('inbox')}คำขอ</a>
        <a class="cta" href="/app/requests/new"${cur('new')}>${icon('spark')}ขอทำหนังสือ</a>
        <a href="/app/profile"${cur('profile')}>${icon('user')}ข้อมูลของฉัน</a>
        ${ctx.isAdmin ? html`<a href="/app/admin/"${cur('admin')}>${icon('shield')}ผู้ดูแล</a>` : ''}
      </nav>`
    : '';
  const cls = [o.wide ? 'wide' : '', o.focus ? 'focus' : '', tabs ? 'has-tabs' : ''].filter(Boolean).join(' ');
  return html`<!DOCTYPE html>
<html lang="th"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#FFFAF2">
<title>${o.title} · ครูสไลด์ KruSlide</title>
<link rel="icon" href="/app/static/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/app/static/apple-touch-icon.png">
<link rel="stylesheet" href="/app/static/app.css">
${o.script ? html`<script src="/app/static/app.js" defer></script>` : ''}
</head><body${cls ? html` class="${cls}"` : ''}>
${SPRITE}
<header class="top"><div class="wrap">
  <a class="brand" href="/app/" aria-label="ครูสไลด์ KruSlide หน้าแรก"><svg class="brand-ic" viewBox="0 0 120 120" aria-hidden="true">${raw(ICON_INNER)}</svg>${o.focus ? '' : html`<span class="brand-txt"><b>Kru<span>Slide</span></b><small>ครูสไลด์</small></span>`}</a>
  ${nav}
</div></header>
<main><div class="wrap">${o.body}</div></main>
<footer class="foot"><div class="wrap">
  <span>© KruSlide · ครูสไลด์</span>
  <span><a href="/app/privacy">นโยบายความเป็นส่วนตัว</a> · ติดต่อทาง LINE: <b>${lineOa(ctx.env)}</b></span>
</div></footer>
${tabs}
</body></html>`;
}

export function errorPage(ctx: Ctx, status: number, message: string): Safe {
  const title = status === 404 ? 'ไม่พบหน้านี้' : status === 403 ? 'ไม่มีสิทธิ์เข้าหน้านี้' : status === 429 ? 'โปรดรอสักครู่' : 'เกิดข้อผิดพลาด';
  return page(ctx, {
    title,
    body: html`<div class="card empty">${emptyArt()}<h1>${title}</h1><p>${message}</p><p class="row"><a class="btn ghost" href="/app/">${icon('left')}กลับหน้าแรก</a></p></div>`,
  });
}
