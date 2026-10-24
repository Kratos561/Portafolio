# Portafolio — Isaac Lorenzo / AISAK 3D

Portafolio estático de arte 3D y video con estética de póster: negro, resplandor rojo, tipografía Anton y una serpiente roja animada que se entrelaza con la palabra de cada portada. Está hecho con HTML, CSS y JS vanilla, sin build ni dependencias de JS.

Se publica con GitHub Pages desde la rama `main` (raíz). La versión anterior del sitio está en la rama [`version-anterior`](../../tree/version-anterior).

## Estructura

```
index.html      Portada + sobre mí + galerías + destacado + servicios + proceso + contacto
3d.html         Arte 3D: Vintage Optics, Volatile Assets, Red Breath, Weapon environment
videos.html     6 videos de YouTube (patrón fachada, se reproducen dentro de la web)
styles.css      Estilo único de las 3 páginas
assets/site.js  Header, reveal, ticker, fachada YouTube, copiar email y la serpiente SVG
PRODUCT.md      Contexto del producto
DESIGN.md       Sistema visual (tokens, firma, movimiento)
LEEME.txt       Documentación de trabajo
```

## Ver en local

Los videos de YouTube exigen un origen `http/https` (con `file://` dan Error 153):

- Fácil: doble clic en `ABRIR-WEB.cmd` → `http://localhost:8000`
- Manual: `powershell -ExecutionPolicy Bypass -File .\servidor-local.ps1`

## Contacto

isaacjhovanni@gmail.com · [YouTube](https://www.youtube.com/@Ekko-Sound) · [ArtStation](https://www.artstation.com/isazz_jv)
