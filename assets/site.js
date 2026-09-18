/* ============================================================
   AISAK 3D — comportamiento compartido por las 3 páginas
   Antes este código estaba copiado y pegado en el <script> en
   línea de index.html, 3d.html y videos.html: cualquier arreglo
   había que hacerlo tres veces y se desincronizaban.
   Aquí está en un solo sitio. Se carga DESPUÉS de animations.js
   y solo se activa lo que exista en cada página.

   Contenido:
     1. Header: sombra al hacer scroll
     2. Nav activo según la sección visible (solo en index)
     3. Numeración y total de las piezas (P01, V03…)
     4. Reveals de respaldo si GSAP no cargó
     5. Cursor personalizado (punto + etiqueta VER/ABRIR)
     6. Telaraña reactiva al cursor
     7. Contadores del bloque "En números"
     8. Reproductor de YouTube con fachada (miniatura → iframe)
     9. Año automático del footer
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* Umbrales y tiempos compartidos (NAMING-3: nombres en vez de literales). */
  var SCROLL_UMBRAL_PX = 40;
  var CURSOR_LERP = 0.22;
  var TELA_LERP = 0.12;
  var TELA_UMBRAL_PARADA = 0.05;
  var CONTEO_DURACION_MS = 1400;
  var YT_AVISO_FALLO_MS = 8000;

  /* ---------- 1. HEADER ---------- */
  var hdr = document.getElementById("hdr");
  if (hdr) {
    var onScroll = function () {
      hdr.classList.toggle("hdr--scrolled", window.scrollY > SCROLL_UMBRAL_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- 2. NAV ACTIVO (solo index) ---------- */
  var links = document.querySelectorAll(".hdr__link");
  var secciones = ["slate", "contact"];
  if (links.length && "IntersectionObserver" in window) {
    var observadas = [];
    secciones.forEach(function (id) {
      var s = document.getElementById(id);
      if (s) observadas.push(s);
    });
    if (observadas.length) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          links.forEach(function (l) {
            var href = l.getAttribute("href") || "";
            var destino = href.indexOf("#") > -1 ? href.split("#")[1] : href.replace(".html", "");
            l.classList.toggle("is-active", destino === e.target.id);
          });
        });
      }, { rootMargin: "-45% 0px -45% 0px" });
      observadas.forEach(function (s) { obs.observe(s); });
    }
  }

  /* ---------- 3. NUMERACIÓN Y TOTAL DE LAS PIEZAS ---------- */
  /* Los "P01" / "V03" del slate salen de la POSICIÓN real en la lista, no de
     un número escrito a mano: al insertar o quitar una pieza se renumera
     solo. La etiqueta "P / 01" del índice la pone el CSS con contadores
     (ver .project__index::before), así que no hay doble mantenimiento. */
  Array.prototype.forEach.call(document.querySelectorAll(".projects"), function (lista) {
    var piezas = lista.querySelectorAll(".project");
    var tipo = (getComputedStyle(lista).getPropertyValue("--code") || "P").trim();
    Array.prototype.forEach.call(piezas, function (pieza, i) {
      var destino = pieza.querySelector(".project__n");
      if (!destino) return;
      var n = (i + 1) < 10 ? "0" + (i + 1) : String(i + 1);
      destino.textContent = tipo + n;
    });
  });

  /* ---------- 4. REVEALS DE RESPALDO ---------- */
  /* Solo actúan si GSAP no cargó: si está, él controla los reveals. */
  if (!(window.gsap && window.ScrollTrigger)) {
    var nodos = document.querySelectorAll("[data-reveal]");
    if (nodos.length) {
      if (reduceMotion || !("IntersectionObserver" in window)) {
        Array.prototype.forEach.call(nodos, function (n) { n.dataset.state = "in"; });
      } else {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              e.target.dataset.state = "in";
              io.unobserve(e.target);
            }
          });
        }, { rootMargin: "-10% 0px" });
        Array.prototype.forEach.call(nodos, function (n) {
          n.dataset.state = "out";
          io.observe(n);
        });
      }
    }
  }

  /* ---------- 5. CURSOR PERSONALIZADO ---------- */
  var cursor = document.getElementById("cursor");
  var cursorLabel = document.getElementById("cursorLabel");
  if (cursor && cursorLabel && finePointer && !reduceMotion) {
    var x = window.innerWidth / 2, y = window.innerHeight / 2;
    var tx = x, ty = y;
    var pintar = function () {
      x += (tx - x) * CURSOR_LERP;
      y += (ty - y) * CURSOR_LERP;
      cursor.style.transform = "translate(" + x + "px, " + y + "px) translate(-50%, -50%)";
      requestAnimationFrame(pintar);
    };
    pintar();
    window.addEventListener("pointermove", function (e) {
      tx = e.clientX;
      ty = e.clientY;
    }, { passive: true });

    /* La etiqueta se escribe al entrar y se limpia al salir, para que
       al pasar de un elemento "ABRIR" a uno "VER" no quede el texto viejo. */
    Array.prototype.forEach.call(document.querySelectorAll("[data-cursor]"), function (el) {
      var modo = el.getAttribute("data-cursor");
      el.addEventListener("pointerenter", function () {
        cursor.classList.add("is-view");
        cursorLabel.textContent = modo === "open" ? "ABRIR" : "VER";
      });
      el.addEventListener("pointerleave", function () {
        cursor.classList.remove("is-view");
        cursorLabel.textContent = "";
      });
    });
  }

  /* ---------- 6. TELARAÑA REACTIVA AL CURSOR ---------- */
  /* Un solo listener por zona + rAF con interpolación: la tela sigue al
     ratón con retardo, que es lo que lee como seda y no como pegatina.
     Se apaga solo con reduce-motion o puntero grueso. */
  var zonas = document.querySelectorAll(".react");
  if (zonas.length && finePointer && !reduceMotion) {
    Array.prototype.forEach.call(zonas, function (zona) {
      var mx = 50, my = 50, tx = 50, ty = 50, vivo = false;
      var tick = function () {
        mx += (tx - mx) * TELA_LERP;
        my += (ty - my) * TELA_LERP;
        zona.style.setProperty("--mx", mx.toFixed(2) + "%");
        zona.style.setProperty("--my", my.toFixed(2) + "%");
        if (Math.abs(tx - mx) > TELA_UMBRAL_PARADA || Math.abs(ty - my) > TELA_UMBRAL_PARADA) {
          requestAnimationFrame(tick);
        } else {
          vivo = false;
        }
      };
      zona.addEventListener("pointermove", function (e) {
        var r = zona.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width) * 100;
        ty = ((e.clientY - r.top) / r.height) * 100;
        if (!vivo) { vivo = true; requestAnimationFrame(tick); }
      }, { passive: true });
    });
  }

  /* ---------- 7. CONTADORES ---------- */
  /* El número se pinta con `content: counter(n)` en CSS y se anima con
     @property + steps(). Si el navegador no registra @property (o hay
     reduce-motion) se escribe el número final en un <span> de respaldo:
     un contador NUNCA debe quedarse en cero ni mostrar el valor crudo. */
  var contadores = document.querySelectorAll(".count");
  if (contadores.length) {
    var soportaProperty = !!(window.CSS && window.CSS.registerProperty);
    var arrancar = function (el) {
      var destino = parseInt(getComputedStyle(el).getPropertyValue("--target"), 10) || 0;
      var caja = el.querySelector(".count__n");
      if (!caja) return;
      if (reduceMotion) {
        /* Sin animación: número final, sin depender de @property */
        el.classList.add("sin-animacion");
        escribe(caja, destino);
        return;
      }
      if (soportaProperty) {
        el.classList.add("is-on");
        /* Al terminar la animación el CSS pinta el valor final por sí solo */
        return;
      }
      /* Sin @property (p. ej. Firefox sin CSS.registerProperty): animamos
         nosotros el texto en <b> y ocultamos el ::after para no duplicar. */
      el.classList.add("sin-animacion");
      var t0 = performance.now(), dur = CONTEO_DURACION_MS;
      var paso = function (ahora) {
        var p = Math.min(1, (ahora - t0) / dur);
        escribe(caja, Math.round(destino * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    };
    var escribe = function (caja, valor) {
      /* El texto visible va en un <b> para no pisar el ::after ni el sr-only */
      var visible = caja.querySelector(".count__v");
      if (!visible) {
        visible = document.createElement("b");
        visible.className = "count__v";
        visible.setAttribute("aria-hidden", "true");
        caja.appendChild(visible);
      }
      visible.textContent = valor;
    };
    if ("IntersectionObserver" in window) {
      var ioCount = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          arrancar(e.target);
          ioCount.unobserve(e.target);
        });
      }, { rootMargin: "-15% 0px" });
      Array.prototype.forEach.call(contadores, function (c) { ioCount.observe(c); });
    } else {
      Array.prototype.forEach.call(contadores, arrancar);
    }
  }

  /* ---------- 8. REPRODUCTOR DE YOUTUBE (fachada) ---------- */
  /* miniatura + botón ▶ que inyecta el iframe con autoplay.
     Si YouTube no responde en 8s (sin red, bloqueado, o página abierta
     con file:// donde no hay Referer) se muestra un aviso con enlace
     directo en vez de dejar un recuadro negro. */
  var botones = document.querySelectorAll(".thumb-btn[data-yt]");
  Array.prototype.forEach.call(botones, function (btn) {
    btn.addEventListener("click", function () {
      var id = btn.getAttribute("data-yt");
      var titulo = btn.getAttribute("data-title") || "Video";
      var figure = btn.closest("figure");
      if (!id || !figure) return;

      var iframe = document.createElement("iframe");
      iframe.src = "https://www.youtube.com/embed/" + id + "?autoplay=1&rel=0&playsinline=1";
      iframe.title = titulo;
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      /* YouTube exige el header Referer: hay que enviarlo siempre. */
      iframe.referrerPolicy = "strict-origin-when-cross-origin";

      var cargado = false;
      iframe.addEventListener("load", function () { cargado = true; });

      figure.innerHTML = "";
      figure.classList.remove("thumb-embed");
      figure.classList.add("video-embed");
      figure.appendChild(iframe);

      setTimeout(function () {
        if (cargado || !figure.classList.contains("video-embed")) return;
        figure.classList.remove("video-embed");
        figure.classList.add("video-fallo");
        figure.innerHTML =
          "<p>No se pudo cargar el reproductor aquí.<br>" +
          "Si abriste la web con doble clic, usa <b>ABRIR-WEB.cmd</b> para verla " +
          "en http://localhost: YouTube necesita un origen web.</p>" +
          '<a class="btn" href="https://youtu.be/' + id + '" target="_blank" rel="noopener">Ver en YouTube &rarr;</a>';
      }, YT_AVISO_FALLO_MS);
    });
  });

  /* ---------- 9. AÑO ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
