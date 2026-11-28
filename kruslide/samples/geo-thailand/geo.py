#!/usr/bin/env python3
"""Make src/data-geo.js (window.GEO) for the geo-thailand sample from Natural Earth data (public domain).
  python3 geo.py <folder with the Natural Earth GeoJSON files>
Files used (github.com/nvkelso/natural-earth-vector, folder geojson/):
  ne_10m_admin_1_states_provinces.geojson   Thailand's 77 provinces, dissolved here into the 6 regions
  ne_50m_admin_0_countries.geojson          neighbouring countries, for context
  ne_10m_rivers_lake_centerlines.geojson    main rivers
  ne_10m_geography_regions_polys.geojson    the Khorat Plateau outline
Regions: the 6-region system of the National Geographical Committee (2520), the one taught in Thai schools.
Natural Earth puts Nakhon Nayok in "Eastern"; in the 6-region system it is Central, so the mapping below is our own.
Projection: Lambert azimuthal equal-area centred on 101°E 13°N (like school/africa/geo.py).
Contours: Natural Earth has no elevation, so the contour lines are ILLUSTRATIVE. They are drawn from a smooth surface
built along the real mountain ranges (lines below, from standard atlases) and the Khorat Plateau outline, with the
peaks Doi Inthanon 2,565 m and Khao Luang 1,835 m. The slide says so. Requires: shapely, contourpy, numpy."""
import json, math, sys
from pathlib import Path
import numpy as np
import contourpy
from shapely.geometry import shape, mapping, LineString, MultiLineString, Polygon, MultiPolygon, Point, box
from shapely.ops import unary_union, polylabel

HERE = Path(__file__).parent
D = Path(sys.argv[1] if len(sys.argv) > 1 else '.')

REG = {   # key: (Thai name, English, Natural Earth province names)
 'n':  ('ภาคเหนือ', 'Northern', 'Chiang Rai,Chiang Mai,Mae Hong Son,Phayao,Nan,Uttaradit,Lampang,Phrae,Lamphun'),
 'ne': ('ภาคตะวันออกเฉียงเหนือ', 'Northeastern', 'Surin,Si Sa Ket,Ubon Ratchathani,Buri Ram,Loei,Bueng Kan,Nong Khai,Nakhon Phanom,Mukdahan,Amnat Charoen,Khon Kaen,Sakon Nakhon,Nakhon Ratchasima,Kalasin,Roi Et,Maha Sarakham,Nong Bua Lam Phu,Udon Thani,Chaiyaphum,Yasothon'),
 'c':  ('ภาคกลาง', 'Central', 'Phitsanulok,Samut Songkhram,Samut Sakhon,Bangkok Metropolis,Samut Prakan,Suphan Buri,Sing Buri,Chai Nat,Ang Thong,Saraburi,Nakhon Nayok,Pathum Thani,Uthai Thani,Lop Buri,Phra Nakhon Si Ayutthaya,Nonthaburi,Nakhon Pathom,Kamphaeng Phet,Sukhothai,Nakhon Sawan,Phetchabun,Phichit'),
 'e':  ('ภาคตะวันออก', 'Eastern', 'Sa Kaeo,Trat,Chanthaburi,Chachoengsao,Chon Buri,Rayong,Prachin Buri'),
 'w':  ('ภาคตะวันตก', 'Western', 'Tak,Kanchanaburi,Prachuap Khiri Khan,Phetchaburi,Ratchaburi'),
 's':  ('ภาคใต้', 'Southern', 'Satun,Songkhla,Yala,Narathiwat,Chumphon,Ranong,Phangnga,Krabi,Trang,Pattani,Phatthalung,Nakhon Si Thammarat,Surat Thani,Phuket'),
}
LON0, LAT0 = math.radians(101), math.radians(13)
def laea(lon, lat):
    l, p = math.radians(lon), math.radians(lat)
    k = math.sqrt(2 / (1 + math.sin(LAT0) * math.sin(p) + math.cos(LAT0) * math.cos(p) * math.cos(l - LON0)))
    return k * math.cos(p) * math.sin(l - LON0), -k * (math.cos(LAT0) * math.sin(p) - math.sin(LAT0) * math.cos(p) * math.cos(l - LON0))

def load(name): return json.load(open(D / name, encoding='utf-8'))['features']

# ---------- regions ----------
prov = [f for f in load('ne_10m_admin_1_states_provinces.geojson') if f['properties'].get('adm0_a3') == 'THA']
assert len(prov) == 77, len(prov)
name2reg = {n.strip(): k for k, v in REG.items() for n in v[2].split(',')}
assert len(name2reg) == 77 and all(f['properties']['name'] in name2reg for f in prov)
regions = {}
for k in REG:
    gs = [shape(f['geometry']).buffer(0) for f in prov if name2reg[f['properties']['name']] == k]
    u = unary_union(gs).buffer(0.002).buffer(-0.002)
    regions[k] = (u, len(gs))
