# Apps

Every icon on the desktop is an app: a folder in here. The desktop reads
`apps.json`, makes an icon for each app listed, and builds the app's window
the first time it's opened. You never have to touch `desktop/index.html` to
add one.

```
apps/
├── apps.json          ← which apps are on the desktop, in order (3 per row)
├── _starter/          ← copy this to make a new app
├── welcome/           ← the guide that opens on a visitor's first visit
├── music/
│   ├── app.json       ← name, icon, window size, files to load
│   ├── index.html     ← what goes inside the window
│   ├── style.css
│   ├── script.js
│   ├── music.json     ← the app's data (edited by /developer)
│   ├── sample/        ← placeholder audio + covers (replace with your own)
│   ├── icon.png
│   └── assets/        ← images only this app uses
├── photos/            ← same idea
└── pages/ videos/ articles/   ← tiny "folder" apps: just app.json + index.html
```

## Make your own app in 4 steps

1. Copy `_starter` and rename the copy, e.g. `apps/guestbook`.
   Use lowercase letters, numbers and dashes - this name is the app's id.
2. Add it to `apps.json`: `["music", "photos", "guestbook", ...]`.
3. Change the id in `script.js` to match the folder:
   `Desktop.app('guestbook', ...)`.
4. Edit `app.json` (name, icon, window size), then build the app in
   `index.html`, `style.css` and `script.js`.

Refresh the desktop and double-click your new icon.

