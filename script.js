/* ===== Navbar móvil ===== */
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
navToggle.addEventListener('click', () => {
  const open = navMenu.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
});
navMenu.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', () => {
  navMenu.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
}));

/* ===== Comparadores Antes/Después (múltiples) ===== */
let activeCompare = null;

function setCompare(container, percent) {
  const p = Math.max(0, Math.min(100, percent));
  const after = container.querySelector('.ba-after');
  const handle = container.querySelector('.ba-handle');
  if (!after || !handle) return;
  after.style.clipPath = `inset(0 ${100 - p}% 0 0)`;
  handle.style.left = p + '%';
  handle.setAttribute('aria-valuenow', Math.round(p));
}

function percentFromEvent(container, e) {
  const rect = container.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  return ((clientX - rect.left) / rect.width) * 100;
}

function initCompares(root = document) {
  root.querySelectorAll('.ba-compare').forEach(container => {
    if (container.dataset.initialized === '1') return;
    container.dataset.initialized = '1';
    const handle = container.querySelector('.ba-handle');
    handle.addEventListener('mousedown', (e) => { activeCompare = container; setCompare(container, percentFromEvent(container, e)); e.preventDefault(); });
    handle.addEventListener('touchstart', (e) => { activeCompare = container; setCompare(container, percentFromEvent(container, e)); e.preventDefault(); }, { passive: false });
    container.addEventListener('mousedown', (e) => {
      if (e.target === container || e.target.classList.contains('ba-img') || e.target.classList.contains('ba-label')) {
        activeCompare = container; setCompare(container, percentFromEvent(container, e));
      }
    });
    container.addEventListener('touchstart', (e) => {
      if (e.target === container || e.target.classList.contains('ba-img') || e.target.classList.contains('ba-label')) {
        activeCompare = container; setCompare(container, percentFromEvent(container, e));
      }
    }, { passive: false });
    handle.addEventListener('keydown', (e) => {
      const cur = parseFloat(handle.getAttribute('aria-valuenow')) || 50;
      if (e.key === 'ArrowLeft') { setCompare(container, cur - 5); e.preventDefault(); }
      if (e.key === 'ArrowRight') { setCompare(container, cur + 5); e.preventDefault(); }
    });
    // estado inicial
    setCompare(container, 50);
  });
}

window.addEventListener('mousemove', (e) => {
  if (activeCompare) setCompare(activeCompare, percentFromEvent(activeCompare, e));
});
window.addEventListener('touchmove', (e) => {
  if (activeCompare) { setCompare(activeCompare, percentFromEvent(activeCompare, e)); e.preventDefault(); }
}, { passive: false });
function endDrag() { activeCompare = null; }
window.addEventListener('mouseup', endDrag);
window.addEventListener('touchend', endDrag);

/* ===== Carga dinámica de proyectos ===== */
const CANONICAL = ['baños', 'cocinas', 'salones', 'reformas integrales', 'terrazas', 'otros'];
const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=70';

