#!/usr/bin/env python3
"""Project Natural Earth data (public domain) into SVG paths for the Africa film.
   Africa map: Lambert azimuthal equal-area centred on Africa. Globe: plain lon/lat rings for the JS orthographic globe.
   Output: build/geo.js  (window.GEO = {...})."""
import json, math
from pathlib import Path

HERE = Path(__file__).parent
D = HERE / 'data'
LON0, LAT0 = math.radians(17), math.radians(3)
W, H = 1000, 1080          # SVG viewBox of the Africa map

def laea(lon, lat):
    l, p = math.radians(lon), math.radians(lat)
    k = math.sqrt(2 / (1 + math.sin(LAT0) * math.sin(p) + math.cos(LAT0) * math.cos(p) * math.cos(l - LON0)))
    return k * math.cos(p) * math.sin(l - LON0), -k * (math.cos(LAT0) * math.sin(p) - math.sin(LAT0) * math.cos(p) * math.cos(l - LON0))

# fit Africa (lon -18..52, lat -35..38) into the viewBox with a margin
corners = [laea(lo, la) for lo in range(-18, 53, 2) for la in (-35, 38)] + [laea(lo, la) for lo in (-18, 52) for la in range(-35, 39, 2)]
xs, ys = [c[0] for c in corners], [c[1] for c in corners]
S = min((W - 60) / (max(xs) - min(xs)), (H - 60) / (max(ys) - min(ys)))
CX, CY = W / 2 - S * (max(xs) + min(xs)) / 2, H / 2 - S * (max(ys) + min(ys)) / 2
def P(lon, lat):
    x, y = laea(lon, lat); return round(CX + S * x, 1), round(CY + S * y, 1)

def rings(geom):
    if geom['type'] == 'Polygon': return geom['coordinates']
    if geom['type'] == 'MultiPolygon': return [r for poly in geom['coordinates'] for r in poly]
    if geom['type'] == 'LineString': return [geom['coordinates']]
    if geom['type'] == 'MultiLineString': return geom['coordinates']
    return []

def path(geom, close=True, minpts=2):
    out = []
    for r in rings(geom):
        pts, last = [], None
        for lon, lat, *_ in r:
            if not (-40 <= lon <= 75 and -50 <= lat <= 50): continue
            q = P(lon, lat)
            if q != last: pts.append(q); last = q
        if len(pts) < minpts: continue
        out.append('M' + ' L'.join(f'{x} {y}' for x, y in pts) + (' Z' if close else ''))
    return ' '.join(out)

geo = {'W': W, 'H': H, 'proj': {'lon0': 17, 'lat0': 3, 's': S, 'cx': CX, 'cy': CY}, 'countries': {}, 'context': [], 'rivers': {}, 'lakes': {}, 'globe': []}
for f in json.load(open(D / 'ne_50m_admin_0_countries.geojson'))['features']:
    p = f['properties']; g = f['geometry']
    if p.get('CONTINENT') == 'Africa':
        geo['countries'][p['ADM0_A3']] = {'n': p['NAME'], 'd': path(g, minpts=3), 'pop': p.get('POP_EST'), 'c': P(p['LABEL_X'], p['LABEL_Y'])}
    elif p.get('CONTINENT') in ('Europe', 'Asia'):
        d = path(g, minpts=3)
        if d: geo['context'].append(d)
want_r = {'Nile', 'Victoria Nile', 'Albert Nile', 'Congo', 'Lualaba', 'Ubangi', 'Kasai', 'Niger', 'Benue', 'Zambezi', 'Orange', 'Limpopo', 'Okavango', 'Volta', 'Atbara'}
for f in json.load(open(D / 'ne_50m_rivers_lake_centerlines.geojson'))['features']:
    n = f['properties'].get('name')
    if n in want_r:
        d = path(f['geometry'], close=False)
        if d: geo['rivers'][n] = (geo['rivers'].get(n, '') + ' ' + d).strip()
for f in json.load(open(D / 'ne_50m_lakes.geojson'))['features']:
    n = f['properties'].get('name')
    if n and n.startswith('Lake ') and n[5:] in {'Victoria', 'Tanganyika', 'Malawi', 'Chad', 'Volta', 'Turkana', 'Nasser', 'Kariba', 'Tana', 'Albert', 'Kivu'}:
        geo['lakes'][n] = (geo['lakes'].get(n, '') + ' ' + path(f['geometry'], minpts=3)).strip()
# globe: every country ring in lon/lat, thinned (every 2nd point) and rounded
for f in json.load(open(D / 'ne_110m_admin_0_countries.geojson'))['features']:
    af = f['properties'].get('CONTINENT') == 'Africa'
    for r in rings(f['geometry']):
        pts = [[round(a, 1), round(b, 1)] for a, b, *_ in r[::2]]
        if len(pts) >= 3: geo['globe'].append({'a': 1 if af else 0, 'p': pts})

(HERE / 'build').mkdir(exist_ok=True)
js = 'window.GEO=' + json.dumps(geo, separators=(',', ':')) + ';'
(HERE / 'build' / 'geo.js').write_text(js)
print('countries', len(geo['countries']), 'rivers', sorted(geo['rivers']), 'lakes', sorted(geo['lakes']), 'globe rings', len(geo['globe']), 'size', len(js) // 1024, 'KB')
