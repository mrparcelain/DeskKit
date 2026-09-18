


# <img src="https://i.ibb.co/zHXPhHwv/deskkit.png" alt="drawing" width="170"/>

**Desk Kit** is a web-based desktop & mobile template for your website that looks and feels like a computer, inspired by 2010s desktop UI. Every app opens in its own window, each one is just a folder of HTML, CSS and JavaScript you can edit yourself. 
Test it [here](https://hex2c69d3.com/deskkit)!

![This is what the desktop looks like!](https://i.imgur.gg/6WzO46O-deskkit.png)

You don't need any build tools!

## What's in here

* A desktop with wallpaper, clock, draggable icons and windows.
* A couple of stock apps: Music and Photos.
* Template apps (Pages, Videos, Articles) to fill in or delete.
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
# I personally use the Live Server extension in VS Code
```

PHP is only needed if you want the editor to publish changes back to the JSON
files. Everything else is static and works on GitHub Pages, Neocities or plain
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
it yourself. 

`developer/README.md` has the details.

## What third party stuff this project uses

* jQuery and jQuery UI (`script/draggable.js`), MIT licensed.
* Inter, loaded from rsms.me.
* Panzoom, loaded from unpkg.com for zooming in the Photos viewer. It is
  optional: the viewer still works if the CDN is unreachable.
* ABC Areal (`fonts/`), used for headings.

## Licence

MIT, see `LICENSE`. The sample audio, images and any content you add are yours
and are not covered by it.
