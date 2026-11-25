#!/usr/bin/env python3
"""Builds every page of the Satit PBRU concept site from one shared header and footer.
   python3 build.py   ->  writes *.html next to this file.
Rules kept here: every button stays inside this site; external links appear only as cited sources
("ที่มาของข้อมูล") and for the real login system. Facts not confirmed are marked pending, never invented."""
import pathlib, html
ROOT = pathlib.Path(__file__).parent

def T(th, en):  # one string in both languages
    return f'<span class="th">{th}</span><span class="en">{en}</span>'

def PH(th, en, style=''):  # placeholder picture until the school's photos arrive
    return f'<div class="ph"{f" style={chr(34)}{style}{chr(34)}" if style else ""}>{T("ภาพ: " + th, "Photo: " + en)}</div>'

PENDING = '<span class="sample">' + T('รอข้อมูลจากโรงเรียน', 'details to come') + '</span>'
ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'

SRC = {
  'notice': ('ประกาศรับสมัครนักเรียน ปีการศึกษา 2569 (มหาวิทยาลัยราชภัฏเพชรบุรี)', 'Admissions notice, academic year 2026 (PBRU)', 'https://www.pbru.ac.th/pbru/news/123294'),
  'about': ('หน้าเกี่ยวกับโรงเรียนสาธิต (เว็บไซต์ มรภ.เพชรบุรี)', 'About the Demonstration School (PBRU website)', 'https://www.pbru.ac.th/pbru/satit-about-2'),
  'contact': ('หน้าติดต่อโรงเรียนสาธิต (เว็บไซต์ มรภ.เพชรบุรี)', 'Contact page (PBRU website)', 'https://www.pbru.ac.th/pbru/satit-contact'),
  'act': ('กิจกรรมพัฒนานักเรียน โรงเรียนสาธิต (เว็บไซต์ มรภ.เพชรบุรี)', 'Student development activities (PBRU website)', 'https://www.pbru.ac.th/pbru/satit-act-dev-student'),
  'fb': ('เพจ Facebook โรงเรียนสาธิต มหาวิทยาลัยราชภัฏเพชรบุรี', "The school's Facebook page", 'https://www.facebook.com/satitpbru.net/'),
  'pbru': ('ประวัติมหาวิทยาลัยราชภัฏเพชรบุรี', 'History of Phetchaburi Rajabhat University', 'https://pr.pbru.ac.th/en/index.php/history-philosophy_en'),
  'wiki': ('Wikipedia: List of demonstration schools in Thailand', 'Wikipedia: List of demonstration schools in Thailand', 'https://en.wikipedia.org/wiki/List_of_demonstration_schools_in_Thailand'),
  'core': ('หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช 2551 (ฉบับปรับปรุง พ.ศ. 2560) กระทรวงศึกษาธิการ', 'Basic Education Core Curriculum B.E. 2551 (revised 2017), Ministry of Education', None),
  'ec': ('หลักสูตรการศึกษาปฐมวัย พุทธศักราช 2560 กระทรวงศึกษาธิการ', 'Early Childhood Education Curriculum B.E. 2560, Ministry of Education', None),
  'photo': ('ภาพป้ายมหาวิทยาลัย: Fifa 26114, CC BY 4.0, Wikimedia Commons', 'University sign photo: Fifa 26114, CC BY 4.0, Wikimedia Commons', 'https://commons.wikimedia.org/wiki/File:%E0%B8%9B%E0%B9%89%E0%B8%B2%E0%B8%A2%E0%B8%A1%E0%B8%AB%E0%B8%B2%E0%B8%A7%E0%B8%B4%E0%B8%97%E0%B8%A2%E0%B8%B2%E0%B8%A5%E0%B8%B1%E0%B8%A2%E0%B8%A3%E0%B8%B2%E0%B8%8A%E0%B8%A0%E0%B8%B1%E0%B8%8F%E0%B9%80%E0%B8%9E%E0%B8%8A%E0%B8%A3%E0%B8%9A%E0%B8%B8%E0%B8%A3%E0%B8%B5.jpg'),
}
def SOURCES(*keys):
    items = ''.join(f'<li>{T(SRC[k][0], SRC[k][1])}' + (f' · <a href="{SRC[k][2]}" target="_blank" rel="noopener">{T("ดูต้นฉบับ", "source")}</a>' if SRC[k][2] else '') + '</li>' for k in keys)
    return f'<section class="wrap sources" aria-label="ที่มาของข้อมูล"><details><summary>{T("ที่มาของข้อมูล", "Sources")} ({len(keys)})</summary><ol>{items}</ol></details></section>'

NAV = [('index.html', 'หน้าแรก', 'Home'), ('about.html', 'เกี่ยวกับโรงเรียน', 'About'), ('levels', 'หลักสูตร', 'Programmes'),
       ('admissions.html', 'รับสมัคร', 'Admissions'), ('news.html', 'ข่าวสาร', 'News'), ('contact.html', 'ติดต่อ', 'Contact')]
LEVELS = [('kindergarten.html', 'อนุบาล', 'Kindergarten', 'ปฐมวัย · เรียนรู้ผ่านการเล่น', 'Early years · learning through play'),
          ('primary.html', 'ประถมศึกษา', 'Primary', 'ป.1 – ป.6', 'Prathom 1–6'),
          ('secondary.html', 'มัธยมศึกษา', 'Secondary', 'ม.1 – ม.6 · เน้นวิทย์-คณิต', 'Mathayom 1–6 · science and maths')]

def header(cur):
    def link(href, th, en):
        if href == 'levels':
            items = ''.join(f'<a href="{h}"><i></i><span><b>{T(a, b)}</b><small>{T(c, d)}</small></span></a>' for h, a, b, c, d in LEVELS)
            on = ' aria-current="page"' if cur in [l[0] for l in LEVELS] else ''
            return f'<div class="dd"><a href="kindergarten.html"{on}>{T(th, en)} ▾</a><div class="menu glass">{items}</div></div>'
        on = ' aria-current="page"' if href == cur else ''
        return f'<a href="{href}"{on}>{T(th, en)}</a>'
    nav = ''.join(link(*n) for n in NAV)
    mob = ''.join(f'<a href="{h}">{T(a, b)}</a>' for h, a, b in [n for n in NAV if n[0] != 'levels'][:2] + [(l[0], l[1], l[2]) for l in LEVELS] + [n for n in NAV if n[0] != 'levels'][2:])
    return f'''<a class="sr" href="#main">{T("ข้ามไปเนื้อหา", "Skip to content")}</a>
<div class="util">
  <div class="lang" role="group" aria-label="Language"><button type="button" data-l="th">TH</button><button type="button" data-l="en">EN</button></div>
  <a href="services.html">{T("ระบบทะเบียน", "Student registry")}</a>
  <a class="hide-s" href="calendar.html">{T("ปฏิทินการศึกษา", "Calendar")}</a>
  <a class="hide-s" href="activities.html">{T("ภาพกิจกรรม", "Photos")}</a>
</div>
<header class="hdr glass">
  <a class="brand" href="index.html" aria-label="หน้าแรก"><img class="mark logo" src="img/fb/logo.png" alt="" width="46" height="46">
    <span><b class="th">โรงเรียนสาธิต มรภ.เพชรบุรี</b><b class="en">Satit PBRU</b><small class="th">Demonstration School of PBRU</small><small class="en">Demonstration School of Phetchaburi Rajabhat University</small></span></a>
  <nav class="nav" aria-label="เมนูหลัก">{nav}</nav>
  <a class="btn btn-gold" href="admissions.html">{T("สมัครเรียน", "Apply")}</a>
  <button class="menu-btn" type="button" aria-label="เปิดเมนู" aria-expanded="false" aria-controls="mnav"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
</header>
<nav class="mnav" id="mnav" aria-label="เมนู">
  <button class="menu-btn close" type="button" aria-label="ปิดเมนู"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
  {mob}
</nav>'''

