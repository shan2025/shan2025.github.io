// The list of pages search engines should know about. Built from the content files, so new
// posts and projects are added on their own. (/themes/ is left out on purpose.)
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '../data/site';

export const GET: APIRoute = async () => {
  const work = await getCollection('work', ({ data }) => !data.placeholder);
  const writing = await getCollection('writing', ({ data }) => !data.draft);
  const urls = [
    { path: '/' },
    { path: '/writing/' },
    { path: '/resume/' },
    ...work.map((w) => ({ path: `/work/${w.id}/` })),
    ...writing.map((p) => ({ path: `/writing/${p.id}/`, lastmod: p.data.date.toISOString().slice(0, 10) })),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${new URL(u.path, site.url)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
