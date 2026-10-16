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
      o: new Spring(0, SPRING), r: new Spring(0, SPRING), p: new Spring(1, PRESS),
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
      const railX = d * step(), railY = centred ? 0 : CARD.offDrop
      const railS = centred ? 1 : CARD.off, railO = centred ? 1 : ad <= 1 ? CARD.offOpacity : 0
      k.x.set(lerp(0, railX, t))
      k.y.set(lerp(deckY, railY, t))
      k.s.set(lerp(deckS, railS, t))
      k.r.set(lerp(deckR, 0, t))
      k.o.set(lerp(deckO, railO, t))

      const visible = open && ad <= 1
      k.el.classList.toggle('hi', centred)
      k.el.style.zIndex = 10 - ad
      k.el.style.pointerEvents = visible ? 'auto' : 'none'
      k.el.tabIndex = centred ? 0 : -1
      k.el.setAttribute('aria-hidden', ad <= 1 ? 'false' : 'true')
      k.el.setAttribute('aria-label', 'Open ' + k.c.title + ' card')
      k.dot.classList.toggle('on', centred)
    })
    cardsHead.style.opacity = reduce ? 1 : clamp01(0.25 + spread * 1.5)
    cardsHead.style.transform = reduce ? '' : `translateY(${(1 - t) * 18}px)`
    railFoot.style.opacity = reduce ? 1 : clamp01((spread - 0.6) / 0.35)
    loop.wake()
  }

  loop.add((dt) => {
    const busy = stepAll(els.flatMap((k) => [k.x, k.y, k.s, k.o, k.r, k.p]).concat(tilt), dt)
    const dx = drag ? drag.dx : 0
    for (const k of els) {
      k.el.style.transform = `translate3d(${k.x.x + dx}px, ${k.y.x}px, 0) rotateY(${tilt.x}deg) rotateZ(${k.r.x}deg) scale(${k.s.x * k.p.x})`
      k.el.style.opacity = clamp01(k.o.x)
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
    if (spread > 0.9) wake(els[focus])
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
    setFocus(g.i)
    openCard(g.i)
  }
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
      heroOrb.style.transform = `translateY(${hp * 90}px) scale(${1 + hp * 0.15})`
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