FOOTER = f'''<footer class="ftr" id="contact">
  <div class="fgrid">
    <div><h4>{T("โรงเรียนสาธิต มหาวิทยาลัยราชภัฏเพชรบุรี", "The Demonstration School of Phetchaburi Rajabhat University")}</h4>
      <p>{T("38 หมู่ 8 ถนนหาดเจ้าสำราญ ตำบลนาวุ้ง อำเภอเมือง จังหวัดเพชรบุรี 76000", "38 Moo 8, Hat Chao Samran Road, Na Wung, Mueang Phetchaburi, Phetchaburi 76000, Thailand")}<br>
      <a href="tel:032708623">032-708623</a> · <a href="mailto:satitpbru@mail.pbru.ac.th">satitpbru@mail.pbru.ac.th</a></p></div>
    <div><h4>{T("หลักสูตร", "Programmes")}</h4><ul>{''.join(f'<li><a href="{h}">{T(a, b)}</a></li>' for h, a, b, c, d in LEVELS)}<li><a href="admissions.html">{T("รับสมัคร", "Admissions")}</a></li></ul></div>
    <div><h4>{T("เว็บไซต์", "This site")}</h4><ul>
      <li><a href="about.html">{T("เกี่ยวกับโรงเรียน", "About")}</a></li><li><a href="news.html">{T("ข่าวสาร", "News")}</a></li>
      <li><a href="activities.html">{T("ภาพกิจกรรม", "Photos")}</a></li><li><a href="calendar.html">{T("ปฏิทิน", "Calendar")}</a></li>
      <li><a href="downloads.html">{T("ดาวน์โหลด", "Downloads")}</a></li><li><a href="services.html">{T("ระบบทะเบียน", "Student registry")}</a></li><li><a href="contact.html">{T("ติดต่อ", "Contact")}</a></li></ul></div>
  </div>
  <div class="legal"><span>{T("แนวคิดออกแบบใหม่ (Concept redesign) โดย", "Concept redesign by")} <b data-credit>[ชื่อผู้ออกแบบ]</b> · {T("ไม่ใช่เว็บไซต์ทางการของโรงเรียน", "not the school's official website")}</span>
    <span>{T("ฟอนต์ Anuphan และ IBM Plex Sans Thai (SIL OFL)", "Fonts: Anuphan and IBM Plex Sans Thai (SIL OFL)")}</span></div>
</footer>'''

def page(fname, title_th, title_en, main):
    doc = f'''<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{html.escape(title_th)} · โรงเรียนสาธิต มรภ.เพชรบุรี</title>
<meta name="description" content="{html.escape(title_en)}: concept redesign of the Demonstration School of Phetchaburi Rajabhat University website. Not the official website.">
<meta name="theme-color" content="#F6F4EE">
<link rel="preload" href="fonts/anuphan-thai-600-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="css/site.css">
<script>try{{var l=localStorage.getItem('lang');if(l==='en'||l==='th')document.documentElement.lang=l;}}catch(e){{}}</script>
</head>
<body>
{header(fname)}
<main id="main">
{main}
</main>
{FOOTER}
<script src="js/site.js"></script>
</body>
</html>
'''
    # swap each placeholder for the school's photograph mapped to that position (src/photos.json)
    import json, re
    it = iter(json.loads((ROOT / 'src/photos.json').read_text()).get(fname, []))
    def swap(mt):
        img = next(it, None)
        if not img: return mt.group(0)
        if mt.group(2):  # revealed only when a card is tapped: load it up front, at low priority, so it is there when the circle opens
            img = img.replace(' loading="lazy"', ' fetchpriority="low"')
        return f'<div class="{mt.group(1)} has-img"{mt.group(2) or ""}>{img}</div>'
    doc = re.sub(r'<div class="(ph(?: base)?)"( data-k="\d")?(?: style="[^"]*")?>.*?</div>', swap, doc)
    (ROOT / fname).write_text(doc, encoding='utf-8')

def phero(crumb, eyebrow, h1a, h1b, lede, frame, vt='', ctas=''):
    return f'''<section class="phero">
  <div><div class="crumbs"><a href="index.html">{T("หน้าแรก", "Home")}</a> / {crumb}</div>
    <div class="eyebrow">{eyebrow}</div>
    <h1><span class="ln"><span>{h1a}</span></span><span class="ln"><span>{h1b}</span></span></h1>
    <p class="lede">{lede}</p>{ctas}</div>
  <div class="frame {vt}">{frame}</div><span class="orb"></span>
</section>'''

def nextp(href, eyebrow, title, pic):
    return f'<div class="wrap"><a class="nextp rv" href="{href}"><div class="t"><div><div class="eyebrow">{eyebrow}</div><h2>{title}</h2></div><span class="go">{T("ไปต่อ", "Continue")} {ARROW}</span></div><div class="p">{pic}</div></a></div>'

def head2(eyebrow, h2, more=''):
    return f'<div class="sec-head rv"><div><div class="eyebrow">{eyebrow}</div><h2>{h2}</h2></div>{more}</div>'

HERO_IMG = '<img src="img/hero-1920.webp" srcset="img/hero-960.webp 960w, img/hero-1920.webp 1920w" sizes="(max-width:860px) 100vw, 50vw" alt="ป้ายมหาวิทยาLัยราชภัฏเพชรบุรี" loading="lazy" width="1920" height="1080">'.replace('Lั', 'ลั')

# ---------------------------------------------------------------- home
NEWS = [  # internal article pages; each names its source
  ('news-admissions-2569.html', 'รับสมัคร', 'Admissions', 'ประกาศรับสมัครนักเรียน ปีการศึกษา 2569', 'Admissions for academic year 2026 announced', '10 พ.ย. 2568', '10 Nov 2025', 'admissions', 'รูปประกอบข่าวรับสมัคร', 'admissions photo'),
  ('news-innovation-contest.html', 'ผลงานนักเรียน', 'Student work', 'ประกวดโครงงานสิ่งประดิษฐ์และนวัตกรรม', 'Invention and innovation project contest', 'ประจำปี 2562', '2019', 'work', 'นักเรียนกับโครงงาน', 'students and their projects'),
  ('news-field-trip.html', 'กิจกรรม', 'Activities', 'ทัศนศึกษา เรียนรู้นอกห้องเรียน', 'Field trips: learning beyond the classroom', 'กิจกรรมพัฒนานักเรียน', 'Student development', 'activities', 'ทัศนศึกษา', 'a field trip'),
]
def ncard(n):
    href, cth, cen, hth, hen, dth, den, cat, pth, pen = n
    return f'<a class="card" href="{href}" data-cat="{cat}"><div class="pic">{PH(pth, pen)}</div><span class="cat">{T(cth, cen)}</span><h3>{T(hth, hen)}</h3><time>{T(dth, den)}</time></a>'

ICON = {
 'pen': '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
 'cal': '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
 'user': '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5"/>',
 'down': '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>',
 'pic': '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M20.5 16l-5-5-8 8"/>',
 'phone': '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
 'mail': '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
 'pin': '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0112 2.5a7 7 0 017 7C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
}
def svg(k): return f'<svg viewBox="0 0 24 24">{ICON[k]}</svg>'
QUICK = [('admissions.html', 'pen', 'สมัครเรียน', 'Apply', 'ขั้นตอนและประกาศล่าสุด', 'Steps and the latest notice'),
         ('calendar.html', 'cal', 'ปฏิทินการศึกษา', 'Calendar', 'กิจกรรมที่กำลังจะมา', "What's coming up"),
         ('services.html', 'user', 'ระบบทะเบียน', 'Student registry', 'นักเรียนและผู้ปกครอง', 'Students and parents'),
         ('downloads.html', 'down', 'เอกสารดาวน์โหลด', 'Downloads', 'แบบฟอร์มต่าง ๆ', 'Forms'),
         ('activities.html', 'pic', 'ภาพกิจกรรม', 'Photos', 'บรรยากาศในโรงเรียน', 'Life at school'),
         ('contact.html', 'phone', 'ติดต่อโรงเรียน', 'Contact us', '032-708623', '+66 32 708 623')]

