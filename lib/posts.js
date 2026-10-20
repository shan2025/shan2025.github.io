import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

const postsDir = path.join(process.cwd(), "content", "posts");

// Minimal front matter parser: `key: value` lines between two `---` fences.
// `tags` may be written as `tags: [a, b]` or `tags: a, b`.
function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    data[key] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  data.tags = (data.tags || "")
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  data.draft = data.draft === "true";
  return { data, body: match[2] };
}

export function getAllPosts() {
  if (!fs.existsSync(postsDir)) return [];

  return fs
    .readdirSync(postsDir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const slug = file.replace(/\.md$/, "");
      const { data, body } = parseFrontMatter(fs.readFileSync(path.join(postsDir, file), "utf8"));
      return {
        slug,
        title: data.title || slug,
        date: data.date || "",
        excerpt: data.excerpt || "",
        tags: data.tags,
        draft: data.draft,
        body,
      };
    })
    .filter((post) => !post.draft)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPost(slug) {
  const post = getAllPosts().find((p) => p.slug === slug);
  if (!post) return null;
  return { ...post, html: marked.parse(post.body) };
}

export function readingTime(text) {
  return Math.max(1, Math.round(text.split(/\s+/).length / 200));
}

export function formatDate(date) {
  if (!date) return "";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
