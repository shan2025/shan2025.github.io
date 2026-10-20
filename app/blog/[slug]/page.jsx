import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, getAllPosts, getPost, readingTime } from "@/lib/posts";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = getPost(slug);
  return post ? { title: post.title, description: post.excerpt } : {};
}

export default async function BlogPost({ params }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <article className="section container narrow">
      <Link href="/blog/" className="link-arrow back">
        ← All posts
      </Link>
      <header className="post-header">
        <div className="post-meta">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span>·</span>
          <span>{readingTime(post.body)} min read</span>
        </div>
        <h1 className="page-title">{post.title}</h1>
        {post.tags.length > 0 && (
          <div className="tags">
            {post.tags.map((tag) => (
              <span key={tag} className="tag">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </header>
      <div className="prose" dangerouslySetInnerHTML={{ __html: post.html }} />
    </article>
  );
}
