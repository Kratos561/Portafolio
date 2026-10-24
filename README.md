# Portafolio — Isaac Lorenzo / AISAK 3D

Portafolio estático de arte 3D y video con estética de póster: negro, resplandor rojo, tipografía Anton y una serpiente roja animada que se entrelaza con la palabra de cada portada. Está hecho con HTML, CSS y JS vanilla, sin build ni dependencias de JS.

Se publica con GitHub Pages desde la rama `main` (raíz). La versión anterior del sitio está en la rama [`version-anterior`](../../tree/version-anterior).

## Estructura

```
index.html          Portada + sobre mí + galerías + destacado + servicios + proceso + contacto
3d.html             Galería de Arte 3D (se pinta desde data/projects.json)
videos.html         Galería de videos de YouTube (se pinta desde data/projects.json)
admin.html          Panel privado del propietario para añadir y publicar proyectos
data/projects.json  Única fuente de los proyectos y de «Destacado»
styles.css          Estilo de las páginas
assets/site.js      Header, reveal, ticker, copiar email y la serpiente SVG
assets/projects.js  Tarjetas, filtros, contadores y visor a pantalla completa
assets/admin.*      Lógica y estilo del panel
PRODUCT.md / DESIGN.md / LEEME.txt  Documentación
```

## Añadir proyectos

Desde `admin.html` (no enlazada en la web). Se entra con un token *fine-grained* de GitHub con **Contents: Read and write** sobre este repositorio; solo acepta la cuenta del propietario. Al pulsar «Publicar en la web» se hace un commit en `main` y GitHub Pages actualiza la web en 1–2 minutos. Detalles en `LEEME.txt`.

## Ver en local

Los videos de YouTube exigen un origen `http/https` (con `file://` dan Error 153):

- Fácil: doble clic en `ABRIR-WEB.cmd` → `http://localhost:8000`
- Manual: `powershell -ExecutionPolicy Bypass -File .\servidor-local.ps1`

## Contacto

isaacjhovanni@gmail.com · [YouTube](https://www.youtube.com/@Ekko-Sound) · [ArtStation](https://www.artstation.com/isazz_jv)
