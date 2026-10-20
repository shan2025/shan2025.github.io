import Link from "next/link";
import { site } from "@/data/site";
import { getAllPosts } from "@/lib/posts";
import PostList from "@/components/PostList";
import SocialLinks from "@/components/SocialLinks";

export default function Home() {
  const posts = getAllPosts().slice(0, 3);

  return (
    <>
      <section className="hero container">
        <p className="eyebrow">
          <span className="pulse" aria-hidden="true" /> {site.role}
        </p>
        <h1>
          Hi, I&apos;m <span className="gradient-text">{site.name}</span>.
        </h1>
        <p className="lead">{site.tagline}</p>
        <div className="hero-actions">
          <Link href="/#projects" className="btn btn-primary">
            See my work
          </Link>
          <Link href="/blog/" className="btn btn-ghost">
            Read the blog →
          </Link>
          {site.resumeUrl && (
            <a href={site.resumeUrl} className="btn btn-ghost" target="_blank" rel="noreferrer">
              Résumé
            </a>
          )}
        </div>
        <SocialLinks />
      </section>

      <section id="about" className="section container">
        <h2 className="section-title">
          <span className="section-num">01</span> About me
        </h2>
        <div className="about-grid">
          <div className="about-text">
            {site.about.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="skills">
            {site.skills.map((group) => (
              <div key={group.group} className="skill-group">
                <h3>{group.group}</h3>
                <ul>
                  {group.items.map((item) => (
                    <li key={item} className="pill">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="projects" className="section container">
        <h2 className="section-title">
          <span className="section-num">02</span> Projects
        </h2>
        <div className="project-grid">
          {site.projects.map((project) => (
            <article
              key={project.name}
              className={`project-card${project.featured ? " featured" : ""}`}
              style={{ "--accent": project.color }}
            >
              {project.featured && <span className="badge">Featured</span>}
              <h3>{project.name}</h3>
              <p>{project.description}</p>
              <div className="tags">
                {project.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="project-links">
                {project.repo && (
                  <a href={project.repo} target="_blank" rel="noreferrer">
                    Code ↗
                  </a>
                )}
                {project.live && (
                  <a href={project.live} target="_blank" rel="noreferrer">
                    Live demo ↗
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="blog" className="section container">
        <div className="section-head">
          <h2 className="section-title">
            <span className="section-num">03</span> Latest writing
          </h2>
          <Link href="/blog/" className="link-arrow">
            All posts →
          </Link>
        </div>
        <PostList posts={posts} />
      </section>

      <section id="contact" className="section container">
        <div className="contact-card">
          <h2>
            Let&apos;s build something <span className="gradient-text">together</span>.
          </h2>
          <p className="lead">
            Open to collaborations, freelance work and interesting conversations about AI and data.
          </p>
          <div className="hero-actions">
            {site.email ? (
              <a href={`mailto:${site.email}`} className="btn btn-primary">
                Say hello
              </a>
            ) : (
              <a href={site.links.github} className="btn btn-primary" target="_blank" rel="noreferrer">
                Find me on GitHub
              </a>
            )}
          </div>
          <SocialLinks />
        </div>
      </section>
    </>
  );
}