land = unary_union([g for g, _ in regions.values()])

# ---------- the frame: Thailand 1000 units tall ----------
xs, ys = [], []
for poly in (land.geoms if land.geom_type == 'MultiPolygon' else [land]):
    for lon, lat in poly.exterior.coords: x, y = laea(lon, lat); xs.append(x); ys.append(y)
S = 1000 / (max(ys) - min(ys))
M = 24
X0, Y0 = min(xs) * S - M, min(ys) * S - M
W, H = (max(xs) - min(xs)) * S + 2 * M, 1000 + 2 * M
def P(lon, lat): x, y = laea(lon, lat); return round(x * S - X0, 1), round(y * S - Y0, 1)
VIEW = box(96.3, 4.6, 106.6, 21.2)

def rings_of(g):
    if g.is_empty: return []
    if g.geom_type == 'Polygon': return [g.exterior] + list(g.interiors)
    if g.geom_type in ('MultiPolygon', 'GeometryCollection'): return [r for p in g.geoms for r in rings_of(p)]
    return []
def lines_of(g):
    if g.is_empty: return []
    if g.geom_type == 'LineString': return [g]
    if g.geom_type in ('MultiLineString', 'GeometryCollection'): return [l for p in g.geoms for l in lines_of(p)]
    return []
def pathd(coords, close):
    pts, last = [], None
    for c in coords:
        q = P(c[0], c[1])
        if q != last: pts.append(q); last = q
    if len(pts) < 2: return ''
    return 'M' + ' L'.join(f'{x:g} {y:g}' for x, y in pts) + (' Z' if close else '')
def poly_d(g, tol=0.004, minarea=0.0):
    g = g.simplify(tol, preserve_topology=True)
    parts = g.geoms if g.geom_type == 'MultiPolygon' else [g]
    return ' '.join(pathd(r.coords, True) for p in parts if p.area >= minarea for r in [p.exterior] + list(p.interiors))
def line_d(g, tol=0.006):
    return ' '.join(pathd(l.simplify(tol).coords, False) for l in lines_of(g))

geo = {'W': round(W, 1), 'H': round(H, 1), 'regions': {}, 'context': [], 'rivers': {}, 'contours': [], 'water': [], 'pts': {}}
for k, (g, n) in regions.items():
    main = max(g.geoms, key=lambda p: p.area) if g.geom_type == 'MultiPolygon' else g
    lab = polylabel(main, 0.01)
    geo['regions'][k] = {'th': REG[k][0], 'en': REG[k][1], 'n': n, 'd': poly_d(g, 0.004, 0.0004), 'c': P(lab.x, lab.y)}
geo['land'] = poly_d(land, 0.004, 0.0004)

for f in load('ne_50m_admin_0_countries.geojson'):
    p = f['properties']
    if p.get('ADM0_A3') in ('MMR', 'LAO', 'KHM', 'MYS', 'VNM', 'CHN'):
        g = shape(f['geometry']).buffer(0).intersection(VIEW)
        if not g.is_empty: geo['context'].append(poly_d(g, 0.01, 0.002))

want = {'Mekong': 'แม่น้ำโขง', 'Lancang': 'แม่น้ำโขง', 'Chao Phraya': 'แม่น้ำเจ้าพระยา', 'Ping': 'แม่น้ำปิง', 'Yom': 'แม่น้ำยม', 'Mun': 'แม่น้ำมูล', 'Chi': 'แม่น้ำชี', 'Mae Klong': 'แม่น้ำแม่กลอง'}
for f in load('ne_10m_rivers_lake_centerlines.geojson'):
    n = f['properties'].get('name')
    if n in want and f['properties'].get('featurecla') == 'River':
        g = shape(f['geometry']).intersection(VIEW)
        key = 'Mekong' if n == 'Lancang' else n
        d = line_d(g)
        if d: geo['rivers'][key] = (geo['rivers'].get(key, '') + ' ' + d).strip()

