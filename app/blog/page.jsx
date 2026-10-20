import { getAllPosts } from "@/lib/posts";
import PostList from "@/components/PostList";

export const metadata = {
  title: "Blog",
  description: "Notes on AI, machine learning and building software.",
};

export default function BlogIndex() {
  const posts = getAllPosts();

  return (
    <section className="section container narrow">
      <h1 className="page-title">
        The <span className="gradient-text">blog</span>
      </h1>
      <p className="lead">Notes on AI, machine learning and building software.</p>
      <PostList posts={posts} />
    </section>
  );
}
