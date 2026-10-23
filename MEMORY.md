# MEMORY.md

## Estado actual
- Web estática (index.html, style.css, script.js) para "Reformas Joaquín" (Barcelona).
- Sección "Proyectos" dinámica: carga carpetas desde `proyectos-reformas/` vía `proyectos.json`.
- Calculadora de presupuesto (#presupuesto) con extras dinámicos por tipo de reforma.
- Requiere servidor local (npx serve / python http.server) por CORS.

## Decisiones importantes
- Categorías en `info.json` siempre en minúscula: `baños`, `cocinas`, `salones`, `reformas integrales`, `terrazas`, `otros`.
- El JS usa el valor tal cual como clave de filtro; display con Title Case.
- Imágenes faltantes → placeholder vía onerror.
- Comparadores inicializados por clase (sin IDs fijos).
- toTitleCase capitaliza solo primera letra de cada palabra (evita "Baños").
- Tipos de reforma en calculadora: bano, cocina, terraza, salon, integral.
- Extras dinámicos según tipo (5 por tipo) definidos en `EXTRAS_BY_TYPE` (script.js).

## Errores a evitar
- No usar categorías capitalizadas en info.json.
- No abrir con file:// (CORS rompe fetch).
- No añadir dependencias/build (AGENTS.md).

## Pendiente
- Rellenar info.json e imágenes de los 6 proyectos.
- Definir precios base por m² por tipo y calidad (actualmente placeholder).
- Definir multiplicadores/suplementos de calidad (actualmente no afectan al cálculo).
- Revisar precios de extras (actualmente orientativos).