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
const EXTRAS_BY_TYPE = {
  bano: [
    { id: 'bano_ducha',    label: 'Cambio bañera por plato de ducha (con mampara)', price: 1200, perM2: false },
    { id: 'bano_font',     label: 'Renovación completa de fontanería y desagües',   price: 1500, perM2: false },
    { id: 'bano_mueble',   label: 'Mueble lavabo suspendido + espejo LED',          price: 900,  perM2: false },
    { id: 'bano_inodoro',  label: 'Inodoro suspendido (cisterna empotrada)',        price: 700,  perM2: false },
    { id: 'bano_radiante', label: 'Suelo radiante / Toallero eléctrico',             price: 600,  perM2: false }
  ],
  cocina: [
    { id: 'cocina_isla',    label: 'Isla central o barra americana',                price: 2500, perM2: false },
    { id: 'cocina_encimera',label: 'Encimera porcelánica o de cuarzo',               price: 1800, perM2: false },
    { id: 'cocina_font',    label: 'Fontanería e instalación eléctrica reforzada',   price: 2000, perM2: false },
    { id: 'cocina_led',     label: 'Iluminación LED bajo muebles altos',             price: 400,  perM2: false },
    { id: 'cocina_electro', label: 'Paquete de electrodomésticos integrables',      price: 3500, perM2: false }
  ],
  terraza: [
    { id: 'terraza_pergola', label: 'Pérgola bioclimática o techo fijo',            price: 4000, perM2: false },
    { id: 'terraza_suelo',   label: 'Suelo técnico exterior',                       price: 45,   perM2: true },
    { id: 'terraza_cierre',  label: 'Cerramiento de aluminio con cristal',           price: 2800, perM2: false },
    { id: 'terraza_luz',     label: 'Iluminación exterior LED + tomas',              price: 600,  perM2: false },
    { id: 'terraza_riego',   label: 'Sistema de riego automático',                   price: 900,  perM2: false }
  ],
  salon: [
    { id: 'salon_parquet',  label: 'Suelo de parquet o tarima flotante',            price: 40,   perM2: true },
    { id: 'salon_techo',    label: 'Falso techo con iluminación LED',               price: 35,   perM2: true },
    { id: 'salon_ventanas', label: 'Ventanas de aluminio/PVC',                      price: 1200, perM2: false },
    { id: 'salon_ac',       label: 'Aire acondicionado (split + instalación)',      price: 1100, perM2: false },
    { id: 'salon_pintura',  label: 'Pintura lisa con preparación de paredes',        price: 12,   perM2: true }
  ],
  integral: [
    { id: 'int_tabiques',  label: 'Redistribución de tabiques',                     price: 3500, perM2: false },
    { id: 'int_cocina',    label: 'Cocina completa (mobiliario + electrodomésticos)', price: 6000, perM2: false },
    { id: 'int_bano',      label: 'Baño completo (sanitarios + alicatados)',        price: 4500, perM2: false },
    { id: 'int_suelos',    label: 'Suelos continuos (microcemento/porcelánico)',    price: 50,   perM2: true },
    { id: 'int_domotica',  label: 'Domótica básica',                                price: 2500, perM2: false }
  ]
};
let lastBudgetEstimate = null;

function renderExtras(type) {
  const container = document.getElementById('budgetExtras');
  if (!container) return;
  const extras = EXTRAS_BY_TYPE[type] || [];
  container.innerHTML = extras.map(e => `
    <label class="extra-toggle">
      <input type="checkbox" value="${e.id}" data-price="${e.price}" data-perm2="${e.perM2}" />
      <span class="extra-toggle-icon">✨</span>
      <span class="extra-toggle-label">${e.label}</span>
    </label>
  `).join('');
  // listeners para toggle + cálculo + visual
  container.querySelectorAll('.extra-toggle input').forEach(input => {
    input.addEventListener('change', () => {
      const label = input.closest('.extra-toggle');
      if (label) label.classList.toggle('active', input.checked);
      updateVisual();
      calculateBudget();
    });
  });
}

/* ===== Visualizador 3D (Three.js) ===== */
const THREE = window.THREE;
const sceneClassMap = { bano: 'is-bano', cocina: 'is-cocina', salon: 'is-salon', terraza: 'is-terraza', integral: 'is-salon' };
const extraClassMap = {
  bano_ducha: 'has-ducha', bano_font: 'has-font', bano_mueble: 'has-mueble', bano_inodoro: 'has-inodoro', bano_radiante: 'has-radiante',
  cocina_isla: 'has-isla', cocina_encimera: 'has-encimera', cocina_font: 'has-font', cocina_led: 'has-led', cocina_electro: 'has-electro',
  terraza_pergola: 'has-pergola', terraza_suelo: 'has-suelo', terraza_cierre: 'has-cierre', terraza_luz: 'has-luz', terraza_riego: 'has-riego',
  salon_parquet: 'has-parquet', salon_techo: 'has-techo', salon_ventanas: 'has-ventanas', salon_ac: 'has-ac', salon_pintura: 'has-pintura',
  int_tabiques: 'has-tabiques', int_cocina: 'has-cocina', int_bano: 'has-bano', int_suelos: 'has-suelos', int_domotica: 'has-domotica'
};
const qualityClassMap = { basica: 'q-basica', media: 'q-media', alta: 'q-alta' };

let threeScene, threeCamera, threeRenderer, threeRoom, currentTypeGroup = null;

