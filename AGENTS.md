# AGENTS.md

Sitio web estático de una sola página para "Reformas Joaquín" (empresa de reformas).

## Stack
- HTML5, CSS3 y JavaScript puro. Sin build, sin dependencias, sin gestor de paquetes.
- Tres archivos: `index.html`, `style.css`, `script.js`. Se editan directamente, sin compilación.

## Verificación
- Servir localmente para evitar CORS: `python -m http.server 8000` o `npx serve .`, luego abrir `http://localhost:8000`.
- No hay comandos de test, lint ni typecheck.
- El JS no está minificado y se carga con `<script src="script.js">` al final del body; mantener así.

## Convenciones
- Todos los textos de la interfaz en español.
- El CSS usa variables personalizadas en `:root` (`--accent`, etc.); preferir variables sobre colores fijos.
- Las imágenes son URLs remotas de Unsplash; mantener `loading="lazy"` en imágenes below-fold.
- Los comparadores antes/después (`.ba-compare`) se inicializan por clase en `script.js`; no añadir IDs fijos.
- El filtrado de proyectos usa `.filter-btn` + `data-filter`/`data-category`; mantener categorías sincronizadas entre HTML y JS.
- La calculadora de presupuesto: extras dinámicos por tipo de reforma (EXTRAS_BY_TYPE en script.js). Precios y multiplicadores de calidad pendientes (ver MEMORY.md).
- El visualizador 3D: CSS 3D puro, clases `is-*` (escenario), `has-*` (extras), `q-*` (calidad). Sin dependencias.

## Notas de trabajo
- Hacer cambios pequeños y enfocados; no reescribir código que ya funciona.
- Resumir los cambios al final.