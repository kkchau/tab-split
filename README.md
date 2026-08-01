# Tab Split

Photograph a receipt, let OCR pull out the line items, tick off who had what,
and see what everyone owes. No build step, no backend, no accounts. The image
never leaves the browser — recognition runs on the device.

## Hosting it on GitHub Pages

The repository root *is* the site, so there is nothing to build and no
workflow to run.

1. **Settings → Pages → Build and deployment → Source: Deploy from a branch.**
2. Pick the branch and folder `/ (root)`, then Save.
3. A minute later the site is at `https://<user>.github.io/<repo>/`. Every
   later push to that branch republishes it.

`.nojekyll` is what stops Jekyll from processing the site and swallowing any
underscore-prefixed path, so keep it.

<details>
<summary>Deploying with GitHub Actions instead</summary>

Only worth it if you later add a build step. Save this as
`.github/workflows/deploy-pages.yml`, then set **Source: GitHub Actions**:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .
      - id: deployment
        uses: actions/deploy-pages@v4
```

</details>

Every path in the app is relative, so a project page under
`https://<user>.github.io/<repo>/` works exactly like a site at a domain root —
the manifest, the service worker scope and the share target all land inside the
subdirectory.

You cannot set response headers on Pages, so caching is whatever Pages decides.
It does not matter much here: `sw.js` is network-first for the app shell, so a
reload picks up a new `index.html` as soon as one is served.

`/.well-known/` sits at the domain root rather than the project path, which
only matters for the APK route below.

## Other hosts

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