function toTitleCase(str) {
  return String(str).split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function normalizeCategory(raw) {
  return String(raw || '').trim().toLowerCase();
}

function buildCard(proj, basePath) {
  const cat = normalizeCategory(proj.categoria);
  const before = `${basePath}/antes.jpg`;
  const after = `${basePath}/despues.jpg`;
  const destacado = proj.destacado ? ' featured' : '';
  return `
    <article class="project-card${destacado}" data-category="${cat}">
      <div class="ba-compare">
        <img class="ba-img ba-before" src="${before}" alt="${proj.titulo} antes" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'" />
        <img class="ba-img ba-after" src="${after}" alt="${proj.titulo} después" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'" />
        <span class="ba-label ba-label-before">Antes</span>
        <span class="ba-label ba-label-after">Después</span>
        <div class="ba-handle" role="slider" aria-label="Comparador antes y después" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" tabindex="0">
          <span class="ba-handle-line"></span>
          <span class="ba-handle-knob">↔</span>
        </div>
      </div>
      <div class="project-info">
        <span class="project-category">${toTitleCase(cat)}</span>
        <h3>${proj.titulo}</h3>
        <p>${proj.descripcion}</p>
        <span class="project-duration">⏱ ${proj.duracion}</span>
      </div>
    </article>`;
}

async function loadProjects() {
  const grid = document.getElementById('projectsGrid');
  const filters = document.getElementById('projectFilters');
  const status = document.getElementById('projectsStatus');
  try {
    const idxRes = await fetch('proyectos.json', { cache: 'no-store' });
    if (!idxRes.ok) throw new Error('No se pudo cargar proyectos.json');
    const idx = await idxRes.json();
    const paths = Array.isArray(idx.proyectos) ? idx.proyectos : [];

    const results = await Promise.allSettled(paths.map(async (p) => {
      const r = await fetch(`${p}/info.json`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`info.json no encontrado: ${p}`);
      const data = await r.json();
      if (!data.titulo || !data.categoria || !data.descripcion || !data.duracion) {
        throw new Error(`Campos obligatorios faltantes: ${p}`);
      }
      return { data, path: p };
    }));

    const projects = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    results.filter(r => r.status === 'rejected').forEach(r => {
      console.warn('[Proyectos]', r.reason && r.reason.message ? r.reason.message : r.reason);
    });

    if (projects.length === 0) {
      status.textContent = 'No hay proyectos disponibles.';
      status.classList.add('error');
      return;
    }

    // orden: destacados primero, luego canónicos, luego resto
    projects.sort((a, b) => {
      if (a.data.destacado && !b.data.destacado) return -1;
      if (!a.data.destacado && b.data.destacado) return 1;
      const ca = normalizeCategory(a.data.categoria);
      const cb = normalizeCategory(b.data.categoria);
      const ia = CANONICAL.indexOf(ca);
      const ib = CANONICAL.indexOf(cb);
      const ra = ia === -1 ? 999 : ia;
      const rb = ib === -1 ? 999 : ib;
      if (ra !== rb) return ra - rb;
      return 0;
    });

    grid.innerHTML = projects.map(p => buildCard(p.data, p.path)).join('');
    status.textContent = '';
    status.classList.remove('error');

    // filtros dinámicos
    const cats = [...new Set(projects.map(p => normalizeCategory(p.data.categoria)))];
    // orden canónico + resto
    cats.sort((a, b) => {
      const ia = CANONICAL.indexOf(a);
      const ib = CANONICAL.indexOf(b);
      const ra = ia === -1 ? 999 : ia;
      const rb = ib === -1 ? 999 : ib;
      if (ra !== rb) return ra - rb;
      return a.localeCompare(b);
    });

    filters.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-btn active';
    allBtn.dataset.filter = 'all';
    allBtn.setAttribute('aria-pressed', 'true');
    allBtn.textContent = 'Todos';
    filters.appendChild(allBtn);

    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.dataset.filter = cat;
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = toTitleCase(cat);
      filters.appendChild(btn);
    });

    // filtrado
    filters.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        filters.querySelectorAll('.filter-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        grid.querySelectorAll('.project-card').forEach(card => {
          const cat = card.dataset.category;
          const show = filter === 'all' || cat === filter;
          card.classList.toggle('is-hidden', !show);
        });
      });
    });

    initCompares(grid);
  } catch (err) {
    console.error('[Proyectos]', err);
    status.textContent = 'No se pudieron cargar los proyectos. Sirve la web con un servidor local (npx serve / python -m http.server).';
    status.classList.add('error');
  }
}

loadProjects();

/* ===== Calculadora de presupuesto ===== */
const BUDGET_RATES = {
  integral: { basica: 450, media: 650, alta: 900 },
  bano: { basica: 600, media: 850, alta: 1200 },
  cocina: { basica: 700, media: 950, alta: 1300 },
  salon: { basica: 300, media: 450, alta: 650 },
  terraza: { basica: 250, media: 400, alta: 600 }
};
const BUDGET_EXTRAS = {
  fontaneria: 1500,
  electricidad: 1800,
  pintura: 25,        // por m²
  demolicion: 15      // por m²
};
let lastBudgetEstimate = null;

const budgetForm = document.getElementById('budgetForm');
const budgetResult = document.getElementById('budgetResult');
const budgetValue = document.getElementById('budgetValue');
const budgetUseBtn = document.getElementById('budgetUseBtn');

function showErrorBudget(id, msg) { const el = document.getElementById(id); if (el) el.textContent = msg; }
function clearBudgetErrors() { ['b-tipoError','b-m2Error'].forEach(id => showErrorBudget(id, '')); }

