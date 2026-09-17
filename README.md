# Desk Kit

A personal site that works like a desktop computer. Icons sit on a wallpaper,
double-clicking one opens it in a draggable window, and every app is a plain
folder of HTML, CSS and JavaScript. No build step, no framework, no bundler:
put the files on a web server and it runs.

On a narrow screen the same page turns into a phone layout, with one tab per
app and each app full screen. It switches back when the window gets wider.

## What is in the box

* A desktop with wallpaper, clock, draggable icons and windows.
* A Music app: artists, releases, a track list and a player, plus a separate
  phone layout with lock screen controls.
* A Photos app: libraries, albums by year, a grid and a zoomable viewer, again
  with its own phone layout.
* Empty "folder" apps (Pages, Videos, Articles) to fill in or delete.
* A Welcome app that explains how the whole thing works from inside the site.
* `/developer/`: a spreadsheet style editor for the Music and Photos data, with
  optional publishing through a small PHP API.

## Requirements

Any web server. The apps are loaded with `fetch`, so opening `desktop/index.html`
straight from the file system will not work. During development:

```
php -S localhost:8000
# or
python3 -m http.server 8000
# or the Live Server extension in VS Code
```

PHP is only needed if you want the editor to publish changes back to the JSON
files. Everything else is static and works on GitHub Pages, Netlify or plain
shared hosting.

## Quick start

1. Serve the folder and open `/desktop/`. The Welcome app opens with a short
   guide.
2. Replace `media/img/default.webp` (wallpaper), `media/svg/logo.svg` and the
   titles and meta tags in `index.html` and `desktop/index.html`.
3. Put your own music and photos in `apps/music/music.json` and
   `apps/photos/photos.json`, either by hand or through `/developer/`.
4. Copy `apps/_starter` to make an app of your own and add its folder name to
   `apps/apps.json`.
5. Rewrite or remove `apps/welcome` when the site is yours.

## Layout

```
index.html            Landing page
desktop/index.html    The desktop itself
apps/                 One folder per app (see apps/README.md)
developer/            Editor for the Music and Photos data
api/                  PHP endpoints used by the editor
css/desktop.css       Windows, icons, phone layout and design tokens
css/pc.css            Fonts, clock, icon labels, scrollbars
script/desktop.js     App loader, windows and phone layout (the Desktop object)
script/contextmenu.js Right-click menu for images
script/draggable.js   jQuery and jQuery UI, used to drag the desktop icons
ui/ media/ fonts/     Interface images, wallpaper and logo, web fonts
blank/                A static page that shows the window styles on their own
```

## Writing an app

An app is a folder with an `app.json` and whatever files it needs:

```json
{
  "name": "Guestbook",
  "icon": "icon.png",
  "window": { "width": "32rem", "height": "22rem" },
  "html": "index.html",
  "styles": ["style.css"],
  "scripts": ["script.js"]
}
```

```js
Desktop.app('guestbook', ({ body, url, onOpen, onClose }) => {
  const list = body.querySelector('.guestbook-list');
  fetch(url('entries.json')).then((res) => res.json()).then(render);
});
```

Add `"mobile": { ... }` and `Desktop.mobileApp(id, setup)` for a separate phone
layout, or leave it out and the normal files are used full width.
`apps/README.md` documents every field and everything the `Desktop` object
offers.

## The editor

`/developer/` edits `apps/music/music.json` and `apps/photos/photos.json` in the
browser. Changes are kept in local storage until you publish them, and the page
is meant for a computer, not a phone.

Publishing needs PHP and a key:

1. `cp api/key.env.example api/key.env`
2. Generate a key: `php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"`
3. Put it in `api/key.env` as `API_KEY=...`
4. Paste the same key into the editor settings (the sliders icon).

`api/key.env` is git-ignored, and the API refuses to run while the key is empty.
Without PHP you can still edit in the browser and download the JSON, then commit
it yourself. `developer/README.md` has the details.

## Third party files

* jQuery and jQuery UI (`script/draggable.js`), MIT licensed.
* Inter, loaded from rsms.me.
* Panzoom, loaded from unpkg.com for zooming in the Photos viewer. It is
  optional: the viewer still works if the CDN is unreachable.
* ABC Areal (`fonts/`), used for headings.

## Licence

MIT, see `LICENSE`. The sample audio, images and any content you add are yours
and are not covered by it.
