# Thai security + bug report for the Satit concept site (HTML -> PDF with print.cjs).
# python3 security_report.py <lighthouse-json-dir> <out.html>
import glob, json, os, sys
from pathlib import Path
LH, OUT = Path(sys.argv[1]), Path(sys.argv[2])
FONTS = Path('/home/user/aia-slides/satit-site/fonts')

rows = ''
for f in sorted(glob.glob(str(LH / '*.json'))):
    l = json.load(open(f)); c = l['categories']; name = os.path.basename(f)[:-5]
    sc = [round(c[k]['score'] * 100) for k in ['performance', 'accessibility', 'best-practices', 'seo']]
    cells = ''.join(f'<td class="{"ok" if v >= 90 else "no"}">{v}</td>' for v in sc)
    rows += f'<tr><td>{name}</td>{cells}<td>{l["audits"]["largest-contentful-paint"]["displayValue"]}</td></tr>'

def F(name, w, fam): return f"@font-face{{font-family:{fam};font-weight:{w};src:url('{(FONTS/name).as_uri()}')}}"
fonts = ''.join(F(f'anuphan-{s}-{w}-normal.woff2', w, 'Anuphan') for s in ['thai', 'latin'] for w in [600, 700]) + \
        ''.join(F(f'ibm-plex-sans-thai-{s}-{w}-normal.woff2', w, 'Plex') for s in ['thai', 'latin'] for w in [400, 600])

FIND = [
 ('กลาง', 'QR สมัครเรียนบนโปสเตอร์ผ่านบริการย่อลิงก์ของบริษัทอื่น (qr.generatorqr.com) ถ้าบริการนั้นเปลี่ยนปลายทาง ผู้ปกครองอาจถูกพาไปจ่ายเงินผิดที่ ปัญหานี้มีในโปสเตอร์ต้นฉบับของโรงเรียนด้วย', 'รอ: ขอลิงก์ตรงของแบบฟอร์มสมัครจากโรงเรียน แล้วทำ QR ใหม่', 'wait'),
 ('ต่ำ', 'ถ้าวันหน้ามีครูโพสต์ข้อความหรือรูป อาจมีโค้ดแปลกปลอมปนเข้ามาในหน้าเว็บได้ (stored XSS ผ่านขั้นตอนสร้างหน้า)', 'แก้แล้ว: ตรวจทุกรูปทีละช่อง, ขั้นตอนสร้างหน้าปฏิเสธโค้ดแปลกปลอม, และมี CSP กันอีกชั้น', 'done'),
 ('ต่ำ', 'เว็บอื่นเอาหน้าเว็บเราไปซ้อนในหน้าของเขาได้ (clickjacking)', 'แก้แล้วบางส่วน: หน้าเว็บซ่อนตัวเมื่อถูกซ้อน · ปิดสนิทต้องใช้โฮสต์ที่ส่ง header frame-ancestors ได้ (ไฟล์ _headers เตรียมไว้แล้ว)', 'part'),
 ('ต่ำ', 'แผนที่ Google ส่งที่อยู่หน้าเว็บที่เปิดอยู่ให้ Google ทุกครั้งที่เปิดหน้าติดต่อ', 'แก้แล้ว: แผนที่โหลดเมื่อกดปุ่มเท่านั้น และส่งแค่ชื่อเว็บ', 'done'),
 ('ต่ำ', 'หน้าอ่านเรื่องกิโมโนบนโดเมนเดียวกัน ใส่ลิงก์รูปจากเว็บอื่นผ่าน ?seq= ได้', 'แก้แล้ว: รับเฉพาะโฟลเดอร์ในเว็บเรา', 'done'),
 ('ข้อมูล', 'เว็บต้นแบบใช้ชื่อและโลโก้โรงเรียน คนอาจเข้าใจว่าเป็นเว็บทางการ', 'แก้แล้ว: ป้าย "เว็บต้นแบบ · ยังไม่ใช่เว็บทางการ" บนสุดทุกหน้า', 'done'),
 ('สูง*', 'repo บน GitHub ไม่มีการป้องกัน branch ถ้ามีคนได้รหัสบัญชีไป จะแก้เว็บหรือแก้คำสั่งในไฟล์ความจำ (MEMORY.md) ที่ Claude ทุกแชทอ่านได้ (*สูงเฉพาะเมื่อบัญชีถูกยึด)', 'ต้องทำโดยเจ้าของบัญชี: เปิดยืนยันตัวตน 2 ชั้น (2FA หรือ passkey) และตั้ง ruleset กัน force-push บน main และ gh-pages', 'you'),
 ('กลาง', 'สไลด์และไฟล์หลักฐานที่เปิดสาธารณะ ระบุรุ่นซอฟต์แวร์ที่หมดการดูแลของเซิร์ฟเวอร์มหาวิทยาลัย เป็นข้อมูลที่ผู้ไม่หวังดีใช้เล็งเป้าได้', 'รอคุณตัดสินใจ: ผมแนะนำให้แจ้งฝ่ายไอทีของมหาวิทยาลัยก่อน และในฉบับสาธารณะเขียนแค่ "ซอฟต์แวร์หมดการดูแล" ไม่ระบุเลขรุ่น', 'wait'),
 ('ต่ำ', 'ชื่อจริงและอีเมลส่วนตัวของเจ้าของอยู่ในข้อมูล commit บางรายการ (ไม่อยู่ในเนื้อหาไฟล์)', 'ต้องทำโดยเจ้าของบัญชี: เปิด "Keep my email private" ใน GitHub', 'you'),
 ('ต่ำ', 'รูปนักเรียนที่เห็นหน้าชัด เผยแพร่จากบัญชีส่วนตัว', 'ควรมีหนังสืออนุญาตจากโรงเรียนที่ครอบคลุมเว็บนี้ (PDPA) และลบเมื่อจบโครงการต้นแบบ', 'you'),
]
LAB = {'done': ('ok', 'แก้แล้ว'), 'part': ('mid', 'แก้บางส่วน'), 'wait': ('mid', 'รอข้อมูล/ตัดสินใจ'), 'you': ('mid', 'คุณต้องทำ')}
frows = ''.join(f'<tr><td><b>{s}</b></td><td>{d}</td><td class="{LAB[k][0]}"><b>{LAB[k][1]}</b><br><span>{fx}</span></td></tr>' for s, d, fx, k in FIND)

