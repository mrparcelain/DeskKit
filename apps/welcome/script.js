/* ==========================================================================
   Welcome app
   --------------------------------------------------------------------------
   A small guide with sidebar navigation. Shows off a few toolkit features:
   reading the list of apps, opening other apps, extra windows and a
   "show on startup" setting.
   ========================================================================== */

Desktop.app('welcome', ({ id, body, onOpen }) => {
  const navItems = [...body.querySelectorAll('.welcome-nav-item')];
  const sections = [...body.querySelectorAll('.welcome-section')];
  const main = body.querySelector('.welcome-main');

  /* ---- sidebar navigation ---- */

  function show(name) {
    navItems.forEach((item) => {
      const active = item.dataset.section === name;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-current', active ? 'page' : 'false');
    });
    sections.forEach((section) => {
      const active = section.dataset.section === name;
      section.hidden = !active;
      section.classList.toggle('is-active', active);
    });
    main.scrollTop = 0;
  }

  navItems.forEach((item) => item.addEventListener('click', () => show(item.dataset.section)));
  body.querySelectorAll('[data-go]').forEach((link) => link.addEventListener('click', () => show(link.dataset.go)));

  /* ---- "Try it" buttons ---- */

  body.querySelectorAll('[data-open]').forEach((button) =>
    button.addEventListener('click', () => Desktop.open(button.dataset.open)));

  body.querySelector('#welcome-demo-window').addEventListener('click', () => {
    const win = Desktop.createWindow({ title: 'A new window', width: '20rem', height: '11rem' });
    win.body.innerHTML = `
      <div class="app-empty">
        <strong>Made with Desktop.createWindow()</strong>
        <span>Drag me by the title bar, then close me.</span>
      </div>`;
  });

  /* ---- copy buttons on code blocks ---- */

  body.querySelectorAll('.welcome-copy').forEach((button) => {
    button.addEventListener('click', async () => {
      const code = button.parentElement.querySelector('code').textContent;
      try {
        await navigator.clipboard.writeText(code);
        button.textContent = 'Copied!';
      } catch (err) {
        button.textContent = 'Select & copy';
      }
      setTimeout(() => { button.textContent = 'Copy'; }, 1500);
    });
  });

  /* ---- show on startup ---- */

  const startup = body.querySelector('#welcome-on-start');
  startup.checked = Desktop.opensOnStart(id);
  startup.addEventListener('change', () => Desktop.setOpenOnStart(id, startup.checked));

  onOpen(() => { startup.checked = Desktop.opensOnStart(id); });
});
