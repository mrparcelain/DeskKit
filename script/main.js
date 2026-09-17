let currentMaxZ = 500;

function switchFocus(appElement) {
  if (!appElement) return;
  currentMaxZ++;
  appElement.style.zIndex = currentMaxZ;
}

document.addEventListener('pointerdown', (e) => {
  const app = e.target.closest('.app');
  if (app) {
    switchFocus(app);
  }
});