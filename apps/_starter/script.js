/* ==========================================================================
   Starter app
   --------------------------------------------------------------------------
   Desktop.app(id, setup) registers your app. `id` must match the folder name
   (and the name in apps/apps.json). `setup` runs once, the first time the
   window opens, after index.html has been put inside it.

   setup receives:
     body       the element that holds your index.html (search inside it)
     window     the whole window element
     url(path)  full URL of a file in this app's folder, e.g. url('data.json')
     onOpen(fn) run fn every time the window is opened (including the first)
     onClose(fn) run fn every time it's closed (e.g. pause audio)
     close()    close the window
     setTitle(text)  change the title bar text

   Other things you can use anywhere:
     Desktop.open('music') / Desktop.close('music')
     Desktop.createWindow({ title, width, height, resizable, onClose })
   ========================================================================== */

Desktop.app('_starter', ({ body, url, onOpen, onClose, setTitle }) => {
  // Always look things up inside `body`, so two apps can use the same class names
  const countButton = body.querySelector('#starter-count');
  const popupButton = body.querySelector('#starter-popup');
  const list = body.querySelector('#starter-links');

  // 1. Simple state
  let clicks = 0;
  countButton.addEventListener('click', () => {
    clicks += 1;
    countButton.textContent = `Clicked ${clicks} time${clicks === 1 ? '' : 's'}`;
  });

  // 2. Load data from a JSON file in this folder
  fetch(url('data.json'))
    .then((res) => res.json())
    .then((items) => {
      items.forEach(({ label, url: href }) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = label;
        li.append(a);
        list.append(li);
      });
    });

  // 3. Open an extra window
  popupButton.addEventListener('click', () => {
    const win = Desktop.createWindow({ title: 'A second window', width: '20rem', height: '10rem' });
    win.body.innerHTML = '<div class="app-empty"><strong>Hi there</strong><span>Drag me around.</span></div>';
  });

  // 4. React to the window opening and closing
  onOpen(() => setTitle(`My App - opened ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`));
  onClose(() => console.log('My App was closed'));
});
