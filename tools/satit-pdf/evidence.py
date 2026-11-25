# Build the Thai evidence pack (HTML) from the Lighthouse runs; print it with print.cjs.
import csv, json, statistics, html, sys
from pathlib import Path

E = Path(sys.argv[1])            # evidence dir: raw/ reports/
OUT = Path(sys.argv[2])          # output html
FONTS = Path('/home/user/aia-slides/satit-site/fonts')
IMG = Path('/home/user/aia-slides/satit-site/pitch/img')
OLD_C, NEW_C = '#e2876f', '#16774a'   # validated pair (dataviz validator: all checks pass, light)

runs = list(csv.DictReader(open(E / 'raw/runs.csv')))
def med(site, ff, key):
    return statistics.median(float(r[key]) for r in runs if r['site'] == site and r['form_factor'] == ff)
def lhr(n): return json.load(open(E / f'raw/{n}.json'))
L = {n: lhr(n) for n in ['old-mobile', 'new-mobile', 'old-desktop', 'new-desktop']}
AF = {f: json.load(open(E / f'reports/new-{f}-after-fix.report.json')) for f in ['mobile', 'desktop']}

M = {(s, f): {k: med(s, f, k) for k in ['performance', 'accessibility', 'best_practices', 'seo', 'FCP_s', 'LCP_s', 'TBT_ms', 'CLS', 'SpeedIndex_s', 'total_KiB', 'requests']}
     for s in ['old', 'new'] for f in ['mobile', 'desktop']}

def fmt(x, d=1): return f'{x:,.{d}f}'

# ---------- chart: small multiples, one scale per panel (different units), paired bars ----------
def panel(title, unit, old, new, note, thresholds=None, d=1):
    W, H, x0, bw = 340, 132, 46, 284
    mx = max(old, new)
    lines = [x0 + bw * v / mx for v, _ in (thresholds or []) if v < mx]
    def bar(y, v, c, lab):
        w = max(6, bw * v / mx); inside = w > bw - 80
        lx = max([x0 + w + 8] + [x + 5 for x in lines if x > x0 + w - 2 and x < x0 + w + 60])
        return (f'<text x="0" y="{y+17}" class="bl">{lab}</text>'
                f'<path d="M{x0} {y} h{w-4} a4 4 0 0 1 4 4 v18 a4 4 0 0 1 -4 4 h-{w-4} z" fill="{c}"/>'
                f'<text x="{x0+w-8 if inside else lx}" y="{y+17}" class="bv" text-anchor="{"end" if inside else "start"}"{" fill=\"#fff\"" if inside else ""}>{fmt(v, d)} {unit}</text>')
    th = ''
    if thresholds:
        xs = [(x0 + bw * v / mx, lab) for v, lab in thresholds if v < mx]
        for x, lab in xs: th += f'<line x1="{x}" x2="{x}" y1="22" y2="112" class="th"/>'
        if len(xs) == 2 and xs[1][0] - xs[0][0] < 60:
            th += f'<text x="{xs[0][0]}" y="16" class="tl">เกณฑ์ ดี ≤2.5 · แย่ &gt;4 วิ</text>'
        else:
            for x, lab in xs: th += f'<text x="{x}" y="16" class="tl" text-anchor="middle">{lab}</text>'
    return (f'<figure class="pn"><figcaption><b>{title}</b><span>{note}</span></figcaption>'
            f'<svg viewBox="0 0 {W} {H}" width="100%">{th}{bar(30, old, OLD_C, "เว็บเดิม")}{bar(76, new, NEW_C, "เว็บใหม่")}</svg></figure>')

chart = ''.join([
    panel('เวลาเห็นเนื้อหาหลัก · มือถือ', 'วิ', M['old', 'mobile']['LCP_s'], M['new', 'mobile']['LCP_s'],
          f'LCP ค่ากลาง 3 รอบ · น้อยกว่าดีกว่า · เร็วขึ้น {M["old","mobile"]["LCP_s"]/M["new","mobile"]["LCP_s"]:.1f} เท่า', [(2.5, 'ดี ≤2.5'), (4.0, 'แย่ >4')]),
    panel('เวลาเห็นเนื้อหาหลัก · คอมพิวเตอร์', 'วิ', M['old', 'desktop']['LCP_s'], M['new', 'desktop']['LCP_s'],
          f'LCP ค่ากลาง 3 รอบ · น้อยกว่าดีกว่า · เร็วขึ้น {M["old","desktop"]["LCP_s"]/M["new","desktop"]["LCP_s"]:.1f} เท่า', [(2.5, 'ดี ≤2.5'), (4.0, 'แย่ >4')]),
    panel('ขนาดหน้าแรก · มือถือ', 'MB', M['old', 'mobile']['total_KiB']/1024, M['new', 'mobile']['total_KiB']/1024,
          f'ข้อมูลที่ต้องโหลด · เบาลง {M["old","mobile"]["total_KiB"]/M["new","mobile"]["total_KiB"]:.1f} เท่า'),
    panel('จำนวนไฟล์ที่โหลด · มือถือ', 'ไฟล์', M['old', 'mobile']['requests'], M['new', 'mobile']['requests'],
          f'คำขอทั้งหมดของหน้าแรก · น้อยลง {M["old","mobile"]["requests"]/M["new","mobile"]["requests"]:.1f} เท่า', d=0),
])

