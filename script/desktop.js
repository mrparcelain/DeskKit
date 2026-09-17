/* ==========================================================================
   Desktop core
   --------------------------------------------------------------------------
   Reads apps/apps.json, puts an icon on the desktop for each app, and gives
   every app its own draggable, resizable window when it's opened.

   An app is just a folder in /apps (see apps/README.md):

     apps/my-app/
       app.json     name, icon, window size, which files to load
       index.html   what goes inside the window
       style.css    (optional)
       script.js    (optional)

   Apps talk to the desktop through the global `Desktop` object:

     Desktop.app('my-app', ({ body, url, onOpen, onClose, close }) => { ... })
     Desktop.open('music')          Desktop.close('music')
     Desktop.url('my-app', 'data.json')   → full URL of a file in the app folder
     Desktop.createWindow({ title: 'Photo', width: '30rem' })  → extra windows

   Mobile: on narrow screens (see MOBILE_QUERY) the same page switches to a
   phone layout - one tab per app instead of icons and windows. It switches
   back and forth live as the window is resized. Apps can ship a separate
   phone UI ("mobile" in app.json + Desktop.mobileApp); otherwise their normal
   index.html is shown full-width.
   ========================================================================== */

(() => {
  'use strict';

  const SCRIPT_URL = document.currentScript ? document.currentScript.src : location.href;
  const APPS_ROOT = new URL('../apps/', SCRIPT_URL);
  const UI_ROOT = new URL('../ui/', SCRIPT_URL);

  // Keep in sync with the "Mobile" section of css/desktop.css
  const MOBILE_QUERY = window.matchMedia('(max-width: 47.5rem)');
  let mode = MOBILE_QUERY.matches ? 'mobile' : 'desktop';
  document.documentElement.classList.toggle('is-mobile', mode === 'mobile');

  const apps = new Map();        // id → { id, base, manifest, icon, win, mounting, openHandlers, closeHandlers }
  const initializers = new Map();
  const mobileInitializers = new Map();
  const modeHandlers = new Set();
  const loadedScripts = new Map();
  const loadedStyles = new Map();
  let topZ = 500;
  let cascade = 0;

  /* ------------------------------------------------------------ helpers */

  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (value == null || value === false) continue;
      if (key === 'class') el.className = value;
      else if (key === 'dataset') Object.assign(el.dataset, value);
      else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
      else el.setAttribute(key, value === true ? '' : value);
    }
    children.flat().forEach((child) => {
      if (child != null) el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    });
    return el;
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${res.status} loading ${url}`);
    return res.json();
  }

  async function fetchText(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${res.status} loading ${url}`);
    return res.text();
  }

  // An app's HTML is a fragment. Getting a whole page back usually means the
  // file is missing and the server answered with another page instead.
  async function fetchFragment(url) {
    const text = await fetchText(url);
    if (/^\s*(<!doctype|<html[\s>])/i.test(text)) {
      throw new Error(`${url.pathname || url} came back as a whole web page - is that file on the server?`);
    }
    return text;
  }

  // An app's own scripts are fetched with cache: 'no-cache' (like its HTML and
  // app.json) and run inline, so editing script.js and reloading always runs the
  // new file - no stale copy from the browser cache. Scripts on other sites
  // (a CDN library) can't be read that way, so they get a normal <script src>.
  function loadScript(src) {
    if (!loadedScripts.has(src)) {
      const sameSite = new URL(src, location.href).origin === location.origin;
      loadedScripts.set(src, sameSite ? runScript(src) : tagScript(src));
    }
    return loadedScripts.get(src);
  }

  async function runScript(src) {
    const code = await fetchText(src);
    const s = document.createElement('script');
    // sourceURL keeps the file's name in DevTools and in error messages
    s.textContent = `${code}\n//# sourceURL=${src}`;
    document.head.append(s);
  }

  function tagScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`Could not load ${src}`));
      document.head.append(s);
    });
  }

  function loadStyle(href) {
    if (!loadedStyles.has(href)) {
      loadedStyles.set(href, new Promise((resolve) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = resolve;
        link.onerror = () => { console.warn(`Could not load ${href}`); resolve(); };
        document.head.append(link);
      }));
    }
    return loadedStyles.get(href);
  }

  // Paths written in an app's index.html (src="assets/x.png") are relative to
  // the app folder, but the HTML lives inside desktop/index.html - fix them up.
  const ABSOLUTE = /^(?:[a-z][a-z0-9+.-]*:|\/|#)/i;
  function resolveUrls(root, base) {
    root.querySelectorAll('[src], [href], [poster]').forEach((el) => {
      ['src', 'href', 'poster'].forEach((attr) => {
        const value = el.getAttribute(attr);
        if (value && !ABSOLUTE.test(value)) el.setAttribute(attr, new URL(value, base).href);
      });
    });
  }

  function normalizeManifest(id, raw) {
    const m = raw && typeof raw === 'object' ? raw : {};
    const win = m.window && typeof m.window === 'object' ? m.window : {};
    return {
      name: m.name || id,
      icon: m.icon || 'icon.png',
      html: m.html === undefined ? 'index.html' : m.html,
      styles: Array.isArray(m.styles) ? m.styles : [],
      scripts: Array.isArray(m.scripts) ? m.scripts : [],
      openOnStart: m.openOnStart === true,
      // "mobile": false hides the app on phones. "mobile": { html, styles, scripts }
      // gives it its own phone UI; without it the normal files are used.
      mobile: normalizeMobile(m),
      window: {
        width: win.width || '40rem',
        height: win.height || '28rem',
        minWidth: win.minWidth || '20rem',
        minHeight: win.minHeight || '12rem',
        resizable: win.resizable !== false,
      },
    };
  }

  function normalizeMobile(m) {
    if (m.mobile === false) return null;
    const mob = m.mobile && typeof m.mobile === 'object' ? m.mobile : null;
    return {
      custom: Boolean(mob),
      html: mob ? (mob.html === undefined ? 'mobile.html' : mob.html) : (m.html === undefined ? 'index.html' : m.html),
      styles: mob ? (Array.isArray(mob.styles) ? mob.styles : []) : (Array.isArray(m.styles) ? m.styles : []),
      scripts: mob ? (Array.isArray(mob.scripts) ? mob.scripts : []) : (Array.isArray(m.scripts) ? m.scripts : []),
      // show the thin title bar under the tabs (turn off if the app draws its own header)
      titlebar: mob ? mob.titlebar !== false : true,
    };
  }

  /* ------------------------------------------------------------- windows */

  function focus(el) {
    if (!el) return;
    topZ += 1;
    el.style.zIndex = topZ;
    document.querySelectorAll('.app.is-focused').forEach((w) => w !== el && w.classList.remove('is-focused'));
    el.classList.add('is-focused');
  }

  function dragElement(el, handle = el) {
    let startX = 0, startY = 0;

    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('button, a, input, select, textarea')) return;
      e.preventDefault();
      startX = e.clientX;
      startY = e.clientY;
      handle.setPointerCapture(e.pointerId);
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', stop, { once: true });
      handle.addEventListener('pointercancel', stop, { once: true });
    });

    function move(e) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = e.clientX;
      startY = e.clientY;
      // keep the title bar on screen so the window can always be grabbed again
      const top = Math.min(Math.max(el.offsetTop + dy, 0), window.innerHeight - handle.offsetHeight);
      const left = Math.min(Math.max(el.offsetLeft + dx, -el.offsetWidth + 80), window.innerWidth - 80);
      el.style.top = `${top}px`;
      el.style.left = `${left}px`;
    }

    function stop() {
      handle.removeEventListener('pointermove', move);
    }
  }

  // Builds an empty window with the desktop's title bar. Apps get one of these
  // automatically; call Desktop.createWindow() yourself for extra windows.
  function createWindow({
    id, title = '', width = '40rem', height = '28rem', minWidth = '20rem', minHeight = '12rem',
    resizable = true, left, top, className = '', onClose,
  } = {}) {
    const closeBtn = h('button', { type: 'button', class: 'app-close', 'aria-label': `Close ${title}` },
      h('img', { src: new URL('icon/close.svg', UI_ROOT).href, alt: '', draggable: 'false' }));
    const dot = () => h('span', { 'aria-hidden': 'true' }, h('img', { src: new URL('icon/inactive.svg', UI_ROOT).href, alt: '', draggable: 'false' }));
    const titleEl = h('span', { class: 'appname' }, title);

    const titlebar = h('div', { class: 'app-titlebar' },
      h('div', { class: 'box-appactions' }, closeBtn, dot(), dot()),
      titleEl,
      h('div', { class: 'box-appactions is-spacer', 'aria-hidden': 'true' }, dot(), dot(), dot()));
    const body = h('div', { class: 'app-body' });
    const el = h('section', { class: `app app-shadow ${className}`.trim(), id, role: 'dialog', 'aria-label': title }, titlebar, body);

    const fit = (size, gap) => `min(${size}, calc(100vw - ${gap}))`;
    const fitH = (size, gap) => `min(${size}, calc(100vh - ${gap}))`;
    Object.assign(el.style, {
      width: fit(width, '2rem'),
      height: height === 'auto' ? 'auto' : fitH(height, '5rem'),
      minWidth: fit(minWidth, '1rem'),
      minHeight: minHeight === 'auto' ? 'auto' : fitH(minHeight, '1rem'),
      resize: resizable ? 'both' : 'none',
    });

    // New windows cascade from the centre so they don't stack exactly on top of each other
    const offset = `${cascade * 1.5}rem`;
    cascade = (cascade + 1) % 6;
    el.style.left = left || `max(0.5rem, calc((100vw - ${fit(width, '2rem')}) / 2 + ${offset}))`;
    el.style.top = top || `max(2.5rem, calc(8vh + ${offset}))`;

    const api = {
      el,
      body,
      titlebar,
      setTitle(text) { titleEl.textContent = text; el.setAttribute('aria-label', text); },
      close() { if (onClose) onClose(); else el.remove(); },
      focus: () => focus(el),
    };

    closeBtn.addEventListener('click', () => api.close());
    el.addEventListener('pointerdown', () => focus(el));
    dragElement(el, titlebar);
    document.body.append(el);
    focus(el);
    return api;
  }

  /* ---------------------------------------------------------------- apps */

  // Loads an app's styles, HTML and scripts into `body`, then runs its setup
  async function loadApp(record, { body, files, init, context }) {
    const { id, base, manifest } = record;
    body.classList.add('is-loading');
    try {
      await Promise.all(files.styles.map((href) => loadStyle(new URL(href, base).href)));
      if (files.html) {
        body.innerHTML = await fetchFragment(new URL(files.html, base));
        resolveUrls(body, base);
      }
      // "scripts" entries are paths, or { "src": "...", "optional": true } for extras
      // (like a CDN library) the app can live without
      for (const entry of files.scripts) {
        const { src, optional } = typeof entry === 'string' ? { src: entry, optional: false } : entry;
        try {
          await loadScript(new URL(src, base).href);
        } catch (err) {
          if (!optional) throw err;
          console.warn(`[${id}] Optional script did not load: ${src}`);
        }
      }

      const setup = init();
      if (files.custom && typeof setup !== 'function') {
        throw new Error(`No Desktop.mobileApp('${id}', ...) found in the phone scripts`);
      }
      if (setup) {
        await setup({
          id,
          body,
          url: (path = '') => new URL(path, base).href,
          onModeChange: (fn) => { modeHandlers.add(fn); },
          ...context,
        });
      }
      return true;
    } catch (err) {
      console.error(`[${id}]`, err);
      body.replaceChildren(h('div', { class: 'app-empty' },
        h('strong', null, `${manifest.name} could not start`),
        h('span', null, err.message)));
      return false;
    } finally {
      body.classList.remove('is-loading');
    }
  }

  async function mount(record) {
    const { id, manifest } = record;
    const win = createWindow({ id, title: manifest.name, ...manifest.window, onClose: () => close(id) });
    win.el.dataset.app = id;
    record.win = win;

    await loadApp(record, {
      body: win.body,
      files: manifest,
      init: () => initializers.get(id),
      context: {
        mode: 'desktop',
        window: win.el,
        onOpen: (fn) => record.openHandlers.push(fn),
        onClose: (fn) => record.closeHandlers.push(fn),
        close: () => close(id),
        setTitle: win.setTitle,
      },
    });
  }

  async function open(id) {
    const record = apps.get(id);
    if (!record) { console.warn(`No app called "${id}" - is it listed in apps/apps.json?`); return; }
    if (mode === 'mobile') { showTab(id); return; }
    if (!record.win) {
      record.mounting = record.mounting || mount(record);
      await record.mounting;
    }
    record.win.el.classList.remove('hidden');
    focus(record.win.el);
    record.openHandlers.forEach((fn) => fn());
  }

  function close(id) {
    const record = apps.get(id);
    if (!record || !record.win) return;
    record.win.el.classList.add('hidden');
    record.closeHandlers.forEach((fn) => fn());
  }

  /* -------------------------------------------------------------- mobile */

  const mobile = {
    shell: null,
    tabs: null,
    title: null,
    titlebar: null,
    views: null,
    order: [],
    current: null,
  };

  function buildMobileShell(records) {
    mobile.order = records.filter((r) => r.manifest.mobile);
    mobile.tabs = h('nav', { class: 'm-tabs', role: 'tablist', 'aria-label': 'Apps' });
    mobile.title = h('span', { class: 'm-title' });
    mobile.titlebar = h('div', { class: 'm-titlebar' }, mobile.title);
    mobile.views = h('main', { class: 'm-views' });
    mobile.shell = h('div', { class: 'mobile-shell' },
      h('header', { class: 'm-top' }, mobile.tabs),
      mobile.titlebar,
      mobile.views);

    mobile.order.forEach((record) => {
      const tab = h('button', {
        type: 'button', class: 'm-tab', role: 'tab', 'aria-selected': 'false',
        dataset: { app: record.id }, onClick: () => showTab(record.id),
      }, record.manifest.name);
      record.mobile = { tab, view: null, body: null, mounting: null, openHandlers: [], closeHandlers: [] };
      mobile.tabs.append(tab);
    });

    document.body.append(mobile.shell);
  }

  function mountMobile(record) {
    const { id, manifest } = record;
    const files = manifest.mobile;
    const body = h('div', { class: 'app-body m-view-body' });
    const view = h('section', { class: 'm-view', role: 'tabpanel', dataset: { app: id }, hidden: true }, body);
    Object.assign(record.mobile, { view, body });
    mobile.views.append(view);

    const context = {
      mode: 'mobile',
      window: view,
      onOpen: (fn) => record.mobile.openHandlers.push(fn),
      onClose: (fn) => record.mobile.closeHandlers.push(fn),
      close: () => {},
      setTitle: (text) => { if (mobile.current === id) mobile.title.textContent = text; },
    };

    return loadApp(record, {
      body,
      files,
      // apps without a phone UI reuse their desktop setup function
      init: () => (files.custom ? mobileInitializers.get(id) : initializers.get(id)),
      context,
    }).then((ok) => {
      if (ok || !files.custom) return;
      // The phone UI didn't load (see the console) - show the desktop version full-width instead
      console.warn(`[${id}] Phone layout failed, using the desktop layout instead.`);
      record.mobile.fallback = true;
      if (mobile.current === id) mobile.titlebar.hidden = false;
      return loadApp(record, {
        body,
        files: { html: manifest.html, styles: manifest.styles, scripts: manifest.scripts },
        init: () => initializers.get(id),
        context,
      });
    });
  }

  async function showTab(id) {
    const record = apps.get(id);
    if (!record || !record.mobile || !mobile.shell) return;
    const previous = mobile.current ? apps.get(mobile.current) : null;
    if (previous === record) return;

    mobile.current = id;
    mobile.order.forEach((r) => {
      const active = r === record;
      r.mobile.tab.classList.toggle('is-active', active);
      r.mobile.tab.setAttribute('aria-selected', String(active));
    });
    if (record.mobile.tab.scrollIntoView) record.mobile.tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    mobile.title.textContent = record.manifest.name;
    mobile.titlebar.hidden = !(record.manifest.mobile.titlebar || record.mobile.fallback);

    // mountMobile creates the view element synchronously, then loads in the background
    if (!record.mobile.view) record.mobile.mounting = mountMobile(record);
    const forward = mobile.order.indexOf(previous) < mobile.order.indexOf(record);
    slideViews(previous && previous.mobile.view, record.mobile.view, forward);

    if (previous) previous.mobile.closeHandlers.forEach((fn) => fn());
    await record.mobile.mounting;
    if (mobile.current === id) record.mobile.openHandlers.forEach((fn) => fn());
  }

  // iOS-style slide between tabs: forward = new view comes in from the right
  function slideViews(from, to, forward) {
    if (!to) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!from || reduce) {
      if (from) { from.hidden = true; from.classList.remove('is-current'); }
      to.hidden = false;
      to.classList.remove('is-before', 'is-after');
      to.classList.add('is-current');
      return;
    }
    to.classList.add('is-instant', forward ? 'is-after' : 'is-before');
    to.hidden = false;
    void to.offsetWidth;
    to.classList.remove('is-instant', 'is-after', 'is-before');
    to.classList.add('is-current');

    from.classList.remove('is-current');
    from.classList.add(forward ? 'is-before' : 'is-after');
    const done = () => {
      if (!from.classList.contains('is-current')) {
        from.hidden = true;
        from.classList.remove('is-before', 'is-after');
      }
    };
    from.addEventListener('transitionend', done, { once: true });
    setTimeout(done, 450);
  }

  let desktopStarted = false;

  function startDesktop(records) {
    if (desktopStarted) return;
    desktopStarted = true;
    // desktop/index.html#music opens the Music app straight away (handy for links).
    // Otherwise open apps with "openOnStart": true, unless a visitor turned that off.
    const fromHash = decodeURIComponent(location.hash.slice(1));
    if (apps.has(fromHash)) {
      open(fromHash);
    } else {
      records.filter((r) => opensOnStart(r.id)).forEach((r) => open(r.id));
    }
  }

  function applyMode(records) {
    document.documentElement.classList.toggle('is-mobile', mode === 'mobile');
    if (mode === 'mobile') {
      if (!mobile.current) {
        const fromHash = decodeURIComponent(location.hash.slice(1));
        const first = mobile.order.find((r) => r.id === fromHash) || mobile.order[0];
        if (first) showTab(first.id);
      }
    } else {
      startDesktop(records);
    }
  }

  function renderIcon(record, grid) {
    const { id, base, manifest } = record;
    const icon = h('button', { type: 'button', class: 'box-icon', dataset: { app: id }, title: `Open ${manifest.name}` },
      h('img', { src: new URL(manifest.icon, base).href, alt: '', draggable: 'false' }),
      h('span', { class: 'text-shadow' }, manifest.name));

    const coarse = window.matchMedia('(pointer: coarse)');
    icon.addEventListener('dblclick', () => open(id));
    icon.addEventListener('click', (e) => {
      // keyboard (Enter/Space) and touch screens open with a single activation
      if (e.detail === 0 || coarse.matches) open(id);
    });
    record.icon = icon;
    grid.append(icon);
  }

  /* --------------------------------------------------------- desktop icons */

  // Icons start laid out in a grid. The first time one is dragged, every icon
  // is pinned to the place it is already in (the .is-freeform class), so moving
  // one no longer reflows the rest. Positions are kept for this visitor.
  const ICONS_KEY = 'desktop.iconPlaces';

  function readIconPlaces() {
    try { return JSON.parse(localStorage.getItem(ICONS_KEY)) || {}; } catch (err) { return {}; }
  }

  function saveIconPlaces(grid) {
    const places = {};
    grid.querySelectorAll('.box-icon').forEach((icon) => {
      places[icon.dataset.app] = [parseFloat(icon.style.left) || 0, parseFloat(icon.style.top) || 0];
    });
    try { localStorage.setItem(ICONS_KEY, JSON.stringify(places)); } catch (err) { /* storage blocked */ }
  }

  // Pin every icon where it currently sits, then switch the grid off
  function freezeIcons(grid) {
    if (grid.classList.contains('is-freeform')) return;
    const base = grid.getBoundingClientRect();
    const spots = [...grid.querySelectorAll('.box-icon')].map((icon) => {
      const box = icon.getBoundingClientRect();
      return [icon, box.left - base.left, box.top - base.top];
    });
    grid.classList.add('is-freeform');
    spots.forEach(([icon, x, y]) => placeIcon(grid, icon, x, y));
  }

  function placeIcon(grid, icon, x, y) {
    // inline, because jQuery UI gives a dragged element position: relative
    icon.style.position = 'absolute';
    const limitX = Math.max(0, grid.clientWidth - icon.offsetWidth);
    const limitY = Math.max(0, grid.clientHeight - icon.offsetHeight);
    icon.style.left = `${Math.min(Math.max(0, x), limitX)}px`;
    icon.style.top = `${Math.min(Math.max(0, y), limitY)}px`;
  }

  function setupIcons(grid) {
    const places = readIconPlaces();
    const saved = [...grid.querySelectorAll('.box-icon')].filter((icon) => places[icon.dataset.app]);
    if (saved.length) {
      freezeIcons(grid);
      saved.forEach((icon) => {
        const [x, y] = places[icon.dataset.app];
        placeIcon(grid, icon, x, y);
      });
    }

    // Keep icons on screen when the window is resized
    window.addEventListener('resize', () => {
      if (!grid.classList.contains('is-freeform')) return;
      grid.querySelectorAll('.box-icon').forEach((icon) => {
        placeIcon(grid, icon, parseFloat(icon.style.left) || 0, parseFloat(icon.style.top) || 0);
      });
    });

    // jQuery UI does the dragging itself, if it's on the page
    const $ = window.jQuery;
    if (!$ || !$.fn.draggable) return;
    $(grid).children('.box-icon').draggable({
      containment: 'parent',
      // the icons are <button>s, which jQuery UI would refuse to drag by default
      cancel: 'input, textarea, select, option',
      distance: 4,
      zIndex: 30,
      scroll: false,
      start: () => freezeIcons(grid),
      stop: () => saveIconPlaces(grid),
    });
  }

  // Put the icons back in their starting grid
  function resetIcons(grid = document.querySelector('.box-icons1')) {
    if (!grid) return;
    try { localStorage.removeItem(ICONS_KEY); } catch (err) { /* storage blocked */ }
    grid.classList.remove('is-freeform');
    grid.querySelectorAll('.box-icon').forEach((icon) => {
      icon.style.position = '';
      icon.style.left = '';
      icon.style.top = '';
    });
  }

  async function boot({ grid = '.box-icons1' } = {}) {
    const gridEl = typeof grid === 'string' ? document.querySelector(grid) : grid;

    let ids = [];
    try {
      ids = await fetchJSON(new URL('apps.json', APPS_ROOT));
      if (!Array.isArray(ids)) throw new Error('apps/apps.json should be a list of app folder names');
    } catch (err) {
      console.error('[desktop]', err);
      return;
    }

    const records = await Promise.all(ids.map(async (id) => {
      const base = new URL(`${id}/`, APPS_ROOT);
      try {
        const manifest = normalizeManifest(id, await fetchJSON(new URL('app.json', base)));
        const record = { id, base, manifest, icon: null, win: null, mounting: null, openHandlers: [], closeHandlers: [] };
        apps.set(id, record);
        return record;
      } catch (err) {
        console.error(`[desktop] Skipping "${id}":`, err.message);
        return null;
      }
    }));

    if (gridEl) records.filter(Boolean).forEach((record) => renderIcon(record, gridEl));

    if (gridEl) setupIcons(gridEl);

    const loaded = records.filter(Boolean);
    buildMobileShell(loaded);
    applyMode(loaded);

    // Switch layouts live when the window crosses the mobile breakpoint
    MOBILE_QUERY.addEventListener('change', (e) => {
      mode = e.matches ? 'mobile' : 'desktop';
      applyMode(loaded);
      modeHandlers.forEach((fn) => { try { fn(mode); } catch (err) { console.error(err); } });
      document.dispatchEvent(new CustomEvent('desktop:modechange', { detail: { mode } }));
    });

    document.dispatchEvent(new CustomEvent('desktop:ready', { detail: { apps: [...apps.keys()], mode } }));
  }

  const START_KEY = (id) => `desktop.openOnStart.${id}`;

  function opensOnStart(id) {
    const record = apps.get(id);
    if (!record) return false;
    let saved = null;
    try { saved = localStorage.getItem(START_KEY(id)); } catch (err) { /* storage blocked */ }
    return saved === null ? record.manifest.openOnStart : saved === '1';
  }

  function setOpenOnStart(id, on) {
    try { localStorage.setItem(START_KEY(id), on ? '1' : '0'); } catch (err) { /* storage blocked */ }
  }

  /* ----------------------------------------------------------------- API */

  const Desktop = {
    boot,
    open,
    close,
    focus,
    createWindow,
    // Register the code for an app. It runs once, right after the app's window
    // and index.html are created (the first time it's opened).
    app(id, init) { initializers.set(id, init); },
    // Register a separate phone UI for an app (needs "mobile" in its app.json).
    // Same setup object as Desktop.app, with mode: 'mobile'.
    mobileApp(id, init) { mobileInitializers.set(id, init); },
    // 'desktop' or 'mobile' right now
    get mode() { return mode; },
    // Whether an app opens by itself when the desktop loads ("openOnStart" in
    // app.json). setOpenOnStart remembers a visitor's choice in their browser.
    opensOnStart,
    setOpenOnStart,
    // Put dragged desktop icons back into their starting grid
    resetIcons,
    // URL of a file inside an app folder, e.g. Desktop.url('music', 'music.json')
    url(id, path = '') { return new URL(path, new URL(`${id}/`, APPS_ROOT)).href; },
    get apps() { return [...apps.values()].map(({ id, manifest }) => ({ id, name: manifest.name })); },
  };

  window.Desktop = Desktop;

  // Older inline handlers (onclick="openApp('music')") keep working
  window.openApp = (id) => Desktop.open(id);
  window.closeApp = (id) => Desktop.close(id);
})();
