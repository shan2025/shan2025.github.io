# shadin.xyz

Personal website of Muhammed Shadin A, built with [Astro](https://astro.build).
A clean, white site with large light type. The home page opens on an interactive **map of ideas**:
every point is something on the site (projects, posts, products, interests), and visitors can drag points,
click one to read about it, and drop one point on another to make their own connection (saved only in their browser).

The map builds itself from the content files, so a new post or project appears on it automatically.
The extra cross-links between points (for example FinChat ↔ AI agents) are listed in `src/pages/index.astro`
under `links`; add a line there to connect two points.

## A colour for every visit

Each visit shows the next colour mood: blue on someone's first visit, gold on the second, then emerald,
then monochrome, then round again. One visit keeps one colour across pages. The colours live in
`src/styles/global.css` (`:root` is gold, the others are `[data-theme=...]` blocks), and the order is in the
small script at the top of `src/layouts/Base.astro`. To see all four side by side, open `/themes/`;
add `?theme=ice` (or `amber`, `emerald`, `mono`) to any address to force one.

## The AI assistant

The "Ask anything about Shadin" box sends questions to `src/pages/api/chat.ts`, a small server function that
calls a free AI model and answers only from the facts in `src/data/knowledge.ts` and the writing files.
Your API key stays on the server and is never sent to visitors' browsers.

1. Get a free key at https://console.groq.com (the same kind FinChat uses).
2. For local testing, copy `.env.example` to `.env` and paste the key after `AI_API_KEY=`.
3. On Vercel, add `AI_API_KEY` under **Settings → Environment Variables**, then redeploy.

Without a key, or when the free daily quota runs out, the box still answers from short built-in notes in
`src/scripts/chat.js` and says so. To use another provider (Gemini, OpenRouter, ...), set `AI_BASE_URL` and
`AI_MODELS` as shown in `.env.example`. Keep `knowledge.ts` up to date: the assistant knows only what's written there.

## Run it on your computer

```bash
npm install
npm run dev
```

Then open http://localhost:4321. Changes appear as you save files.

## Add or change content

Everything you will edit regularly is a plain text file. You never need to touch the design to publish.

| To change | Edit |
| --- | --- |
| Name, email, links, Substack, interests (each one is a point on the map), résumé list | `src/data/site.ts` |
| A new blog post | Add a `.md` file to `src/content/writing/` (copy an existing one) |
| A project in "Work, filed" | `src/content/work/*.md` |
| A product to sell | `src/content/products/*.md` (set `buyUrl` to a Gumroad, Lemon Squeezy or Stripe Payment Link) |
| The résumé PDFs | Replace the files in `public/resume/` (keep the same names) |
| The home page text | `src/pages/index.astro` |

A new post needs this at the top of the file, then the text below it:

```
---
title: Your title, short enough for two lines
excerpt: One or two sentences shown on the card.
date: 2026-11-01
---
```

Set `draft: true` to keep a post off the site while you write it.

### Still to fill in

- `src/content/products/next-product.md`: your next product. It stays hidden while `placeholder: true`; set that to `false` once it's real.
- `src/data/site.ts`: your Substack address and the full list of interests.

## Publish it on shadin.xyz

1. Put this folder on GitHub (a new repository).
2. Sign in to [Vercel](https://vercel.com) with GitHub, choose **Add New → Project**, pick the repository and press **Deploy**. Vercel detects Astro by itself.
3. In the Vercel project, open **Settings → Domains** and add `shadin.xyz` and `www.shadin.xyz`.
4. Vercel then shows the DNS records it needs. In GoDaddy, open **My Products → shadin.xyz → DNS**, and add exactly those records (usually an `A` record for `@` and a `CNAME` for `www`). Remove GoDaddy's default parking `A` record for `@` if there is one.
5. Wait for DNS to update (minutes to a few hours). Vercel adds HTTPS automatically.

After that, every change you push to GitHub goes live by itself.
