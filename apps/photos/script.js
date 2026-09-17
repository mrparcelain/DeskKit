/* ==========================================================================
   Photos app
   --------------------------------------------------------------------------
   Runs once, the first time the Photos window opens.

   Data:   apps/photos/photos.json (edit it with /developer → Photos)
           { "Library": { "2024": { "Album": ["photo url", ...] } } }
   Assets: apps/photos/assets/
   ========================================================================== */

Desktop.app('photos', ({ body, url }) => {
  let allPhotoData = {};
  let selectedLibraryName = '';

  // Library source (same idea as the Music app):
  // 1. Unpublished changes made on the Developer page in this browser, if any.
  // 2. Otherwise the published apps/photos/photos.json.
  const LOCAL_PHOTOS_KEY = 'deskkit.photos.draft';

  function readLocalPhotoDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(LOCAL_PHOTOS_KEY));
      if (draft && draft.data && typeof draft.data === 'object') return draft;
    } catch (err) { /* storage blocked or corrupt - fall back to the file */ }
    return null;
  }

  function loadPhotoLibraries() {
    const draft = readLocalPhotoDraft();
    if (draft && !draft.standalone) return Promise.resolve(draft.data);

    const fromFile = fetch(url('photos.json'), { cache: 'no-cache' }).then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
    return draft ? fromFile.catch(() => draft.data) : fromFile;
  }

  function escapePhotoHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
  }

  function applyPhotoData(data) {
    allPhotoData = data || {};
    renderPhotoLibraryList(allPhotoData);
    // keep the open library if it still exists, otherwise show the first one
    const names = Object.keys(allPhotoData);
    const name = names.includes(selectedLibraryName) ? selectedLibraryName : names[0];
    if (name) showPhotoLibrary(name);
    else photoListBox.innerHTML = '';
  }

  loadPhotoLibraries()
    .then(applyPhotoData)
    .catch(err => console.error('Could not load photo libraries:', err));

  // Reload if the libraries are edited in another tab (e.g. the Developer page)
  window.addEventListener('storage', (e) => {
    if (e.key === LOCAL_PHOTOS_KEY) loadPhotoLibraries().then(applyPhotoData);
  });


  const openViewers = new Map();


  // Grab references to DOM elements
  const libraryListDiv = document.getElementById('sortedphotoslist');
  const photoListBox = document.getElementById('photolist-box');

  // Every photo in a library, newest year first
  function libraryPhotos(library) {
    return Object.keys(library || {})
      .sort((a, b) => Number(b) - Number(a))
      .flatMap(year => Object.values(library[year] || {}).flat());
  }

  // Left column: one row per photo library (cover, name, photo count)
  function renderPhotoLibraryList(data) {
    libraryListDiv.innerHTML = '';

    Object.keys(data).forEach(name => {
      const photos = libraryPhotos(data[name]);
      const button = document.createElement('div');
      button.className = 'sortedphotosbutton';
      button.dataset.library = name;
      button.innerHTML = `
        <span class="photolibrary-cover">${photos[0] ? `<img src="${escapePhotoHTML(photos[0])}" alt="" draggable="false" onerror="this.remove()">` : ''}</span>
        <span class="photolibrary-text">
          <span class="photolibrary-name">${escapePhotoHTML(name)}</span>
          <span class="photolibrary-count">${photos.length} photo${photos.length === 1 ? '' : 's'}</span>
        </span>
      `;
      button.addEventListener('click', () => showPhotoLibrary(name));
      libraryListDiv.appendChild(button);
    });
  }

  function showPhotoLibrary(name) {
    selectedLibraryName = name;
    libraryListDiv.querySelectorAll('.sortedphotosbutton').forEach(b =>
      b.classList.toggle('is-active', b.dataset.library === name));
    renderPhotoAlbums(allPhotoData[name] || {});
  }

  // Render individual photos inside an album
  function renderPhotoGallery(albumName, photoPaths) {
    fadeOutIn(photoListBox, () => {
      photoListBox.innerHTML = '';

      const albumTitle = document.createElement('span');
      albumTitle.id = 'sort-year';
      albumTitle.innerText = albumName;
      photoListBox.appendChild(albumTitle);

      const photoGrid = document.createElement('div');
      photoGrid.className = 'photo-grid';
      photoListBox.appendChild(photoGrid);

      photoPaths.forEach(photo => {
        const photoDiv = document.createElement('a');
        photoDiv.className = 'photo-item';

        photoDiv.innerHTML = `
          <div class="photo-thumb">
            <div>
              <img class="photo-thumb-img" draggable="false" src="${escapePhotoHTML(photo)}">
            </div>
            <div class="photo-thumb-text">
              <span></span>
            </div>
          </div>
        `;

        photoDiv.addEventListener('click', () => {
          openPhotoViewer(photo);
        });

        photoGrid.appendChild(photoDiv);
      });
    });
  }


  // Opens a photo in its own window, with zoom controls (uses Panzoom if loaded)
  function openPhotoViewer(photoUrl) {
    const existing = openViewers.get(photoUrl);
    if (existing && existing.el.isConnected) { existing.focus(); return; }

    const win = Desktop.createWindow({
      title: 'Photo',
      width: '36rem',
      height: 'auto',
      minHeight: 'auto',
      resizable: false,
      className: 'photoviewer-window',
      onClose: () => { win.el.remove(); openViewers.delete(photoUrl); },
    });
    openViewers.set(photoUrl, win);

    const controlBar = document.createElement('div');
    controlBar.className = 'photoviewer-controlbar';
    controlBar.innerHTML = `
      <button type="button" class="zoom-out" title="Zoom out"><img src="${url('assets/zoom-out.svg')}" alt="Zoom out"></button>
      <button type="button" class="zoom-reset" title="Reset zoom"><img src="${url('assets/reset.svg')}" alt="Reset zoom"></button>
      <button type="button" class="zoom-in" title="Zoom in"><img src="${url('assets/zoom-in.svg')}" alt="Zoom in"></button>
      <button type="button" class="download" title="Download"><img src="${url('assets/download.svg')}" alt="Download"></button>
    `;

    const imgContainer = document.createElement('div');
    imgContainer.className = 'photoviewer-stage';
    imgContainer.dataset.imageMenu = '';

    const img = document.createElement('img');
    img.src = photoUrl;
    img.alt = '';
    img.draggable = false;
    imgContainer.appendChild(img);

    win.body.append(controlBar, imgContainer);

    controlBar.querySelector('.download').onclick = () => {
      const link = document.createElement('a');
      link.href = photoUrl;
      link.download = photoUrl.split('/').pop();
      document.body.appendChild(link);
      link.click();
      link.remove();
    };

    img.onload = () => {
      // Fit the photo inside 90% × 80% of the screen, never enlarging it
      const fitScale = Math.min((window.innerWidth * 0.9) / img.naturalWidth, (window.innerHeight * 0.8) / img.naturalHeight, 1);
      const width = Math.round(img.naturalWidth * fitScale);
      const height = Math.round(img.naturalHeight * fitScale);

      img.style.width = `${width}px`;
      img.style.height = `${height}px`;
      imgContainer.style.width = `${width}px`;
      imgContainer.style.height = `${height}px`;
      win.el.style.width = `${width}px`;
      win.el.style.minWidth = '0';

      // Centre the finished window on screen
      const total = win.el.offsetHeight;
      win.el.style.left = `${Math.max(8, Math.round((window.innerWidth - width) / 2))}px`;
      win.el.style.top = `${Math.max(8, Math.round((window.innerHeight - total) / 2))}px`;

      if (typeof Panzoom === 'function') {
        const panzoom = Panzoom(img, { maxScale: 5, minScale: 1, contain: 'outside', startScale: 1 });
        imgContainer.addEventListener('wheel', panzoom.zoomWithWheel);
        controlBar.querySelector('.zoom-in').onclick = () => panzoom.zoomIn();
        controlBar.querySelector('.zoom-out').onclick = () => panzoom.zoomOut();
        controlBar.querySelector('.zoom-reset').onclick = () => panzoom.reset();
      } else {
        controlBar.querySelectorAll('.zoom-in, .zoom-out, .zoom-reset').forEach((b) => { b.disabled = true; });
      }
    };

    img.onerror = () => {
      imgContainer.classList.add('is-broken');
      imgContainer.textContent = 'This photo could not be loaded.';
    };
  }

  // Right-click → "Open Image" on any photo (see script/contextmenu.js)
  document.addEventListener('desktop:open-image', (e) => {
    if (!body.contains(e.target) && !e.target.closest('.photoviewer-window')) return;
    e.preventDefault();
    openPhotoViewer(e.detail.src);
  });

  function fadeOutIn(element, callback) {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      element.removeEventListener('transitionend', finish);
      callback();
      element.classList.remove('fade-out');
      element.classList.add('fade-in');
    };

    // Hidden windows never fire transitionend, so swap the content straight away
    if (!element.offsetParent) { finish(); return; }

    element.classList.add('fade-out');
    element.classList.remove('fade-in');
    element.addEventListener('transitionend', finish);
    setTimeout(finish, 250); // safety net
  }

  function renderPhotoAlbums(artistData) {
    fadeOutIn(photoListBox, () => {
      photoListBox.innerHTML = '';

      Object.keys(artistData)
      .sort((a, b) => Number(b) - Number(a)) // sort descending by year
      .forEach(year => {
        const yearTitle = document.createElement('span');
        yearTitle.id = 'sort-year';
        yearTitle.innerText = year;
        photoListBox.appendChild(yearTitle);

        const albumsGrid = document.createElement('div');
        albumsGrid.className = 'album-grid';
        photoListBox.appendChild(albumsGrid);

        Object.keys(artistData[year]).forEach(albumName => {
          const albumDiv = document.createElement('a');
          albumDiv.className = 'album-item';
          const firstPhoto = (artistData[year][albumName] || [])[0];

          albumDiv.innerHTML = `
            <div class="photopreview">
              <div>
                ${firstPhoto
                  ? `<img class="photopreview-img" draggable="false" src="${escapePhotoHTML(firstPhoto)}" onerror="this.replaceWith(Object.assign(document.createElement('div'), { className: 'photopreview-empty' }))">`
                  : `<div class="photopreview-empty"></div>`}
              </div>
              <div class="photopreview-text">
                <span>${escapePhotoHTML(albumName)}</span>
              </div>
            </div>
          `;

          albumDiv.addEventListener('click', () => {
            renderPhotoGallery(albumName, artistData[year][albumName]);
          });

          albumsGrid.appendChild(albumDiv);
        });

        const spacer = document.createElement('div');
        spacer.style.marginBottom = '7%';
        photoListBox.appendChild(spacer);
      });
    });
  }
});
