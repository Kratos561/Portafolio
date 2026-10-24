/* ============================================================
   AISAK 3D — Proyectos desde data/projects.json
   Rueda de tarjetas (inspirada en un abanico que orbita), ficha de
   detalle y un índice mínimo para volver a cualquier proyecto.
   Contenedores en el HTML:
     [data-projects="3d" | "video" | "featured"]   rueda de proyectos
     [data-filters="3d" | "video"]                  barra de filtros (opcional)
     [data-count="3d" | "video"]                    texto «N piezas»
     img[data-door-bg="3d" | "video"]               fondo de las puertas
   Los proyectos se añaden desde admin.html (panel del propietario).
   Al instante: en la web publicada los datos se leen de la API de
   GitHub (cambian en cuanto el panel publica) y, si una imagen nueva
   aún no está en GitHub Pages, se carga desde raw.githubusercontent.
   Si la API falla o se agota su límite, se usa data/projects.json.
   La rueda es virtual: solo dibuja las tarjetas visibles y, si hay
   suficientes, gira en bucle. Funciona con 1, 5 o 500 proyectos.
   ============================================================ */
(function () {
  'use strict';
  const DATA_URL = 'data/projects.json';
  const REPO = 'Kratos561/Portafolio';
  const API_URL = 'https://api.github.com/repos/' + REPO + '/contents/' + DATA_URL + '?ref=main';
  const RAW_BASE = 'https://raw.githubusercontent.com/' + REPO + '/main/';
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (id, fill) => '<svg class="icon' + (fill ? ' icon--fill' : '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>';
  const ytThumb = (id, q) => 'https://i.ytimg.com/vi/' + id + '/' + (q || 'hqdefault') + '.jpg';
  const pieces = (n) => n + (n === 1 ? ' pieza' : ' piezas');
  const pad2 = (n) => String(n).padStart(2, '0');
  const clamp = (a, b, x) => Math.min(b, Math.max(a, x));
  const smooth = (a, b, x) => { const t = clamp(0, 1, (x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const mod = (a, n) => ((a % n) + n) % n;

  const SECTION_LABEL = { '3d': 'Arte 3D', video: 'Video' };
  const RING_LABEL = { '3d': 'Arte 3D · AISAK 3D', video: 'Video · AISAK 3D', featured: 'Destacado · AISAK 3D' };
  const valid = (p) => p && p.id && p.title && (p.section === '3d' ? p.image && p.image.src : p.section === 'video' ? p.youtube : false);

  function linkOf(p) {
    if (p.link) return { href: p.link, label: /artstation/i.test(p.link) ? 'ArtStation' : /youtu/i.test(p.link) ? 'YouTube' : 'Ver enlace' };
    if (p.section === 'video') return { href: 'https://youtu.be/' + p.youtube, label: 'YouTube' };
    return null;
  }
  function chips(p) {
    const out = [];
    if (p.year) out.push(p.year);
    if (p.tools) out.push(p.tools);
    (p.tags || []).forEach((t) => t && out.push(t));
    return out;
  }
  const subOf = (p, showSection) => [showSection ? SECTION_LABEL[p.section] : p.category, p.year].filter(Boolean).join(' · ');

  /* Imágenes recién publicadas: si GitHub Pages todavía no las tiene, se piden a raw.githubusercontent */
  function rawFallback(img) {
    const src = img.getAttribute('src') || '';
    if (isLocal || /^(https?:|data:|blob:)/.test(src) || img.dataset.raw) return;
    img.addEventListener('error', () => { img.dataset.raw = '1'; img.src = RAW_BASE + src.replace(/^\.?\//, ''); }, { once: true });
  }

  /* Miniaturas de YouTube en alta cuando están cerca de la vista */
  const thumbIO = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      thumbIO.unobserve(e.target);
      const img = e.target;
      const hi = new Image();
      hi.onload = () => { if (hi.naturalWidth > 120) img.src = hi.src; }; // 120px = YouTube «sin miniatura»
      hi.src = ytThumb(img.dataset.yt, 'maxresdefault');
    });
  }, { rootMargin: '300px 0px' }) : null;

  /* ============================================================
     RUEDA DE PROYECTOS
     Cada tarjeta gira alrededor de un centro por debajo de la vista:
     rotate(ángulo) translateY(-radio). La activa queda arriba, recta.
     ============================================================ */
  let uid = 0;
  function Wheel(host, opts) {
    const n = uid++;
    const listId = 'wheel-list-' + n;
    const ringId = 'wheel-ring-' + n;
    const storeKey = 'aisak:wheel:' + location.pathname + ':' + opts.kind;
    const ringText = (RING_LABEL[opts.kind] || 'AISAK 3D') + ' · ';

    host.classList.add('wheel');
    host.innerHTML =
      '<div class="wheel__stage" role="group" aria-roledescription="carrusel" aria-label="' + esc(opts.label) + '" tabindex="0">' +
        '<div class="wheel__hub" aria-hidden="true"><svg viewBox="-100 -100 200 200" focusable="false">' +
          '<circle class="wheel__ring" r="78"/><circle class="wheel__ring wheel__ring--in" r="58"/>' +
          '<path id="' + ringId + '" d="M -90 0 A 90 90 0 1 1 90 0 A 90 90 0 1 1 -90 0" fill="none"/>' +
          '<text class="wheel__ringtext"><textPath href="#' + ringId + '" textLength="560" lengthAdjust="spacing">' + esc(ringText.repeat(4)) + '</textPath></text>' +
        '</svg></div>' +
        '<div class="wheel__cards"></div>' +
        '<div class="wheel__pointer" aria-hidden="true"><span class="wheel__tri"></span><span class="wheel__label"></span><span class="wheel__sub"></span></div>' +
      '</div>' +
      '<div class="wheel__nav">' +
        '<button type="button" class="wheel__btn" data-w="prev" aria-label="Proyecto anterior">' + icon('i-prev') + '</button>' +
        '<div class="wheel__index">' +
          '<button type="button" class="wheel__count" data-w="index" aria-expanded="false" aria-controls="' + listId + '">' +
            '<span class="sr-only">Ir a un proyecto. Ahora: </span><span class="wheel__num">01</span><span class="wheel__sep" aria-hidden="true">/</span><span class="wheel__total">01</span>' + icon('i-next') +
          '</button>' +
          '<ol class="wheel__list" id="' + listId + '" hidden></ol>' +
        '</div>' +
        '<button type="button" class="wheel__btn" data-w="next" aria-label="Proyecto siguiente">' + icon('i-next') + '</button>' +
      '</div>' +
      '<div class="works-empty wheel__empty" hidden><p>Pronto habrá proyectos aquí.</p><a class="btn" href="#contacto">Encargar un proyecto</a></div>' +
      '<p class="sr-only" aria-live="polite" data-w="live"></p>';

    const stage = host.querySelector('.wheel__stage');
    const deck = host.querySelector('.wheel__cards');
    const nav = host.querySelector('.wheel__nav');
    const listEl = host.querySelector('.wheel__list');
    const countBtn = host.querySelector('.wheel__count');
    const labelEl = host.querySelector('.wheel__label');
    const subEl = host.querySelector('.wheel__sub');
    const liveEl = host.querySelector('[data-w="live"]');
    const emptyEl = host.querySelector('.wheel__empty');

    // items = proyectos reales (N). Con 3 o más la rueda gira en bucle y, si hacen falta para
    // llenar el arco, repite las tarjetas (copias decorativas: V = N × reps). Con 1 o 2, sin bucle.
    let items = [], cards = [], N = 0, V = 0, reps = 1, loop = false;
    let pos = 0, target = 0, G = null;
    let raf = 0, last = 0, visible = false, idleSince = 0, sway = 0, shown = -1, announced = -1;
    let drag = null, suppressClick = false, wheelTimer = 0;

    /* ---------- Geometría (se recalcula al cambiar el tamaño) ---------- */
    function measure() {
      const W = stage.clientWidth || window.innerWidth;
      const small = W < 640;
      const cw = small ? clamp(140, W * 0.44, 200) : clamp(170, W * 0.19, 250);
      const ch = cw * 4 / 3;
      const R = small ? cw * 1.95 : clamp(cw * 1.95, W * 0.36, cw * 2.5);
      const stepRad = (cw * 0.86) / R;
      const cy = 28 + ch * 0.07 + ch / 2 + R;
      const rr = Math.max(70, R - ch / 2 - 36);
      const maxA = Math.min(100, Math.asin(Math.min(1, (W / 2 + cw * 0.6) / R)) * 180 / Math.PI + 6);
      G = { W, cw, ch, R, stepRad, step: stepRad * 180 / Math.PI, cy, rr, maxA, px: R * stepRad };
      const s = stage.style;
      s.setProperty('--cw', cw.toFixed(1) + 'px');
      s.setProperty('--ch', ch.toFixed(1) + 'px');
      s.setProperty('--cy', cy.toFixed(1) + 'px');
      s.setProperty('--rr', rr.toFixed(1) + 'px');
      s.setProperty('--h', Math.round(Math.max(cy - rr * 0.32, cy - rr + 118)) + 'px');
      loop = N >= 3;
      const need = Math.ceil((2 * maxA) / G.step) + 3; // tarjetas para cubrir el arco visible
      return loop ? Math.max(1, Math.ceil(need / N)) : 1;
    }

    /* ---------- Posiciones (índices virtuales 0…V-1; real = virtual % N) ---------- */
    const offset = (v, p) => (loop ? mod(v - p + V / 2, V) - V / 2 : v - p);
    const vAt = (p) => (loop ? mod(Math.round(p), V) : clamp(0, N - 1, Math.round(p)));
    const idx = () => vAt(target) % N;

    function render(p) {
      for (let v = 0; v < V; v++) {
        const c = cards[v];
        const d = offset(v, p);
        const a = d * G.step;
        const abs = Math.abs(a);
        if (abs > G.maxA + G.step) {
          if (!c._off) { c.style.display = 'none'; c._off = true; }
          continue;
        }
        if (c._off) { c.style.display = ''; c._off = false; }
        const near = Math.max(0, 1 - Math.abs(d));
        c.style.transform = 'translate(-50%,-50%) rotate(' + a.toFixed(3) + 'deg) translateY(' + (-G.R).toFixed(1) + 'px) scale(' + (1 + 0.07 * near).toFixed(4) + ')';
        c.style.zIndex = String(200 - Math.round(Math.abs(d) * 10));
        c.style.opacity = (1 - smooth(G.maxA - G.step, G.maxA + G.step, abs)).toFixed(3);
        c.style.setProperty('--dim', Math.min(1, Math.abs(d) * 0.42).toFixed(3));
      }
      const cur = vAt(p);
      if (cur !== shown) showActive(cur);
    }

    function showActive(v) {
      if (cards[shown]) cards[shown].classList.remove('is-active');
      shown = v;
      const i = v % N;
      const p = items[i];
      if (!p || !cards[v]) return;
      cards[v].classList.add('is-active');
      labelEl.textContent = p.title;
      subEl.textContent = subOf(p, opts.showSection);
      host.querySelector('.wheel__num').textContent = pad2(i + 1);
      listEl.querySelectorAll('[data-goto]').forEach((b) => b.setAttribute('aria-current', String(+b.dataset.goto === i)));
    }

    /* ---------- Bucle de animación (solo mientras está en pantalla) ---------- */
    function tick(t) {
      raf = 0;
      if (!N || !G) return;
      const dt = last ? Math.min(64, t - last) : 16;
      last = t;
      if (!drag) {
        const k = 1 - Math.pow(1 - (reduce ? 1 : 0.15), dt / 16.7);
        pos += (target - pos) * k;
        if (Math.abs(target - pos) < 0.0006) pos = target;
      }
      const settled = !drag && pos === target;
      if (settled && !idleSince) idleSince = t;
      if (!settled) idleSince = 0;
      // Vaivén mínimo en reposo (como la referencia); nunca con «reducir movimiento»
      const swayTarget = !reduce && settled && t - idleSince > 900 ? 1 : 0;
      sway += (swayTarget - sway) * Math.min(1, dt * 0.003);
      render(pos + sway * 0.06 * Math.sin(t * 0.0012));
      if (settled) settle();
      const busy = !settled || (!reduce && (sway > 0.001 || swayTarget));
      if (busy && visible && !document.hidden) raf = requestAnimationFrame(tick);
    }
    const kick = () => { if (!raf && visible) { last = 0; raf = requestAnimationFrame(tick); } };

    function settle() {
      const i = idx();
      if (announced === i) return;
      announced = i;
      const p = items[i];
      liveEl.textContent = pad2(i + 1) + ' de ' + pad2(N) + ': ' + p.title;
      try { sessionStorage.setItem(storeKey, p.id); } catch (_) { /* sin almacenamiento */ }
    }

    // Gira hasta el proyecto real i por el camino más corto
    function goTo(i, instant) {
      if (!N) return;
      i = clamp(0, N - 1, i);
      if (loop) {
        const base = Math.round(target);
        target = base + (mod(i - mod(base, N) + N / 2, N) - N / 2);
      } else {
        target = i;
      }
      if (instant || reduce) pos = target;
      if (!visible || instant) render(pos);
      kick();
    }
    // Gira hasta una tarjeta concreta (original o copia) por el camino más corto
    function goToCard(v) {
      if (!loop) return goTo(v);
      const base = Math.round(target);
      target = base + (mod(v - mod(base, V) + V / 2, V) - V / 2);
      kick();
    }
    const step = (d) => {
      if (!N) return;
      target = Math.round(target) + d;
      if (!loop) target = clamp(0, N - 1, target);
      kick();
    };

    /* ---------- Tarjetas ---------- */
    function cardHTML(p, i, v) {
      const isVideo = p.section === 'video';
      const src = isVideo ? ytThumb(p.youtube) : p.image.src;
      const copy = v >= N; // copia decorativa: fuera del orden de tabulación y oculta a lectores de pantalla
      return '<button type="button" class="wcard" data-v="' + v + '" data-r="' + i + '" data-open="' + esc(p.id) + '"' +
        (copy ? ' tabindex="-1" aria-hidden="true"' : ' aria-label="' + pad2(i + 1) + ' de ' + pad2(N) + ': ' + esc(p.title) + '. Ver detalles"') + '>' +
        '<span class="wcard__media"><img src="' + esc(src) + '" alt="" loading="lazy" decoding="async" draggable="false"' + (isVideo ? ' data-yt="' + esc(p.youtube) + '"' : '') + ' /></span>' +
        '<span class="wcard__top"><span class="wcard__n">' + pad2(i + 1) + '</span><span class="wcard__type">' + icon(isVideo ? 'i-play' : 'i-expand', isVideo) + '</span></span>' +
        '<span class="wcard__bottom">' +
          (p.category || opts.showSection ? '<span class="wcard__cat">' + esc(opts.showSection ? SECTION_LABEL[p.section] : p.category) + '</span>' : '') +
          '<span class="wcard__title">' + esc(p.title) + '</span>' +
        '</span>' +
      '</button>';
    }

    function buildCards(r) {
      reps = r;
      V = N * reps;
      let html = '';
      for (let v = 0; v < V; v++) html += cardHTML(items[v % N], v % N, v);
      deck.innerHTML = html;
      cards = Array.from(deck.children);
      cards.forEach((c) => {
        const img = c.querySelector('img');
        if (img.dataset.yt && thumbIO) thumbIO.observe(img); else rawFallback(img);
      });
      shown = -1;
    }

    function setList(list) {
      items = list.slice();
      N = items.length;
      shown = -1; announced = -1;
      emptyEl.hidden = N > 0;
      stage.hidden = N === 0;
      nav.hidden = N < 2;
      closeIndex();
      if (!N) { deck.innerHTML = ''; cards = []; V = 0; return; }
      host.querySelector('.wheel__total').textContent = pad2(N);
      listEl.innerHTML = items.map((p, i) =>
        '<li><button type="button" data-goto="' + i + '"><span class="wheel__li-n">' + pad2(i + 1) + '</span><span class="wheel__li-t">' + esc(p.title) + '</span>' +
        (subOf(p, opts.showSection) ? '<span class="wheel__li-s">' + esc(subOf(p, opts.showSection)) + '</span>' : '') + '</button></li>').join('');
      buildCards(measure());
      // Vuelve al último proyecto visto en esta página (si sigue existiendo)
      let start = 0;
      try {
        const saved = sessionStorage.getItem(storeKey);
        const k = items.findIndex((p) => p.id === saved);
        if (k >= 0) start = k;
      } catch (_) { /* nada */ }
      target = start;
      pos = reduce ? start : start - (loop ? 2.2 : Math.min(1.2, N - 1 + 0.6)); // entrada: la rueda gira hasta su sitio
      render(pos);
      kick();
    }

    /* ---------- Índice mínimo: «03 / 10» abre la lista para saltar a cualquiera ---------- */
    function openIndex() {
      listEl.hidden = false;
      countBtn.setAttribute('aria-expanded', 'true');
      const cur = listEl.querySelector('[aria-current="true"]') || listEl.querySelector('button');
      if (cur) { cur.scrollIntoView({ block: 'nearest' }); cur.focus(); }
    }
    function closeIndex(focusBtn) {
      if (listEl.hidden) return;
      listEl.hidden = true;
      countBtn.setAttribute('aria-expanded', 'false');
      if (focusBtn) countBtn.focus();
    }
    nav.addEventListener('click', (e) => {
      const b = e.target.closest('[data-w],[data-goto]');
      if (!b) return;
      if (b.dataset.goto != null) { goTo(+b.dataset.goto); closeIndex(true); return; }
      if (b.dataset.w === 'prev') step(-1);
      if (b.dataset.w === 'next') step(1);
      if (b.dataset.w === 'index') { if (listEl.hidden) openIndex(); else closeIndex(); }
    });
    listEl.addEventListener('keydown', (e) => {
      const btns = Array.from(listEl.querySelectorAll('button'));
      const k = btns.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); closeIndex(true); }
      if (e.key === 'ArrowDown' && k > -1) { e.preventDefault(); (btns[k + 1] || btns[0]).focus(); }
      if (e.key === 'ArrowUp' && k > -1) { e.preventDefault(); (btns[k - 1] || btns[btns.length - 1]).focus(); }
    });
    document.addEventListener('click', (e) => { if (!host.querySelector('.wheel__index').contains(e.target)) closeIndex(); });

    /* ---------- Teclado ---------- */
    stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      if (e.key === 'Home') { e.preventDefault(); goTo(0); }
      if (e.key === 'End') { e.preventDefault(); goTo(N - 1); }
      if ((e.key === 'Enter' || e.key === ' ') && e.target === stage) { e.preventDefault(); open(idx()); }
    });
    deck.addEventListener('focusin', (e) => {
      const c = e.target.closest('.wcard');
      if (c && !drag && c.matches(':focus-visible')) goTo(+c.dataset.r); // solo foco por teclado
    });

    /* ---------- Arrastrar / deslizar (con inercia) ---------- */
    stage.addEventListener('pointerdown', (e) => {
      if (!N || (e.pointerType === 'mouse' && e.button !== 0)) return;
      suppressClick = false;
      drag = null;
      const start = { x: e.clientX, y: e.clientY, pos, id: e.pointerId, samples: [{ x: e.clientX, t: e.timeStamp }], active: false };
      const move = (ev) => {
        if (ev.pointerId !== start.id) return;
        const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
        if (!start.active) {
          if (Math.abs(dx) < 7 || Math.abs(dx) < Math.abs(dy)) {
            if (Math.abs(dy) > 10) end(ev);
            return;
          }
          start.active = true;
          drag = start;
          suppressClick = true;
          stage.classList.add('is-drag');
          try { stage.setPointerCapture(start.id); } catch (_) { /* nada */ }
        }
        let p = start.pos - dx / G.px;
        if (!loop) { if (p < 0) p *= 0.35; else if (p > N - 1) p = N - 1 + (p - (N - 1)) * 0.35; }
        pos = p;
        start.samples.push({ x: ev.clientX, t: ev.timeStamp });
        if (start.samples.length > 6) start.samples.shift();
        render(pos);
      };
      const end = (ev) => {
        if (ev && ev.pointerId !== start.id) return;
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', end);
        if (!start.active) return;
        const s = start.samples, a = s[0], b = s[s.length - 1];
        const v = b.t > a.t ? -(b.x - a.x) / (b.t - a.t) / G.px : 0; // tarjetas por ms
        target = Math.round(pos + clamp(-5, 5, v * 140));
        if (!loop) target = clamp(0, N - 1, target);
        drag = null;
        stage.classList.remove('is-drag');
        kick();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    });
    // Un arrastre no debe abrir la ficha
    stage.addEventListener('click', (e) => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); suppressClick = false; } }, true);

    // Trackpad: desplazamiento horizontal gira la rueda (el vertical sigue bajando la página)
    stage.addEventListener('wheel', (e) => {
      if (!N || Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 2) return;
      e.preventDefault();
      target += e.deltaX / G.px;
      if (!loop) target = clamp(-0.3, N - 0.7, target);
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => { target = Math.round(target); if (!loop) target = clamp(0, N - 1, target); kick(); }, 140);
      kick();
    }, { passive: false });

    /* ---------- Abrir la ficha ---------- */
    function open(i, from) {
      opts.onOpen(items, i, from || cards[vAt(target)], (j) => { goTo(j, true); return cards[vAt(target)]; });
    }
    deck.addEventListener('click', (e) => {
      const c = e.target.closest('.wcard');
      if (!c) return;
      goToCard(+c.dataset.v);
      open(+c.dataset.r, c);
    });

    /* ---------- Visibilidad y tamaño ---------- */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) kick(); }, { rootMargin: '80px 0px' }).observe(stage);
    } else { visible = true; }
    if ('ResizeObserver' in window) {
      let lastW = 0;
      new ResizeObserver(() => {
        const w = stage.clientWidth;
        if (!N || w === lastW) return;
        lastW = w;
        const r = measure();
        if (r !== reps) { const keep = idx(); buildCards(r); target = pos = keep; }
        render(pos); kick();
      }).observe(stage);
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });

    return { setList, goTo, items: () => items };
  }

  /* ---------- Filtros ---------- */
  function Filters(el, list, onChange) {
    const cats = [];
    list.forEach((p) => { if (p.category && !cats.includes(p.category)) cats.push(p.category); });
    if (cats.length < 2) return;
    const btn = (val, label, n, on) => '<button type="button" class="filter" data-filter="' + esc(val) + '" aria-pressed="' + on + '">' + esc(label) + ' <span>' + n + '</span></button>';
    el.innerHTML = btn('*', 'Todos', list.length, true) + cats.map((c) => btn(c, c, list.filter((p) => p.category === c).length, false)).join('');
    el.hidden = false;
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-filter]');
      if (!b) return;
      el.querySelectorAll('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const f = b.dataset.filter;
      onChange(f === '*' ? list : list.filter((p) => p.category === f));
    });
  }

  /* ---------- Ficha de detalle (dialog nativo: foco atrapado y Esc incluidos) ---------- */
  const Viewer = (function () {
    let dlg, stage, list = [], idx = 0, opener = null, sync = null, touchX = null;

    function build() {
      dlg = document.createElement('dialog');
      dlg.className = 'viewer';
      dlg.setAttribute('aria-labelledby', 'viewer-title');
      dlg.innerHTML =
        '<div class="viewer__stage"></div>' +
        '<aside class="viewer__info">' +
          '<div class="viewer__top"><span class="pill pill--muted viewer__count"></span><button type="button" class="viewer__close" data-v="close" aria-label="Cerrar">' + icon('i-close') + '</button></div>' +
          '<div class="viewer__body"></div>' +
          '<div class="viewer__nav">' +
            '<button type="button" class="btn" data-v="prev" aria-label="Proyecto anterior">' + icon('i-prev') + 'Anterior</button>' +
            '<button type="button" class="btn" data-v="next" aria-label="Proyecto siguiente">Siguiente' + icon('i-next') + '</button>' +
          '</div>' +
        '</aside>';
      document.body.appendChild(dlg);
      stage = dlg.querySelector('.viewer__stage');
      dlg.addEventListener('click', (e) => {
        const v = e.target.closest('[data-v]');
        if (v) { if (v.dataset.v === 'close') close(); else go(v.dataset.v === 'next' ? 1 : -1); return; }
        if (e.target === dlg) close(); // clic en el fondo
      });
      dlg.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      });
      dlg.addEventListener('close', cleanup);
      stage.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
      stage.addEventListener('touchend', (e) => {
        if (touchX == null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        touchX = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      });
    }

    function show() {
      const p = list[idx];
      const lk = linkOf(p);
      if (p.section === 'video') {
        stage.innerHTML = '<div class="viewer__frame"><iframe src="https://www.youtube-nocookie.com/embed/' + esc(p.youtube) + '?autoplay=1&rel=0" title="' + esc(p.title) + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
      } else {
        stage.innerHTML = '<img class="viewer__img" src="' + esc(p.image.src) + '" alt="' + esc(p.title + (p.description ? ' — ' + p.description : '')) + '" width="' + (p.image.width || '') + '" height="' + (p.image.height || '') + '" />';
      }
      const vImg = stage.querySelector('img');
      if (vImg) rawFallback(vImg);
      dlg.querySelector('.viewer__count').textContent = pad2(idx + 1) + ' / ' + pad2(list.length);
      dlg.querySelector('.viewer__body').innerHTML =
        (p.category ? '<span class="pill">' + esc(p.category) + '</span>' : '') +
        '<h2 id="viewer-title" class="viewer__title">' + esc(p.title) + '</h2>' +
        (p.description ? '<p class="viewer__desc">' + esc(p.description) + '</p>' : '') +
        (chips(p).length ? '<ul class="viewer__tags">' + chips(p).map((t) => '<li class="pill pill--muted">' + esc(t) + '</li>').join('') + '</ul>' : '') +
        (lk ? '<a class="btn btn--red viewer__link" href="' + esc(lk.href) + '" target="_blank" rel="noopener">Ver en ' + esc(lk.label) + icon('i-ext') + '<span class="sr-only">(abre en una pestaña nueva)</span></a>' : '');
      const single = list.length < 2;
      dlg.querySelectorAll('[data-v="prev"],[data-v="next"]').forEach((b) => { b.hidden = single; });
      try { history.replaceState(null, '', '#ver=' + encodeURIComponent(p.id)); } catch (_) { /* file:// */ }
      if (sync) { const el = sync(idx); if (el) opener = el; } // la rueda acompaña a la ficha
    }

    function go(d) {
      if (list.length < 2) return;
      idx = (idx + d + list.length) % list.length;
      show();
    }
    function open(l, i, from, onNav) {
      if (!dlg) build();
      list = l; idx = i; opener = from || null; sync = onNav || null;
      const doOpen = () => {
        show();
        document.documentElement.classList.add('has-viewer');
        if (!dlg.open) dlg.showModal();
      };
      const media = from && from.querySelector('img');
      // La miniatura de la tarjeta se transforma en la imagen/video de la ficha (si el navegador lo permite)
      if (media && document.startViewTransition && !reduce && document.visibilityState === 'visible') {
        let opened = false;
        const openOnce = () => { if (opened) return false; opened = true; doOpen(); return true; };
        media.style.viewTransitionName = 'pf-media';
        let vt = null;
        try {
          vt = document.startViewTransition(() => {
            media.style.viewTransitionName = '';
            if (!openOnce()) return;
            const t = stage.firstElementChild;
            if (t) t.style.viewTransitionName = 'pf-media';
          });
        } catch (_) { media.style.viewTransitionName = ''; openOnce(); }
        // Red de seguridad: si el navegador no empieza la transición enseguida, se abre igual (un toque nunca se pierde)
        setTimeout(() => { if (!opened) { media.style.viewTransitionName = ''; if (vt) vt.skipTransition(); openOnce(); dlg.querySelector('.viewer__close').focus(); } }, 350);
        const done = () => { const t = stage.firstElementChild; if (t) t.style.viewTransitionName = ''; if (dlg.open) dlg.querySelector('.viewer__close').focus(); };
        if (vt) vt.finished.then(done, done); else done();
      } else {
        doOpen();
        dlg.querySelector('.viewer__close').focus();
      }
    }
    function close() { if (dlg && dlg.open) { stage.innerHTML = ''; dlg.close(); } }
    function cleanup() {
      stage.innerHTML = ''; // detiene el video (también al cerrar con Esc)
      document.documentElement.classList.remove('has-viewer');
      try { history.replaceState(null, '', location.pathname + location.search); } catch (_) { /* file:// */ }
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    }
    return { open };
  })();

  /* ---------- Carga ---------- */
  const targets = Array.from(document.querySelectorAll('[data-projects]'));
  const needsData = targets.length || document.querySelector('[data-count],[data-door-bg]');
  if (!needsData) return;

  // Petición con tiempo límite; 'no-cache' revalida con ETag (un 304 de GitHub no gasta límite)
  const getJSON = (url, opts, ms) => {
    const ctl = 'AbortController' in window ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), ms) : 0;
    return fetch(url, Object.assign({ cache: 'no-cache', signal: ctl ? ctl.signal : undefined }, opts))
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .finally(() => clearTimeout(timer));
  };
  const local = () => getJSON(DATA_URL, {}, 10000);
  const load = isLocal ? local() : getJSON(API_URL, { headers: { Accept: 'application/vnd.github.raw+json' } }, 4000).catch(local);

  load
    .then((data) => {
      const all = (data.projects || []).filter(valid);
      const bySection = (s) => all.filter((p) => p.section === s);
      const featured = (data.featured || []).map((id) => all.find((p) => p.id === id)).filter(Boolean);
      const wheels = [];

      targets.forEach((el) => {
        const kind = el.dataset.projects;
        const list = kind === 'featured' ? featured : bySection(kind);
        const wheel = Wheel(el, {
          kind,
          label: kind === 'featured' ? 'Proyectos destacados' : 'Proyectos de ' + SECTION_LABEL[kind],
          showSection: kind === 'featured',
          onOpen: (items, i, from, sync) => Viewer.open(items, i, from, sync)
        });
        wheel.setList(list);
        const filtersEl = document.querySelector('[data-filters="' + kind + '"]');
        if (filtersEl) Filters(filtersEl, list, (l) => wheel.setList(l));
        wheels.push(wheel);
      });

      document.querySelectorAll('[data-count]').forEach((n) => { n.textContent = pieces(bySection(n.dataset.count).length); });
      document.querySelectorAll('img[data-door-bg]').forEach((img) => {
        const first = bySection(img.dataset.doorBg)[0];
        if (!first) return;
        img.src = first.section === 'video' ? ytThumb(first.youtube, 'maxresdefault') : first.image.src;
        rawFallback(img);
      });

      // Enlace directo: página.html#ver=id gira la rueda hasta el proyecto y abre su ficha
      const m = location.hash.match(/^#ver=(.+)$/);
      if (m) {
        const id = decodeURIComponent(m[1]);
        for (const w of wheels) {
          const items = w.items();
          const i = items.findIndex((p) => p.id === id);
          if (i < 0) continue;
          w.goTo(i, true);
          const card = targets.map((t) => t.querySelector('.wcard.is-active[data-open="' + CSS.escape(id) + '"]')).find(Boolean);
          Viewer.open(items, i, card, (j) => { w.goTo(j, true); return null; });
          break;
        }
      }
    })
    .catch(() => {
      targets.forEach((el) => {
        el.innerHTML = '<div class="works-empty"><p>No se pudieron cargar los proyectos. Puedes verlos en ' +
          '<a href="https://www.youtube.com/@Ekko-Sound" target="_blank" rel="noopener">YouTube</a> y ' +
          '<a href="https://www.artstation.com/isazz_jv" target="_blank" rel="noopener">ArtStation</a>.</p></div>';
      });
    });
})();
