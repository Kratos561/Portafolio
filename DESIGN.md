# Design

Mundo visual: **póster de portafolio** (referencia del dueño). Sustituye por completo la estética editorial anterior (papel/serif/mono).

## Color
| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#050505` | Fondo de toda la web |
| `--surface` | `#0e0e0e` | Tarjetas, marcos |
| `--fg` | `#F7F5F0` | Texto y letras del póster |
| `--muted` | `#A39E97` | Texto secundario (7:1 sobre el fondo) |
| `--red` | `#E10600` | Rellenos: serpiente, botones, letra alta |
| `--red-ink` | `#FF3324` | Texto rojo pequeño (5,3:1 sobre el fondo) |
| `--line` | `rgba(247,245,240,.12)` | Divisores |

Resplandor: `radial-gradient` rojo detrás de cada palabra-póster y del contacto.

## Tipografía
- **Anton**: voz display. Siempre en mayúsculas y en bloques grandes.
- **Archivo** (variable, `wdth` 62–125): texto, navegación y píldoras. Las píldoras usan `wdth 115`, peso 800.

## Firma
1. **Palabra-póster** (`.poster`): letras Anton blancas a todo el ancho, con una letra alargada (`.ch--tall`, `scale: 1 1.7`). Tres píldoras alrededor (rol, año o número, nombre).
2. **Serpiente** (`[data-snake]`): un SVG generado por `site.js` con dos capas (detrás y delante de las letras) que se entrelazan alrededor de la letra alta. Entra reptando y ondula sin parar; se pausa fuera de pantalla y queda quieta con `prefers-reduced-motion`.
3. **Letra alta roja** (`.tall`) en cada título de sección: repite el gesto del póster.
4. **Píldoras** (`.pill`): texto rojo, borde blanco de 1px y radio de .45em.
5. **Rueda de proyectos** (`.wheel` + `.wcard`): tarjetas 3:4 de bordes redondeados que orbitan un centro bajo la vista; la activa, recta y con borde rojo. Centro con aro discontinuo, texto circular, puntero ▲ rojo y nombre del proyecto en Anton. Navegación mínima ‹ 03 / 10 › con índice desplegable.
6. **Ficha** (`.viewer`): pantalla completa negra con el medio a la izquierda y los detalles a la derecha (debajo en móvil); la miniatura se transforma en ella.

## Movimiento
- El único momento de autor es la entrada de la portada (las letras suben y la serpiente repta).
- Las secciones aparecen con un fundido corto. Por defecto el contenido es visible: solo se oculta con JS el que está por debajo del pliegue.

## Iconos
Sprite SVG inline (`#i-arrow`, `#i-play`, `#i-expand`, `#i-close`, `#i-prev`, `#i-next`, `#i-ext`, `#i-copy`, `#i-check`, `#i-up`) con trazo de 1.75.
