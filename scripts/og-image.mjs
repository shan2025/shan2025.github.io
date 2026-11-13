// Draws the picture shown when someone shares a link to the site (LinkedIn, WhatsApp, X...).
// Run `node scripts/og-image.mjs` after changing your name, role or tagline; it writes public/og.png.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const W = 1200, H = 630;
const bg = '#141210', ink = '#f6f2ea', muted = '#a8a197', accent = '#fcd34d';
const font = "Switzer, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

// a few connected points, echoing the map of ideas on the home page
const pts = [[930, 150], [1060, 230], [990, 340], [1110, 400], [880, 450], [1020, 520], [840, 270]];
const edges = [[0, 1], [1, 2], [2, 3], [2, 4], [3, 5], [4, 5], [0, 6], [6, 2], [6, 4]];

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="g" cx="78%" cy="20%" r="70%">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  ${edges.map(([a, b]) => `<line x1="${pts[a][0]}" y1="${pts[a][1]}" x2="${pts[b][0]}" y2="${pts[b][1]}" stroke="${ink}" stroke-opacity="0.22" stroke-width="1.5"/>`).join('')}
  ${pts.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i === 2 ? 9 : 5}" fill="${i === 2 ? accent : ink}" fill-opacity="${i === 2 ? 1 : 0.7}"/>`).join('')}
  <text x="80" y="120" font-family="${font}" font-size="26" fill="${muted}" letter-spacing="1">shadin.xyz</text>
  <text x="76" y="300" font-family="${font}" font-size="104" font-weight="300" fill="${ink}" letter-spacing="-4">Shadin A</text>
  <text x="80" y="380" font-family="${font}" font-size="40" font-weight="300" fill="${ink}" fill-opacity="0.86">Ideas, built and checked.</text>
  <text x="80" y="530" font-family="${font}" font-size="26" fill="${muted}">Product and growth · Builder of Unprompters and FinChat</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(fileURLToPath(new URL('../public/og.png', import.meta.url)));
console.log('Wrote public/og.png');
