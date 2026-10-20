// Static export so the site can be hosted on GitHub Pages (or any static host).
// BASE_PATH is set by the GitHub Actions workflow when the site lives at
// username.github.io/<repo>; it stays empty for username.github.io or a custom domain.
const basePath = process.env.BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