# ---------- all runs ----------
def th_time(iso):  # UTC -> Thai time (UTC+7)
    h, m, s = iso[11:19].split(':'); return f'{(int(h)+7)%24:02d}:{m}'
rows = ''
for r in sorted(runs, key=lambda r: (r['form_factor'], r['site'] != 'old', r['run'])):
    rows += (f'<tr><td>{"เดิม" if r["site"]=="old" else "ใหม่"}</td><td>{"มือถือ" if r["form_factor"]=="mobile" else "คอม"}</td><td>{r["run"]}</td>'
             f'<td>{th_time(r["fetch_time_utc"])}</td><td>{r["performance"]}</td><td>{r["accessibility"]}</td><td>{r["best_practices"]}</td><td>{r["seo"]}</td>'
             f'<td>{r["FCP_s"]}</td><td><b>{r["LCP_s"]}</b></td><td>{r["TBT_ms"]}</td><td>{r["CLS"]}</td><td>{int(r["total_KiB"]):,}</td><td>{r["requests"]}</td></tr>')

# ---------- resource breakdown ----------
TYPES = [('image', 'รูปภาพ'), ('script', 'สคริปต์ (JavaScript)'), ('stylesheet', 'ไฟล์ตกแต่ง (CSS)'), ('font', 'ฟอนต์'), ('document', 'หน้าเว็บ (HTML)'), ('other', 'อื่นๆ'), ('third-party', 'ในนั้นมาจากเว็บอื่น (third-party)')]
def rs(n): return {i['resourceType']: i for i in L[n]['audits']['resource-summary']['details']['items']}
ro, rn = rs('old-mobile'), rs('new-mobile')
brk = ''.join(f'<tr><td>{lab}</td><td>{ro.get(t,{}).get("requestCount",0)}</td><td>{round(ro.get(t,{}).get("transferSize",0)/1024):,}</td>'
              f'<td>{rn.get(t,{}).get("requestCount",0)}</td><td>{round(rn.get(t,{}).get("transferSize",0)/1024):,}</td></tr>' for t, lab in TYPES)

def obs(n, k): return L[n]['audits']['metrics']['details']['items'][0][k] / 1000

# ---------- WCAG mapping (axe-core 4.14 rule tags, same as Lighthouse 13.6) ----------
WC = [('1.4.3', 'Contrast (Minimum) · สีตัวอักษรตัดกับพื้นไม่พอ', 'AA', 'color-contrast'),
      ('2.4.4', 'Link Purpose · ลิงก์ไม่มีชื่อบอกว่าไปไหน', 'A', 'link-name'),
      ('4.1.2', 'Name, Role, Value · ปุ่ม/ลิงก์ไม่มีชื่อให้โปรแกรมอ่านจอ', 'A', 'link-name, aria-prohibited-attr'),
      ('2.5.8', 'Target Size (Minimum) · จุดแตะเล็กหรือชิดกันเกินไป', 'AA (ใหม่ใน 2.2)', 'target-size')]
def items(n, a): return len((L[n]['audits'][a].get('details') or {}).get('items', [])) if L[n]['audits'][a]['score'] not in (None, 1) else 0
def wc_cell(n, rules):
    c = sum(items(n, a.strip()) for a in rules.split(','))
    return f'<td class="no">ไม่ผ่าน · {c} จุด</td>' if c else '<td class="ok">ผ่าน</td>'
wrows = ''.join(f'<tr><td><b>{sc}</b> {name}</td><td>{lvl}</td>{wc_cell("old-mobile", r)}{wc_cell("new-mobile", r)}</tr>' for sc, name, lvl, r in WC)
af_fail = [a for a in AF['mobile']['categories']['accessibility']['auditRefs'] if a['weight'] > 0 and AF['mobile']['audits'][a['id']]['score'] not in (None, 1)]

# ---------- headers ----------
oh = (E / 'raw/old-home.txt').read_text().strip(); ohh = (E / 'raw/old-home-http.txt').read_text().strip()
nh = (E / 'raw/new-home.txt').read_text().strip(); nhh = (E / 'raw/new-home-http.txt').read_text().strip()
def keep(t, keys): return '\n'.join(l for l in t.splitlines() if l.split(':')[0].lower() in keys or l.startswith('HTTP'))
K = {'server', 'x-powered-by', 'strict-transport-security', 'location', 'content-security-policy', 'x-content-type-options', 'date'}

def F(name, w, fam): return f"@font-face{{font-family:{fam};font-weight:{w};src:url('{(FONTS/name).as_uri()}')}}"
fonts = ''.join(F(f'anuphan-{s}-{w}-normal.woff2', w, 'Anuphan') for s in ['thai', 'latin'] for w in [500, 600, 700]) + \
        ''.join(F(f'ibm-plex-sans-thai-{s}-{w}-normal.woff2', w, 'Plex') for s in ['thai', 'latin'] for w in [400, 500, 600, 700])

