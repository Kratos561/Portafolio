/* ============================================================
   AISAK 3D — Animaciones GSAP
   Skills: gsap-core (tweens, eases, stagger, matchMedia),
           gsap-timeline (labels, position parameter),
           gsap-scrolltrigger (batch, scrub, once).
   Si el CDN no carga, la web usa su sistema CSS/IO de respaldo.

   Tres contextos de matchMedia, separados a propósito:
     1) base       -> reveals, marquee, parallax (siempre, salvo reduce-motion)
     2) finePointer-> inclinación 3D y botones magnéticos (solo ratón)
     3) reduceMotion-> deja todo visible y estático, sin animación
   ============================================================ */
(function () {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  gsap.defaults({ duration: 0.7, ease: "power3.out" });

  const mm = gsap.matchMedia();

  /* ---------- 1) BASE: movimiento por scroll, sin depender del puntero ---------- */
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    document.documentElement.classList.add("gsap-on");

    /* PORTAFOLIO: respiración + un brillo MUY leve por letra.
       Antes bajaba la opacidad a 0,55 en bucle infinito, y eso degrada el
       contraste del H1 de forma permanente (legibilidad y WCAG 2.2.2).
       Ahora el brillo va de 1 a 0,82 y se pausa con el ratón encima o al
       enfocar con el teclado, que es cuando el movimiento molesta. */
    const word = document.getElementById("portafolioWord");
    if (word && !word.querySelector("span")) {
      const text = word.textContent.trim();
      word.textContent = "";
      text.split("").forEach((ch) => {
        const s = document.createElement("span");
        s.textContent = ch;
        word.appendChild(s);
      });
    }
    if (word) {
      gsap.to(word, {
        scale: 1.015, duration: 3.2, ease: "sine.inOut",
        yoyo: true, repeat: -1, transformOrigin: "50% 50%"
      });
      const brillo = gsap.to("#portafolioWord > span", {
        opacity: 0.82, duration: 1.6, ease: "sine.inOut",
        stagger: { each: 0.18, yoyo: true, repeat: -1 }
      });
      word.addEventListener("pointerenter", () => brillo.pause());
      word.addEventListener("pointerleave", () => brillo.resume());
      word.addEventListener("focusin", () => brillo.pause());
      word.addEventListener("focusout", () => brillo.resume());
    }

    /* Hero: logo flotante en subpáginas.
       Se anima el ENVOLTORIO .hero__logo, no la imagen: así este tween
       (yoyo) y el parallax de abajo (scrub) no se pisan entre sí y el
       logo no se escapa hacia el titular. */
    const heroLogoBox = document.querySelector(".hero__logo");
    const heroLogoImg = document.querySelector(".hero__logo img");
    if (heroLogoBox && heroLogoImg) {
      gsap.to(heroLogoBox, { y: -12, duration: 2.6, ease: "sine.inOut", yoyo: true, repeat: -1 });
    }

    /* Hero: parallax al hacer scroll (scrub) */
    if (document.querySelector(".hero")) {
      /* Solo si el logo flota (>=1101px). Por debajo entra en el flujo y
         desplazarlo lo acercaría al titular. */
      if (heroLogoBox && window.matchMedia("(min-width: 1101px)").matches) {
        gsap.to(heroLogoBox, {
          yPercent: 8, ease: "none",
          scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
        });
      }
      if (word) {
        gsap.to(word, {
          yPercent: 10, ease: "none",
          scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
        });
      }
      if (document.querySelector(".hero__name")) {
        gsap.to(".hero__name", {
          yPercent: -10, ease: "none",
          scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
        });
      }
    }

    /* Reveals por scroll, con stagger por lotes */
    const FROM = {
      up:    { from: { y: 28, autoAlpha: 0 }, to: { y: 0, autoAlpha: 1 } },
      right: { from: { x: 40, autoAlpha: 0 }, to: { x: 0, autoAlpha: 1 } },
      mask:  { from: { clipPath: "inset(0 0 100% 0)" }, to: { clipPath: "inset(0 0 0% 0)" } }
    };
    ["up", "right", "mask"].forEach((kind) => {
      const els = gsap.utils.toArray('[data-reveal][data-from="' + kind + '"]');
      if (!els.length) return;
      gsap.set(els, FROM[kind].from);
      ScrollTrigger.batch(els, {
        start: "top 88%",
        once: true,
        onEnter: (batch) => gsap.to(batch, {
          ...FROM[kind].to,
          duration: 1.1,
          ease: "power3.out",
          stagger: 0.12,
          overwrite: true
        })
      });
    });

    /* Marquee infinito (solo en la principal).
       WCAG 2.2.2: movimiento automático de más de 5 s sin control. Se
       resuelve parándolo cuando el ratón está encima o hay foco de teclado,
       que es justo cuando el usuario quiere leerlo. */
    const marquee = document.querySelector(".marquee");
    if (marquee && marquee.children.length) {
      Array.from(marquee.children).forEach((node) => {
        const clone = node.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        marquee.appendChild(clone);
      });
      const tira = gsap.fromTo(
        marquee,
        { x: 0 },
        { x: () => -(marquee.scrollWidth / 2), duration: 24, ease: "none", repeat: -1 }
      );
      marquee.addEventListener("pointerenter", () => tira.pause());
      marquee.addEventListener("pointerleave", () => tira.resume());
      marquee.addEventListener("focusin", () => tira.pause());
      marquee.addEventListener("focusout", () => tira.resume());
    }

    /* Retrato: deriva sutil con el scroll */
    if (document.querySelector(".portrait")) {
      gsap.fromTo(".portrait", { y: -16 }, {
        y: 16, ease: "none",
        scrollTrigger: { trigger: ".about__grid", start: "top bottom", end: "bottom top", scrub: true }
      });
    }

    return () => {
      document.documentElement.classList.remove("gsap-on");
    };
  });

  /* ---------- 2) PUNTERO FINO: inclinación 3D y botones magnéticos ---------- */
  mm.add("(hover: hover) and (pointer: fine)", () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const word = document.getElementById("portafolioWord");

    document.querySelectorAll(".btn").forEach((btn) => {
      const xTo = gsap.quickTo(btn, "x", { duration: 0.3, ease: "power2.out" });
      const yTo = gsap.quickTo(btn, "y", { duration: 0.3, ease: "power2.out" });
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.25);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.35);
      });
      btn.addEventListener("pointerleave", () => { xTo(0); yTo(0); });
    });

    if (word) {
      gsap.set(word, { transformPerspective: 1000 });
      const tiltX = gsap.quickTo(word, "rotationX", { duration: 0.6, ease: "power2.out" });
      const tiltY = gsap.quickTo(word, "rotationY", { duration: 0.6, ease: "power2.out" });
      const zone = document.querySelector(".hero--cover") || document;
      zone.addEventListener("pointermove", (e) => {
        const r = word.getBoundingClientRect();
        const px = (e.clientX - (r.left + r.width / 2)) / r.width;
        const py = (e.clientY - (r.top + r.height / 2)) / r.height;
        tiltY(gsap.utils.clamp(-12, 12, px * 24));
        tiltX(gsap.utils.clamp(-10, 10, -py * 20));
      });
      zone.addEventListener("pointerleave", () => { tiltX(0); tiltY(0); });
    }
  });

  /* ---------- 3) REDUCE-MOTION: nada de animación, todo visible ---------- */
  mm.add("(prefers-reduced-motion: reduce)", () => {
    document.documentElement.classList.remove("gsap-on");
    gsap.set("[data-reveal]", {
      clearProps: "all",
      autoAlpha: 1,
      x: 0,
      y: 0,
      clipPath: "inset(0 0 0% 0)"
    });
    ScrollTrigger.refresh();
  });

  /* ---------- Recalcula triggers al cargar fuentes/imágenes ---------- */
  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