home = f'''<section class="hero" id="top" aria-label="แนะนำโรงเรียน">
  <div class="photo"><img src="img/fb/p079.webp" alt="นักเรียนโรงเรียนสาธิตทำกิจกรรมริมสระน้ำในสวนของโรงเรียน" fetchpriority="high" width="1400" height="933"></div>
  <div class="copy">
    <div class="eyebrow">{T("โรงเรียนสาธิต มหาวิทยาลัยราชภัฏเพชรบุรี", "The Demonstration School of Phetchaburi Rajabhat University")}</div>
    <h1><span class="ln">{T("ความอยากรู้", "Curiosity")}</span><span class="ln"><span>{T('เริ่มต้น<span class="gold">ที่นี่</span>', 'starts <span class="gold">here</span>')}</span></span></h1>
    <p class="lede">{T("โรงเรียนต้นแบบในรั้วมหาวิทยาลัย ตั้งแต่อนุบาลถึงมัธยมศึกษาปีที่ 6 มุ่งเน้นความเป็นเลิศด้านวิทยาศาสตร์และคณิตศาสตร์", "A model school on a university campus, from kindergarten to Mathayom 6, with a focus on excellence in science and mathematics.")}</p>
    <div class="ctas"><a class="btn btn-green" href="admissions.html">{T("ข้อมูลการรับสมัคร", "Admissions")}{ARROW}</a><a class="btn btn-ghost" href="about.html">{T("รู้จักโรงเรียน", "Discover the school")}</a></div>
  </div>
  <p class="credit">{T("ภาพ: เพจ Facebook โรงเรียน", "Photo: the school's Facebook page")}</p>
</section>
<nav class="quick rv-s" aria-label="ทางลัด">{''.join(f'<a class="q glass" href="{h}"><span class="ic">{svg(i)}</span><b>{T(a, b)}<small class="th">{c}</small><small class="en">{d}</small></b></a>' for h, i, a, b, c, d in QUICK)}</nav>

<section class="sec" aria-label="ข้อมูลสำคัญ"><div class="wrap"><div class="bento rv-s">
  <a class="tile t-green" href="admissions.html" style="text-decoration:none"><div><div class="eyebrow">{T("รับสมัครนักเรียน", "Admissions")}</div><h3 style="margin-top:12px">{T("ประกาศรับสมัคร<br>ปีการศึกษา 2569", "Admissions notice,<br>academic year 2026")}</h3></div>
    <div class="levels">{T("อนุบาล 1", "K1")}{T("ป.1", "P1")}{T("ป.4", "P4")}</div><span class="ring"></span></a>
  <a class="tile t-gold" href="kindergarten.html" style="text-decoration:none"><div class="eyebrow">{T("ระดับชั้น", "Levels")}</div><div><h3>{T("อนุบาล – ม.6", "K – M.6")}</h3><p>{T("เรียนต่อเนื่องในโรงเรียนเดียว", "One school, from the first day to graduation")}</p></div><span class="ring"></span></a>
  <a class="tile t-white" href="about.html" style="text-decoration:none;color:inherit"><div class="eyebrow">{T("ก่อตั้ง", "Founded")}</div><div><div class="num"><span class="th" data-count="2553">2553</span><span class="en" data-count="2010">2010</span></div><p style="color:var(--ink2)">{T("พ.ศ. · ตามข้อมูลจากเพจโรงเรียน", "According to the school's page")}</p></div></a>
</div></div></section>

<section class="sec" aria-labelledby="h-news"><div class="wrap">
  {head2(T("ข่าวสารและประกาศ", "News &amp; notices"), f'<span id="h-news">{T("เกิดอะไรขึ้นที่สาธิต", "What is happening at Satit")}</span>', f'<a class="more" href="news.html">{T("ข่าวทั้งหมด →", "All news →")}</a>')}
  <div class="news"><div class="cards rv-s">{''.join(ncard(n) for n in NEWS)}</div>
    <a class="cal rv" href="calendar.html" style="text-decoration:none;color:inherit"><h3>{T("ปฏิทินกิจกรรม", "Calendar")} <span class="sample">{T("ตัวอย่าง", "sample")}</span></h3><ol>
      <li><span class="d">{T("ธ.ค.", "Dec")}</span><span>{T("ประชุมผู้ปกครองภาคเรียนที่ 2", "Parents' meeting, term 2")}</span></li>
      <li><span class="d">{T("ม.ค.", "Jan")}</span><span>{T("กิจกรรมวันเด็กแห่งชาติ", "National Children's Day")}</span></li>
      <li><span class="d">{T("ก.พ.", "Feb")}</span><span>{T("นิทรรศการโครงงานวิทยาศาสตร์", "Science project fair")}</span></li>
      <li><span class="d">{T("มี.ค.", "Mar")}</span><span>{T("สอบปลายภาคเรียนที่ 2", "Term 2 final exams")}</span></li></ol></a>
  </div></div></section>

<section class="sec" aria-labelledby="h-learn"><div class="wrap">
  {head2(T("รูปแบบการเรียนการสอน", "How we teach"), f'<span id="h-learn">{T("ที่นี่ เรียนกันอย่างไร", "How learning works here")}</span>', f'<a class="more" href="about.html">{T("รู้จักโรงเรียน →", "About the school →")}</a>')}
  <div class="learn rv"><div class="stage" aria-hidden="true">{PH("ห้องเรียนที่นักเรียนลงมือทำ", "a hands-on classroom").replace('class="ph"', 'class="ph base"')}
    {PH("นักเรียนทำโครงงาน", "students on a project", "background:linear-gradient(135deg,#d7e6db,#a9c4b2)").replace('class="ph"', 'class="ph" data-k="0"')}
    {PH("ห้องแล็บวิทยาศาสตร์", "the science lab", "background:linear-gradient(135deg,#f0e2b8,#d9bd6c)").replace('class="ph"', 'class="ph" data-k="1"')}
    {PH("ครูกับนักเรียน", "teachers and pupils", "background:linear-gradient(135deg,#dfe7ee,#b4c6d4)").replace('class="ph"', 'class="ph" data-k="2"')}
    {PH("กิจกรรมพัฒนาผู้เรียน", "student activities", "background:linear-gradient(135deg,#efe0e4,#d2b2bb)").replace('class="ph"', 'class="ph" data-k="3"')}</div>
    <div class="lcards">
      <button class="lc glass" type="button" data-k="0" aria-pressed="false"><span class="eyebrow">{T("ลงมือทำ", "Hands-on")}</span><h3>{T("เรียนจากการลงมือทำ", "Learning by doing")}</h3><p>{T("โครงงานและการทดลอง เช่น การประกวดโครงงานสิ่งประดิษฐ์และนวัตกรรม", "Projects and experiments, such as the invention and innovation contest.")}</p></button>
      <button class="lc glass" type="button" data-k="1" aria-pressed="false"><span class="eyebrow">{T("จุดเน้น", "Our focus")}</span><h3>{T("วิทยาศาสตร์และคณิตศาสตร์", "Science and maths")}</h3><p>{T("โรงเรียนมุ่งเน้นความเป็นเลิศด้านวิทยาศาสตร์และคณิตศาสตร์", "The school aims for excellence in science and mathematics.")}</p></button>
      <button class="lc glass" type="button" data-k="2" aria-pressed="false"><span class="eyebrow">{T("หลักสูตร", "Curriculum")}</span><h3>{T("ครบ 8 กลุ่มสาระ", "All eight learning areas")}</h3><p>{T("ตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน", "Following the national core curriculum.")}</p></button>
      <button class="lc glass" type="button" data-k="3" aria-pressed="false"><span class="eyebrow">{T("นอกห้องเรียน", "Beyond class")}</span><h3>{T("กิจกรรมพัฒนาผู้เรียน", "Student development")}</h3><p>{T("ทัศนศึกษา กีฬา และกิจกรรมตลอดปี", "Field trips, sport and activities through the year.")}</p></button>
    </div></div></div></section>

<section class="sec" aria-labelledby="h-levels"><div class="wrap">
  {head2(T("หลักสูตร", "Programmes"), f'<span id="h-levels">{T("ระดับชั้นที่เปิดสอน", "Levels we teach")}</span>')}
  <div class="levels-row rv-s">
    <a class="lv vt-k" href="kindergarten.html">{PH("เด็กอนุบาล", "kindergarten")}<div class="txt"><span class="grade">{T("ปฐมวัย", "Early years")}</span><h3>{T("อนุบาล", "Kindergarten")}</h3><p class="more-t">{T("เรียนรู้ผ่านการเล่นและประสบการณ์ตรง พัฒนาครบ 4 ด้าน", "Learning through play and real experience, growing in four areas.")}</p></div></a>
    <a class="lv vt-p" href="primary.html">{PH("นักเรียนประถม", "primary pupils", "background:linear-gradient(135deg,#e9dcb0,#c9a74e)")}<div class="txt"><span class="grade">ป.1 – ป.6</span><h3>{T("ประถมศึกษา", "Primary")}</h3><p class="more-t">{T("วางพื้นฐานให้แน่น ทั้งภาษา คณิตศาสตร์ และวิทยาศาสตร์", "Strong foundations in language, maths and science.")}</p></div></a>
    <a class="lv vt-s" href="secondary.html">{PH("นักเรียนมัธยม", "secondary students", "background:linear-gradient(135deg,#bcd0c3,#5f8a72)")}<div class="txt"><span class="grade">ม.1 – ม.6</span><h3>{T("มัธยมศึกษา", "Secondary")}</h3><p class="more-t">{T("มุ่งเน้นความเป็นเลิศด้านวิทยาศาสตร์และคณิตศาสตร์", "A focus on excellence in science and mathematics.")}</p></div></a>
  </div></div></section>

<section class="wrap" aria-labelledby="h-visit"><div class="visit rv"><span class="ring"></span>
  <div><div class="eyebrow">{T("มาเยี่ยมชมโรงเรียน", "Visit us")}</div><h2 id="h-visit" style="margin:10px 0">{T("อยากเห็นของจริง<br>แวะมาคุยกับเราได้", "See it for yourself.<br>Come and talk to us.")}</h2>
    <p>{T("โทร 032-708623 หรืออีเมล satitpbru@mail.pbru.ac.th เพื่อนัดเยี่ยมชม", "Call +66 32 708 623 or email satitpbru@mail.pbru.ac.th to arrange a visit.")}</p></div>
  <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:flex-end"><a class="btn btn-gold" href="tel:032708623">{T("โทรหาโรงเรียน", "Call the school")}</a><a class="btn btn-ghost" href="contact.html">{T("แผนที่และการเดินทาง", "Map and directions")}</a></div>
</div></section>
{SOURCES('about', 'notice', 'fb', 'act', 'contact', 'core', 'photo')}'''
page('index.html', 'หน้าแรก', 'Home', home)

