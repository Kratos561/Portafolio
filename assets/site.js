/* ============================================================
   AISAK 3D — Interacción compartida (sin dependencias)
   - Header con fondo al hacer scroll + enlace activo por sección
   - Reveal suave (el contenido es visible si este archivo no carga)
   - Ticker infinito, fachada de YouTube, copiar email, año
   - Serpiente roja entrelazada en la palabra-póster [data-snake]
   ============================================================ */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;

  /* ---------- Header ---------- */
  const hdr = document.getElementById('hdr');
  if (hdr) {
    const onScroll = () => hdr.classList.toggle('hdr--scrolled', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Enlace activo según la sección visible (solo en la principal) ---------- */
  const spyLinks = Array.from(document.querySelectorAll('.hdr__link[data-spy]'));
  if (spyLinks.length && hasIO) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        spyLinks.forEach((l) => l.classList.toggle('is-active', l.dataset.spy === e.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main > section[id], main > nav[id]').forEach((s) => io.observe(s));
  }

  /* ---------- Año ---------- */
  document.querySelectorAll('[data-year]').forEach((n) => { n.textContent = new Date().getFullYear(); });

  /* ---------- Reveal: solo se oculta lo que está por debajo del pliegue ---------- */
  if (!reduce && hasIO) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
      const sibs = Array.from(el.parentElement.children).filter((c) => c.hasAttribute('data-reveal'));
      el.style.setProperty('--d', Math.min(sibs.indexOf(el), 4) * 90 + 'ms');
      el.classList.add('reveal-pre');
      io.observe(el);
    });
  }

  /* ---------- Ticker: duplica el contenido para el bucle ---------- */
  document.querySelectorAll('.ticker__track').forEach((track) => {
    Array.from(track.children).forEach((n) => track.appendChild(n.cloneNode(true)));
  });

  /* ---------- Fachada de YouTube: miniatura nítida + reproducción dentro de la web ---------- */
  const plays = Array.from(document.querySelectorAll('.vplay[data-yt]'));
  const upgradeThumb = (btn) => {
    const img = btn.querySelector('img');
    if (!img || btn.dataset.hi) return;
    btn.dataset.hi = '1';
    const hi = new Image();
    hi.onload = () => { if (hi.naturalWidth > 120) img.src = hi.src; }; // 120px = YouTube "sin miniatura"
    hi.src = 'https://i.ytimg.com/vi/' + btn.dataset.yt + '/maxresdefault.jpg';
  };
  if (hasIO) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { upgradeThumb(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '400px 0px' });
    plays.forEach((b) => io.observe(b));
  }
  plays.forEach((btn) => {
    btn.addEventListener('click', () => {
      const box = btn.parentElement;
      const f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + btn.dataset.yt + '?autoplay=1&rel=0';
      f.title = btn.dataset.title || 'Video';
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      f.allowFullscreen = true;
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      box.replaceChildren(f);
      f.focus();
    });
  });

  /* ---------- Copiar email ---------- */
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    const label = btn.querySelector('[data-copy-label]');
    const use = btn.querySelector('use');
    const initial = label ? label.textContent : '';
    let timer = 0;
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
      } catch (_) {
        const ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (_) { /* sin portapapeles */ }
        ta.remove();
      }
      btn.classList.add('is-done');
      if (label) label.textContent = 'Copiado';
      if (use) use.setAttribute('href', '#i-check');
      clearTimeout(timer);
      timer = setTimeout(() => {
        btn.classList.remove('is-done');
        if (label) label.textContent = initial;
        if (use) use.setAttribute('href', '#i-copy');
      }, 2200);
    });
  });

  /* ============================================================
     SERPIENTE — dos capas SVG (detrás y delante de las letras).
     La capa delantera se recorta sobre el trazo izquierdo de la
     letra alta y sobre la letra de la cola: así parece que la
     serpiente pasa por detrás y vuelve a salir.
     data-snake-head / data-snake-tail: índice de letra (opcional).
     ============================================================ */
  const NS = 'http://www.w3.org/2000/svg';
  let uid = 0;
  const mk = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const f1 = (n) => n.toFixed(1);

  // Grosor relativo a lo largo del cuerpo (0 = punta de la cabeza, 1 = cola)
  const profile = (s) => {
    const hs = 0.055;
    if (s < hs) {
      const u = s / hs;
      if (u < 0.6) return 1.32 * Math.sqrt(Math.max(0, 1 - Math.pow((0.6 - u) / 0.6, 2)));
      return 1.32 - 0.47 * smooth(0.6, 1, u);
    }
    if (s < 0.17) return 0.85 + 0.2 * smooth(hs, 0.17, s);
    if (s < 0.5) return 1.05;
    return Math.max(0.05, 1.05 * Math.pow(1 - smooth(0.5, 1, s), 0.85));
  };

  function Snake(poster) {
    const id = 'snk' + uid++;
    const word = poster.querySelector('.poster__word');
    const letters = Array.from(word.querySelectorAll('.ch:not(.ch--space)'));
    const tall = word.querySelector('.ch--tall');
    const ti = letters.indexOf(tall);
    if (ti < 0) return;
    const headIdx = poster.dataset.snakeHead ? +poster.dataset.snakeHead : Math.max(0, ti - 3);
    const tailIdx = poster.dataset.snakeTail ? +poster.dataset.snakeTail : Math.min(letters.length - 1, ti + 2);

    const layer = (cls) => mk('svg', { class: 'snake ' + cls, 'aria-hidden': 'true', focusable: 'false' });
    const back = layer('snake--back');
    const front = layer('snake--front');

    const defs = mk('defs', {}, back);
    const pat = mk('pattern', { id: id + '-scales', patternUnits: 'userSpaceOnUse' }, defs);
    const patBg = mk('rect', { fill: '#E10600' }, pat);
    const patArcs = mk('path', { fill: 'none', stroke: '#6e0200', 'stroke-opacity': '.75' }, pat);
    const clip = mk('clipPath', { id: id + '-clip', clipPathUnits: 'userSpaceOnUse' }, defs);
    const clipPath = mk('path', { 'clip-rule': 'evenodd' }, clip);

    const parts = (svg, withClip) => {
      const g = mk('g', withClip ? { 'clip-path': 'url(#' + id + '-clip)' } : {}, svg);
      return {
        g,
        body: mk('path', { fill: 'url(#' + id + '-scales)' }, g),
        shine: mk('path', { fill: 'rgba(255,150,130,.22)' }, g),
        eyes: [mk('circle', { fill: '#140000' }, g), mk('circle', { fill: '#140000' }, g)],
        tongue: withClip ? mk('path', { fill: 'none', stroke: '#ff4a3a', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg) : null
      };
    };
    const B = parts(back, false);
    const F = parts(front, true);
    poster.appendChild(back);
    poster.appendChild(front);

    let G = null;
    function measure() {
      const fs = parseFloat(getComputedStyle(poster).fontSize);
      const ox = word.offsetLeft, oy = word.offsetTop;
      const L = letters.map((n) => {
        const l = ox + n.offsetLeft, t = oy + n.offsetTop, w = n.offsetWidth, h = n.offsetHeight;
        return { l, t, w, h, r: l + w, cx: l + w / 2, cy: t + h / 2 };
      });
      const sy = parseFloat((getComputedStyle(tall).scale || '1 1').split(' ')[1]) || 1;
      const T = L[ti];
      const tallTop = T.cy - (T.h * sy) / 2, tallH = T.h * sy;
      const W = poster.offsetWidth, H = poster.offsetHeight;
      const bodyW = fs * 0.15;
      G = { fs, L, T, W, H, bodyW, cy: L[ti === 0 ? 1 : 0].cy + fs * 0.01 };

      [back, front].forEach((s) => {
        s.setAttribute('width', W); s.setAttribute('height', H); s.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      });

      // Escamas
      const sz = bodyW * 0.3, ph = sz * 0.72;
      pat.setAttribute('width', f1(sz)); pat.setAttribute('height', f1(ph));
      patBg.setAttribute('width', f1(sz)); patBg.setAttribute('height', f1(ph));
      const r = sz / 2;
      patArcs.setAttribute('stroke-width', f1(Math.max(0.6, sz * 0.11)));
      patArcs.setAttribute('d',
        'M0 ' + f1(ph) + ' A' + f1(r) + ' ' + f1(r) + ' 0 0 1 ' + f1(sz) + ' ' + f1(ph) +
        ' M' + f1(-r) + ' ' + f1(ph / 2) + ' A' + f1(r) + ' ' + f1(r) + ' 0 0 1 ' + f1(r) + ' ' + f1(ph / 2) +
        ' M' + f1(r) + ' ' + f1(ph / 2) + ' A' + f1(r) + ' ' + f1(r) + ' 0 0 1 ' + f1(sz + r) + ' ' + f1(ph / 2));

      // Zonas donde la serpiente pasa por detrás
      const zones = [[T.l - 2, tallTop - fs * 0.1, T.w * 0.4 + 2, tallH + fs * 0.2]];
      if (tailIdx !== ti && tailIdx !== headIdx) {
        const Z = L[tailIdx];
        zones.push([Z.l, Z.t - Z.h * 0.3, Z.w, Z.h * 1.6]);
      }
      let d = 'M-9999 -9999H' + (W + 9999) + 'V' + (H + 9999) + 'H-9999Z';
      zones.forEach(([x, y, w, h]) => { d += 'M' + f1(x) + ' ' + f1(y) + 'h' + f1(w) + 'v' + f1(h) + 'h' + f1(-w) + 'Z'; });
      clipPath.setAttribute('d', d);
    }

    function centerY(x, phase) {
      const { fs, T, cy } = G;
      const k = (Math.PI * 2) / (T.w * 1.6);
      const env = fs * (0.06 + 0.2 * Math.exp(-Math.pow((x - T.cx) / (fs * 0.85), 2)));
      return cy + env * Math.sin(k * (x - T.cx) - phase);
    }

    function draw(progress, phase, time) {
      const { fs, L, W, bodyW } = G;
      const hx = L[headIdx].cx;
      const len = L[tailIdx].r + fs * 0.18 - hx;
      const startX = W + fs * 0.4;
      const headX = startX + (hx - startX) * progress;
      const N = 170;
      const P = [];
      let acc = 0;
      for (let i = 0; i < N; i++) {
        const x = headX + (len * i) / (N - 1);
        const p = { x, y: centerY(x, phase), s: 0 };
        if (i) acc += Math.hypot(p.x - P[i - 1].x, p.y - P[i - 1].y);
        p.s = acc;
        P.push(p);
      }
      const left = [], right = [], sl = [], sr = [];
      for (let i = 0; i < N; i++) {
        const a = P[Math.max(0, i - 1)], b = P[Math.min(N - 1, i + 1)];
        let tx = b.x - a.x, ty = b.y - a.y;
        const m = Math.hypot(tx, ty) || 1;
        tx /= m; ty /= m;
        const nx = -ty, ny = tx;
        const s = P[i].s / acc;
        const w = (bodyW * profile(s)) / 2;
        P[i].nx = nx; P[i].ny = ny; P[i].w = w;
        left.push(f1(P[i].x + nx * w) + ' ' + f1(P[i].y + ny * w));
        right.push(f1(P[i].x - nx * w) + ' ' + f1(P[i].y - ny * w));
        if (s > 0.07 && s < 0.82) {
          const off = -w * 0.32, hw = w * 0.26;
          sl.push(f1(P[i].x + nx * (off + hw)) + ' ' + f1(P[i].y + ny * (off + hw)));
          sr.push(f1(P[i].x + nx * (off - hw)) + ' ' + f1(P[i].y + ny * (off - hw)));
        }
      }
      const body = 'M' + left.join('L') + 'L' + right.reverse().join('L') + 'Z';
      const shine = sl.length ? 'M' + sl.join('L') + 'L' + sr.reverse().join('L') + 'Z' : '';

      // Ojos (cerca de la punta)
      let ei = 0;
      while (ei < N - 1 && P[ei].s / acc < 0.03) ei++;
      const E = P[ei];
      const er = bodyW * 0.1;

      // Lengua bífida que asoma cada pocos segundos
      const cyc = ((time || 0) % 3400) / 3400;
      const flick = reduce ? 0.7 : (cyc < 0.16 ? Math.sin((cyc / 0.16) * Math.PI) : 0);
      const H0 = P[0], H1 = P[2];
      let dx = H0.x - H1.x, dy = H0.y - H1.y;
      const dm = Math.hypot(dx, dy) || 1;
      dx /= dm; dy /= dm;
      const tl = fs * 0.1 * flick;
      const mx = H0.x + dx * tl * 0.65, my = H0.y + dy * tl * 0.65;
      const rot = (ang) => [dx * Math.cos(ang) - dy * Math.sin(ang), dx * Math.sin(ang) + dy * Math.cos(ang)];
      const [ax, ay] = rot(0.5), [bx, by] = rot(-0.5);
      const tongue = flick > 0.02
        ? 'M' + f1(H0.x) + ' ' + f1(H0.y) + 'L' + f1(mx) + ' ' + f1(my) +
          'L' + f1(mx + ax * tl * 0.38) + ' ' + f1(my + ay * tl * 0.38) +
          'M' + f1(mx) + ' ' + f1(my) + 'L' + f1(mx + bx * tl * 0.38) + ' ' + f1(my + by * tl * 0.38)
        : '';

      const shift = 'translate(' + f1(headX - hx) + ' 0)';
      pat.setAttribute('patternTransform', shift);
      [B, F].forEach((S) => {
        S.body.setAttribute('d', body);
        S.shine.setAttribute('d', shine);
        S.eyes.forEach((c, j) => {
          const sgn = j ? 1 : -1;
          c.setAttribute('cx', f1(E.x + E.nx * E.w * 0.42 * sgn));
          c.setAttribute('cy', f1(E.y + E.ny * E.w * 0.42 * sgn));
          c.setAttribute('r', f1(er));
        });
      });
      F.tongue.setAttribute('d', tongue);
      F.tongue.setAttribute('stroke-width', f1(Math.max(1, bodyW * 0.085)));
      const show = progress > 0 ? '1' : '0';
      back.style.opacity = show; front.style.opacity = show;
    }

    // Bucle
    const DELAY = reduce ? 0 : 650, ENTRY = 2000;
    let start = null, last = 0, phase = 0.6, raf = 0, visible = true;
    function frame(t) {
      raf = 0;
      if (!G) return;
      if (start === null) start = t;
      const e = reduce ? 1 : Math.min(1, Math.max(0, (t - start - DELAY) / ENTRY));
      const eased = 1 - Math.pow(1 - e, 3);
      const dt = last ? Math.min(50, t - last) : 16;
      last = t;
      if (e >= 1 && !reduce) phase += dt * 0.0017;
      draw(eased, phase, t);
      if (!reduce && visible && !document.hidden) raf = requestAnimationFrame(frame);
    }
    const kick = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };

    const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    ready.then(() => {
      measure();
      if (!reduce) poster.classList.add('is-intro');
      kick();
      if ('ResizeObserver' in window) new ResizeObserver(() => { measure(); kick(); }).observe(poster);
    });
    if (hasIO) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(poster);
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  }

  document.querySelectorAll('.poster[data-snake]').forEach((p) => Snake(p));
})();
