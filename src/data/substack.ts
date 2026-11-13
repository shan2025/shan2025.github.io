// Shadin's Substack posts, read from its RSS feed at request time, so a new post shows up on the site
// (home page, Writing page, map and assistant) without touching any file here.
import { site } from './site';

export type SubstackPost = {
  title: string;
  excerpt: string;
  date: Date;
  href: string;
  slug: string; // the last part of the post's address, e.g. "the-future-of-the-world-is-analog"
  cover?: string;
  coverAlt: string;
  text: string; // the opening of the post as plain text, for the assistant
  external: true;
};

const decode = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// pull one tag's text out of an <item>: strip CDATA and HTML tags
const pick = (block: string, tag: string) => {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!m) return '';
  return decode(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
};
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…` : s);

// Each server instance keeps the feed for a few minutes, so busy moments don't hit Substack on every request.
let cache: { at: number; posts: SubstackPost[] } | undefined;
const FRESH_MS = 10 * 60 * 1000;

export async function substackPosts(timeoutMs = 2500): Promise<SubstackPost[]> {
  if (!site.substackFeed) return [];
  if (cache && Date.now() - cache.at < FRESH_MS) return cache.posts;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(site.substackFeed, { signal: ctrl.signal, headers: { 'user-agent': 'shadin.xyz' } });
    if (!res.ok) return cache?.posts ?? [];
    const xml = await res.text();
    const posts = xml
      .split(/<item>/)
      .slice(1)
      .map((chunk) => chunk.split('</item>')[0])
      .map((it): SubstackPost => {
        const href = pick(it, 'link');
        const text = pick(it, 'content:encoded');
        const subtitle = pick(it, 'description');
        return {
          title: pick(it, 'title'),
          // the post's subtitle, unless it's cut short; then the opening lines instead
          excerpt: cut(subtitle.length >= 60 ? subtitle : text || subtitle, 180),
          date: new Date(pick(it, 'pubDate') || Date.now()),
          href,
          slug: href.split('/p/')[1]?.replace(/[/?#].*$/, '') ?? '',
          // Substack puts the post's picture in an <enclosure> tag
          cover: it.match(/<enclosure[^>]*\burl="([^"]+)"/i)?.[1],
          coverAlt: '',
          text: cut(text, 700),
          external: true,
        };
      })
      .filter((p) => p.title && p.href);
    cache = { at: Date.now(), posts };
    return posts;
  } catch {
    return cache?.posts ?? []; // feed slow or unreachable: carry on with what we have
  } finally {
    clearTimeout(t);
  }
}

// Substack posts not already written up on the site (matched by title)
const key = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '');
export async function newSubstackPosts(localTitles: string[], timeoutMs?: number) {
  const local = new Set(localTitles.map(key));
  return (await substackPosts(timeoutMs)).filter((p) => !local.has(key(p.title)));
}