# ---------------------------------------------------------------- about
about = f'''{phero(T("เกี่ยวกับโรงเรียน", "About"), T("เกี่ยวกับโรงเรียน", "About the school"), T("โรงเรียนต้นแบบ", "A model school"), T('<span class="gold" style="color:var(--goldInk)">ในรั้วมหาวิทยาลัย</span>', '<span style="color:var(--goldInk)">on a university campus</span>'),
   T("โรงเรียนสาธิต มหาวิทยาลัยราชภัฏเพชรบุรี เป็นโรงเรียนต้นแบบในการจัดการศึกษา มุ่งเน้นความเป็นเลิศด้านวิทยาศาสตร์และคณิตศาสตร์ เปิดสอนตั้งแต่ระดับอนุบาลจนถึงมัธยมศึกษาปีที่ 6", "The Demonstration School of Phetchaburi Rajabhat University is a model school that aims for excellence in science and mathematics, teaching from kindergarten to Mathayom 6."),
   '<img src="img/fb/p080.webp" alt="นักเรียนโรงเรียนสาธิตหน้าอาคารเรียน" width="1400" height="872" loading="lazy">')}
<section class="sec"><div class="wrap"><div class="facts rv-s">
  <div class="fact"><b>{T("2553", "2010")}</b><span>{T("ปีที่ก่อตั้งโรงเรียน (พ.ศ.)", "Year the school was founded")}</span></div>
  <div class="fact"><b>{T("อนุบาล–ม.6", "K–M.6")}</b><span>{T("ครบทุกช่วงชั้นในโรงเรียนเดียว", "Every stage in one school")}</span></div>
  <div class="fact"><b>{T("วิทย์–คณิต", "Sci–Maths")}</b><span>{T("จุดเน้นของโรงเรียน", "The school's focus")}</span></div>
  <div class="fact"><b>{T("2469", "1926")}</b><span>{T("ปีที่ก่อตั้งมหาวิทยาลัยราชภัฏเพชรบุรี", "Year Phetchaburi Rajabhat University was founded")}</span></div>
</div></div></section>
<section class="sec"><div class="wrap story">
  <div class="pic rv">{PH("อาคารเรียนโรงเรียนสาธิต", "the school building")}</div>
  <div class="rv"><div class="eyebrow">{T("โรงเรียนสาธิตคืออะไร", "What is a demonstration school?")}</div><h2>{T("โรงเรียนในมหาวิทยาลัย", "A school inside a university")}</h2>
    <p>{T("โรงเรียนสาธิตเป็นโรงเรียนที่อยู่ในสังกัดมหาวิทยาลัย ทำหน้าที่เป็นโรงเรียนต้นแบบในการจัดการเรียนการสอน นักเรียนจึงได้เรียนในบรรยากาศของมหาวิทยาลัย ใกล้ชิดกับแหล่งเรียนรู้และผู้เชี่ยวชาญ", "A demonstration school belongs to a university and serves as a model of teaching. Its pupils learn in a university setting, close to its resources and experts.")}</p>
    <p>{T("โรงเรียนสาธิต มหาวิทยาลัยราชภัฏเพชรบุรี ตั้งอยู่ที่ถนนหาดเจ้าสำราญ ตำบลนาวุ้ง อำเภอเมือง จังหวัดเพชรบุรี", "The Demonstration School of Phetchaburi Rajabhat University is on Hat Chao Samran Road, Na Wung, Mueang Phetchaburi.")}</p></div>
</div></section>
<section class="sec"><div class="wrap">{head2(T("เส้นทางของเรา", "Our story"), T("จากมหาวิทยาลัย สู่โรงเรียนสาธิต", "From a university to its school"))}
  <div class="tline rv">
    <div class="pt"><div class="yr">{T("2469", "1926")}</div><h3>{T("มหาวิทยาลัยราชภัฏเพชรบุรี", "Phetchaburi Rajabhat University")}</h3><p>{T("ก่อตั้งสถาบันที่ต่อมาเป็นมหาวิทยาลัยราชภัฏเพชรบุรี", "The institution that became the university is founded.")}</p></div>
    <div class="pt"><div class="yr">{T("2553", "2010")}</div><h3>{T("ก่อตั้งโรงเรียนสาธิต", "The demonstration school opens")}</h3><p>{T("ตามข้อมูลจากเพจโรงเรียน", "According to the school's page.")}</p></div>
    <div class="pt"><div class="yr">{T("วันนี้", "Today")}</div><h3>{T("อนุบาล ถึง ม.6", "Kindergarten to M.6")}</h3><p>{T("เปิดสอนครบทุกช่วงชั้น เน้นวิทยาศาสตร์และคณิตศาสตร์", "Every stage of school, with a focus on science and maths.")}</p></div>
  </div></div></section>
{(ROOT / 'src/about-values.html').read_text()}
{nextp("kindergarten.html", T("หลักสูตร", "Programmes"), T("เริ่มที่ระดับอนุบาล", "Start with kindergarten"), PH("เด็กอนุบาล", "kindergarten"))}
{SOURCES('about', 'fb', 'pbru', 'wiki', 'contact', 'photo')}'''
page('about.html', 'เกี่ยวกับโรงเรียน', 'About', about)

# ---------------------------------------------------------------- levels
AREAS = [('ภาษาไทย', 'Thai'), ('คณิตศาสตร์', 'Mathematics'), ('วิทยาศาสตร์และเทคโนโลยี', 'Science and technology'), ('สังคมศึกษา ศาสนา และวัฒนธรรม', 'Social studies, religion and culture'),
         ('สุขศึกษาและพลศึกษา', 'Health and physical education'), ('ศิลปะ', 'Arts'), ('การงานอาชีพ', 'Occupations'), ('ภาษาต่างประเทศ', 'Foreign languages')]
