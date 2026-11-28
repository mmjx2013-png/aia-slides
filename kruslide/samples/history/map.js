/* Ayutthaya deck · map engine: one camera that flies from the globe to the island city.
   Satellite picture: NASA Blue Marble (public domain), drawn on an orthographic globe with WebGL2.
   Borders and coast: Natural Earth (public domain, geo.js). Island and rivers: a SIMPLIFIED DIAGRAM drawn from known geography.
   The deck calls MAP.go(shot) on every beat; shots are absolute states, so going back simply plays the reverse move. */
(function () {
  'use strict';
  var D2R = Math.PI / 180, SW = 1920, SH = 1080, G = window.GEO || { world: [], asia: {}, tha: [] };
  var doc = document.documentElement;
  var box = document.getElementById('map'), cgl = document.getElementById('mgl'), c2 = document.getElementById('m2d'),
      lab = document.getElementById('mlab'), vimg = document.getElementById('mval'), ring = document.getElementById('mring');
  var ctx = c2.getContext('2d');
  var RM = function () { return doc.classList.contains('rm'); };
  var T = function () { return performance.now() / 1000; };
  var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

  /* ---------------- tweened values ---------------- */
  var V = {};
  function getV(k) { var o = V[k]; if (!o) return 0; var t = T(); if (t < o.t0) return o.a; if (o.d <= 0) return o.b; var p = Math.min(1, (t - o.t0) / o.d); return o.a + (o.b - o.a) * ease(p); }
  function setV(k, to, delay, dur) {
    var cur = getV(k), o = V[k] || (V[k] = {});
    if (RM()) { delay = 0; dur = 0; }
    o.a = cur; o.b = to; o.t0 = T() + (delay || 0); o.d = dur == null ? .7 : dur;
  }

  /* ---------------- diagram geography (simplified, lon/lat) ---------------- */
  var C0 = [100.5625, 14.3545], KX = 111320 * Math.cos(C0[1] * D2R), KY = 110574;
  var toM = function (p) { return [(p[0] - C0[0]) * KX, (p[1] - C0[1]) * KY]; };
  var toLL = function (m) { return [m[0] / KX + C0[0], m[1] / KY + C0[1]]; };
  // island outline, clockwise from the north-west corner (Hua Laem) - approximate
  var ISL0 = [[100.5462, 14.3588], [100.5520, 14.3606], [100.5585, 14.3618], [100.5650, 14.3626], [100.5715, 14.3634], [100.5760, 14.3636], [100.5785, 14.3622],
    [100.5797, 14.3585], [100.5793, 14.3540], [100.5778, 14.3505], [100.5755, 14.3482], [100.5728, 14.3468], [100.5670, 14.3458], [100.5610, 14.3452],
    [100.5550, 14.3460], [100.5500, 14.3478], [100.5468, 14.3505], [100.5452, 14.3540], [100.5450, 14.3568]];
  function catmull(pts, closed, n) {
    var out = [], L = pts.length, seg = closed ? L : L - 1;
    for (var i = 0; i < seg; i++) {
      var p0 = pts[closed ? (i - 1 + L) % L : Math.max(0, i - 1)], p1 = pts[i], p2 = pts[(i + 1) % L], p3 = pts[closed ? (i + 2) % L : Math.min(L - 1, i + 2)];
      for (var j = 0; j < n; j++) { var t = j / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(function (k) { return .5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3); })); }
    }
    if (!closed) out.push(pts[L - 1]);
    return out;
  }
  var ISLM = catmull(ISL0.map(toM), true, 8);                 // smoothed island in metres
  var ISL = ISLM.map(toLL);
  function rIsl(th) {                                         // distance from C0 to the island edge along angle th (ray cast)
    var dx = Math.cos(th), dy = Math.sin(th), best = 0;
    for (var i = 0; i < ISLM.length; i++) {
      var a = ISLM[i], b = ISLM[(i + 1) % ISLM.length], ex = b[0] - a[0], ey = b[1] - a[1], den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) continue;
      var t = (a[0] * ey - a[1] * ex) / den, u = (a[0] * dy - a[1] * dx) / den;
      if (t > 0 && u >= 0 && u <= 1) best = Math.max(best, t);
    }
    return best;
  }
  function ringArc(a0, a1, off) {                              // river centre-line around the island from angle a0 to a1 (degrees)
    var out = [], n = Math.max(2, Math.round(Math.abs(a1 - a0) / 1.5));
    for (var i = 0; i <= n; i++) { var th = (a0 + (a1 - a0) * i / n) * D2R, r = rIsl(th) + off; out.push(toLL([r * Math.cos(th), r * Math.sin(th)])); }
    return out;
  }
  var A_NE = 26, A_NW = 165, A_SE = -37.5;                       // Hua Ro, Hua Laem, Pom Phet (approximate)
  var CP_N = [[100.12, 15.70], [100.17, 15.17], [100.30, 15.02], [100.40, 14.89], [100.45, 14.59], [100.49, 14.50], [100.512, 14.46], [100.528, 14.448],
    [100.536, 14.425], [100.5398, 14.40], [100.5415, 14.378], [100.5428, 14.3632]];
  var CP_S = [[100.5772, 14.3442], [100.5800, 14.3405], [100.5815, 14.3300], [100.5810, 14.3150], [100.5800, 14.2950], [100.5790, 14.2600], [100.578, 14.232],
    [100.565, 14.16], [100.545, 14.09], [100.528, 14.02], [100.515, 13.94], [100.500, 13.86], [100.493, 13.80], [100.490, 13.75], [100.505, 13.705],
    [100.545, 13.690], [100.560, 13.660], [100.575, 13.600], [100.585, 13.545]];
  var CPARC = ringArc(A_NW, 360 + A_SE, 150);
  var RIV = {
    cp: { w: 260, pts: smoothLL(CP_N.concat(CPARC, CP_S)) },
    lb: { w: 110, pts: smoothLL([[100.574, 14.45], [100.5745, 14.42], [100.576, 14.395], [100.578, 14.378], [100.5795, 14.369]].concat(ringArc(A_NE, A_NW, 75))) },
    ps: { w: 150, pts: smoothLL([[100.625, 14.43], [100.606, 14.40], [100.593, 14.383], [100.5855, 14.371]].concat(ringArc(A_NE, A_SE, 95))) }
  };
  function smoothLL(pts) { return catmull(pts.map(toM), false, 4).map(toLL); }
  // index on the Chao Phraya where the island arc ends (for the boat and the Thonburi arrow)
  var CP_SE_I = (function () { var p = toLL(toM(CPARC[CPARC.length - 1])), best = 0, bd = 1e9; RIV.cp.pts.forEach(function (q, i) { var d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = i; } }); return best; })();
  var PAL = [[100.5552, 14.3556], [100.5612, 14.3556], [100.5612, 14.3606], [100.5552, 14.3606]];   // royal palace precinct (approx.)
  var PINS = { S: [100.5584, 14.3559], M: [100.5675, 14.3570], C: [100.5455, 14.3448], A: C0, T: [100.489, 13.742], B: [100.50, 13.75] };

  /* trade routes: way-points (lon, lat); drawn along great circles */
  var AYU = C0, MOUTH = [100.585, 13.545];
  var ROUTES = {
    east: [AYU, MOUTH, [100.9, 12.7], [101.6, 11.2], [102.8, 9.6], [104.6, 8.2], [106.8, 8.7], [108.9, 11.0], [109.6, 13.5], [109.9, 16.5], [111.4, 19.6], [113.5, 22.4],
      [115.6, 22.7], [118.5, 24.1], [120.7, 26.1], [123.6, 28.6], [127.4, 31.1], [129.8, 32.7]],
    west: [AYU, MOUTH, [100.9, 12.6], [101.3, 11.0], [101.6, 9.0], [102.6, 7.0], [103.6, 5.0], [104.3, 2.3], [103.8, 1.25], [102.9, 1.7], [101.8, 2.6], [100.4, 3.8],
      [98.8, 5.4], [96.2, 6.2], [91, 6.8], [86, 6.9], [81.9, 5.6]],
    india: [[86, 6.9], [83.5, 9.2], [81.6, 11.6], [80.4, 13.1]],
    persia: [[81.9, 5.6], [79.6, 5.4], [77, 7.2], [73.6, 11], [70.6, 16.5], [67.5, 21.5], [62, 24.6], [57.2, 25.9], [56.3, 27.0]],
    europe: [[79.6, 5.4], [70, -2], [58, -12], [45, -23], [32, -32], [20, -35.5], [12, -30], [6, -18], [0, -5]],
    land: [AYU, [100.25, 13.65], [99.95, 13.1], [99.8, 12.3], [99.5, 11.8], [99.08, 12.08], [98.6, 12.44]],
    landsea: [[98.6, 12.44], [95.5, 12.6], [91, 12.9], [86, 13.3], [80.5, 13.2]]
  };
  function gc(a, b, n) {                                        // great-circle points between a and b
    var la1 = a[1] * D2R, lo1 = a[0] * D2R, la2 = b[1] * D2R, lo2 = b[0] * D2R;
    var A = [Math.cos(la1) * Math.cos(lo1), Math.cos(la1) * Math.sin(lo1), Math.sin(la1)], B = [Math.cos(la2) * Math.cos(lo2), Math.cos(la2) * Math.sin(lo2), Math.sin(la2)];
    var d = Math.acos(Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]))), out = [];
    for (var i = 0; i <= n; i++) { var t = i / n, s1 = d < 1e-9 ? 1 - t : Math.sin((1 - t) * d) / Math.sin(d), s2 = d < 1e-9 ? t : Math.sin(t * d) / Math.sin(d);
      var x = s1 * A[0] + s2 * B[0], y = s1 * A[1] + s2 * B[1], z = s1 * A[2] + s2 * B[2]; out.push([Math.atan2(y, x) / D2R, Math.atan2(z, Math.hypot(x, y)) / D2R]); }
    return out;
  }
  Object.keys(ROUTES).forEach(function (k) { var w = ROUTES[k], out = [w[0]];
    for (var i = 1; i < w.length; i++) { var seg = gc(w[i - 1], w[i], Math.max(2, Math.ceil(Math.hypot(w[i][0] - w[i - 1][0], w[i][1] - w[i - 1][1]) / .6))); out = out.concat(seg.slice(1)); }
    ROUTES[k] = out; });

  /* ---------------- camera ---------------- */
  var base = { lon: 84, lat: 17, R: 420, cx: 1290, cy: 560 }, idleMode = 'spin', fl = null;
  function clone(c) { return { lon: c.lon, lat: c.lat, R: c.R, cx: c.cx, cy: c.cy }; }
  function zoomI(a, b) {                                        // van Wijk & Nuij smooth zoom (as d3.interpolateZoom), in a local plate carree
    var lon1 = b.lon; while (lon1 - a.lon > 180) lon1 -= 360; while (lon1 - a.lon < -180) lon1 += 360;
    var k = Math.cos((a.lat + b.lat) / 2 * D2R), rho = 1.3, rho2 = rho * rho, rho4 = rho2 * rho2;
    var ux0 = a.lon * D2R * k, uy0 = a.lat * D2R, w0 = SW / a.R, ux1 = lon1 * D2R * k, uy1 = b.lat * D2R, w1 = SW / b.R;
    var dx = ux1 - ux0, dy = uy1 - uy0, d2 = dx * dx + dy * dy, f;
    if (d2 < 1e-16) { var S0 = Math.log(w1 / w0) / rho; f = function (t) { return [ux0 + t * dx, uy0 + t * dy, w0 * Math.exp(rho * t * S0)]; }; }
    else { var d1 = Math.sqrt(d2), b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1), b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1),
        r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0), r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1), S = (r1 - r0) / rho;
      f = function (t) { var s = t * S, ch = Math.cosh(r0), u = w0 / (rho2 * d1) * (ch * Math.tanh(rho * s + r0) - Math.sinh(r0)); return [ux0 + u * dx, uy0 + u * dy, w0 * ch / Math.cosh(rho * s + r0)]; }; }
    return function (t) { var q = f(t); return { lon: q[0] / k / D2R, lat: q[1] / D2R, R: SW / q[2], cx: a.cx + (b.cx - a.cx) * t, cy: a.cy + (b.cy - a.cy) * t }; };
  }
  function cam(t) {
    var c;
    if (fl) { var p = (t - fl.t0) / fl.d; if (p >= 1) { fl = null; c = clone(base); } else c = fl.f(ease(Math.max(0, p))); }
    else c = clone(base);
    var k = getV('idle');
    if (k > 0) {
      if (idleMode === 'spin') c.lon += k * 7 * Math.sin(t * 2 * Math.PI / 70);
      else if (idleMode === 'breathe') { c.R *= 1 + k * .014 * Math.sin(t * 2 * Math.PI / 28); c.cx += k * 6 * Math.sin(t * 2 * Math.PI / 39); c.cy += k * 4 * Math.sin(t * 2 * Math.PI / 47); }
    }
    return c;
  }
  var C = clone(base);                                          // the camera of the current frame
  function P(lon, lat) {                                        // orthographic projection -> [x, y, cos c]
    var l = (lon - C.lon) * D2R, p = lat * D2R, p0 = C.lat * D2R, cp = Math.cos(p), sp = Math.sin(p), c0 = Math.cos(p0), s0 = Math.sin(p0), cl = Math.cos(l);
    return [C.cx + C.R * cp * Math.sin(l), C.cy - C.R * (c0 * sp - s0 * cp * cl), s0 * sp + c0 * cp * cl];
  }
  var mpx = function (m) { return m / 6371000 * C.R; };          // metres on the ground -> stage px

  /* ---------------- WebGL2 satellite globe ---------------- */
  var gl = null, prog, uni = {}, texOK = 0;
  (function initGL() {
    try { gl = cgl.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true }); } catch (e) { gl = null; }
    if (!gl) return;
    var vs = '#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var fs = ['#version 300 es', 'precision highp float;',
      'uniform vec2 uRes;uniform float uS;uniform vec3 uCam;uniform vec2 uC;uniform float uA;uniform float uAtm;',
      'uniform sampler2D tG,tM,tH;uniform vec4 bM,bH;out vec4 o;',
      'const float PI=3.14159265;',
      'vec3 regional(sampler2D t,vec4 b,float lon,float lat,inout float w,vec2 dl,vec2 dt){vec2 uv=vec2((lon-b.x)/(b.z-b.x),(b.w-lat)/(b.w-b.y));',
      ' float e=min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y));w=smoothstep(0.,.04,e);',
      ' vec2 gx=vec2(dl.x/(b.z-b.x),-dt.x/(b.w-b.y)),gy=vec2(dl.y/(b.z-b.x),-dt.y/(b.w-b.y));return textureGrad(t,clamp(uv,0.,1.),gx,gy).rgb;}',
      'void main(){vec2 s=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uS;vec2 q=vec2(s.x-uC.x,uC.y-s.y)/uCam.z;float rho=length(q);',
      ' float px=(rho-1.)*uCam.z;if(px>1.5){float a=uAtm*exp(-px/12.)*.3;o=vec4(vec3(.62,.72,.74)*a,a)*uA;return;}float edge=clamp(.5-px/1.5+.5,0.,1.);if(rho>1.)q/=rho;rho=min(rho,1.);',
      ' float c=asin(rho),sc=sin(c),cc=cos(c),s0=sin(uCam.y),c0=cos(uCam.y);',
      ' float lat=asin(clamp(cc*s0+(rho>1e-9?q.y*sc*c0/rho:0.),-1.,1.));float lon=uCam.x+atan(q.x*sc,rho*c0*cc-q.y*s0*sc);',
      ' lon=mod(lon+PI,2.*PI)-PI;',
      ' float u1=fract(lon/(2.*PI)+.5),u2=fract(lon/(2.*PI)+1.);vec2 dl=vec2(dFdx(lon),dFdy(lon));if(abs(dl.x)>1.)dl.x=0.;if(abs(dl.y)>1.)dl.y=0.;vec2 dt=vec2(dFdx(lat),dFdy(lat));',
      ' vec3 col=textureGrad(tG,vec2(u1,.5-lat/PI),vec2(dl.x/(2.*PI),-dt.x/PI),vec2(dl.y/(2.*PI),-dt.y/PI)).rgb;',
      ' float wm,wh;vec3 m=regional(tM,bM,lon,lat,wm,dl,dt);col=mix(col,m,wm);vec3 h=regional(tH,bH,lon,lat,wh,dl,dt);col=mix(col,h,wh);',
      ' float sh=mix(1.,.5+.5*pow(cc,.55),uAtm);float rim=uAtm*smoothstep(.82,1.,rho)*.18;col=col*sh+vec3(.55,.66,.7)*rim;',
      ' float a2=uA*edge;o=vec4(col*a2,a2);}'].join('\n');
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    try { prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog)); } catch (e) { gl = null; return; }
    gl.useProgram(prog);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uRes', 'uS', 'uCam', 'uC', 'uA', 'uAtm', 'tG', 'tM', 'tH', 'bM', 'bH'].forEach(function (n) { uni[n] = gl.getUniformLocation(prog, n); });
    [['tex/earth-4096.jpg', 0, 'tG'], ['tex/asia-mid.jpg', 1, 'tM'], ['tex/thai-high.jpg', 2, 'tH']].forEach(function (d) {
      var img = new Image(); img.onload = function () {
        if (!gl) return; var t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + d[1]); gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img); gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, d[1] ? gl.CLAMP_TO_EDGE : gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        var ext = gl.getExtension('EXT_texture_filter_anisotropic'); if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 8);
        gl.uniform1i(uni[d[2]], d[1]); texOK++; };
      img.src = d[0]; });
    gl.uniform4f(uni.bM, 60 * D2R, -20 * D2R, 150 * D2R, 45 * D2R);
    gl.uniform4f(uni.bH, 92 * D2R, 4 * D2R, 112 * D2R, 24 * D2R);
    cgl.addEventListener('webglcontextlost', function (e) { e.preventDefault(); gl = null; });
  })();

  /* ---------------- canvas sizing ---------------- */
  var SC = 1;
  function size() {
    var st = document.getElementById('stage'), r = st.getBoundingClientRect(), k = r.width / SW || 1;
    var s = Math.max(.5, Math.min(2, k * (window.devicePixelRatio || 1)));
    if (Math.abs(s - SC) < .01 && c2.width === Math.round(SW * s)) return; SC = s;
    [cgl, c2].forEach(function (c) { c.width = Math.round(SW * s); c.height = Math.round(SH * s); });
  }
  window.addEventListener('resize', function () { setTimeout(size, 50); });

  /* ---------------- paper texture (made once) ---------------- */
  var paper = document.createElement('canvas'); paper.width = 960; paper.height = 540;
  (function () { var p = paper.getContext('2d'); p.fillStyle = '#EADFC7'; p.fillRect(0, 0, 960, 540);
    var id = p.getImageData(0, 0, 960, 540), d = id.data, s = 7;
    for (var i = 0; i < d.length; i += 4) { s = (s * 16807) % 2147483647; var n = (s / 2147483647 - .5) * 10; d[i] += n; d[i + 1] += n; d[i + 2] += n * .8; }
    p.putImageData(id, 0, 0);
    var g = p.createRadialGradient(480, 270, 120, 480, 270, 620); g.addColorStop(0, 'rgba(120,90,50,0)'); g.addColorStop(1, 'rgba(120,90,50,.22)'); p.fillStyle = g; p.fillRect(0, 0, 960, 540); })();
  var fields = document.createElement('canvas'); fields.width = 320; fields.height = 320;
  (function () { var f = fields.getContext('2d'), s = 11, cols = ['#CFCF9E', '#C4C892', '#D8D5A8', '#BCC28A', '#CACB97', '#D3CC98'];
    function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
    f.fillStyle = '#D6D2A2'; f.fillRect(0, 0, 320, 320);
    for (var y = 0; y < 320;) { var h = 22 + Math.round(rnd() * 3) * 6; if (y + h > 320) h = 320 - y;
      for (var x = 0; x < 320;) { var w = 30 + Math.round(rnd() * 5) * 10; if (x + w > 320) w = 320 - x; f.fillStyle = cols[Math.floor(rnd() * cols.length)]; f.fillRect(x, y, w, h);
        f.strokeStyle = 'rgba(120,125,80,.4)'; f.lineWidth = 1; f.strokeRect(x + .5, y + .5, w - 1, h - 1); x += w; }
      y += h; } })();
  var fieldPat = null;

  /* ---------------- drawing helpers ---------------- */
  function pathLL(pts, close, flat) {                          // returns projected points (visible side only) as [x,y] list; draws into ctx path
    var out = [], first = true;
    ctx.beginPath();
    for (var i = 0; i < pts.length; i += flat ? 2 : 1) {
      var q = flat ? P(pts[i], pts[i + 1]) : P(pts[i][0], pts[i][1]);
      if (q[2] < 0) { first = true; continue; }
      if (first) { ctx.moveTo(q[0], q[1]); first = false; } else ctx.lineTo(q[0], q[1]);
      out.push(q);
    }
    if (close) ctx.closePath();
    return out;
  }
  function polyLen(q) { var L = 0; for (var i = 1; i < q.length; i++) L += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]); return L; }
  function strokePart(pts, prog, style, width, dash) {         // draw a line progressively (prog 0..1)
    if (prog <= 0) return; var q = pathLL(pts, false); if (q.length < 2) return; var L = polyLen(q);
    ctx.strokeStyle = style; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (dash) { ctx.setLineDash(dash); ctx.lineDashOffset = 0; ctx.save(); ctx.beginPath(); partialPath(q, L * prog); ctx.stroke(); ctx.restore(); ctx.setLineDash([]); return; }
    if (prog < 1) { ctx.setLineDash([L * prog, L + 10]); }
    ctx.stroke(); ctx.setLineDash([]);
  }
  function partialPath(q, len) { var acc = 0; ctx.moveTo(q[0][0], q[0][1]); for (var i = 1; i < q.length; i++) { var s = Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]);
    if (acc + s >= len) { var f = (len - acc) / s; ctx.lineTo(q[i - 1][0] + (q[i][0] - q[i - 1][0]) * f, q[i - 1][1] + (q[i][1] - q[i - 1][1]) * f); return; } acc += s; ctx.lineTo(q[i][0], q[i][1]); } }
  function pointAt(q, f) { var L = polyLen(q), want = L * f, acc = 0; for (var i = 1; i < q.length; i++) { var s = Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]);
    if (acc + s >= want && s > 0) { var t = (want - acc) / s; return [q[i - 1][0] + (q[i][0] - q[i - 1][0]) * t, q[i - 1][1] + (q[i][1] - q[i - 1][1]) * t, Math.atan2(q[i][1] - q[i - 1][1], q[i][0] - q[i - 1][0])]; } acc += s; }
    var n = q.length - 1; return [q[n][0], q[n][1], 0]; }
  function inView(lon0, lat0, lon1, lat1) {                     // rough bbox test in projected space
    var a = P(lon0, lat0), b = P(lon1, lat1), c = P(lon0, lat1), d = P(lon1, lat0);
    var xs = [a[0], b[0], c[0], d[0]], ys = [a[1], b[1], c[1], d[1]];
    return Math.max.apply(0, xs) > -200 && Math.min.apply(0, xs) < SW + 200 && Math.max.apply(0, ys) > -200 && Math.min.apply(0, ys) < SH + 200;
  }
  function chedi(x, y, s, fill, stroke) {                        // small bell-shaped chedi glyph = the deck's pin
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.beginPath();
    ctx.moveTo(0, -22); ctx.lineTo(1.6, -12); ctx.bezierCurveTo(6, -11, 8.5, -6, 8.5, -1); ctx.lineTo(11, -1); ctx.lineTo(11, 2.5); ctx.lineTo(-11, 2.5); ctx.lineTo(-11, -1);
    ctx.lineTo(-8.5, -1); ctx.bezierCurveTo(-8.5, -6, -6, -11, -1.6, -12); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.lineWidth = 1.6 / s; ctx.strokeStyle = stroke; ctx.stroke(); } ctx.restore();
  }
  function pulse(x, y, col, t, k) { for (var j = 0; j < 2; j++) { var f = ((t * .45 + j * .5) % 1); ctx.beginPath(); ctx.arc(x, y, 10 + f * 34, 0, 7); ctx.strokeStyle = col.replace('A', String((1 - f) * .8 * k)); ctx.lineWidth = 2; ctx.stroke(); } }
  function ship(x, y, a, col) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.lineTo(6, 4); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill();
    ctx.rotate(-a); ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(0, -15); ctx.lineTo(8, -4); ctx.closePath(); ctx.fill(); ctx.restore(); }

  /* ---------------- the frame ---------------- */
  var t0 = T();
  function draw() {
    var t = T(); C = cam(t);
    var sat = getV('sat'), pap = getV('paper');
    // satellite
    if (gl && texOK >= 1) {
      gl.viewport(0, 0, cgl.width, cgl.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      if (sat > .002 && pap < .999) {
        gl.uniform2f(uni.uRes, cgl.width, cgl.height); gl.uniform1f(uni.uS, SC); gl.uniform3f(uni.uCam, C.lon * D2R, C.lat * D2R, C.R); gl.uniform2f(uni.uC, C.cx, C.cy);
        gl.uniform1f(uni.uA, sat); gl.uniform1f(uni.uAtm, Math.max(0, Math.min(1, (6000 - C.R) / 4000))); gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    }
    ctx.setTransform(SC, 0, 0, SC, 0, 0); ctx.clearRect(0, 0, SW, SH);
    if ((!gl || texOK < 1) && sat > .002) fallbackGlobe(sat);
    if (sat > .002) satOverlays(sat, t);
    if (pap > .002) paperLayer(pap, t);
    labels();
    valentijn();
  }
  function fallbackGlobe(a) {                                     // no WebGL2: a plain drawn globe
    ctx.save(); ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(C.cx, C.cy, C.R, 0, 7); ctx.fillStyle = '#18282B'; ctx.fill(); ctx.clip();
    ctx.fillStyle = '#5E6B45';
    var src = C.R > 1200 ? [].concat.apply([], Object.keys(G.asia).map(function (k) { return G.asia[k]; })) : G.world;
    src.forEach(function (r) { pathLL(r, true, true); ctx.fill(); }); ctx.restore();
  }
  function satOverlays(a, t) {
    var gr = getV('gr'), bd = getV('bd'), th = getV('th'), tp = getV('tp'), cr = getV('cr');
    ctx.save(); ctx.globalAlpha = a;
    if (gr > .01 && C.R < 3000) { ctx.strokeStyle = 'rgba(240,228,205,' + (.16 * gr) + ')'; ctx.lineWidth = 1;
      for (var la = -60; la <= 60; la += 30) { var pts = []; for (var lo = -180; lo <= 180; lo += 3) pts.push([lo, la]); pathLL(pts, false); ctx.stroke(); }
      for (lo = -180; lo < 180; lo += 30) { pts = []; for (la = -88; la <= 88; la += 3) pts.push([lo, la]); pathLL(pts, false); ctx.stroke(); } }
    if (bd > .01) { ctx.strokeStyle = 'rgba(244,234,214,' + (.42 * bd) + ')'; ctx.lineWidth = 1;
      if (C.R < 1100) G.world.forEach(function (r) { pathLL(r, true, true); ctx.stroke(); });
      else Object.keys(G.asia).forEach(function (k) { if (k === 'THA' && th > .5) return; G.asia[k].forEach(function (r) { pathLL(r, true, true); ctx.stroke(); }); }); }
    if (th > .01) {                                               // Thailand: everything else dims, the border draws itself in gold
      ctx.save(); ctx.beginPath(); ctx.rect(-10, -10, SW + 20, SH + 20);
      G.tha.forEach(function (r) { var first = true; for (var i = 0; i < r.length; i += 2) { var q = P(r[i], r[i + 1]); if (first) { ctx.moveTo(q[0], q[1]); first = false; } else ctx.lineTo(q[0], q[1]); } ctx.closePath(); });
      ctx.fillStyle = 'rgba(12,9,7,' + (.42 * th) + ')'; ctx.fill('evenodd'); ctx.restore();
      ctx.save(); ctx.globalAlpha = a * th; G.tha.forEach(function (r) { if (r.length > 200) { var pts = []; for (var i = 0; i < r.length; i += 2) pts.push([r[i], r[i + 1]]); pts.push(pts[0]); strokePart(pts, tp, '#E9B75A', 3); } }); ctx.restore();
    }
    if (cr > .01) { ctx.save(); ctx.globalAlpha = a; strokePart(RIV.cp.pts.slice(0, CP_SE_I + 6).concat(RIV.cp.pts.slice(CP_SE_I + 6)), cr, 'rgba(214,236,228,.95)', 2.6); ctx.restore(); }
    var pa = getV('pAyu'); if (pa > .01) { var q = P(AYU[0], AYU[1]); if (q[2] > 0) { pulse(q[0], q[1], 'rgba(240,184,78,A)', t, pa); ctx.globalAlpha = a * pa; ctx.beginPath(); ctx.arc(q[0], q[1], 8, 0, 7); ctx.fillStyle = '#F0B84E'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#FFF6E6'; ctx.stroke(); } }
    var pb = getV('pBkk'); if (pb > .01) { q = P(PINS.B[0], PINS.B[1]); ctx.globalAlpha = a * pb; ctx.beginPath(); ctx.arc(q[0], q[1], 5, 0, 7); ctx.fillStyle = '#FFF6E6'; ctx.fill(); }
    ctx.globalAlpha = a;
    // trade routes
    var re = getV('re'), rw = getV('rw'), ro = getV('ro');
    if (re > 0) route(ROUTES.east, re, '#EDBB5C', t, 0);
    if (rw > 0) { route(ROUTES.west, Math.min(1, rw * 1.6), '#E98E62', t, .2); var r2 = Math.max(0, rw * 1.6 - .6);
      if (r2 > 0) { route(ROUTES.india, Math.min(1, r2 * 1.5), '#E98E62', t, .4); route(ROUTES.persia, r2, '#E98E62', t, .1); route(ROUTES.europe, r2, '#E98E62', t, .7); } }
    if (ro > 0) { ctx.save(); strokePart(ROUTES.land, ro, 'rgba(250,240,220,.95)', 2.4, [2, 7]); strokePart(ROUTES.landsea, Math.max(0, ro * 2 - 1), 'rgba(250,240,220,.75)', 2.2, [2, 7]); ctx.restore(); }
    ctx.restore();
  }
  function route(pts, prog, col, t, ph) {
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 6; strokePart(pts, prog, col, 3.2); ctx.restore();
    if (prog >= .999) { var q = pathLL(pts, false); if (q.length < 2) return; for (var j = 0; j < 2; j++) { var f = (t * .035 + ph + j * .5) % 1, p = pointAt(q, f); ship(p[0], p[1] - 3, 0, '#FFF3DC'); } }
  }
  function riverBand(r, prog, a) {
    if (prog <= 0) return; var w = Math.max(r === RIV.cp ? 7 : 4, mpx(r.w));
    ctx.save(); ctx.globalAlpha = a; strokePart(r.pts, prog, '#5E8077', w + Math.max(2, w * .16)); strokePart(r.pts, prog, '#86A79D', w); ctx.restore();
  }
  function paperLayer(a, t) {
    ctx.save(); ctx.globalAlpha = a;
    ctx.drawImage(paper, 0, 0, SW, SH);
    var coast = getV('coast');
    if (coast > .01 && C.R < 3e5) {                               // sea + land at the scale of the Gulf
      ctx.save(); ctx.globalAlpha = a * coast; ctx.fillStyle = '#C9D3C7'; ctx.fillRect(0, 0, SW, SH);
      ctx.fillStyle = '#EADFC7'; ['THA', 'KHM', 'MMR', 'LAO', 'MYS'].forEach(function (k) { (G.asia[k] || []).forEach(function (r) { pathLL(r, true, true); ctx.fill(); }); });
      G.tha.forEach(function (r) { pathLL(r, true, true); ctx.fill(); });
      ctx.strokeStyle = 'rgba(70,95,90,.55)'; ctx.lineWidth = 1.4; G.tha.forEach(function (r) { pathLL(r, true, true); ctx.stroke(); }); ctx.restore();
    }
    var ic = P(C0[0], C0[1]), fl = getV('flood'), rc = getV('rice');
    if (rc > .01) { if (!fieldPat) fieldPat = ctx.createPattern(fields, 'repeat'); var k = C.R / 1.25e6;
      fieldPat.setTransform(new DOMMatrix().translate(ic[0], ic[1]).scale(Math.max(.2, k) * .8));
      ctx.save(); var rr = rc * 2000; var g = ctx.createRadialGradient(ic[0], ic[1], Math.max(0, rr - 260), ic[0], ic[1], rr + 1);
      ctx.globalAlpha = a * .62; ctx.beginPath(); ctx.arc(ic[0], ic[1], rr, 0, 7); ctx.clip(); ctx.fillStyle = fieldPat; ctx.fillRect(0, 0, SW, SH);
      ctx.globalAlpha = a; ctx.fillStyle = g; g.addColorStop(0, 'rgba(234,223,199,0)'); g.addColorStop(1, 'rgba(234,223,199,1)'); ctx.fillRect(0, 0, SW, SH); ctx.restore(); }
    if (fl > .01) { var R1 = fl * 2100; ctx.save(); var g2 = ctx.createRadialGradient(ic[0], ic[1], Math.max(0, R1 - 300), ic[0], ic[1], R1 + 1);
      g2.addColorStop(0, 'rgba(104,140,132,.62)'); g2.addColorStop(1, 'rgba(104,140,132,0)'); ctx.fillStyle = g2; ctx.fillRect(0, 0, SW, SH);
      ctx.strokeStyle = 'rgba(244,238,222,.5)'; ctx.lineWidth = 1.5;
      for (var j = 0; j < 4; j++) { var rr2 = ((t * 60 + j * 160) % 640) + 380; if (rr2 < R1 - 40) { ctx.globalAlpha = a * .5 * (1 - (rr2 - 380) / 640); ctx.beginPath(); ctx.ellipse(ic[0], ic[1], rr2 * 1.25, rr2 * .78, 0, 0, 7); ctx.stroke(); } }
      ctx.restore(); }
    // rivers, island, wall
    var isl = getV('isl'), wall = getV('wall'), dg = a * (1 - .94 * getV('val'));
    riverBand(RIV.cp, getV('rcp'), dg); riverBand(RIV.lb, getV('rlb'), dg); riverBand(RIV.ps, getV('rps'), dg);
    if (isl > .01) { ctx.save(); ctx.globalAlpha = dg * isl; pathLL(ISL, true); ctx.fillStyle = '#F3EBDA'; ctx.fill(); ctx.strokeStyle = 'rgba(120,90,60,.45)'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); }
    if (wall > .01) { ctx.save(); ctx.globalAlpha = a; var ip = ISL.concat([ISL[0]]); strokePart(ip, wall, '#A9472A', Math.max(2.5, mpx(28))); ctx.restore(); }
    var pal = getV('pal'); if (pal > .01) { ctx.save(); ctx.globalAlpha = a; var pp = PAL.concat([PAL[0]]); pathLL(pp, true); ctx.fillStyle = 'rgba(214,160,72,' + (.22 * pal) + ')'; ctx.fill(); strokePart(pp, pal, '#B5782E', 3); ctx.restore(); }
    // thonburi arrow (the capital moves downriver)
    var ta = getV('ta'); if (ta > .01) { ctx.save(); ctx.globalAlpha = a; var down = RIV.cp.pts.slice(CP_SE_I, RIV.cp.pts.length - 4);
      strokePart(down, ta, '#A9472A', 4); var q2 = pathLL(down, false); if (ta > .98 && q2.length > 1) { var e = q2[q2.length - 1]; ctx.beginPath(); ctx.arc(e[0], e[1], 7, 0, 7); ctx.fillStyle = '#A9472A'; ctx.fill(); } ctx.restore(); }
    // boat sailing upriver from the Gulf
    var bt = getV('boat'); if (bt > .01) { var up = RIV.cp.pts.slice(CP_SE_I).reverse(), q3 = pathLL(up, false); if (q3.length > 1) { var f3 = getV('boatP'), p3 = pointAt(q3, f3);
      ctx.save(); ctx.globalAlpha = a * bt; ctx.translate(p3[0], p3[1]); ctx.scale(1.5, 1.5); ctx.translate(-p3[0], -p3[1]); ship(p3[0], p3[1], 0, '#5A3A22'); ctx.restore(); } }
    // pins
    [['pinS', PINS.S], ['pinM', PINS.M], ['pinC', PINS.C], ['pinA', PINS.A], ['pinT', PINS.T]].forEach(function (d) {
      var v = getV(d[0]); if (v < .01) return; var q = P(d[1][0], d[1][1]);
      pulse(q[0], q[1] - 8, 'rgba(169,71,42,A)', t, v); ctx.save(); ctx.globalAlpha = a * v; chedi(q[0], q[1], 1.25, '#A9472A', '#F6EEDC'); ctx.restore(); });
    // scale bar + north arrow (true to the drawing scale)
    var sb = getV('sb'); if (sb > .01) { var km = mpx(1000), x0 = 1640, y0 = 1000, nx = x0 - km - 60; ctx.save(); ctx.globalAlpha = a * sb; ctx.fillStyle = '#2A2018'; ctx.strokeStyle = '#2A2018'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0 - km, y0); ctx.lineTo(x0, y0); ctx.moveTo(x0 - km, y0 - 8); ctx.lineTo(x0 - km, y0 + 8); ctx.moveTo(x0, y0 - 8); ctx.lineTo(x0, y0 + 8); ctx.stroke();
      ctx.font = '600 22px Anuphan, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('1 กม.', x0 - km / 2, y0 - 16);
      ctx.beginPath(); ctx.moveTo(nx, y0 - 46); ctx.lineTo(nx + 10, y0 - 16); ctx.lineTo(nx, y0 - 22); ctx.lineTo(nx - 10, y0 - 16); ctx.closePath(); ctx.fill();
      ctx.fillText('เหนือ', nx, y0 + 12); ctx.restore(); }
    ctx.restore();
  }

  /* ---------------- HTML labels: they stick to the ground; shown only after a move has landed ---------------- */
  var LAB = {};
  function defLabel(id, ll, text, cls, dx, dy, anchor) {
    var el = document.createElement('div'); el.className = 'ml ' + (cls || ''); el.textContent = text; lab.appendChild(el);
    LAB[id] = { el: el, ll: ll, dx: dx || 0, dy: dy || 0, ax: anchor === 'r' ? -100 : anchor === 'c' ? -50 : 0 };
  }
  M.label = defLabel;
  function labels() {
    for (var id in LAB) { var L = LAB[id]; if (!L.on && !L.el.classList.contains('on')) continue; var q = P(L.ll[0], L.ll[1]);
      L.el.style.transform = 'translate3d(' + (q[0] + L.dx).toFixed(1) + 'px,' + (q[1] + L.dy).toFixed(1) + 'px,0) translate(' + L.ax + '%,-50%)';
      L.el.classList.toggle('bk', q[2] < .05); }
  }
  function valentijn() {
    var a = getV('val'); vimg.style.opacity = a.toFixed(3); if (a < .002) return;
    var xs = ISL.map(function (p) { return P(p[0], p[1]); }), x0 = Math.min.apply(0, xs.map(function (q) { return q[0]; })), x1 = Math.max.apply(0, xs.map(function (q) { return q[0]; })),
        y0 = Math.min.apply(0, xs.map(function (q) { return q[1]; })), y1 = Math.max.apply(0, xs.map(function (q) { return q[1]; }));
    var s = (x1 - x0) / 1843;                                    // the island spans 1843 px of the 2560 px map scan, centred at (1306, 929)
    vimg.style.transform = 'translate(' + ((x0 + x1) / 2 - 1306 * s).toFixed(1) + 'px,' + ((y0 + y1) / 2 - 929 * s).toFixed(1) + 'px) scale(' + s.toFixed(4) + ')';
  }

  /* ---------------- shots ---------------- */
  var ALPHA = ['sat', 'paper', 'gr', 'bd', 'th', 'cr', 'pAyu', 'pBkk', 'coast', 'flood', 'rice', 'isl', 'val', 'boat', 'pinS', 'pinM', 'pinC', 'pinA', 'pinT', 'sb', 'pal'];
  var PROG = ['tp', 'rcp', 'rlb', 'rps', 'wall', 're', 'rw', 'ro', 'ta', 'boatP'];
  var cur = null, clipNow = null;
  function M(shot, instant) {
    if (!shot) return; size();
    var dur = instant || RM() ? 0 : (shot.dur == null ? 1.6 : shot.dur);
    // camera
    var to = shot.cam ? clone(shot.cam) : clone(base);
    if (shot.from && dur > 0) { base = clone(shot.from); fl = null; }
    var from = shot.from && dur > 0 ? clone(shot.from) : cam(T());
    var same = Math.abs(to.lon - base.lon) < 1e-7 && Math.abs(to.lat - base.lat) < 1e-7 && Math.abs(to.R / base.R - 1) < 1e-6 && to.cx === base.cx && to.cy === base.cy;
    if (!same || shot.from) { base = to; fl = dur > 0 ? { t0: T(), d: dur, f: zoomI(from, to) } : null; setV('idle', 0, 0, 0); setV('idle', 1, dur, 2.5); }
    idleMode = shot.idle || 'breathe';
    // layers
    var Ls = shot.L || {};
    ALPHA.forEach(function (k) { var v = Ls[k]; if (v == null) { setV(k, 0, 0, .6); return; } if (typeof v === 'number') setV(k, v, 0, .8); else setV(k, v[0], v[1], v[2]); });
    PROG.forEach(function (k) { var v = Ls[k], c = getV(k);
      if (v == null) { if (c > 0) setV(k, 0, 1.1, 0); return; }
      if (typeof v === 'number') { if (v < c) setV(k, v, 0, 0); else if (v > c) setV(k, v, dur, 1.2); return; }
      if (v[0] < c && v[3] !== 1) setV(k, v[0], 0, 0); else setV(k, v[0], v[1], v[2]); });
    // labels
    var want = {}; (shot.lab || []).forEach(function (l) { if (typeof l === 'string') want[l] = dur * .92 + .1; else want[l[0]] = l[1]; });
    for (var id in LAB) { var L = LAB[id], on = id in want; L.on = on;
      L.el.style.transitionDelay = on && !RM() ? want[id] + 's' : '0s'; L.el.classList.toggle('on', on); }
    // container: clip circle (full or a locator), opacity, tilt
    var cl = shot.clip || 'full', c = cl === 'full' ? { x: 960, y: 540, r: 2300 } : cl;
    box.style.clipPath = 'circle(' + c.r + 'px at ' + c.x + 'px ' + c.y + 'px)';
    var op = shot.op == null ? 1 : shot.op;
    if (typeof op === 'number') op = [op, 0, .8];
    ring.style.left = (c.x - c.r) + 'px'; ring.style.top = (c.y - c.r) + 'px'; ring.style.width = 2 * c.r + 'px'; ring.style.height = 2 * c.r + 'px';
    ring.style.opacity = cl === 'full' ? 0 : op[0];
    ring.style.transitionDelay = RM() ? '0s' : '0s,0s,0s,0s,' + (cl === 'full' ? 0 : op[1]) + 's';
    box.style.transition = RM() ? 'none' : 'clip-path ' + (shot.clipDur || 1.3) + 's cubic-bezier(.45,0,.2,1), opacity ' + op[2] + 's ease ' + op[1] + 's, transform ' + (op[2] + .3) + 's cubic-bezier(.45,0,.2,1) ' + op[1] + 's';
    box.style.opacity = op[0]; box.style.transform = shot.tilt ? 'perspective(1600px) rotateX(48deg) scale(1.15) translateY(-60px)' : 'none';
    cur = shot;
  }
  M.state = function () { return { cam: clone(C), base: clone(base), flying: !!fl, gl: !!gl, tex: texOK }; };
  M.size = size;
  window.MAP = M;

  // labels used by the deck
  defLabel('sea', [111.5, 10.5], 'เอเชียตะวันออกเฉียงใต้', 'sat big c', 0, 0, 'c');
  defLabel('ayu', AYU, 'อยุธยา', 'sat pin', 24, -18);
  defLabel('tha', [102.6, 15.7], 'ประเทศไทย', 'sat big', 0, 0, 'c');
  defLabel('gulf', [101.25, 11.4], 'อ่าวไทย', 'sat sea', 0, 0, 'c');
  defLabel('bkk', PINS.B, 'กรุงเทพฯ', 'sat small', 16, 10);
  defLabel('cpr', [100.24, 15.15], 'แม่น้ำเจ้าพระยา', 'sat small', -14, 0, 'r');
  defLabel('l-cp', [100.5615, 14.3395], 'แม่น้ำเจ้าพระยา', 'paper', 0, 0, 'c');
  defLabel('l-lb', [100.5545, 14.3668], 'แม่น้ำลพบุรี', 'paper', 0, 0, 'c');
  defLabel('l-ps', [100.5838, 14.3545], 'แม่น้ำป่าสัก', 'paper', 0, 0, 'l');
  defLabel('l-isl', [100.5625, 14.3532], 'เกาะเมือง', 'paper isl', 0, 0, 'c');
  defLabel('l-ayu', AYU, 'อยุธยา', 'paper', 30, -6);
  defLabel('l-gulf', [100.75, 13.40], 'อ่าวไทย', 'paper sea', 0, 0, 'c');
  defLabel('l-mouth', MOUTH, 'ปากแม่น้ำ', 'paper small', 22, 4);
  defLabel('s-ayu', AYU, 'อยุธยา', 'paper small', 16, -4);
  defLabel('s-thon', PINS.T, 'ธนบุรี', 'paper small', 16, 4);
  defLabel('r-ayu', AYU, 'อยุธยา', 'sat pin', 0, -46, 'c');
  defLabel('r-cn', [113.3, 23.3], 'จีน', 'sat', 0, -26, 'c');
  defLabel('r-jp', [130.2, 33.0], 'ญี่ปุ่น', 'sat', 18, -4);
  defLabel('r-in', [79.3, 15.2], 'อินเดีย', 'sat', 0, -16, 'c');
  defLabel('r-pe', [56.6, 27.6], 'เปอร์เซีย', 'sat', 0, -24, 'c');
  defLabel('r-eu', [34, -27], 'สู่ยุโรป', 'sat', 0, 0, 'c');
  defLabel('r-me', [98.6, 12.44], 'มะริด', 'sat small', -14, 6, 'r');
  defLabel('q-moat', [100.5600, 14.3705], 'คูเมือง: ป้องกันข้าศึก', 'paper role', 0, 0, 'c');
  defLabel('q-sea', [100.5815, 14.333], 'ทางเรือออกทะเล: ค้าขาย', 'paper role', -30, 0, 'r');
  defLabel('q-rice', [100.548, 14.3330], 'ที่ราบลุ่ม: ปลูกข้าว', 'paper role', 0, 0, 'c');

  function loop() { try { draw(); } catch (e) { if (!loop.err) { loop.err = 1; console.warn(e); } } requestAnimationFrame(loop); }
  size(); requestAnimationFrame(loop);
})();
