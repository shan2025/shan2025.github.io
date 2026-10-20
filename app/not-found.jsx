import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section container narrow center">
      <h1 className="page-title">
        <span className="gradient-text">404</span>
      </h1>
      <p className="lead">This page drifted off into space.</p>
      <Link href="/" className="btn btn-primary">
        Back home
      </Link>
    </section>
  );
}
