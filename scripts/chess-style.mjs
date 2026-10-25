// Reads Shadin's Chess.com games (a PGN export) and writes src/data/chess-style.json: the moves he plays in the
// opening, from either side, and his habits next to his opponents', for the AI on the home page (chess-ai.js).
//
//   node scripts/chess-style.mjs path/to/lionheartfc-all-games.pgn
//
// To export: open https://api.chess.com/pub/player/lionheartfc/games/archives and download every month's /pgn.

import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const ME = 'lionheartfc';
const BOOK_PLIES = 24; // his first 12 moves, from either side
const file = process.argv[2];
if (!file) { console.error('usage: node scripts/chess-style.mjs games.pgn'); process.exit(1); }

const key = (fen) => fen.split(' ').slice(0, 4).join(' '); // the position, without the move counters
const header = (pgn, name) => (pgn.match(new RegExp(`^\\[${name} "([^"]*)"\\]`, 'm')) || [])[1];
const games = readFileSync(file, 'utf8').split(/\n\s*\n(?=\[Event )/).filter((g) => g.includes('[Event '));

const book = {}; // position → { his move: times played }
// habits, for him and for his opponents in the same games
const blank = () => ({ games: 0, moves: 0, captures: 0, checks: 0, earlyQueen: 0, flank: 0, castled: 0, short: 0, long: 0, castleMove: 0, pieces: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 } });
const him = blank(), them = blank();
const firsts = { w: {}, b: {} }; // his first move as white; his answer to each first move as black
const ratings = [];
let used = 0, skipped = 0;
const replay = new Chess();

for (const pgn of games) {
  if (header(pgn, 'Variant') || header(pgn, 'SetUp') === '1') { skipped++; continue; } // standard chess from the start only
  const white = header(pgn, 'White') || '', black = header(pgn, 'Black') || '';
  const mine = white.toLowerCase() === ME ? 'w' : black.toLowerCase() === ME ? 'b' : null;
  if (!mine) { skipped++; continue; }
  try { replay.loadPgn(pgn); } catch { skipped++; continue; }
  const moves = replay.history({ verbose: true });
  if (moves.length < 2) { skipped++; continue; }
  used++;
  const elo = Number(header(pgn, mine === 'w' ? 'WhiteElo' : 'BlackElo'));
  if (elo && header(pgn, 'TimeControl') === '600') ratings.push({ date: header(pgn, 'UTCDate') || header(pgn, 'Date'), elo });
  const seen = { w: { n: 0, castled: false }, b: { n: 0, castled: false } };
  for (const [ply, m] of moves.entries()) {
    const who = m.color === mine ? him : them, s = seen[m.color];
    s.n++;
    who.moves++;
    who.pieces[m.piece]++;
    if (m.captured) who.captures++;
    if (/[+#]/.test(m.san)) who.checks++;
    if (s.n <= 10 && m.piece === 'q') who.earlyQueen++;
    if (s.n <= 10 && m.piece === 'p' && 'abgh'.includes(m.from[0])) who.flank++;
    if (m.flags.includes('k') || m.flags.includes('q')) {
      s.castled = true;
      who.castleMove += s.n;
      who[m.flags.includes('k') ? 'short' : 'long']++;
    }
    if (m.color === mine && ply < BOOK_PLIES) {
      const here = (book[key(m.before)] ||= {});
      here[m.san] = (here[m.san] || 0) + 1;
    }
    if (m.color === mine && ply === 0) firsts.w[m.san] = (firsts.w[m.san] || 0) + 1;
    if (m.color === mine && ply === 1) (firsts.b[moves[0].san] ||= {})[m.san] = ((firsts.b[moves[0].san] || {})[m.san] || 0) + 1;
  }
  for (const [c, s] of Object.entries(seen)) {
    const who = c === mine ? him : them;
    who.games++;
    if (s.castled) who.castled++;
  }
}

// keep positions he has played from at least twice, so the file stays small; where he has a habit there,
// drop the one-off oddities
for (const [pos, moves] of Object.entries(book)) {
  const total = Object.values(moves).reduce((a, b) => a + b, 0);
  if (total < 2) delete book[pos];
  else if (total > 4) for (const [san, n] of Object.entries(moves)) if (n < 2) delete moves[san];
}

const rate = (s, x) => (s.moves ? s[x] / s.moves : 0), perGame = (s, x) => (s.games ? s[x] / s.games : 0);
const clamp = (v, lo, hi) => Math.round(Math.max(lo, Math.min(hi, v)));
const share = (s, p) => (s.moves ? s.pieces[p] / s.moves : 0);
// nudges in centipawns: how much more (or less) he does a thing than the players he meets
const style = {
  capture: clamp((rate(him, 'captures') - rate(them, 'captures')) * 400, -30, 30),
  check: clamp((rate(him, 'checks') - rate(them, 'checks')) * 600, -30, 30),
  earlyQueen: clamp((perGame(him, 'earlyQueen') - perGame(them, 'earlyQueen')) * 15, -30, 30),
  flank: clamp((perGame(him, 'flank') - perGame(them, 'flank')) * 12, -25, 25),
  castle: clamp(perGame(him, 'castled') * 40, 0, 40),
  castleSide: him.short + him.long ? Number((him.short / (him.short + him.long)).toFixed(2)) : 0.8, // share of castling done short
  pieces: Object.fromEntries(['p', 'n', 'b', 'r', 'q', 'k'].map((p) => [p, clamp((share(him, p) / (share(them, p) || 1) - 1) * 40, -20, 20)])),
};

const top = (counts) => Object.entries(counts).sort((a, b) => b[1] - a[1]);
const pct = (n, of) => Math.round((100 * n) / of);
const whiteTotal = Object.values(firsts.w).reduce((a, b) => a + b, 0);
const [whiteMove, whiteN] = top(firsts.w)[0] || ['', 0];
const e4 = firsts.b.e4 ? top(firsts.b.e4)[0] : null, d4 = firsts.b.d4 ? top(firsts.b.d4)[0] : null;
ratings.sort((a, b) => (a.date < b.date ? -1 : 1));
const out = {
  games: used,
  rating: ratings.length ? { latest: ratings.at(-1).elo, peak: Math.max(...ratings.map((r) => r.elo)) } : null,
  openings: {
    white: whiteMove ? `1.${whiteMove} in ${pct(whiteN, whiteTotal)}% of my games as white` : '',
    black: [e4 && `1.e4 ${e4[0]}`, d4 && `1.d4 ${d4[0]}`].filter(Boolean).join(', '),
  },
  style,
  book,
};
writeFileSync(new URL('../src/data/chess-style.json', import.meta.url), JSON.stringify(out));
console.log({ games: games.length, used, skipped, positions: Object.keys(book).length, rating: out.rating, openings: out.openings, style });
console.log('him', { ...him, pieces: him.pieces }, '\nthem', { ...them, pieces: them.pieces });
