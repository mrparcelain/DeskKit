let currentAudio = null;
let isRepeating = false;
let progressInterval = null;
let currentAlbumTracks = [];
let currentArtistTracks = [];
let currentTrackIndex = -1;

const playIcon = document.querySelector('.playIcon');
const pauseIcon = document.querySelector('.pauseIcon');
const notplayingbar = document.getElementById('notplayingbar');
const nowplayingbar = document.getElementById('nowplayingbar');
const volume = document.getElementById("musicvolume");
const songProgress = document.getElementById('songprogress');
const repeatButton = document.getElementById('repeat-button');
const searchInput = document.getElementById('searchbarbox');
const searchResults = document.getElementById('searchresults');
const artistList = document.getElementById('sortedmusiclist');
const albumList = document.getElementById('sortedalbumlist');
const nowPlayingArtist = document.getElementById('nowplaying-artist');
const nowPlayingAlbum = document.getElementById('nowplaying-album');
const coverArt = document.querySelector('.album-cover');
const modal = document.getElementById('modal');
const modalImg = document.getElementById('modalImage');
const closeBtn = document.getElementById('closeBtn');

let allArtists = [];

// Library source:
// 1. If the Developer page (/developer) has unpublished changes saved in this
//    browser, show those so you can preview additions right away.
// 2. Otherwise load the published data/music.json.
const LOCAL_LIBRARY_KEY = 'pcarchive.music.draft';

function readLocalDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(LOCAL_LIBRARY_KEY));
    if (draft && Array.isArray(draft.artists)) return draft;
  } catch (err) { /* storage blocked or corrupt – fall back to the file */ }
  return null;
}

function loadMusicLibrary() {
  const draft = readLocalDraft();
  if (draft && !draft.standalone) return Promise.resolve(draft.artists);

  const fromFile = fetch('../data/music.json', { cache: 'no-cache' }).then(res => {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  });
  // A "standalone" draft was made without access to music.json – only use it if the file is unavailable
  return draft ? fromFile.catch(() => draft.artists) : fromFile;
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
}

// Show an artist's discography in the right-hand pane
function showArtist(artist) {
  if (!artist) return;
  document.getElementById('selectedartistname').innerText = artist.name;
  renderAlbums(artist.albums, artist.name);
}

// Keep showing the current artist if they still exist, otherwise the first one
function showDefaultArtist() {
  const current = document.getElementById('selectedartistname').innerText;
  const match = allArtists.find(a => a.name === current);
  showArtist(match || allArtists[0]);
}

loadMusicLibrary()
  .then(data => {
    allArtists = data;
    renderArtistList(data);
    showDefaultArtist();
  })
  .catch(err => console.error('Could not load music library:', err));

// Reload if the library is edited in another tab (e.g. the Developer page)
window.addEventListener('storage', (e) => {
  if (e.key !== LOCAL_LIBRARY_KEY) return;
  loadMusicLibrary().then(data => {
    allArtists = data;
    renderArtistList(data);
    showDefaultArtist();
  });
});

function renderArtistList(artists) {
  const artistList = document.getElementById('sortedmusiclist');
  artistList.innerHTML = '';

  artists.forEach(artist => {
    const div = document.createElement('div');
    div.className = 'sortedmusicbutton';
    div.innerHTML = `
      <img src="${escapeHTML(artist.image)}" alt="${escapeHTML(artist.name)}">
      <span>${escapeHTML(artist.name)}</span>
    `;
    div.addEventListener('click', () => showArtist(artist));
    artistList.appendChild(div);
  });
}