g = M  # shorthand
doc = f'''<!doctype html><html lang="th"><head><meta charset="utf-8"><title>หลักฐานการทดสอบความเร็ว: เว็บโรงเรียนสาธิต มรภ.เพชรบุรี</title>
<style>{fonts}
@page{{size:A4;margin:16mm 15mm 16mm}}
*{{box-sizing:border-box}}body{{margin:0;font:400 10.6pt/1.6 Plex,sans-serif;color:#13241B}}
h1,h2,h3{{font-family:Anuphan;line-height:1.35;color:#0F3B2A;margin:0}}
h1{{font-size:24pt;font-weight:700}}h2{{font-size:15.5pt;font-weight:700;margin:0 0 6px;padding-top:4px}}h3{{font-size:11.5pt;font-weight:600;margin:12px 0 4px}}
.sec{{break-before:page}}.kick{{font:600 9pt Anuphan;letter-spacing:.12em;color:#8a6d1d;text-transform:uppercase}}
.lede{{font-size:11.5pt;color:#33463c;margin:6px 0 14px}}
.cover{{border-bottom:3px solid #E7BE55;padding-bottom:12px;margin-bottom:14px}}
.meta{{display:flex;gap:18px;flex-wrap:wrap;font-size:9.4pt;color:#4E5D55;margin-top:6px}}
.tiles{{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0 14px}}
.tile{{border:1px solid #dfe5e1;border-radius:10px;padding:9px 11px;background:#f7f9f8;break-inside:avoid}}
.tile b{{display:block;font:700 15pt/1.25 Anuphan;color:#0F3B2A}}.tile span{{font-size:8.8pt;color:#4E5D55;display:block;line-height:1.4}}
.legend{{display:flex;gap:16px;font-size:9pt;color:#33463c;margin:2px 0 4px}}.legend i{{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-1px}}
.charts{{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px}}
.pn{{margin:0;break-inside:avoid}}.pn figcaption b{{display:block;font:600 10.5pt Anuphan;color:#13241B}}.pn figcaption span{{font-size:8.6pt;color:#4E5D55}}
svg .bl{{font:500 10px Plex;fill:#33463c}}svg .bv{{font:600 11px Plex;fill:#13241B}}svg .th{{stroke:#4E5D55;stroke-width:1;stroke-dasharray:3 3}}svg .tl{{font:400 8.5px Plex;fill:#4E5D55}}
table{{width:100%;border-collapse:collapse;font-size:9.2pt;margin:6px 0 10px;break-inside:auto}}
th,td{{padding:4px 6px;border-bottom:1px solid #e3e8e5;text-align:left;vertical-align:top}}th{{background:#eef2ef;font-weight:600;color:#0F3B2A}}
tr{{break-inside:avoid}}.num td{{text-align:right}}.num td:nth-child(-n+3){{text-align:left}}
td.ok{{color:#16774a;font-weight:600}}td.no{{color:#b4412f;font-weight:600}}td.mid{{color:#8a6d1d;font-weight:600}}
.box{{border-left:4px solid #E7BE55;background:#fbf7ea;padding:8px 12px;border-radius:0 8px 8px 0;margin:8px 0 10px;break-inside:avoid}}
.box.g{{border-color:#16774a;background:#eef5f1}}
ul,ol{{margin:4px 0 8px;padding-left:20px}}li{{margin:2px 0}}
pre{{font:400 8.2pt/1.45 ui-monospace,Menlo,monospace;background:#f4f6f5;border:1px solid #e3e8e5;border-radius:6px;padding:7px 9px;white-space:pre-wrap;word-break:break-all;margin:4px 0}}
code{{font:400 8.8pt ui-monospace,Menlo,monospace;background:#f1f4f2;padding:0 3px;border-radius:3px}}
.two{{display:grid;grid-template-columns:1fr 1fr;gap:14px}}.shots{{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:6px}}
.shots figure{{margin:0;text-align:center;break-inside:avoid}}.shots img{{width:48%;border:1px solid #ccd5d0;border-radius:10px}}.shots figcaption{{font-size:8.8pt;color:#4E5D55}}
.small{{font-size:8.6pt;color:#4E5D55}}a{{color:#1E5A41}}
</style></head><body>

<div class="cover"><div class="kick">หลักฐานการทดสอบ · Evidence pack</div>
<h1>เว็บใหม่เร็วกว่าเว็บเดิมจริงหรือไม่</h1>
<div class="lede">เทียบหน้าแรกของเว็บโรงเรียนสาธิต มรภ.เพชรบุรี เว็บเดิมกับเว็บใหม่ วัดด้วยเครื่องมือเดียวกัน วันเดียวกัน เครือข่ายเดียวกัน และตัดสินด้วยเกณฑ์สากล ไม่ใช่เกณฑ์ที่เราตั้งเอง</div>
<div class="meta"><span>เครื่องมือ: Lighthouse 13.6.0 (Google)</span><span>วันที่วัด: 25 พ.ย. 2569 เวลา 13:13–13:23 น.</span><span>วัดซ้ำ: 3 รอบต่อแบบ ใช้ค่ากลาง</span></div>
<div class="meta"><span>เว็บเดิม: www.pbru.ac.th/pbru/satit</span><span>เว็บใหม่ (ต้นแบบ): mmjx2013-png.github.io/aia-slides/satit/</span></div></div>

<h2>ผลโดยสรุป</h2>
<div class="tiles">
<div class="tile"><span>มือถือ · เห็นเนื้อหาหลัก</span><b>{fmt(g['old','mobile']['LCP_s'])} → {fmt(g['new','mobile']['LCP_s'])} วิ</b><span>เร็วขึ้น {g['old','mobile']['LCP_s']/g['new','mobile']['LCP_s']:.1f} เท่า</span></div>
<div class="tile"><span>คอมพิวเตอร์ · เห็นเนื้อหาหลัก</span><b>{fmt(g['old','desktop']['LCP_s'])} → {fmt(g['new','desktop']['LCP_s'])} วิ</b><span>เร็วขึ้น {g['old','desktop']['LCP_s']/g['new','desktop']['LCP_s']:.1f} เท่า</span></div>
<div class="tile"><span>ข้อมูลที่ต้องโหลด (มือถือ)</span><b>{g['old','mobile']['total_KiB']/1024:.1f} → {g['new','mobile']['total_KiB']/1024:.1f} MB</b><span>เบาลง {g['old','mobile']['total_KiB']/g['new','mobile']['total_KiB']:.1f} เท่า</span></div>
<div class="tile"><span>จำนวนไฟล์ (มือถือ)</span><b>{int(g['old','mobile']['requests'])} → {int(g['new','mobile']['requests'])}</b><span>น้อยลง {g['old','mobile']['requests']/g['new','mobile']['requests']:.1f} เท่า</span></div>
</div>
<div class="legend"><span><i style="background:{OLD_C}"></i>เว็บเดิม</span><span><i style="background:{NEW_C}"></i>เว็บใหม่</span><span class="small">เส้นประ = เกณฑ์ Core Web Vitals (ดี ≤ 2.5 วิ · แย่ &gt; 4 วิ)</span></div>
<div class="charts">{chart}</div>
<div class="box g"><b>อ่านอย่างไร:</b> LCP (Largest Contentful Paint) คือเวลาตั้งแต่กดเปิดจนเห็นเนื้อหาชิ้นใหญ่ที่สุดบนจอ เป็นตัวชี้วัดหลักของ Google ว่าเว็บ "ขึ้นเร็ว" หรือไม่ ตัวเลขทุกตัวในหน้านี้เป็นค่ากลางของ 3 รอบ และวัดสลับเว็บเดิม–เว็บใหม่ในช่วง 10 นาทีเดียวกัน ทั้งสองเว็บจึงเจอสภาพเน็ตเดียวกัน</div>

<section class="sec"><h2>1. วิธีทดสอบ</h2>
<table><tr><th style="width:28%">หัวข้อ</th><th>รายละเอียด</th></tr>
<tr><td>เครื่องมือ</td><td>Lighthouse 13.6.0 ของ Google เป็นโปรแกรมโอเพนซอร์ส ตัวเดียวกับที่อยู่ใน Chrome และ PageSpeed Insights</td></tr>
<tr><td>เครื่องที่ใช้วัด</td><td>คอมพิวเตอร์ Mac ผ่าน Chrome 158 แบบไม่มีหน้าจอ (headless) ต่อเน็ตบ้านในประเทศไทย</td></tr>
<tr><td>วันและเวลา</td><td>25 พฤศจิกายน 2569 เวลา 13:13–13:23 น. (เวลาประเทศไทย)</td></tr>
<tr><td>จำลองมือถือ</td><td>จอกว้าง 412 px · CPU ช้าลง 4 เท่า (มือถือระดับกลาง) · เน็ต 4G ช้า: หน่วง 150 ms, ดาวน์โหลด 1.6 Mbps (ค่ามาตรฐานของ Lighthouse)</td></tr>
<tr><td>จำลองคอมพิวเตอร์</td><td>จอกว้าง 1350 px · CPU ปกติ · หน่วง 40 ms, 10 Mbps</td></tr>
<tr><td>ความยุติธรรม</td><td>วัดสลับ เดิม → ใหม่ ทีละรอบ ใช้ค่าตั้งเดียวกันทุกครั้ง ไม่ได้แก้ไขเว็บใดระหว่างการวัด</td></tr>
<tr><td>การสรุปผล</td><td>วัดแบบละ 3 รอบ ใช้ค่ากลาง (median) ตามที่ Google แนะนำ เพื่อตัดผลของรอบที่เน็ตสะดุด</td></tr></table>

<h3>ผลดิบทุกรอบ (12 รอบ)</h3>
<table class="num"><tr><th>เว็บ</th><th>แบบ</th><th>รอบ</th><th>เวลา</th><th>Perf</th><th>A11y</th><th>BP</th><th>SEO</th><th>FCP วิ</th><th>LCP วิ</th><th>TBT ms</th><th>CLS</th><th>KiB</th><th>ไฟล์</th></tr>{rows}</table>
<p class="small">Perf = คะแนนความเร็ว · A11y = การเข้าถึง · BP = Best Practices · FCP = เวลาเห็นอะไรบางอย่างครั้งแรก · TBT = เวลาที่หน้าค้างตอบสนองไม่ได้ · CLS = หน้ากระโดดระหว่างโหลด · KiB = ข้อมูลที่โหลด (1,024 KiB = 1 MB)</p>
</section>

<section class="sec"><h2>2. ตัดสินด้วยเกณฑ์สากล</h2>
<p>คะแนน 0–100 ของ Lighthouse ไม่ใช่มาตรฐานสากล หน้านี้จึงใช้ผลวัดชุดเดียวกัน แต่ตัดสินด้วยเกณฑ์ที่องค์กรกลางกำหนด</p>

<h3>2.1 ความเร็ว: Core Web Vitals</h3>
<p class="small">ความเร็วเว็บยังไม่มีมาตรฐาน ISO เกณฑ์ที่ใช้กันทั่วโลกคือ Core Web Vitals ซึ่ง Google กำหนดจากงานวิจัย (web.dev/articles/defining-core-web-vitals-thresholds) เราใช้เกณฑ์นี้เพราะเป็นกลางและเปิดเผย ไม่ใช่เกณฑ์ที่เราตั้งเอง</p>
<table><tr><th>ตัวชี้วัด</th><th>เกณฑ์ ดี / แย่</th><th>เว็บเดิม</th><th>เว็บใหม่</th></tr>
<tr><td>LCP มือถือ</td><td>≤ 2.5 วิ / &gt; 4 วิ</td><td class="no">{fmt(g['old','mobile']['LCP_s'])} วิ · แย่</td><td class="mid">{fmt(g['new','mobile']['LCP_s'])} วิ · ต้องปรับปรุง</td></tr>
<tr><td>LCP คอมพิวเตอร์</td><td>≤ 2.5 วิ / &gt; 4 วิ</td><td class="no">{fmt(g['old','desktop']['LCP_s'])} วิ · แย่</td><td class="ok">{fmt(g['new','desktop']['LCP_s'])} วิ · ดี</td></tr>
<tr><td>CLS มือถือ</td><td>≤ 0.1 / &gt; 0.25</td><td class="ok">{g['old','mobile']['CLS']:.3f} · ดี</td><td class="ok">{g['new','mobile']['CLS']:.3f} · ดี</td></tr>
<tr><td>CLS คอมพิวเตอร์</td><td>≤ 0.1 / &gt; 0.25</td><td class="ok">{g['old','desktop']['CLS']:.3f} · ดี</td><td class="ok">{g['new','desktop']['CLS']:.3f} · ดี</td></tr>
<tr><td>INP (การตอบสนองเมื่อแตะ)</td><td>≤ 200 ms / &gt; 500 ms</td><td colspan="2">วัดได้จากผู้ใช้จริงเท่านั้น การทดสอบนี้จึงไม่มีค่า INP</td></tr></table>
<div class="box">ข้อที่เว็บใหม่ยังไม่ผ่าน: LCP บนมือถือ {fmt(g['new','mobile']['LCP_s'])} วิ สูงกว่าเกณฑ์ "ดี" อยู่ {g['new','mobile']['LCP_s']-2.5:.1f} วินาที จึงอยู่ในระดับ "ต้องปรับปรุง" ส่วนเว็บเดิมอยู่ในระดับ "แย่" ทั้งมือถือและคอมพิวเตอร์</div>

<h3>2.2 การเข้าถึงของทุกคน: WCAG 2.2 ระดับ AA (W3C · ISO/IEC 40500:2025)</h3>
<p class="small">WCAG 2.2 เป็นมาตรฐานของ W3C และได้รับการรับรองเป็นมาตรฐาน ISO/IEC 40500:2025 แล้ว ด้านล่างคือข้อที่ตรวจพบอัตโนมัติจากหน้าแรก (Lighthouse ใช้ axe-core 4.14 ซึ่งระบุว่ากฎแต่ละข้อตรงกับข้อใดของ WCAG)</p>
<table><tr><th>ข้อของ WCAG 2.2</th><th>ระดับ</th><th>เว็บเดิม</th><th>เว็บใหม่ (วันที่วัด)</th></tr>{wrows}
<tr><td><b>รวมข้อที่ไม่ผ่าน</b></td><td></td><td class="no">4 ข้อ</td><td class="mid">1 ข้อ</td></tr></table>
<p class="small">เว็บใหม่เสียคะแนนเพิ่มอีก 1 ข้อคือลำดับหัวข้อ (heading-order) ซึ่ง axe-core จัดเป็นแนวปฏิบัติที่ดี ไม่ใช่ข้อของ WCAG · หลังวัด เราแก้เว็บใหม่แล้ว วัดซ้ำได้ {'ไม่พบข้อที่ไม่ผ่าน' if not af_fail else str(len(af_fail))+' ข้อ'} (ดูหัวข้อ 5) · การตรวจอัตโนมัติครอบคลุม WCAG เพียงบางส่วน ทั้งสองเว็บยังไม่ได้ตรวจด้วยคนครบทุกข้อ จึงยังไม่มีเว็บใดอ้างได้ว่าผ่าน WCAG 2.2 AA ทั้งหมด</p>

<h3>2.3 ความปลอดภัย: OWASP ASVS 5.0.0 (ส่วนที่ตรวจจากภายนอกได้)</h3>
<p class="small">ASVS คือมาตรฐานตรวจความปลอดภัยเว็บของ OWASP (มูลนิธิไม่แสวงกำไรด้านความปลอดภัยซอฟต์แวร์) ระดับ 1 คือขั้นต่ำที่ทุกเว็บควรผ่าน ตรวจโดยอ่านส่วนหัว (header) ที่เซิร์ฟเวอร์ส่งให้ทุกคนอยู่แล้ว ไม่ได้ทดสอบเจาะระบบ</p>
<table><tr><th style="width:38%">ข้อ ASVS 5.0.0</th><th>ระดับ</th><th>เว็บเดิม</th><th>เว็บใหม่</th></tr>
<tr><td><b>V3.4.1</b> ส่ง HSTS บังคับ https อย่างน้อย 1 ปี (มาตรฐาน IETF RFC 6797)</td><td>1</td><td class="no">ไม่ผ่าน · ไม่มี HSTS</td><td class="ok">ผ่าน · max-age=31556952 (1 ปี)</td></tr>
<tr><td><b>V12.2.1</b> ใช้การเข้ารหัส (TLS) ทุกครั้ง ไม่ยอมให้เปิดแบบไม่เข้ารหัส</td><td>1</td><td class="no">ไม่ผ่าน · http:// เปิดได้ (200) ไม่ส่งต่อไป https</td><td class="ok">ผ่าน · http:// ส่งต่อ 301 ไป https</td></tr>
<tr><td><b>V15.2.1</b> ส่วนประกอบยังอยู่ในกรอบเวลาการอัปเดต</td><td>1</td><td class="no">ไม่ผ่าน · PHP 7.3.33 หมดการดูแล 6 ธ.ค. 2564</td><td class="ok">ผ่าน · ไม่มีซอฟต์แวร์ฝั่งเซิร์ฟเวอร์ของเราเอง (GitHub ดูแล)</td></tr>
<tr><td><b>V3.4.3</b> มี Content-Security-Policy กันสคริปต์แปลกปลอม</td><td>2</td><td class="no">ไม่ผ่าน</td><td class="no">ไม่ผ่าน · จะเพิ่มก่อนใช้งานจริง</td></tr>
<tr><td><b>V3.4.4</b> มี X-Content-Type-Options: nosniff</td><td>2</td><td class="no">ไม่ผ่าน</td><td class="no">ไม่ผ่าน · GitHub Pages ไม่ให้ตั้งเอง</td></tr>
<tr><td><b>V13.4.6</b> ไม่เปิดเผยรุ่นของซอฟต์แวร์ฝั่งเซิร์ฟเวอร์</td><td>3</td><td class="no">ไม่ผ่าน · Apache/2.4.52 OpenSSL/1.1.1a PHP/7.3.33</td><td class="ok">ผ่าน · แสดงแค่ "GitHub.com"</td></tr>
<tr><td><b>สรุประดับ 1</b> (ขั้นต่ำ)</td><td></td><td class="no">ผ่าน 0 จาก 3</td><td class="ok">ผ่าน 3 จาก 3</td></tr></table>
<p class="small">OpenSSL ของเว็บเดิมเป็นรุ่นของ FreeBSD ซึ่งอาจแพตช์เองโดยไม่เปลี่ยนเลขรุ่น ข้อ V15.2.1 จึงยึดที่ PHP 7.3 ซึ่งหมดการดูแลแน่นอน (php.net/eol.php) ควรให้ฝ่ายไอทีของมหาวิทยาลัยยืนยัน</p>
</section>

<section><h2 style="margin-top:14px">3. ทำไมเว็บเดิมช้า</h2>
<p>เว็บเดิมต้องโหลดข้อมูลมากกว่าเกือบ 7 เท่า และต้องโหลดไฟล์ตกแต่ง 29 ไฟล์กับสคริปต์ 49 ไฟล์ ก่อนแสดงผลได้ บนมือถือที่ CPU ช้าและเน็ตช้า งานส่วนนี้จึงกินเวลามากที่สุด</p>
<table class="num"><tr><th>ประเภท (มือถือ รอบที่ 1)</th><th>เดิม ไฟล์</th><th>เดิม KiB</th><th>ใหม่ ไฟล์</th><th>ใหม่ KiB</th></tr>{brk}
<tr><td><b>รวม</b></td><td><b>{ro['total']['requestCount']}</b></td><td><b>{round(ro['total']['transferSize']/1024):,}</b></td><td><b>{rn['total']['requestCount']}</b></td><td><b>{round(rn['total']['transferSize']/1024):,}</b></td></tr></table>
<p class="small">ตารางนี้นับตามหมวดของ Lighthouse จึงอาจน้อยกว่ายอดคำขอทั้งหมด 1 รายการ (114 และ 25) · เว็บใหม่โหลดจาก GitHub ทั้งหมด Lighthouse จึงนับเป็น third-party</p>

<h3>ตัวเลขที่วัดได้จริง ก่อนจำลองมือถือ</h3>
<p>ตัวเลขหลักในเอกสารนี้เป็นค่าที่ Lighthouse <b>คำนวณ</b>ว่ามือถือระดับกลางบนเน็ต 4G ช้าจะได้เท่าไร ส่วนค่าด้านล่างคือเวลาที่<b>เกิดขึ้นจริง</b>บนคอมพิวเตอร์ Mac กับเน็ตบ้าน (เร็ว) ในรอบเดียวกัน</p>
<table><tr><th>รอบที่ 1 · วัดจริง ไม่จำลอง</th><th>เว็บเดิม</th><th>เว็บใหม่</th></tr>
<tr><td>เห็นอะไรครั้งแรก (FCP) · แบบมือถือ</td><td>{obs('old-mobile','observedFirstContentfulPaint'):.2f} วิ</td><td>{obs('new-mobile','observedFirstContentfulPaint'):.2f} วิ</td></tr>
<tr><td>เห็นเนื้อหาหลัก (LCP) · แบบมือถือ</td><td>{obs('old-mobile','observedLargestContentfulPaint'):.2f} วิ</td><td>{obs('new-mobile','observedLargestContentfulPaint'):.2f} วิ</td></tr>
<tr><td>เห็นเนื้อหาหลัก (LCP) · แบบคอมพิวเตอร์</td><td>{obs('old-desktop','observedLargestContentfulPaint'):.2f} วิ</td><td>{obs('new-desktop','observedLargestContentfulPaint'):.2f} วิ</td></tr></table>
<div class="box">พูดตรงๆ: บนเครื่องแรงและเน็ตเร็ว ทั้งสองเว็บขึ้นภายในราว 1 วินาที และเว็บใหม่ยังเร็วกว่า ความต่างจะห่างมากเมื่อเป็นมือถือทั่วไปกับเน็ตช้า ซึ่งเป็นสภาพของผู้ปกครองจำนวนมาก และเป็นสภาพที่ Google ใช้ตัดสินเว็บ</div>

<h3>ภาพที่ผู้ปกครองเห็นบนมือถือ (จอแรก)</h3>
<div class="shots"><figure><img src="{(IMG/'old-top.webp').as_uri()}"><figcaption>เว็บเดิม</figcaption></figure><figure><img src="{(IMG/'new-top.webp').as_uri()}"><figcaption>เว็บใหม่</figcaption></figure></div>
</section>

<section><h2 style="margin-top:14px">4. ส่วนหัวที่เซิร์ฟเวอร์ส่งมา (หลักฐานข้อ 2.3)</h2>
<p class="small">ได้จากคำสั่ง <code>curl -sI</code> เมื่อ 25 พ.ย. 2569 13:13 น. แสดงเฉพาะบรรทัดที่เกี่ยวข้อง ค่าคุกกี้ถูกปิดไว้ ไฟล์เต็มอยู่ในชุดข้อมูลดิบ</p>
<div class="two"><div><h3>เว็บเดิม · https://</h3><pre>{html.escape(keep(oh, K))}</pre><h3>เว็บเดิม · http://</h3><pre>{html.escape(keep(ohh, K))}</pre></div>
<div><h3>เว็บใหม่ · https://</h3><pre>{html.escape(keep(nh, K))}</pre><h3>เว็บใหม่ · http://</h3><pre>{html.escape(keep(nhh, K))}</pre></div></div>

<h2 style="margin-top:12px">5. วัดซ้ำเว็บใหม่หลังแก้</h2>
<p>หลังวัดผลชุดหลัก เราแก้จุดที่เว็บใหม่เสียคะแนน (ไอคอนแท็บ สีตัวอักษร ลำดับหัวข้อ) แล้ววัดซ้ำด้วย Lighthouse 13.6.0 รุ่นเดียวกัน ({th_time(AF['mobile']['fetchTime'])} น. วันเดียวกัน):</p>
<table><tr><th></th><th>ความเร็ว</th><th>การเข้าถึง</th><th>Best Practices</th><th>SEO</th><th>LCP</th></tr>
{''.join(f"<tr><td>{'มือถือ' if f=='mobile' else 'คอมพิวเตอร์'}</td>" + ''.join(f"<td>{round(AF[f]['categories'][c]['score']*100)}</td>" for c in ['performance','accessibility','best-practices','seo']) + f"<td>{AF[f]['audits']['largest-contentful-paint']['displayValue']}</td></tr>" for f in ['mobile','desktop'])}</table>
<div class="box">รอบนี้วัดจากเครื่องคลาวด์ ไม่ใช่เครื่อง Mac ชุดหลัก จึง<b>ไม่ใช้เทียบกับเว็บเดิม</b> ตัวเลขที่ใช้เทียบในสไลด์และในหน้า 1–3 คือรอบเดียวกันของทั้งสองเว็บเท่านั้น</div>
</section>

<section><h2 style="margin-top:14px">6. ข้อจำกัดที่ควรรู้</h2>
<ol>
<li><b>เป็นการทดสอบในห้องแล็บ</b> ไม่ใช่ข้อมูลผู้ใช้จริงทุกคน ตัวเลขจะต่างไปตามเครื่องและเน็ต แต่ทั้งสองเว็บวัดด้วยวิธีเดียวกันในเวลาเดียวกัน</li>
<li><b>เว็บใหม่ยังเป็นต้นแบบ</b> มี 16 หน้าและเนื้อหาน้อยกว่าเว็บเดิม เมื่อย้ายเนื้อหาครบ ขนาดอาจเพิ่มขึ้น แต่รูปทุกรูปถูกบีบอัดเป็น WebP และไม่มีสคริปต์หนัก</li>
<li><b>เว็บเดิมอยู่บนเซิร์ฟเวอร์ของมหาวิทยาลัย</b> ซึ่งรองรับเว็บอื่นด้วย ความเร็วอาจต่างกันตามช่วงเวลา</li>
<li><b>ตรวจความปลอดภัยเฉพาะส่วนหัวที่เปิดเผย</b> ไม่ได้ทดสอบเจาะระบบ และไม่ได้พบว่าเว็บเดิมถูกเจาะ</li>
<li><b>การตรวจ WCAG อัตโนมัติ</b> ครอบคลุมเพียงบางข้อ ต้องตรวจด้วยคนเพิ่มจึงจะยืนยันได้ว่าผ่านทั้งหมด</li>
</ol>

<h2 style="margin-top:12px">7. ตรวจซ้ำเองได้</h2>
<ol>
<li><b>ง่ายที่สุด:</b> เปิด <a href="https://pagespeed.web.dev">pagespeed.web.dev</a> วางที่อยู่เว็บ แล้วกด "วิเคราะห์" (คนละเครื่อง ตัวเลขจะต่างบ้าง แต่ทิศทางควรเหมือนเดิม)</li>
<li><b>ใน Chrome:</b> คลิกขวาที่หน้าเว็บ → ตรวจสอบ (Inspect) → แท็บ Lighthouse → เลือกอุปกรณ์เคลื่อนที่ → วิเคราะห์การโหลดหน้าเว็บ</li>
<li><b>ด้วยคำสั่ง (ได้ค่าแบบเดียวกับเอกสารนี้):</b>
<pre>npx lighthouse@13.6.0 https://www.pbru.ac.th/pbru/satit --output=html --view
npx lighthouse@13.6.0 https://www.pbru.ac.th/pbru/satit --preset=desktop --output=html --view
curl -sI https://www.pbru.ac.th/pbru/satit
curl -sI http://www.pbru.ac.th/pbru/satit</pre>
แล้วเปลี่ยนที่อยู่เป็น https://mmjx2013-png.github.io/aia-slides/satit/ เพื่อวัดเว็บใหม่</li></ol>

<h3>ไฟล์แนบ</h3>
<ul><li>รายงาน Lighthouse ฉบับเต็ม 4 ไฟล์ (เปิดด้วยเบราว์เซอร์ใดก็ได้): old-mobile.html · old-desktop.html · new-mobile.html · new-desktop.html</li>
<li>รายงานวัดซ้ำหลังแก้: new-mobile-after-fix.html · new-desktop-after-fix.html</li>
<li>ผลดิบทุกรอบ: runs.csv</li>
<li>ออนไลน์: mmjx2013-png.github.io/aia-slides/satit/pitch/evidence/</li></ul>

<h3>แหล่งอ้างอิงของเกณฑ์</h3>
<ul class="small">
<li>Core Web Vitals thresholds: web.dev/articles/defining-core-web-vitals-thresholds</li>
<li>WCAG 2.2: w3.org/TR/WCAG22 · ISO/IEC 40500:2025: w3.org/WAI/news/2025-10-21/wcag22-iso</li>
<li>OWASP ASVS 5.0.0 (พ.ค. 2568): github.com/OWASP/ASVS · HSTS: IETF RFC 6797</li>
<li>PHP 7.3 หมดการดูแล 6 ธ.ค. 2564: php.net/eol.php · OpenSSL 1.1.1 หมดการดูแล 11 ก.ย. 2566: openssl-library.org/policies/releasestrat</li>
<li>Lighthouse: github.com/GoogleChrome/lighthouse · axe-core 4.14: github.com/dequelabs/axe-core</li></ul>
</section>
</body></html>'''
OUT.write_text(doc)
print('wrote', OUT)
