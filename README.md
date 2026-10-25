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

## The chess board

Below the map, a chess set drawn in hairlines, after Lucas Markes's [Hairline](https://github.com/lucasmarkes/hairline)
figures (three.js, in `src/scripts/board-scene.js`), holds six sides of the work, one per
kind of piece: rooks are projects, the queen is AI, bishops are product, pawns are data, knights are growth and the
king is me. The list, and what each side says, is `boardSides` in `src/pages/index.astro`.
It sets itself up as you scroll to it (the board settles, the pieces fall onto it one after another), and the
pieces lift off again if you scroll back, until a game has started.

**Play me** starts a game against my AI (`src/scripts/chess-ai.js`), which plays at roughly 800–900, about my
Chess.com rapid rating. It plays in my style from `src/data/chess-style.json`: the moves I play in the opening, from
either side, and how my habits differ from my opponents' (more checks, kingside castling, an early queen less often).
That file is made from my games on Chess.com (`lionheartfc`): download them as one PGN (open
https://api.chess.com/pub/player/lionheartfc/games/archives and fetch each month's `/pgn`), then run
`node scripts/chess-style.mjs path/to/games.pgn`. The rules come from `chess.js`, pinned to an exact version because
the AI's search uses its internal move functions.

## The AI assistant

The "Ask anything about Shadin" box sends questions to `src/pages/api/chat.ts`, a small server function that
calls **DeepSeek** (`deepseek-chat`) and answers only from the facts in `src/data/knowledge.ts` and the writing
files. Your API key stays on the server and is never sent to visitors' browsers.

1. Get a key at https://platform.deepseek.com/api_keys and add a small amount of credit (DeepSeek is
   pay-as-you-go and very cheap; the credit you add is the most the site can ever spend).
2. For local testing, copy `.env.example` to `.env` and paste the key after `AI_API_KEY=`.
3. On Vercel, add `AI_API_KEY` under **Settings → Environment Variables**, then redeploy. That's the only
   setting needed.

Without a key, or if DeepSeek can't be reached or the credit runs out, the box still answers from short
built-in notes in `src/scripts/chat.js` and says so. To use another OpenAI-compatible provider instead (for
example Groq's free tier), set `AI_BASE_URL` and `AI_MODELS` as shown in `.env.example`. Keep `knowledge.ts` up
to date: the assistant knows only what's written there.

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