function calculateBudget() {
  clearBudgetErrors();
  const tipo = document.getElementById('b-tipo').value;
  const m2 = parseFloat(document.getElementById('b-m2').value);
  const calidad = document.getElementById('b-calidad').value;
  const extras = Array.from(budgetForm.querySelectorAll('.budget-extras input:checked')).map(i => i.value);

  let ok = true;
  if (!tipo) { showErrorBudget('b-tipoError', 'Selecciona un tipo de reforma.'); ok = false; }
  if (!m2 || m2 <= 0) { showErrorBudget('b-m2Error', 'Introduce una superficie válida.'); ok = false; }
  if (!ok) return;

  const rate = BUDGET_RATES[tipo][calidad];
  const base = m2 * rate;
  let extrasTotal = 0;
  extras.forEach(e => {
    if (e === 'pintura' || e === 'demolicion') extrasTotal += BUDGET_EXTRAS[e] * m2;
    else extrasTotal += BUDGET_EXTRAS[e];
  });
  const total = base + extrasTotal;
  const low = Math.round(total * 0.9);
  const high = Math.round(total * 1.1);

  lastBudgetEstimate = { tipo, m2, calidad, extras, total, low, high };
  budgetValue.textContent = `${low.toLocaleString('es-ES')} € – ${high.toLocaleString('es-ES')} €`;
  budgetResult.hidden = false;
  budgetResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

budgetForm.addEventListener('submit', (e) => {
  e.preventDefault();
  calculateBudget();
});

budgetUseBtn.addEventListener('click', () => {
  if (!lastBudgetEstimate) return;
  const { tipo, m2, calidad, extras, low, high } = lastBudgetEstimate;
  const tipoLabel = document.querySelector(`#b-tipo option[value="${tipo}"]`).textContent;
  const calidadLabel = document.querySelector(`#b-calidad option[value="${calidad}"]`).textContent;
  const extrasLabel = extras.length ? extras.join(', ') : 'ninguno';
  const resumen = `Estimación de presupuesto: ${tipoLabel}, ${m2} m², calidad ${calidadLabel}, extras: ${extrasLabel}. Rango estimado: ${low.toLocaleString('es-ES')} € – ${high.toLocaleString('es-ES')} €.`;

  const estField = document.getElementById('presupuesto_estimado');
  if (estField) estField.value = `${low.toLocaleString('es-ES')} € – ${high.toLocaleString('es-ES')} €`;
  const tipoMap = {
    integral: 'Reforma integral',
    bano: 'Reforma de baño',
    cocina: 'Reforma de cocina',
    salon: 'Reforma de salón',
    terraza: 'Reforma de terraza'
  };
  const reformaSelect = document.getElementById('reforma');
  if (reformaSelect && tipoMap[tipo]) reformaSelect.value = tipoMap[tipo];
  const msgField = document.getElementById('message');
  if (msgField) msgField.value = resumen;
  const contact = document.getElementById('contacto');
  if (contact) contact.scrollIntoView({ behavior: 'smooth' });
  const nameField = document.getElementById('name');
  if (nameField) nameField.focus();
});

/* ===== Campo presupuesto estimado: click vuelve a la calculadora ===== */
const estFieldGlobal = document.getElementById('presupuesto_estimado');
if (estFieldGlobal) {
  estFieldGlobal.style.cursor = 'pointer';
  estFieldGlobal.addEventListener('click', () => {
    const calc = document.getElementById('presupuesto');
    if (calc) calc.scrollIntoView({ behavior: 'smooth' });
    const first = document.getElementById('b-tipo');
    if (first) first.focus();
  });
}

/* ===== Validación formulario ===== */
const form = document.getElementById('contactForm');
const statusEl = document.getElementById('formStatus');

function showError(id, msg) { document.getElementById(id).textContent = msg; }
function clearErrors() {
  ['nameError','phoneError','reformaError','messageError'].forEach(id => showError(id, ''));
}

function validate() {
  clearErrors();
  let ok = true;
  const name = form.name.value.trim();
  const phone = form.phone.value.trim();
  const reforma = form.reforma.value;
  const message = form.message.value.trim();
  if (name.length < 2) { showError('nameError', 'Introduce tu nombre.'); ok = false; }
  if (!/^[+\d][\d\s\-]{6,}$/.test(phone)) { showError('phoneError', 'Teléfono no válido.'); ok = false; }
  if (!reforma) { showError('reformaError', 'Selecciona un tipo de reforma.'); ok = false; }
  if (message.length < 10) { showError('messageError', 'Cuéntanos un poco más (mín. 10 caracteres).'); ok = false; }
  return ok;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validate()) {
    statusEl.textContent = 'Revisa los campos marcados.';
    statusEl.className = 'form-status error';
    return;
  }
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Enviando...';
  setTimeout(() => {
    form.reset();
    btn.disabled = false; btn.textContent = 'Enviar solicitud';
    statusEl.textContent = '¡Gracias! Te contactaremos en menos de 24 horas.';
    statusEl.className = 'form-status success';
  }, 900);
});

/* ===== Año footer ===== */
document.getElementById('year').textContent = new Date().getFullYear();