/* ==========================================================================
   Photos - phone layout
   --------------------------------------------------------------------------
   A grid of libraries → a grid of that library's albums → the album's photos
   → a full-screen viewer you can swipe through. Reads the same
   apps/photos/photos.json (or unpublished editor changes) as the desktop app.
   ========================================================================== */

Desktop.mobileApp('photos', ({ body, url }) => {
  const DRAFT_KEY = 'deskkit.photos.draft';
  const $ = (selector) => body.querySelector(selector);
  if (!$('.mp')) {
    throw new Error('mobile.html did not load properly - check apps/photos/mobile.html is uploaded next to mobile.js');
  }

  const pages = {
    libraries: $('[data-page="libraries"]'),
    albums: $('[data-page="albums"]'),
    grid: $('[data-page="grid"]'),
  };
  const order = ['libraries', 'albums', 'grid'];
  let currentPage = 'libraries';

  const viewer = $('.mp-viewer');
  const track = $('.mp-viewer-track');

  let data = {};
  let libraryName = '';
  let photos = [];
  let photoIndex = 0;

  /* ---------------------------------------------------------- helpers */

  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[ch]);

  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  // [{ year, title, photos }] newest year first
  function albumsOf(library) {
    return Object.keys(library || {})
      .sort((a, b) => Number(b) - Number(a))
      .flatMap((year) => Object.entries(library[year] || {}).map(([title, list]) => ({
        year, title, photos: Array.isArray(list) ? list : [],
      })));
  }

  // One tile in a grid of libraries or albums: cover image, name, subtitle
  function tile(cover, title, subtitle, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mp-card';
    button.setAttribute('role', 'listitem');
    button.innerHTML = `
      <span class="mp-card-cover">${cover ? `<img src="${escapeHTML(cover)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>
      <span class="mp-card-title">${escapeHTML(title)}</span>
      <span class="mp-card-sub">${escapeHTML(subtitle)}</span>`;
    button.addEventListener('click', onClick);
    return button;
  }

  /* ------------------------------------------------------- page stack */

  function goTo(name) {
    if (name === currentPage) return;
    const from = pages[currentPage];
    const to = pages[name];
    const forward = order.indexOf(name) > order.indexOf(currentPage);
    currentPage = name;

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

  body.querySelectorAll('[data-back]').forEach((btn) =>
    btn.addEventListener('click', () => goTo(btn.dataset.back)));

  // swipe from the left edge to go back
  let edge = null;
  [pages.albums, pages.grid].forEach((page) => {
    page.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      edge = t.clientX < 24 ? { x: t.clientX, y: t.clientY } : null;
    }, { passive: true });
    page.addEventListener('touchend', (e) => {
      if (!edge) return;
      const t = e.changedTouches[0];
      if (t.clientX - edge.x > 70 && Math.abs(t.clientY - edge.y) < 60) {
        goTo(order[order.indexOf(currentPage) - 1]);
      }
      edge = null;
    });
  });

  /* ------------------------------------------------------------ lists */

  function renderLibraries() {
    const list = $('.mp-libraries');
    const names = Object.keys(data);
    if (!names.length) {
      list.innerHTML = '<div class="mp-empty">No photos yet.</div>';
      return;
    }
    list.replaceChildren(...names.map((name) => {
      const albums = albumsOf(data[name]);
      const count = albums.reduce((n, a) => n + a.photos.length, 0);
      const cover = (albums.find((a) => a.photos.length) || { photos: [] }).photos[0];
      return tile(cover, name, `${plural(albums.length, 'album')} \u00b7 ${plural(count, 'photo')}`,
        () => openLibrary(name));
    }));
  }

  function openLibrary(name) {
    libraryName = name;
    $('.mp-library-name').textContent = name;
    $('.mp-back-label').textContent = name;

    const list = $('.mp-albums');
    const albums = albumsOf(data[name]);
    if (!albums.length) {
      list.innerHTML = '<div class="mp-empty">No albums yet.</div>';
    } else {
      list.replaceChildren(...albums.map((album) => tile(
        album.photos[0], album.title, `${album.year} \u00b7 ${plural(album.photos.length, 'photo')}`,
        () => openAlbum(album),
      )));
    }

    list.parentElement.scrollTop = 0;
    goTo('albums');
  }

  function openAlbum(album) {
    photos = album.photos;
    $('.mp-album-name').textContent = album.title;
    const grid = $('.mp-grid');
    grid.replaceChildren(...photos.map((src, i) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'mp-tile';
      tile.setAttribute('aria-label', `Photo ${i + 1}`);
      tile.innerHTML = `<img src="${escapeHTML(src)}" alt="" loading="lazy">`;
      tile.addEventListener('click', () => openViewer(i));
      return tile;
    }));
    $('.mp-count').textContent = photos.length ? plural(photos.length, 'photo') : 'This album is empty.';
    grid.parentElement.scrollTop = 0;
    goTo('grid');
  }

  /* ----------------------------------------------------------- viewer */

  function openViewer(i) {
    track.replaceChildren(...photos.map((src) => {
      const slide = document.createElement('div');
      slide.className = 'mp-slide';
      slide.innerHTML = `<img src="${escapeHTML(src)}" alt="" draggable="false">`;
      return slide;
    }));
    viewer.hidden = false;
    viewer.classList.remove('is-chrome-hidden');
    void viewer.offsetWidth;
    viewer.classList.add('is-open');
    show(i, false);
  }

  function closeViewer() {
    viewer.classList.remove('is-open');
    setTimeout(() => { if (!viewer.classList.contains('is-open')) viewer.hidden = true; }, 220);
  }

  function show(i, animate = true) {
    photoIndex = Math.max(0, Math.min(photos.length - 1, i));
    track.classList.toggle('is-animating', animate);
    track.style.transform = `translate3d(${-photoIndex * 100}%, 0, 0)`;
    $('.mp-viewer-counter').textContent = `${photoIndex + 1} of ${photos.length}`;
    const link = $('.mp-viewer-download');
    link.href = photos[photoIndex];
    link.setAttribute('download', String(photos[photoIndex]).split('/').pop());
  }

  // swipe left/right to change photo, down to close, tap to hide the bar
  let touch = null;
  viewer.addEventListener('touchstart', (e) => {
    if (e.target.closest('.mp-viewer-bar')) return;
    const t = e.touches[0];
    touch = { x: t.clientX, y: t.clientY, dx: 0, dy: 0, time: Date.now() };
    track.classList.remove('is-animating');
  }, { passive: true });

  viewer.addEventListener('touchmove', (e) => {
    if (!touch) return;
    const t = e.touches[0];
    touch.dx = t.clientX - touch.x;
    touch.dy = t.clientY - touch.y;
    if (Math.abs(touch.dx) > Math.abs(touch.dy)) {
      const edgeResist = (photoIndex === 0 && touch.dx > 0) || (photoIndex === photos.length - 1 && touch.dx < 0) ? 0.35 : 1;
      track.style.transform = `translate3d(calc(${-photoIndex * 100}% + ${touch.dx * edgeResist}px), 0, 0)`;
    }
  }, { passive: true });

  viewer.addEventListener('touchend', () => {
    if (!touch) return;
    const { dx, dy, time } = touch;
    touch = null;
    const width = viewer.clientWidth;
    if (Math.abs(dx) > Math.abs(dy) && (Math.abs(dx) > width * 0.2 || (Math.abs(dx) > 40 && Date.now() - time < 250))) {
      show(photoIndex + (dx < 0 ? 1 : -1));
    } else if (dy > 120 && Math.abs(dy) > Math.abs(dx)) {
      closeViewer();
    } else {
      show(photoIndex);
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) viewer.classList.toggle('is-chrome-hidden');
    }
  });

  $('.mp-viewer-close').addEventListener('click', closeViewer);
  document.addEventListener('keydown', (e) => {
    if (viewer.hidden) return;
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowRight') show(photoIndex + 1);
    if (e.key === 'ArrowLeft') show(photoIndex - 1);
  });

  /* ------------------------------------------------------------ start */

  function readDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
      if (draft && draft.data && typeof draft.data === 'object') return draft;
    } catch (err) { /* storage blocked */ }
    return null;
  }

  function load() {
    const draft = readDraft();
    if (draft && !draft.standalone) return Promise.resolve(draft.data);
    const fromFile = fetch(url('photos.json'), { cache: 'no-cache' }).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });
    return draft ? fromFile.catch(() => draft.data) : fromFile;
  }

  function refresh() {
    return load()
      .then((json) => {
        data = json && typeof json === 'object' ? json : {};
        renderLibraries();
      })
      .catch((err) => {
        console.error('Could not load photo libraries:', err);
        $('.mp-libraries').innerHTML = '<div class="mp-empty">Could not load photos.</div>';
      });
  }

  window.addEventListener('storage', (e) => { if (e.key === DRAFT_KEY) refresh(); });
  return refresh();
});