def areas(hl):
    focus = '<span class="focus">' + T('จุดเน้นของโรงเรียน', "school's focus") + '</span>'
    return '<div class="tiles rv-s">' + ''.join(f'<div class="tl"><div class="ic">{i + 1}</div><h3>{T(a, b)}</h3>{focus if i in hl else ""}</div>' for i, (a, b) in enumerate(AREAS)) + '</div>'
DEVACT = f'''<div class="tiles t3 rv-s">
  <div class="tl"><div class="ic">◎</div><h3>{T("กิจกรรมแนะแนว", "Guidance")}</h3><p>{T("ช่วยให้นักเรียนรู้จักตนเอง วางแผนการเรียนและอนาคต", "Helping pupils know themselves and plan their studies and future.")}</p></div>
  <div class="tl"><div class="ic">◎</div><h3>{T("กิจกรรมนักเรียน", "Student activities")}</h3><p>{T("ลูกเสือ เนตรนารี ยุวกาชาด ชุมนุม และชมรม", "Scouts, Red Cross Youth, clubs and societies.")}</p></div>
  <div class="tl"><div class="ic">◎</div><h3>{T("เพื่อสังคมและสาธารณประโยชน์", "Community service")}</h3><p>{T("ทำประโยชน์ให้ชุมชนและสังคม", "Giving back to the community.")}</p></div></div>'''
def gallery(labels):
    return '<div class="strip rv-s">' + ''.join(f'<div>{PH(a, b)}</div>' for a, b in labels) + '</div>'

kg = f'''{phero(f'<a href="kindergarten.html">{T("หลักสูตร", "Programmes")}</a> / {T("อนุบาล", "Kindergarten")}', T("ระดับปฐมวัย", "Early years"), T("อนุบาล", "Kindergarten"), T('<span style="color:var(--goldInk)">เล่น เรียน รู้</span>', '<span style="color:var(--goldInk)">play, learn, grow</span>'),
   T("ช่วงวัยที่สำคัญที่สุดของการเรียนรู้ เด็กเรียนผ่านการเล่นและประสบการณ์ตรง เพื่อพัฒนาให้ครบทั้งร่างกาย อารมณ์ สังคม และสติปัญญา", "The most important years for learning. Children learn through play and real experience, growing in body, feelings, social skills and thinking."),
   PH("เด็กอนุบาลทำกิจกรรม", "kindergarten children at play"), 'vt-k')}
<section class="sec"><div class="wrap">{head2(T("พัฒนาการ 4 ด้าน", "Four areas of growth"), T("เติบโตอย่างสมดุล", "Growing in balance"))}
  <div class="tiles rv-s">
    <div class="tl"><div class="ic">1</div><h3>{T("ร่างกาย", "Physical")}</h3><p>{T("แข็งแรง เคลื่อนไหวคล่อง ใช้มือได้ดี", "Strong, active and good with their hands.")}</p></div>
    <div class="tl"><div class="ic">2</div><h3>{T("อารมณ์และจิตใจ", "Emotional")}</h3><p>{T("ร่าเริง มั่นใจ รู้จักควบคุมตนเอง", "Cheerful, confident and learning self-control.")}</p></div>
    <div class="tl"><div class="ic">3</div><h3>{T("สังคม", "Social")}</h3><p>{T("เล่นและทำงานร่วมกับผู้อื่นได้", "Playing and working with others.")}</p></div>
    <div class="tl"><div class="ic">4</div><h3>{T("สติปัญญา", "Thinking")}</h3><p>{T("ช่างสังเกต อยากรู้ ใช้ภาษาสื่อสาร", "Observant, curious and able to express themselves.")}</p></div></div>
  <p class="src rv" style="margin-top:14px">{T("กรอบพัฒนาการตามหลักสูตรการศึกษาปฐมวัย พุทธศักราช 2560", "Framework of the Early Childhood Education Curriculum B.E. 2560.")}</p></div></section>
<section class="sec"><div class="wrap">{head2(T("หนึ่งปีในห้องอนุบาล", "A year in kindergarten"), T("บรรยากาศการเรียนรู้", "Learning in action"))}{gallery([("ห้องเรียนอนุบาล", "the classroom"), ("เล่นกลางแจ้ง", "outdoor play"), ("ศิลปะและงานประดิษฐ์", "art and craft"), ("กิจกรรมเสริมประสบการณ์", "learning activities"), ("วันสำคัญ", "special days")])}</div></section>
<section class="sec"><div class="wrap"><div class="entry rv"><div><div class="eyebrow">{T("การรับสมัคร", "Admissions")}</div><h2>{T("เริ่มต้นที่อนุบาล 1", "Starting in K1")}</h2><p style="color:var(--ink2)">{T("ประกาศรับสมัครปีการศึกษา 2569 รับนักเรียนชั้นอนุบาล 1", "The 2026 admissions notice opened places in Kindergarten 1.")}</p>
  <div class="levels"><span>{T("อนุบาล 1", "K1")}</span></div></div><div style="text-align:right"><a class="btn btn-green" href="admissions.html">{T("ขั้นตอนการสมัคร", "How to apply")}{ARROW}</a></div></div></div></section>
{nextp("primary.html", T("ต่อไป", "Next"), T("ประถมศึกษา ป.1 – ป.6", "Primary, P1–P6"), PH("นักเรียนประถม", "primary pupils", "background:linear-gradient(135deg,#e9dcb0,#c9a74e)"))}
{SOURCES('ec', 'notice', 'fb')}'''
page('kindergarten.html', 'อนุบาล', 'Kindergarten', kg)

pri = f'''{phero(f'<a href="kindergarten.html">{T("หลักสูตร", "Programmes")}</a> / {T("ประถมศึกษา", "Primary")}', "ป.1 – ป.6", T("ประถมศึกษา", "Primary"), T('<span style="color:var(--goldInk)">พื้นฐานที่แน่น</span>', '<span style="color:var(--goldInk)">strong foundations</span>'),
   T("หกปีที่วางรากฐานการเรียนรู้ ทั้งการอ่าน การเขียน การคิดคำนวณ และวิทยาศาสตร์ พร้อมกิจกรรมที่ฝึกให้คิดและลงมือทำ", "Six years that lay the foundations of reading, writing, numbers and science, with activities that build thinking and doing."),
   PH("นักเรียนประถมในห้องเรียน", "primary pupils in class", "background:linear-gradient(135deg,#e9dcb0,#c9a74e)"), 'vt-p')}
<section class="sec"><div class="wrap">{head2(T("สิ่งที่เรียน", "What pupils learn"), T("8 กลุ่มสาระการเรียนรู้", "Eight learning areas"))}{areas([1, 2])}
  <p class="src rv" style="margin-top:14px">{T("โครงสร้างตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช 2551 (ฉบับปรับปรุง พ.ศ. 2560)", "Structure of the Basic Education Core Curriculum B.E. 2551 (revised 2017).")}</p></div></section>
<section class="sec"><div class="wrap">{head2(T("นอกห้องเรียน", "Beyond the classroom"), T("กิจกรรมพัฒนาผู้เรียน", "Student development"))}{DEVACT}</div></section>
<section class="sec"><div class="wrap">{head2(T("บรรยากาศ", "Life at school"), T("หนึ่งวันของเด็กประถม", "A primary day"))}{gallery([("เรียนในห้อง", "lessons"), ("ทดลองวิทยาศาสตร์", "science experiments"), ("กีฬาสี", "sports day"), ("ทัศนศึกษา", "field trip"), ("ห้องสมุด", "the library")])}</div></section>
<section class="sec"><div class="wrap"><div class="entry rv"><div><div class="eyebrow">{T("การรับสมัคร", "Admissions")}</div><h2>{T("รับเข้าที่ ป.1 และ ป.4", "Entry at P1 and P4")}</h2><p style="color:var(--ink2)">{T("ตามประกาศรับสมัครปีการศึกษา 2569", "According to the 2026 admissions notice.")}</p>
  <div class="levels"><span>{T("ป.1", "P1")}</span><span>{T("ป.4", "P4")}</span></div></div><div style="text-align:right"><a class="btn btn-green" href="admissions.html">{T("ขั้นตอนการสมัคร", "How to apply")}{ARROW}</a></div></div></div></section>
{nextp("secondary.html", T("ต่อไป", "Next"), T("มัธยมศึกษา ม.1 – ม.6", "Secondary, M1–M6"), PH("นักเรียนมัธยม", "secondary students", "background:linear-gradient(135deg,#bcd0c3,#5f8a72)"))}
{SOURCES('core', 'notice', 'about', 'act')}'''
page('primary.html', 'ประถมศึกษา', 'Primary', pri)

