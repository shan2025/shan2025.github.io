import { site } from "@/data/site";
import SocialLinks from "@/components/SocialLinks";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <p>
          © {new Date().getFullYear()} {site.name}. Built with Next.js, hosted on GitHub Pages.
        </p>
        <SocialLinks />
      </div>
    </footer>
  );
}
