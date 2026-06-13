# qa.qu.edu.iq — Quality Assurance & University Performance Department

[![Hugo](https://img.shields.io/badge/Hugo-Extended-blue?logo=hugo)](https://gohugo.io/)
[![License](https://img.shields.io/github/license/qaduni/qa.qu.edu.iq)](LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/qaduni/qa.qu.edu.iq)](https://github.com/qaduni/qa.qu.edu.iq/commits/main)
[![Deploy](https://github.com/qaduni/qa.qu.edu.iq/actions/workflows/deploy.yml/badge.svg)](https://github.com/qaduni/qa.qu.edu.iq/actions/workflows/deploy.yml)

Bilingual (Arabic + English) Hugo website for the Quality Assurance and University Performance Department at Al-Qadisiyah University.


Content is managed through **Sveltia CMS** (Git-backed CMS that commits directly to this repository), and site search is powered by **Pagefind**.

## Technology Stack

* **Hugo Extended** — Content lives in `content/{ar,en}/`, configuration in `config/_default/`.
* **Pagefind (≥ 1.5)** — Client-side search with separate search bundles for News and Announcements.
* **Sveltia CMS** — Available at `/admin/`, configured via `static/admin/config.yml`.
* **qu.theme** — Hugo theme included as a Git submodule in `themes/qu.theme/`.

The site uses:

```toml
theme = "qu.theme"
```

in `config/_default/hugo.toml`.

For theme development (layouts, assets, shortcodes, partials, etc.), see:

```text
themes/qu.theme/README.md
```

This document focuses on site operation, content authoring, and deployment.

---

## Prerequisites

### Hugo Extended

Verify that Hugo is the Extended edition:

```bash
hugo version
```

The output must contain:

```text
extended
```

### Node.js and npm

Required for dependency management and Pagefind indexing.

### Installation

#### macOS

```bash
brew install hugo
```

#### Arch Linux

```bash
sudo pacman -S hugo
```

#### Debian / Ubuntu

```bash
sudo apt install hugo
```

> Ensure the installed package is the **Extended** version.

---

## Local Development

Because the theme is a Git submodule, clone the repository with submodules enabled:

```bash
git clone --recurse-submodules https://github.com/qaduni/qa.qu.edu.iq.git
cd qa.qu.edu.iq

npm ci
hugo server
```

The development server will be available at:

```text
http://localhost:1313
```

### Updating the Theme

```bash
git submodule update --remote themes/qu.theme
```

---

## Production Preview

To build the site exactly as it is built for deployment:

```bash
npm run build
npx serve public
```

---

## Project Structure

| Path                 | Description                                                |
| -------------------- | ---------------------------------------------------------- |
| `content/{ar,en}/`   | Markdown content by language                               |
| `themes/qu.theme/`   | Theme submodule (layouts, assets, scripts, fonts)          |
| `assets/images/`     | Hugo Pipe image assets                                     |
| `static/`            | Files served directly (`admin/`, images, robots.txt, etc.) |
| `data/`              | Structured site data (`colleges.yaml`, `statistics.yml`)   |
| `i18n/`              | Translation strings                                        |
| `config/_default/`   | Main site configuration                                    |
| `config/production/` | Production-only configuration overrides                    |

---

# Content Authoring

## News Articles

Create a file for each language:

```text
content/ar/media/news/2026-graduation-ceremony.md
content/en/media/news/2026-graduation-ceremony.md
```

Example front matter:

```yaml
---
title: "Graduation Ceremony 2026"
date: 2026-05-20
description: "Short summary shown in lists and Open Graph metadata."
important: false
---
```

### Fields

| Field         | Description                             |
| ------------- | --------------------------------------- |
| `title`       | Article title                           |
| `date`        | Publication date                        |
| `description` | Summary used in listings and metadata   |
| `important`   | Highlights the article in listing pages |

The remainder of the file is standard Markdown.

---

## Announcements

Announcements work exactly the same way:

```text
content/{ar,en}/media/announcements/
```

---

## Regular Pages

Create a Markdown file under:

```text
content/{ar,en}/<section>/<page>.md
```

The section uses `section.html`, while individual pages use `single.html`.

---

## Translation Strings

UI text is stored in:

```text
i18n/en.yaml
i18n/ar.yaml
```

Example:

```yaml
# i18n/en.yaml
welcome_message: "Welcome to Al-Qadisiyah University"
```

```yaml
# i18n/ar.yaml
welcome_message: "أهلاً وسهلاً بكم في جامعة القادسية"
```

Templates reference translations using:

```go
{{ i18n "welcome_message" }}
```

Always add new keys to both language files. Missing keys render as the key name.

---

# Content Management System

Sveltia CMS is served at:

```text
/admin/
```

Configuration file:

```text
static/admin/config.yml
```

### Backend

* GitHub-based workflow.
* Editors authenticate using GitHub accounts.
* Changes are committed directly to the `main` branch.
* Access is controlled through repository permissions.

### Validation

Field validation is enforced through CMS configuration.

Examples:

* Title length limits
* Description length limits (typically 30–160 characters)

---

# Search Architecture

The site uses **Pagefind** with isolated search indexes.

### Search Bundles

Two independent indexes are generated:

1. News
2. Announcements

This ensures that:

* News searches only return News content.
* Announcement searches only return Announcement content.

### Build Process

The build pipeline first generates the site with Hugo and then indexes both content types in parallel.

```bash
hugo --gc --minify && (
  npm run build:search-news &
  npm run build:search-ann &
  wait
)
```

The corresponding `list.html` template selects the appropriate search bundle:

```text
/pagefind-news/
/pagefind-announcements/
```

Legacy category and tag filters have been removed for a simpler and faster search experience.

---

# Configuration

Primary configuration files:

```text
config/_default/
```

Production overrides:

```text
config/production/
```

Frequently modified settings include:

### Base URL

```toml
baseURL = "https://example.com"
```

Update before deploying under a new domain.

### Contact Information

```toml
[params.contact]
```

Used in:

* Footer
* Structured data (JSON-LD)

### Social Links

```toml
[params.social]
```

Used in:

* Footer
* Structured data (JSON-LD)

### External Services

```toml
[params.externalServices]
```

Examples:

* Moodle
* Student Information System (SIS)
* Library services

---

# Deployment

Deployment is automated through GitHub Actions:

```text
.github/workflows/deploy.yml
```

### Build Steps

```bash
npm ci
npm run build
```

The workflow:

1. Installs dependencies.
2. Restores npm cache.
3. Installs Hugo Extended.
4. Builds the website.
5. Generates Pagefind indexes.
6. Publishes the generated `public/` directory to the deployment branch.

No manual deployment steps are required.
