/* Zeit Health — website v1.
   The card rail below is a plain-JS port of the app's CardRail.jsx: the same pastel faces, the
   same illustrations, the same spring values (src/motion.js) and the same entry sweep, swipe and
   tap rules. No framework, no build step. */

;(() => {
  document.documentElement.classList.add('js')
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ---- Sign-up endpoint ------------------------------------------------------------------
  // Paste a form endpoint here (Formspree, Supabase function, Mailchimp, etc.). It receives a
  // JSON POST: { email, source }. Left empty, the form validates and thanks the visitor, but
  // NOTHING IS SAVED — wire this before launch.
  const OPTIN_ENDPOINT = ''

  // ---- Springs (app: src/motion.js) ------------------------------------------------------
  const SPRING = { k: 380, c: 34, m: 1 }
  const SPRING_SOFT = { k: 320, c: 36, m: 1 }

  class Spring {
    constructor(value, cfg = SPRING_SOFT) { this.x = value; this.v = 0; this.to = value; this.cfg = cfg }
    set(to, delay = 0) {
      if (reduce) { this.to = to; this.x = to; this.v = 0; return }
      if (delay > 0) { clearTimeout(this.t); this.t = setTimeout(() => { this.to = to; loop.wake() }, delay * 1000) }
      else { clearTimeout(this.t); this.to = to }
    }
    jump(to) { clearTimeout(this.t); this.x = to; this.to = to; this.v = 0 }
    step(dt) {
      const { k, c, m } = this.cfg
      const a = (-k * (this.x - this.to) - c * this.v) / m
      this.v += a * dt
      this.x += this.v * dt
    }
    get rest() { return Math.abs(this.x - this.to) < 0.01 && Math.abs(this.v) < 0.01 }
  }

  // one animation loop for everything on the page; it sleeps when every spring is at rest
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

  // ---- Topic palette (app: src/data/art.js) ----------------------------------------------
  const TOPICS = {
    documents: { bg: '#E7EFFB', ink: '#1F3D6E', body: '#53627E', a1: '#A9C8F2', a2: '#7BA6E4', puff: '#D5E4F8' },
    results: { bg: '#EDEBFB', ink: '#3B3480', body: '#5C5880', a1: '#BDB4F0', a2: '#9188E0', puff: '#E1DCF7' },
    appointments: { bg: '#E2F0F7', ink: '#155268', body: '#4C6A76', a1: '#9FD0E6', a2: '#6FB3D2', puff: '#D0E6F1' },
    preparation: { bg: '#E8F3E8', ink: '#2C5738', body: '#4E6B55', a1: '#A9D6AE', a2: '#7CBB88', puff: '#D8EBD9' },
    medications: { bg: '#FBEEE1', ink: '#7A4820', body: '#7C6450', a1: '#F3C79B', a2: '#E4A469', puff: '#F7E2CD' },
    costs: { bg: '#FBF4DF', ink: '#6B5316', body: '#736A4C', a1: '#EFD98F', a2: '#DCC05C', puff: '#F6EBC9' },
    conversation: { bg: '#FBEAEF', ink: '#78304E', body: '#7A5B67', a1: '#F2B2C6', a2: '#E2869F', puff: '#F7DAE3' },
    reminders: { bg: '#F2EBFA', ink: '#513674', body: '#665A7A', a1: '#CFB8EE', a2: '#B092DE', puff: '#E8DCF6' },
    library: { bg: '#E6F2EE', ink: '#1F5A4E', body: '#4A6A64', a1: '#9DD4C4', a2: '#6DBAA5', puff: '#D6EBE4' },
  }
  const faceVars = (t) => {
    const p = TOPICS[t]
    return `--topic-bg:${p.bg};--topic-ink:${p.ink};--topic-body:${p.body};--ill-1:${p.a1};--ill-2:${p.a2};--ill-puff:${p.puff}`
  }

  // ---- The cards (titles and hints from the app's src/data/cards.js) ---------------------
  const CARDS = [
    { topic: 'documents', ill: 'documents-stack', title: 'Upload your documents', hint: 'Get every paper into one place', verb: 'Upload',
      rows: ['Blood panel result · PDF', 'Referral letter · PDF', 'Prescription · photo'] },
    { topic: 'results', ill: 'document-explain', title: 'Plain-language explanation', hint: 'What your result actually says', verb: 'Explain',
      rows: ['What was tested, in everyday words', 'What looks normal, and what to watch', 'Questions worth asking your doctor'] },
    { topic: 'appointments', ill: 'calendar', title: 'Find a time', hint: 'Three doctors who can see you, with prices', verb: 'Choose',
      rows: ['Three options, side by side', 'The price shown up front', 'Booked in one tap'] },
    { topic: 'preparation', ill: 'checklist', title: 'Prepare for the visit', hint: 'Walk in ready', verb: 'Check off',
      rows: ['Bring your ID and insurance card', 'List the medicines you take', 'Write down your questions'] },
    { topic: 'reminders', ill: 'bell', title: 'Set a reminder', hint: 'Take it on time, every time', verb: 'Remind me',
      rows: ['Morning dose · 8:00', 'Evening dose · 20:00', 'Refill nudge a week before you run out'] },
    { topic: 'medications', ill: 'pills', title: 'Medication history', hint: 'What you have taken', verb: 'View',
      rows: ['Every medicine in one list', 'Doses and dates kept for you', 'Easy to share with your doctor'] },
    { topic: 'results', ill: 'lab-vials', title: 'Understand results after', hint: 'We explain them the moment they land', verb: 'Explain',
      rows: ['Results arrive in your Vault', 'Explained in plain words right away', 'Flags only what needs you'] },
    { topic: 'costs', ill: 'shield', title: 'Costs & cover', hint: 'What a recheck costs', verb: 'View',
      rows: ['What you pay, before you book', 'What your cover includes', 'No surprises after the visit'] },
    { topic: 'conversation', ill: 'chat', title: 'Talk to us', hint: 'Ask about your documents', verb: 'Talk to me',
      rows: ['“What does this letter mean?”', '“Do I need to fast before this test?”', '“When is my next appointment?”'] },
    { topic: 'library', ill: 'books', title: 'Read up', hint: 'Trusted guides picked for your situation', verb: 'Read',
      rows: ['Short guides, not jargon', 'Picked for what you are dealing with', 'Opens right inside the card'] },
  ]

  // ---- Illustrations (app: src/components/Illustration.jsx, viewBox 0 0 120 96) ----------
  const sheet = (u, x, y, w = 34, h = 42, tilt = 0, lines = 3, op = 1) => {
    let l = ''
    for (let i = 0; i < lines; i++) l += `<rect x="${x + 6}" y="${y + 9 + i * 8}" width="${w - (i === lines - 1 ? 16 : 12)}" height="3" rx="1.5" fill="var(--ill-2)" opacity="0.34"/>`
    return `<g transform="rotate(${tilt} ${x + w / 2} ${y + h / 2})" opacity="${op}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="url(#${u}pale)" stroke="var(--ill-2)" stroke-opacity="0.28"/>${l}</g>`
  }
  const pill = (u, x, y, w, h, tilt) =>
    `<g transform="rotate(${tilt} ${x + w / 2} ${y + h / 2})"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="url(#${u}body)"/><path d="M${x + w / 2} ${y} H${x + w - h / 2} a${h / 2} ${h / 2} 0 0 1 0 ${h} H${x + w / 2} Z" fill="var(--ill-2)" opacity="0.55"/><rect x="${x + 4}" y="${y + 3}" width="${w / 2 - 4}" height="3.4" rx="1.7" fill="#fff" opacity="0.7"/></g>`

  const ART = {
    'documents-stack': (u) => sheet(u, 28, 30, 36, 44, -9, 3, 0.75) + sheet(u, 46, 24, 38, 48, 7, 4) +
      `<circle cx="88" cy="30" r="9" fill="url(#${u}deep)"/><path d="M84 30l3 3 5-6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    'document-explain': (u) => sheet(u, 26, 24, 40, 50, -6, 4) +
      `<g transform="translate(64 34)"><path d="M14 0l3.4 8.6L26 12l-8.6 3.4L14 24l-3.4-8.6L2 12l8.6-3.4z" fill="url(#${u}deep)"/><path d="M30 18l1.8 4.4L36 24l-4.2 1.6L30 30l-1.8-4.4L24 24l4.2-1.6z" fill="var(--ill-1)" opacity="0.85"/></g>`,
    calendar: (u) => {
      let dots = ''
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) dots += `<circle cx="${42 + c * 12}" cy="${53 + r * 10}" r="3.4" fill="#fff" opacity="${r === 1 && c === 2 ? 1 : 0.5}"/>`
      return `<rect x="30" y="28" width="60" height="50" rx="12" fill="url(#${u}body)"/><rect x="30" y="28" width="60" height="15" rx="12" fill="var(--ill-2)" opacity="0.7"/><rect x="42" y="22" width="6" height="12" rx="3" fill="var(--ill-2)"/><rect x="72" y="22" width="6" height="12" rx="3" fill="var(--ill-2)"/>${dots}<circle cx="66" cy="63" r="7" fill="#fff" opacity="0.26"/>`
    },
    checklist: (u) => {
      let rows = ''
      ;[34, 46, 58].forEach((y, i) => {
        rows += `<rect x="42" y="${y}" width="9" height="9" rx="3" fill="${i < 2 ? `url(#${u}deep)` : '#fff'}" stroke="var(--ill-2)" stroke-opacity="0.4"/>`
        if (i < 2) rows += `<path d="M44.2 ${y + 4.4}l2 2 4-4.4" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`
        rows += `<rect x="56" y="${y + 2}" width="${i === 2 ? 12 : 20}" height="5" rx="2.5" fill="var(--ill-2)" opacity="0.32"/>`
      })
      return sheet(u, 34, 22, 46, 52, 0, 0) + rows
    },
    bell: (u) => `<path d="M60 24a18 18 0 0118 18v14l6 8H36l6-8V42a18 18 0 0118-18z" fill="url(#${u}body)"/><circle cx="60" cy="21" r="4.5" fill="var(--ill-2)"/><path d="M52 70a8 8 0 0016 0z" fill="var(--ill-2)" opacity="0.8"/><path d="M48 44a12 12 0 0110-11" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.7"/>`,
    pills: (u) => pill(u, 28, 54, 34, 16, -16) + pill(u, 58, 36, 32, 15, 22) +
      `<circle cx="42" cy="34" r="9" fill="url(#${u}deep)"/><ellipse cx="40" cy="31" rx="4" ry="2.6" fill="#fff" opacity="0.5"/><circle cx="90" cy="68" r="7" fill="var(--ill-1)"/>`,
    'lab-vials': (u) => [36, 54, 72].map((x, i) =>
      `<rect x="${x}" y="24" width="14" height="48" rx="7" fill="#fff" opacity="0.66" stroke="var(--ill-2)" stroke-opacity="0.3"/><path d="M${x} ${58 - i * 8}h14v${7 + i * 8}a7 7 0 01-7 7 7 7 0 01-7-7z" fill="url(#${u}deep)" opacity="${0.9 - i * 0.12}"/><rect x="${x - 1.5}" y="21" width="17" height="6" rx="3" fill="var(--ill-1)"/>`).join(''),
    shield: (u) => `<path d="M60 22l24 8v20c0 15-11 24-24 28-13-4-24-13-24-28V30z" fill="url(#${u}body)"/><path d="M60 22l24 8v20c0 15-11 24-24 28z" fill="var(--ill-2)" opacity="0.32"/><path d="M51 50l6 6 13-14" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
    chat: (u) => `<path d="M28 28h44a10 10 0 0110 10v14a10 10 0 01-10 10H46l-12 9v-9h-6a10 10 0 01-10-10V38a10 10 0 0110-10z" fill="url(#${u}body)"/><circle cx="40" cy="45" r="3.6" fill="#fff" opacity="0.85"/><circle cx="50" cy="45" r="3.6" fill="#fff" opacity="0.85"/><circle cx="60" cy="45" r="3.6" fill="#fff" opacity="0.85"/><path d="M76 50h20a8 8 0 018 8v10a8 8 0 01-8 8h-2v6l-8-6h-10a8 8 0 01-8-8V58a8 8 0 018-8z" fill="#fff" opacity="0.75" stroke="var(--ill-2)" stroke-opacity="0.3"/>`,
    books: (u) => `<rect x="28" y="34" width="15" height="42" rx="4" fill="url(#${u}deep)"/><rect x="46" y="26" width="15" height="50" rx="4" fill="url(#${u}body)"/><rect x="64" y="38" width="15" height="38" rx="4" fill="var(--ill-1)"/><rect x="82" y="46" width="13" height="30" rx="4" fill="#fff" opacity="0.7" stroke="var(--ill-2)" stroke-opacity="0.3"/><rect x="31" y="42" width="9" height="3" rx="1.5" fill="#fff" opacity="0.6"/><rect x="49" y="34" width="9" height="3" rx="1.5" fill="#fff" opacity="0.7"/>`,
  }

  // gradient ids are per instance, or every card would borrow the first card's colours
  let uidN = 0
  function illustration(name) {
    const u = 'i' + (uidN++) + '-'
    return `<svg class="ill" viewBox="0 0 120 96" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false"><defs>` +
      `<radialGradient id="${u}puff" cx="42%" cy="34%" r="72%"><stop offset="0%" stop-color="var(--ill-puff)" stop-opacity="0.95"/><stop offset="100%" stop-color="var(--ill-puff)" stop-opacity="0.2"/></radialGradient>` +
      `<linearGradient id="${u}body" x1="18%" y1="0%" x2="82%" y2="100%"><stop offset="0%" stop-color="#fff" stop-opacity="0.92"/><stop offset="42%" stop-color="var(--ill-1)"/><stop offset="100%" stop-color="var(--ill-2)"/></linearGradient>` +
      `<linearGradient id="${u}pale" x1="20%" y1="0%" x2="80%" y2="100%"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#fff" stop-opacity="0.6"/></linearGradient>` +
      `<linearGradient id="${u}deep" x1="20%" y1="0%" x2="80%" y2="100%"><stop offset="0%" stop-color="var(--ill-1)"/><stop offset="100%" stop-color="var(--ill-2)"/></linearGradient>` +
      `</defs><circle cx="60" cy="46" r="34" fill="url(#${u}puff)"/><ellipse cx="60" cy="84" rx="30" ry="5" fill="var(--ill-2)" opacity="0.16"/>${ART[name](u)}</svg>`
  }

  const ARROW = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'

  // ---- Hero: the four words rise in, one after another -----------------------------------
  const words = [...document.querySelectorAll('.hero-words .w')].map((el, i) => {
    const y = new Spring(26, SPRING_SOFT), o = new Spring(0, SPRING_SOFT)
    y.set(0, 0.15 + i * 0.12); o.set(1, 0.15 + i * 0.12)
    return { el, y, o }
  })
  loop.add((dt) => {
    const busy = stepAll(words.flatMap((w) => [w.y, w.o]), dt)
    for (const w of words) { w.el.style.transform = `translateY(${w.y.x}px)`; w.el.style.opacity = Math.max(0, Math.min(1, w.o.x)) }
    return busy
  })

  // ---- The rail (app: CardRail.jsx) ------------------------------------------------------
  const SPACING = 158, SWIPE = 44, FLICK = 520, STAGGER = 0.07
  const SWEEP = SPACING * 3.1, SWEEP_MS = 760, SWEEP_WIN = 3
  const n = CARDS.length
  const rail = document.getElementById('rail')
  const dotsEl = document.getElementById('dots')

  let focus = 0
  let revealed = false
  let sweeping = false
  let guide = 0          // the sweep offset: starts off to the right, springs to 0
  let drag = null        // { i, x, y, t, pid, dx }

  const els = CARDS.map((c, i) => {
    const el = document.createElement('div')
    el.className = 'card-small'
    el.setAttribute('role', 'button')
    el.dataset.i = i
    el.innerHTML =
      `<div class="card-face" style="${faceVars(c.topic)}">` +
        `<div class="cf-head"><div class="card-title">${c.title}</div><div class="card-hint">${c.hint}</div></div>` +
        `<div class="cf-art">${illustration(c.ill)}</div>` +
        `<div class="cf-act"><span class="cf-verb">${c.verb}</span><span class="cf-chip" aria-hidden="true">${ARROW}</span></div>` +
      `</div>`
    rail.appendChild(el)
    const dot = document.createElement('span')
    dot.className = 'rail-dot'
    dotsEl.appendChild(dot)
    return { el, dot, verb: el.querySelector('.cf-verb'), x: new Spring(0), y: new Spring(26), s: new Spring(0.84 * 0.94), o: new Spring(0), press: 1 }
  })

  const delta = (i) => { const raw = i - focus; return raw - n * Math.round(raw / n) }

  // where every card should be for the current focus; `entering` staggers the rise only
  function layout({ entering = false, snapHidden = true } = {}) {
    els.forEach((c, i) => {
      const d = delta(i), ad = Math.abs(d), center = d === 0
      const win = sweeping ? SWEEP_WIN : 1
      const scale = (center ? 1 : 0.84) * c.press
      const opacity = !revealed ? 0 : center ? 1 : ad <= win ? 0.5 : 0
      const tx = d * SPACING + guide
      const delay = entering ? STAGGER * Math.min(2, ad) : 0
      // a card nobody can see now or next step does not need a spring (app R13-2)
      if (snapHidden && ad > win + 1) { c.x.jump(tx); c.o.jump(opacity) }
      else { c.x.set(tx); c.o.set(opacity, delay) }
      c.y.set(revealed ? 0 : 26, delay)
      c.s.set(revealed ? scale : scale * 0.94, delay)

      const visible = revealed && ad <= 1
      c.el.classList.toggle('hi', center)
      c.el.style.zIndex = 10 - ad
      c.el.style.pointerEvents = visible ? 'auto' : 'none'
      c.el.tabIndex = center ? 0 : -1
      c.el.setAttribute('aria-hidden', ad <= 1 ? 'false' : 'true')
      c.el.setAttribute('aria-label', 'Open ' + CARDS[i].title + ' card')
      // the centred card's action verb wears the highlighter: the one thing to touch
      c.verb.innerHTML = center ? `<span class="hl">${CARDS[i].verb}</span>` : CARDS[i].verb
      c.dot.classList.toggle('on', center)
    })
    loop.wake()
  }

  loop.add((dt) => {
    const busy = stepAll(els.flatMap((c) => [c.x, c.y, c.s, c.o]), dt)
    const dx = drag ? drag.dx : 0
    for (const c of els) {
      c.el.style.transform = `translate3d(${c.x.x + dx}px, ${c.y.x}px, 0) scale(${c.s.x})`
      c.el.style.opacity = Math.max(0, Math.min(1, c.o.x))
    }
    return busy || !!drag
  })

  function setFocus(i, moveDomFocus) {
    focus = (i + n) % n
    layout()
    if (moveDomFocus) els[focus].el.focus({ preventScroll: true })
  }

  // first layout: everything sits back and invisible until the rail scrolls into view
  layout()

  // R10-3: the entry sweep. The rail arrives three cards off to the right and travels left,
  // decelerating into place on the first card: "this moves sideways, and you start here".
  function reveal() {
    if (revealed) return
    revealed = true
    if (!reduce) {
      sweeping = true
      guide = SWEEP
      els.forEach((c, i) => c.x.jump(delta(i) * SPACING + SWEEP))
      layout({ entering: true, snapHidden: false })
      setTimeout(() => { guide = 0; layout({ entering: true, snapHidden: false }) }, 30)
      setTimeout(() => { sweeping = false; layout() }, 30 + SWEEP_MS)
    } else {
      layout()
    }
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { reveal(); io.disconnect() }
    }, { threshold: 0.35 })
    io.observe(rail)
  } else reveal()

  // ---- Gestures: a swipe only when it clearly travels or flicks; anything else is a tap ----
  rail.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !e.isPrimary) return
    const cardEl = e.target.closest('.card-small')
    if (!cardEl) return
    const i = +cardEl.dataset.i
    drag = { i, x: e.clientX, y: e.clientY, t: performance.now(), pid: e.pointerId, dx: 0 }
    els[i].press = 0.985; layout()
    loop.wake()
  })
  window.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pid) return
    drag.dx = e.clientX - drag.x
  })
  function endGesture(e) {
    if (!drag || e.pointerId !== drag.pid) return
    const g = drag
    drag = null
    els[g.i].press = 1
    // hand the dragged offset to the springs so the release continues from where the finger was
    els.forEach((c) => { c.x.x += g.dx })
    if (e.type === 'pointercancel') { layout(); return }
    const dt = performance.now() - g.t
    const vx = (g.dx / Math.max(dt, 1)) * 1000
    if (g.dx < -SWIPE || (vx < -FLICK && g.dx < -14)) return setFocus(focus + 1)
    if (g.dx > SWIPE || (vx > FLICK && g.dx > 14)) return setFocus(focus - 1)
    // a tap on any visible card centres it and opens it, in one move
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

  // ---- The opened card (medium mode): a sheet that springs up from the bottom -------------
  const scrim = document.getElementById('scrim')
  const sheetEl = document.getElementById('sheet')
  const sheetY = new Spring(100, SPRING_SOFT)
  const scrimO = new Spring(0, SPRING)
  let openIdx = -1
  let lastFocus = null

  loop.add((dt) => {
    const busy = stepAll([sheetY, scrimO], dt)
    sheetEl.style.transform = `translateY(${sheetY.x}%)`
    scrim.style.opacity = Math.max(0, Math.min(1, scrimO.x))
    if (!busy && openIdx === -1 && !sheetEl.hidden) { sheetEl.hidden = true; scrim.hidden = true }
    return busy
  })

  function openCard(i) {
    const c = CARDS[i]
    openIdx = i
    lastFocus = document.activeElement
    sheetEl.setAttribute('style', faceVars(c.topic))
    document.getElementById('sheet-art').innerHTML = illustration(c.ill)
    document.getElementById('sheet-title').textContent = c.title
    document.getElementById('sheet-hint').textContent = c.hint
    document.getElementById('sheet-rows').innerHTML = c.rows.map((r) => `<li><span class="dot"></span>${r}</li>`).join('')
    sheetEl.hidden = false; scrim.hidden = false
    sheetEl.style.pointerEvents = scrim.style.pointerEvents = 'auto'
    sheetY.jump(100); scrimO.jump(0)
    sheetY.set(0); scrimO.set(1)
    document.body.style.overflow = 'hidden'
    loop.wake()
    document.getElementById('sheet-close').focus({ preventScroll: true })
  }
  function closeCard() {
    if (openIdx === -1) return
    openIdx = -1
    // the page is usable the moment you close; the sheet just finishes sliding away
    sheetEl.style.pointerEvents = scrim.style.pointerEvents = 'none'
    sheetY.set(100); scrimO.set(0)
    document.body.style.overflow = ''
    loop.wake()
    if (reduce) { sheetEl.hidden = true; scrim.hidden = true }
    if (lastFocus) lastFocus.focus({ preventScroll: true })
  }
  scrim.addEventListener('click', closeCard)
  document.getElementById('sheet-close').addEventListener('click', closeCard)
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCard() })

  // ---- Small things: top bar edge, about reveal, sign-up, year ----------------------------
  const topbar = document.querySelector('.topbar')
  const onScroll = () => topbar.classList.toggle('scrolled', window.scrollY > 8)
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll()

  const revealEls = document.querySelectorAll('.about .lede, .about .pillars li, .optin')
  revealEls.forEach((el) => el.classList.add('reveal'))
  if ('IntersectionObserver' in window && !reduce) {
    const io2 = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io2.unobserve(e.target) }
    }), { threshold: 0.2 })
    revealEls.forEach((el) => io2.observe(el))
  } else revealEls.forEach((el) => el.classList.add('in'))

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
          body: JSON.stringify({ email, source: 'website-v1' }),
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
