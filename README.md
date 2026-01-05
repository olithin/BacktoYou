# Lada (Cloudflare Pages static site) — 3 languages (EN/RU/EL)

This is a **static** Vite + React site designed to be deployed to **Cloudflare Pages**.

## What you get

- Public site:
  - English: `/en`
  - Russian: `/ru`
  - Greek: `/el`
- Admin panel (no auth, local demo):
  - `/en/admin`, `/ru/admin`, `/el/admin`
- Content is loaded from `public/content.json` (a **bundle** with 3 locales).
- Local edits are stored in the browser (`localStorage`).
- To publish edits to Cloudflare Pages:
  1) Open `/en/admin` (or `/ru/admin`, `/el/admin`)
  2) Edit content
  3) Click **Export JSON**
  4) Replace `public/content.json` in the repo with the exported file
  5) Push, Cloudflare builds and deploys.

## Requirements

- Node.js 18+ (20+ recommended)

## Run (dev)

```bash
npm i
npm run dev
```

- Site: http://localhost:5173/en
- Admin: http://localhost:5173/en/admin

## Cloudflare Pages settings

- Build command: `npm run build`
- Output folder: `dist`

> SPA routing is handled by `public/_redirects` (all routes → `/index.html`).

## Content format

`public/content.json`:
```json
{
  "defaultLocale": "en",
  "locales": ["en","ru","el"],
  "content": {
    "en": { "...": "..." },
    "ru": { "...": "..." },
    "el": { "...": "..." }
  }
}
```