function initThree() {
  const canvas = document.getElementById('budgetCanvas');
  if (!canvas || !THREE) return;
  const w = canvas.clientWidth || 400;
  const h = canvas.clientHeight || 300;
  threeRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  threeRenderer.setSize(w, h);
  threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  threeRenderer.shadowMap.enabled = true;
  threeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  threeScene = new THREE.Scene();
  threeScene.background = new THREE.Color(0x161922);
  // Cámara isométrica fija
  const aspect = w / h;
  const frustum = 4;
  threeCamera = new THREE.OrthographicCamera(-frustum * aspect, frustum * aspect, frustum, -frustum, 0.1, 100);
  threeCamera.position.set(10, 10, 10);
  threeCamera.lookAt(0, 1.5, 0);
  // Luces
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  threeScene.add(ambient);
  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x444444, 0.3);
  threeScene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 10, 5);
  dir.castShadow = true;
  dir.shadow.mapSize.width = 1024;
  dir.shadow.mapSize.height = 1024;
  dir.shadow.bias = -0.0005;
  dir.shadow.radius = 4;
  threeScene.add(dir);
  // PointLight para LED/acento
  const pointLed = new THREE.PointLight(0xfbbf24, 0.5, 8);
  pointLed.position.set(0, 3, 0);
  threeScene.add(pointLed);
  // Suelo
  const floorGeo = new THREE.BoxGeometry(6, 0.2, 6);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x2e3446, roughness: 0.8 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.set(0, 0, 0);
  floor.receiveShadow = true;
  threeScene.add(floor);
  // Pared trasera izquierda
  const wallLGeo = new THREE.BoxGeometry(0.2, 4, 6);
  const wallLMat = new THREE.MeshStandardMaterial({ color: 0x232838, roughness: 0.9 });
  const wallL = new THREE.Mesh(wallLGeo, wallLMat);
  wallL.position.set(-3, 2, 0);
  wallL.receiveShadow = true;
  threeScene.add(wallL);
  // Pared trasera derecha
  const wallRGeo = new THREE.BoxGeometry(6, 4, 0.2);
  const wallRMat = new THREE.MeshStandardMaterial({ color: 0x1c2130, roughness: 0.9 });
  const wallR = new THREE.Mesh(wallRGeo, wallRMat);
  wallR.position.set(0, 2, -3);
  wallR.receiveShadow = true;
  threeScene.add(wallR);
  // Render loop
  function animate() {
    requestAnimationFrame(animate);
    threeRenderer.render(threeScene, threeCamera);
  }
  animate();
  // render initial scene
  const initTipo = document.getElementById('b-tipo') ? document.getElementById('b-tipo').value : '';
  if (initTipo) updateVisual();
  window.addEventListener('resize', () => {
    const w2 = canvas.clientWidth || 400;
    const h2 = canvas.clientHeight || 300;
    threeCamera.left = -frustum * (w2/h2);
    threeCamera.right = frustum * (w2/h2);
    threeCamera.top = frustum;
    threeCamera.bottom = -frustum;
    threeCamera.updateProjectionMatrix();
    threeRenderer.setSize(w2, h2);
  });
}

function makeBox(w, h, d, color, x, y, z, roughness, metalness) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: roughness != null ? roughness : 0.5, metalness: metalness != null ? metalness : 0.1 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeGroup() { return new THREE.Group(); }