# ---------- illustrative relief ----------
RANGES = [   # (height m, half-width km, [(lon, lat), ...])
 (1700, 16, [(97.75, 19.95), (98.4, 19.85), (98.9, 19.95), (99.3, 20.0), (99.6, 20.15)]),          # Daen Lao
 (1600, 18, [(98.15, 19.3), (98.35, 18.9), (98.5, 18.55), (98.55, 18.1), (98.7, 17.5), (98.75, 17.0)]),  # Thanon Thong Chai
 (1500, 12, [(98.85, 19.6), (98.88, 19.35), (98.9, 19.0)]),                                         # Chiang Dao massif
 (1300, 11, [(99.25, 18.95), (99.3, 18.5), (99.35, 18.05)]),                                        # Khun Tan
 (1400, 15, [(99.8, 19.8), (99.9, 19.2), (100.0, 18.6), (100.05, 18.0)]),                           # Phi Pan Nam (west)
 (1300, 14, [(100.35, 19.6), (100.4, 18.9), (100.3, 18.2)]),                                        # Phi Pan Nam (east)
 (1500, 15, [(101.05, 19.7), (101.2, 19.1), (101.25, 18.5), (101.05, 17.9), (100.85, 17.5)]),       # Luang Prabang
 (1300, 17, [(98.6, 17.3), (98.75, 16.6), (98.85, 16.0), (98.65, 15.4)]),                           # Dawna (Tak)
 (1100, 17, [(98.9, 15.9), (99.1, 15.2), (99.2, 14.6)]),                                            # western forest uplands
 (1200, 13, [(98.55, 15.3), (98.75, 14.6), (99.1, 13.9), (99.3, 13.2), (99.35, 12.6), (99.4, 12.0), (99.2, 11.4), (98.9, 10.8), (98.7, 10.2)]),  # Tanaosri
 (1200, 13, [(101.0, 17.6), (101.15, 17.0), (101.2, 16.4), (101.3, 15.8), (101.35, 15.3)]),         # Phetchabun (west)
 (1100, 11, [(101.55, 17.4), (101.65, 16.9), (101.75, 16.3)]),                                       # Phetchabun (east)
 (900, 11, [(101.35, 15.6), (101.4, 15.1), (101.45, 14.6)]),                                         # Dong Phaya Yen
 (1000, 11, [(101.3, 14.42), (101.8, 14.35), (102.3, 14.25), (102.6, 14.25)]),                       # San Kamphaeng
 (550, 9, [(102.6, 14.25), (103.2, 14.35), (103.8, 14.38), (104.4, 14.38), (105.0, 14.35), (105.4, 14.3)]),  # Phanom Dong Rak
 (550, 11, [(103.0, 17.25), (103.5, 17.0), (104.0, 16.75), (104.4, 16.5)]),                          # Phu Phan
 (1200, 12, [(101.7, 13.2), (102.0, 12.95), (102.25, 12.8)]),                                        # Chanthaburi
 (800, 9, [(102.5, 12.75), (102.7, 12.3), (102.85, 11.9)]),                                          # Banthat (east)
 (1000, 12, [(98.75, 10.3), (98.65, 9.6), (98.55, 9.0), (98.45, 8.4)]),                              # Phuket range
 (1000, 11, [(99.4, 9.4), (99.6, 8.8), (99.8, 8.3), (100.0, 7.6), (100.1, 7.0)]),                    # Nakhon Si Thammarat
 (1000, 11, [(100.6, 6.55), (101.0, 6.1), (101.5, 5.85), (101.8, 5.8)]),                             # Sankalakhiri
]
PEAKS = [(2565, 9, 98.487, 18.588), (1835, 8, 99.73, 8.50)]   # Doi Inthanon, Khao Luang
lo = np.arange(97.2, 105.8, 0.02); la = np.arange(5.5, 20.6, 0.02)
LO, LA = np.meshgrid(lo, la)
KX = 111.32 * np.cos(np.radians(LA)); KY = 110.57
Z = np.zeros_like(LO)
def seg_dist(ax, ay, bx, by):
    px, py = (LO - ax) * KX, (LA - ay) * KY
    vx, vy = (bx - ax) * KX, (by - ay) * KY
    t = np.clip((px * vx + py * vy) / np.maximum(vx * vx + vy * vy, 1e-9), 0, 1)
    return np.hypot(px - t * vx, py - t * vy)
def smooth_noise(seed, km):   # smooth random field in 0..1, features about `km` across (Gaussian-filtered white noise via FFT)
    r = np.random.default_rng(seed).standard_normal(LO.shape)
    fy = np.fft.fftfreq(LO.shape[0], d=0.02 * KY)[:, None]; fx = np.fft.fftfreq(LO.shape[1], d=0.02 * 111.32 * math.cos(math.radians(13)))[None, :]
    g = np.real(np.fft.ifft2(np.fft.fft2(r) * np.exp(-2 * (math.pi * km) ** 2 * (fx ** 2 + fy ** 2))))
    return (g - g.min()) / (g.max() - g.min())
N1, N2 = smooth_noise(7, 14), smooth_noise(11, 6)
for h, w, pts in RANGES:
    d = np.min([seg_dist(*pts[i], *pts[i + 1]) for i in range(len(pts) - 1)], axis=0)
    Z = np.maximum(Z, h * np.exp(-(d / (w * 1.7)) ** 2))
