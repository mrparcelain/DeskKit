let allPhotoData = {};
let selectedLibraryName = '';

// Library source (same idea as the Music app):
// 1. Unpublished changes made on the Developer page in this browser, if any.
// 2. Otherwise the published data/photos.json.
const LOCAL_PHOTOS_KEY = 'pcarchive.photos.draft';

function readLocalPhotoDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(LOCAL_PHOTOS_KEY));
    if (draft && draft.data && typeof draft.data === 'object') return draft;
  } catch (err) { /* storage blocked or corrupt – fall back to the file */ }
  return null;
}

function loadPhotoLibraries() {
  const draft = readLocalPhotoDraft();
  if (draft && !draft.standalone) return Promise.resolve(draft.data);

  const fromFile = fetch('../data/photos.json', { cache: 'no-cache' }).then(res => {
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

function switchFocus(appElement) {
  if (!appElement) return;
  currentMaxZ++;
  appElement.style.zIndex = currentMaxZ;
}

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
        openNewPhotoViewer(photo);
      });

      photoGrid.appendChild(photoDiv);
    });
  });
}

function openPhotoViewer(photoUrl) {
  const viewer = document.getElementById('photoviewer');
  const viewerImg = document.getElementById('photoviewer-img');

  viewerImg.src = photoUrl;
  viewer.classList.remove('hidden');
}

function openPhotoInViewer(imageUrl) {
  const viewer = document.getElementById('photoviewer');
  const viewerImg = document.getElementById('photoviewer-img');

  viewerImg.src = imageUrl;
  viewer.classList.remove('hidden');

  // Wait for the image to fully load
  viewerImg.onload = () => {
    const imgWidth = viewerImg.naturalWidth;
    const imgHeight = viewerImg.naturalHeight;

    viewer.style.width = `${imgWidth}px`;
    viewer.style.height = `${imgHeight}px`;

    // Optional: center the window or position it nicely
    viewer.style.left = `calc(50% - ${imgWidth / 2}px)`;
    viewer.style.top = `calc(50% - ${imgHeight / 2}px)`;
  };
}

