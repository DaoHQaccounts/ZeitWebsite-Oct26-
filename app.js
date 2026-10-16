/* Zeit Health — website v3.
   Motion numbers come from the app (zeit-mvp/src/motion.js): the rail spring, the off-centre
   scale/opacity/drop, the -30px tuck, the press, the sheet rise and the greeting's blur-in.
   New for v3: the hero answers the scroll, the cards arrive as a stacked deck that fans out
   into the rail while the section is pinned, and the rail tilts in 3D under a drag.
   Plain JS; no framework, no build step. */

;(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ---- Sign-up endpoint ------------------------------------------------------------------
  // Paste a form endpoint here (Formspree, Supabase function, Mailchimp, etc.). It receives a
  // JSON POST: { email, source }. Left empty, the form validates and thanks the visitor, but
  // NOTHING IS SAVED. Wire this before launch.
  const OPTIN_ENDPOINT = ''

  // ---- Springs (app: src/motion.js, named by job) ----------------------------------------
  const SPRING = { k: 380, c: 34, m: 1 }      // the rail's own move
  const SETTLE = { k: 320, c: 36, m: 1 }      // springSoft: arrivals
  const PRESS = { k: 500, c: 30, m: 1 }       // springPress
  const RISE = { k: 480, c: 44, m: 0.9 }      // springSheet: the sheet rise
  const CARD = { off: 0.88, offOpacity: 0.55, offDrop: 6, gap: -30, sweep: 3.1, press: 0.97, pressOff: 0.84 }
  const STAGGER = { greeting: 0.07, rail: 0.05 }
  const ENTER = { y: 14, blur: 6 }, ENTER_RAIL = { y: 26 }

  class Spring {
    constructor(value, cfg = SETTLE) { this.x = value; this.v = 0; this.to = value; this.cfg = cfg }
    set(to, delay = 0) {
      clearTimeout(this.t)
      if (reduce) { this.jump(to); return }
      if (delay > 0) this.t = setTimeout(() => { this.to = to; loop.wake() }, delay * 1000)
      else this.to = to
    }
    jump(to) { clearTimeout(this.t); this.x = to; this.to = to; this.v = 0 }
    step(dt) {
      const { k, c, m } = this.cfg
      this.v += ((-k * (this.x - this.to) - c * this.v) / m) * dt
      this.x += this.v * dt
    }
    get rest() { return Math.abs(this.x - this.to) < 0.005 && Math.abs(this.v) < 0.01 }
  }

  // one animation loop for the page; it sleeps when every spring is at rest
  const loop = (() => {
    const jobs = new Set()
    let raf = 0, last = 0
    function frame(t) {
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016)
      last = t
      let busy = false
      jobs.forEach((job) => { if (job(dt)) busy = true })
      raf = busy ? requestAnimationFrame(frame) : 0
    }
    return {
      add(job) { jobs.add(job); this.wake() },
      wake() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame) } },
    }
  })()

  function stepAll(springs, dt) {
    let busy = false
    const sub = 4, h = dt / sub
    for (const s of springs) {
      if (s.rest) { s.x = s.to; s.v = 0; continue }
      for (let i = 0; i < sub; i++) s.step(h)
      busy = true
    }
    return busy
  }
  const clamp01 = (v) => Math.max(0, Math.min(1, v))

  // ---- The living orb -------------------------------------------------------------------
  // One renderer for every orb on the page. The body is a soft blob whose edge is a sum of
  // slow sine waves, so it never repeats and never sits still. Inside, a deep-blue current
  // and a white light drift on their own orbits. It breathes at rest; `energy` makes it
  // move more, `level` swells it like a voice (listening to you, or speaking back), and
  // `poke()` gives it the small startled squish of being touched.
  // The colours it turns through, from the card system: each is [deep, mid, light].
  const ORB_HUES = [
    ['#e8a52a', '#f5c94f', '#fbe7a0'],   // yellow
    ['#2f9c72', '#5fc493', '#bfe9cf'],   // green
    ['#2a43d2', '#5f7fee', '#b9cdfb'],   // blue
    ['#e47a2c', '#f39c5c', '#f9c89e'],   // orange
    ['#d9497a', '#ee8cad', '#f8c8d8'],   // pink
    ['#7a4ad8', '#a983ee', '#dac7fb'],   // purple
    ['#2a43d2', '#5f7fee', '#b9cdfb'],   // blue
  ]
  // Blends travel around the colour wheel (HSL, shortest way round), never straight across
  // it: blue to yellow passes through violet and pink instead of going muddy olive.
  function hexHsl(h) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2
    let hu = 0
    if (d) hu = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
    return [(hu * 60 + 360) % 360, d ? d / (1 - Math.abs(2 * l - 1)) : 0, l]
  }
  const ORB_HSL = ORB_HUES.map((set) => set.map(hexHsl))
  // a colour at any point of the cycle, eased between neighbours so the shift never jumps
  function hueAt(p, k, a = 1) {
    const n = ORB_HSL.length, x = ((p % n) + n) % n, i = Math.floor(x), f = x - i
    const e = f * f * (3 - 2 * f), A = ORB_HSL[i][k], B = ORB_HSL[(i + 1) % n][k]
    let dh = B[0] - A[0]; if (dh > 180) dh -= 360; if (dh < -180) dh += 360
    const h = (A[0] + dh * e + 360) % 360
    return `hsla(${h.toFixed(1)},${((A[1] + (B[1] - A[1]) * e) * 100).toFixed(1)}%,${((A[2] + (B[2] - A[2]) * e) * 100).toFixed(1)}%,${a})`
  }

  const ORBS = []
  class LiveOrb {
    constructor(canvas) {
      this.c = canvas
      this.g = canvas.getContext('2d')
      const res = +canvas.dataset.res || 160
      this.c.width = this.c.height = res
      this.r = res / 2
      this.seed = Math.random() * 100
      this.energy = new Spring(0.18, SETTLE)
      this.level = new Spring(0, { k: 260, c: 18, m: 1 })   // bouncy, like a voice meter
      this.squish = new Spring(1, { k: 520, c: 16, m: 1 })  // a touch wobbles it
      this.look = { x: new Spring(0, SETTLE), y: new Spring(0, SETTLE) }
      this.visible = true
      // only the hero orb turns through colours; the phone keeps the app's own blue orb
      this.multi = canvas.dataset.orb === 'hero'
    }
    set(energy) { this.energy.set(energy) }
    pulse(v) { this.level.v += v * 9; this.level.set(0) }
    poke() { this.squish.x = 0.9; this.squish.v = -1.5; this.squish.set(1); this.pulse(0.5) }
    gaze(x, y) { this.look.x.set(x); this.look.y.set(y) }
    springs() { return [this.energy, this.level, this.squish, this.look.x, this.look.y] }
    edge(t, k, amp, spd) {
      // the outline: radius at each angle, from a few slow waves
      const pts = [], N = 72, s = this.seed
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2
        const w = Math.sin(2 * a + t * 0.9 * spd + s) * 0.55 +
                  Math.sin(3 * a - t * 1.3 * spd + s * 2) * 0.3 +
                  Math.sin(5 * a + t * 2.1 * spd + s * 3) * 0.15
        pts.push(a, k * (1 + amp * w))
      }
      return pts
    }
    blob(cx, cy, pts, fill) {
      const g = this.g
      g.beginPath()
      for (let i = 0; i < pts.length; i += 2) {
        const x = cx + Math.cos(pts[i]) * pts[i + 1], y = cy + Math.sin(pts[i]) * pts[i + 1]
        i ? g.lineTo(x, y) : g.moveTo(x, y)
      }
      g.closePath(); g.fillStyle = fill; g.fill()
    }
    draw(t) {
      const g = this.g, R = this.r, e = this.energy.x, lv = Math.max(0, this.level.x)
      g.clearRect(0, 0, R * 2, R * 2)
      const breathe = 1 + Math.sin(t * 1.25 + this.seed) * 0.022
      const size = R * 0.8 * breathe * (1 + lv * 0.16) * this.squish.x
      const amp = 0.035 + e * 0.07 + lv * 0.08
      const spd = 0.5 + e * 1.6 + lv * 1.2
      const lx = this.look.x.x * R * 0.06, ly = this.look.y.x * R * 0.06
      const cx = R + lx + Math.sin(t * 0.37 + this.seed) * R * 0.025
      const cy = R + ly + Math.cos(t * 0.29 + this.seed) * R * 0.025

      // colour: the orb turns through the palette, and the far side of the body is already
      // on the next colour, so two hues are always melting into each other
      const p = t * (0.28 + e * 0.12) + this.seed * 0.07
      const turn = t * 0.35 + this.seed
      const ux = Math.cos(turn) * size, uy = Math.sin(turn) * size

      // body: lit side to shaded side, the light direction slowly turning with it
      let gr = g.createLinearGradient(cx - ux, cy - uy, cx + ux, cy + uy)
      if (this.multi) {
        for (let j = 0; j <= 4; j++) {
          const q = j / 4
          gr.addColorStop(q, hueAt(p + q * 0.9, q < 0.5 ? 0 : q < 0.9 ? 1 : 2))
        }
      } else if (this.tone === 'rec') {
        gr.addColorStop(0, '#d8463f'); gr.addColorStop(0.55, '#ec7b6e'); gr.addColorStop(1, '#f7c3b8')
      } else {
        gr.addColorStop(0, '#2a43d2'); gr.addColorStop(0.55, '#5f7fee'); gr.addColorStop(1, '#b9cdfb')
      }
      this.blob(cx, cy, this.edge(t, size, amp, spd), gr)

      // the current: a deeper tone of the colour that is coming next, circling inside
      const ca = t * (0.35 + e * 0.6) + this.seed
      const dx = cx + Math.cos(ca) * size * 0.28, dy = cy + Math.sin(ca) * size * 0.24
      gr = g.createRadialGradient(dx, dy, 0, dx, dy, size * 0.62)
      if (this.multi) { gr.addColorStop(0, hueAt(p + 1.3, 0, 0.8)); gr.addColorStop(1, hueAt(p + 1.3, 0, 0)) }
      else if (this.tone === 'rec') { gr.addColorStop(0, 'rgba(170, 40, 40, .55)'); gr.addColorStop(1, 'rgba(170, 40, 40, 0)') }
      else { gr.addColorStop(0, 'rgba(24, 38, 150, .85)'); gr.addColorStop(1, 'rgba(24, 38, 150, 0)') }
      this.blob(dx, dy, this.edge(t * 1.3 + 7, size * 0.6, amp * 1.4, spd), gr)

      // the light: a soft white that drifts against the current
      const la = -t * (0.27 + e * 0.4) + this.seed * 2
      const hx = cx - size * 0.28 + Math.cos(la) * size * 0.16, hy = cy - size * 0.3 + Math.sin(la) * size * 0.14
      gr = g.createRadialGradient(hx, hy, 0, hx, hy, size * 0.55)
      gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.45, 'rgba(232,239,254,.6)'); gr.addColorStop(1, 'rgba(232,239,254,0)')
      this.blob(hx, hy, this.edge(t * 0.8 + 3, size * 0.5, amp * 1.2, spd), gr)
    }
  }
  document.querySelectorAll('canvas[data-orb]').forEach((cv) => {
    const o = new LiveOrb(cv)
    ORBS.push(o); ORBS[cv.dataset.orb] = o
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { o.visible = es[0].isIntersecting; loop.wake() }).observe(cv)
  })
  const orbT0 = performance.now()
  loop.add((dt) => {
    const t = (performance.now() - orbT0) / 1000
    let any = false
    for (const o of ORBS) {
      if (!o.visible) continue
      stepAll(o.springs(), dt)
      o.draw(reduce ? 0 : t)
      any = true
    }
    return any && !reduce   // alive: keep drawing while any orb is on screen
  })

  // ---- Charts (small SVGs, drawn in the CI's thin-line style) ----------------------------
  const pulsePath = () => {
    let d = 'M0 30', x = 0
    for (let b = 0; b < 5; b++) {
      d += ` L${x + 14} 30 L${x + 17} 26 L${x + 20} 30 L${x + 24} 30 L${x + 27} 8 L${x + 31} 40 L${x + 34} 30`
      x += 40
    }
    return d
  }
  const VIZ = {
    pulse: (big) => `<svg viewBox="0 0 200 46" aria-hidden="true"><path class="draw" d="${pulsePath()}" fill="none" stroke="#3550d8" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round"/></svg>`,
    sleep: (big) => {
      const lv = [1, 2, 3, 2, 3, 1, 0, 2, 3, 2, 1, 2, 3, 3, 1, 0, 2, 1], w = 200 / lv.length
      let d = `M0 ${8 + lv[0] * 10}`
      lv.forEach((l, i) => { d += ` H${(i * w).toFixed(1)} V${8 + l * 10} H${((i + 1) * w).toFixed(1)}` })
      const rem = lv.map((l, i) => l === 0 ? `<rect class="pop" style="--i:${i}" x="${(i * w + 1).toFixed(1)}" y="6" width="${(w - 2).toFixed(1)}" height="4" rx="2" fill="#f19a5a"/>` : '').join('')
      return `<svg viewBox="0 0 200 46" aria-hidden="true"><g stroke="#efe8f7" stroke-width=".75">${[8, 18, 28, 38].map((y) => `<line x1="0" x2="200" y1="${y}" y2="${y}"/>`).join('')}</g><path class="draw" d="${d}" fill="none" stroke="#c77fe6" stroke-width="1.25"/>${rem}</svg>`
    },
    bars: (vals, color, big) => {
      const max = Math.max(...vals), w = 200 / vals.length
      return `<svg viewBox="0 0 200 46" aria-hidden="true">${vals.map((v, i) => {
        const h = Math.max(3, (v / max) * 40)
        return `<rect class="pop" style="--i:${i}" x="${(i * w + w * 0.18).toFixed(1)}" y="${(44 - h).toFixed(1)}" width="${(w * 0.64).toFixed(1)}" height="${h.toFixed(1)}" rx="${big ? 3 : 2}" fill="${color}" opacity="${i === vals.length - 1 ? 1 : 0.45}"/>`
      }).join('')}</svg>`
    },
  }

  // ---- The cards (CI: colour field + white data half) ------------------------------------
  // Sample values only. They are labelled as sample data under the rail and in every sheet.
  const CARDS = [
    {
      id: 'pulse', title: 'Pulse · Monthly series', year: '2024', pill: 'Pulse · 72 bpm',
      g: 'linear-gradient(100deg, #2f48d4 0%, #5876ea 50%, #a8c1fa 100%)',
      label: 'Camera · 12 months', num: 61, unit: 'bpm', tag: 'SIGNAL · GOOD',
      viz: () => VIZ.pulse(), sub: 'Avg 61 bpm · Range 57–66',
      idx: '07', code: 'SCN · 2024',
      rows: [['Resting average', '61 bpm'], ['Range', '57–66 bpm'], ['Readings', '12 months'], ['Source', 'Phone camera']],
      plain: 'Your resting pulse has been steady all year and sits in a normal range for adults.',
    },
    {
      id: 'hba1c', title: 'HbA1c', year: '2023', pill: 'Blood result',
      g: 'linear-gradient(160deg, #ee9a4c 0%, #f4835f 55%, #f8b98c 100%)',
      label: 'Metabolic panel', num: 5.4, dec: 1, unit: '%',
      track: [['HbA1c 5.4 %', 62, '#e2456b'], ['Ref < 5.7 %', 66, '#f39a3c'], ['Watch: small rise', 58, '#f39a3c']],
      idx: '63', code: 'LAB · 2023',
      rows: [['HbA1c', '5.4 %'], ['Reference', 'below 5.7 %'], ['Last test', 'Mar 2023'], ['Trend', 'small rise']],
      plain: 'This shows your average blood sugar over about three months. 5.4 % is in the normal range.',
    },
    {
      id: 'sleep', title: 'Sleep · 30-day', year: '2024', pill: 'Sleep · 6 h 41',
      g: 'linear-gradient(165deg, #c59ff0 0%, #dda2ee 50%, #f2c9f1 100%)',
      label: 'Ring sensor', numText: '6h 58', unit: 'min',
      viz: () => VIZ.sleep(), sub: 'Avg 6 h 58 min · Best week 7 h 22',
      idx: '18', code: 'WRB · 2024',
      rows: [['Average night', '6 h 58 min'], ['Best week', '7 h 22 min'], ['Last night', '6 h 41 min'], ['Source', 'Smart ring']],
      plain: 'You are sleeping a little under seven hours on most nights. Your best week was in early spring.',
    },
    {
      id: 'folic', title: 'Folic acid 400 mg', year: '2021', pill: 'Medication',
      g: 'linear-gradient(170deg, #f7c46a 0%, #f9d86a 45%, #fbeca3 100%)',
      label: 'Daily', rx: true, unit: '400 µg',
      meds: [['400 µg', '●○○', '#f2b6c4'], ['With breakfast', '●●○', '#f6cf6a'], ['Paused 2022-06', '●○○', '#f6cf6a']],
      idx: '48', code: 'RX · 2021',
      rows: [['Dose', '400 µg daily'], ['When', 'with breakfast'], ['Started', '2021'], ['Status', 'paused 2022-06']],
      plain: 'A daily vitamin often taken before and during pregnancy. You paused it in June 2022.',
    },
    {
      id: 'vitd', title: 'Vitamin D', year: '2025', pill: 'Vitamin D · 32',
      g: 'linear-gradient(160deg, #4fb48c 0%, #7ccba3 50%, #c4ead2 100%)',
      label: 'Blood test · 5 results', num: 32, unit: 'ng/mL',
      viz: () => VIZ.bars([18, 21, 24, 27, 29, 32], '#3e9e78'), sub: 'Up from 18 in 2021 · Ref 30–100',
      idx: '22', code: 'LAB · 2025',
      rows: [['Latest', '32 ng/mL'], ['Reference', '30–100 ng/mL'], ['First result', '18 ng/mL · 2021'], ['Results', '5']],
      plain: 'Your vitamin D has climbed back into the normal range over the last four years.',
    },
  ]

  const fmt = (c, v) => c.dec ? v.toFixed(c.dec) : Math.round(v).toLocaleString('en-US')

  function heroHTML(c, big) {
    const cls = big ? 'sb' : 'zc'
    if (c.rx) return `<div class="${cls}-hero"><span class="zc-rx">Rx</span><span class="${cls}-unit" style="margin-left:auto">${c.unit}</span></div>`
    const val = c.numText ? c.numText : fmt(c, c.num)
    return `<div class="${cls}-hero"><span class="${cls}-num"${c.num != null ? ` data-v="${c.num}"` : ''}>${val}</span><span class="${cls}-unit">${c.unit}</span></div>`
  }

  function faceHTML(c) {
    let mid = ''
    if (c.track) mid = `<div class="zc-rows">${c.track.map(([l, x, col]) => `<div class="zc-row"><span class="lab">${l}</span><span class="track"><i style="--x:${x}%;--dot:${col}"></i></span></div>`).join('')}</div>`
    else if (c.meds) mid = `<div class="zc-rows">${c.meds.map(([l, d, col]) => `<div class="zc-row"><span class="pill-i" style="--pa:${col}"></span><span class="lab">${l}</span><span class="dots">${d}</span></div>`).join('')}</div>`
    else mid = `${c.tag ? `<span class="zc-tag">${c.tag}</span>` : ''}<div class="zc-viz">${c.viz()}</div><div class="zc-sub">${c.sub}</div>`
    return `<div class="zc-face" style="--g:${c.g}">` +
      `<div class="zc-field"><span class="streaks" aria-hidden="true"></span><div class="zc-head"><span class="zc-title">${c.title}</span><span class="zc-year">${c.year}</span></div></div>` +
      `<div class="zc-body"><span class="zc-label">${c.label}</span>${heroHTML(c)}${mid}` +
      `<div class="zc-foot"><span class="zc-me">ZEIT<span>Me</span></span><span class="zc-idx">[${c.idx}]<span>${c.code}</span></span></div></div>` +
      `</div>`
  }

  // ---- Hero: words arrive into focus, then the orb ---------------------------------------
  const words = [...document.querySelectorAll('.hero-words .w')].map((el, i) => {
    const o = new Spring(0, SETTLE)
    o.set(1, 0.12 + i * STAGGER.greeting)
    return { el, o }
  })
  loop.add((dt) => {
    const busy = stepAll(words.map((w) => w.o), dt)
    for (const w of words) {
      const p = w.o.x
      w.el.style.transform = `translateY(${(1 - p) * ENTER.y}px)`
      w.el.style.opacity = clamp01(p)
      w.el.style.filter = p > 0.995 ? 'none' : `blur(${Math.max(0, (1 - p) * ENTER.blur).toFixed(2)}px)`
    }
    return busy
  })
  const heroOrb = document.getElementById('hero-orb')
  const heroWords = document.getElementById('hero-words')
  const heroFoot = document.getElementById('hero-foot')
  requestAnimationFrame(() => heroOrb.classList.add('in'))
  // the hero orb wakes up, then settles into breathing; it glances toward your cursor and
  // jolts when you touch the hero
  const heroLive = ORBS.hero
  if (heroLive && !reduce) {
    heroLive.energy.x = 0.9; heroLive.set(0.2)
    let lastMove = 0
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return
      const r = heroOrb.getBoundingClientRect()
      const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
      heroLive.gaze(Math.max(-1, Math.min(1, nx)), Math.max(-1, Math.min(1, ny)))
      const now = performance.now()
      if (now - lastMove > 600 && Math.abs(e.movementX) + Math.abs(e.movementY) > 40) { heroLive.pulse(0.25); lastMove = now }
    }, { passive: true })
    document.getElementById('hero').addEventListener('pointerdown', () => heroLive.poke())
  }

  // ---- The rail (app: CardRail.jsx + motion.js CARD) -------------------------------------
  // `spread` runs 0 -> 1 with the scroll while the section is pinned: at 0 the cards are a
  // stacked deck, at 1 they are the app's rail. Every card's target is a blend of the two, and
  // the app's rail spring follows the target, so the scroll never feels mechanical.
  const rail = document.getElementById('rail')
  const dotsEl = document.getElementById('dots')
  const pill = document.getElementById('pill')
  const cardsSec = document.getElementById('cards')
  const cardsHead = document.getElementById('cards-head')
  const railFoot = document.getElementById('rail-foot')
  const n = CARDS.length

  let focus = 0, spread = reduce ? 1 : 0, drag = null, cw = 260
  const step = () => cw + CARD.gap
  const tilt = new Spring(0, PRESS)

  const els = CARDS.map((c, i) => {
    const el = document.createElement('div')
    el.className = 'zc'
    el.setAttribute('role', 'button')
    el.dataset.i = i
    el.innerHTML = faceHTML(c)
    rail.appendChild(el)
    el.querySelectorAll('.draw').forEach((p) => p.style.setProperty('--len', Math.ceil(p.getTotalLength())))
    const dot = document.createElement('span')
    dot.className = 'rail-dot'
    dotsEl.appendChild(dot)
    return {
      el, dot, c, drawn: false,
      x: new Spring(0, SPRING), y: new Spring(ENTER_RAIL.y, SPRING), s: new Spring(1, SPRING),
      o: new Spring(0, SPRING), r: new Spring(0, SPRING), p: new Spring(1, PRESS), v: new Spring(0, SPRING),
    }
  })
  const measure = () => { cw = els[0].el.offsetWidth || 260 }
  measure()

  const delta = (i) => { const raw = i - focus; return raw - n * Math.round(raw / n) }
  const lerp = (a, b, t) => a + (b - a) * t
  const ease = (t) => 1 - Math.pow(1 - t, 3)

  function layout() {
    const t = ease(spread), open = spread > 0.98
    els.forEach((k, i) => {
      const d = delta(i), ad = Math.abs(d), centred = d === 0
      // the deck: cards stacked behind the top one, each a little higher, smaller and turned
      const deckY = -ad * 14, deckS = 1 - ad * 0.06, deckR = d * 2.2, deckO = ad <= 2 ? 1 : 0
      // the rail: the app's resting layout
      // two either side: the second pair is smaller, fainter and tucked under the first
      const railX = ad <= 1 ? d * step() : Math.sign(d) * step() * 1.72
      const railY = centred ? 0 : CARD.offDrop * ad
      const railS = centred ? 1 : ad === 1 ? CARD.off : CARD.off * 0.88
      // side cards stay solid and fade toward the page colour, so overlaps never show through
      const railO = ad <= 2 ? 1 : 0
      const railV = centred ? 0 : ad === 1 ? 1 - CARD.offOpacity : 0.72
      k.x.set(lerp(0, railX, t))
      k.y.set(lerp(deckY, railY, t))
      k.s.set(lerp(deckS, railS, t))
      k.r.set(lerp(deckR, 0, t))
      k.o.set(lerp(deckO, railO, t))
      k.v.set(lerp(ad * 0.12, railV, t))

      const visible = open && ad <= 2
      k.el.classList.toggle('hi', centred)
      k.el.style.zIndex = 10 - ad
      k.el.style.pointerEvents = visible ? 'auto' : 'none'
      k.el.tabIndex = centred ? 0 : -1
      k.el.setAttribute('aria-hidden', ad <= 2 ? 'false' : 'true')
      k.el.setAttribute('aria-label', 'Open ' + k.c.title + ' card')
      k.dot.classList.toggle('on', centred)
    })
    cardsHead.style.opacity = reduce ? 1 : clamp01(0.25 + spread * 1.5)
    cardsHead.style.transform = reduce ? '' : `translateY(${(1 - t) * 18}px)`
    railFoot.style.opacity = reduce ? 1 : clamp01((spread - 0.6) / 0.35)
    loop.wake()
  }

  loop.add((dt) => {
    const busy = stepAll(els.flatMap((k) => [k.x, k.y, k.s, k.o, k.r, k.p, k.v]).concat(tilt), dt)
    const dx = drag ? drag.dx : 0
    for (const k of els) {
      k.el.style.transform = `translate3d(${k.x.x + dx}px, ${k.y.x}px, 0) rotateY(${tilt.x}deg) rotateZ(${k.r.x}deg) scale(${k.s.x * k.p.x})`
      k.el.style.opacity = clamp01(k.o.x)
      k.el.style.setProperty('--veil', clamp01(k.v.x).toFixed(3))
    }
    return busy || !!drag
  })

  // the centred card comes alive: its line draws and its number counts up, once
  function wake(k) {
    if (k.drawn || spread < 0.9) return
    k.drawn = true
    k.el.classList.add('live')
    const num = k.el.querySelector('.zc-num[data-v]')
    if (!num || reduce) return
    const to = +num.dataset.v, t0 = performance.now(), dur = 1100
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3)
      num.textContent = fmt(k.c, to * e)
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  let pillTimer = 0
  function setPill(text) {
    clearTimeout(pillTimer)
    if (reduce || !pill.textContent) { pill.textContent = text; return }
    pill.style.opacity = 0
    pillTimer = setTimeout(() => { pill.textContent = text; pill.style.opacity = 1 }, 200)
  }

  function setFocus(i, moveDomFocus) {
    focus = (i + n) % n
    layout()
    setPill(CARDS[focus].pill)
    setTimeout(() => wake(els[focus]), 200)
    if (moveDomFocus) els[focus].el.focus({ preventScroll: true })
  }

  // the scroll drives the spread while the section is pinned
  function onCardsScroll() {
    if (reduce) return
    const r = cardsSec.getBoundingClientRect()
    const run = cardsSec.offsetHeight - window.innerHeight
    const p = clamp01(-r.top / (run * 0.7))
    if (Math.abs(p - spread) < 0.001) return
    spread = p
    layout()
    if (spread > 0.9) { wake(els[focus]); setTimeout(() => els.forEach(wake), 500) }
  }

  layout()
  setPill(CARDS[0].pill)
  if (reduce) wake(els[0])
  window.addEventListener('resize', () => { measure(); layout() })

  // ---- Gestures: a swipe only when it clearly travels or flicks; anything else is a tap ----
  // While dragging, the rail turns toward the finger: a small 3D tilt that springs back.
  const SWIPE = 44, FLICK = 520
  rail.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !e.isPrimary || spread < 0.98) return
    const cardEl = e.target.closest('.zc')
    if (!cardEl) return
    const i = +cardEl.dataset.i
    drag = { i, x: e.clientX, t: performance.now(), pid: e.pointerId, dx: 0 }
    els[i].p.set(delta(i) === 0 ? CARD.press : CARD.pressOff / CARD.off)
    loop.wake()
  })
  window.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pid) return
    drag.dx = e.clientX - drag.x
    if (!reduce) tilt.set(Math.max(-14, Math.min(14, drag.dx / 9)))
  })
  function endGesture(e) {
    if (!drag || e.pointerId !== drag.pid) return
    const g = drag
    drag = null
    els[g.i].p.set(1)
    tilt.set(0)
    els.forEach((k) => { k.x.x += g.dx })   // the release continues from where the finger was
    if (e.type === 'pointercancel') { layout(); return }
    const vx = (g.dx / Math.max(performance.now() - g.t, 1)) * 1000
    if (g.dx < -SWIPE || (vx < -FLICK && g.dx < -14)) return setFocus(focus + 1)
    if (g.dx > SWIPE || (vx > FLICK && g.dx > 14)) return setFocus(focus - 1)
    // one tap brings a side card to the centre; a double tap on the centre card opens it
    const now = performance.now()
    if (delta(g.i) !== 0) { lastTap = null; return setFocus(g.i) }
    if (lastTap && lastTap.i === g.i && now - lastTap.t < 360) { lastTap = null; return openCard(g.i) }
    lastTap = { i: g.i, t: now }
    els[g.i].p.x = CARD.press; els[g.i].p.set(1)   // a small acknowledging press
  }
  let lastTap = null
  window.addEventListener('pointerup', endGesture)
  window.addEventListener('pointercancel', endGesture)

  rail.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); setFocus(focus + 1, true) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setFocus(focus - 1, true) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCard(focus) }
  })

  // ---- The opened card: rises from the bottom wearing the card's colour -------------------
  const scrim = document.getElementById('scrim')
  const sheetEl = document.getElementById('sheet')
  const sheetBody = document.getElementById('sheet-body')
  const sheetY = new Spring(105, RISE)
  let openIdx = -1, lastFocus = null

  loop.add((dt) => {
    const busy = stepAll([sheetY], dt)
    sheetEl.style.transform = `translateY(${sheetY.x}%)`
    if (!busy && openIdx === -1 && !sheetEl.hidden) { sheetEl.hidden = true; scrim.hidden = true }
    return busy
  })

  function openCard(i) {
    const c = CARDS[i]
    openIdx = i
    lastFocus = document.activeElement
    sheetEl.style.setProperty('--g', c.g)
    document.getElementById('sheet-title').textContent = c.title
    document.getElementById('sheet-year').textContent = c.year
    const big = c.track
      ? `<div class="zc-rows" style="gap:10px">${c.track.map(([l, x, col]) => `<div class="zc-row" style="font-size:13px"><span class="lab">${l}</span><span class="track" style="width:45%"><i style="left:${x}%;--dot:${col}"></i></span></div>`).join('')}</div>`
      : c.meds
        ? `<div class="zc-rows" style="gap:10px">${c.meds.map(([l, d, col]) => `<div class="zc-row" style="font-size:13px"><span class="pill-i" style="--pa:${col}"></span><span class="lab">${l}</span><span class="dots">${d}</span></div>`).join('')}</div>`
        : c.viz()
    sheetBody.innerHTML =
      `<span class="sb-label">${c.label}</span>${heroHTML(c, true)}` +
      `<div class="sb-viz live">${big}</div>` +
      `<ul class="sb-rows">${c.rows.map(([a, b]) => `<li><span>${a}</span><span>${b}</span></li>`).join('')}</ul>` +
      `<p class="sb-plain"><b>In plain words</b>${c.plain}</p>` +
      `<p class="sb-foot">Sample data · a preview of the Zeit app</p>`
    sheetBody.querySelectorAll('.draw').forEach((p) => p.style.setProperty('--len', 0))
    sheetEl.hidden = false; scrim.hidden = false
    sheetEl.style.pointerEvents = scrim.style.pointerEvents = 'auto'
    sheetEl.scrollTop = 0
    sheetY.jump(105); sheetY.set(0)
    scrim.style.transition = 'opacity .26s cubic-bezier(.16,.84,.24,1)'
    requestAnimationFrame(() => { scrim.style.opacity = 1 })
    document.body.style.overflow = 'hidden'
    loop.wake()
    document.getElementById('sheet-close').focus({ preventScroll: true })
  }
  function closeCard() {
    if (openIdx === -1) return
    openIdx = -1
    // the page is usable the moment you close; the sheet just finishes leaving
    sheetEl.style.pointerEvents = scrim.style.pointerEvents = 'none'
    sheetY.set(105)
    scrim.style.transition = 'opacity .2s cubic-bezier(.4,0,1,1)'
    scrim.style.opacity = 0
    document.body.style.overflow = ''
    loop.wake()
    if (reduce) { sheetEl.hidden = true; scrim.hidden = true }
    if (lastFocus) lastFocus.focus({ preventScroll: true })
  }
  scrim.addEventListener('click', closeCard)
  document.getElementById('sheet-close').addEventListener('click', closeCard)
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCard() })

  // ---- Small things: top bar edge, reveals, sign-up, year --------------------------------
  const topbar = document.querySelector('.topbar')
  const phone = document.getElementById('phone')

  // one scroll handler, once per frame: the top bar, the hero, the deck and the phone
  let ticking = false
  function onScroll() {
    ticking = false
    const y = window.scrollY, vh = window.innerHeight
    topbar.classList.toggle('scrolled', y > 8)
    if (!reduce) {
      // the hero lifts away and the orb sinks a little slower than the page
      const hp = clamp01(y / (vh * 0.8))
      heroWords.style.transform = `translateY(${-hp * 60}px)`
      heroWords.style.opacity = 1 - hp * 0.9
      heroFoot.style.opacity = 1 - hp * 2
      // the orb drifts up with the words and dissolves, rather than sinking into the next section
      heroOrb.style.transform = `translateY(${-hp * 40}px) scale(${1 - hp * 0.08})`
      heroOrb.style.setProperty('--fade', (1 - Math.min(1, hp * 1.4)).toFixed(3))
      if (hp > 0) heroOrb.classList.add('settled')
      // the phone drifts against the scroll, just enough to feel like depth
      const pr = phone.getBoundingClientRect()
      const pp = (pr.top + pr.height / 2 - vh / 2) / vh
      phone.style.transform = `translateY(${(pp * 40).toFixed(1)}px)`
    }
    onCardsScroll()
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll) } }, { passive: true })
  onScroll()

  const revealEls = document.querySelectorAll('.product-copy, .about .h2, .about .lede, .pillars li, .updates > *')
  if ('IntersectionObserver' in window && !reduce) {
    revealEls.forEach((el) => el.classList.add('reveal'))
    const io2 = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io2.unobserve(e.target) }
    }), { threshold: 0.15, rootMargin: '0px 0px -8% 0px' })
    revealEls.forEach((el) => io2.observe(el))
  }

  // ---- The phone: you, using the app ------------------------------------------------------
  // No tour and no guide. Your finger swipes the cards, you tap the orb and ask out loud, the
  // orb listens, checks your papers and answers from your record. The status lines are the
  // app's own (zeit-mvp/src/flows/Talk.jsx). Loops while the phone is on screen.
  const dev = document.getElementById('dev')
  const devScreen = document.getElementById('phone-screen')
  const fitDev = () => { dev.style.transform = `scale(${devScreen.clientWidth / 390})` }
  fitDev()
  window.addEventListener('resize', fitDev)

  const ICON = {
    pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4"/>',
    chat: '<path d="M5 5h14v10H9l-4 4z"/><path d="M8.5 9h7M8.5 12h5"/>',
    upload: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 15v4h14v-4"/>',
    vault: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="12" cy="12" r="3.2"/>',
    face: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><circle cx="12" cy="11" r="3"/><path d="M8 17c1-1.6 2.4-2.3 4-2.3s3 .7 4 2.3"/>',
    clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM8.5 11h7M8.5 14.5h5"/>',
  }
  // the Home cards, in the app's order, with the line the greeting shows for each
  const DEV_CARDS = [
    ['Daily Check-In', 'pulse', 'CHECK-IN', 'One minute for you.'],
    ['Doctor Visit', 'mic', 'VISIT', 'Record it and get clear notes.'],
    ['Chat', 'chat', 'CHAT', 'Type a question any time.'],
    ['Upload Documents', 'upload', 'HEALTH DOCUMENTS', 'Health papers now.<br />Insurance comes soon.'],
    ['Vault', 'vault', 'VAULT', 'What would you like to do today?'],
    ['Face Scan', 'face', 'FACE SCAN', 'What would you like to do today?'],
    ['Health intake', 'clip', 'HEALTH INTAKE', 'What would you like to do today?'],
  ]
  const devRail = document.getElementById('dev-rail')
  const devDots = document.getElementById('dev-dots')
  const devSub = document.getElementById('dev-sub')
  const ARROW_SVG = '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
  const devEls = DEV_CARDS.map(([t, ic, l]) => {
    const el = document.createElement('div')
    el.className = 'dc'
    el.innerHTML = `<span class="dc-t">${t}</span><span class="dc-i"><svg viewBox="0 0 24 24">${ICON[ic]}</svg></span>` +
      `<span class="dc-dash"></span><span class="dc-line"></span><span class="dc-l">${l}</span><span class="dc-a">${ARROW_SVG}</span>`
    devRail.appendChild(el)
    const dot = document.createElement('i')
    devDots.appendChild(dot)
    return { el, dot }
  })
  const DSTEP = 243
  let devF = 0
  function devLayout(f, dx = 0) {
    const m = devEls.length
    devEls.forEach(({ el, dot }, i) => {
      let d = i - f; d -= m * Math.round(d / m)
      const ad = Math.abs(d)
      el.style.transform = `translate3d(${d * DSTEP + dx}px, ${d ? 6 : 0}px, 0) scale(${d ? 0.86 : 1})`
      el.style.opacity = ad > 1 ? 0 : 1
      el.style.zIndex = 10 - ad
      el.classList.toggle('off', d !== 0)
      dot.classList.toggle('on', d === 0)
    })
    if (!dx) devSub.innerHTML = DEV_CARDS[f][3]
  }
  devLayout(0)

  const $ = (id) => document.getElementById(id)
  const finger = $('dev-finger')
  let timers = [], run = 0
  const STOP = {}
  const later = (ms) => new Promise((r) => { timers.push(setTimeout(r, ms)) })
  // every wait checks that this scene is still the one playing; if not, it bails out
  let myRun = 0
  const W = async (ms) => { await later(ms); if (myRun !== run) throw STOP }

  function fingerAt(x, y, down) {
    finger.classList.remove('moving')
    finger.style.left = x + 'px'; finger.style.top = y + 'px'
    finger.classList.toggle('down', !!down)
  }
  async function tap(x, y) {
    fingerAt(x, y, true)
    await W(220)
    finger.classList.remove('down')
  }
  // a real swipe: the finger lands, drags the row with it, lets go, and the row springs on
  async function swipe(dir) {
    fingerAt(dir > 0 ? 300 : 90, 520, true)
    await W(160)
    devRail.classList.add('dragging')
    ORBS.home.gaze(-0.8 * dir, 0.3)
    finger.classList.add('moving')
    finger.style.left = (dir > 0 ? 120 : 270) + 'px'
    const t0 = performance.now()
    await new Promise((res) => {
      const f = (t) => {
        const p = Math.min(1, (t - t0) / 420), e = 1 - Math.pow(1 - p, 2)
        devLayout(devF, -150 * e * dir)
        p < 1 && myRun === run ? requestAnimationFrame(f) : res()
      }
      requestAnimationFrame(f)
    })
    finger.classList.remove('down')
    devRail.classList.remove('dragging')
    devF = (devF + dir + devEls.length) % devEls.length
    devLayout(devF)
    ORBS.home.pulse(0.2); timers.push(setTimeout(() => ORBS.home.gaze(0, 0), 500))
    if (myRun !== run) throw STOP
  }
  // swipe the shorter way round to a card
  async function swipeTo(i) {
    const m = devEls.length
    let d = i - devF; d -= m * Math.round(d / m)
    while (d) { await swipe(Math.sign(d)); d -= Math.sign(d); await W(650) }
  }
  async function openCard() {
    await tap(195, 470)
    devEls[devF].el.classList.add('press'); await W(140); devEls[devF].el.classList.remove('press')
  }
  function tab(name) {
    document.querySelectorAll('.ni[data-tab]').forEach((n) => n.classList.toggle('on', n.dataset.tab === name))
  }
  const NAV_X = { home: 52, vault: 123, talk: 195, chat: 267 }
  async function say(el, text, perWord, orb, strength) {
    el.textContent = ''
    for (const w of text.split(' ')) {
      if (orb) orb.pulse(strength * (0.6 + Math.min(1, w.length / 7) * 0.6) * (0.8 + Math.random() * 0.4))
      const s = document.createElement('span')
      s.className = 'w-in'; s.textContent = w + ' '
      el.appendChild(s)
      await W(perWord)
    }
  }
  const state = (t) => { $('dt-state').textContent = t }
  const ENERGY = { listen: 0.55, think: 0.85, speak: 0.5, '': 0.2 }
  const mode = (m) => {
    dev.classList.toggle('listening', m === 'listen'); dev.classList.toggle('speaking', m === 'speak')
    ORBS.talk.set(ENERGY[m] ?? 0.2)
  }
  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  // ---- the scenes ----------------------------------------------------------------------
  const SCENES = [
    // Talk to ZEIT: the Start here sheet rises behind the cards, then a spoken question
    async function talk() {
      await W(900)
      await tap(195, 790)
      $('dev-scrim').classList.add('on'); $('dev-sheet').classList.add('on')
      await W(2600)
      await tap(195, 737); $('ds-btn').classList.add('press')
      await W(260); $('ds-btn').classList.remove('press')
      $('dev-sheet').classList.remove('on'); $('dev-scrim').classList.remove('on')
      dev.classList.add('talking')
      await W(1000)
      await tap(195, 290); ORBS.talk.poke()
      mode('listen'); state("Listening. Pause when you're done.")
      await say($('dt-you'), 'What did my last blood test say?', 260, ORBS.talk, 0.45)
      await W(700); mode(''); state('Got it')
      await W(600); state('Checking your papers'); mode('think')
      await W(900); mode('speak'); state('')
      await say($('dt-zeit'), 'Your haemoglobin was 13.2 g/dL. That is in the normal range.', 210, ORBS.talk, 0.6)
      $('dt-src').textContent = 'Lab result · 13 Oct 2026'; $('dt-src').classList.add('on')
      mode(''); state('Tap to talk')
      await W(3200)
      await tap(353, 100)
      dev.classList.remove('talking')
    },
    // Record a visit: ready, recording, transcript ready
    async function visit() {
      await W(700); await swipeTo(1); await W(500)
      await openCard()
      const s = $('scr-visit'); s.classList.add('on')
      await W(2000)
      await tap(195, 772); $('v-btn').classList.add('press'); await W(150); $('v-btn').classList.remove('press')
      s.classList.add('rec'); ORBS.visit.tone = 'rec'; ORBS.visit.set(0.5); ORBS.visit.poke()
      $('v-title').textContent = 'Recording your visit'; $('v-sub').textContent = ''
      $('v-line').textContent = 'Your visit is being recorded.'; $('v-note').textContent = 'Keep this screen open.'
      $('v-btn').innerHTML = '<span style="width:12px;height:12px;background:#fff;border-radius:2px"></span>Stop recording'
      for (let t = 1; t <= 7; t++) { await W(1000); $('v-time').textContent = mmss(t); ORBS.visit.pulse(0.3 + Math.random() * 0.3) }
      await tap(195, 772)
      s.classList.remove('rec'); s.classList.add('done'); ORBS.visit.set(0.2)
      $('v-title').textContent = 'Transcript ready'; $('v-sub').textContent = 'This can take a minute. Only what you save goes to your Vault.'
      await W(4200)
      await tap(346, 116); s.classList.remove('on')
      await W(500)
    },
    // Face Scan: the intro card, then the live scan guiding you round
    async function face() {
      await W(700); await swipeTo(5); await W(500)
      await openCard()
      $('scr-face').classList.add('on')
      await W(2200)
      await tap(195, 640); $('fs-start').classList.add('press'); await W(150); $('fs-start').classList.remove('press')
      $('scr-scan').classList.add('on')
      await W(1600)
      $('scan-mesh').classList.add('on')
      let left = 60
      const tick = setInterval(() => { left = Math.max(0, left - 1); $('scan-time').textContent = '00:' + String(left).padStart(2, '0') }, 1000)
      timers.push({ clear: () => clearInterval(tick) })
      await W(1400)
      $('scan-h').textContent = 'Slowly turn slightly left'; $('scan-s').textContent = "We'll guide you to the next direction"
      for (const off of [700, 520, 360]) { $('scan-arc').style.strokeDashoffset = off; await W(1200) }
      $('scan-h').textContent = 'Now slowly turn right'
      for (const off of [220, 90]) { $('scan-arc').style.strokeDashoffset = off; await W(1200) }
      clearInterval(tick)
      await W(800)
      $('scr-scan').classList.remove('on'); $('scr-face').classList.remove('on')
      await W(600)
    },
    // Health intake: your profile, then "Does this look right?"
    async function intake() {
      await W(700); await swipeTo(6); await W(500)
      await openCard()
      $('scr-intake').classList.add('on')
      await W(900)
      $('in-load').style.opacity = 0; $('in-profile').classList.add('on')
      await W(1600)
      $('in-profile').style.transform = 'translateY(-250px)'
      await W(2200)
      $('in-profile').classList.remove('on'); $('in-check').classList.add('on')
      await W(2200)
      await tap(70, 491); $('in-keep').classList.add('picked')
      await W(2200)
      await tap(346, 116); $('scr-intake').classList.remove('on')
      await W(500)
    },
    // Vault: every letter and result, stacked
    async function vault() {
      await W(900)
      await tap(NAV_X.vault, 790); tab('vault'); $('scr-vault').classList.add('on')
      await W(1800)
      const docs = [...document.querySelectorAll('#docs .doc')]
      const place = (shift) => docs.forEach((d, i) => { const k = i - shift; d.style.transform = `translateY(${Math.max(-1, k) * 128}px) scale(${k < 0 ? 0.94 : 1})`; d.style.opacity = k < -1 ? 0 : 1 })
      for (const sh of [1, 2, 1, 0]) { fingerAt(195, 600, true); finger.classList.add('moving'); finger.style.top = (sh ? 420 : 640) + 'px'; place(sh); await W(500); finger.classList.remove('down'); await W(1300) }
      await W(400)
      await tap(NAV_X.home, 790); tab('home'); $('scr-vault').classList.remove('on')
      await W(500)
    },
    // Chat: the list, then one conversation
    async function chat() {
      await W(900)
      await tap(NAV_X.chat, 790); tab('chat'); $('scr-chat').classList.add('on')
      await W(1900)
      await tap(150, 250); $('c-first').classList.add('press'); await W(140); $('c-first').classList.remove('press')
      $('scr-chat').classList.add('thread')
      const box = $('c-msgs'); box.innerHTML = ''
      const add = (cls, text) => { const m = document.createElement('div'); m.className = 'msg ' + cls; m.textContent = text; box.appendChild(m); return m }
      await W(500); add('u', 'What is ferritin?')
      await W(500); const d = add('z dots', '•••')
      await W(1300); d.remove()
      const z = add('z', ''); await say(z, 'Ferritin is a protein that stores iron. It shows how much iron your body has in reserve.', 170)
      await W(3000)
      await tap(NAV_X.home, 790); tab('home'); $('scr-chat').classList.remove('on', 'thread')
      await W(500)
    },
  ]
  // rough length of each scene, for the progress line beside the phone
  const SCENE_MS = [27000, 21500, 17500, 15500, 11000, 13500]

  function resetScenes() {
    devF = 0; devLayout(0); tab('home'); mode('')
    dev.classList.remove('talking', 'listening', 'speaking')
    ;['dev-sheet', 'dev-scrim', 'scr-visit', 'scr-face', 'scr-scan', 'scr-intake', 'scr-vault', 'scr-chat'].forEach((id) => $(id).classList.remove('on'))
    $('scr-visit').classList.remove('rec', 'done'); $('scr-chat').classList.remove('thread')
    $('v-title').textContent = 'Ready to record'; $('v-sub').textContent = 'Recording starts when you tap the button.'
    $('v-time').textContent = '0:00'; $('v-line').textContent = 'Put the phone where everyone can hear.'; $('v-note').textContent = 'A visit can be up to 15 minutes long.'
    $('v-btn').textContent = 'Start recording'
    if (ORBS.visit) { ORBS.visit.tone = ''; ORBS.visit.set(0.2) }
    $('scan-h').textContent = 'Looking for your face'; $('scan-s').textContent = 'Center your face in the frame'; $('scan-time').textContent = '01:00'
    $('scan-arc').style.strokeDashoffset = 880; $('scan-mesh').classList.remove('on')
    $('in-load').style.opacity = 1; $('in-profile').classList.remove('on'); $('in-profile').style.transform = ''; $('in-check').classList.remove('on'); $('in-keep').classList.remove('picked')
    document.querySelectorAll('#docs .doc').forEach((d, i) => { d.style.transform = `translateY(${i * 128}px)`; d.style.opacity = 1 })
    state('Tap to talk'); $('dt-you').textContent = ''; $('dt-zeit').textContent = ''; $('dt-src').classList.remove('on')
  }

  const useEls = [...document.querySelectorAll('#uses .use')]
  const phoneCap = document.getElementById('phone-cap')
  let useIdx = 0, progRaf = 0
  function showUse(i) {
    useEls.forEach((el, j) => { el.classList.toggle('on', j === i); el.setAttribute('aria-pressed', j === i); el.style.setProperty('--p', j < i ? 1 : 0) })
    if (useEls[i]) phoneCap.textContent = useEls[i].querySelector('b').textContent
    cancelAnimationFrame(progRaf)
    const el = useEls[i], t0 = performance.now(), dur = SCENE_MS[i]
    const f = (t) => { if (el) el.style.setProperty('--p', Math.min(1, (t - t0) / dur).toFixed(3)); if (t - t0 < dur) progRaf = requestAnimationFrame(f) }
    progRaf = requestAnimationFrame(f)
  }

  async function play(i = useIdx) {
    myRun = ++run
    stopTimers()
    useIdx = i
    showUse(i)
    resetScenes()
    try {
      await SCENES[i]()
      await W(400)
    } catch (e) { if (e !== STOP) throw e; return }
    play((i + 1) % SCENES.length)
  }
  useEls.forEach((el, j) => el.addEventListener('click', () => { if (!reduce) play(j); else showUse(j) }))
  function stopTimers() { timers.forEach((t) => (t && t.clear ? t.clear() : clearTimeout(t))); timers = [] }
  function stop() { run++; stopTimers(); cancelAnimationFrame(progRaf); finger.classList.remove('down'); mode('') }
  if (reduce) showUse(0)
  if (!reduce && 'IntersectionObserver' in window) {
    let playing = false
    new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting && !playing) { playing = true; play() }
      else if (!e.isIntersecting && playing) { playing = false; stop() }
    }), { threshold: 0.35 }).observe(devScreen)
  }

  const form = document.getElementById('optin')
  const input = document.getElementById('email')
  const msg = document.getElementById('optin-msg')
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = input.value.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      input.setAttribute('aria-invalid', 'true')
      msg.className = 'optin-msg err'; msg.textContent = 'Please enter a valid email address.'
      input.focus()
      return
    }
    input.removeAttribute('aria-invalid')
    const btn = form.querySelector('button')
    btn.disabled = true
    try {
      if (OPTIN_ENDPOINT) {
        const res = await fetch(OPTIN_ENDPOINT, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ email, source: 'website-v3' }),
        })
        if (!res.ok) throw new Error('status ' + res.status)
      }
      form.reset()
      msg.className = 'optin-msg'; msg.textContent = "You're on the list. We'll be in touch."
    } catch (err) {
      msg.className = 'optin-msg err'; msg.textContent = 'Something went wrong. Please try again.'
    } finally {
      btn.disabled = false
    }
  })

  document.getElementById('year').textContent = new Date().getFullYear()
})()