Z = Z * (0.45 + 0.9 * N1) + 260 * (N2 - 0.5) * (Z > 150)
for h, w, x, y in PEAKS:
    d = np.hypot((LO - x) * KX, (LA - y) * KY)
    Z = np.maximum(Z, h * np.exp(-(d / w) ** 2))
korat = [shape(f['geometry']) for f in load('ne_10m_geography_regions_polys.geojson') if (f['properties'].get('name') or f['properties'].get('NAME')) == 'Khorat Plat.'][0]
kor = korat.buffer(0).intersection(regions['ne'][0].buffer(0.05)).buffer(-0.08)
# plateau: about 170 m, rising over ~25 km from its edge (distance sampled on the grid)
inside = np.zeros_like(LO, dtype=bool)
from shapely import contains_xy
inside = contains_xy(kor, LO, LA)
from shapely import distance as sdist, points as spoints
edge = kor.boundary
dd = np.zeros_like(LO)
idx = np.where(inside)
dd[idx] = sdist(edge, spoints(LO[idx], LA[idx])) * 111
Z = np.maximum(Z, np.where(inside, 170 * np.clip(dd / 25, 0, 1) ** 0.7, 0))
gen = contourpy.contour_generator(lo, la, Z, line_type='Separate')
LEVELS = [100, 300, 600, 1000, 1500, 2000]
landb = land.buffer(-0.01)
for lev in LEVELS:
    segs = [LineString(s) for s in gen.lines(lev) if len(s) > 2]
    if not segs: continue
    g = MultiLineString(segs).intersection(landb)
    d = line_d(g, 0.01)
    if d: geo['contours'].append({'z': lev, 'd': d})

# water lining: lines that follow the coast out to sea
allland = unary_union([land] + [shape(f['geometry']).buffer(0) for f in load('ne_50m_admin_0_countries.geojson') if f['properties'].get('ADM0_A3') in ('MMR', 'LAO', 'KHM', 'MYS', 'VNM')]).intersection(VIEW.buffer(1))
for k, km in enumerate((7, 16, 28, 44)):
    ring = allland.buffer(km / 111).simplify(0.02).boundary.intersection(VIEW)
    geo['water'].append(line_d(ring, 0.02))

for key, (lon, lat) in {'bkk': (100.5018, 13.7563), 'inthanon': (98.487, 18.588), 'khaoluang': (99.73, 8.50), 'nsawan': (100.12, 15.70), 'cnx': (98.9853, 18.7883)}.items():
    geo['pts'][key] = P(lon, lat)
# a map frame in projected units: lon/lat graticule every 2 degrees
geo['grat'] = []
for lon in range(96, 108, 2): geo['grat'].append(pathd([(lon, la_) for la_ in np.arange(4, 22.1, 0.5)], False))
for lat in range(4, 23, 2): geo['grat'].append(pathd([(lo_, lat) for lo_ in np.arange(95, 108.1, 0.5)], False))

geo['kmPerUnit'] = round(6371.0 / S, 4)
# decorative contour pattern for the paper (not geography): iso-lines of a smooth random field over the 1920x1080 stage
rg = np.random.default_rng(3).standard_normal((90, 160))
fy = np.fft.fftfreq(90)[:, None]; fx = np.fft.fftfreq(160)[None, :]
bgz = np.real(np.fft.ifft2(np.fft.fft2(rg) * np.exp(-2 * (math.pi * 6.5) ** 2 * (fx ** 2 + fy ** 2))))
bgz = (bgz - bgz.min()) / (bgz.max() - bgz.min())
bgen = contourpy.contour_generator(np.arange(160) * 12.08, np.arange(90) * 12.13, bgz, line_type='Separate')
geo['bg'] = []
for k, lev in enumerate(np.linspace(0.12, 0.92, 15)):
    ds = []
    for s in bgen.lines(lev):
        if len(s) < 4: continue
        l = LineString(s).simplify(1.6)
        ds.append('M' + ' L'.join(f'{x:.0f} {y:.0f}' for x, y in l.coords))
    geo['bg'].append({'i': k % 5 == 0, 'd': ' '.join(ds)})
js = '/* data-geo.js · made by geo.py from Natural Earth (public domain). Do not edit by hand. */\nwindow.GEO=' + json.dumps(geo, ensure_ascii=False, separators=(',', ':')) + ';\n'
(HERE / 'src' / 'data-geo.js').write_text(js, encoding='utf-8')
print('regions', {k: v['n'] for k, v in geo['regions'].items()}, 'rivers', sorted(geo['rivers']), 'contours', [c['z'] for c in geo['contours']], 'size', len(js) // 1024, 'KB', 'W×H', geo['W'], geo['H'])
