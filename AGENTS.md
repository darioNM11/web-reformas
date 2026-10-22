# AGENTS.md

Static single-page website for "Reformas Joaquín" (home renovation company).

## Stack
- Plain HTML5 / CSS3 / vanilla JS. No build step, no dependencies, no package manager.
- Three files: `index.html`, `style.css`, `script.js`. Edit directly; no compilation.

## Verification
- Serve locally to avoid CORS: `python -m http.server 8000` or `npx serve .`, then open `http://localhost:8000`.
- No test/lint/typecheck commands exist.
- JS is unminified and loaded via `<script src="script.js">` at end of body; keep it that way.

## Conventions
- All copy is in Spanish; keep language consistent.
- CSS uses custom properties in `:root` (`--accent`, etc.); prefer variables over hardcoded colors.
- Images are remote Unsplash URLs; keep `loading="lazy"` on below-fold images.
- Before/after comparators (`.ba-compare`) are initialized by class in `script.js`; do not add fixed IDs.
- Project filtering uses `.filter-btn` + `data-filter`/`data-category`; keep categories in sync between HTML and JS.

## Working notes
- Make small, focused edits; do not rewrite working code.
- Summarize changes at the end.