function openNewPhotoViewer(photoUrl) {
  // Check if already open
  const existingViewer = [...document.querySelectorAll('.photoviewer-window')]
    .find(v => v.dataset.photoUrl === photoUrl);
  if (existingViewer) {
    switchFocus(existingViewer);
    return;
  }

  const viewer = document.createElement('div');
  viewer.className = 'app draggable photoviewer-window';
  viewer.dataset.photoUrl = photoUrl;

  Object.assign(viewer.style, {
    position: 'absolute',
    top: `${50 + Math.random() * 100}px`,
    left: `${50 + Math.random() * 100}px`,
    backgroundColor: '#fff',
    borderRadius: '4px',
    boxShadow: '0 0 15px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    resize: 'none',
    userSelect: 'none',
  });

  // Header
  const header = document.createElement('div');
  header.id = 'photoviewerheader';
  header.innerHTML = `
    <div class="box-appactions">
      <a class="app-close" href="#"><img draggable="false" src="../ui/icon/close.svg" alt="Close"></a>
      <a><img draggable="false" src="../ui/icon/inactive.svg" alt=""></a>
      <a><img draggable="false" src="../ui/icon/inactive.svg" alt=""></a>
    </div>
    <span class="appname">Photo</span>
    <div class="box-appactions is-spacer" aria-hidden="true">
      <a><img draggable="false" src="../ui/icon/close.svg"></a>
      <a><img draggable="false" src="../ui/icon/inactive.svg"></a>
      <a><img draggable="false" src="../ui/icon/inactive.svg"></a>
    </div>
  `;
  header.className = 'app-titlebar';
  viewer.appendChild(header);

  // Control bar
    const controlBar = document.createElement('div');
    controlBar.className = 'photoviewer-controlbar';
    controlBar.innerHTML = `
    <button class="zoom-out" title="Zoom Out">
        <img src="../ui/zoom-out.svg" width="21" height="21" />
    </button>
    <button class="zoom-reset" title="Reset Zoom">
        <img src="../ui/reset.svg" width="21" height="21" />
    </button>
    <button class="zoom-in" title="Zoom In">
        <img src="../ui/zoom-in.svg" width="21" height="21" />
    </button>
    <button class="download" title="Download">
        <img src="../ui/download.svg" width="21" height="21" />
    </button>
    `;

    const zoomInButton = controlBar.querySelector('.zoom-in');
    const zoomOutButton = controlBar.querySelector('.zoom-out');
    const zoomResetButton = controlBar.querySelector('.zoom-reset');
    const downloadButton = controlBar.querySelector('.download');

    
  Object.assign(controlBar.style, {
  })
  viewer.appendChild(controlBar);

  // Container for image (for panning)
  const imgContainer = document.createElement('div');
  Object.assign(imgContainer.style, {
    flex: '1 1 auto',
    overflow: 'hidden',
    position: 'relative',
    cursor: 'grab',
  });
  viewer.appendChild(imgContainer);

  // Image element
  const img = document.createElement('img');
  img.src = photoUrl;
  img.style.position = 'absolute';
  img.style.top = '0';
  img.style.left = '0';
  img.style.transformOrigin = 'top left';
  img.style.userSelect = 'none';
  img.style.maxWidth = 'none'; 
  img.style.maxHeight = 'none';
  imgContainer.appendChild(img);

  // Zoom & pan state
  let scale = 1;
  let panX = 0;
  let panY = 0;

  const MIN_SCALE = 0.2;
  const MAX_SCALE = 5;

  function updateTransform() {
    img.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }

   function constrainPan() {
    const containerRect = imgContainer.getBoundingClientRect();
    const imgWidth = img.naturalWidth * scale;
    const imgHeight = img.naturalHeight * scale;

    const minX = Math.min(0, containerRect.width - imgWidth);
    const minY = Math.min(0, containerRect.height - imgHeight);
    const maxX = 0;
    const maxY = 0;

    if (panX < minX) panX = minX;
    if (panX > maxX) panX = maxX;
    if (panY < minY) panY = minY;
    if (panY > maxY) panY = maxY;
  }

  function resetZoomPan() {
    scale = 1;
    panX = 0;
    panY = 0;
    updateTransform();
  }

  // Zoom controls
    controlBar.querySelector('.zoom-in').onclick = () => {
    scale = Math.min(scale + 0.2, MAX_SCALE);
    constrainPan();
    updateTransform();
    };

    controlBar.querySelector('.zoom-out').onclick = () => {
    scale = Math.max(scale - 0.2, MIN_SCALE);
    constrainPan();
    updateTransform();
    };

    controlBar.querySelector('.zoom-reset').onclick = () => {
    resetZoomPan();
    };

    controlBar.querySelector('.download').onclick = () => {
    const link = document.createElement('a');
    link.href = photoUrl;
    link.download = photoUrl.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    };

  // Image load - set container size and initial zoom
img.onload = () => {
  const maxWidth = window.innerWidth * 0.9;
  const maxHeight = window.innerHeight * 0.8;

  const naturalWidth = img.naturalWidth;
  const naturalHeight = img.naturalHeight;

  const fitScale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight, 1);

  const displayWidth = naturalWidth * fitScale;
  const displayHeight = naturalHeight * fitScale;

  // Set image display size
  img.style.width = `${displayWidth}px`;
  img.style.height = `${displayHeight}px`;

  // Set container size
  imgContainer.style.width = `${displayWidth}px`;
  imgContainer.style.height = `${displayHeight}px`;

  // Viewer width follows the image; height grows to fit title bar + control bar automatically
  viewer.style.width = `${displayWidth}px`;
  viewer.style.height = 'auto';

  // Now that everything is sized correctly and appended to DOM:
  const panzoomInstance = Panzoom(img, {
    maxScale: 5,
    minScale: fitScale, // Prevent zooming out smaller than fit
    contain: 'outside',
    startScale: 1
  });

  imgContainer.addEventListener('wheel', panzoomInstance.zoomWithWheel);

  // Hook up buttons
  controlBar.querySelector('.zoom-in').onclick = () => panzoomInstance.zoomIn();
  controlBar.querySelector('.zoom-out').onclick = () => panzoomInstance.zoomOut();
  controlBar.querySelector('.zoom-reset').onclick = () => panzoomInstance.reset();
};

  // Pan drag variables
  let isPanning = false;
  let startX = 0;
  let startY = 0;

  imgContainer.addEventListener('mousedown', (e) => {
    console.log('mousedown scale:', scale); // debug log
    if (scale <= 1) return; // no pan if not zoomed in
    isPanning = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    imgContainer.style.cursor = 'grabbing';
    e.preventDefault();
  });

  window.addEventListener('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      imgContainer.style.cursor = 'grab';
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    constrainPan();
    updateTransform();
  });

  // Close button
  header.querySelector('.app-close').addEventListener('click', (e) => {
    e.preventDefault();
    viewer.remove();
  });

  // Append viewer & enable drag on header
  document.body.appendChild(viewer);
  switchFocus(viewer);
  viewer.addEventListener('pointerdown', () => switchFocus(viewer));
  dragElement(viewer, header);


  // Bring to front on focus
  viewer.addEventListener('mousedown', () => switchFocus(viewer));
}

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

function constrainPan() {
  const containerWidth = imgContainer.clientWidth;
  const containerHeight = imgContainer.clientHeight;

  const imageWidth = img.naturalWidth * scale;
  const imageHeight = img.naturalHeight * scale;

  // Calculate max pan offsets (image overflow / 2)
  const maxPanX = Math.max(0, (imageWidth - containerWidth) / 2);
  const maxPanY = Math.max(0, (imageHeight - containerHeight) / 2);

  // Clamp panX and panY between -maxPan and maxPan
  panX = Math.min(maxPanX, Math.max(-maxPanX, panX));
  panY = Math.min(maxPanY, Math.max(-maxPanY, panY));
}
