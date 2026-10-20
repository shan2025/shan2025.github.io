import Link from "next/link";
import { site } from "@/data/site";

export default function Nav() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href="/" className="logo" aria-label={`${site.name} — home`}>
          <span className="logo-mark">{site.initials}</span>
          <span className="logo-text">{site.name}</span>
        </Link>
        <nav className="nav-links">
          <Link href="/#projects">Projects</Link>
          <Link href="/blog/">Blog</Link>
          <Link href="/#contact" className="nav-cta">
            Contact
          </Link>
        </nav>
      </div>
    </header>
  );
}
