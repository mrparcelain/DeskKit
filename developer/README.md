# Developer · Music + Photo libraries

Open `/developer/` to edit what the desktop apps show. Use the **Music / Photos**
switch in the header to pick a section.

| Section | Tables                      | File it edits             | Desktop app |
| ------- | --------------------------- | ------------------------- | ----------- |
| Music   | Artists · Releases · Tracks | `apps/music/music.json`   | Music       |
| Photos  | Libraries · Albums · Photos | `apps/photos/photos.json` | Photos      |

- **Add** records with the blue button (or the "+" row under the table).
  Click a row to edit it.
- **Reorder** artists or photo libraries by dragging a row by its handle.
- **Delete**: click **Select**, tick the rows, then choose **More → Delete**.
  You can undo a delete right after.
- **Photos**: an album belongs to a library and a year. You can add several
  photos at once (drop them in, browse, or paste links). The first photo is the
  album cover, and a library's cover is its newest album's first photo.

Apps you build yourself (see `apps/README.md`) don't show up here - they
read their own files, which you edit by hand.

## How saving works

- **Every change is saved in your browser right away.** The Music and Photos
  apps on the desktop (in the same browser) show your changes immediately, so
  you can preview before publishing.
- **Publish** sends the section you're in to `api/upload.php`, which replaces
  `apps/music/music.json` or `apps/photos/photos.json` for everyone. The previous file is
  kept next to it as `music.backup.json` / `photos.backup.json`.
- **More → Download** gives you the file to upload by hand (use this on hosts
  without PHP, like GitHub Pages).

## Sample content

Both libraries start with made-up sample content (files in `apps/music/sample/`
and `apps/photos/sample/`). To clear it: **Select** → tick all rows →
**More → Delete**, in each section. Delete the `sample` folders once nothing
uses them.

## Setting up the API (Publish + image uploads)

Publishing needs a host that runs **PHP 7.4+** (with the `fileinfo`
extension). Locally, `php -S localhost:8000` from the project folder works.

1. **Make a key** - a long random string of letters and numbers:

   ```
   php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
   ```

2. **Add it to `api/key.env`** (empty by default, which keeps publishing off):

   ```
   API_KEY=your-long-random-key
   ```

   Don't commit a real key to a public repository.

3. **Allow writes** - PHP must be able to write to `apps/music/`,
   `apps/photos/` and `api/` (it creates `api/uploads/`). Use `755` if your host
   asks.

4. **Connect the editor** - open `/developer/`, click the settings icon, paste
   the key. Leave *API endpoint* empty unless you moved the `api` folder.

5. **Publish** - the status turns to *Up to date* when it worked.

`api/.htaccess` blocks the key file from being downloaded on Apache hosts. On
other servers (e.g. Nginx), deny access to `*.env` in your server config.

| Message | Fix |
| ------- | --- |
| The API key was rejected | Key in Settings doesn't match `api/key.env` |
| API key not configured | `api/key.env` is empty on the server |
| No API found / Couldn't reach the API | No PHP - use More → Download instead |
| Failed to save JSON | Folder permissions (step 3) |

Without a key, images you add are resized and stored inline in the JSON
instead of being uploaded. That's fine for a few, but browser storage fills up
quickly with lots of photos - set up the key before bulk uploads.

## Audio

`upload.php` only accepts images, so tracks use an audio **link**: put files
in e.g. `media/audio/` and use `../media/audio/song.mp3`, or paste a link from
an audio host. The length is filled in automatically when the file allows it.
