/* ==========================================================================
   Right-click menu for images
   --------------------------------------------------------------------------
   Opt in by adding the `data-image-menu` attribute to any element (or its
   parent) in your app's HTML:

     <div class="gallery" data-image-menu> <img src="..."> </div>

   "Open Image" fires a `desktop:open-image` event on the image
   (event.detail.src). An app can listen for it and call preventDefault() to
   show the image its own way - the Photos app does. If nothing handles it,
   the image opens in a new browser tab.
   ========================================================================== */

(() => {
  'use strict';

  let menu = null;

  function ensureMenu() {
    if (menu) return menu;
    menu = document.createElement('div');
    menu.id = 'global-context-menu';
    menu.setAttribute('role', 'menu');
    Object.assign(menu.style, {
      position: 'fixed',
      zIndex: '10000',
      background: '#fff',
      border: '1px solid #ccc',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      borderRadius: '5px',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '0.875rem',
      userSelect: 'none',
      display: 'none',
      minWidth: '10rem',
      padding: '2px 0',
    });
    document.body.appendChild(menu);
    return menu;
  }

  function hide() {
    if (menu) menu.style.display = 'none';
  }

  function show(x, y, img) {
    ensureMenu();
    menu.replaceChildren();

    const addItem = (label, onClick) => {
      const item = document.createElement('div');
      item.textContent = label;
      item.setAttribute('role', 'menuitem');
      Object.assign(item.style, { padding: '4px 20px', cursor: 'pointer', whiteSpace: 'nowrap' });
      item.addEventListener('mouseenter', () => { item.style.backgroundColor = '#0060df'; item.style.color = 'white'; });
      item.addEventListener('mouseleave', () => { item.style.backgroundColor = ''; item.style.color = ''; });
      item.addEventListener('click', () => { hide(); onClick(); });
      menu.appendChild(item);
    };

    addItem('Open Image', () => {
      const event = new CustomEvent('desktop:open-image', { bubbles: true, cancelable: true, detail: { src: img.src } });
      if (img.dispatchEvent(event)) window.open(img.src, '_blank', 'noopener');
    });

    addItem('Set as Background', () => {
      const wallpaper = document.getElementById('wallpaper');
      if (!wallpaper) return;
      wallpaper.src = img.src;
      try { localStorage.setItem('wallpaperSrc', img.src); } catch (err) { /* storage full or blocked */ }
    });

    addItem('Download Image', () => {
      const link = document.createElement('a');
      link.href = img.src;
      link.download = img.src.split('/').pop();
      document.body.appendChild(link);
      link.click();
      link.remove();
    });

    // Keep the menu inside the viewport
    menu.style.display = 'block';
    const rect = menu.getBoundingClientRect();
    menu.style.left = `${Math.min(x, window.innerWidth - rect.width - 8)}px`;
    menu.style.top = `${Math.min(y, window.innerHeight - rect.height - 8)}px`;
  }

  document.addEventListener('contextmenu', (e) => {
    const img = e.target.closest('img');
    if (img && img.closest('[data-image-menu]')) {
      e.preventDefault();
      show(e.clientX, e.clientY, img);
    } else {
      hide();
    }
  });

  document.addEventListener('click', hide);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  window.addEventListener('blur', hide);
})();
