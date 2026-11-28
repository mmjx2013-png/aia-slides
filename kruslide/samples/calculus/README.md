# แคลคูลัส ม.6: ตัวอย่างบทเรียน KruSlide (8 สไลด์)

A sample lesson deck that shows a hard topic taught live, with interactive graphs. Open `index.html` (it works offline from a USB stick). No narration: the presenter talks.

**Controls:** → or PageDown (clicker) = next beat · ← or PageUp = back · P = pen (auto-shapes) · F = full screen · Home / End.
Clicking, tapping or dragging on a slide never changes the slide. The control bar appears when the mouse moves.

**Colour has one meaning on every slide:** blue = the function f · red-orange = slope (derivative) · yellow = area (integral) · pink = the moving point Q and h · green = correct.

## The slides (what to say, what to do)

| # | Slide | What it shows | Beats (→) and interactions |
|---|---|---|---|
| 1 | **Title: "ความเร็ว ณ ขณะหนึ่ง คืออะไร?"** | A car speeds up along a road. Its speedometer needle rises in step with it. Pink dots mark where the car was every 0.4 s, and the gaps between them grow because the car is speeding up. | **→1** freezes time with a "ขณะนี้" pin. A card shows the problem: speed = distance ÷ time, but at one instant you get 0 m ÷ 0 s = ?. The dashboard still reads a speed. How? |
| 2 | **Secant → tangent** (y = x², P = (1, 1)) | The secant through P and Q, the rise/run triangle (h and the rise), and live readouts: h, the fraction (f(1+h) − f(1))/h with the real numbers, and its slope = 2 + h in big type. | **Drag anywhere on the graph** (mouse or finger). Q follows along the curve on either side of P, and the tangent fades in as Q gets close. **→1** Q glides towards P by itself, and a table fills in: h = 1, 0.5, 0.1, 0.01, 0.001 gives slopes 3, 2.5, 2.1, 2.01, 2.001. The secant turns into the red tangent. **→2** the definition: f′(1) = lim (2 + h) = 2. |
| 3 | **The derivative is the slope at every point** | f(x) = x³ − 3x on top. Underneath is its slope function f′(x) = 3x² − 3. One dashed cursor runs through both graphs. At the cursor you see the tangent on f, a red dot at height f′(x), the value, an arrow tilted like the tangent, and "uphill / downhill / flat". | **Drag left–right** anywhere on the panel. Dragging paints the f′ graph as you go. **→1** the cursor sweeps across and draws the whole red graph. **→2** the peak (−1, 2) and the valley (1, −2) have slope 0, and green lines link them to where f′ crosses zero. |
| 4 | **Power rule** d/dx xⁿ = n·xⁿ⁻¹ | The exponent physically **hops** down to the front, leaving a dashed trail ("ลงมาคูณ"), and "−1" pops into the new exponent. The examples x² → 2x, x³ → 3x², x⁴ → 4x³ hop one after another. | **→1** term by term: d/dx x³ = 3x² (it hops), and d/dx 3x = 3. **→2** f′(x) = 3x² − 3, with its red graph (the one from slide 3). **→3** check: f′(1) = 3 − 3 = 0, and a dot slides into the valley where the tangent is flat. |
| 5 | **Area under the curve** (y = x² on [0, 2]) | Rectangles of width 2/n, as tall as the curve at their right edge. The pink striped parts are where they stick out above the curve. The readouts count live: n, the sum, and how much it is over the true area. | **Drag the slider anywhere on its band** (or tap − / +) for n = 2 … 50. The sum is 5.000 at n = 2, 3.750 at n = 4 and 2.747 at n = 50. **→1** n plays from 2 to 50 by itself. **→2** n → ∞: the rectangles melt into the exact area, the sum counts to 2.667, and the card shows ∫₀² x² dx = 8/3 ≈ 2.667. |
| 6 | **Fundamental theorem in one picture** | Left: f(x) = x² with the yellow area from 0 to x. Right: F(x) = x³/3, which is that area, traced as x moves. A cycle in the middle: "สะสมพื้นที่ ∫" goes right, "หาความชัน d/dx" comes back. | Opens by sweeping x from 0 to 1.2. **Drag on either graph** to move x. The yellow numbers stay equal: the area under f = the height of F. **→1** (red) the slope of F = the height of f (1.440 = 1.440 at x = 1.2). **→2** x goes to 2: ∫₀² x² dx = F(2) − F(0) = 8/3, the same number as slide 5, with one subtraction. |
| 7 | **Quick check** (students answer on the screen) | Q1: f(x) = x⁴, f′(2) = ? Tap a choice: a wrong one shakes red, the right one turns green. Q2: ∫₀³ x² dx = ? Type it, then tap ตรวจคำตอบ (Check) or press Enter. "9" and "27/3" are both accepted. ดูเฉลย / เริ่มใหม่ = Show answer / Reset. | **→1** reveals Q1: x⁴ → 4x³ (the 4 hops), then 4 · 2³ = 32. The distractors are 16 = f(2), 8 = 4·2 and 64 = 4·2⁴. **→2** reveals Q2: F(3) − F(0) = 27/3 = 9, while the yellow area fills and 9 counts up. |
| 8 | **Summary: "คำตอบอยู่บนหน้าปัดรถ"** | It answers slide 1's question on a dashboard, during a 15-minute drive shown in 7 s. The speedometer is the slope (red tangent) of the distance graph s(t), which is the derivative. The odometer is the yellow area under the speed graph v(t), which is the integral. | **→1** three take-aways: derivative = the limit of secant slopes; integral = the limit of rectangle sums; the two undo each other (the fundamental theorem). |

All maths was checked and is shown exactly. On slide 2, h has 3 decimals, so the rise 2h + h² and the slope 2 + h shown are exact. Slide 5 uses Σ = 4(n+1)(2n+1)/(3n²). Slide 8 uses v(t) = 40(1 − cos 2πt/15) km/h, so the total distance is 10 km. Speaker notes for each slide are in `<aside class="notes">` in `src/parts/`.

## Files
- `index.html`: the built deck. All CSS and JS are inlined, with a strict CSP: no external requests, and the fonts come from `fonts/`.
- `fonts/`: Anuphan (Thai) and Inter, self-hosted, with their licences.
- `src/parts/0N-*.html`: one slide each. `src/style.css` is the look ("bright graph paper": ink-outlined stickers, flat colour blocks). `src/slides.css` holds the per-slide styles. `src/calc.js` holds the live maths: graphs, drags and beat-driven animation.
- `src/engine.js` and `src/tools.js` are copies of `teacher-slides/unit4` with Thai labels and this deck's colours. They provide the beats, the arrow-keys-only navigation, the pen with auto-shapes, the tap-a-choice tool and the typed answer with Check.
- `screenshots/`: four 1920×1080 stills for sharing (title, secant drag, Riemann n = 50, fundamental theorem).
- Rebuild after editing: `python3 build.py`.

## QA done
- Every beat was screenshot at 1920×1080, both in final-state mode (`?still`) and with real timing, and every image was looked at. The checks found no overlapping text, no text outside the stage and no clipped panels, with no console errors and no external requests.
- Drags with mouse and touch were tested across the full width of each graph and slider, at 1920×1080, 1280×720, 1024×768 and 844×390. Each covers its full range and never changes the slide.
- Also tested: the pen draws over a graph without moving it, a clicker's PageUp/PageDown works, and → still works after tapping buttons or pressing Enter in the answer box.
- The deck was walked forward and back with prefers-reduced-motion both on and off.
- Not tested: Safari/WebKit (it is not installed here). The slide 6 dots use CSS `offset-path`, which needs Safari 16 or later.
