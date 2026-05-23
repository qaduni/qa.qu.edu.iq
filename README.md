# qa.qu.edu.iq — Quality Assurance & University Performance Department

Bilingual (Arabic + English) Hugo site for the Quality Assurance and
University Performance Department at Al-Qadisiyah University. Content is
edited through **Sveltia CMS** (Git-backed, commits straight to this
repo) and the static site is searched with **Pagefind**.

- **Hugo extended** (asset pipeline + SCSS support required) — content
  in `content/{ar,en}/`, config in `config/_default/`.
- **Pagefind ≥ 1.5** — client-side search index, built after Hugo
  against `public/`.
- **Sveltia CMS** — served at `/admin/`, configured by
  `static/admin/config.yml`. Backend is GitHub: editors sign in with
  their GitHub account and their saves become commits on `main`.
- **Theme `qu.theme`** — pulled in as a **git submodule** at
  `themes/qu.theme/` from
  [`qaduni/qu.theme`](https://github.com/qaduni/qu.theme). Hugo finds it
  via its default `themes/` lookup (the site uses `theme = "qu.theme"`
  in `config/_default/hugo.toml`).

For HTML / CSS / JS / partials / shortcodes, see
[`themes/qu.theme/README.md`](themes/qu.theme/README.md). This README is
for **site authors and operators** — running the site, adding content,
deploying.

## Prerequisites

- Hugo, **extended** edition. Verify with `hugo version` — the output
  must contain the word `extended`.
- Node.js + npm (only used to run Pagefind).

```bash
brew install hugo            # macOS
pacman -S hugo               # Arch
sudo apt install hugo        # Debian/Ubuntu (must be the extended package)
```

## Local development

The theme is a git submodule, so clone with `--recurse-submodules` (or
run `git submodule update --init --recursive` in an existing clone)
before doing anything else — otherwise `themes/qu.theme/` will be empty
and `hugo` will fail to find layouts.

```bash
git clone --recurse-submodules https://github.com/qaduni/qa.qu.edu.iq
cd qa.qu.edu.iq
npm install                  # one-time — pulls Pagefind
hugo server                  # live-reload dev server at http://localhost:1313
```

To pull theme updates later:

```bash
git submodule update --remote themes/qu.theme
```

For a production-shaped preview **with search**:

```bash
hugo --gc --minify
npx pagefind --site public
npx serve public             # or any static server
```

`npm run dev` runs `hugo server`; `npm run build` runs
`hugo --gc --minify && pagefind --site public`. Either is fine — the
explicit commands above are equivalent.

## Project layout

| Path | What lives there |
| ---- | ---------------- |
| `content/{ar,en}/` | Markdown content, per language |
| `themes/qu.theme/` | Submodule — layouts, CSS, JS, fonts, theme images |
| `assets/images/` | Site images served via Hugo Pipes (logo, hero) |
| `static/` | Files served as-is at the URL root (`admin/`, `robots.txt`, `sw.js`, `images/news/`, `images/announcements/`) |
| `data/` | Site data (`colleges.yaml`, `statistics.yml`) |
| `i18n/` | UI strings (`ar.yaml`, `en.yaml`) |
| `config/_default/` | Site config — `hugo.toml`, `params.toml`, `menus.{ar,en}.toml`, `minify.toml` (annotated inline) |
| `config/production/` | Production-only overrides (merged on top of `_default`) |
| `pagefind.yml` | Search index config |

## Authoring content

### Add a news article

Create the file in each language you have content for:

```
content/ar/media/news/2026-graduation-ceremony.md
content/en/media/news/2026-graduation-ceremony.md
```

Frontmatter:

```yaml
---
title: "Graduation ceremony 2026"
date: 2026-05-20
description: "Short summary shown in the list and as the OG description."
type: news              # one of: news, academic, administrative, students, general
important: false        # set true to flag as "Important" in the list view
image: /images/news/grad-2026.webp   # optional cover; put the file in static/images/news/
---

Body content as Markdown.
```

Announcements work identically under `content/{ar,en}/media/announcements/`.

### Add a regular page

Drop a `.md` under `content/{ar,en}/<section>/<page>.md`. The parent
section uses `section.html` (a card grid of children) and the page uses
`single.html`.

### Translate or add a UI string

Strings displayed by the templates live in `i18n/ar.yaml` and
`i18n/en.yaml`:

```yaml
# i18n/en.yaml
welcome_message: "Welcome to Al-Qadisiyah University"
```

```yaml
# i18n/ar.yaml
welcome_message: "أهلا وسهلا بكم في جامعة القادسية"
```

Templates use them as `{{ i18n "welcome_message" }}`. Always add the key
to **both** files — a missing key renders as the key name in the output.

## Content editor (CMS)

Sveltia CMS is served at `/admin/`. Config: `static/admin/config.yml`.

- Backend: **GitHub** — commits go straight to `qaduni/qa.qu.edu.iq`
  on `main`. Editors sign in with their GitHub account; access is
  managed via repo permissions.
- Media uploads land in an S3-compatible bucket (Garage). Credentials
  are injected at deploy time — **never** commit them to
  `static/admin/`, the file is served publicly at `/admin/config.yml`.

> **TODO(CR-03)** — the production CMS's media-upload path is currently
> non-functional: `static/admin/config.yml` declares an endpoint /
> bucket / region for Garage but no deploy-time auth proxy exists to
> mint a short-TTL access-key / secret-access-key pair into the browser,
> so the SigV4 signer has no credentials. Options on the table:
> build-time substitution of secrets (rejected — `config.yml` is
> public), a Cloudflare Worker that returns short-TTL session creds, or
> presigned PUT URLs minted by GitHub Actions. Until one of these is
> wired up, editors can author text content but cannot upload images
> through the production CMS. The local-dev variant at `/admin/local/`
> works fine because `garage/bootstrap.sh` seeds the secret into
> `localStorage`. See REVIEW.md / CR-03 for the full discussion.

## Search (Pagefind)

Pagefind only indexes news + announcements (the `glob` line in
`pagefind.yml`). It runs **after** Hugo against the built site:

```bash
hugo --gc --minify
npx pagefind --site public
```

The on-page UI is the Pagefind 1.5 Component UI, loaded by
`themes/qu.theme/layouts/media/news/list.html`. RTL and translations
are handled automatically from `<html lang>` and `<html dir>`.

If you add fields that should be filterable or searchable, see the
"Pagefind conventions" section in the theme README.

## Configuration knobs

Config lives in `config/_default/` (split across `hugo.toml`,
`params.toml`, `menus.{ar,en}.toml`, `minify.toml`) with production
overrides in `config/production/`. Files are heavily annotated inline.
The settings most often touched:

- `baseURL` — change before deploying behind a new domain.
- `[params.contact]` — email, phone, address shown in the footer and
  used by JSON-LD `contactPoint`.
- `[params.social]` — social media URLs (footer + JSON-LD `sameAs`).
- `[params.externalServices]` — Moodle, SIS, library, etc. (top bar +
  services section).
- `campusMapEmbed` — Google Maps embed URL used by the
  `{{< google-map >}}` shortcode on contact pages.

Logo and hero image URLs are **not** params — they're resolved through
the theme's `site-assets.html` partial. See the theme README.

## Deployment

The site is a plain static build of `public/`:

```bash
hugo --gc --minify
npx pagefind --site public
# Belt-and-braces: hugo.toml already excludes static/admin/local/ from
# production builds (see CR-01 in REVIEW.md), but this rm catches the
# case where someone runs `hugo --environment development` then deploys
# the output. Cheap and safe — the directory is local-dev tooling only.
rm -rf public/admin/local
# upload public/ to your static host
```

When configuring the host:

- Serve `manifest.webmanifest` with `Content-Type: application/manifest+json`.
- Long cache headers (`max-age=31536000, immutable`) for `/fonts/`,
  `/css/bundle.*.css`, `/js/main.*.js` — they're content-hashed by Hugo.
- Short or no cache for top-level HTML.
- Production-deploy check: verify `public/admin/local/` is empty or
  absent before uploading. It should contain a Garage Secret Access Key
  if `bootstrap.sh` was run locally; never publish it.
