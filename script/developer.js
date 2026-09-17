/* ==========================================================================
   Developer · Music + Photo library editor
   --------------------------------------------------------------------------
   Two sections, each editing the file its desktop app reads:

   Music  → apps/music/music.json
     [ { name, image, albums: [ { title, cover, date, tracks: [ { title, url, length } ] } ] } ]

   Photos → apps/photos/photos.json
     { "Library": { "2024": { "Album": [ "photo url", ... ] } } }

   • Every edit is saved as a draft in this browser (localStorage), and the
     desktop apps show that draft right away - so it also works on static
     hosting with no PHP.
   • "Publish" sends the current section to api/upload.php?target=music|photos
     (needs the API key), which overwrites that JSON file for everyone. Images
     upload through the same endpoint when a key is set; otherwise they're
     resized and kept inline.
   • "Download ...json" lets you replace the file by hand.
   ========================================================================== */

(() => {
  'use strict';

  const KEYS = {
    settings: 'deskkit.dev.settings',
    apiKey: 'deskkit.dev.apikey',
  };
  const DEFAULT_API = '../api/upload.php';
  const NEW_SINGLE = '__new_single__';
  const NEW_ALBUM = '__new_album__';
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

  /* ------------------------------------------------------------------ icons */

  const ICONS = {
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    note: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    disc: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>',
    external: '<path d="M14 4h6v6"/><path d="M10 14 20 4"/><path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6"/>',
    gear: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    upload: '<path d="M12 16V4"/><path d="m6 10 6-6 6 6"/><path d="M4 20h16"/>',
    download: '<path d="M12 4v12"/><path d="m6 10 6 6 6-6"/><path d="M4 20h16"/>',
    grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    dots: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
    file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/>',
    sort: '<path d="M7 4v16"/><path d="m3 16 4 4 4-4"/><path d="M14 6h7M14 12h5M14 18h3"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9"/><path d="m17 6 3 3"/><path d="m14.5 8.5 2 2"/>',
    text: '<path d="M5 7V5h14v2"/><path d="M12 5v14"/><path d="M9 19h6"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    hash: '<path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16"/>',
    play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M8 5v14M16 5v14" stroke-width="3.5"/>',
    expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
    grip: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
    trash: '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>',
    up: '<path d="m6 15 6-6 6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    stack: '<rect x="3" y="7" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/>',
    left: '<path d="m15 6-6 6 6 6"/>',
    right: '<path d="m9 6 6 6-6 6"/>',
    select: '<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><path d="m8 12 3 3 5-6"/>',
    audio: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  };

  const iconSVG = (name) =>
    `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  function iconNode(name) {
    const t = document.createElement('template');
    t.innerHTML = iconSVG(name);
    return t.content.firstChild;
  }

  function hydrateIcons(root) {
    root.querySelectorAll('[data-icon]').forEach((node) => {
      if (node.tagName === 'SPAN' && !node.className) node.replaceWith(iconNode(node.dataset.icon));
      else node.replaceChildren(iconNode(node.dataset.icon));
    });
  }

  /* -------------------------------------------------------------- DOM helper */

  // h('div', { class: 'x', onClick: fn, dataset: {...} }, 'text', node, [nodes])
  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (value == null || value === false) continue;
      if (key === 'class') el.className = value;
      else if (key === 'dataset') Object.assign(el.dataset, value);
      else if (key === 'style') Object.assign(el.style, value);
      else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
      else if (key in el && typeof value !== 'string') el[key] = value;
      else el.setAttribute(key, value === true ? '' : value);
    }
    appendChildren(el, children);
    return el;
  }

  function appendChildren(el, children) {
    for (const child of children.flat(Infinity)) {
      if (child == null || child === false) continue;
      el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
  }

  const $ = (sel, root = document) => root.querySelector(sel);

  /* ------------------------------------------------------------------ state */

  const state = {
    artists: [],             // music library   (apps/music/music.json)
    libraries: [],           // photo libraries (apps/photos/photos.json)
    tab: 'artists',
    lastTab: { music: 'artists', photos: 'libraries' },
    query: '',
    apiUrl: DEFAULT_API,
    apiKey: '',
    rememberKey: false,
    playingUrl: null,
    selecting: false,        // "Select" mode: rows get checkboxes, clicks toggle selection
    selected: new Set(),     // the records that are ticked
  };

  const storage = {
    get(key, session = false) {
      try { return (session ? sessionStorage : localStorage).getItem(key); } catch { return null; }
    },
    set(key, value, session = false) {
      try { (session ? sessionStorage : localStorage).setItem(key, value); return true; } catch { return false; }
    },
    remove(key, session = false) {
      try { (session ? sessionStorage : localStorage).removeItem(key); } catch { /* ignore */ }
    },
  };

  const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));

  function normalizeLibrary(data) {
    if (!Array.isArray(data)) throw new Error('Expected a list of artists.');
    return data.map((artist, i) => {
      if (!artist || typeof artist !== 'object') throw new Error(`Artist #${i + 1} is not an object.`);
      return {
        name: str(artist.name),
        image: str(artist.image),
        albums: (Array.isArray(artist.albums) ? artist.albums : []).map((album) => ({
          title: str(album && album.title),
          cover: str(album && album.cover),
          date: str(album && album.date),
          tracks: (Array.isArray(album && album.tracks) ? album.tracks : []).map((track) => ({
            title: str(track && track.title),
            url: str(track && track.url),
            length: str(track && track.length),
          })),
        })),
      };
    });
  }

  function hashString(s) {
    let h1 = 5381;
    for (let i = 0; i < s.length; i++) h1 = ((h1 << 5) + h1 + s.charCodeAt(i)) | 0;
    return (h1 >>> 0).toString(36) + ':' + s.length;
  }

  /* ----------------------------------------------------------- photo data */

  // photos.json → [{ name, albums: [{ title, year, photos: [{ url }] }] }]
  // (photos are wrapped in objects so each one can be selected / moved)
  function parsePhotoLibraries(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Expected an object of photo libraries.');
    return Object.entries(data).map(([name, years]) => {
      const library = { name: str(name), albums: [] };
      if (years && typeof years === 'object' && !Array.isArray(years)) {
        Object.entries(years).forEach(([year, albums]) => {
          if (!albums || typeof albums !== 'object' || Array.isArray(albums)) return;
          Object.entries(albums).forEach(([title, photos]) => {
            library.albums.push({
              title: str(title),
              year: str(year),
              photos: (Array.isArray(photos) ? photos : []).filter((p) => typeof p === 'string').map((url) => ({ url })),
            });
          });
        });
      }
      return library;
    });
  }

  function serializePhotoLibraries(libraries) {
    const out = {};
    libraries.forEach((library) => {
      const years = {};
      library.albums.forEach((album) => {
        years[album.year] = years[album.year] || {};
        years[album.year][album.title] = album.photos.map((p) => p.url);
      });
      out[library.name] = years;
    });
    return out;
  }

  /* -------------------------------------------------------------- datasets */

  const DATASETS = {
    music: {
      key: 'music',
      title: 'Music Library',
      app: 'Music app',
      file: 'music.json',
      path: 'apps/music/music.json',
      dataUrl: '../apps/music/music.json',
      draftKey: 'deskkit.music.draft',          // read by apps/music/script.js
      tabs: ['artists', 'albums', 'tracks'],
      publishedJSON: null,                       // canonical JSON of the published file, or null if it could not load
      loadError: null,
      staleDraft: false,
      get data() { return state.artists; },
      set data(value) { state.artists = value; },
      parse: (raw) => normalizeLibrary(raw),
      toFile: () => state.artists,
      draftFields: () => ({ artists: state.artists }),
      readDraft: (draft) => (draft && Array.isArray(draft.artists) ? normalizeLibrary(draft.artists) : null),
      summary(data) {
        const t = totals(data);
        return {
          rows: [['Artists', t.artists], ['Releases', t.albums], ['Tracks', t.tracks]],
          named: data.map((a) => ({ name: a.name, json: JSON.stringify(a) })),
        };
      },
      hasInlineImages: () => state.artists.some((a) => a.image.startsWith('data:') || a.albums.some((al) => al.cover.startsWith('data:'))),
    },
    photos: {
      key: 'photos',
      title: 'Photo Library',
      app: 'Photos app',
      file: 'photos.json',
      path: 'apps/photos/photos.json',
      dataUrl: '../apps/photos/photos.json',
      draftKey: 'deskkit.photos.draft',         // read by apps/photos/script.js
      tabs: ['libraries', 'photoAlbums', 'photos'],
      publishedJSON: null,
      loadError: null,
      staleDraft: false,
      get data() { return state.libraries; },
      set data(value) { state.libraries = value; },
      parse: (raw) => parsePhotoLibraries(raw),
      toFile: () => serializePhotoLibraries(state.libraries),
      draftFields: () => ({ data: serializePhotoLibraries(state.libraries) }),
      readDraft: (draft) => (draft && draft.data && typeof draft.data === 'object' ? parsePhotoLibraries(draft.data) : null),
      summary(data) {
        const albums = data.reduce((n, l) => n + l.albums.length, 0);
        const photos = data.reduce((n, l) => n + countPhotos(l), 0);
        return {
          rows: [['Libraries', data.length], ['Albums', albums], ['Photos', photos]],
          named: data.map((l) => ({ name: l.name, json: JSON.stringify(serializePhotoLibraries([l])) })),
        };
      },
      hasInlineImages: () => state.libraries.some((l) => l.albums.some((al) => al.photos.some((p) => p.url.startsWith('data:')))),
    },
  };

  const cur = () => DATASETS[TABS[state.tab].section];
  const canonical = (ds) => JSON.stringify(ds.toFile());

  function isDirty(ds = cur()) {
    if (ds.publishedJSON === null) return storage.get(ds.draftKey) !== null;
    return canonical(ds) !== ds.publishedJSON;
  }

  function persistDraft(ds = cur()) {
    const json = canonical(ds);
    if (ds.publishedJSON !== null && json === ds.publishedJSON) {
      storage.remove(ds.draftKey);
      ds.staleDraft = false;
      return;
    }
    const ok = storage.set(ds.draftKey, JSON.stringify({
      ...ds.draftFields(),
      savedAt: new Date().toISOString(),
      baseHash: ds.publishedJSON !== null ? hashString(ds.publishedJSON) : null,
      // true when the JSON file couldn't be loaded: the desktop app then only
      // falls back to this draft if it can't load the file either
      standalone: ds.publishedJSON === null,
    }));
    if (!ok) {
      toast(`Browser storage is full or blocked - publish or download ${ds.file} so you do not lose changes.`, 'error');
    }
  }

  function commit() {
    persistDraft();
    render();
  }

  // Undo snapshots remember which section they belong to
  function snapshot(ds = cur()) {
    return { ds, json: canonical(ds) };
  }

  function restore(snap) {
    snap.ds.data = snap.ds.parse(JSON.parse(snap.json));
    persistDraft(snap.ds);
    render();
  }

  /* ---------------------------------------------------------------- helpers */

  function allReleases() {
    const rows = [];
    state.artists.forEach((artist) => artist.albums.forEach((album) => rows.push({ artist, album })));
    return rows;
  }

  function allTracks() {
    const rows = [];
    state.artists.forEach((artist) =>
      artist.albums.forEach((album) =>
        album.tracks.forEach((track) => rows.push({ artist, album, track }))));
    return rows;
  }

  function countTracks(artist) {
    return artist.albums.reduce((n, album) => n + album.tracks.length, 0);
  }

  function totals(artists) {
    let albums = 0, tracks = 0;
    artists.forEach((a) => { albums += a.albums.length; a.albums.forEach((al) => { tracks += al.tracks.length; }); });
    return { artists: artists.length, albums, tracks };
  }

  function allPhotoAlbums() {
    const rows = [];
    state.libraries.forEach((library) => library.albums.forEach((album) => rows.push({ library, album })));
    return rows;
  }

  function allPhotos() {
    const rows = [];
    state.libraries.forEach((library) =>
      library.albums.forEach((album) =>
        album.photos.forEach((photo) => rows.push({ library, album, photo }))));
    return rows;
  }

  function countPhotos(library) {
    return library.albums.reduce((n, album) => n + album.photos.length, 0);
  }

  // Newest album's first photo
  function libraryCover(library) {
    const albums = [...library.albums].sort((a, b) => Number(b.year) - Number(a.year));
    const withPhotos = albums.find((al) => al.photos.length);
    return withPhotos ? withPhotos.photos[0].url : '';
  }

  const matches = (query, ...values) =>
    !query || values.some((v) => str(v).toLowerCase().includes(query));

  function parseDate(value) {
    const s = str(value).trim();
    if (!s) return '';
    const monthIndex = (name) => MONTHS.findIndex((m) => m.slice(0, 3).toLowerCase() === name.slice(0, 3).toLowerCase());
    const pad = (n) => String(n).padStart(2, '0');
    let m;
    if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) return s;
    if ((m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\.?,?\s+(\d{4})$/))) {
      const mi = monthIndex(m[2]);
      if (mi >= 0) return `${m[3]}-${pad(mi + 1)}-${pad(m[1])}`;
    }
    if ((m = s.match(/^([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/))) {
      const mi = monthIndex(m[1]);
      if (mi >= 0) return `${m[3]}-${pad(mi + 1)}-${pad(m[2])}`;
    }
    return '';
  }

  // "2025-08-01" → "1 August, 2025" (the format already used in music.json)
  function formatDate(iso) {
    const m = str(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return '';
    return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}, ${m[1]}`;
  }

  function formatDuration(seconds) {
    const total = Math.round(seconds);
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = String(total % 60).padStart(2, '0');
    return hrs ? `${hrs}:${String(mins).padStart(2, '0')}:${secs}` : `${mins}:${secs}`;
  }

  // Accepts "3:12", "03:12", "1:02:03" or plain seconds ("192")
  function normalizeLength(value) {
    const s = str(value).trim();
    if (!s) return { ok: true, value: '' };
    if (/^\d+$/.test(s)) return { ok: true, value: formatDuration(Number(s)) };
    if (/^\d{1,2}:[0-5]\d(:[0-5]\d)?$/.test(s)) return { ok: true, value: s };
    return { ok: false, value: s };
  }

  function looksLikeUrl(value) {
    const s = str(value).trim();
    if (!s) return false;
    if (s.startsWith('data:') || s.startsWith('../') || s.startsWith('./') || s.startsWith('/')) return true;
    try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
  }

  function apiEndpoint() {
    try { return new URL(state.apiUrl || DEFAULT_API, location.href).href; } catch { return DEFAULT_API; }
  }

  async function readJsonResponse(res) {
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { error: text.slice(0, 200) }; }
  }

  function download(filename, text) {
    const blob = new Blob([text], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: filename });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ------------------------------------------------------------ audio / img */

  const player = new Audio();
  player.preload = 'none';
  player.addEventListener('ended', () => setPlaying(null));
  player.addEventListener('error', () => {
    if (state.playingUrl) toast('Could not play that audio link.', 'error');
    setPlaying(null);
  });

  function setPlaying(url) {
    state.playingUrl = url;
    document.querySelectorAll('[data-play-url]').forEach((btn) => {
      const on = btn.dataset.playUrl === url && url !== null;
      btn.classList.toggle('is-playing', on);
      btn.replaceChildren(iconNode(on ? 'pause' : 'play'));
      btn.setAttribute('aria-label', on ? 'Pause preview' : 'Play preview');
    });
  }

  function togglePreview(url) {
    if (!looksLikeUrl(url)) { toast('Add an audio link first.', 'info'); return; }
    if (state.playingUrl === url && !player.paused) {
      player.pause();
      setPlaying(null);
      return;
    }
    player.src = url;
    setPlaying(url);
    player.play().catch(() => { toast('Could not play that audio link.', 'error'); setPlaying(null); });
  }

  function playButton(getUrl) {
    const initialUrl = typeof getUrl === 'function' ? '' : getUrl;
    const btn = h('button', {
      type: 'button',
      class: 'play-btn',
      'aria-label': 'Play preview',
      title: 'Preview',
      dataset: { playUrl: initialUrl },
      onClick: (e) => {
        e.stopPropagation();
        const url = typeof getUrl === 'function' ? getUrl() : getUrl;
        btn.dataset.playUrl = url;
        togglePreview(url);
      },
    }, iconNode(state.playingUrl && state.playingUrl === initialUrl ? 'pause' : 'play'));
    if (state.playingUrl && state.playingUrl === initialUrl) btn.classList.add('is-playing');
    return btn;
  }

  function detectDuration(url) {
    return new Promise((resolve, reject) => {
      const probe = new Audio();
      probe.preload = 'metadata';
      const done = () => {
        clearTimeout(timer);
        probe.onloadedmetadata = null;
        probe.onerror = null;
        probe.removeAttribute('src');
        probe.load();
      };
      const timer = setTimeout(() => { done(); reject(new Error('Timed out reading the audio file.')); }, 15000);
      probe.onloadedmetadata = () => {
        const d = probe.duration;
        done();
        if (Number.isFinite(d) && d > 0) resolve(formatDuration(d));
        else reject(new Error('That file does not report a length.'));
      };
      probe.onerror = () => { done(); reject(new Error('Could not load that audio link.')); };
      probe.src = url;
    });
  }

  async function resizeImage(file, maxSize, quality) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close && bitmap.close();
    let dataUrl = canvas.toDataURL('image/webp', quality);
    if (!dataUrl.startsWith('data:image/webp')) dataUrl = canvas.toDataURL('image/jpeg', quality);
    return dataUrl;
  }

  const dataUrlToBlob = (dataUrl) => fetch(dataUrl).then((r) => r.blob());

  // Returns { url, where: 'server' | 'local' }
  async function processImage(file, { localMax = 640, localQuality = 0.85 } = {}) {
    if (!file || !file.type.startsWith('image/')) throw new Error('That file is not an image.');

    if (state.apiKey) {
      try {
        let blob = file;
        let name = file.name || 'image';
        const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
        if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) {
          blob = await dataUrlToBlob(await resizeImage(file, 2000, 0.9));
          name = name.replace(/\.[^.]+$/, '') + (blob.type === 'image/webp' ? '.webp' : '.jpg');
        }
        const body = new FormData();
        body.append('file', blob, name);
        const res = await fetch(apiEndpoint(), {
          method: 'POST',
          headers: { Authorization: `Bearer ${state.apiKey}` },
          body,
        });
        const data = await readJsonResponse(res);
        if (!res.ok || !data.url) throw new Error(data.error || `Upload failed (${res.status}).`);
        return { url: data.url, where: 'server' };
      } catch (err) {
        toast(`Upload failed: ${err.message} Stored the image in this browser instead.`, 'error');
      }
    }

    return { url: await resizeImage(file, localMax, localQuality), where: 'local' };
  }

  /* ---------------------------------------------------------------- toasts */

  function toast(message, type = 'success', action) {
    const node = h('div', { class: `toast${type === 'error' ? ' is-error' : type === 'info' ? ' is-info' : ''}`, role: 'status' },
      iconNode(type === 'error' ? 'alert' : type === 'info' ? 'info' : 'check'),
      h('span', null, message),
      action && h('button', {
        type: 'button',
        class: 'btn btn-ghost',
        style: { color: '#9cc2ff', height: '1.5rem', padding: '0 0.375rem', marginLeft: '0.25rem' },
        onClick: () => { action.onClick(); node.remove(); },
      }, action.label));
    $('#toasts').append(node);
    setTimeout(() => node.remove(), action ? 7000 : type === 'error' ? 6500 : 3200);
    return node;
  }

  const toastUndo = (message, snap) =>
    toast(message, 'success', { label: 'Undo', onClick: () => { restore(snap); toast('Undone', 'info'); } });

  /* ---------------------------------------------------------------- render */

  const TABS = {
    artists: { section: 'music', title: 'Artists', icon: 'user', label: 'artist', plural: 'artists', add: 'Add artist', count: () => state.artists.length },
    albums: { section: 'music', title: 'Releases', icon: 'disc', label: 'release', plural: 'releases', add: 'Add release', count: () => allReleases().length },
    tracks: { section: 'music', title: 'Tracks', icon: 'note', label: 'track', plural: 'tracks', add: 'Add track', count: () => allTracks().length },
    libraries: { section: 'photos', title: 'Libraries', icon: 'folder', label: 'library', plural: 'libraries', add: 'Add library', count: () => state.libraries.length },
    photoAlbums: { section: 'photos', title: 'Albums', icon: 'stack', label: 'album', plural: 'albums', add: 'Add album', count: () => allPhotoAlbums().length },
    photos: { section: 'photos', title: 'Photos', icon: 'image', label: 'photo', plural: 'photos', add: 'Add photos', count: () => allPhotos().length },
  };

  function render() {
    const ds = cur();
    renderSectionSwitch();
    renderTabs();
    renderStatus();
    renderNotice();

    $('#base-title').textContent = ds.title;
    $('.base-icon').replaceChildren(iconNode(ds.key === 'music' ? 'music' : 'image'));
    $('#add-btn-label').textContent = TABS[state.tab].add;
    $('[data-action="download"] .menu-label').textContent = `Download ${ds.file}`;
    $('[data-action="import"] .menu-label').textContent = `Import a ${ds.file} file...`;
    $('[data-action="sort"] .menu-label').textContent = ds.key === 'music' ? 'Sort artists A → Z' : 'Sort libraries A → Z';

    renderGrid();
  }

  function renderSectionSwitch() {
    const section = TABS[state.tab].section;
    document.querySelectorAll('.section-switch [data-section]').forEach((btn) =>
      btn.setAttribute('aria-selected', String(btn.dataset.section === section)));
  }

  function renderTabs() {
    $('.table-tabs').replaceChildren(...cur().tabs.map((key) => {
      const t = TABS[key];
      const active = key === state.tab;
      return h('button', {
        type: 'button',
        class: 'table-tab',
        role: 'tab',
        'aria-selected': String(active),
        tabindex: active ? '0' : '-1',
        dataset: { tab: key },
        onClick: () => setTab(key),
      }, iconNode(t.icon), t.title, h('span', { class: 'tab-count' }, t.count()));
    }));
  }

  function renderStatus() {
    const ds = cur();
    const pill = $('#status');
    const text = $('#status-text');
    pill.classList.remove('is-dirty', 'is-offline');
    if (ds.publishedJSON === null && !isDirty(ds)) {
      pill.classList.add('is-offline');
      text.textContent = `${ds.file} not loaded`;
      pill.title = `Could not load ${ds.path}`;
    } else if (isDirty(ds)) {
      pill.classList.add('is-dirty');
      text.textContent = 'Unpublished changes';
      pill.title = `Saved in this browser. The ${ds.app} in this browser already shows them.`;
    } else {
      text.textContent = 'Up to date';
      pill.title = `Matches the published ${ds.path}`;
    }
  }

  function renderNotice() {
    const ds = cur();
    const notice = $('#notice');
    notice.replaceChildren();
    if (ds.loadError && ds.publishedJSON === null) {
      notice.append(iconNode('alert'), h('span', null,
        `Could not load ${ds.path}. Open this page through your web server (not as a file) to edit the live library. `,
        'You can still add records here and download the JSON.'));
      notice.hidden = false;
    } else if (ds.staleDraft && isDirty(ds)) {
      notice.append(iconNode('alert'),
        h('span', null, `${ds.path} changed on the server after you started these edits. Publishing will replace it.`),
        h('button', { type: 'button', class: 'btn btn-secondary', onClick: discardChanges }, 'Discard my changes'));
      notice.hidden = false;
    } else {
      notice.hidden = true;
    }
  }

  function headerCell(label, icon, cls) {
    return h('th', { class: cls || '', scope: 'col' },
      h('div', { class: 'th-inner' }, icon ? iconNode(icon) : null, label));
  }

  function thumb(src, round) {
    const wrap = h('span', { class: `thumb${round ? ' is-round' : ''}` });
    if (src) {
      const img = h('img', { src, alt: '', loading: 'lazy', decoding: 'async' });
      img.addEventListener('error', () => img.remove());
      wrap.append(img);
    }
    return wrap;
  }

  function chips(labels, max = 3) {
    const list = labels.filter(Boolean);
    const box = h('div', { class: 'chips' });
    list.slice(0, max).forEach((label) => box.append(h('span', { class: 'chip', title: label }, label)));
    if (list.length > max) box.append(h('span', { class: 'chip chip-more' }, `+${list.length - max}`));
    if (!list.length) box.append(h('span', { class: 'muted' }, '-'));
    return box;
  }

  function numCell(index, sortable, record, label) {
    if (state.selecting) {
      return h('td', { class: 'col-num' },
        h('div', { class: 'num-cell' },
          h('input', {
            type: 'checkbox',
            class: 'row-check',
            checked: state.selected.has(record),
            'aria-label': `Select ${label || 'record'}`,
            onClick: (e) => e.stopPropagation(),
            onChange: () => toggleSelected(record),
          })));
    }
    return h('td', { class: 'col-num' },
      h('div', { class: 'num-cell' },
        sortable ? h('span', { class: 'grip', title: 'Drag to reorder' }, iconNode('grip')) : null,
        h('span', { class: 'row-index' }, index + 1),
        h('span', { class: 'expand', 'aria-hidden': 'true' }, iconNode('expand'))));
  }

  /* ------------------------------------------------------------ selection */

  function toggleSelected(record) {
    if (state.selected.has(record)) state.selected.delete(record);
    else state.selected.add(record);
    renderGrid();
  }

  function setSelecting(on) {
    state.selecting = on;
    state.selected.clear();
    if (!on) document.querySelectorAll('[data-select-hint]').forEach((n) => n.remove());
    const btn = $('#select-btn');
    btn.setAttribute('aria-pressed', String(on));
    $('#select-btn-label').textContent = on ? 'Done' : 'Select';
    renderGrid();
  }

  // Drop selections whose records no longer exist (e.g. after undo / import)
  function pruneSelection() {
    const alive = new Set();
    state.artists.forEach((a) => {
      alive.add(a);
      a.albums.forEach((al) => { alive.add(al); al.tracks.forEach((t) => alive.add(t)); });
    });
    state.libraries.forEach((l) => {
      alive.add(l);
      l.albums.forEach((al) => { alive.add(al); al.photos.forEach((p) => alive.add(p)); });
    });
    [...state.selected].forEach((r) => { if (!alive.has(r)) state.selected.delete(r); });
  }

  function rowProps(record, open) {
    const selected = state.selecting && state.selected.has(record);
    return {
      class: selected ? 'is-selected' : null,
      'aria-selected': state.selecting ? String(selected) : null,
      onClick: () => (state.selecting ? toggleSelected(record) : open()),
    };
  }

  function selectAllHeader(records) {
    if (!state.selecting) return headerCell('', null, 'col-num');
    const picked = records.filter((r) => state.selected.has(r)).length;
    const box = h('input', {
      type: 'checkbox',
      class: 'row-check',
      checked: records.length > 0 && picked === records.length,
      'aria-label': 'Select all',
      onChange: () => {
        if (picked === records.length) records.forEach((r) => state.selected.delete(r));
        else records.forEach((r) => state.selected.add(r));
        renderGrid();
      },
    });
    box.indeterminate = picked > 0 && picked < records.length;
    return h('th', { class: 'col-num', scope: 'col' }, h('div', { class: 'num-cell' }, box));
  }

  function renderGrid() {
    pruneSelection();
    const q = state.query.trim().toLowerCase();
    const grid = $('#grid');
    const thead = grid.tHead;
    const tbody = grid.tBodies[0];
    const empty = $('#empty');
    let rows = [];
    let head = [];
    let buildRow;
    const sortable = (state.tab === 'artists' || state.tab === 'libraries') && !q && !state.selecting;

    if (state.tab === 'artists') {
      rows = state.artists
        .map((artist, index) => ({ artist, index }))
        .filter(({ artist }) => matches(q, artist.name, ...artist.albums.map((a) => a.title)));
      head = [
        selectAllHeader(rows.map((r) => r.artist)),
        headerCell('Photo', 'image', 'col-thumb'),
        headerCell('Name', 'text', 'col-primary'),
        headerCell('Releases', 'link', 'col-wide'),
        headerCell('Tracks', 'hash', 'col-narrow'),
        h('th', { class: 'col-fill', 'aria-hidden': 'true' }),
      ];
      buildRow = ({ artist, index }, i) => {
        const tr = h('tr', rowProps(artist, () => openArtistForm(artist)),
          numCell(i, sortable, artist, artist.name),
          h('td', { class: 'col-thumb' }, thumb(artist.image, true)),
          h('td', { class: 'col-primary' }, h('span', { class: 'cell-truncate' }, artist.name || h('span', { class: 'muted' }, 'Untitled'))),
          h('td', { class: 'col-wide' }, chips(artist.albums.map((a) => a.title))),
          h('td', { class: 'col-narrow mono' }, countTracks(artist)),
          h('td', { class: 'col-fill' }));
        if (sortable) makeDraggable(tr, index);
        return tr;
      };
    } else if (state.tab === 'albums') {
      rows = allReleases().filter(({ artist, album }) => matches(q, album.title, artist.name, album.date));
      head = [
        selectAllHeader(rows.map((r) => r.album)),
        headerCell('Cover', 'image', 'col-thumb'),
        headerCell('Title', 'text', 'col-primary'),
        headerCell('Artist', 'link', 'col-mid'),
        headerCell('Release date', 'calendar', 'col-mid'),
        headerCell('Tracks', 'hash', 'col-narrow'),
        h('th', { class: 'col-fill', 'aria-hidden': 'true' }),
      ];
      buildRow = ({ artist, album }, i) => h('tr', rowProps(album, () => openReleaseForm({ artist, album })),
        numCell(i, false, album, album.title),
        h('td', { class: 'col-thumb' }, thumb(album.cover)),
        h('td', { class: 'col-primary' }, h('span', { class: 'cell-truncate' }, album.title || h('span', { class: 'muted' }, 'Untitled'))),
        h('td', { class: 'col-mid' }, chips([artist.name], 1)),
        h('td', { class: 'col-mid' }, album.date || h('span', { class: 'muted' }, '-')),
        h('td', { class: 'col-narrow mono' }, album.tracks.length),
        h('td', { class: 'col-fill' }));
    } else if (state.tab === 'tracks') {
      rows = allTracks().filter(({ artist, album, track }) => matches(q, track.title, album.title, artist.name));
      head = [
        selectAllHeader(rows.map((r) => r.track)),
        headerCell('Title', 'text', 'col-primary'),
        headerCell('Artist', 'link', 'col-mid'),
        headerCell('Release', 'link', 'col-mid'),
        headerCell('Length', 'clock', 'col-narrow'),
        headerCell('Audio', 'audio', 'col-wide'),
        h('th', { class: 'col-fill', 'aria-hidden': 'true' }),
      ];
      buildRow = ({ artist, album, track }, i) => h('tr', rowProps(track, () => openTrackForm({ artist, album, track })),
        numCell(i, false, track, track.title),
        h('td', { class: 'col-primary' }, h('span', { class: 'cell-truncate' }, track.title || h('span', { class: 'muted' }, 'Untitled'))),
        h('td', { class: 'col-mid' }, chips([artist.name], 1)),
        h('td', { class: 'col-mid' }, chips([album.title], 1)),
        h('td', { class: 'col-narrow mono' }, track.length || h('span', { class: 'muted' }, '-')),
        h('td', { class: 'col-wide' },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '0.5rem' } },
            track.url ? playButton(track.url) : null,
            h('span', { class: 'cell-truncate muted', style: { maxWidth: '16rem' } }, track.url || '-'))),
        h('td', { class: 'col-fill' }));
    } else if (state.tab === 'libraries') {
      rows = state.libraries
        .map((library, index) => ({ library, index }))
        .filter(({ library }) => matches(q, library.name, ...library.albums.map((a) => a.title)));
      head = [
        selectAllHeader(rows.map((r) => r.library)),
        headerCell('Cover', 'image', 'col-thumb'),
        headerCell('Name', 'text', 'col-primary'),
        headerCell('Albums', 'link', 'col-wide'),
        headerCell('Photos', 'hash', 'col-narrow'),
        h('th', { class: 'col-fill', 'aria-hidden': 'true' }),
      ];
      buildRow = ({ library, index }, i) => {
        const tr = h('tr', rowProps(library, () => openPhotoLibraryForm(library)),
          numCell(i, sortable, library, library.name),
          h('td', { class: 'col-thumb' }, thumb(libraryCover(library))),
          h('td', { class: 'col-primary' }, h('span', { class: 'cell-truncate' }, library.name || h('span', { class: 'muted' }, 'Untitled'))),
          h('td', { class: 'col-wide' }, chips(library.albums.map((a) => `${a.title} · ${a.year}`))),
          h('td', { class: 'col-narrow mono' }, countPhotos(library)),
          h('td', { class: 'col-fill' }));
        if (sortable) makeDraggable(tr, index);
        return tr;
      };
    } else if (state.tab === 'photoAlbums') {
      rows = allPhotoAlbums().filter(({ library, album }) => matches(q, album.title, album.year, library.name));
      head = [
        selectAllHeader(rows.map((r) => r.album)),
        headerCell('Cover', 'image', 'col-thumb'),
        headerCell('Title', 'text', 'col-primary'),
        headerCell('Library', 'link', 'col-mid'),
        headerCell('Year', 'calendar', 'col-narrow'),
        headerCell('Photos', 'hash', 'col-narrow'),
        h('th', { class: 'col-fill', 'aria-hidden': 'true' }),
      ];
      buildRow = ({ library, album }, i) => h('tr', rowProps(album, () => openPhotoAlbumForm({ library, album })),
        numCell(i, false, album, album.title),
        h('td', { class: 'col-thumb' }, thumb(album.photos[0] ? album.photos[0].url : '')),
        h('td', { class: 'col-primary' }, h('span', { class: 'cell-truncate' }, album.title || h('span', { class: 'muted' }, 'Untitled'))),
        h('td', { class: 'col-mid' }, chips([library.name], 1)),
        h('td', { class: 'col-narrow mono' }, album.year || h('span', { class: 'muted' }, '-')),
        h('td', { class: 'col-narrow mono' }, album.photos.length),
        h('td', { class: 'col-fill' }));
    } else {
      rows = allPhotos().filter(({ library, album, photo }) => matches(q, album.title, album.year, library.name, photo.url));
      head = [
        selectAllHeader(rows.map((r) => r.photo)),
        headerCell('Photo', 'image', 'col-thumb'),
        headerCell('Album', 'link', 'col-primary'),
        headerCell('Library', 'link', 'col-mid'),
        headerCell('Year', 'calendar', 'col-narrow'),
        headerCell('Link', 'link', 'col-wide'),
        h('th', { class: 'col-fill', 'aria-hidden': 'true' }),
      ];
      buildRow = ({ library, album, photo }, i) => h('tr', rowProps(photo, () => openPhotoForm({ library, album, photo })),
        numCell(i, false, photo, `photo ${i + 1}`),
        h('td', { class: 'col-thumb' }, thumb(photo.url)),
        h('td', { class: 'col-primary' }, chips([album.title || 'Untitled'], 1)),
        h('td', { class: 'col-mid' }, chips([library.name], 1)),
        h('td', { class: 'col-narrow mono' }, album.year),
        h('td', { class: 'col-wide' }, h('span', { class: 'cell-truncate muted', style: { maxWidth: '20rem' } },
          photo.url.startsWith('data:') ? 'Stored in this browser' : photo.url)),
        h('td', { class: 'col-fill' }));
    }

    grid.classList.toggle('is-sortable', sortable);
    grid.classList.toggle('is-selecting', state.selecting);
    thead.replaceChildren(h('tr', null, head));
    tbody.replaceChildren(...rows.map(buildRow));

    // Airtable-style "+" row at the bottom (hidden while selecting)
    if (!state.selecting) {
      tbody.append(h('tr', { class: 'add-row', onClick: addRecord },
        h('td', { colspan: head.length },
          h('div', { class: 'add-row-inner' }, iconNode('plus'), TABS[state.tab].add))));
    }

    const noun = rows.length === 1 ? TABS[state.tab].label : TABS[state.tab].plural;
    $('#record-count').textContent = state.selecting
      ? `${state.selected.size} of ${rows.length} selected`
      : `${rows.length} ${noun}`;
    $('#record-count').classList.toggle('is-selecting', state.selecting);

    if (!rows.length) {
      empty.replaceChildren(
        h('strong', null, q ? 'No matching records' : `No ${TABS[state.tab].plural} yet`),
        h('span', null, q ? 'Try a different search.' : `Use "${TABS[state.tab].add}" to create the first one.`));
      empty.hidden = false;
    } else {
      empty.hidden = true;
    }
  }

  /* ------------------------------------------------------- drag to reorder */

  let dragIndex = null;

  function makeDraggable(tr, index) {
    tr.draggable = true;
    tr.addEventListener('dragstart', (e) => {
      dragIndex = index;
      tr.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    });
    tr.addEventListener('dragend', () => {
      dragIndex = null;
      document.querySelectorAll('.is-dragging, .is-drop-before, .is-drop-after')
        .forEach((n) => n.classList.remove('is-dragging', 'is-drop-before', 'is-drop-after'));
    });
    tr.addEventListener('dragover', (e) => {
      if (dragIndex === null) return;
      e.preventDefault();
      const rect = tr.getBoundingClientRect();
      const after = e.clientY > rect.top + rect.height / 2;
      tr.classList.toggle('is-drop-after', after);
      tr.classList.toggle('is-drop-before', !after);
    });
    tr.addEventListener('dragleave', () => tr.classList.remove('is-drop-before', 'is-drop-after'));
    tr.addEventListener('drop', (e) => {
      e.preventDefault();
      if (dragIndex === null) return;
      const after = tr.classList.contains('is-drop-after');
      let target = index + (after ? 1 : 0);
      const list = cur().data;
      const [moved] = list.splice(dragIndex, 1);
      if (dragIndex < target) target -= 1;
      list.splice(target, 0, moved);
      dragIndex = null;
      commit();
    });
  }

  /* ------------------------------------------------------------- dialogs */

  const recordDialog = $('#record-dialog');
  const confirmDialogEl = $('#confirm-dialog');

  function closeOnBackdrop(dialog) {
    let downOnBackdrop = false;
    dialog.addEventListener('mousedown', (e) => { downOnBackdrop = e.target === dialog; });
    dialog.addEventListener('click', (e) => {
      if (downOnBackdrop && e.target === dialog) dialog.close();
      downOnBackdrop = false;
    });
  }
  [recordDialog, confirmDialogEl, $('#settings-dialog')].forEach(closeOnBackdrop);

  function dialogShell({ eyebrowIcon, eyebrow, title, sub, body, footerStart, submitLabel = 'Save', onSubmit, dialog = recordDialog, titleId = 'record-title' }) {
    const submitBtn = h('button', { type: 'submit', class: 'btn btn-primary btn-lg' }, submitLabel);
    const form = h('form', { novalidate: true },
      h('div', { class: 'form-cover' }),
      h('div', { class: 'dialog-header' },
        h('div', { class: 'dialog-heading' },
          h('div', { class: 'eyebrow' }, iconNode(eyebrowIcon), eyebrow),
          h('h2', { class: 'dialog-title', id: titleId }, title),
          sub ? h('p', { class: 'dialog-sub' }, sub) : null),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close', onClick: () => dialog.close() }, iconNode('close'))),
      h('div', { class: 'dialog-body' }, body),
      h('div', { class: 'dialog-footer' },
        footerStart || null,
        h('div', { class: 'spacer' }),
        h('button', { type: 'button', class: 'btn btn-ghost btn-lg', onClick: () => dialog.close() }, 'Cancel'),
        submitBtn));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      try {
        const result = await onSubmit();
        if (result !== false) dialog.close();
      } finally {
        submitBtn.disabled = false;
      }
    });

    if (dialog.open) dialog.close();
    dialog.replaceChildren(form);
    dialog.showModal();
    const first = form.querySelector('.dialog-body input:not([type=hidden]):not([type=file]), .dialog-body select');
    if (first) first.focus();
    return { form, submitBtn };
  }

  // Airtable-style field wrapper
  function field({ label, icon, help, required, control, full = true }) {
    const id = `f-${Math.random().toString(36).slice(2, 9)}`;
    const errorText = h('span', null);
    const wrap = h('div', { class: 'field' },
      h('label', { class: 'field-label', for: id }, icon ? iconNode(icon) : null, label, required ? h('span', { class: 'req', 'aria-hidden': 'true' }, '*') : null),
      help ? h('p', { class: 'field-help' }, help) : null,
      control,
      h('div', { class: 'field-error', role: 'alert' }, iconNode('alert'), errorText));
    const focusable = control.matches && control.matches('input,select,textarea') ? control : control.querySelector('input:not([type=file]),select,textarea');
    if (focusable) {
      // clear the error as soon as the user fixes the field
      ['input', 'change'].forEach((ev) => focusable.addEventListener(ev, () => {
        if (wrap.classList.contains('has-error')) { wrap.classList.remove('has-error'); focusable.setAttribute('aria-invalid', 'false'); }
      }));
      focusable.id = focusable.id || id;
      if (focusable.id !== id) wrap.querySelector('label').setAttribute('for', focusable.id);
      if (required) focusable.setAttribute('aria-required', 'true');
    }
    if (!full) wrap.classList.add('is-half');
    return {
      node: wrap,
      setError(message) {
        wrap.classList.toggle('has-error', Boolean(message));
        errorText.textContent = message || '';
        if (focusable) focusable.setAttribute('aria-invalid', message ? 'true' : 'false');
      },
      focus() { focusable && focusable.focus(); },
    };
  }

  const textInput = (value, props = {}) =>
    h('input', { class: 'input', type: 'text', value: value || '', autocomplete: 'off', ...props });

  function imageInput({ value, round }) {
    let current = value || '';
    const previewImg = h('img', { alt: '', style: { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'cover' } });
    const preview = h('div', { class: `image-preview${round ? ' is-round' : ''}` }, iconNode('image'), h('div', { class: 'spinner' }));
    const meta = h('div', { class: 'image-meta' });
    const urlInput = textInput(current.startsWith('data:') ? '' : current, {
      placeholder: current.startsWith('data:') ? 'Image stored in this browser' : 'https://... or paste an image link',
      spellcheck: false,
    });
    const fileInput = h('input', { type: 'file', accept: 'image/*', hidden: true });

    previewImg.addEventListener('error', () => { previewImg.remove(); preview.classList.remove('has-image'); });

    function setPreview(url) {
      current = url;
      if (url) {
        previewImg.src = url;
        if (!previewImg.isConnected) preview.prepend(previewImg);
        preview.classList.add('has-image');
      } else {
        previewImg.remove();
        preview.classList.remove('has-image');
      }
    }

    function describe(where) {
      if (where === 'server') meta.textContent = 'Uploaded to your server.';
      else if (where === 'local') meta.textContent = state.apiKey
        ? 'Stored in this browser.'
        : 'Resized and stored in this browser. Add an API key in Settings to upload images to your server.';
      else meta.textContent = '';
    }

    async function handleFile(file) {
      if (!file) return;
      preview.classList.add('is-busy');
      try {
        const result = await processImage(file);
        setPreview(result.url);
        urlInput.value = result.where === 'server' ? result.url : '';
        urlInput.placeholder = result.where === 'local' ? 'Image stored in this browser' : 'https://... or paste an image link';
        describe(result.where);
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        preview.classList.remove('is-busy');
        fileInput.value = '';
      }
    }

    const dropzone = h('div', {
      class: 'dropzone',
      role: 'button',
      tabindex: '0',
      onClick: () => fileInput.click(),
      onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } },
      onDragover: (e) => { e.preventDefault(); dropzone.classList.add('is-over'); },
      onDragleave: () => dropzone.classList.remove('is-over'),
      onDrop: (e) => { e.preventDefault(); dropzone.classList.remove('is-over'); handleFile(e.dataTransfer.files[0]); },
    }, iconNode('upload'), h('span', null, 'Drop an image here, or ', h('strong', null, 'browse')));

    fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));
    urlInput.addEventListener('input', () => {
      const v = urlInput.value.trim();
      urlInput.placeholder = 'https://... or paste an image link';
      describe(null);
      setPreview(v);
    });
    // allow pasting an image straight from the clipboard
    urlInput.addEventListener('paste', (e) => {
      const file = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith('image/'));
      if (file) { e.preventDefault(); handleFile(file); }
    });

    setPreview(current);
    if (current.startsWith('data:')) describe('local');

    const node = h('div', { class: 'image-field' }, preview, h('div', null, dropzone, urlInput, fileInput, meta));
    return {
      node,
      get value() { return current.trim(); },
      get busy() { return preview.classList.contains('is-busy'); },
    };
  }

  function dateInput(value) {
    const iso = parseDate(value);
    const input = h('input', { class: 'input', type: 'date', value: iso });
    return {
      node: input,
      // keep the original text if it couldn't be parsed and wasn't touched
      get value() {
        if (!input.value) return iso || !value ? '' : value;
        return input.value === iso ? (value || formatDate(iso)) : formatDate(input.value);
      },
    };
  }

  function artistSelect(selected, { placeholder = 'Choose an artist...' } = {}) {
    const select = h('select', { class: 'select' },
      h('option', { value: '' }, placeholder),
      state.artists.map((a, i) => h('option', { value: String(i), selected: a === selected }, a.name || `Untitled artist ${i + 1}`)));
    return select;
  }

  function lengthControl(initial, getUrl) {
    const input = textInput(initial, { placeholder: '3:12', inputmode: 'numeric', class: 'input mono' });
    const btn = h('button', { type: 'button', class: 'btn btn-secondary' }, iconNode('clock'), 'Detect');
    async function detect(silent) {
      const url = getUrl();
      if (!looksLikeUrl(url)) { if (!silent) toast('Add the audio link first.', 'info'); return; }
      btn.disabled = true;
      try { input.value = await detectDuration(url); } catch (err) { if (!silent) toast(err.message, 'error'); }
      finally { btn.disabled = false; }
    }
    btn.addEventListener('click', () => detect(false));
    return { node: h('div', { class: 'input-row' }, input, btn), input, detect: () => detect(true) };
  }

  function confirmDialog({ eyebrow = 'Confirm', icon = 'alert', title, body, confirmLabel = 'Confirm', danger = false, onConfirm, extraAction }) {
    return new Promise((resolve) => {
      const alertBox = h('div', { class: 'alert', hidden: true });
      let settled = false;
      const settle = (v) => { if (!settled) { settled = true; resolve(v); } };

      const { submitBtn } = dialogShell({
        dialog: confirmDialogEl,
        titleId: 'confirm-title',
        eyebrowIcon: icon,
        eyebrow,
        title,
        body: [body, alertBox],
        submitLabel: confirmLabel,
        onSubmit: async () => {
          if (!onConfirm) { settle(true); return true; }
          alertBox.hidden = true;
          try {
            await onConfirm();
            settle(true);
            return true;
          } catch (err) {
            alertBox.replaceChildren(iconNode('alert'), h('div', null,
              h('div', null, err.message),
              extraAction ? h('button', {
                type: 'button', class: 'btn btn-secondary', style: { marginTop: '0.5rem' },
                onClick: () => { extraAction.onClick(); },
              }, extraAction.label) : null));
            alertBox.hidden = false;
            return false;
          }
        },
      });
      if (danger) { submitBtn.classList.remove('btn-primary'); submitBtn.style.background = 'var(--danger)'; submitBtn.style.color = '#fff'; }
      confirmDialogEl.addEventListener('close', () => settle(false), { once: true });
    });
  }

  /* ---------------------------------------------------------- artist form */

  function openArtistForm(artist) {
    const isNew = !artist;
    const data = artist || { name: '', image: '', albums: [] };

    const nameInput = textInput(data.name, { placeholder: 'e.g. Sample Artist' });
    const nameField = field({ label: 'Name', icon: 'text', required: true, control: nameInput });
    const photo = imageInput({ value: data.image, round: true });
    const photoField = field({ label: 'Photo', icon: 'image', help: 'Square images look best, shown in a circle.', control: photo.node });

    let releasesField = null;
    if (!isNew) {
      const list = h('div', { class: 'release-list' },
        data.albums.map((album) => h('button', {
          type: 'button', class: 'chip', title: 'Open release',
          onClick: () => { if (save()) openReleaseForm({ artist: data, album }); },
        }, album.title || 'Untitled')),
        h('button', {
          type: 'button', class: 'btn btn-secondary', style: { height: '1.375rem', padding: '0 0.5rem', fontSize: '0.75rem' },
          onClick: () => { if (save()) openReleaseForm({ artist: data }); },
        }, iconNode('plus'), 'Add release'));
      releasesField = field({ label: 'Releases', icon: 'link', help: `${data.albums.length} release${data.albums.length === 1 ? '' : 's'} · ${countTracks(data)} tracks`, control: list });
    }

    function save() {
      const name = nameInput.value.trim();
      nameField.setError(null);
      if (!name) { nameField.setError('This field is required.'); nameField.focus(); return false; }
      const dupe = state.artists.find((a) => a !== artist && a.name.trim().toLowerCase() === name.toLowerCase());
      if (dupe) { nameField.setError(`An artist named "${dupe.name}" already exists.`); nameField.focus(); return false; }
      if (photo.busy) { toast('Wait for the image to finish uploading.', 'info'); return false; }

      data.name = name;
      data.image = photo.value;
      if (isNew) state.artists.push(data);
      commit();
      toast(isNew ? `Added ${name}` : `Saved ${name}`);
      return true;
    }

    dialogShell({
      eyebrowIcon: 'user',
      eyebrow: isNew ? 'New artist' : 'Artist',
      title: isNew ? 'Add an artist' : data.name || 'Untitled artist',
      sub: isNew ? 'Artists show up in the Music app\'s list. Add releases and tracks after saving.' : null,
      body: [nameField.node, photoField.node, releasesField && releasesField.node],
      submitLabel: isNew ? 'Add artist' : 'Save',
      onSubmit: save,
    });
  }

  /* --------------------------------------------------------- release form */

  function openReleaseForm({ artist, album } = {}) {
    if (!state.artists.length) {
      toast('Add an artist first.', 'info');
      openArtistForm();
      return;
    }
    const isNew = !album;
    const data = album || { title: '', cover: '', date: '', tracks: [] };

    const artistSel = artistSelect(artist || (state.artists.length === 1 ? state.artists[0] : null));
    const artistField = field({ label: 'Artist', icon: 'link', required: true, control: artistSel });

    const titleInput = textInput(data.title, { placeholder: 'e.g. Night Drive EP' });
    const titleField = field({ label: 'Title', icon: 'text', required: true, control: titleInput });

    const cover = imageInput({ value: data.cover });
    const coverField = field({ label: 'Cover art', icon: 'image', control: cover.node });

    const date = dateInput(data.date);
    const dateField = field({ label: 'Release date', icon: 'calendar', help: 'Shown like "1 August, 2025".', control: date.node });

    const editor = trackEditor(data.tracks);
    const tracksField = field({
      label: 'Tracks', icon: 'note',
      help: 'Double-clicking a track in the Music app plays it. Leave a row empty to skip it.',
      control: editor.node,
    });

    function save() {
      [artistField, titleField, tracksField].forEach((f) => f.setError(null));
      let valid = true;
      const owner = state.artists[Number(artistSel.value)];
      if (!artistSel.value || !owner) { artistField.setError('Choose who released this.'); valid = false; }
      const title = titleInput.value.trim();
      if (!title) { titleField.setError('This field is required.'); valid = false; }
      const tracks = editor.collect();
      if (tracks.error) { tracksField.setError(tracks.error); valid = false; }
      if (cover.busy) { toast('Wait for the image to finish uploading.', 'info'); return false; }
      if (!valid) {
        const firstErr = recordDialog.querySelector('.has-error input, .has-error select, .track-row .is-invalid');
        firstErr && firstErr.focus();
        return false;
      }

      data.title = title;
      data.cover = cover.value;
      data.date = date.value;
      data.tracks = tracks.list;

      if (isNew) {
        owner.albums.push(data);
      } else if (artist && owner !== artist) {
        artist.albums = artist.albums.filter((a) => a !== data);
        owner.albums.push(data);
      }
      commit();
      toast(isNew ? `Added ${title}` : `Saved ${title}`);
      return true;
    }

    dialogShell({
      eyebrowIcon: 'disc',
      eyebrow: isNew ? 'New release' : 'Release',
      title: isNew ? 'Add a release' : data.title || 'Untitled release',
      sub: isNew ? 'An album, EP or single, with its tracks.' : (artist ? `by ${artist.name}` : null),
      body: [artistField.node, titleField.node, coverField.node, dateField.node, tracksField.node],
      submitLabel: isNew ? 'Add release' : 'Save',
      onSubmit: save,
    });
  }

  function trackEditor(initialTracks) {
    const rowsBox = h('div');
    const addBtn = h('button', { type: 'button', class: 'track-add', onClick: () => { const r = addRow(); r.title.focus(); } }, iconNode('plus'), 'Add track');
    const head = h('div', { class: 'track-row is-head', 'aria-hidden': 'true' },
      h('span', null, '#'), h('span', null, 'Title'), h('span', { class: 'track-url-head' }, 'Audio link'), h('span', null, 'Length'), h('span'));
    const node = h('div', { class: 'track-editor' }, head, rowsBox, addBtn);
    const rows = [];

    function renumber() {
      rows.forEach((r, i) => { r.num.textContent = i + 1; });
      head.hidden = rows.length === 0;
    }

    function addRow(track = { title: '', url: '', length: '' }) {
      const row = {};
      row.num = h('span', { class: 'track-num' });
      row.title = textInput(track.title, { placeholder: 'Track title', 'aria-label': 'Track title' });
      row.url = textInput(track.url, { placeholder: 'https://...mp3', spellcheck: false, 'aria-label': 'Audio link', class: 'input track-url' });
      row.length = textInput(track.length, { placeholder: '0:00', 'aria-label': 'Length', class: 'input mono' });
      const move = (delta) => {
        const i = rows.indexOf(row);
        const j = i + delta;
        if (j < 0 || j >= rows.length) return;
        rows.splice(i, 1);
        rows.splice(j, 0, row);
        rowsBox.replaceChildren(...rows.map((r) => r.node));
        renumber();
      };
      row.node = h('div', { class: 'track-row' },
        row.num, row.title, row.url, row.length,
        h('div', { class: 'track-actions' },
          playButton(() => row.url.value.trim()),
          h('button', { type: 'button', class: 'icon-btn icon-btn-sm', 'aria-label': 'Move up', title: 'Move up', onClick: () => move(-1) }, iconNode('up')),
          h('button', { type: 'button', class: 'icon-btn icon-btn-sm', 'aria-label': 'Move down', title: 'Move down', onClick: () => move(1) }, iconNode('down')),
          h('button', {
            type: 'button', class: 'icon-btn icon-btn-sm', 'aria-label': 'Remove track', title: 'Remove',
            onClick: () => { rows.splice(rows.indexOf(row), 1); row.node.remove(); renumber(); },
          }, iconNode('trash'))));

      // fill in the length automatically when a link is added
      row.url.addEventListener('change', async () => {
        const url = row.url.value.trim();
        if (!row.length.value.trim() && looksLikeUrl(url)) {
          row.length.placeholder = '...';
          try { row.length.value = await detectDuration(url); } catch { /* user can type it */ }
          row.length.placeholder = '0:00';
        }
      });

      rows.push(row);
      rowsBox.append(row.node);
      renumber();
      return row;
    }

    initialTracks.forEach((t) => addRow(t));
    if (!initialTracks.length) addRow();
    renumber();

    return {
      node,
      collect() {
        const list = [];
        let error = null;
        rows.forEach((r, i) => {
          [r.title, r.url, r.length].forEach((inp) => inp.classList.remove('is-invalid'));
          r.node.classList.remove('has-error');
          const title = r.title.value.trim();
          const url = r.url.value.trim();
          const len = normalizeLength(r.length.value);
          if (!title && !url && !len.value) return; // empty row - skip
          const fail = (inp, msg) => { inp.classList.add('is-invalid'); r.node.classList.add('has-error'); error = error || `Track ${i + 1}: ${msg}`; };
          if (!title) fail(r.title, 'add a title.');
          if (!url) fail(r.url, 'add an audio link.');
          else if (!looksLikeUrl(url)) fail(r.url, 'the audio link should start with https://');
          if (!len.ok) fail(r.length, 'length should look like 3:12.');
          list.push({ title, url, length: len.value });
        });
        return { list, error };
      },
    };
  }

  /* ----------------------------------------------------------- track form */

  function openTrackForm({ artist, album, track } = {}) {
    if (!state.artists.length) {
      toast('Add an artist first.', 'info');
      openArtistForm();
      return;
    }
    const isNew = !track;
    const data = track || { title: '', url: '', length: '' };

    const titleInput = textInput(data.title, { placeholder: 'e.g. City Lights' });
    const titleField = field({ label: 'Title', icon: 'text', required: true, control: titleInput });

    const artistSel = artistSelect(artist || (state.artists.length === 1 ? state.artists[0] : null));
    const artistField = field({ label: 'Artist', icon: 'user', required: true, control: artistSel });

    const releaseSel = h('select', { class: 'select' });
    const releaseField = field({ label: 'Release', icon: 'disc', required: true, control: releaseSel });

    const singleCover = imageInput({ value: '' });
    const singleDate = dateInput('');
    const singleBox = h('div', { hidden: true },
      h('div', { class: 'inline-note', style: { marginTop: '0.75rem' } }, iconNode('info'),
        h('span', null, 'A new single will be created using the track title.')),
      field({ label: 'Single cover art', icon: 'image', control: singleCover.node }).node,
      field({ label: 'Release date', icon: 'calendar', control: singleDate.node }).node);

    function fillReleases(preferred) {
      const owner = state.artists[Number(artistSel.value)];
      const albums = owner ? owner.albums : [];
      releaseSel.replaceChildren();
      appendChildren(releaseSel, [
        h('option', { value: '' }, owner ? 'Choose a release...' : 'Choose an artist first'),
        albums.map((al, i) => h('option', { value: String(i), selected: al === preferred }, al.title || `Untitled release ${i + 1}`)),
        owner ? h('option', { value: NEW_SINGLE, selected: !preferred && albums.length === 0 }, '＋ New single') : null]);
      releaseSel.disabled = !owner;
      singleBox.hidden = releaseSel.value !== NEW_SINGLE;
    }
    artistSel.addEventListener('change', () => fillReleases(null));
    releaseSel.addEventListener('change', () => { singleBox.hidden = releaseSel.value !== NEW_SINGLE; });
    fillReleases(album);
    releaseField.node.append(singleBox);

    const urlInput = textInput(data.url, { placeholder: 'https://... or ../apps/music/sample/track.mp3', spellcheck: false });
    const urlField = field({
      label: 'Audio link', icon: 'audio', required: true,
      help: 'A direct link to an audio file (.mp3, .m4a, .ogg...). Upload the file to your site or an audio host and paste the link here.',
      control: h('div', { class: 'input-row' }, urlInput,
        h('button', {
          type: 'button', class: 'btn btn-secondary',
          onClick: () => togglePreview(urlInput.value.trim()),
        }, iconNode('play'), 'Preview')),
    });

    const length = lengthControl(data.length, () => urlInput.value.trim());
    const lengthField = field({ label: 'Length', icon: 'clock', help: 'Filled in automatically from the audio link when possible.', control: length.node });

    urlInput.addEventListener('change', () => {
      if (!length.input.value.trim() && looksLikeUrl(urlInput.value)) length.detect();
    });

    function save() {
      [titleField, artistField, releaseField, urlField, lengthField].forEach((f) => f.setError(null));
      let valid = true;
      const title = titleInput.value.trim();
      if (!title) { titleField.setError('This field is required.'); valid = false; }
      const owner = state.artists[Number(artistSel.value)];
      if (!owner) { artistField.setError('Choose an artist.'); valid = false; }
      const releaseValue = releaseSel.value;
      if (owner && !releaseValue) { releaseField.setError('Choose a release, or create a new single.'); valid = false; }
      const url = urlInput.value.trim();
      if (!url) { urlField.setError('This field is required.'); valid = false; }
      else if (!looksLikeUrl(url)) { urlField.setError('Links should start with https://'); valid = false; }
      const len = normalizeLength(length.input.value);
      if (!len.ok) { lengthField.setError('Use minutes and seconds, like 3:12.'); valid = false; }
      if (singleCover.busy) { toast('Wait for the image to finish uploading.', 'info'); return false; }
      if (!valid) {
        const firstErr = recordDialog.querySelector('.has-error input, .has-error select');
        firstErr && firstErr.focus();
        return false;
      }

      data.title = title;
      data.url = url;
      data.length = len.value;

      let target;
      if (releaseValue === NEW_SINGLE) {
        target = { title, cover: singleCover.value, date: singleDate.value, tracks: [] };
        owner.albums.push(target);
      } else {
        target = owner.albums[Number(releaseValue)];
      }

      if (isNew) {
        target.tracks.push(data);
      } else if (album && target !== album) {
        album.tracks = album.tracks.filter((t) => t !== data);
        target.tracks.push(data);
      }
      commit();
      toast(isNew ? `Added ${title}` : `Saved ${title}`);
      return true;
    }

    dialogShell({
      eyebrowIcon: 'note',
      eyebrow: isNew ? 'New track' : 'Track',
      title: isNew ? 'Add a track' : data.title || 'Untitled track',
      sub: isNew ? 'Add a song to an existing release, or make it a new single.' : (artist && album ? `${artist.name} · ${album.title}` : null),
      body: [titleField.node, artistField.node, releaseField.node, urlField.node, lengthField.node],
      submitLabel: isNew ? 'Add track' : 'Save',
      onSubmit: save,
    });
  }

  /* ====================================================== PHOTOS SECTION */

  const PHOTO_IMAGE_OPTIONS = { localMax: 1600, localQuality: 0.82 };

  function librarySelect(selected, { placeholder = 'Choose a library...' } = {}) {
    return h('select', { class: 'select' },
      h('option', { value: '' }, placeholder),
      state.libraries.map((l, i) => h('option', { value: String(i), selected: l === selected }, l.name || `Untitled library ${i + 1}`)));
  }

  const isYear = (value) => /^\d{4}$/.test(str(value).trim());

  // Multi-photo picker: tiles you can reorder/remove + drop zone + "add by link"
  function photoListInput(initial) {
    const items = initial.slice();          // [{ url }] - existing objects keep their identity
    let busy = 0;
    const tiles = h('div', { class: 'photo-tiles' });
    const meta = h('div', { class: 'image-meta' });
    const fileInput = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
    const linkInput = textInput('', { placeholder: 'https://... or ../media/... - paste a photo link', spellcheck: false });

    function updateMeta() {
      if (busy) { meta.textContent = `Adding photos... ${busy} left`; return; }
      const local = items.filter((p) => p.url.startsWith('data:')).length;
      meta.textContent = !items.length ? 'No photos yet.'
        : `${items.length} photo${items.length === 1 ? '' : 's'}${local ? ` · ${local} stored in this browser${state.apiKey ? '' : ' (add an API key in Settings to upload to your server)'}` : ''}`;
    }

    function renderTiles() {
      tiles.replaceChildren(...items.map((item, i) => {
        const img = h('img', { src: item.url, alt: '', loading: 'lazy' });
        img.addEventListener('error', () => img.remove());
        const move = (delta) => {
          const j = i + delta;
          if (j < 0 || j >= items.length) return;
          [items[i], items[j]] = [items[j], items[i]];
          renderTiles();
        };
        return h('div', { class: 'photo-tile' },
          img,
          h('span', { class: 'photo-tile-num' }, i + 1),
          h('div', { class: 'photo-tile-actions' },
            h('button', { type: 'button', 'aria-label': 'Move earlier', title: 'Move earlier', onClick: () => move(-1) }, iconNode('left')),
            h('button', { type: 'button', 'aria-label': 'Remove photo', title: 'Remove', onClick: () => { items.splice(i, 1); renderTiles(); } }, iconNode('trash')),
            h('button', { type: 'button', 'aria-label': 'Move later', title: 'Move later', onClick: () => move(1) }, iconNode('right'))));
      }));
      tiles.hidden = !items.length;
      updateMeta();
    }

    async function addFiles(fileList) {
      const files = [...fileList].filter((f) => f.type.startsWith('image/'));
      if (!files.length) { toast('Those files are not images.', 'error'); return; }
      busy += files.length;
      updateMeta();
      for (const file of files) {           // one at a time keeps the order you picked
        try {
          const result = await processImage(file, PHOTO_IMAGE_OPTIONS);
          items.push({ url: result.url });
        } catch (err) {
          toast(err.message, 'error');
        } finally {
          busy -= 1;
          renderTiles();
        }
      }
      fileInput.value = '';
    }

    function addLink() {
      const url = linkInput.value.trim();
      if (!url) return;
      if (!looksLikeUrl(url)) { toast('Photo links should start with https:// or ../', 'error'); return; }
      items.push({ url });
      linkInput.value = '';
      renderTiles();
    }

    const dropzone = h('div', {
      class: 'dropzone',
      role: 'button',
      tabindex: '0',
      onClick: () => fileInput.click(),
      onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } },
      onDragover: (e) => { e.preventDefault(); dropzone.classList.add('is-over'); },
      onDragleave: () => dropzone.classList.remove('is-over'),
      onDrop: (e) => { e.preventDefault(); dropzone.classList.remove('is-over'); addFiles(e.dataTransfer.files); },
    }, iconNode('upload'), h('span', null, 'Drop photos here, or ', h('strong', null, 'browse'), ' - pick as many as you like'));

    fileInput.addEventListener('change', () => addFiles(fileInput.files));
    linkInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } });
    linkInput.addEventListener('paste', (e) => {
      const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
      if (files.length) { e.preventDefault(); addFiles(files); }
    });

    renderTiles();

    return {
      node: h('div', null, tiles, dropzone,
        h('div', { class: 'input-row' }, linkInput, h('button', { type: 'button', class: 'btn btn-secondary', onClick: addLink }, iconNode('plus'), 'Add link')),
        meta, fileInput),
      get value() { return items.slice(); },
      get busy() { return busy > 0; },
    };
  }

  /* ------------------------------------------------------ library form */

  function openPhotoLibraryForm(library) {
    const isNew = !library;
    const data = library || { name: '', albums: [] };

    const nameInput = textInput(data.name, { placeholder: 'e.g. Sample Library' });
    const nameField = field({ label: 'Name', icon: 'text', required: true, control: nameInput,
      help: 'Shown in the Photos app\'s list. Its cover is the newest album\'s first photo.' });

    let albumsField = null;
    if (!isNew) {
      const sorted = [...data.albums].sort((a, b) => Number(b.year) - Number(a.year));
      const list = h('div', { class: 'release-list' },
        sorted.map((album) => h('button', {
          type: 'button', class: 'chip', title: 'Open album',
          onClick: () => { if (save()) openPhotoAlbumForm({ library: data, album }); },
        }, `${album.title || 'Untitled'} · ${album.year}`)),
        h('button', {
          type: 'button', class: 'btn btn-secondary', style: { height: '1.375rem', padding: '0 0.5rem', fontSize: '0.75rem' },
          onClick: () => { if (save()) openPhotoAlbumForm({ library: data }); },
        }, iconNode('plus'), 'Add album'));
      albumsField = field({ label: 'Albums', icon: 'link', help: `${data.albums.length} album${data.albums.length === 1 ? '' : 's'} · ${countPhotos(data)} photos`, control: list });
    }

    function save() {
      const name = nameInput.value.trim();
      nameField.setError(null);
      if (!name) { nameField.setError('This field is required.'); nameField.focus(); return false; }
      const dupe = state.libraries.find((l) => l !== library && l.name.trim().toLowerCase() === name.toLowerCase());
      if (dupe) { nameField.setError(`A library named "${dupe.name}" already exists.`); nameField.focus(); return false; }
      data.name = name;
      if (isNew) state.libraries.push(data);
      commit();
      toast(isNew ? `Added ${name}` : `Saved ${name}`);
      return true;
    }

    dialogShell({
      eyebrowIcon: 'folder',
      eyebrow: isNew ? 'New library' : 'Photo library',
      title: isNew ? 'Add a photo library' : data.name || 'Untitled library',
      sub: isNew ? 'A library groups albums by year - e.g. one per artist or project. Add albums after saving.' : null,
      body: [nameField.node, albumsField && albumsField.node],
      submitLabel: isNew ? 'Add library' : 'Save',
      onSubmit: save,
    });
  }

  /* -------------------------------------------------------- album form */

  function openPhotoAlbumForm({ library, album } = {}) {
    if (!state.libraries.length) {
      toast('Add a photo library first.', 'info');
      openPhotoLibraryForm();
      return;
    }
    const isNew = !album;
    const data = album || { title: '', year: String(new Date().getFullYear()), photos: [] };

    const librarySel = librarySelect(library || (state.libraries.length === 1 ? state.libraries[0] : null));
    const libraryField = field({ label: 'Library', icon: 'folder', required: true, control: librarySel });

    const titleInput = textInput(data.title, { placeholder: 'e.g. Studio Session' });
    const titleField = field({ label: 'Title', icon: 'text', required: true, control: titleInput });

    const yearInput = textInput(data.year, { placeholder: '2024', inputmode: 'numeric', maxlength: '4', class: 'input mono' });
    const yearField = field({ label: 'Year', icon: 'calendar', required: true, control: yearInput,
      help: 'Albums are grouped under this year in the Photos app, newest first.' });

    const photos = photoListInput(data.photos);
    const photosField = field({ label: 'Photos', icon: 'image', control: photos.node,
      help: 'The first photo is the album cover. Hover a photo to move or remove it.' });

    function save() {
      [libraryField, titleField, yearField].forEach((f) => f.setError(null));
      let valid = true;
      const owner = state.libraries[Number(librarySel.value)];
      if (!librarySel.value || !owner) { libraryField.setError('Choose a library.'); valid = false; }
      const title = titleInput.value.trim();
      if (!title) { titleField.setError('This field is required.'); valid = false; }
      const year = yearInput.value.trim();
      if (!isYear(year)) { yearField.setError('Use a four-digit year, like 2024.'); valid = false; }
      if (valid && owner.albums.some((a) => a !== album && a.title.toLowerCase() === title.toLowerCase() && a.year === year)) {
        titleField.setError(`${owner.name} already has an album called "${title}" in ${year}.`);
        valid = false;
      }
      if (photos.busy) { toast('Wait for the photos to finish adding.', 'info'); return false; }
      if (!valid) {
        const firstErr = recordDialog.querySelector('.has-error input, .has-error select');
        firstErr && firstErr.focus();
        return false;
      }

      data.title = title;
      data.year = year;
      data.photos = photos.value;

      if (isNew) {
        owner.albums.push(data);
      } else if (library && owner !== library) {
        library.albums = library.albums.filter((a) => a !== data);
        owner.albums.push(data);
      }
      commit();
      toast(isNew ? `Added ${title}` : `Saved ${title}`);
      return true;
    }

    dialogShell({
      eyebrowIcon: 'stack',
      eyebrow: isNew ? 'New album' : 'Photo album',
      title: isNew ? 'Add a photo album' : data.title || 'Untitled album',
      sub: isNew ? 'A set of photos, like a shoot, a cover or a social post.' : (library ? `${library.name} · ${data.year}` : null),
      body: [libraryField.node, titleField.node, yearField.node, photosField.node],
      submitLabel: isNew ? 'Add album' : 'Save',
      onSubmit: save,
    });
  }

  /* -------------------------------------------------------- photo form */

  function openPhotoForm({ library, album, photo } = {}) {
    if (!state.libraries.length) {
      toast('Add a photo library first.', 'info');
      openPhotoLibraryForm();
      return;
    }
    const isNew = !photo;

    const librarySel = librarySelect(library || (state.libraries.length === 1 ? state.libraries[0] : null));
    const libraryField = field({ label: 'Library', icon: 'folder', required: true, control: librarySel });

    const albumSel = h('select', { class: 'select' });
    const albumField = field({ label: 'Album', icon: 'stack', required: true, control: albumSel });

    const newTitle = textInput('', { placeholder: 'Album title' });
    const newYear = textInput(String(new Date().getFullYear()), { placeholder: '2024', inputmode: 'numeric', maxlength: '4', class: 'input mono' });
    const newTitleField = field({ label: 'New album title', icon: 'text', required: true, control: newTitle });
    const newYearField = field({ label: 'Year', icon: 'calendar', required: true, control: newYear });
    const newAlbumBox = h('div', { hidden: true }, newTitleField.node, newYearField.node);

    function fillAlbums(preferred) {
      const owner = state.libraries[Number(librarySel.value)];
      const albums = owner ? owner.albums : [];
      albumSel.replaceChildren();
      appendChildren(albumSel, [
        h('option', { value: '' }, owner ? 'Choose an album...' : 'Choose a library first'),
        albums.map((al, i) => h('option', { value: String(i), selected: al === preferred }, `${al.title || 'Untitled'} (${al.year})`)),
        owner ? h('option', { value: NEW_ALBUM, selected: !preferred && albums.length === 0 }, '＋ New album') : null]);
      albumSel.disabled = !owner;
      newAlbumBox.hidden = albumSel.value !== NEW_ALBUM;
    }
    librarySel.addEventListener('change', () => fillAlbums(null));
    albumSel.addEventListener('change', () => { newAlbumBox.hidden = albumSel.value !== NEW_ALBUM; });
    fillAlbums(album);
    albumField.node.append(newAlbumBox);

    // New: add several photos at once. Existing: replace/move this one photo.
    const picker = isNew ? photoListInput([]) : null;
    const single = isNew ? null : imageInput({ value: photo.url });
    const photoField = field({
      label: isNew ? 'Photos' : 'Photo', icon: 'image', required: true,
      control: isNew ? picker.node : single.node,
      help: isNew ? 'They\'re added to the end of the album, in this order.' : null,
    });

    function save() {
      [libraryField, albumField, newTitleField, newYearField, photoField].forEach((f) => f.setError(null));
      let valid = true;
      const owner = state.libraries[Number(librarySel.value)];
      if (!owner) { libraryField.setError('Choose a library.'); valid = false; }
      const albumValue = albumSel.value;
      if (owner && !albumValue) { albumField.setError('Choose an album, or create a new one.'); valid = false; }
      if (albumValue === NEW_ALBUM) {
        if (!newTitle.value.trim()) { newTitleField.setError('This field is required.'); valid = false; }
        if (!isYear(newYear.value)) { newYearField.setError('Use a four-digit year, like 2024.'); valid = false; }
        if (owner && owner.albums.some((a) => a.title.toLowerCase() === newTitle.value.trim().toLowerCase() && a.year === newYear.value.trim())) {
          newTitleField.setError('That album already exists - pick it from the list instead.'); valid = false;
        }
      }
      if ((picker && picker.busy) || (single && single.busy)) { toast('Wait for the photos to finish adding.', 'info'); return false; }
      const urls = isNew ? picker.value : (single.value ? [{ url: single.value }] : []);
      if (!urls.length) { photoField.setError(isNew ? 'Add at least one photo.' : 'Add a photo or remove this record.'); valid = false; }
      if (!valid) {
        const firstErr = recordDialog.querySelector('.has-error input, .has-error select');
        firstErr && firstErr.focus();
        return false;
      }

      let target;
      if (albumValue === NEW_ALBUM) {
        target = { title: newTitle.value.trim(), year: newYear.value.trim(), photos: [] };
        owner.albums.push(target);
      } else {
        target = owner.albums[Number(albumValue)];
      }

      if (isNew) {
        target.photos.push(...urls);
        commit();
        toast(`Added ${plural(urls.length, 'photo')} to ${target.title}`);
      } else {
        photo.url = urls[0].url;
        if (target !== album) {
          album.photos = album.photos.filter((p) => p !== photo);
          target.photos.push(photo);
        }
        commit();
        toast('Saved photo');
      }
      return true;
    }

    dialogShell({
      eyebrowIcon: 'image',
      eyebrow: isNew ? 'New photos' : 'Photo',
      title: isNew ? 'Add photos' : 'Edit photo',
      sub: isNew ? 'Upload photos or paste links, then choose where they go.' : (library && album ? `${library.name} · ${album.title} (${album.year})` : null),
      body: [photoField.node, libraryField.node, albumField.node],
      submitLabel: isNew ? 'Add photos' : 'Save',
      onSubmit: save,
    });
  }

  /* --------------------------------------------------- delete (More menu) */

  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  async function deleteSelected() {
    const picked = state.selected;
    let title, detail, apply, doneLabel;
    const named = (list, getName, noun, nounPlural) => (list.length === 1
      ? getName(list[0]) || `this ${noun}`
      : `${list.length} ${nounPlural}`);

    if (state.tab === 'artists') {
      const artists = state.artists.filter((a) => picked.has(a));
      if (!artists.length) return;
      const releases = artists.reduce((n, a) => n + a.albums.length, 0);
      const tracks = artists.reduce((n, a) => n + countTracks(a), 0);
      title = `Delete ${named(artists, (a) => a.name, 'artist', 'artists')}?`;
      detail = releases ? `This also removes ${plural(releases, 'release')} and ${plural(tracks, 'track')}.` : 'None of them have releases.';
      apply = () => { state.artists = state.artists.filter((a) => !picked.has(a)); };
      doneLabel = `Deleted ${named(artists, (a) => a.name, 'artist', 'artists')}`;
    } else if (state.tab === 'albums') {
      const releases = allReleases().filter(({ album }) => picked.has(album));
      if (!releases.length) return;
      const tracks = releases.reduce((n, r) => n + r.album.tracks.length, 0);
      title = `Delete ${named(releases, (r) => r.album.title, 'release', 'releases')}?`;
      detail = `This also removes ${plural(tracks, 'track')}. The artists stay.`;
      apply = () => state.artists.forEach((a) => { a.albums = a.albums.filter((al) => !picked.has(al)); });
      doneLabel = `Deleted ${named(releases, (r) => r.album.title, 'release', 'releases')}`;
    } else if (state.tab === 'tracks') {
      const tracks = allTracks().filter(({ track }) => picked.has(track));
      if (!tracks.length) return;
      title = `Delete ${named(tracks, (t) => t.track.title, 'track', 'tracks')}?`;
      detail = 'Their releases stay; only the tracks are removed.';
      apply = () => state.artists.forEach((a) => a.albums.forEach((al) => { al.tracks = al.tracks.filter((t) => !picked.has(t)); }));
      doneLabel = `Deleted ${named(tracks, (t) => t.track.title, 'track', 'tracks')}`;
    } else if (state.tab === 'libraries') {
      const libraries = state.libraries.filter((l) => picked.has(l));
      if (!libraries.length) return;
      const albums = libraries.reduce((n, l) => n + l.albums.length, 0);
      const photos = libraries.reduce((n, l) => n + countPhotos(l), 0);
      title = `Delete ${named(libraries, (l) => l.name, 'library', 'libraries')}?`;
      detail = albums ? `This also removes ${plural(albums, 'album')} and ${plural(photos, 'photo')}.` : 'None of them have albums.';
      apply = () => { state.libraries = state.libraries.filter((l) => !picked.has(l)); };
      doneLabel = `Deleted ${named(libraries, (l) => l.name, 'library', 'libraries')}`;
    } else if (state.tab === 'photoAlbums') {
      const albums = allPhotoAlbums().filter(({ album }) => picked.has(album));
      if (!albums.length) return;
      const photos = albums.reduce((n, r) => n + r.album.photos.length, 0);
      title = `Delete ${named(albums, (r) => r.album.title, 'album', 'albums')}?`;
      detail = `This also removes ${plural(photos, 'photo')}. The libraries stay.`;
      apply = () => state.libraries.forEach((l) => { l.albums = l.albums.filter((al) => !picked.has(al)); });
      doneLabel = `Deleted ${named(albums, (r) => r.album.title, 'album', 'albums')}`;
    } else {
      const photos = allPhotos().filter(({ photo }) => picked.has(photo));
      if (!photos.length) return;
      title = `Delete ${plural(photos.length, 'photo')}?`;
      detail = 'Their albums stay; only the photos are removed. Uploaded image files stay on your server.';
      apply = () => state.libraries.forEach((l) => l.albums.forEach((al) => { al.photos = al.photos.filter((p) => !picked.has(p)); }));
      doneLabel = `Deleted ${plural(photos.length, 'photo')}`;
    }

    const ok = await confirmDialog({
      eyebrow: 'Delete', icon: 'trash', title,
      body: h('p', { class: 'dialog-sub', style: { marginTop: 0 } }, detail, ' You can undo this right after.'),
      confirmLabel: 'Delete', danger: true,
    });
    if (!ok) return;
    const snap = snapshot();
    apply();
    persistDraft();
    setSelecting(false);
    render();
    toastUndo(doneLabel, snap);
  }

  function addRecord() {
    const open = {
      artists: () => openArtistForm(),
      albums: () => openReleaseForm(),
      tracks: () => openTrackForm(),
      libraries: () => openPhotoLibraryForm(),
      photoAlbums: () => openPhotoAlbumForm(),
      photos: () => openPhotoForm(),
    };
    open[state.tab]();
  }

  /* ------------------------------------------------------------- publish */

  function changeSummary(ds) {
    let before = [];
    try { before = ds.publishedJSON ? ds.parse(JSON.parse(ds.publishedJSON)) : []; } catch { before = []; }
    const a = ds.summary(before);
    const b = ds.summary(ds.data);
    const delta = (x, y) => {
      const d = y - x;
      return d === 0 ? h('span', { class: 'muted' }, `${y}`) :
        h('span', { class: d > 0 ? 'delta-up' : 'delta-down' }, `${y} (${d > 0 ? '+' : ''}${d})`);
    };

    const beforeByName = new Map(a.named.map((x) => [x.name, x.json]));
    const afterNames = new Set(b.named.map((x) => x.name));
    const added = b.named.filter((x) => !beforeByName.has(x.name)).map((x) => x.name);
    const removed = a.named.filter((x) => !afterNames.has(x.name)).map((x) => x.name);
    const edited = b.named.filter((x) => beforeByName.has(x.name) && beforeByName.get(x.name) !== x.json).map((x) => x.name);

    const describe = (label, names) => names.length
      ? h('li', null, h('span', null, label), h('span', { class: 'cell-truncate', style: { maxWidth: '16rem', textAlign: 'right' }, title: names.join(', ') }, names.join(', ')))
      : null;

    return h('div', null,
      h('p', { class: 'dialog-sub', style: { marginTop: 0 } },
        `This replaces ${ds.path} on your server, so everyone visiting the site sees it. The old file is kept as apps/${ds.key}/${ds.key}.backup.json.`),
      h('ul', { class: 'summary-list' },
        b.rows.map(([label, value], i) => h('li', null, h('span', null, label), delta(a.rows[i][1], value))),
        describe('Added', added),
        describe('Edited', edited),
        describe('Removed', removed)));
  }

  async function publish() {
    const ds = cur();
    if (!state.apiKey) {
      openSettings();
      toast(`Add your API key to publish - or use More → Download ${ds.file}.`, 'info');
      return;
    }
    if (ds.publishedJSON !== null && !isDirty(ds)) {
      toast('Nothing to publish - everything is up to date.', 'info');
      return;
    }

    const body = changeSummary(ds);
    if (ds.hasInlineImages()) {
      body.append(h('div', { class: 'inline-note', style: { marginTop: '0.75rem' } }, iconNode('info'),
        h('span', null, `Some images are stored inline (added without an API key). They'll work, but make ${ds.file} bigger. Re-upload them to keep the file small.`)));
    }

    const endpoint = new URL(apiEndpoint());
    endpoint.searchParams.set('target', ds.key);

    const published = await confirmDialog({
      eyebrow: `Publish ${ds.key}`,
      icon: 'upload',
      title: 'Publish your changes?',
      body,
      confirmLabel: 'Publish',
      extraAction: { label: `Download ${ds.file} instead`, onClick: downloadJSON },
      onConfirm: async () => {
        const payload = JSON.stringify(ds.toFile(), null, 2);
        let res;
        try {
          res = await fetch(endpoint.href, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.apiKey}` },
            body: payload,
          });
        } catch {
          throw new Error(`Could not reach the API. If your site has no PHP (e.g. GitHub Pages), download ${ds.file} and replace ${ds.path} by hand.`);
        }
        const data = await readJsonResponse(res);
        if (res.status === 401) throw new Error('The API key was rejected. Check it in Settings.');
        if (res.status === 404 || res.status === 405) throw new Error(`No API found at ${apiEndpoint()}. Check the endpoint in Settings, or download ${ds.file} instead.`);
        if (!res.ok || !data.success) throw new Error(data.error || `Publishing failed (${res.status}).`);
        if (data.target !== ds.key) throw new Error('Your server\'s api/upload.php is out of date and may have saved this to the wrong file. Upload the new api/upload.php, then publish again.');
      },
    });

    if (published) {
      ds.publishedJSON = canonical(ds);
      ds.loadError = null;
      ds.staleDraft = false;
      storage.remove(ds.draftKey);
      render();
      toast(`Published - ${ds.path} is updated.`);
    }
  }

  function downloadJSON() {
    const ds = cur();
    download(ds.file, JSON.stringify(ds.toFile(), null, 2) + '\n');
    toast(`Downloaded ${ds.file} - replace ${ds.path} with it.`, 'info');
  }

  async function discardChanges() {
    const ds = cur();
    if (ds.publishedJSON === null) {
      const ok = await confirmDialog({
        eyebrow: 'Discard', icon: 'undo', title: 'Clear the local library?',
        body: h('p', { class: 'dialog-sub', style: { marginTop: 0 } }, `${ds.path} could not be loaded, so this empties the library stored in this browser.`),
        confirmLabel: 'Clear', danger: true,
      });
      if (!ok) return;
      const snap = snapshot(ds);
      ds.data = [];
      storage.remove(ds.draftKey);
      render();
      toastUndo('Cleared local library', snap);
      return;
    }
    if (!isDirty(ds)) { toast('No unpublished changes.', 'info'); return; }
    const ok = await confirmDialog({
      eyebrow: 'Discard', icon: 'undo', title: 'Discard unpublished changes?',
      body: h('p', { class: 'dialog-sub', style: { marginTop: 0 } }, `Your library goes back to the published ${ds.path}. The ${ds.app} in this browser will show the published version again.`),
      confirmLabel: 'Discard changes', danger: true,
    });
    if (!ok) return;
    const snap = snapshot(ds);
    ds.data = ds.parse(JSON.parse(ds.publishedJSON));
    ds.staleDraft = false;
    storage.remove(ds.draftKey);
    render();
    toastUndo('Changes discarded', snap);
  }

  function importFile(file) {
    const ds = cur();
    const reader = new FileReader();
    reader.onload = async () => {
      let data;
      try { data = ds.parse(JSON.parse(reader.result)); } catch (err) {
        toast(`That file is not a valid ${ds.file}: ${err.message}`, 'error');
        return;
      }
      const rows = ds.summary(data).rows.map(([label, n]) => `${n} ${label.toLowerCase()}`);
      const ok = await confirmDialog({
        eyebrow: 'Import', icon: 'file', title: `Replace the ${ds.key} library with ${file.name}?`,
        body: h('p', { class: 'dialog-sub', style: { marginTop: 0 } },
          `It has ${rows.slice(0, -1).join(', ')} and ${rows[rows.length - 1]}. Nothing is published until you press Publish.`),
        confirmLabel: 'Import',
      });
      if (!ok) return;
      const snap = snapshot(ds);
      ds.data = data;
      persistDraft(ds);
      render();
      toastUndo('Imported library', snap);
    };
    reader.readAsText(file);
  }

  /* ------------------------------------------------------------ settings */

  function loadSettings() {
    try {
      const s = JSON.parse(storage.get(KEYS.settings) || '{}');
      state.apiUrl = s.apiUrl || DEFAULT_API;
    } catch { state.apiUrl = DEFAULT_API; }
    const remembered = storage.get(KEYS.apiKey);
    state.rememberKey = remembered !== null;
    state.apiKey = remembered || storage.get(KEYS.apiKey, true) || '';
  }

  function openSettings() {
    const dialog = $('#settings-dialog');
    $('#api-url').value = state.apiUrl === DEFAULT_API ? '' : state.apiUrl;
    $('#api-key').value = state.apiKey;
    $('#api-key').type = 'password';
    $('#toggle-key').textContent = 'Show';
    $('#remember-key').checked = state.rememberKey;
    dialog.showModal();
    (state.apiKey ? $('#api-url') : $('#api-key')).focus();
  }

  function bindSettings() {
    const dialog = $('#settings-dialog');
    dialog.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dialog.close()));
    $('#toggle-key').addEventListener('click', () => {
      const input = $('#api-key');
      input.type = input.type === 'password' ? 'text' : 'password';
      $('#toggle-key').textContent = input.type === 'password' ? 'Show' : 'Hide';
    });
    $('#settings-form').addEventListener('submit', (e) => {
      e.preventDefault();
      state.apiUrl = $('#api-url').value.trim() || DEFAULT_API;
      state.apiKey = $('#api-key').value.trim();
      state.rememberKey = $('#remember-key').checked;
      storage.set(KEYS.settings, JSON.stringify({ apiUrl: state.apiUrl }));
      storage.remove(KEYS.apiKey);
      storage.remove(KEYS.apiKey, true);
      if (state.apiKey) storage.set(KEYS.apiKey, state.apiKey, !state.rememberKey);
      dialog.close();
      toast(state.apiKey ? 'Settings saved. Publish and image uploads will use your server.' : 'Settings saved. Changes stay in this browser.', 'success');
    });
  }

  /* ---------------------------------------------------------- chrome UI */

  function setTab(tab) {
    if (!TABS[tab]) return;
    if (state.tab !== tab) {
      state.selected.clear();
      if (TABS[state.tab].section !== TABS[tab].section && state.selecting) setSelecting(false);
    }
    state.tab = tab;
    state.lastTab[TABS[tab].section] = tab;
    history.replaceState(null, '', `#${tab}`);
    render();
    $('#grid-scroll').scrollTop = 0;
  }

  function setSection(section) {
    if (!DATASETS[section]) return;
    if (player && state.playingUrl) { player.pause(); setPlaying(null); }
    setTab(state.lastTab[section]);
  }

  function bindChrome() {
    document.querySelectorAll('.section-switch [data-section]').forEach((btn) =>
      btn.addEventListener('click', () => setSection(btn.dataset.section)));

    $('.table-tabs').addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const tabs = cur().tabs;
      const i = tabs.indexOf(state.tab);
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      setTab(next);
      const btn = document.querySelector(`.table-tab[data-tab="${next}"]`);
      btn && btn.focus();
    });

    const search = $('#search');
    search.addEventListener('input', () => { state.query = search.value; renderGrid(); });

    $('#add-btn').addEventListener('click', addRecord);
    $('#publish-btn').addEventListener('click', publish);
    $('#settings-btn').addEventListener('click', openSettings);

    const moreBtn = $('#more-btn');
    const menu = $('#more-menu');
    const closeMenu = () => { menu.hidden = true; moreBtn.setAttribute('aria-expanded', 'false'); };
    function refreshDeleteItem() {
      const item = menu.querySelector('[data-action="delete"]');
      const label = item.querySelector('.menu-label');
      const n = state.selected.size;
      const word = n === 1 ? TABS[state.tab].label : TABS[state.tab].plural;
      if (!state.selecting) label.textContent = `Delete ${TABS[state.tab].plural}...`;
      else if (n === 0) label.textContent = `Delete selected ${TABS[state.tab].plural}`;
      else label.textContent = `Delete ${n} ${word}`;
      item.disabled = state.selecting && n === 0;
      item.title = item.disabled ? 'Tick some rows first' : '';
    }

    $('#select-btn').addEventListener('click', () => setSelecting(!state.selecting));

    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      refreshDeleteItem();
      menu.hidden = !menu.hidden;
      moreBtn.setAttribute('aria-expanded', String(!menu.hidden));
      if (!menu.hidden) menu.querySelector('button:not(:disabled)').focus();
    });
    document.addEventListener('click', (e) => { if (!menu.contains(e.target)) closeMenu(); });
    menu.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenu(); moreBtn.focus(); } });
    menu.addEventListener('click', (e) => {
      const item = e.target.closest('[data-action]');
      if (!item) return;
      closeMenu();
      const action = item.dataset.action;
      if (action === 'download') downloadJSON();
      if (action === 'import') $('#import-input').click();
      if (action === 'discard') discardChanges();
      if (action === 'delete') {
        if (!state.selecting) {
          setSelecting(true);
          toast(`Tick the ${TABS[state.tab].plural} to delete, then choose More → Delete.`, 'info').dataset.selectHint = '';
        } else {
          deleteSelected();
        }
      }
      if (action === 'sort') {
        const ds = cur();
        const snap = snapshot(ds);
        ds.data.sort((x, y) => x.name.localeCompare(y.name, undefined, { sensitivity: 'base', numeric: true }));
        commit();
        setTab(ds.tabs[0]);
        toastUndo(ds.key === 'music' ? 'Sorted artists A → Z' : 'Sorted libraries A → Z', snap);
      }
    });

    $('#import-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) importFile(file);
      e.target.value = '';
    });

    // "/" focuses search (like Airtable / GitHub), Esc leaves Select mode
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.selecting && menu.hidden && !document.querySelector('dialog[open]')) {
        setSelecting(false);
        return;
      }
      if (e.key === '/' && !e.target.closest('input, textarea, select, dialog')) {
        e.preventDefault();
        search.focus();
      }
    });

    // stop audio preview when a dialog closes
    [recordDialog, confirmDialogEl].forEach((d) => d.addEventListener('close', () => {
      if (d === recordDialog && state.playingUrl) { player.pause(); setPlaying(null); }
    }));

    // stay in sync if a library is edited in another tab
    window.addEventListener('storage', (e) => {
      const ds = Object.values(DATASETS).find((d) => d.draftKey === e.key);
      if (!ds || recordDialog.open) return;
      try {
        const fromDraft = ds.readDraft(JSON.parse(e.newValue));
        ds.data = fromDraft || (ds.publishedJSON ? ds.parse(JSON.parse(ds.publishedJSON)) : ds.data);
        render();
      } catch { /* ignore */ }
    });
  }

  /* ---------------------------------------------------------------- init */

  async function loadDataset(ds) {
    let published = null;
    try {
      const res = await fetch(ds.dataUrl, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      published = ds.parse(await res.json());
      ds.data = published;
      ds.publishedJSON = canonical(ds);
    } catch (err) {
      ds.loadError = err;
    }

    let draft = null;
    try { draft = JSON.parse(storage.get(ds.draftKey)); } catch { draft = null; }

    let fromDraft = null;
    try { fromDraft = ds.readDraft(draft); } catch { fromDraft = null; }

    if (fromDraft) {
      ds.data = fromDraft;
      if (ds.publishedJSON !== null && canonical(ds) === ds.publishedJSON) {
        storage.remove(ds.draftKey);            // draft is identical to the published file
      } else {
        ds.staleDraft = Boolean(ds.publishedJSON !== null && draft.baseHash && draft.baseHash !== hashString(ds.publishedJSON));
      }
    } else {
      ds.data = published || [];
    }
  }

  async function init() {
    hydrateIcons(document);
    loadSettings();
    bindSettings();
    bindChrome();

    const hashTab = location.hash.slice(1);
    if (TABS[hashTab]) {
      state.tab = hashTab;
      state.lastTab[TABS[hashTab].section] = hashTab;
    }
    renderSectionSwitch();
    renderTabs();

    await Promise.all(Object.values(DATASETS).map(loadDataset));
    render();
  }

  init();
})();
