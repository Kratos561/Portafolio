# Portafolio — Isaac Lorenzo / AISAK 3D

Portafolio estático de arte 3D y video. Sin build ni framework: HTML + CSS + JS vanilla con GSAP por CDN.

Publicado con GitHub Pages desde la rama `main` (raíz).

## Estructura

```
index.html        Portada + sobre mí + selección + servicios + proceso + contacto
3d.html           Galería Arte 3D (4 piezas)
videos.html       Galería Video (6 piezas de YouTube)
styles.css        Estilo compartido por las 3 páginas
assets/site.js        Comportamiento común (nav, reveals, cursor, contadores, fachada YouTube)
assets/animations.js  Animaciones GSAP con respaldo si el CDN falla
```

## Ver en local (recomendado para los videos)

Los videos de YouTube exigen origen `http/https` (con `file://` dan Error 153):

- Fácil: doble clic en `ABRIR-WEB.cmd` → `http://localhost:8000`
- Manual: `powershell -ExecutionPolicy Bypass -File .\servidor-local.ps1`
- Documentación de trabajo: `LEEME.txt`

## Notas

- Email y dominio (`hello@isaaclorenzo.example`, `aisak3d.example`) son marcadores: cambiar por los reales al publicar el dominio definitivo.
- Fuente Ethnocentric (Typodermic): gratuita para uso personal, requiere licencia comercial. Verificar antes de uso comercial o usar Bricolage Grotesque (ya de respaldo).