> The site has to be opened through a web server (your host, or locally with
> e.g. `php -S localhost:8000` or VS Code's Live Server). Opening
> `desktop/index.html` straight from your files won't load apps.

## app.json

```json
{
  "name": "Guestbook",
  "icon": "icon.png",
  "window": {
    "width": "32rem",
    "height": "22rem",
    "minWidth": "20rem",
    "minHeight": "14rem",
    "resizable": true
  },
  "html": "index.html",
  "styles": ["style.css"],
  "scripts": ["script.js"],
  "openOnStart": false
}
```

| Field      | What it does | Default |
| ---------- | ------------ | ------- |
| `name`     | Icon label and window title | folder name |
| `icon`     | Desktop icon, relative to the app folder. Shared icons work too: `"../../ui/icon/folder.png"` | `icon.png` |
| `window`   | Starting size. Use `rem` (1rem = 16px). The window never gets bigger than the screen. `height` can be `"auto"`. | 40rem × 28rem |
| `html`     | File placed inside the window | `index.html` |
| `styles`   | CSS files, loaded before the HTML | none |
| `scripts`  | JS files, loaded in order after the HTML. Use `{ "src": "https://...", "optional": true }` for a CDN library the app can work without. | none |
| `mobile` | Phone layout - see [Phones](#phones) below. `false` hides the app on phones. | desktop files, full-screen |
| `openOnStart` | Open the app automatically when the desktop loads. Visitors can turn it off with `Desktop.setOpenOnStart(id, false)` (the Welcome app has a checkbox for this). | `false` |

## index.html

Just the content of the window - no `<html>`, `<head>` or `<body>`, and no
title bar (the desktop adds that).

- Relative paths like `src="assets/cover.jpg"` point into your app folder.
- Inline `<script>` tags don't run. Put JavaScript in `script.js`.
- Add `data-image-menu` to an element to give its images the right-click
  menu (Open / Set as Background / Download).
- Want a quick placeholder? Use the built-in empty state:

  ```html
  <div class="app-empty">
      <strong>Nothing here yet</strong>
      <span>Coming soon.</span>
  </div>
  ```

## style.css

Styles load for the whole page, so prefix your class names with the app
name (`.guestbook-list`, `.guestbook-button`) so they don't affect other apps.
`url()` paths are relative to the CSS file.

You can use the desktop's design tokens from `css/desktop.css`:

| Tokens | Values |
| ------ | ------ |
| `--text-2xs` ... `--text-xl` | 11px ... 22px |
| `--space-1` ... `--space-6` | 4px ... 32px |
| `--ui-font`, `--hairline`, `--window-radius` | font, 1px border, corner radius |

Useful shared classes: `.pane-padding`, `.section-title`, `.section-rule`,
`.maininfobox` (a full-height grid area), `.app-empty`.

## script.js

```js
Desktop.app('guestbook', ({ body, url, onOpen, onClose, close, setTitle }) => {
  const list = body.querySelector('.guestbook-list');

  fetch(url('entries.json'))
    .then((res) => res.json())
    .then((entries) => { /* ... */ });

  onOpen(() => { /* every time the window opens */ });
  onClose(() => { /* every time it closes - e.g. pause audio */ });
});
```

The function runs once, the first time the window opens, after
`index.html` is inside it. Closing a window only hides it, so everything keeps
its state until the page is reloaded.

| You get | |
| ------- | - |
| `body` | Element holding your `index.html`. Search inside it (`body.querySelector`). |
| `window` | The whole window element. |
| `url(path)` | Full URL of a file in your app folder. Use it for `fetch`, images you create in JS, audio... |
| `onOpen(fn)` / `onClose(fn)` | Run code whenever the window opens / closes. |
| `close()` | Close the window. |
| `setTitle(text)` | Change the title bar text. |
| `mode` / `onModeChange(fn)` | Which layout this copy of the app belongs to (`'desktop'` or `'mobile'`), and a callback that gets the new mode whenever the page switches (e.g. pause audio). |

Available anywhere:

| | |
| - | - |
| `Desktop.open('music')` | Open (or focus) an app. |
| `Desktop.close('music')` | Close an app. |
| `Desktop.url('music', 'music.json')` | URL of a file in any app folder. |
| `Desktop.apps` | List of `{ id, name }` for every app on the desktop. |
| `Desktop.opensOnStart(id)` / `Desktop.setOpenOnStart(id, on)` | Read / change (for this visitor) whether an app opens on load. |
| `Desktop.createWindow({ title, width, height, resizable, onClose })` | An extra window. Returns `{ el, body, setTitle, close, focus }`. The Photos app uses this for its photo viewer. |
| `Desktop.mode` | `'desktop'` or `'mobile'`. |
| `desktop:modechange` event | Fired on `document` when the layout switches; `event.detail.mode` is the new mode. |
| `desktop:ready` event | Fired on `document` once all icons are on the desktop. |

You can link straight to an app with `desktop/index.html#photos` - the
window opens as soon as the desktop loads.

## Phones

When the screen is narrower than **47.5rem (760px)** the same page switches to
a phone layout: a row of tabs (one per app) with the chosen app full-screen
underneath. It switches back and forth live as the window is resized - there
is no separate mobile page. The breakpoint is `MOBILE_QUERY` in
`script/desktop.js` and the "Mobile" section of `css/desktop.css`; keep the
two in sync if you change it.

An app without a `mobile` block shows its normal
`index.html` full-width, and its `Desktop.app` function runs as usual. Use
container queries (`@container`) or `html.is-mobile ...` selectors in your CSS
to tidy it up for small screens.

To give an app its own phone UI, like Music and Photos do:

```json
"mobile": {
  "html": "mobile.html",
  "styles": ["mobile.css"],
  "scripts": ["mobile.js"],
  "titlebar": false
}
```

```js
Desktop.mobileApp('guestbook', ({ body, url, onOpen, onClose, onModeChange }) => {
  // same helpers as Desktop.app; body holds mobile.html
});
```

- `titlebar: false` hides the small title under the tabs, for apps that draw
  their own header.
- `"mobile": false` leaves the app out of the phone layout entirely.
- The desktop window and the phone view can both exist in the same page
  (after a resize), so **always search inside `body`** rather than using
  `document.getElementById`, and prefix mobile classes too (Music uses `.mm-`,
  Photos `.mp-`).
- Use `onModeChange` to pause anything playing in the layout that's no longer
  visible.
- The `/developer/` editor is computer-only; on a phone it shows a notice.

## Removing or reordering apps

Edit `apps.json`. Apps not listed there don't appear (their folders can stay).
The icon grid fills left to right, 3 per row - change `--icons-per-row` in
`css/desktop.css` for a different number.
