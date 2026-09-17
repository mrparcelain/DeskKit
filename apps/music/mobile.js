/* ==========================================================================
   Music - phone layout
   --------------------------------------------------------------------------
   Artists → one artist's releases → Now Playing. Reads the same
   apps/music/music.json (or unpublished editor changes) as the desktop app.
   Lock-screen / headphone controls work through the Media Session API.
   ========================================================================== */

Desktop.mobileApp('music', ({ body, url, onModeChange }) => {
  const DRAFT_KEY = 'deskkit.music.draft';
  const $ = (selector) => body.querySelector(selector);
  if (!$('.mm')) {
    throw new Error('mobile.html did not load properly - check apps/music/mobile.html is uploaded next to mobile.js');
  }
  const $$ = (selector) => [...body.querySelectorAll(selector)];

  const pages = {
    library: $('[data-page="library"]'),
    artist: $('[data-page="artist"]'),
  };
  const artistList = $('.mm-artists');
  const releases = $('.mm-releases');
  const artistName = $('.mm-artist-name');
  const player = $('.mm-player');
  const audio = $('.mm-audio');
  const volume = $('.mm-volume-range');
  const playBtn = $('.mm-play');

  let artists = [];
  let queue = [];          // [{ track, album, artist }]
  let index = -1;

  /* ---------------------------------------------------------- helpers */

  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[ch]);

  const chevron = '<svg class="mm-chevron" viewBox="0 0 8 14" aria-hidden="true"><path d="M1 1l6 6-6 6"/></svg>';
  const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

  /* ------------------------------------------------------- page stack */

  function go(from, to, forward) {
    if (from === to) return;
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

  // swipe from the left edge to go back, like iOS
  let edgeStart = null;
  pages.artist.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    edgeStart = t.clientX < 24 ? { x: t.clientX, y: t.clientY } : null;
  }, { passive: true });
  pages.artist.addEventListener('touchend', (e) => {
    if (!edgeStart) return;
    const t = e.changedTouches[0];
    if (t.clientX - edgeStart.x > 70 && Math.abs(t.clientY - edgeStart.y) < 60) showLibrary();
    edgeStart = null;
  });

  /* ---------------------------------------------------------- library */

  function readDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
      if (draft && Array.isArray(draft.artists)) return draft;
    } catch (err) { /* storage blocked */ }
    return null;
  }

  function loadLibrary() {
    const draft = readDraft();
    if (draft && !draft.standalone) return Promise.resolve(draft.artists);
    const fromFile = fetch(url('music.json'), { cache: 'no-cache' }).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });
    return draft ? fromFile.catch(() => draft.artists) : fromFile;
  }

  function renderArtists() {
    if (!artists.length) {
      artistList.innerHTML = '<div class="mm-empty">No music yet.</div>';
      return;
    }
    artistList.replaceChildren(...artists.map((artist) => {
      const songs = artist.albums.reduce((n, a) => n + a.tracks.length, 0);
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'mm-row';
      row.setAttribute('role', 'listitem');
      row.innerHTML = `
        <img class="mm-avatar" src="${escapeHTML(artist.image)}" alt="">
        <span class="mm-row-text">
          <span class="mm-row-title">${escapeHTML(artist.name)}</span>
          <span class="mm-row-sub">${artist.albums.length} release${artist.albums.length === 1 ? '' : 's'} · ${songs} song${songs === 1 ? '' : 's'}</span>
        </span>
        ${chevron}`;
      row.querySelector('img').addEventListener('error', (e) => { e.target.removeAttribute('src'); });
      row.addEventListener('click', () => openArtist(artist));
      return row;
    }));
  }

  function openArtist(artist) {
    artistName.textContent = artist.name;
    releases.replaceChildren();

    if (!artist.albums.length) {
      releases.innerHTML = '<div class="mm-empty">No releases yet.</div>';
    }

    const artistQueue = [];
    artist.albums.forEach((album) => {
      const header = document.createElement('div');
      header.className = 'mm-album';
      header.innerHTML = `
        <div class="mm-album-text">
          <div class="mm-album-title">${escapeHTML(album.title)}</div>
          <div class="mm-album-date">${escapeHTML(album.date || '')}</div>
        </div>
        <img class="mm-album-art" src="${escapeHTML(album.cover)}" alt="">`;
      releases.append(header);

      album.tracks.forEach((track) => {
        const position = artistQueue.push({ track, album, artist }) - 1;
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'mm-track';
        row.dataset.url = track.url;
        row.innerHTML = `
          <span class="mm-track-icon">${playIcon}</span>
          <span class="mm-track-title">${escapeHTML(track.title || 'Untitled')}</span>
          <span class="mm-track-length">${escapeHTML(track.length || '')}</span>`;
        row.addEventListener('click', () => playQueue(artistQueue, position, true));
        releases.append(row);
      });
    });

    releases.scrollTop = 0;
    markPlaying();
    if (!pages.artist.classList.contains('is-current')) go(pages.library, pages.artist, true);
  }

  function showLibrary() {
    if (pages.library.classList.contains('is-current')) return;
    go(pages.artist, pages.library, false);
  }

  body.querySelector('[data-back]').addEventListener('click', showLibrary);

  /* ----------------------------------------------------------- player */

  function current() {
    return queue[index] || null;
  }

  function playQueue(list, position, openPlayerView) {
    queue = list;
    index = position;
    const item = current();
    if (!item) return;

    audio.src = item.track.url;
    audio.play().catch(() => updatePlayButton());
    updateNowPlaying();
    $$('.mm-np').forEach((b) => { b.hidden = false; });
    if (openPlayerView) openPlayer();
  }

  function step(delta) {
    if (!queue.length) return;
    // "previous" restarts the song if it's more than 3 seconds in
    if (delta < 0 && audio.currentTime > 3) { audio.currentTime = 0; return; }
    const next = index + delta;
    if (next < 0 || next >= queue.length) return;
    playQueue(queue, next, false);
  }

  function updateNowPlaying() {
    const item = current();
    const cover = $('.mm-cover');
    if (!item) return;
    $('.mm-now-title').textContent = item.track.title || 'Untitled';
    $('.mm-now-artist').textContent = `${item.artist.name} - ${item.album.title}`;
    cover.src = item.album.cover || '';
    $('.mm-prev').disabled = index <= 0 && audio.currentTime <= 3;
    $('.mm-next').disabled = index >= queue.length - 1;
    markPlaying();

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: item.track.title || 'Untitled',
        artist: item.artist.name,
        album: item.album.title,
        artwork: item.album.cover ? [{ src: new URL(item.album.cover, location.href).href, sizes: '600x600' }] : [],
      });
    }
  }

  function markPlaying() {
    const item = current();
    $$('.mm-track').forEach((row) => row.classList.toggle('is-playing', Boolean(item) && row.dataset.url === item.track.url));
  }

  function updatePlayButton() {
    const playing = !audio.paused && !audio.ended;
    // SVG elements ignore the .hidden property, so set the attribute itself
    $('.mm-icon-play').toggleAttribute('hidden', playing);
    $('.mm-icon-pause').toggleAttribute('hidden', !playing);
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }

  function openPlayer() {
    player.hidden = false;
    void player.offsetWidth;
    player.classList.add('is-open');
  }

  function closePlayer() {
    player.classList.remove('is-open');
    const done = () => { if (!player.classList.contains('is-open')) player.hidden = true; };
    player.addEventListener('transitionend', done, { once: true });
    setTimeout(done, 500);
  }

  // swipe down on the artwork area to hide the player
  let pullStart = null;
  player.addEventListener('touchstart', (e) => { pullStart = e.touches[0].clientY; }, { passive: true });
  player.addEventListener('touchend', (e) => {
    if (pullStart !== null && e.changedTouches[0].clientY - pullStart > 110 && !e.target.closest('input')) closePlayer();
    pullStart = null;
  });

  $$('.mm-np').forEach((b) => b.addEventListener('click', openPlayer));
  $('.mm-player-close').addEventListener('click', closePlayer);

  playBtn.addEventListener('click', () => {
    if (!current()) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  });
  $('.mm-prev').addEventListener('click', () => step(-1));
  $('.mm-next').addEventListener('click', () => step(1));

  audio.addEventListener('play', updatePlayButton);
  audio.addEventListener('pause', updatePlayButton);
  audio.addEventListener('ended', () => {
    updatePlayButton();
    if (index < queue.length - 1) step(1);
  });
  audio.addEventListener('timeupdate', () => {
    $('.mm-prev').disabled = index <= 0 && audio.currentTime <= 3;
  });

  volume.addEventListener('input', () => { audio.volume = Number(volume.value); });

  // iPhones and iPads ignore page volume - use the hardware buttons instead
  const isAppleTouch = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
  if (isAppleTouch) $('.mm-volume').hidden = true;

  if ('mediaSession' in navigator) {
    const set = (action, fn) => { try { navigator.mediaSession.setActionHandler(action, fn); } catch (err) { /* unsupported */ } };
    set('play', () => audio.play());
    set('pause', () => audio.pause());
    set('previoustrack', () => step(-1));
    set('nexttrack', () => step(1));
  }

  // leaving the phone layout (window made wider) stops phone playback
  onModeChange((mode) => { if (mode !== 'mobile') audio.pause(); });

  /* ------------------------------------------------------------ start */

  function refresh() {
    return loadLibrary()
      .then((data) => {
        artists = Array.isArray(data) ? data : [];
        renderArtists();
      })
      .catch((err) => {
        console.error('Could not load music library:', err);
        artistList.innerHTML = '<div class="mm-empty">Could not load the music library.</div>';
      });
  }

  window.addEventListener('storage', (e) => { if (e.key === DRAFT_KEY) refresh(); });
  return refresh();
});
