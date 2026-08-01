# Split the Tab

Photograph a receipt, let OCR pull out the line items, tick off who had what,
and see what everyone owes. No build step, no backend, no accounts. The image
never leaves the browser — recognition runs on the device.

## Hosting it on GitHub Pages

The repository root *is* the site, so there is nothing to build.

1. Push this branch and merge it (or make it the default branch).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. The `Deploy to GitHub Pages` workflow runs on every push and publishes to
   `https://<user>.github.io/<repo>/`.

To deploy without Actions instead, set **Source: Deploy from a branch**, pick
the branch and `/ (root)`. The `.nojekyll` file is what stops Jekyll from
swallowing `_headers` and any future underscore-prefixed paths, so keep it
either way.

Every path in the app is relative, so a project page under
`https://<user>.github.io/<repo>/` works exactly like a site at a domain root —
the manifest, the service worker scope and the share target all land inside the
subdirectory.

### Two things GitHub Pages does not do

- **`_headers` is ignored.** It is a Netlify file, kept here so that host also
  works. Pages sends its own caching headers; `sw.js` is network-first for the
  app shell, so a reload picks up a new `index.html` anyway. If a stale copy
  sticks, use Settings → Force update in the app.
- **`/.well-known/` sits at the domain root, not the project path.** That only
  matters for the APK route below.

## Other hosts

**Netlify** — drag the folder onto https://app.netlify.com/drop.
**Cloudflare Pages / Vercel / S3** — upload as a static site, no framework
preset, no build command, output directory `.`.

## Run it locally

    python3 -m http.server 8080

Then open `http://localhost:8080`. Chrome treats localhost as a secure origin,
so text recognition and installation both work.

## Make an APK

1. Deploy to any https URL above.
2. Go to https://www.pwabuilder.com, paste the URL, pick Android.
3. Download the package and install the APK, or upload the AAB to Play.

PWABuilder writes the Digital Asset Links file for you; drop the
`assetlinks.json` it gives you at `/.well-known/assetlinks.json` on the host so
the app opens without a browser address bar. On a GitHub Pages *project* site
that file has to live at the domain root, which means a `<user>.github.io`
repository or a custom domain.

Command-line equivalent:

    npx @bubblewrap/cli init --manifest https://YOUR-URL/manifest.webmanifest
    npx @bubblewrap/cli build

## Fully offline, no CDN

The OCR engine is fetched once from jsDelivr and then cached by the service
worker. On startup the app makes one `HEAD` request for
`vendor/tesseract.min.js` and falls back to the CDN when it 404s — that failed
request in the console is expected. To remove the CDN dependency, create a
`vendor/` folder next to `index.html`:

    vendor/tesseract.min.js      from tesseract.js@5.1.1/dist/
    vendor/worker.min.js         from tesseract.js@5.1.1/dist/
    vendor/core/                 contents of tesseract.js-core@5.1.1
    vendor/lang/eng.traineddata.gz   from tessdata.projectnaptha.com/4.0.0/

You can also set the paths by hand under Settings.

## Files

    index.html                    the entire app
    sw.js                         offline cache + share-target handler
    manifest.webmanifest          install metadata
    icons/                        app icons
    .nojekyll                     serve files as-is on GitHub Pages
    .github/workflows/            Pages deploy
    _headers                      Netlify cache rule; ignored by Pages
