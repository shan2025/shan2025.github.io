import Link from "next/link";
import { formatDate, readingTime } from "@/lib/posts";

export default function PostList({ posts }) {
  if (posts.length === 0) {
    return <p className="muted">No posts yet — check back soon.</p>;
  }

  return (
    <ul className="post-list">
      {posts.map((post) => (
        <li key={post.slug}>
          <Link href={`/blog/${post.slug}/`} className="post-item">
            <div className="post-meta">
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              <span>·</span>
              <span>{readingTime(post.body)} min read</span>
            </div>
            <h3>{post.title}</h3>
            {post.excerpt && <p>{post.excerpt}</p>}
            {post.tags.length > 0 && (
              <div className="tags">
                {post.tags.map((tag) => (
                  <span key={tag} className="tag">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
