# MEMORY.md

## Estado actual
- Web estática (index.html, style.css, script.js) para "Reformas Joaquín".
- Sección "Proyectos" dinámica: carga carpetas desde `proyectos-reformas/` vía `proyectos.json`.
- Requiere servidor local (npx serve / python http.server) por CORS.

## Decisiones importantes
- Categorías en `info.json` siempre en minúscula: `baños`, `cocinas`, `salones`, `reformas integrales`, `terrazas`, `otros`.
- El JS usa el valor tal cual como clave de filtro; display con Title Case.
- Imágenes faltantes → placeholder vía onerror.
- Comparadores inicializados por clase (sin IDs fijos).

## Errores a evitar
- No usar categorías capitalizadas en info.json.
- No abrir con file:// (CORS rompe fetch).
- No añadir dependencias/build (AGENTS.md).

## Pendiente
- Rellenar info.json e imágenes de los 6 proyectos.