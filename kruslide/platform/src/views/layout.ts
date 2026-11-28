import type { Ctx, Subscription, Payment, Book } from '../env';
import { html, raw, Safe } from '../lib/html';
import { lineOa } from '../lib/config';

const TH_DATE = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' });
const TH_DATETIME = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' });

export function fmtDate(t: number | null | undefined): string { return t ? TH_DATE.format(new Date(t * 1000)) : '–'; }
export function fmtDateTime(t: number | null | undefined): string { return t ? TH_DATETIME.format(new Date(t * 1000)) : '–'; }
export function money(baht: number): string { return baht.toLocaleString('th-TH', { maximumFractionDigits: 2 }); }

export function csrfField(ctx: Ctx): Safe {
  return html`<input type="hidden" name="_csrf" value="${ctx.csrf}">`;
}

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
};

export function flash(ctx: Ctx): Safe {
  const code = ctx.url.searchParams.get('m');
  const f = code ? FLASH[code] : undefined;
  return f ? html`<div class="flash ${f[1]}" role="status">${f[0]}</div>` : html``;
}

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

export function cover(b: { id: number; title: string; subject: string; grade: string }): Safe {
  return html`<div class="cover c${b.id % 6}"><span>${b.subject} · ${b.grade}</span><b>${b.title}</b></div>`;
}

interface PageOpts { title: string; body: Safe; nav?: string; status?: number; }

export function page(ctx: Ctx, o: PageOpts): Safe {
  const t = ctx.teacher;
  const cur = (k: string) => (o.nav === k ? raw(' aria-current="page"') : '');
  const nav = t
    ? html`<nav class="nav" aria-label="เมนู">
        <a href="/app/"${cur('home')}>หนังสือของฉัน</a>
        <a href="/app/profile"${cur('profile')}>ข้อมูลของฉัน</a>
        ${ctx.isAdmin ? html`<a href="/app/admin/"${cur('admin')}>ผู้ดูแล</a>` : ''}
        <form method="post" action="/app/logout">${csrfField(ctx)}<button type="submit">ออกจากระบบ</button></form>
      </nav>`
    : html`<nav class="nav" aria-label="เมนู"><a href="/app/privacy"${cur('privacy')}>ความเป็นส่วนตัว</a></nav>`;
  return html`<!DOCTYPE html>
<html lang="th"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${o.title} · ครูสไลด์ KruSlide</title>
<link rel="stylesheet" href="/app/static/app.css">
</head><body>
<header class="top"><div class="wrap">
  <a class="logo" href="/app/"><span class="mark" aria-hidden="true">ค</span><span>ครูสไลด์<small>KRUSLIDE</small></span></a>
  ${nav}
</div></header>
<main><div class="wrap">${o.body}</div></main>
<footer class="foot"><div class="wrap">
  <span>© KruSlide · ครูสไลด์</span>
  <span><a href="/app/privacy">นโยบายความเป็นส่วนตัว</a> · ติดต่อทาง LINE: <b>${lineOa(ctx.env)}</b></span>
</div></footer>
</body></html>`;
}

export function errorPage(ctx: Ctx, status: number, message: string): Safe {
  const title = status === 404 ? 'ไม่พบหน้านี้' : status === 403 ? 'ไม่มีสิทธิ์เข้าหน้านี้' : status === 429 ? 'โปรดรอสักครู่' : 'เกิดข้อผิดพลาด';
  return page(ctx, {
    title,
    body: html`<div class="card empty"><h1>${title}</h1><p>${message}</p><p><a class="btn ghost" href="/app/">กลับหน้าแรก</a></p></div>`,
  });
}
