// Stronger landing page: the set calculator, tabs, entrances and the header ink.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Type a set: the same arithmetic the app does ---- */
  const input = $('#set');
  const out = { orm: $('#a-1rm'), bar: $('#a-bar'), plates: $('#a-plates'), next: $('#a-next') };
  const fmt = n => String(Math.round(n * 10) / 10);
  const KIT = {
    kg: { bar: 20, plates: [25, 20, 15, 10, 5, 2.5, 1.25], step: 2.5 },
    lb: { bar: 45, plates: [45, 35, 25, 10, 5, 2.5], step: 5 },
  };

  function parse(text) {
    const m = text.replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(kg|lbs?|)\s*(?:x|×|\*|for|by)\s*(\d+)/i);
    if (!m) return null;
    const unit = m[2].toLowerCase().startsWith('lb') ? 'lb' : 'kg';
    return { weight: parseFloat(m[1]), reps: parseInt(m[3], 10), unit };
  }

  // Epley, as in the app: a single rep is its own max.
  const oneRepMax = (w, r) => (r <= 0 || w <= 0 ? 0 : r === 1 ? w : w * (1 + r / 30));

  function platesPerSide(weight, kit) {
    let side = (weight - kit.bar) / 2;
    if (side < 0) return 'Lighter than the bar';
    if (side === 0) return 'Just the bar';
    const used = [];
    for (const p of kit.plates) while (side >= p - 1e-9) { used.push(p); side -= p; }
    const text = used.map(fmt).join(' + ');
    if (side > 1e-9) return used.length ? `${text}, ${fmt(side * 2)} short` : 'No plates that small';
    return text;
  }

  // Double progression on an 8–12 target: one more rep, then more weight and back to 8.
  function nextTime({ weight, reps, unit }, kit) {
    if (reps >= 12) return `${fmt(weight + kit.step)} ${unit} × 8`;
    return `${fmt(weight)} ${unit} × ${reps + 1}`;
  }

  let last = '';
  function update() {
    const set = parse(input.value);
    let vals;
    if (!set || set.reps < 1 || set.reps > 100 || set.weight <= 0 || set.weight > 1000) {
      vals = ['…', '…', 'Try 80 kg × 8'];
      out.bar.textContent = 'Each side of a 20 kg bar';
    } else {
      const kit = KIT[set.unit];
      out.bar.textContent = `Each side of a ${kit.bar} ${set.unit} bar`;
      vals = [`${fmt(oneRepMax(set.weight, set.reps))} ${set.unit}`, platesPerSide(set.weight, kit), nextTime(set, kit)];
    }
    const key = vals.join('|');
    if (key === last) return;
    last = key;
    [out.orm, out.plates, out.next].forEach((el, i) => {
      if (el.textContent === vals[i]) return;
      el.textContent = vals[i];
      const row = el.parentElement;
      row.classList.remove('flash');
      void row.offsetWidth;
      row.classList.add('flash');
    });
  }
  if (input) {
    input.addEventListener('input', update);
    $$('.examples button').forEach(b => b.addEventListener('click', () => {
      input.value = b.dataset.set;
      update();
    }));
    update();
  }

  /* ---- Tabs ---- */
  const tabs = $$('[role="tab"]');
  const panels = $$('[role="tabpanel"]');
  function select(tab, focus) {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach(p => {
      const on = p.id === tab.getAttribute('aria-controls');
      p.hidden = !on;
      if (on) {
        $$('dl > div', p).forEach((row, i) => row.style.setProperty('--i', i));
        p.classList.remove('swap');
        void p.offsetWidth;
        p.classList.add('swap');
      }
    });
    if (focus) tab.focus();
    tab.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduced ? 'auto' : 'smooth' });
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', e => {
      const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      select(tabs[(i + d + tabs.length) % tabs.length], true);
    });
  });
  panels.forEach((p, i) => { p.hidden = i !== 0; });

  /* ---- Entrances: parts of each chapter arrive in reading order ---- */
  const plan = [
    ['.hero-foot > *', 'rise'],
    ['.try-label, .try-field, .answer-row, .examples', 'rise'], ['.try-clip', 'rise'],
    ['.t-head, .t-figure, .t-list, .t-say', 'rise'], ['.t-shot', 'open'],
    ['.import h2, .stage p, .import-note', 'rise'], ['.seg', 'grow'],
    ['.ev-head > *, .tabs button', 'rise'],
    ['.questions h2, .faq details', 'rise'],
    ['.get-sub, .get-word', 'rise'],
    ['.foot-name, .foot-places li, .foot-cols > *, .foot-last', 'rise'],
  ];
  const watched = [];
  plan.forEach(([sel, kind]) => {
    const groups = new Map();
    $$(sel).forEach(el => {
      const ch = el.closest('.chapter');
      const n = groups.get(ch) || 0;
      groups.set(ch, n + 1);
      el.setAttribute('data-' + kind, '');
      el.style.setProperty('--d', Math.min(n, 7));
      watched.push(el);
    });
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    watched.forEach(el => io.observe(el));
  } else {
    watched.forEach(el => el.classList.add('in'));
  }
  // Never leave anything hidden if the observer misses it.
  setTimeout(() => watched.forEach(el => {
    if (el.getBoundingClientRect().top < innerHeight) el.classList.add('in');
  }), 2500);

  /* ---- The fixed corners take the ink of the chapter under them ---- */
  const top = $('#top');
  const chapters = $$('.chapter');
  let ticking = false;
  function ink() {
    ticking = false;
    const y = 40;
    const ch = chapters.find(c => {
      const r = c.getBoundingClientRect();
      return r.top <= y && r.bottom > y;
    });
    if (!ch) return;
    top.style.setProperty('--top-bg', getComputedStyle(ch).backgroundColor);
    top.style.setProperty('--top-ink', ch.dataset.ink);
    top.style.setProperty('--top-btn', ch.dataset.btn);
    top.style.setProperty('--top-btn-ink', ch.dataset.btnInk);
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(ink); } }, { passive: true });
  addEventListener('resize', ink);
  ink();

  /* ---- The clip plays only while it is on screen ---- */
  const clip = $('.try-clip video');
  if (clip) {
    if (reduced) { clip.removeAttribute('autoplay'); clip.pause(); clip.controls = true; }
    else if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { e.isIntersecting ? clip.play().catch(() => {}) : clip.pause(); }, { threshold: 0.25 }).observe(clip);
    }
  }
})();