sec = f'''{phero(f'<a href="kindergarten.html">{T("หลักสูตร", "Programmes")}</a> / {T("มัธยมศึกษา", "Secondary")}', "ม.1 – ม.6", T("มัธยมศึกษา", "Secondary"), T('<span style="color:var(--goldInk)">เก่งวิทย์ คิดเป็น</span>', '<span style="color:var(--goldInk)">science-minded</span>'),
   T("มัธยมศึกษาตอนต้นและตอนปลาย ที่มุ่งเน้นความเป็นเลิศด้านวิทยาศาสตร์และคณิตศาสตร์ ฝึกคิด ทดลอง และสร้างนวัตกรรม", "Lower and upper secondary with a focus on excellence in science and mathematics: thinking, experimenting and building new things."),
   PH("นักเรียนมัธยมในห้องแล็บ", "secondary students in the lab", "background:linear-gradient(135deg,#bcd0c3,#5f8a72)"), 'vt-s')}
<section class="sec"><div class="wrap">{head2(T("จุดเน้น", "Our focus"), T("วิทยาศาสตร์และคณิตศาสตร์", "Science and mathematics"))}
  <div class="story"><div class="pic rv">{PH("การทดลองในห้องแล็บ", "an experiment in the lab", "background:linear-gradient(135deg,#f0e2b8,#d9bd6c)")}</div>
  <div class="rv"><h2 style="font-size:clamp(26px,3vw,40px)">{T("เรียนแบบนักวิทยาศาสตร์", "Learning like scientists")}</h2><p>{T("โรงเรียนสาธิต มหาวิทยาลัยราชภัฏเพชรบุรี เป็นโรงเรียนต้นแบบในการจัดการศึกษาระดับมัธยมศึกษาตอนต้นและตอนปลาย ที่มุ่งเน้นความเป็นเลิศด้านวิทยาศาสตร์และคณิตศาสตร์", "The school is a model for lower and upper secondary education, aiming for excellence in science and mathematics.")}</p>
    <p>{T("นักเรียนได้ฝึกทำโครงงาน เช่น การประกวดโครงงานสิ่งประดิษฐ์และนวัตกรรม", "Pupils take on projects such as the invention and innovation contest.")}</p><a class="btn btn-ghost" href="news-innovation-contest.html">{T("ดูผลงานนักเรียน", "See student work")}{ARROW}</a></div></div></div></section>
<section class="sec"><div class="wrap">{head2(T("สิ่งที่เรียน", "What students learn"), T("8 กลุ่มสาระการเรียนรู้", "Eight learning areas"))}{areas([1, 2])}
  <p class="src rv" style="margin-top:14px">{T("โครงสร้างตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช 2551 (ฉบับปรับปรุง พ.ศ. 2560) · แผนการเรียน ม.ปลาย", "Structure of the Basic Education Core Curriculum B.E. 2551 (revised 2017) · upper-secondary study plans")} {PENDING}</p></div></section>
<section class="sec"><div class="wrap">{head2(T("นอกห้องเรียน", "Beyond the classroom"), T("กิจกรรมพัฒนาผู้เรียน", "Student development"))}{DEVACT}</div></section>
<section class="sec"><div class="wrap">{head2(T("บรรยากาศ", "Life at school"), T("ชีวิตมัธยมที่สาธิต", "Secondary life at Satit"))}{gallery([("ห้องแล็บ", "the lab"), ("โครงงาน", "projects"), ("กีฬา", "sport"), ("ทัศนศึกษา", "field trip"), ("กิจกรรมชุมนุม", "clubs")])}</div></section>
<section class="sec"><div class="wrap"><div class="entry rv"><div><div class="eyebrow">{T("การรับสมัคร", "Admissions")}</div><h2>{T("สนใจเรียนมัธยมที่นี่", "Interested in secondary?")}</h2><p style="color:var(--ink2)">{T("ชั้นที่เปิดรับและกำหนดการ ดูได้ในประกาศของแต่ละปี หรือสอบถามโรงเรียน", "Entry grades and dates are set in each year's notice. Ask the school for details.")}</p></div>
  <div style="text-align:right"><a class="btn btn-green" href="admissions.html">{T("ข้อมูลการรับสมัคร", "Admissions")}{ARROW}</a></div></div></div></section>
{nextp("admissions.html", T("ต่อไป", "Next"), T("สมัครเรียนที่สาธิต", "Apply to Satit"), PH("ผู้ปกครองและนักเรียน", "parents and pupils"))}
{SOURCES('about', 'core', 'act')}'''
page('secondary.html', 'มัธยมศึกษา', 'Secondary', sec)

# ---------------------------------------------------------------- admissions
adm = f'''{phero(T("รับสมัคร", "Admissions"), T("รับสมัครนักเรียน", "Admissions"), T("ก้าวแรก", "The first step"), T('<span style="color:var(--goldInk)">สู่สาธิต</span>', '<span style="color:var(--goldInk)">to Satit</span>'),
   T("ประกาศรับสมัครนักเรียนล่าสุด ปีการศึกษา 2569 รับชั้นอนุบาล 1 ประถมศึกษาปีที่ 1 และประถมศึกษาปีที่ 4", "The latest notice, for academic year 2026, opened places in Kindergarten 1, Prathom 1 and Prathom 4."),
   PH("วันรับสมัคร", "admissions day"), '', f'<div class="ctas" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:24px"><a class="btn btn-green" href="news-admissions-2569.html">{T("อ่านประกาศ", "Read the notice")}{ARROW}</a><a class="btn btn-ghost" href="contact.html">{T("สอบถามโรงเรียน", "Ask the school")}</a></div>')}
<section class="sec"><div class="wrap"><div class="bento rv-s">
  <div class="tile t-green"><div class="eyebrow">{T("ปีการศึกษา 2569", "Academic year 2026")}</div><div><h3>{T("ชั้นที่เปิดรับ", "Entry grades")}</h3><div class="levels" style="margin-top:12px">{T("อนุบาล 1", "K1")}{T("ป.1", "P1")}{T("ป.4", "P4")}</div></div><span class="ring"></span></div>
  <div class="tile t-gold"><div class="eyebrow">{T("ปิดรับสมัคร", "Closing date")}</div><div><h3>{T("28 พ.ย. 2568", "28 Nov 2025")}</h3><p>{T("ตามประกาศปีการศึกษา 2569", "Per the 2026 notice")}</p></div><span class="ring"></span></div>
  <div class="tile t-white"><div class="eyebrow">{T("ปีการศึกษาถัดไป", "Next year")}</div><div><h3 style="font-size:clamp(24px,2.4vw,32px)">{T("ติดตามประกาศใหม่", "Watch for the new notice")}</h3><p style="color:var(--ink2)">{T("โทร 032-708623", "Call +66 32 708 623")}</p></div></div>
</div></div></section>
<section class="sec"><div class="wrap">{head2(T("ขั้นตอน", "How it works"), T("สมัครเรียนใน 5 ขั้น", "Applying in five steps"))}
  <div class="steps rv-s">
    <div class="step"><h3>{T("ติดตามประกาศ", "Read the notice")}</h3><p>{T("ดูชั้นที่เปิดรับ คุณสมบัติ และกำหนดการ", "Check grades, eligibility and dates.")}</p></div>
    <div class="step"><h3>{T("สมัคร", "Apply")}</h3><p>{T("ยื่นใบสมัครและเอกสารตามที่ประกาศกำหนด", "Submit the form and documents.")}</p></div>
    <div class="step"><h3>{T("คัดเลือก", "Selection")}</h3><p>{T("ตามวิธีที่ระบุในประกาศของแต่ละปี", "As set out in that year's notice.")}</p></div>
    <div class="step"><h3>{T("ประกาศผล", "Results")}</h3><p>{T("ตรวจสอบรายชื่อตามวันที่กำหนด", "Check the list on the set date.")}</p></div>
    <div class="step"><h3>{T("มอบตัว", "Enrol")}</h3><p>{T("รายงานตัวและมอบตัวเป็นนักเรียน", "Register as a pupil.")}</p></div></div>
  <p class="src rv" style="margin-top:14px">{T("ขั้นตอนโดยทั่วไป รายละเอียดจริงให้ยึดตามประกาศของแต่ละปี", "General steps; each year's notice is what counts.")}</p></div></section>
<section class="sec"><div class="wrap faq rv">{head2(T("คำถามที่พบบ่อย", "FAQ"), T("ผู้ปกครองมักถาม", "What parents ask"))}
  <details><summary>{T("ปีนี้เปิดรับชั้นไหนบ้าง", "Which grades are open?")}</summary><p>{T("ประกาศปีการศึกษา 2569 เปิดรับอนุบาล 1, ป.1 และ ป.4 ส่วนปีถัดไปให้ติดตามประกาศใหม่", "The 2026 notice opened K1, P1 and P4. Watch for next year's notice.")}</p></details>
  <details><summary>{T("ค่าเล่าเรียนเท่าไร", "What are the fees?")}</summary><p>{T("สอบถามโรงเรียนโดยตรงที่ 032-708623", "Please ask the school on +66 32 708 623.")}</p></details>
  <details><summary>{T("เยี่ยมชมโรงเรียนก่อนสมัครได้ไหม", "Can we visit first?")}</summary><p>{T("โทรหรืออีเมลนัดหมายกับโรงเรียนได้", "Call or email the school to arrange a visit.")}</p></details>
  <details><summary>{T("ติดต่อสอบถามที่ไหน", "Who do we contact?")}</summary><p>032-708623 · satitpbru@mail.pbru.ac.th</p></details>
</div></section>
{nextp("contact.html", T("ต่อไป", "Next"), T("แผนที่และการติดต่อ", "Map and contact"), PH("หน้าโรงเรียน", "the school entrance"))}
{SOURCES('notice', 'contact')}'''
page('admissions.html', 'รับสมัคร', 'Admissions', adm)