doc = f'''<!doctype html><html lang="th"><head><meta charset="utf-8"><title>รายงานตรวจความปลอดภัยและบั๊ก</title><style>{fonts}
@page{{size:A4;margin:15mm}}body{{margin:0;font:400 10.3pt/1.6 Plex,sans-serif;color:#13241B}}
h1{{font:700 20pt/1.3 Anuphan;color:#0F3B2A;margin:0;border-bottom:3px solid #E7BE55;padding-bottom:8px}}h2{{font:700 13.5pt/1.35 Anuphan;color:#0F3B2A;margin:14px 0 4px}}
.lede{{color:#33463c;margin:6px 0 10px}}table{{width:100%;border-collapse:collapse;font-size:9.2pt;margin:4px 0 8px}}th,td{{border-bottom:1px solid #e1e7e3;padding:4px 6px;text-align:left;vertical-align:top}}th{{background:#eef2ef}}
tr{{break-inside:avoid}}td.ok{{color:#16774a}}td.no{{color:#b4412f;font-weight:600}}td.mid{{color:#8a6d1d}}td span{{color:#33463c;font-weight:400}}
.box{{border-left:4px solid #16774a;background:#eef5f1;padding:8px 12px;border-radius:0 8px 8px 0;margin:8px 0}}ul{{margin:4px 0;padding-left:20px}}
</style></head><body>
<h1>รายงานตรวจความปลอดภัยและบั๊ก: เว็บไซต์ต้นแบบโรงเรียนสาธิต</h1>
<p class="lede">25 พ.ย. 2569 · ขอบเขต: เว็บใหม่ 16 หน้า สไลด์นำเสนอ และ repo บน GitHub · ไม่ได้ทดสอบเซิร์ฟเวอร์ของมหาวิทยาลัย</p>
<div class="box"><b>สรุป:</b> red team 2 ทีมไม่พบช่องโหว่ระดับวิกฤตหรือสูงในตัวเว็บ ไม่พบรหัสลับหรือคีย์หลุดใน repo · ตรวจ WCAG 2.2 AA อัตโนมัติไม่พบข้อผิด · ไม่มี error ไม่มีลิงก์เสีย และไม่ล้นจอที่ทุกขนาด · ข้อที่เหลือต้องให้คุณหรือโรงเรียนตัดสินใจ หรือต้องย้ายโฮสต์</div>
<h2>วิธีตรวจ</h2><ul>
<li><b>Red team ทีม 1 (โจมตีหน้าเว็บ):</b> ลองใส่โค้ดอันตรายผ่าน 15 ช่องทาง (ที่อยู่เว็บ, #, ที่เก็บข้อมูลในเบราว์เซอร์, ข้อความข้ามหน้าต่าง ฯลฯ) ในทุกหน้า ทดสอบการซ้อนหน้า ลิงก์ และข้อมูลที่หลุด</li>
<li><b>Red team ทีม 2 (โจมตี repo และข้อมูลส่วนตัว):</b> สแกนรหัสลับทุก commit ทุก branch ด้วย detect-secrets และ regex, ตรวจ EXIF/GPS ในรูป 159 ไฟล์, ตรวจข้อมูลส่วนตัวและช่องทางยึดเว็บ</li>
<li><b>ตรวจบั๊ก:</b> 16 หน้า × 2 ภาษา × 7 ขนาดจอ (320–1440 px): error, คำขอที่ล้มเหลว, ล้นจอ, ลิงก์และจุดยึด, ข้อความที่ยังไม่แปล</li>
<li><b>WCAG 2.2 AA (ISO/IEC 40500:2025):</b> axe-core 4.14 ทุกหน้า 2 ภาษา 2 ขนาดจอ ทั้งแบบมีและไม่มีภาพเคลื่อนไหว</li>
<li><b>CSP:</b> เปิดทุกหน้าแล้วกดทุกปุ่มจริง (เปลี่ยนภาษา เมนู ตัวกรองข่าว แผนที่ การ์ด) 56 ครั้ง ต้องไม่มีอะไรถูกบล็อกผิด · สไลด์ 27 จังหวะ</li></ul>
<h2>สิ่งที่พบและสถานะ</h2>
<table><tr><th style="width:9%">ระดับ</th><th style="width:48%">ปัญหา</th><th>สถานะ</th></tr>{frows}</table>
<h2>สิ่งที่ตรวจแล้วไม่พบปัญหา</h2><ul>
<li>รหัสลับ คีย์ หรือรหัสผ่านใน repo (ทุก branch ทุก commit) · ไฟล์ .env · ระบบ CI ที่รันเองอัตโนมัติ</li>
<li>EXIF/GPS ในรูป · ข้อมูลติดต่อส่วนบุคคล (มีแต่เบอร์และอีเมลทางการของโรงเรียน)</li>
<li>DOM XSS: 0 จุดจากการลอง payload ทุกช่องทาง · ลิงก์เปิดแท็บใหม่ทุกอันมี noopener · ไม่มีลิงก์ http:// หรือ javascript:</li>
<li>ไฟล์ต้นฉบับ (build.py, src/, บทพูด) ไม่ถูกเผยแพร่บนเว็บ</li></ul>
<h2>การป้องกันที่เพิ่มในรอบนี้</h2><ul>
<li>Content-Security-Policy ทุกหน้า: รันได้เฉพาะสคริปต์ของเว็บเอง (ยืนยันด้วยค่า hash), เปิด Trusted Types, ห้าม object/base/form แปลกปลอม (ตาม OWASP ASVS 5.0 ข้อ V3.4.3)</li>
<li>Referrer-Policy: ส่งแค่ชื่อเว็บเมื่อออกไปเว็บอื่น · แผนที่โหลดเมื่อกด</li>
<li>WCAG: สีตัวอักษร, ขนาดปุ่ม TH/EN (2.5.8), ชื่อปุ่มตรงกับที่เห็น (2.5.3), ลำดับหัวข้อ, ป้ายสำหรับโปรแกรมอ่านจอเปลี่ยนตามภาษา, ระบุภาษาของข้อความ (3.1.2), ภาพเคลื่อนไหวแบบเผยไม่ลดความคมของตัวอักษร</li>
<li>เร็วขึ้น: รูปหน้าแรกเล็กลง, รูปที่ยังไม่เห็นโหลดทีหลัง, CSS ฝังในหน้า, โลโก้ 40 KB → 3 KB</li></ul>
<h2>Lighthouse หลังแก้ (เว็บจริง วัดจากเครื่องคลาวด์ 25 พ.ย. 2569)</h2>
<table><tr><th>หน้า</th><th>ความเร็ว</th><th>การเข้าถึง</th><th>Best Practices</th><th>SEO</th><th>LCP</th></tr>{rows}</table>
<h2>ข้อจำกัดที่ต้องรู้</h2><ul>
<li>ไม่มีใครรับประกันได้ว่าเว็บใด "ไม่มีช่องโหว่เลย" สิ่งที่ทำได้คือผ่านทุกข้อของมาตรฐานที่ตรวจได้ และ red team ไม่พบช่องทางโจมตีที่ใช้ได้จริง</li>
<li>GitHub Pages ตั้ง HTTP header เองไม่ได้ ข้อ frame-ancestors และ X-Content-Type-Options (ASVS V3.4.4) จึงต้องย้ายไปโฮสต์ที่ตั้งได้ (เช่น Cloudflare Pages ฟรี หรือเซิร์ฟเวอร์ของมหาวิทยาลัย)</li>
<li>การตรวจ WCAG อัตโนมัติครอบคลุมบางส่วน ควรให้คนตรวจด้วยโปรแกรมอ่านจอก่อนใช้งานจริง</li>
<li>ยังใช้ style-src 'unsafe-inline' เพราะหน้าเว็บมี style ในบรรทัด 112 จุด ความเสี่ยงต่ำ (ไม่รันโค้ด) จะย้ายเข้าไฟล์ CSS ในรอบถัดไป</li></ul>
</body></html>'''
OUT.write_text(doc); print('ok')