function makeCylinder(rTop, rBottom, height, color, x, y, z, rotX = 0, roughness, metalness) {
  const geo = new THREE.CylinderGeometry(rTop, rBottom, height, 16);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: roughness != null ? roughness : 0.4, metalness: metalness != null ? metalness : 0.3 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.x = rotX;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makePlane(w, h, color, x, y, z, rotY = 0, transparent = false, opacity = 1, roughness, metalness) {
  const geo = new THREE.PlaneGeometry(w, h);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: roughness != null ? roughness : 0.5, metalness: metalness != null ? metalness : 0.1, transparent, opacity });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeSphere(r, color, x, y, z) {
  const geo = new THREE.SphereGeometry(r, 16, 16);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function makeMat(color, roughness, metalness) {
  return new THREE.MeshStandardMaterial({ color, roughness: roughness != null ? roughness : 0.5, metalness: metalness != null ? metalness : 0.1 });
}

function buildScene(type) {
  if (!threeScene) return;
  if (currentTypeGroup) { threeScene.remove(currentTypeGroup); currentTypeGroup = null; }
  currentTypeGroup = makeGroup();
  const q = document.getElementById('b-calidad') ? document.getElementById('b-calidad').value : 'media';
  const matColor = q === 'alta' ? 0x8b6f47 : q === 'basica' ? 0x6b7280 : 0x4a5068;
  const woodColor = q === 'alta' ? 0x6b4f2a : q === 'basica' ? 0x5a4a3a : 0x7a5f3a;
  const white = 0xf5f5f5;
  const chrome = 0x9ca3af;
  const dark = 0x1f2937;
  const porcelain = 0xd1d5db;
  const textile = 0x4a5068;
  const terracotta = 0x78350f;
  const plant = 0x10b981;
  const glass = 0x93c5fd;
  const woodRough = q === 'alta' ? 0.3 : q === 'basica' ? 0.8 : 0.5;
  const woodMetal = q === 'alta' ? 0.1 : 0.0;
  const ceramicRough = q === 'alta' ? 0.15 : q === 'basica' ? 0.4 : 0.25;
  const metalRough = q === 'alta' ? 0.1 : q === 'basica' ? 0.4 : 0.2;
  const metalMetal = q === 'alta' ? 0.9 : q === 'basica' ? 0.6 : 0.8;

  if (type === 'bano') {
    const lavabo = makeBox(1.2, 0.15, 0.6, 0xf5f5f5, -2.5, 0.45, 1.5, 0.1, 0.0); lavabo.rotation.y = Math.PI / 2;
    const grifo = makeCylinder(0.03, 0.03, 0.3, chrome, -2.5, 0.7, 1.5, 0, metalRough, metalMetal);
    const maneta = makeBox(0.15, 0.05, 0.05, chrome, -2.4, 0.75, 1.5, metalRough, metalMetal); maneta.rotation.y = Math.PI / 2;
    const espejoMarco = makeBox(1.1, 1.3, 0.05, 0x374151, -2.5, 1.8, 1.5, 0.3, 0.1); espejoMarco.rotation.y = Math.PI / 2;
    const espejo = makePlane(0.9, 1.1, glass, -2.5, 1.8, 1.52, 0, true, 0.4, 0.0, 0.0); espejo.rotation.y = Math.PI / 2;
    const mueble = makeBox(1.2, 0.5, 0.4, woodColor, -2.5, 0.15, 1.5, woodRough, woodMetal); mueble.rotation.y = Math.PI / 2;
    const cajon1 = makeBox(1.1, 0.02, 0.35, 0x6b7280, -2.5, 0.05, 1.5, 0.5, 0.0); cajon1.rotation.y = Math.PI / 2;
    const tirador1 = makeBox(0.3, 0.03, 0.02, chrome, -2.5, 0.05, 1.7, metalRough, metalMetal); tirador1.rotation.y = Math.PI / 2;
    const inodoroGroup = makeGroup();
    const inodoroBase = makeBox(0.5, 0.4, 0.5, 0xf5f5f5, 0, 0, 0, ceramicRough, 0.0);
    const inodoroTapa = makeBox(0.5, 0.05, 0.5, 0xf5f5f5, 0, 0.25, 0, ceramicRough, 0.0);
    const cisterna = makeBox(0.4, 0.5, 0.3, 0xf5f5f5, 0, 0.5, -0.2, ceramicRough, 0.0);
    const boton = makeCylinder(0.03, 0.03, 0.02, chrome, 0, 0.8, -0.2, Math.PI / 2, metalRough, metalMetal);
    inodoroGroup.add(inodoroBase, inodoroTapa, cisterna, boton);
    inodoroGroup.position.set(-2.5, 0.2, -1.5);
    inodoroGroup.rotation.y = Math.PI / 2;
    currentTypeGroup.add(inodoroGroup);
    const banera = makeBox(2.0, 0.5, 1.0, 0xf0f0f0, 0, 0.25, -2.5, 0.2, 0.0); banera.rotation.y = Math.PI;
    const grifoBanera = makeCylinder(0.03, 0.03, 0.4, chrome, 0, 0.6, -2.0, 0, metalRough, metalMetal); grifoBanera.rotation.y = Math.PI;
    const desague = makeCylinder(0.05, 0.05, 0.02, 0x374151, 0, 0.01, -2.5, Math.PI / 2, 0.3, 0.2); desague.rotation.y = Math.PI;
    currentTypeGroup.add(lavabo, grifo, maneta, espejoMarco, espejo, mueble, cajon1, tirador1, inodoroGroup, banera, grifoBanera, desague);
    currentTypeGroup.userData.banera = banera;
    currentTypeGroup.userData.grifoBanera = grifoBanera;
    currentTypeGroup.userData.desague = desague;
  } else if (type === 'cocina') {
    const encimera = makeBox(5.0, 0.4, 1.0, 0xd1d5db, 0, 0.8, -2.5, 0.1, 0.0);
    const fregadero = makeBox(0.8, 0.1, 0.5, 0x1f2937, 1.0, 0.85, -2.5, 0.3, 0.1);
    const grifoCocina = makeCylinder(0.03, 0.03, 0.4, chrome, 1.0, 1.1, -2.5, 0, metalRough, metalMetal);
    const mueblesBajos = makeBox(5.0, 0.8, 0.8, 0xe5e7eb, 0, 0.4, -2.5, 0.4, 0.0);
    const tiradoresBajos = makeBox(4.8, 0.03, 0.05, chrome, 0, 0.4, -2.1, 0.1, 0.8);
    const mueblesAltos = makeBox(5.0, 0.8, 0.6, 0xe5e7eb, 0, 2.0, -2.5, 0.4, 0.0);
    const tiradoresAltos = makeBox(4.8, 0.03, 0.05, chrome, 0, 2.0, -2.1, 0.1, 0.8);
    const campana = makeBox(1.2, 0.4, 0.6, 0x6b7280, 0, 2.6, -2.5, 0.3, 0.2);
    const filtro = makeBox(1.0, 0.05, 0.5, 0x9ca3af, 0, 2.4, -2.5, 0.5, 0.0);
    const horno = makeBox(0.7, 0.8, 0.6, 0x374151, -1.8, 0.4, -2.5, 0.3, 0.1);
    const puertaHorno = makeBox(0.65, 0.75, 0.02, 0x1f2937, -1.8, 0.4, -2.18, 0.4, 0.0);
    const frigo = makeBox(0.8, 1.8, 0.7, 0xe5e7eb, 1.8, 0.9, -2.5, 0.3, 0.0);
    const puertaFrigo = makeBox(0.75, 1.75, 0.02, 0xd1d5db, 1.8, 0.9, -2.13, 0.4, 0.0);
    currentTypeGroup.add(encimera, fregadero, grifoCocina, mueblesBajos, tiradoresBajos, mueblesAltos, tiradoresAltos, campana, filtro, horno, puertaHorno, frigo, puertaFrigo);
  } else if (type === 'terraza') {
    const sueloTec = makeBox(5.0, 0.1, 5.0, 0x4a5068, 0, 0.05, 0, 0.7, 0.0);
    const maceta1 = makeCylinder(0.3, 0.25, 0.6, 0x78350f, -2.5, 0.3, 2.0);
    const planta1 = makeSphere(0.35, 0x10b981, -2.5, 0.7, 2.0);
    const maceta2 = makeCylinder(0.3, 0.25, 0.6, 0x78350f, 2.5, 0.3, 2.0);
    const planta2 = makeSphere(0.35, 0x10b981, 2.5, 0.7, 2.0);
    const barandilla = makeBox(5.0, 0.05, 5.0, 0x9ca3af, 0, 1.0, 0, 0.2, 0.6);
    const poste1 = makeBox(0.1, 1.0, 0.1, 0x9ca3af, -2.5, 0.5, -2.5, 0.2, 0.6);
    const poste2 = makeBox(0.1, 1.0, 0.1, 0x9ca3af, 2.5, 0.5, -2.5, 0.2, 0.6);
    const poste3 = makeBox(0.1, 1.0, 0.1, 0x9ca3af, -2.5, 0.5, 2.5, 0.2, 0.6);
    const poste4 = makeBox(0.1, 1.0, 0.1, 0x9ca3af, 2.5, 0.5, 2.5, 0.2, 0.6);
    currentTypeGroup.add(sueloTec, maceta1, planta1, maceta2, planta2, barandilla, poste1, poste2, poste3, poste4);
  } else if (type === 'salon' || type === 'integral') {
    const sofaBase = makeBox(2.5, 0.3, 1.0, 0x4a5068, -1.5, 0.15, 1.0, 0.8, 0.0);
    const sofaRespaldo = makeBox(2.5, 0.6, 0.2, 0x4a5068, -1.5, 0.6, 1.4, 0.8, 0.0);
    const cojin1 = makeBox(0.5, 0.2, 0.4, 0x6b7280, -2.3, 0.4, 1.0, 0.9, 0.0);
    const cojin2 = makeBox(0.5, 0.2, 0.4, 0x6b7280, -1.5, 0.4, 1.0, 0.9, 0.0);
    const cojin3 = makeBox(0.5, 0.2, 0.4, 0x6b7280, -0.7, 0.4, 1.0, 0.9, 0.0);
    const pata1 = makeCylinder(0.05, 0.05, 0.15, 0x374151, -2.5, 0.075, 0.6, 0, 0.5, 0.2);
    const pata2 = makeCylinder(0.05, 0.05, 0.15, 0x374151, -0.5, 0.075, 0.6, 0, 0.5, 0.2);
    const pata3 = makeCylinder(0.05, 0.05, 0.15, 0x374151, -2.5, 0.075, 1.4, 0, 0.5, 0.2);
    const pata4 = makeCylinder(0.05, 0.05, 0.15, 0x374151, -0.5, 0.075, 1.4, 0, 0.5, 0.2);
    const mesa = makeBox(1.2, 0.3, 0.6, 0x7a5f3a, 0, 0.15, 1.5, 0.4, 0.0);
    const pataMesa1 = makeCylinder(0.03, 0.03, 0.15, 0x374151, -0.5, 0.075, 1.3, 0, 0.5, 0.2);
    const pataMesa2 = makeCylinder(0.03, 0.03, 0.15, 0x374151, 0.5, 0.075, 1.3, 0, 0.5, 0.2);
    const pataMesa3 = makeCylinder(0.03, 0.03, 0.15, 0x374151, -0.5, 0.075, 1.7, 0, 0.5, 0.2);
    const pataMesa4 = makeCylinder(0.03, 0.03, 0.15, 0x374151, 0.5, 0.075, 1.7, 0, 0.5, 0.2);
    const tvPantalla = makeBox(0.08, 1.5, 1.2, 0x111827, 2.5, 1.5, -2.8, 0.1, 0.0); tvPantalla.rotation.y = Math.PI / 2;
    const tvSoporte = makeBox(0.3, 0.3, 0.1, 0x374151, 2.5, 0.8, -2.8, 0.3, 0.2); tvSoporte.rotation.y = Math.PI / 2;
    const tvBase = makeBox(0.6, 0.05, 0.4, 0x374151, 2.5, 0.025, -2.8, 0.3, 0.2); tvBase.rotation.y = Math.PI / 2;
    const ventanaMarco = makeBox(0.1, 1.0, 1.2, 0x6b7280, -2.8, 1.5, 0, 0.3, 0.2);
    const ventanaCristal = makePlane(0.9, 0.9, 0x93c5fd, -2.75, 1.5, 0, Math.PI / 2, true, 0.3, 0.0, 0.0);
    const cortinaIzq = makeBox(0.05, 1.0, 0.3, 0xe5e7eb, -2.8, 1.5, -0.45, 0.9, 0.0);
    const cortinaDer = makeBox(0.05, 1.0, 0.3, 0xe5e7eb, -2.8, 1.5, 0.45, 0.9, 0.0);
    const ac = makeBox(1.0, 0.4, 0.3, 0xe5e7eb, 2.5, 3.0, -2.8, 0.3, 0.0); ac.rotation.y = Math.PI / 2;
    const acRejilla = makeBox(0.9, 0.05, 0.25, 0x93c5fd, 2.5, 2.8, -2.8, 0.5, 0.0); acRejilla.rotation.y = Math.PI / 2;
    currentTypeGroup.add(sofaBase, sofaRespaldo, cojin1, cojin2, cojin3, pata1, pata2, pata3, pata4, mesa, pataMesa1, pataMesa2, pataMesa3, pataMesa4, tvPantalla, tvSoporte, tvBase, ventanaMarco, ventanaCristal, cortinaIzq, cortinaDer, ac, acRejilla);
    if (type === 'integral') {
      const cocinaMod = makeBox(1.8, 0.4, 0.8, matColor, -2.0, 0.8, 1.5, 0.4, 0.0);
      const cocinaEnc = makeBox(1.8, 0.05, 0.8, 0xd1d5db, -2.0, 1.05, 1.5, 0.1, 0.0);
      const banoMod = makeBox(0.8, 0.8, 0.8, matColor, 2.5, 0.4, 1.5, 0.4, 0.0);
      const banoSan = makeBox(0.4, 0.3, 0.4, 0xf5f5f5, 2.5, 0.55, 1.5, 0.1, 0.0);
      currentTypeGroup.add(cocinaMod, cocinaEnc, banoMod, banoSan);
    }
  }
  threeScene.add(currentTypeGroup);
  updateExtras();
}

function updateExtras() {
  if (!threeScene || !currentTypeGroup) return;
  const tipo = document.getElementById('b-tipo').value;
  const checked = Array.from(document.querySelectorAll('#budgetExtras input:checked')).map(i => i.value);
  const banoDuchaChecked = checked.includes('bano_ducha');
  // Ocultar/mostrar bañera
  const banera = currentTypeGroup.userData.banera;
  const grifoBanera = currentTypeGroup.userData.grifoBanera;
  const desague = currentTypeGroup.userData.desague;
  if (banera) banera.visible = !banoDuchaChecked;
  if (grifoBanera) grifoBanera.visible = !banoDuchaChecked;
  if (desague) desague.visible = !banoDuchaChecked;
  const toRemove = currentTypeGroup.children.filter(c => c.userData && c.userData.extra);
  toRemove.forEach(c => currentTypeGroup.remove(c));
  const q = document.getElementById('b-calidad') ? document.getElementById('b-calidad').value : 'media';
  const matColor = q === 'alta' ? 0x8b6f47 : q === 'basica' ? 0x6b7280 : 0x4a5068;
  const woodColor = q === 'alta' ? 0x6b4f2a : q === 'basica' ? 0x5a4a3a : 0x7a5f3a;
  const chrome = 0x9ca3af;
  const white = 0xf5f5f5;
  checked.forEach(id => {
    let obj = null;
    if (id === 'bano_ducha') {
      const g = makeGroup();
      const ducha = makeBox(2.0, 0.08, 1.0, 0xf5f5f5, 0, 0.04, -2.5, 0.2, 0.0); ducha.rotation.y = Math.PI;
      const desagueDucha = makeCylinder(0.06, 0.06, 0.02, 0x374151, 0, 0.05, -2.5, Math.PI / 2, 0.3, 0.2); desagueDucha.rotation.y = Math.PI;
      const mamparaFrontal = makePlane(0.05, 1.0, 0xffffff, 0, 0.5, -2.0, 0, true, 0.25, 0.0, 0.0); mamparaFrontal.rotation.y = Math.PI;
      const mamparaIzq = makePlane(1.0, 1.0, 0xffffff, -1.0, 0.5, -2.5, Math.PI / 2, true, 0.25, 0.0, 0.0); mamparaIzq.rotation.y = Math.PI;
      const mamparaDer = makePlane(1.0, 1.0, 0xffffff, 1.0, 0.5, -2.5, Math.PI / 2, true, 0.25, 0.0, 0.0); mamparaDer.rotation.y = Math.PI;
      const grifoDucha = makeCylinder(0.03, 0.03, 0.4, chrome, 0, 0.6, -2.0, 0, 0.1, 0.8); grifoDucha.rotation.y = Math.PI;
      g.add(ducha, desagueDucha, mamparaFrontal, mamparaIzq, mamparaDer, grifoDucha);
      g.userData = { extra: true };
      obj = g;
    } else if (id === 'bano_font') {
      const g = makeGroup();
      const tubo1 = makeCylinder(0.04, 0.04, 1.5, chrome, -2.5, 1.0, 1.0, Math.PI / 2, 0.2, 0.5);
      const tubo2 = makeCylinder(0.04, 0.04, 1.0, chrome, -2.0, 0.5, 1.5, 0, 0.2, 0.5);
      const valvula = makeBox(0.1, 0.1, 0.1, chrome, -2.5, 1.0, 1.5, 0.2, 0.5);
      g.add(tubo1, tubo2, valvula);
      g.userData = { extra: true };
      obj = g;
    } else if (id === 'bano_mueble') {
      const g = makeGroup();
      const mueble = makeBox(1.2, 0.5, 0.4, woodColor, -2.5, 0.15, 1.5, 0.4, 0.0); mueble.rotation.y = Math.PI / 2;
      const cajon = makeBox(1.1, 0.02, 0.35, 0x9ca3af, -2.5, 0.05, 1.5, 0.5, 0.0); cajon.rotation.y = Math.PI / 2;
      const tirador = makeBox(0.3, 0.03, 0.02, chrome, -2.5, 0.05, 1.7, 0.1, 0.8); tirador.rotation.y = Math.PI / 2;
      g.add(mueble, cajon, tirador);
      g.userData = { extra: true };
      obj = g;
    } else if (id === 'bano_inodoro') {
      const g = makeGroup();
      const inodoroGroup = makeGroup();
      const inodoro = makeBox(0.5, 0.4, 0.5, 0xf5f5f5, 0, 0, 0, 0.1, 0.0);
      const tapa = makeBox(0.5, 0.05, 0.5, 0xf5f5f5, 0, 0.25, 0, 0.1, 0.0);
      const cisterna = makeBox(0.4, 0.5, 0.3, 0xf5f5f5, 0, 0.5, -0.2, 0.1, 0.0);
      const boton = makeCylinder(0.03, 0.03, 0.02, chrome, 0, 0.8, -0.2, Math.PI / 2, 0.1, 0.8);
      inodoroGroup.add(inodoro, tapa, cisterna, boton);
      inodoroGroup.position.set(-2.5, 0.2, -1.5);
      inodoroGroup.rotation.y = Math.PI / 2;
      g.add(inodoroGroup);
      g.userData = { extra: true };
      obj = g;
    } else if (id === 'bano_radiante') {
      const g = makeGroup();
      const radiante = makeBox(2.0, 0.02, 1.0, 0xf97316, 0.5, 0.01, -1.5, 0.8, 0.0);
      const toallero = makeCylinder(0.02, 0.02, 0.8, chrome, -2.5, 1.0, 1.0, 0, 0.2, 0.5);
      const soporte = makeBox(0.05, 0.05, 0.05, chrome, -2.5, 1.0, 0.6, 0.3, 0.5);
      g.add(radiante, toallero, soporte);
      g.userData = { extra: true };
      obj = g;
    } else if (id === 'cocina_isla') {
      const g = makeGroup();
      const isla = makeBox(2.8, 0.4, 0.9, woodColor, 0.5, 0.2, 0.5, 0.3, 0.0);
      const taburete1 = makeCylinder(0.15, 0.15, 0.5, 0x374151, 0.0, 0.25, 0.2, 0, 0.5, 0.2);
      const taburete2 = makeCylinder(0.15, 0.15, 0.5, 0x374151, 1.0, 0.25, 0.2, 0, 0.5, 0.2);
      const asiento1 = makeBox(0.3, 0.05, 0.3, 0x6b7280, 0.0, 0.5, 0.2, 0.5, 0.0);
      const asiento2 = makeBox(0.3, 0.05, 0.3, 0x6b7280, 1.0, 0.5, 0.2, 0.5, 0.0);
      g.add(isla, taburete1, taburete2, asiento1, asiento2);
      g.userData = { extra: true };
      obj = g;
    } else if (id === 'cocina_encimera') {
      const enc = makeBox(5.0, 0.05, 1.0, 0xd1d5db, 0, 0.85, -2.5, 0.1, 0.0);
      enc.userData = { extra: true };
      obj = enc;
    } else if (id === 'cocina_font') {
      const g = makeGroup();
      const tubo1 = makeCylinder(0.04, 0.04, 1.5, chrome, 1.0, 1.2, -2.5, Math.PI / 2, 0.2, 0.5);
      const tubo2 = makeCylinder(0.04, 0.04, 1.0, chrome, 0.5, 0.7, -2.5, 0, 0.2, 0.5);
      const valvula = makeBox(0.1, 0.1, 0.1, chrome, 1.0, 1.2, -2.0, 0.2, 0.5);
      g.add(tubo1, tubo2, valvula);
      g.userData = { extra: true };
      obj = g;
    } else if (id === 'cocina_led') {
      const led = makeBox(4.8, 0.02, 0.05, 0xfbbf24, 0, 1.95, -2.1, 0.1, 0.0);
      led.userData = { extra: true };
      obj = led;
    } else if (id === 'cocina_electro') {
      const g = makeGroup();
      const horno = makeBox(0.7, 0.8, 0.6, 0x374151, -1.8, 0.4, -2.5, 0.3, 0.1);
      const puertaHorno = makeBox(0.65, 0.75, 0.02, 0x1f2937, -1.8, 0.4, -2.18, 0.4, 0.0);
      const frigo = makeBox(0.8, 1.8, 0.7, 0xe5e7eb, 1.8, 0.9, -2.5, 0.3, 0.0);
      const puertaFrigo = makeBox(0.75, 1.75, 0.02, 0xd1d5db, 1.8, 0.9, -2.13, 0.4, 0.0);
      const tiradorFrigo = makeBox(0.02, 0.3, 0.05, chrome, 1.45, 0.9, -2.13, 0.3, 0.5);
      g.add(horno, puertaHorno, frigo, puertaFrigo, tiradorFrigo);
      g.userData = { extra: true };
      obj = g;
    } else if (id === 'terraza_pergola') {
      const g = makeGroup();
      const viga1 = makeBox(5.0, 0.1, 0.1, 0x10b981, 0, 3.8, -2.5, 0.4, 0.0);
      const viga2 = makeBox(5.0, 0.1, 0.1, 0x10b981, 0, 3.8, 2.5, 0.4, 0.0);
      const viga3 = makeBox(0.1, 0.1, 5.0, 0x10b981, -2.5, 3.8, 0, 0.4, 0.0);
      const viga4 = makeBox(0.1, 0.1, 5.0, 0x10b981, 2.5, 3.8, 0, 0.4, 0.0);
      const lama1 = makeBox(5.0, 0.05, 0.3, 0x059669, 0, 3.6, -1.5, 0.5, 0.0);
      const lama2 = makeBox(5.0, 0.05, 0.3, 0x059669, 0, 3.6, 0, 0.5, 0.0);
      const lama3 = makeBox(5.0, 0.05, 0.3, 0x059669, 0, 3.6, 1.5, 0.5, 0.0);
      const pilar1 = makeBox(0.15, 3.8, 0.15, 0x047857, -2.5, 1.9, -2.5, 0.3, 0.0);
      const pilar2 = makeBox(0.15, 3.8, 0.15, 0x047857, 2.5, 1.9, -2.5, 0.3, 0.0);
      const pilar3 = makeBox(0.15, 3.8, 0.15, 0x047857, -2.5, 1.9, 2.5, 0.3, 0.0);
      const pilar4 = makeBox(0.15, 3.8, 0.15, 0x047857, 2.5, 1.9, 2.5, 0.3, 0.0);
      g.add(viga1, viga2, viga3, viga4, lama1, lama2, lama3, pilar1, pilar2, pilar3, pilar4);
      g.userData = { extra: true };
      obj = g;
    } else if (id === 'terraza_suelo') {
      const suelo = makeBox(5.0, 0.05, 5.0, 0x4a5068, 0, 0.02, 0, 0.7, 0.0);
      suelo.userData = { extra: true };
      obj = suelo;
    } else if (id === 'terraza_cierre') {
      const g = makeGroup();
      const cierreIzq = makeBox(0.1, 1.0, 5.0, 0x9ca3af, -2.8, 0.5, 0, 0.2, 0.3);
      const cierreDer = makeBox(0.1, 1.0, 5.0, 0x9ca3af, 2.8, 0.5, 0, 0.2, 0.3);
      const pasamanos = makeBox(5.8, 0.05, 0.05, 0x6b7280, 0, 1.0, 0, 0.3, 0.5);
      const vidrioIzq = makePlane(0.05, 1.0, 0x93c5fd, -2.75, 0.5, 0, Math.PI / 2, true, 0.2, 0.0, 0.0);
      const vidrioDer = makePlane(0.05, 1.0, 0x93c5fd, 2.75, 0.5, 0, Math.PI / 2, true, 0.2, 0.0, 0.0);
      g.add(cierreIzq, cierreDer, pasamanos, vidrioIzq, vidrioDer);
      g.userData = { extra: true };
      obj = g;
    } else if (id === 'terraza_luz') {
      const g = makeGroup();
      const luz1 = makeSphere(0.12, 0xfbbf24, -2.0, 2.8, -2.0);
      const luz2 = makeSphere(0.12, 0xfbbf24, 0, 2.8, -2.0);
      const luz3 = makeSphere(0.12, 0xfbbf24, 2.0, 2.8, -2.0);
      const carcasa1 = makeBox(0.3, 0.1, 0.3, 0x374151, -2.0, 2.7, -2.0, 0.3, 0.2);
      const carcasa2 = makeBox(0.3, 0.1, 0.3, 0x374151, 0, 2.7, -2.0, 0.3, 0.2);
      const carcasa3 = makeBox(0.3, 0.1, 0.3, 0x374151, 2.0, 2.7, -2.0, 0.3, 0.2);
      g.add(luz1, luz2, luz3, carcasa1, carcasa2, carcasa3);
      g.userData = { extra: true };
      obj = g;
    } else if (id === 'terraza_riego') {
      const g = makeGroup();
      const tubo = makeCylinder(0.03, 0.03, 4.0, 0x3b82f6, 0, 0.05, 0, Math.PI / 2, 0.3, 0.3);
      const aspersor1 = makeCylinder(0.05, 0.05, 0.1, 0x3b82f6, -1.5, 0.1, 0, 0, 0.3, 0.3);
      const aspersor2 = makeCylinder(0.05, 0.05, 0.1, 0x3b82f6, 1.5, 0.1, 0, 0, 0.3, 0.3);
      g.add(tubo, aspersor1, aspersor2);
      g.userData = { extra: true };
      obj = g;
    } else if (id === 'salon_parquet' || id === 'int_suelos') {
      const parquet = makeBox(5.0, 0.02, 5.0, 0x8b6f47, 0, 0.01, 0, 0.4, 0.0);
      parquet.userData = { extra: true };
      obj = parquet;
    } else if (id === 'salon_techo' || id === 'int_domotica') {
      const g = makeGroup();
      const techo = makeBox(5.0, 0.05, 5.0, 0x374151, 0, 3.9, 0, 0.5, 0.0);
      const led1 = makeBox(4.8, 0.02, 0.05, 0xfbbf24, 0, 3.85, -2.0, 0.1, 0.0);
      const led2 = makeBox(4.8, 0.02, 0.05, 0xfbbf24, 0, 3.85, 0, 0.1, 0.0);
      const led3 = makeBox(4.8, 0.02, 0.05, 0xfbbf24, 0, 3.85, 2.0, 0.1, 0.0);
      const sensor = makeBox(0.3, 0.05, 0.3, 0x6b7280, 0, 3.85, 0, 0.3, 0.2);
      g.add(techo, led1, led2, led3, sensor);
      g.userData = { extra: true };
      obj = g;
    } else if (id === 'salon_ventanas') {
      const g = makeGroup();
      const marco = makeBox(0.1, 1.2, 1.4, 0x6b7280, -2.8, 1.5, 0, 0.3, 0.2);
      const cristal = makePlane(1.0, 1.0, 0x93c5fd, -2.75, 1.5, 0, Math.PI / 2, true, 0.3, 0.0, 0.0);
      const cortinaIzq = makeBox(0.05, 1.0, 0.3, 0xe5e7eb, -2.8, 1.5, -0.45, 0.9, 0.0);
      const cortinaDer = makeBox(0.05, 1.0, 0.3, 0xe5e7eb, -2.8, 1.5, 0.45, 0.9, 0.0);
      const manivela = makeBox(0.02, 0.05, 0.05, chrome, -2.78, 1.5, 0.3, 0.3, 0.5);
      g.add(marco, cristal, cortinaIzq, cortinaDer, manivela);
      g.userData = { extra: true };
      obj = g;
    } else if (id === 'salon_ac') {
      const g = makeGroup();
      const ac = makeBox(1.0, 0.4, 0.3, 0xe5e7eb, 2.5, 3.0, -1.0, 0.3, 0.0);
      const rejilla = makeBox(0.9, 0.05, 0.25, 0x93c5fd, 2.5, 2.8, -1.0, 0.5, 0.0);
      const led = makeBox(0.9, 0.02, 0.05, 0x60a5fa, 2.5, 2.75, -1.0, 0.1, 0.0);
      g.add(ac, rejilla, led);
      g.userData = { extra: true };
      obj = g;
    } else if (id === 'salon_pintura') {
      const pintura = makeBox(5.0, 0.02, 5.0, 0xfbbf24, 0, 0.01, 0, 0.9, 0.0);
      pintura.userData = { extra: true };
      obj = pintura;
    } else if (id === 'int_tabiques') {
      const g = makeGroup();
      const tabique = makeBox(0.1, 2.5, 5.0, 0x9ca3af, 0, 1.25, 0, 0.5, 0.0);
      const puerta = makeBox(0.1, 2.0, 0.9, 0x6b7280, 0, 1.0, 0, 0.4, 0.0);
      const marco = makeBox(0.12, 2.1, 1.0, 0x374151, 0, 1.0, 0, 0.3, 0.2);
      g.add(tabique, puerta, marco);
      g.userData = { extra: true };
      obj = g;
    } else if (id === 'int_cocina') {
      const g = makeGroup();
      const mod = makeBox(1.8, 0.4, 0.8, matColor, -2.0, 0.8, 1.5, 0.4, 0.0);
      const enc = makeBox(1.8, 0.05, 0.8, 0xd1d5db, -2.0, 1.05, 1.5, 0.1, 0.0);
      const tirador = makeBox(1.6, 0.03, 0.05, chrome, -2.0, 0.8, 1.1, 0.1, 0.8);
      g.add(mod, enc, tirador);
      g.userData = { extra: true };
      obj = g;
    } else if (id === 'int_bano') {
      const g = makeGroup();
      const mod = makeBox(0.8, 0.8, 0.8, matColor, 2.5, 0.4, 1.5, 0.4, 0.0);
      const san = makeBox(0.4, 0.3, 0.4, 0xf5f5f5, 2.5, 0.55, 1.5, 0.1, 0.0);
      const espejo = makePlane(0.6, 0.6, 0x93c5fd, 2.45, 0.9, 1.5, Math.PI / 2, true, 0.3, 0.0, 0.0);
      g.add(mod, san, espejo);
      g.userData = { extra: true };
      obj = g;
    }
    if (obj) currentTypeGroup.add(obj);
  });
}

function updateQuality() {
  if (!threeScene || !currentTypeGroup) return;
  const calidad = document.getElementById('b-calidad').value;
  const roughness = calidad === 'alta' ? 0.2 : calidad === 'basica' ? 0.8 : 0.5;
  const metalness = calidad === 'alta' ? 0.3 : calidad === 'basica' ? 0.05 : 0.15;
  currentTypeGroup.traverse(child => {
    if (child.isMesh && child.material) {
      child.material.roughness = roughness;
      child.material.metalness = metalness;
    }
  });
}

function updateVisual() {
  const badges = document.getElementById('budgetBadges');
  const tipo = document.getElementById('b-tipo').value;
  if (tipo) buildScene(tipo);
  updateQuality();
  // badges
  if (badges) {
    const checked = Array.from(document.querySelectorAll('#budgetExtras input:checked'));
    const labels = checked.map(i => i.closest('.extra-toggle').querySelector('.extra-toggle-label').textContent);
    badges.innerHTML = labels.map(l => `<span class="budget-badge">${l}</span>`).join('');
  }
}

const bTipoSelect = document.getElementById('b-tipo');
if (bTipoSelect) {
  bTipoSelect.addEventListener('change', () => { renderExtras(bTipoSelect.value); updateVisual(); autoCalculate(); });
  renderExtras(bTipoSelect.value);
}
const bCalidadSelect = document.getElementById('b-calidad');
if (bCalidadSelect) bCalidadSelect.addEventListener('change', () => { updateVisual(); autoCalculate(); });

// init three
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThree);
} else {
  initThree();
}
if (bTipoSelect && bTipoSelect.value) { updateVisual(); }

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
  const checkedExtras = Array.from(budgetForm.querySelectorAll('.budget-extras input:checked'));
  const extras = checkedExtras.map(i => i.value);

  let ok = true;
  if (!tipo) { showErrorBudget('b-tipoError', 'Selecciona un tipo de reforma.'); ok = false; }
  if (!m2 || m2 <= 0) { showErrorBudget('b-m2Error', 'Introduce una superficie válida.'); ok = false; }
  if (!ok) {
    const br = document.getElementById('budgetResult');
    if (br) br.hidden = true;
    return;
  }

  const rate = (BUDGET_RATES[tipo] && BUDGET_RATES[tipo][calidad]) ? BUDGET_RATES[tipo][calidad] : 0;
  const base = m2 * rate;
  let extrasTotal = 0;
  checkedExtras.forEach(input => {
    const price = parseFloat(input.dataset.price) || 0;
    const perM2 = input.dataset.perm2 === 'true';
    extrasTotal += perM2 ? price * m2 : price;
  });
  const total = base + extrasTotal;
  const low = Math.round(total * 0.9);
  const high = Math.round(total * 1.1);

  lastBudgetEstimate = { tipo, m2, calidad, extras, total, low, high };
  budgetValue.textContent = `${low.toLocaleString('es-ES')} € – ${high.toLocaleString('es-ES')} €`;
  budgetResult.hidden = false;
  budgetResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Cálculo automático al cambiar valores
function autoCalculate() {
  const tipo = document.getElementById('b-tipo').value;
  const m2 = parseFloat(document.getElementById('b-m2').value);
  if (tipo && m2 > 0) calculateBudget();
  else {
    const br = document.getElementById('budgetResult');
    if (br) br.hidden = true;
  }
}
budgetForm.addEventListener('submit', (e) => e.preventDefault());
const bM2Input = document.getElementById('b-m2');
if (bM2Input) bM2Input.addEventListener('input', autoCalculate);
budgetUseBtn.addEventListener('click', () => {
  if (!lastBudgetEstimate) return;
  const { tipo, m2, calidad, extras, low, high } = lastBudgetEstimate;
  const tipoLabel = document.querySelector(`#b-tipo option[value="${tipo}"]`).textContent;
  const calidadLabel = document.querySelector(`#b-calidad option[value="${calidad}"]`).textContent;
  const extrasLabel = extras.length ? extras.map(id => {
    const found = (EXTRAS_BY_TYPE[tipo] || []).find(e => e.id === id);
    return found ? found.label : id;
  }).join(', ') : 'ninguno';
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