/* ============================================================
   AISAK 3D — Proyectos desde data/projects.json
   Pinta las galerías, los filtros, los contadores y el visor.
   Contenedores en el HTML:
     [data-projects="3d" | "video" | "featured"]   rejilla de tarjetas
     [data-filters="3d" | "video"]                  barra de filtros (opcional)
     [data-count="3d" | "video"]                    texto «N piezas»
     img[data-door-bg="3d" | "video"]               fondo de las puertas
   Los proyectos se añaden desde admin.html (panel del propietario).
   ============================================================ */
(function () {
  'use strict';
  const DATA_URL = 'data/projects.json';
  const reveal = (els) => window.AISAK && window.AISAK.reveal(els);

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (id, fill) => '<svg class="icon' + (fill ? ' icon--fill' : '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>';
  const ytThumb = (id, q) => 'https://i.ytimg.com/vi/' + id + '/' + (q || 'hqdefault') + '.jpg';
  const pieces = (n) => n + (n === 1 ? ' pieza' : ' piezas');

  const SECTION_LABEL = { '3d': 'Arte 3D', video: 'Video' };
  const valid = (p) => p && p.id && p.title && (p.section === '3d' ? p.image && p.image.src : p.section === 'video' ? p.youtube : false);

  function media(p) {
    if (p.section === 'video') return { src: ytThumb(p.youtube), w: 480, h: 360 };
    return { src: p.image.src, w: p.image.width || 1600, h: p.image.height || 900 };
  }
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

  /* Distribución: funciona con cualquier cantidad.
     1 → ancho · 2 → mitad + mitad · 3+ → el primero ancho y el resto en pares; si sobra uno, también va ancho. */
  function layout(n) {
    if (n === 1) return ['wide'];
    if (n === 2) return ['half', 'half'];
    const out = ['wide'];
    for (let i = 1; i < n; i++) out.push('half');
    if ((n - 1) % 2 === 1) out[n - 1] = 'wide';
    return out;
  }

  function card(p, i, size, showSection) {
    const m = media(p);
    const isVideo = p.section === 'video';
    const meta = [showSection ? SECTION_LABEL[p.section] : null, p.year].filter(Boolean).join(' · ');
    const tags = chips(p).filter((c) => c !== p.year).slice(0, 4);
    return '<article class="work work--' + size + '" data-reveal data-id="' + esc(p.id) + '">' +
      '<button class="work__media" type="button" data-open="' + esc(p.id) + '" aria-label="' + (isVideo ? 'Reproducir ' : 'Ver ') + esc(p.title) + '">' +
        '<img src="' + esc(m.src) + '" alt="" width="' + m.w + '" height="' + m.h + '" loading="lazy" decoding="async"' + (isVideo ? ' data-yt="' + esc(p.youtube) + '"' : '') + ' />' +
        (p.category ? '<span class="pill work__badge">' + esc(p.category) + '</span>' : '') +
        '<span class="work__cue"><span class="work__cue-ico">' + icon(isVideo ? 'i-play' : 'i-expand', isVideo) + '</span>' + (isVideo ? 'Reproducir' : 'Ver proyecto') + '</span>' +
      '</button>' +
      '<div class="work__info">' +
        '<div class="work__row"><span class="work__n">' + String(i + 1).padStart(2, '0') + '</span>' + (meta ? '<span class="work__meta">' + esc(meta) + '</span>' : '') + '</div>' +
        '<h3 class="work__title">' + esc(p.title) + '</h3>' +
        (p.description ? '<p class="work__desc">' + esc(p.description) + '</p>' : '') +
        (tags.length ? '<ul class="work__tags">' + tags.map((t) => '<li class="pill pill--muted">' + esc(t) + '</li>').join('') + '</ul>' : '') +
      '</div>' +
    '</article>';
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
  }, { rootMargin: '400px 0px' }) : null;

  /* ---------- Galería ---------- */
  function Gallery(el, list, opts) {
    const filtersEl = opts.filtersEl;
    let current = list;

    function render(items) {
      current = items;
      if (!items.length) {
        el.innerHTML = '<div class="works-empty"><p>Pronto habrá proyectos aquí.</p><a class="btn" href="#contacto">Encargar un proyecto</a></div>';
        return;
      }
      const sizes = layout(items.length);
      el.innerHTML = items.map((p, i) => card(p, i, sizes[i], opts.showSection)).join('');
      if (thumbIO) el.querySelectorAll('img[data-yt]').forEach((img) => thumbIO.observe(img));
      reveal(el.querySelectorAll('[data-reveal]'));
    }

    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-open]');
      if (!b) return;
      const idx = current.findIndex((p) => p.id === b.dataset.open);
      if (idx >= 0) Viewer.open(current, idx, b);
    });

    if (filtersEl) {
      const cats = [];
      list.forEach((p) => { if (p.category && !cats.includes(p.category)) cats.push(p.category); });
      if (cats.length > 1) {
        const btn = (val, label, n, on) => '<button type="button" class="filter" data-filter="' + esc(val) + '" aria-pressed="' + on + '">' + esc(label) + ' <span>' + n + '</span></button>';
        filtersEl.innerHTML = btn('*', 'Todos', list.length, true) + cats.map((c) => btn(c, c, list.filter((p) => p.category === c).length, false)).join('');
        filtersEl.hidden = false;
        filtersEl.addEventListener('click', (e) => {
          const b = e.target.closest('[data-filter]');
          if (!b) return;
          filtersEl.querySelectorAll('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          const f = b.dataset.filter;
          render(f === '*' ? list : list.filter((p) => p.category === f));
        });
      }
    }
    render(list);
    return { list };
  }

  /* ---------- Visor (dialog nativo: foco atrapado y Esc incluidos) ---------- */
  const Viewer = (function () {
    let dlg, stage, list = [], idx = 0, opener = null, touchX = null;

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
      dlg.querySelector('.viewer__count').textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(list.length).padStart(2, '0');
      dlg.querySelector('.viewer__body').innerHTML =
        (p.category ? '<span class="pill">' + esc(p.category) + '</span>' : '') +
        '<h2 id="viewer-title" class="viewer__title">' + esc(p.title) + '</h2>' +
        (p.description ? '<p class="viewer__desc">' + esc(p.description) + '</p>' : '') +
        (chips(p).length ? '<ul class="work__tags">' + chips(p).map((t) => '<li class="pill pill--muted">' + esc(t) + '</li>').join('') + '</ul>' : '') +
        (lk ? '<a class="btn btn--red viewer__link" href="' + esc(lk.href) + '" target="_blank" rel="noopener">Ver en ' + esc(lk.label) + icon('i-ext') + '<span class="sr-only">(abre en una pestaña nueva)</span></a>' : '');
      const single = list.length < 2;
      dlg.querySelectorAll('[data-v="prev"],[data-v="next"]').forEach((b) => { b.hidden = single; });
      try { history.replaceState(null, '', '#ver=' + encodeURIComponent(p.id)); } catch (_) { /* file:// */ }
    }

    function go(d) {
      if (list.length < 2) return;
      idx = (idx + d + list.length) % list.length;
      show();
    }
    function open(l, i, from) {
      if (!dlg) build();
      list = l; idx = i; opener = from || null;
      show();
      document.documentElement.classList.add('has-viewer');
      if (!dlg.open) dlg.showModal();
      dlg.querySelector('.viewer__close').focus();
    }
    function close() { if (dlg && dlg.open) { stage.innerHTML = ''; dlg.close(); } }
    function cleanup() {
      stage.innerHTML = ''; // detiene el video (también al cerrar con Esc)
      document.documentElement.classList.remove('has-viewer');
      try { history.replaceState(null, '', location.pathname + location.search); } catch (_) { /* file:// */ }
      if (opener && document.contains(opener)) opener.focus();
    }
    return { open };
  })();

  /* ---------- Carga ---------- */
  const targets = Array.from(document.querySelectorAll('[data-projects]'));
  const needsData = targets.length || document.querySelector('[data-count],[data-door-bg]');
  if (!needsData) return;

  fetch(DATA_URL, { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((data) => {
      const all = (data.projects || []).filter(valid);
      const bySection = (s) => all.filter((p) => p.section === s);
      const featured = (data.featured || []).map((id) => all.find((p) => p.id === id)).filter(Boolean);
      const pool = [];

      targets.forEach((el) => {
        const kind = el.dataset.projects;
        const list = kind === 'featured' ? featured : bySection(kind);
        const filtersEl = document.querySelector('[data-filters="' + kind + '"]');
        Gallery(el, list, { filtersEl, showSection: kind === 'featured' });
        pool.push(...list);
      });

      document.querySelectorAll('[data-count]').forEach((n) => { n.textContent = pieces(bySection(n.dataset.count).length); });
      document.querySelectorAll('img[data-door-bg]').forEach((img) => {
        const first = bySection(img.dataset.doorBg)[0];
        if (!first) return;
        img.src = first.section === 'video' ? ytThumb(first.youtube, 'maxresdefault') : first.image.src;
      });

      // Enlace directo: página.html#ver=id abre el visor
      const m = location.hash.match(/^#ver=(.+)$/);
      if (m) {
        const id = decodeURIComponent(m[1]);
        const host = targets.find((el) => el.querySelector('[data-open="' + CSS.escape(id) + '"]'));
        const btn = host && host.querySelector('[data-open="' + CSS.escape(id) + '"]');
        if (btn) btn.click();
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
