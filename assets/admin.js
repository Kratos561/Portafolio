/* ============================================================
   AISAK 3D — Panel del propietario (admin.html)
   - Acceso con token de GitHub; solo entra la cuenta OWNER.
   - Lee data/projects.json del repositorio (no de la caché de la web).
   - Los cambios se acumulan y se publican en UN commit (Git Data API):
     imágenes nuevas en assets/projects/ + data/projects.json.
   - GitHub Pages republica la web sola en 1–2 minutos.
   ============================================================ */
(function () {
  'use strict';
  // Repositorio de la web, deducido de la dirección en GitHub Pages:
  // usuario.github.io → usuario/usuario.github.io · usuario.github.io/repo/ → usuario/repo.
  // Así la web sigue funcionando aunque cambie el nombre de usuario o del repositorio.
  const SITE = (function () {
    const m = location.hostname.match(/^([a-z0-9-]+)\.github\.io$/i);
    if (!m) return { owner: 'isaaclorenzo', repo: 'isaaclorenzo.github.io' }; // local
    const owner = m[1].toLowerCase();
    const seg = location.pathname.split('/')[1] || '';
    return { owner, repo: seg && !/\.html?$/i.test(seg) ? seg : owner + '.github.io' };
  })();
  const OWNER = SITE.owner; // el panel solo deja entrar a esta cuenta
  const REPO = SITE.repo;
  const BRANCH = 'main';
  const DATA_PATH = 'data/projects.json';
  const IMG_DIR = 'assets/projects/';
  const API = 'https://api.github.com';
  const K_TOKEN = 'aisak:token';
  const K_OWNER = 'aisak:owner'; // versiones anteriores lo guardaban; se borra al entrar y al salir

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (id) => '<svg class="icon" aria-hidden="true"><use href="#' + id + '"/></svg>';

  let token = null;
  let remote = null;      // { headSha, json (texto), data }
  let data = null;        // copia de trabajo
  let pendingImages = {}; // path -> { base64, url }
  let changes = [];       // resumen para el mensaje del commit
  let tab = '3d';
  let editingId = null;
  let draftImage = null;  // imagen elegida en el editor (aún sin guardar)

  /* ---------- Almacenamiento ---------- */
  const store = {
    get() { try { return localStorage.getItem(K_TOKEN) || sessionStorage.getItem(K_TOKEN); } catch (_) { return null; } },
    set(t, remember) {
      try {
        localStorage.removeItem(K_OWNER);
        if (remember) localStorage.setItem(K_TOKEN, t);
        else sessionStorage.setItem(K_TOKEN, t);
      } catch (_) { /* sin almacenamiento: dura lo que la pestaña */ }
    },
    clear() { try { localStorage.removeItem(K_TOKEN); localStorage.removeItem(K_OWNER); sessionStorage.removeItem(K_TOKEN); } catch (_) { /* nada */ } }
  };

  /* ---------- GitHub API ---------- */
  async function gh(path, opts) {
    opts = opts || {};
    const headers = { Accept: opts.accept || 'application/vnd.github+json', Authorization: 'Bearer ' + token, 'X-GitHub-Api-Version': '2022-11-28' };
    if (opts.body) headers['Content-Type'] = 'application/json';
    const r = await fetch(API + path, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined, cache: 'no-store' });
    if (!r.ok) {
      const err = new Error('GitHub ' + r.status);
      err.status = r.status;
      try { err.body = await r.json(); } catch (_) { err.body = {}; }
      throw err;
    }
    if (r.status === 204) return null;
    return opts.raw ? r.text() : r.json();
  }
  const repoPath = '/repos/' + OWNER + '/' + REPO;

  async function loadRemote() {
    const ref = await gh(repoPath + '/git/ref/heads/' + BRANCH);
    const text = await gh(repoPath + '/contents/' + DATA_PATH + '?ref=' + ref.object.sha, { accept: 'application/vnd.github.raw+json', raw: true });
    const parsed = JSON.parse(text);
    remote = { headSha: ref.object.sha, json: text };
    data = normalize(parsed);
    pendingImages = {};
    changes = [];
  }
  function normalize(d) {
    d = d && typeof d === 'object' ? d : {};
    // Conserva cualquier otro campo (p. ej. profile) para no perderlo al publicar
    return Object.assign({}, d, { version: d.version || 1, featured: Array.isArray(d.featured) ? d.featured : [], projects: Array.isArray(d.projects) ? d.projects : [] });
  }

  /* ---------- Vistas ---------- */
  function showLogin(msg) {
    $('#loginView').hidden = false;
    $('#appView').hidden = true;
    $('#userBox').hidden = true;
    $('#publishBar').hidden = true;
    const e = $('#loginError');
    e.hidden = !msg; e.textContent = msg || '';
    $('#tokenInput').focus();
  }
  function showApp(user) {
    $('#loginView').hidden = true;
    $('#appView').hidden = false;
    $('#userBox').hidden = false;
    $('#userLogin').textContent = user.login;
    $('#userAvatar').src = user.avatar_url + '&s=64';
    render();
  }

  async function signIn(t, remember) {
    token = t;
    const user = await gh('/user');
    if (String(user.login).toLowerCase() !== OWNER.toLowerCase()) {
      token = null;
      throw new Error('Esta cuenta (' + user.login + ') no es la del propietario.');
    }
    const repo = await gh(repoPath);
    if (repo.permissions && repo.permissions.push === false) throw new Error('El token no tiene permiso de escritura en el repositorio.');
    await loadRemote();
    if (remember !== undefined) store.set(t, remember);
    showApp(user);
  }

  const friendly = (err) => {
    if (err.status === 401) return 'El token no es válido o ha caducado.';
    if (err.status === 403) return 'El token no tiene los permisos necesarios (Contents: Read and write).';
    if (err.status === 404) return 'No se encuentra el repositorio o el token no tiene acceso a él.';
    return err.message || 'Error inesperado.';
  };

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const t = $('#tokenInput').value.trim();
    if (!t) return showLogin('Pega tu token de GitHub.');
    const btn = $('#loginBtn');
    btn.disabled = true; btn.firstChild.textContent = 'Comprobando… ';
    try {
      await signIn(t, $('#rememberInput').checked);
      $('#tokenInput').value = '';
    } catch (err) {
      store.clear();
      showLogin(friendly(err));
    } finally {
      btn.disabled = false; btn.firstChild.textContent = 'Entrar ';
    }
  });

  $('#logoutBtn').addEventListener('click', () => {
    if (isDirty() && !confirm('Tienes cambios sin publicar. ¿Salir igualmente?')) return;
    store.clear();
    token = null; data = null; remote = null;
    showLogin();
  });

  /* ---------- Estado ---------- */
  const isDirty = () => !!data && !!remote && JSON.stringify(serialize()) !== JSON.stringify(normalize(JSON.parse(remote.json)));
  const serialize = () => Object.assign({}, data, { featured: data.featured.filter((id) => data.projects.some((p) => p.id === id)), projects: data.projects });
  const byId = (id) => data.projects.find((p) => p.id === id);
  const sectionList = (s) => data.projects.filter((p) => p.section === s);
  const isFeatured = (id) => data.featured.includes(id);
  const thumbOf = (p) => {
    if (p.section === 'video') return 'https://i.ytimg.com/vi/' + p.youtube + '/mqdefault.jpg';
    const pend = p.image && pendingImages[p.image.src];
    return pend ? pend.url : p.image ? p.image.src : '';
  };
  const note = (s) => { if (!changes.includes(s)) changes.push(s); };

  function render() {
    $$('[data-tabcount]').forEach((n) => {
      const k = n.dataset.tabcount;
      n.textContent = k === 'featured' ? serialize().featured.length : sectionList(k).length;
    });
    $$('.atab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    const isProfile = tab === 'profile';
    $('#list').hidden = isProfile;
    $('#profileView').hidden = !isProfile;
    $('#tabHint').textContent = isProfile
      ? 'Tu foto aparece en «Sobre mí» de la página de inicio, recortada en vertical (4:5).'
      : tab === 'featured'
        ? 'Orden en que aparecen en «Destacado» de la página de inicio. Marca la estrella en cualquier proyecto para añadirlo.'
        : 'El orden de la lista es el orden de la rueda en la web: el primero es el que aparece al frente.';
    if (isProfile) renderProfile();

    const items = tab === 'featured' ? serialize().featured.map(byId).filter(Boolean) : sectionList(tab);
    const list = $('#list');
    if (!items.length) {
      list.innerHTML = '<li class="aempty">' + (tab === 'featured' ? 'No hay proyectos destacados. Usa la estrella para añadir alguno.' : 'Todavía no hay proyectos aquí.') + '</li>';
    } else {
      list.innerHTML = items.map((p, i) => {
        const meta = [p.category, p.year].filter(Boolean).join(' · ') || (p.section === 'video' ? 'Video' : 'Arte 3D');
        const fav = isFeatured(p.id);
        return '<li class="arow" data-id="' + esc(p.id) + '">' +
          '<span class="arow__n">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<img class="arow__thumb" src="' + esc(thumbOf(p)) + '" alt="" loading="lazy" />' +
          '<div class="arow__info"><strong>' + esc(p.title) + '</strong><span>' + esc(meta) + (tab === 'featured' ? ' · ' + (p.section === 'video' ? 'Video' : 'Arte 3D') : '') + '</span></div>' +
          '<div class="arow__actions">' +
            '<button class="iconbtn" type="button" data-act="up" aria-label="Subir «' + esc(p.title) + '»"' + (i === 0 ? ' disabled' : '') + '>' + icon('i-up') + '</button>' +
            '<button class="iconbtn" type="button" data-act="down" aria-label="Bajar «' + esc(p.title) + '»"' + (i === items.length - 1 ? ' disabled' : '') + '>' + icon('i-down') + '</button>' +
            '<button class="iconbtn iconbtn--star" type="button" data-act="star" aria-pressed="' + fav + '" aria-label="' + (fav ? 'Quitar de Destacado' : 'Añadir a Destacado') + ': «' + esc(p.title) + '»">' + icon('i-star') + '</button>' +
            (tab === 'featured' ? '' :
              '<button class="iconbtn" type="button" data-act="edit" aria-label="Editar «' + esc(p.title) + '»">' + icon('i-edit') + '</button>' +
              '<button class="iconbtn iconbtn--danger" type="button" data-act="del" aria-label="Eliminar «' + esc(p.title) + '»">' + icon('i-trash') + '</button>') +
          '</div></li>';
      }).join('');
    }
    const dirty = isDirty();
    $('#publishBar').hidden = !dirty;
    document.body.classList.toggle('has-bar', dirty);
    const n = changes.length || 1;
    $('#dirtyCount').textContent = n;
    $('#dirtyLabel').textContent = n === 1 ? 'cambio sin publicar' : 'cambios sin publicar';
  }

  $$('.atab').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
  $('.atabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const tabs = $$('.atab');
    const i = tabs.findIndex((t) => t.dataset.tab === tab);
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    tab = next.dataset.tab; render(); next.focus();
  });

  $('#list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const id = b.closest('[data-id]').dataset.id;
    const p = byId(id);
    const act = b.dataset.act;
    if (act === 'edit') return openEditor(id);
    if (act === 'del') {
      if (!confirm('¿Eliminar «' + p.title + '»? Se quitará de la web al publicar.')) return;
      data.projects = data.projects.filter((x) => x.id !== id);
      data.featured = data.featured.filter((x) => x !== id);
      note('elimina «' + p.title + '»');
      toast('«' + p.title + '» eliminado. Publica para aplicarlo.');
    } else if (act === 'star') {
      if (isFeatured(id)) { data.featured = data.featured.filter((x) => x !== id); note('quita de Destacado «' + p.title + '»'); }
      else { data.featured.push(id); note('destaca «' + p.title + '»'); }
    } else if (act === 'up' || act === 'down') {
      const d = act === 'up' ? -1 : 1;
      if (tab === 'featured') {
        const f = data.featured, i = f.indexOf(id), j = i + d;
        if (j < 0 || j >= f.length) return;
        [f[i], f[j]] = [f[j], f[i]];
        note('reordena Destacado');
      } else {
        const same = sectionList(tab);
        const i = same.findIndex((x) => x.id === id), j = i + d;
        if (j < 0 || j >= same.length) return;
        const a = data.projects.indexOf(same[i]), c = data.projects.indexOf(same[j]);
        [data.projects[a], data.projects[c]] = [data.projects[c], data.projects[a]];
        note('reordena ' + (tab === 'video' ? 'Video' : 'Arte 3D'));
      }
    }
    render();
    const again = $('#list [data-id="' + CSS.escape(id) + '"] [data-act="' + act + '"]');
    if (again && !again.disabled) again.focus();
  });

  /* ---------- Tu foto (data.profile.photo) ---------- */
  const PROFILE_DIR = 'assets/profile/';
  const DEFAULT_PHOTO = { src: 'assets/portrait.jpg', width: 577, height: 1280, focus: 30 };
  const photoOf = () => Object.assign({}, DEFAULT_PHOTO, (data.profile && data.profile.photo) || {});
  function renderProfile() {
    const ph = photoOf();
    const logoOnly = ph.hidden === true;
    const pend = pendingImages[ph.src];
    const img = $('#profileImg');
    const src = pend ? pend.url : ph.src;
    if (img.getAttribute('src') !== src) img.src = src;
    img.style.objectPosition = '50% ' + ph.focus + '%';
    img.hidden = logoOnly;
    $('#profileLogo').hidden = !logoOnly;
    $('#profileFrame').classList.toggle('is-logo', logoOnly);
    document.querySelector('input[name="photoMode"][value="' + (logoOnly ? 'logo' : 'photo') + '"]').checked = true;
    $('#focusInput').disabled = logoOnly;
    $('#focusField').classList.toggle('is-off', logoOnly);
    $('#focusInput').value = ph.focus;
    $('#focusVal').textContent = ph.focus + ' %';
    $('#profileInfo').textContent = logoOnly
      ? 'En la web se muestra solo el logo. Tu foto se conserva por si quieres volver a mostrarla.'
      : (ph.width && ph.height ? ph.width + ' × ' + ph.height + ' px' : '') + (pend ? ' · foto nueva, sin publicar' : '');
  }
  $$('input[name="photoMode"]').forEach((r) => r.addEventListener('change', () => {
    const logo = r.value === 'logo';
    setPhoto({ hidden: logo }, logo ? 'muestra solo el logo en «Sobre mí»' : 'muestra la foto en «Sobre mí»');
  }));
  function setPhoto(patch, msg) {
    data.profile = Object.assign({}, data.profile || {}, { photo: Object.assign(photoOf(), patch) });
    note(msg);
    render();
  }
  $('#photoInput').addEventListener('change', async () => {
    const file = $('#photoInput').files[0];
    if (!file) return;
    $('#profileInfo').textContent = 'Procesando…';
    try {
      const im = await processImage(file, 1400);
      const p = PROFILE_DIR + 'foto-' + Date.now().toString(36) + '.' + im.ext;
      pendingImages[p] = { base64: im.base64, url: im.url };
      setPhoto({ src: p, width: im.width, height: im.height, hidden: false }, 'cambia la foto');
      toast('Foto lista. Ajusta el encuadre y pulsa «Publicar en la web».');
    } catch (err) {
      $('#profileInfo').textContent = err.message;
    }
    $('#photoInput').value = '';
  });
  $('#focusInput').addEventListener('input', () => {
    const v = +$('#focusInput').value;
    $('#profileImg').style.objectPosition = '50% ' + v + '%';
    $('#focusVal').textContent = v + ' %';
  });
  $('#focusInput').addEventListener('change', () => setPhoto({ focus: +$('#focusInput').value }, 'ajusta el encuadre de la foto'));

  /* ---------- Editor ---------- */
  const editor = $('#editor');
  const form = $('#editorForm');
  const F = {
    yt: $('#fYoutube'), img: $('#fImage'), title: $('#fTitle'), desc: $('#fDesc'), cat: $('#fCategory'),
    year: $('#fYear'), tools: $('#fTools'), tags: $('#fTags'), link: $('#fLink'), featured: $('#fFeatured')
  };
  const currentSection = () => form.querySelector('input[name="section"]:checked').value;
  function syncSection() {
    const s = currentSection();
    $$('[data-for]', form).forEach((el) => { el.hidden = el.dataset.for !== s; });
    const cats = [];
    sectionList(s).forEach((p) => { if (p.category && !cats.includes(p.category)) cats.push(p.category); });
    $('#catList').innerHTML = cats.map((c) => '<option value="' + esc(c) + '"></option>').join('');
  }
  $$('input[name="section"]', form).forEach((r) => r.addEventListener('change', syncSection));

  function setPreview(src) {
    const img = $('#imgPreview');
    img.hidden = !src;
    if (src) img.src = src; else img.removeAttribute('src');
    $('#drop').classList.toggle('has-img', !!src);
  }

  function openEditor(id) {
    editingId = id || null;
    draftImage = null;
    form.reset();
    $('#editorError').hidden = true;
    $('#imgInfo').textContent = '';
    const p = id ? byId(id) : null;
    $('#editorTitle').textContent = p ? 'Editar proyecto' : 'Nuevo proyecto';
    const sec = p ? p.section : (tab === 'video' ? 'video' : '3d');
    form.querySelector('input[name="section"][value="' + sec + '"]').checked = true;
    if (p) {
      F.yt.value = p.youtube ? 'https://youtu.be/' + p.youtube : '';
      F.title.value = p.title || ''; F.desc.value = p.description || ''; F.cat.value = p.category || '';
      F.year.value = p.year || ''; F.tools.value = p.tools || ''; F.tags.value = (p.tags || []).join(', ');
      F.link.value = p.link || ''; F.featured.checked = isFeatured(p.id);
      setPreview(p.section === '3d' ? thumbOf(p) : '');
      if (p.image) $('#imgInfo').textContent = p.image.width + ' × ' + p.image.height + ' px';
    } else {
      setPreview('');
      if (tab !== 'featured') F.year.value = String(new Date().getFullYear());
    }
    syncSection();
    editor.showModal();
    (p ? F.title : currentSection() === 'video' ? F.yt : F.img).focus();
  }
  $('#newBtn').addEventListener('click', () => openEditor(null));
  $$('[data-close]', editor).forEach((b) => b.addEventListener('click', () => editor.close()));
  editor.addEventListener('click', (e) => { if (e.target === editor) editor.close(); });

  // YouTube: id + título automático (oEmbed)
  function ytId(v) {
    v = String(v || '').trim();
    if (/^[\w-]{11}$/.test(v)) return v;
    const m = v.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/);
    return m ? m[1] : null;
  }
  let ytTimer = 0;
  F.yt.addEventListener('input', () => {
    clearTimeout(ytTimer);
    ytTimer = setTimeout(async () => {
      const id = ytId(F.yt.value);
      if (!id || F.title.value.trim()) return;
      try {
        const r = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id));
        if (r.ok) { const j = await r.json(); if (!F.title.value.trim() && j.title) F.title.value = j.title; }
      } catch (_) { /* sin título automático */ }
    }, 350);
  });

  // Imagen: WebP, máx. 2400 px
  async function processImage(file, maxW) {
    if (!/^image\//.test(file.type)) throw new Error('El archivo no es una imagen.');
    if (file.size > 40 * 1024 * 1024) throw new Error('La imagen pesa más de 40 MB.');
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('No se pudo leer la imagen.')); i.src = url; });
      const scale = Math.min(1, (maxW || 2400) / img.naturalWidth);
      const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      let blob = await new Promise((res) => c.toBlob(res, 'image/webp', 0.86));
      let ext = 'webp';
      if (!blob || blob.type !== 'image/webp') { blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.88)); ext = 'jpg'; }
      const base64 = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.readAsDataURL(blob); });
      return { base64, width: w, height: h, ext, size: blob.size, url: URL.createObjectURL(blob) };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  async function pickImage(file) {
    if (!file) return;
    $('#imgInfo').textContent = 'Procesando…';
    try {
      draftImage = await processImage(file);
      setPreview(draftImage.url);
      $('#imgInfo').textContent = draftImage.width + ' × ' + draftImage.height + ' px · ' + Math.round(draftImage.size / 1024) + ' KB (' + draftImage.ext.toUpperCase() + ')';
      if (!F.title.value.trim()) F.title.value = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
    } catch (err) {
      draftImage = null;
      $('#imgInfo').textContent = err.message;
    }
  }
  F.img.addEventListener('change', () => pickImage(F.img.files[0]));
  const drop = $('#drop');
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('is-over')));
  drop.addEventListener('drop', (e) => { e.preventDefault(); pickImage(e.dataTransfer.files[0]); });

  const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'proyecto';
  function uniqueId(base) {
    let id = base, n = 2;
    while (data.projects.some((p) => p.id === id)) id = base + '-' + n++;
    return id;
  }
  const validUrl = (u) => { try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:'; } catch (_) { return false; } };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const err = (m, field) => { const el = $('#editorError'); el.textContent = m; el.hidden = false; if (field) field.focus(); };
    const section = currentSection();
    const old = editingId ? byId(editingId) : null;
    const title = F.title.value.trim();
    if (section === 'video' && !ytId(F.yt.value)) return err('Pega un enlace de YouTube válido.', F.yt);
    if (section === '3d' && !draftImage && !(old && old.section === '3d' && old.image)) return err('Elige una imagen para el proyecto 3D.', F.img);
    if (!title) return err('El título es obligatorio.', F.title);
    const link = F.link.value.trim();
    if (link && !validUrl(link)) return err('El enlace externo no es una URL válida.', F.link);

    const p = {
      id: old ? old.id : uniqueId(slug(title)),
      section,
      title,
      description: F.desc.value.trim(),
      year: F.year.value.trim(),
      category: F.cat.value.trim(),
      tools: F.tools.value.trim(),
      tags: F.tags.value.split(',').map((t) => t.trim()).filter(Boolean),
      link
    };
    if (section === 'video') p.youtube = ytId(F.yt.value);
    if (section === '3d') {
      if (draftImage) {
        const path = IMG_DIR + p.id + '-' + Date.now().toString(36) + '.' + draftImage.ext;
        pendingImages[path] = { base64: draftImage.base64, url: draftImage.url };
        p.image = { src: path, width: draftImage.width, height: draftImage.height };
      } else {
        p.image = old.image;
      }
    }
    if (!p.link) delete p.link;

    if (old) {
      data.projects[data.projects.indexOf(old)] = p;
      note('edita «' + title + '»');
    } else {
      data.projects.push(p);
      note('añade «' + title + '»');
    }
    const fav = isFeatured(p.id);
    if (F.featured.checked && !fav) data.featured.push(p.id);
    if (!F.featured.checked && fav) data.featured = data.featured.filter((x) => x !== p.id);

    editor.close();
    tab = section;
    render();
    toast((old ? 'Cambios guardados' : 'Proyecto añadido') + '. Pulsa «Publicar en la web» para que todos lo vean.');
  });

  /* ---------- Publicar (un solo commit) ---------- */
  $('#discardBtn').addEventListener('click', () => {
    if (!confirm('¿Descartar todos los cambios sin publicar?')) return;
    data = normalize(JSON.parse(remote.json));
    pendingImages = {}; changes = [];
    render();
  });

  $('#publishBtn').addEventListener('click', async () => {
    const btn = $('#publishBtn');
    btn.disabled = true;
    const label = btn.firstChild;
    const setLabel = (t) => { label.textContent = t + ' '; };
    try {
      setLabel('Comprobando…');
      const ref = await gh(repoPath + '/git/ref/heads/' + BRANCH);
      const head = ref.object.sha;
      if (head !== remote.headSha) {
        const latest = await gh(repoPath + '/contents/' + DATA_PATH + '?ref=' + head, { accept: 'application/vnd.github.raw+json', raw: true });
        if (latest !== remote.json) throw new Error('Los proyectos cambiaron en GitHub desde que abriste el panel. Recarga la página para traer la versión nueva.');
      }
      const out = serialize();
      const used = new Set(out.projects.filter((p) => p.image).map((p) => p.image.src));
      if (out.profile && out.profile.photo && out.profile.photo.src) used.add(out.profile.photo.src);
      const tree = [];
      setLabel('Subiendo imágenes…');
      for (const path of Object.keys(pendingImages)) {
        if (!used.has(path)) continue;
        const blob = await gh(repoPath + '/git/blobs', { method: 'POST', body: { content: pendingImages[path].base64, encoding: 'base64' } });
        tree.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
      }
      // Borra del repo las imágenes del panel que ya no usa ningún proyecto
      const prev = normalize(JSON.parse(remote.json));
      const before = prev.projects.filter((p) => p.image && p.image.src.indexOf(IMG_DIR) === 0).map((p) => p.image.src);
      if (prev.profile && prev.profile.photo && String(prev.profile.photo.src).indexOf(PROFILE_DIR) === 0) before.push(prev.profile.photo.src);
      before.forEach((src) => { if (!used.has(src)) tree.push({ path: src, mode: '100644', type: 'blob', sha: null }); });
      tree.push({ path: DATA_PATH, mode: '100644', type: 'blob', content: JSON.stringify(out, null, 2) + '\n' });

      setLabel('Publicando…');
      const commit = await gh(repoPath + '/git/commits/' + head);
      const newTree = await gh(repoPath + '/git/trees', { method: 'POST', body: { base_tree: commit.tree.sha, tree } });
      const msg = 'Panel: ' + (changes.length ? changes.join(', ') : 'actualiza proyectos');
      const newCommit = await gh(repoPath + '/git/commits', { method: 'POST', body: { message: msg.slice(0, 300), tree: newTree.sha, parents: [head] } });
      await gh(repoPath + '/git/refs/heads/' + BRANCH, { method: 'PATCH', body: { sha: newCommit.sha } });

      await loadRemote();
      render();
      toast('Publicado. Ya está visible en la web para todos.', 'https://github.com/' + OWNER + '/' + REPO + '/commit/' + newCommit.sha);
    } catch (err) {
      toast('No se pudo publicar: ' + (err.status ? friendly(err) : err.message), null, true);
    } finally {
      btn.disabled = false;
      setLabel('Publicar en la web');
    }
  });

  window.addEventListener('beforeunload', (e) => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- Avisos ---------- */
  let toastTimer = 0;
  function toast(msg, href, isError) {
    const t = $('#toast');
    t.innerHTML = esc(msg) + (href ? ' <a href="' + esc(href) + '" target="_blank" rel="noopener">Ver cambio</a>' : '');
    t.classList.toggle('is-error', !!isError);
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, isError ? 9000 : 6000);
  }

  /* ---------- Imágenes recién publicadas: si GitHub Pages aún no las tiene, se piden al repositorio ---------- */
  const RAW = 'https://raw.githubusercontent.com/' + OWNER + '/' + REPO + '/' + BRANCH + '/';
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || img.dataset.raw) return;
    const src = img.getAttribute('src') || '';
    if (src.indexOf('assets/') !== 0) return;
    img.dataset.raw = '1';
    img.src = RAW + src;
  }, true);

  /* ---------- Arranque ---------- */
  const saved = store.get();
  if (saved) {
    signIn(saved).catch((err) => { store.clear(); showLogin(friendly(err)); });
  } else {
    showLogin();
  }
})();