function renderAlbums(albums, artistName) {
  const albumList = document.getElementById('albumstack');
  albumList.innerHTML = '';

  albums.forEach(album => {
    const albumDiv = document.createElement('div');
    albumDiv.className = 'sortedalbum';
    albumDiv.innerHTML = `
      <div class="album-namedate">
        <span class="album-name">${escapeHTML(album.title)}</span>
        <span class="album-date">${escapeHTML(album.date)}</span>
      </div>
      <div class="album-body">
        <img class="album-cover" src="${escapeHTML(album.cover)}" alt="${escapeHTML(album.title)}">
        <div class="album-tracks">
          ${album.tracks.map(track => `
            <button class="album-track" data-song="${escapeHTML(track.url)}" data-artist="${escapeHTML(artistName)}">
              <span class="album-trackname">${escapeHTML(track.title)}</span>
              <span class="album-tracklength">${escapeHTML(track.length)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
    albumList.appendChild(albumDiv);
  });

  bindTrackEvents();
}

function bindTrackEvents() {
  document.querySelectorAll('.album-track').forEach(button => {
    button.addEventListener('dblclick', function () {
      playTrack(this);
    });
  });
}

function setAudioEventListeners(audio) {
  audio.addEventListener('play', () => {
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
    notplayingbar.style.display = 'none';
    nowplayingbar.style.display = 'block';
    startProgressUpdater();
  });

  audio.addEventListener('pause', () => {
    stopProgressUpdater();
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
  });

audio.addEventListener('ended', () => {
  if (isRepeating) {
    audio.currentTime = 0;
    audio.play();
    return;
  }

  if (currentArtistTracks?.length > 0 && currentTrackIndex !== -1) {
    const nextIndex = (currentTrackIndex + 1) % currentArtistTracks.length;
    currentTrackIndex = nextIndex;
    currentArtistTracks[nextIndex].dispatchEvent(new MouseEvent('dblclick'));
  }
});
}

function updateProgress() {
  if (currentAudio && currentAudio.duration) {
    const percent = (currentAudio.currentTime / currentAudio.duration) * 100;
    songProgress.value = percent;
    updateProgressBar();
  }
}


function updateProgressBar() {
  const val = songProgress.value;
  songProgress.style.backgroundSize = `${val}% 100%`;
}

songProgress.addEventListener('input', updateProgressBar);

function startProgressUpdater() {
  if (progressInterval) clearInterval(progressInterval);
  progressInterval = setInterval(updateProgress, 500);
}

function stopProgressUpdater() {
  if (progressInterval) clearInterval(progressInterval);
}

// Play button toggle
document.getElementById('play-button').addEventListener('click', function () {
  if (currentAudio) {
    if (currentAudio.paused) {
      currentAudio.play().catch(err => console.log('Playback error:', err));
    } else {
      currentAudio.pause();
    }
  }
});

songProgress.addEventListener('input', () => {
  if (currentAudio && currentAudio.duration) {
    const seekTime = (songProgress.value / 100) * currentAudio.duration;
    currentAudio.currentTime = seekTime;
  }
});

// Volume control
volume.oninput = () => {
  if (currentAudio) {
    currentAudio.volume = Math.pow(volume.value / 100, 2);
  }
};

repeatButton.addEventListener('click', () => {
  isRepeating = !isRepeating;

  if (isRepeating) {
    repeatButton.src = "../ui/repeat1.svg";
  } else {
    repeatButton.src = "../ui/repeat2.svg";
  }
});

function loadArtistProfileByName(name) {
  const artist = allArtists.find(a => a.name.toLowerCase() === name.toLowerCase());
  if (artist) {
    document.getElementById('selectedartistname').innerText = artist.name;
    renderAlbums(artist.albums, artist.name);
  } else {
    alert(`Artist "${name}" not found.`);
  }
}

searchInput.addEventListener('input', (e) => {
  const query = e.target.value.trim().toLowerCase();

  if (!query) {
    clearSearchResults();
    return;
  }

  artistList.style.display = 'none';
  albumList.style.display = 'none';
  searchResults.style.display = 'block';

  // Filter artists if artist name, album title or track title matches
  const matchedArtists = allArtists.filter(artist => {
    const artistMatch = artist.name.toLowerCase().includes(query);

    // album matches OR album has track matching
    const albumMatch = artist.albums.some(album =>
      album.title.toLowerCase().includes(query) ||
      album.tracks.some(track => track.title.toLowerCase().includes(query))
    );

    return artistMatch || albumMatch;
  });

  renderFilteredSearchResults(matchedArtists, query);
});

function renderFilteredSearchResults(artists, query) {
  const wrapper = document.getElementById('searchresults-wrapper');
  wrapper.innerHTML = '';

  artists.forEach(artist => {
    const artistMatches = artist.name.toLowerCase().includes(query);

    // Albums where title or any track matches query
    const matchedAlbums = artist.albums.filter(album =>
      album.title.toLowerCase().includes(query) ||
      album.tracks.some(track => track.title.toLowerCase().includes(query))
    );

    if (artistMatches || matchedAlbums.length > 0) {
      // Show artist
      const artistDiv = document.createElement('div');
      artistDiv.className = 'found-artist';
      artistDiv.innerHTML = `
        <img src="${escapeHTML(artist.image)}" alt="${escapeHTML(artist.name)}">
        <span class="found-artist-name">${escapeHTML(artist.name)}</span>
      `;
      artistDiv.addEventListener('click', () => {
        document.getElementById('selectedartistname').innerText = artist.name;
        renderAlbums(artist.albums, artist.name);
        clearSearchResults();
      });
      wrapper.appendChild(artistDiv);

      // Show albums (all if artist matches, else only matched albums)
      const albumsToShow = artistMatches ? artist.albums : matchedAlbums;

      albumsToShow.forEach(album => {
        const albumDiv = document.createElement('div');
        albumDiv.className = 'found-album';
        albumDiv.innerHTML = `
          <img src="${escapeHTML(album.cover)}" alt="${escapeHTML(album.title)}">
          <div class="found-album-info">
            <span class="found-album-name">${escapeHTML(album.title)}</span>
            <span class="found-album-artist">${escapeHTML(artist.name)}</span>
          </div>
        `;
        albumDiv.addEventListener('click', () => {
          document.getElementById('selectedartistname').innerText = artist.name;
          renderAlbums(artist.albums, artist.name);
          clearSearchResults();

          setTimeout(() => {
            const albumElements = document.querySelectorAll('#albumstack .sortedalbum');
            const container = document.getElementById('music');
            const header = document.getElementById('musicheader');
            const headerHeight = header ? header.offsetHeight : 0;

            for (const albumElement of albumElements) {
              const albumName = albumElement.querySelector('.album-name').innerText;
              if (albumName === album.title) {
                const containerRect = container.getBoundingClientRect();
                const albumRect = albumElement.getBoundingClientRect();
                break;
              }
            }
          }, 100);
        });
        wrapper.appendChild(albumDiv);
      });
    }
  });
}

function searchInData(query) {
  const wrapper = document.getElementById('searchresults-wrapper');
  wrapper.innerHTML = '';

  allArtists.forEach(artist => {
    if (artist.name.toLowerCase().includes(query)) {
      addArtistResult(artist);
    }

    artist.albums.forEach(album => {
      if (album.title.toLowerCase().includes(query)) {
        addAlbumResult(album, artist.name);
      }

      album.tracks.forEach(track => {
        if (track.title.toLowerCase().includes(query)) {
          addTrackResult(track, album, artist);
        }
      });
    });
  });
}

function addArtistResult(artist) {
  const wrapper = document.getElementById('searchresults-wrapper');
  const div = document.createElement('div');
  div.className = 'found-artist';
  div.innerHTML = `
    <img src="${escapeHTML(artist.image)}" alt="${escapeHTML(artist.name)}">
    <span class="found-artist-name">${escapeHTML(artist.name)}</span>
  `;
  div.addEventListener('click', () => {
    document.getElementById('selectedartistname').innerText = artist.name;
    renderAlbums(artist.albums, artist.name);
    clearSearchResults();
  });
  wrapper.appendChild(div);
}

// Add album card
function addAlbumResult(album, artistName) {
  const wrapper = document.getElementById('searchresults-wrapper');
  const div = document.createElement('div');
  div.className = 'found-album';
  div.innerHTML = `
    <img src="${escapeHTML(album.cover)}" alt="${escapeHTML(album.title)}">
    <div class="found-album-info">
      <span class="found-album-name">${escapeHTML(album.title)}</span>
      <span class="found-album-artist">${escapeHTML(artistName)}</span>
    </div>
  `;
  div.addEventListener('click', () => {
    document.getElementById('selectedartistname').innerText = artistName;
    renderAlbums([album]);
    clearSearchResults();
  });
  wrapper.appendChild(div);
}


nowPlayingArtist.addEventListener('click', () => {
  const artistName = nowPlayingArtist.innerText;
  if (artistName) {
    loadArtistProfileByName(artistName);
  }
});

nowPlayingAlbum.addEventListener('click', () => {
  const artistName = nowPlayingArtist.innerText;
  if (artistName) {
    loadArtistProfileByName(artistName);
  }
});

function clearSearchResults() {
  const wrapper = document.getElementById('searchresults-wrapper');
  wrapper.innerHTML = '';
  searchResults.style.display = 'none';
  artistList.style.display = 'block';
  albumList.style.display = 'block';
};

function playTrack(button) {
  const songPath = button.getAttribute('data-song');
  const trackName = button.querySelector('.album-trackname').innerText;
  const artistName = button.getAttribute('data-artist');
  const albumDiv = button.closest('.sortedalbum');
  const albumName = albumDiv.querySelector('.album-name').innerText;
  const coverLink = albumDiv.querySelector('img').src;

  document.getElementById('nowplaying-song').innerText = trackName;
  document.getElementById('nowplaying-artist').innerText = artistName;
  document.getElementById('nowplaying-album').innerText = albumName;

  document.querySelectorAll('#nowplayingcover').forEach(c => c.src = coverLink);

  if (currentAudio) currentAudio.pause();
  currentAudio = new Audio(songPath);
  currentAudio.volume = Math.pow(volume.value / 100, 2);
  setAudioEventListeners(currentAudio);
  currentAudio.play().catch(err => console.log('Playback error:', err));

  const artist = allArtists.find(a => a.name === artistName);
  if (artist) {
    currentArtistTracks = [];

    artist.albums.forEach(album => {
      const albumElement = [...document.querySelectorAll('.sortedalbum')].find(
        el => el.querySelector('.album-name')?.innerText === album.title
      );
      if (!albumElement) return;

      const tracks = albumElement.querySelectorAll('.album-track');
      tracks.forEach(track => currentArtistTracks.push(track));
    });

    currentTrackIndex = currentArtistTracks.indexOf(button);
  }
};

const prevBtn = document.getElementById('song-previous');
const nextBtn = document.getElementById('song-next');

prevBtn.addEventListener('click', () => {
  if (currentArtistTracks.length > 0) {
    currentTrackIndex = (currentTrackIndex - 1 + currentArtistTracks.length) % currentArtistTracks.length;
    playTrack(currentArtistTracks[currentTrackIndex]);
  }
});

nextBtn.addEventListener('click', () => {
  if (currentArtistTracks.length > 0) {
    currentTrackIndex = (currentTrackIndex + 1) % currentArtistTracks.length;
    playTrack(currentArtistTracks[currentTrackIndex]);
  }
});