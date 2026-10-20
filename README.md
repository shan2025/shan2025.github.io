# Personal website

My portfolio and blog, built with [Next.js](https://nextjs.org) and deployed to GitHub Pages as a static site.

## Edit the content

| What | Where |
| --- | --- |
| Name, bio, skills, links, projects | `data/site.js` |
| Blog posts | `content/posts/*.md` |
| Colors and styling | `app/globals.css` (variables at the top) |

### Writing a blog post

Create a file in `content/posts/`, for example `content/posts/my-first-model.md`. The file name becomes the URL (`/blog/my-first-model/`).

```md
---
title: What I learned training my first model
date: 2026-11-01
excerpt: One sentence shown in the post list.
tags: [ml, python]
---

Your post, written in Markdown.
```

Add `draft: true` to the front matter to hide a post without deleting it.

## Run it locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static site written to ./out
```

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes it to GitHub Pages.

One-time setup: in the repository on GitHub, go to **Settings → Pages** and set **Source** to **GitHub Actions**.

### Custom domain (optional)

1. Add a file `public/CNAME` containing just your domain, e.g. `www.example.com`.
2. In **Settings → Pages → Custom domain**, enter the same domain.
3. At your domain registrar, add a `CNAME` record for `www` pointing to `shan2025.github.io`.
