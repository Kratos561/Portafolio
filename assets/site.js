/* ============================================================
   AISAK 3D — Interacción compartida (sin dependencias)
   - Header con fondo al hacer scroll + enlace activo por sección
   - Reveal suave (window.AISAK.reveal para contenido que llega después)
   - Ticker infinito, copiar email, año
   - Botón «Editar» solo en el navegador del propietario
   - Serpiente roja entrelazada en la palabra-póster [data-snake]
   ============================================================ */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
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
  const revealIO = !reduce && hasIO ? new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      revealIO.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' }) : null;

  function reveal(els) {
    if (!revealIO) return;
    Array.from(els).forEach((el) => {
      if (el.classList.contains('reveal-pre')) return;
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
      const sibs = Array.from(el.parentElement.children).filter((c) => c.hasAttribute('data-reveal'));
      el.style.setProperty('--d', Math.min(sibs.indexOf(el), 4) * 90 + 'ms');
      el.classList.add('reveal-pre');
      revealIO.observe(el);
    });
  }
  reveal(document.querySelectorAll('[data-reveal]'));
  window.AISAK = { reveal, reduce };

  /* ---------- Ticker: duplica el contenido para el bucle ---------- */
  document.querySelectorAll('.ticker__track').forEach((track) => {
    Array.from(track.children).forEach((n) => track.appendChild(n.cloneNode(true)));
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

  /* ---------- Propietario: acceso al panel solo si este navegador inició sesión en admin.html ---------- */
  try {
    if (localStorage.getItem('aisak:owner')) {
      const a = document.createElement('a');
      a.className = 'owner-pill';
      a.href = 'admin.html';
      a.innerHTML = '<span class="pill__dot" aria-hidden="true"></span>Editar proyectos';
      document.body.appendChild(a);
    }
  } catch (_) { /* almacenamiento bloqueado: no se muestra nada */ }

  /* ============================================================
     SERPIENTE — dos capas SVG (detrás y delante de las letras).
     La capa delantera se recorta sobre algunas letras, así la
     serpiente se entrelaza: pasa por detrás de la letra anterior a
     la alta, por delante del trazo izquierdo de la alta, por detrás
     del derecho y por detrás de la letra de la cola.
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
  const clamp = (a, b, x) => Math.min(b, Math.max(a, x));
  const f1 = (n) => n.toFixed(1);
  const pt = (x, y) => f1(x) + ' ' + f1(y);

  // Grosor relativo a lo largo del cuerpo (0 = hocico, 1 = cola). Cabeza de víbora: hocico redondo, mandíbula ancha y cuello.
  const HS = 0.075;
  const profile = (s) => {
    if (s < HS) {
      const u = s / HS;
      if (u < 0.62) return 1.48 * Math.pow(Math.sin((u / 0.62) * Math.PI / 2), 0.7);
      return 1.48 - 0.66 * smooth(0.62, 1, u);
    }
    if (s < 0.2) return 0.82 + 0.26 * smooth(HS, 0.2, s);
    if (s < 0.48) return 1.08;
    return Math.max(0.035, 1.08 * Math.pow(1 - smooth(0.48, 1, s), 0.9));
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
    const patBg = mk('rect', { fill: '#D90500' }, pat);
    const patArcs = mk('path', { fill: 'none', stroke: '#7a0200', 'stroke-opacity': '.5' }, pat);
    const clip = mk('clipPath', { id: id + '-clip', clipPathUnits: 'userSpaceOnUse' }, defs);
    const clipPath = mk('path', { 'clip-rule': 'evenodd' }, clip);

    const parts = (svg, withClip) => {
      const g = mk('g', withClip ? { 'clip-path': 'url(#' + id + '-clip)' } : {}, svg);
      const o = {
        edge: mk('path', { fill: '#6b0200' }, g),
        body: mk('path', { fill: 'url(#' + id + '-scales)' }, g),
        marks: mk('path', { fill: '#3d0100', 'fill-opacity': '.82' }, g),
        shine: mk('path', { fill: 'rgba(255,170,150,.3)' }, g),
        nostrils: mk('path', { fill: '#2a0000' }, g),
        eyes: [mk('circle', { fill: '#120000' }, g), mk('circle', { fill: '#120000' }, g)],
        glints: [mk('circle', { fill: '#fff', 'fill-opacity': '.85' }, g), mk('circle', { fill: '#fff', 'fill-opacity': '.85' }, g)]
      };
      if (withClip) o.tongue = mk('path', { fill: 'none', stroke: '#ff5546', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
      return o;
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

      // Escamas finas (textura)
      const sz = bodyW * 0.26, ph = sz * 0.72, r = sz / 2;
      pat.setAttribute('width', f1(sz)); pat.setAttribute('height', f1(ph));
      patBg.setAttribute('width', f1(sz)); patBg.setAttribute('height', f1(ph));
      patArcs.setAttribute('stroke-width', f1(Math.max(0.6, sz * 0.12)));
      patArcs.setAttribute('d',
        'M0 ' + f1(ph) + ' A' + f1(r) + ' ' + f1(r) + ' 0 0 1 ' + f1(sz) + ' ' + f1(ph) +
        ' M' + f1(-r) + ' ' + f1(ph / 2) + ' A' + f1(r) + ' ' + f1(r) + ' 0 0 1 ' + f1(r) + ' ' + f1(ph / 2) +
        ' M' + f1(r) + ' ' + f1(ph / 2) + ' A' + f1(r) + ' ' + f1(r) + ' 0 0 1 ' + f1(sz + r) + ' ' + f1(ph / 2));

      // Zonas donde la serpiente pasa por detrás (entrelazado alterno)
      const zones = [];
      const letterZone = (Z) => zones.push([Z.l - 1, Z.t - Z.h * 0.35, Z.w + 2, Z.h * 1.7]);
      if (ti - 1 > headIdx) letterZone(L[ti - 1]);
      zones.push([T.r - T.w * 0.42, tallTop - fs * 0.1, T.w * 0.42 + 2, tallH + fs * 0.2]);
      if (tailIdx > ti + 1) letterZone(L[tailIdx]);
      let d = 'M-9999 -9999H' + (W + 9999) + 'V' + (H + 9999) + 'H-9999Z';
      zones.forEach(([x, y, w, h]) => { d += 'M' + f1(x) + ' ' + f1(y) + 'h' + f1(w) + 'v' + f1(h) + 'h' + f1(-w) + 'Z'; });
      clipPath.setAttribute('d', d);
    }

    // Seguimiento suave del cursor: la cabeza se levanta o baja hacia el puntero
    let lift = 0, liftTarget = 0;
    if (finePointer && !reduce) {
      const zone = poster.closest('.cover') || poster;
      zone.addEventListener('pointermove', (e) => {
        if (!G) return;
        const r = poster.getBoundingClientRect();
        liftTarget = clamp(-1, 1, (e.clientY - r.top - G.cy) / (G.fs * 1.4)) * G.fs * 0.17;
      });
      zone.addEventListener('pointerleave', () => { liftTarget = 0; });
    }

    function draw(progress, phase, time) {
      const { fs, L, T, W, bodyW, cy } = G;
      const hx = L[headIdx].cx;
      const len = L[tailIdx].r + fs * 0.2 - hx;
      const startX = W + fs * 0.4;
      const headX = startX + (hx - startX) * progress;
      const k = (Math.PI * 2) / (T.w * 1.6);
      const breathe = 1 + 0.07 * Math.sin((time || 0) * 0.0011);
      const N = 190;
      const P = [];
      let acc = 0;
      for (let i = 0; i < N; i++) {
        const x = headX + (len * i) / (N - 1);
        const env = fs * (0.06 + 0.2 * Math.exp(-Math.pow((x - T.cx) / (fs * 0.85), 2))) * breathe;
        const y = cy + env * Math.sin(k * (x - T.cx) - phase) + lift * Math.exp(-Math.pow((x - headX) / (fs * 0.55), 2));
        const p = { x, y };
        if (i) acc += Math.hypot(x - P[i - 1].x, y - P[i - 1].y);
        p.a = acc;
        P.push(p);
      }
      const left = [], right = [], el = [], er = [], sl = [], sr = [];
      for (let i = 0; i < N; i++) {
        const a = P[Math.max(0, i - 1)], b = P[Math.min(N - 1, i + 1)];
        let tx = b.x - a.x, ty = b.y - a.y;
        const m = Math.hypot(tx, ty) || 1;
        tx /= m; ty /= m;
        const p = P[i];
        p.tx = tx; p.ty = ty; p.nx = -ty; p.ny = tx;
        p.s = p.a / acc;
        p.w = (bodyW * profile(p.s)) / 2;
        // Borde oscuro (ancho completo) y cuerpo desplazado hacia la luz (arriba)
        el.push(pt(p.x + p.nx * p.w, p.y + p.ny * p.w));
        er.push(pt(p.x - p.nx * p.w, p.y - p.ny * p.w));
        const bw = p.w * 0.86, bo = -p.w * 0.07;
        left.push(pt(p.x + p.nx * (bo + bw), p.y + p.ny * (bo + bw)));
        right.push(pt(p.x + p.nx * (bo - bw), p.y + p.ny * (bo - bw)));
        if (p.s > 0.02 && p.s < 0.84) {
          const off = -p.w * 0.36, hw = p.w * 0.2 * smooth(0.02, 0.1, p.s);
          sl.push(pt(p.x + p.nx * (off + hw), p.y + p.ny * (off + hw)));
          sr.push(pt(p.x + p.nx * (off - hw), p.y + p.ny * (off - hw)));
        }
      }
      const poly = (l, r) => (l.length ? 'M' + l.join('L') + 'L' + r.reverse().join('L') + 'Z' : '');
      const edge = poly(el, er);
      const body = poly(left, right);
      const shine = poly(sl, sr);

      // Manchas dorsales: rombos orientados según la curva (siguen al cuerpo)
      const at = (s) => {
        const target = s * acc;
        let i = 1;
        while (i < N - 1 && P[i].a < target) i++;
        return P[i];
      };
      let marks = '';
      const step = bodyW * 1.05;
      for (let a = acc * 0.1; a < acc * 0.86; a += step) {
        const p = at(a / acc);
        const hl = p.w * 0.62, hw = p.w * 0.36;
        marks += 'M' + pt(p.x + p.tx * hl, p.y + p.ty * hl) + 'L' + pt(p.x + p.nx * hw, p.y + p.ny * hw) +
          'L' + pt(p.x - p.tx * hl, p.y - p.ty * hl) + 'L' + pt(p.x - p.nx * hw, p.y - p.ny * hw) + 'Z';
      }

      // Cabeza: ojos con brillo y fosas nasales
      const E = at(0.042), Nn = at(0.012);
      const er0 = bodyW * 0.12;
      const nr = bodyW * 0.035;
      let nostrils = '';
      [-1, 1].forEach((sg) => {
        const x = Nn.x + Nn.nx * Nn.w * 0.42 * sg, y = Nn.y + Nn.ny * Nn.w * 0.42 * sg;
        nostrils += 'M' + pt(x - nr, y) + 'a' + f1(nr) + ' ' + f1(nr) + ' 0 1 0 ' + f1(nr * 2) + ' 0a' + f1(nr) + ' ' + f1(nr) + ' 0 1 0 ' + f1(-nr * 2) + ' 0Z';
      });

      // Lengua bífida con doble chasquido cada ~3,4 s
      const cyc = ((time || 0) % 3400) / 3400;
      const flickAt = (c0) => (cyc > c0 && cyc < c0 + 0.08 ? Math.sin(((cyc - c0) / 0.08) * Math.PI) : 0);
      const flick = reduce ? 0.7 : Math.max(flickAt(0), flickAt(0.11));
      const H0 = P[0];
      const dx = -H0.tx, dy = -H0.ty;
      const tl = fs * 0.11 * flick;
      const mx = H0.x + dx * tl * 0.62, my = H0.y + dy * tl * 0.62;
      const rot = (ang) => [dx * Math.cos(ang) - dy * Math.sin(ang), dx * Math.sin(ang) + dy * Math.cos(ang)];
      const [ax, ay] = rot(0.48), [bx, by] = rot(-0.48);
      const tongue = flick > 0.02
        ? 'M' + pt(H0.x, H0.y) + 'L' + pt(mx, my) + 'L' + pt(mx + ax * tl * 0.4, my + ay * tl * 0.4) +
          'M' + pt(mx, my) + 'L' + pt(mx + bx * tl * 0.4, my + by * tl * 0.4)
        : '';

      pat.setAttribute('patternTransform', 'translate(' + f1(headX - hx) + ' 0)');
      [B, F].forEach((S) => {
        S.edge.setAttribute('d', edge);
        S.body.setAttribute('d', body);
        S.marks.setAttribute('d', marks);
        S.shine.setAttribute('d', shine);
        S.nostrils.setAttribute('d', nostrils);
        [-1, 1].forEach((sg, j) => {
          const x = E.x + E.nx * E.w * 0.5 * sg, y = E.y + E.ny * E.w * 0.5 * sg;
          S.eyes[j].setAttribute('cx', f1(x)); S.eyes[j].setAttribute('cy', f1(y)); S.eyes[j].setAttribute('r', f1(er0));
          S.glints[j].setAttribute('cx', f1(x - er0 * 0.3)); S.glints[j].setAttribute('cy', f1(y - er0 * 0.35)); S.glints[j].setAttribute('r', f1(er0 * 0.32));
        });
      });
      F.tongue.setAttribute('d', tongue);
      F.tongue.setAttribute('stroke-width', f1(Math.max(1, bodyW * 0.09)));
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
      lift += (liftTarget - lift) * Math.min(1, dt * 0.006);
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