# ---------------------------------------------------------------- news + articles
newsp = f'''{phero(T("ข่าวสาร", "News"), T("ข่าวสารและประกาศ", "News &amp; notices"), T("ข่าวจาก", "News from"), T('<span style="color:var(--goldInk)">สาธิต</span>', '<span style="color:var(--goldInk)">Satit</span>'),
   T("ประกาศ กิจกรรม และผลงานของนักเรียน", "Notices, activities and student work."), PH("กิจกรรมโรงเรียน", "school life"))}
<section class="sec"><div class="wrap"><div class="filters" role="group" aria-label="หมวดข่าว">
  <button type="button" data-f="all" aria-pressed="true">{T("ทั้งหมด", "All")}</button><button type="button" data-f="admissions" aria-pressed="false">{T("รับสมัคร", "Admissions")}</button>
  <button type="button" data-f="activities" aria-pressed="false">{T("กิจกรรม", "Activities")}</button><button type="button" data-f="work" aria-pressed="false">{T("ผลงานนักเรียน", "Student work")}</button></div>
  <div class="nlist">{''.join(ncard(n) for n in NEWS)}</div></div></section>
{SOURCES('notice', 'act', 'fb')}'''
page('news.html', 'ข่าวสาร', 'News', newsp)

ARTICLES = {
 'news-admissions-2569.html': (T("ประกาศรับสมัครนักเรียน<br>ปีการศึกษา 2569", "Admissions for academic year 2026"),
   f'<p>{T("มหาวิทยาลัยราชภัฏเพชรบุรีประกาศรับสมัครนักเรียนโรงเรียนสาธิต ประจำปีการศึกษา 2569 เมื่อวันที่ 10 พฤศจิกายน 2568", "Phetchaburi Rajabhat University announced admissions to the Demonstration School for academic year 2026 on 10 November 2025.")}</p><p>{T("ชั้นที่เปิดรับ: อนุบาล 1, ประถมศึกษาปีที่ 1 และประถมศึกษาปีที่ 4 รับสมัครถึงวันที่ 28 พฤศจิกายน 2568", "Entry grades: Kindergarten 1, Prathom 1 and Prathom 4. Applications closed on 28 November 2025.")}</p><p>{T("รายละเอียดคุณสมบัติ เอกสาร และกำหนดการทั้งหมดอยู่ในประกาศต้นฉบับ", "Eligibility, documents and the full timetable are in the original notice.")}</p>', ('notice',), 'admissions.html', T("ขั้นตอนการสมัคร", "How to apply")),
 'news-innovation-contest.html': (T("ประกวดโครงงาน<br>สิ่งประดิษฐ์และนวัตกรรม", "Invention and innovation<br>project contest"),
   f'<p>{T("หนึ่งในกิจกรรมพัฒนานักเรียนของโรงเรียนสาธิต คือการประกวดโครงงานสิ่งประดิษฐ์และนวัตกรรม ประจำปี 2562 ที่นักเรียนได้คิด ออกแบบ และนำเสนอผลงานของตนเอง", "One of the school's student development activities was the 2019 invention and innovation project contest, where pupils designed and presented their own work.")}</p><p>{T("รายชื่อโครงงานและผลการประกวด", "Project list and results")} {PENDING}</p>', ('act',), 'secondary.html', T("หลักสูตรมัธยมศึกษา", "Secondary programme")),
 'news-field-trip.html': (T("ทัศนศึกษา<br>เรียนรู้นอกห้องเรียน", "Field trips:<br>learning beyond the classroom"),
   f'<p>{T("ทัศนศึกษาเป็นหนึ่งในกิจกรรมพัฒนานักเรียนของโรงเรียนสาธิต ที่พานักเรียนออกไปเรียนรู้จากสถานที่จริง", "Field trips are one of the school's student development activities, taking pupils to learn in real places.")}</p><p>{T("สถานที่และภาพกิจกรรม", "Places and photos")} {PENDING}</p>', ('act',), 'activities.html', T("ภาพกิจกรรม", "Photos")),
}
for fn, (title, body, src, nxt, nxtlabel) in ARTICLES.items():
    page(fn, html.unescape(title.split('<span class="en">')[0].replace('<span class="th">', '').replace('<br>', ' ')), 'News',
         f'''{phero(f'<a href="news.html">{T("ข่าวสาร", "News")}</a>', T("ข่าวสาร", "News"), title, '', '', PH("ภาพข่าว", "news photo"))}
<section class="sec"><div class="wrap story"><div class="rv" style="font-size:18px">{body}<p><a class="btn btn-green" href="{nxt}">{nxtlabel}{ARROW}</a></p></div><div class="pic rv">{PH("ภาพประกอบ", "photo")}</div></div></section>
{nextp("news.html", T("ข่าวสาร", "News"), T("ข่าวทั้งหมด", "All news"), PH("กิจกรรมโรงเรียน", "school life"))}
{SOURCES(*src)}''')

# ---------------------------------------------------------------- activities, calendar, downloads, services, contact
acts = f'''{phero(T("ภาพกิจกรรม", "Photos"), T("ภาพกิจกรรม", "Photos"), T("บรรยากาศ", "Life"), T('<span style="color:var(--goldInk)">ในโรงเรียน</span>', '<span style="color:var(--goldInk)">at school</span>'),
   T("ภาพกิจกรรมจากเพจ Facebook ของโรงเรียน", "Photos from the school's Facebook page."), PH("กิจกรรมโรงเรียน", "school life"))}
<section class="sec"><div class="wrap">{head2(T("อัลบั้ม", "Albums"), T("กิจกรรมตลอดปี", "Through the year"))}{gallery([("กีฬาสี", "sports day"), ("ทัศนศึกษา", "field trip"), ("ประกวดโครงงาน", "project contest"), ("วันสำคัญ", "special days"), ("ค่ายวิชาการ", "academic camp")])}
<div style="margin-top:14px">{gallery([("ห้องเรียน", "classes"), ("ห้องแล็บ", "the lab"), ("ดนตรีและศิลปะ", "music and art"), ("กิจกรรมอนุบาล", "kindergarten"), ("พิธีการ", "ceremonies")])}</div></div></section>
{SOURCES('fb', 'act')}'''
page('activities.html', 'ภาพกิจกรรม', 'Photos', acts)

cal = f'''{phero(T("ปฏิทิน", "Calendar"), T("ปฏิทินการศึกษา", "Calendar"), T("ปฏิทิน", "The school"), T('<span style="color:var(--goldInk)">การศึกษา</span>', '<span style="color:var(--goldInk)">calendar</span>'),
   T("วันสำคัญและกิจกรรมตลอดปีการศึกษา", "Key dates and events through the year."), PH("กิจกรรมตลอดปี", "the school year"))}
<section class="sec"><div class="wrap"><div class="cal rv" style="max-width:820px"><h3>{T("ภาคเรียนที่ 2", "Term 2")} <span class="sample">{T("ตัวอย่าง รอปฏิทินจริงจากโรงเรียน", "sample until the school's calendar arrives")}</span></h3><ol>
  <li><span class="d">{T("ธ.ค.", "Dec")}</span><span>{T("ประชุมผู้ปกครองภาคเรียนที่ 2", "Parents' meeting, term 2")}</span></li>
  <li><span class="d">{T("ม.ค.", "Jan")}</span><span>{T("กิจกรรมวันเด็กแห่งชาติ", "National Children's Day")}</span></li>
  <li><span class="d">{T("ก.พ.", "Feb")}</span><span>{T("นิทรรศการโครงงานวิทยาศาสตร์", "Science project fair")}</span></li>
  <li><span class="d">{T("มี.ค.", "Mar")}</span><span>{T("สอบปลายภาคเรียนที่ 2", "Term 2 final exams")}</span></li></ol></div></div></section>'''
page('calendar.html', 'ปฏิทินการศึกษา', 'Calendar', cal)

dl = f'''{phero(T("ดาวน์โหลด", "Downloads"), T("เอกสารดาวน์โหลด", "Downloads"), T("เอกสาร", "Forms and"), T('<span style="color:var(--goldInk)">และแบบฟอร์ม</span>', '<span style="color:var(--goldInk)">documents</span>'),
   T("แบบฟอร์มสำหรับนักเรียนและผู้ปกครอง", "Forms for pupils and parents."), PH("เอกสาร", "documents"))}
<section class="sec"><div class="wrap"><div class="tiles t3 rv-s">
  <div class="tl"><div class="ic">PDF</div><h3>{T("ใบสมัครเข้าเรียน", "Application form")}</h3><p>{PENDING}</p></div>
  <div class="tl"><div class="ic">PDF</div><h3>{T("แบบฟอร์มลา", "Leave form")}</h3><p>{PENDING}</p></div>
  <div class="tl"><div class="ic">PDF</div><h3>{T("คำร้องขอเอกสาร", "Document request")}</h3><p>{PENDING}</p></div></div></div></section>'''
page('downloads.html', 'เอกสารดาวน์โหลด', 'Downloads', dl)

svc = f'''{phero(T("ระบบทะเบียน", "Registry"), T("บริการออนไลน์", "Online services"), T("ระบบทะเบียน", "Student"), T('<span style="color:var(--goldInk)">นักเรียน</span>', '<span style="color:var(--goldInk)">registry</span>'),
   T("ระบบสำหรับนักเรียนและผู้ปกครอง ใช้รหัสที่ได้รับจากโรงเรียนในการเข้าสู่ระบบ", "The system for pupils and parents. Sign in with the details the school gave you."), PH("นักเรียนใช้คอมพิวเตอร์", "a pupil at a computer"), '',
   f'<div class="ctas" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:24px"><a class="btn btn-green" href="https://satit.pbru.ac.th/registrarsch/" target="_blank" rel="noopener">{T("เข้าสู่ระบบทะเบียน", "Sign in to the registry")}{ARROW}</a><a class="btn btn-ghost" href="contact.html">{T("ลืมรหัส? ติดต่อโรงเรียน", "Forgot your login? Contact us")}</a></div>')}
<section class="sec"><div class="wrap"><div class="tiles t3 rv-s">
  <div class="tl"><div class="ic">1</div><h3>{T("เตรียมรหัส", "Have your login ready")}</h3><p>{T("ใช้ชื่อผู้ใช้และรหัสผ่านที่ได้รับจากโรงเรียน", "Use the username and password from the school.")}</p></div>
  <div class="tl"><div class="ic">2</div><h3>{T("เข้าสู่ระบบ", "Sign in")}</h3><p>{T("ระบบนี้เป็นของโรงเรียน เปิดในหน้าต่างใหม่", "This is the school's own system; it opens in a new tab.")}</p></div>
  <div class="tl"><div class="ic">3</div><h3>{T("มีปัญหา?", "Trouble?")}</h3><p>{T("โทร 032-708623", "Call +66 32 708 623")}</p></div></div></div></section>'''
page('services.html', 'ระบบทะเบียน', 'Student registry', svc)

MAPQ = '%E0%B9%82%E0%B8%A3%E0%B8%87%E0%B9%80%E0%B8%A3%E0%B8%B5%E0%B8%A2%E0%B8%99%E0%B8%AA%E0%B8%B2%E0%B8%98%E0%B8%B4%E0%B8%95+%E0%B8%A1%E0%B8%AB%E0%B8%B2%E0%B8%A7%E0%B8%B4%E0%B8%97%E0%B8%A2%E0%B8%B2%E0%B8%A5%E0%B8%B1%E0%B8%A2%E0%B8%A3%E0%B8%B2%E0%B8%8A%E0%B8%A0%E0%B8%B1%E0%B8%8F%E0%B9%80%E0%B8%9E%E0%B8%8A%E0%B8%A3%E0%B8%9A%E0%B8%B8%E0%B8%A3%E0%B8%B5'
con = f'''{phero(T("ติดต่อ", "Contact"), T("ติดต่อโรงเรียน", "Contact"), T("แวะมา", "Come and"), T('<span style="color:var(--goldInk)">คุยกับเรา</span>', '<span style="color:var(--goldInk)">talk to us</span>'),
   T("ยินดีต้อนรับผู้ปกครองทุกท่าน โทรหรืออีเมลเพื่อนัดเยี่ยมชมโรงเรียนได้", "Parents are always welcome. Call or email to arrange a visit."), HERO_IMG)}
<section class="sec"><div class="wrap"><div class="ccards rv-s">
  <a class="ccard" href="tel:032708623"><span class="ic">{svg('phone')}</span><h3>{T("โทรศัพท์", "Phone")}</h3><p>032-708623</p></a>
  <a class="ccard" href="mailto:satitpbru@mail.pbru.ac.th"><span class="ic">{svg('mail')}</span><h3>{T("อีเมล", "Email")}</h3><p>satitpbru@mail.pbru.ac.th</p></a>
  <a class="ccard" href="#map"><span class="ic">{svg('pin')}</span><h3>{T("ที่อยู่", "Address")}</h3><p>{T("38 หมู่ 8 ถ.หาดเจ้าสำราญ ต.นาวุ้ง อ.เมือง จ.เพชรบุรี 76000", "38 Moo 8, Hat Chao Samran Rd, Na Wung, Phetchaburi 76000")}</p></a>
  <a class="ccard" href="activities.html"><span class="ic">{svg('pic')}</span><h3>{T("ภาพกิจกรรม", "Photos")}</h3><p>{T("บรรยากาศในโรงเรียน", "Life at school")}</p></a></div>
  <iframe class="bigmap rv" id="map" title="แผนที่โรงเรียน" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q={MAPQ}&amp;output=embed"></iframe></div></section>
{SOURCES('contact', 'photo')}'''
page('contact.html', 'ติดต่อ', 'Contact', con)
print('built', len(list(ROOT.glob('*.html'))), 'pages')
