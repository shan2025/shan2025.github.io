// Shadin's chess AI, for the board on the home page. It plays at roughly 800–900: it looks two moves ahead
// (its move and your reply), adds a little noise, and now and then doesn't look at your reply at all, which is
// how it hangs a piece or grabs a poisoned pawn. Where it can, it plays the way Shadin does: learn() reads his
// recent public games on Chess.com, so it opens with the moves he plays and leans towards his habits.
// The search uses chess.js's internal move functions (_moves, _makeMove, _undoMove, _board): the public ones work
// out notation for every move and are about ten times slower. That's why package.json pins chess.js exactly.

import { Chess } from 'chess.js';

const VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
// where each piece likes to stand, from white's side, a8 first (the well-known simplified tables)
const PST = {
  p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
};

// the position for white, in centipawns. The board is 0x88: a8 is 0, each rank is 16 apart, h1 is 119
const evaluate = (game) => {
  let s = 0;
  const board = game._board;
  for (let i = 0; i < 128; i++) {
    if (i & 0x88) { i += 7; continue; }
    const p = board[i];
    if (!p) continue;
    const row = i >> 4, f = i & 15;
    const v = VALUE[p.type] + PST[p.type][p.color === 'w' ? row * 8 + f : (7 - row) * 8 + f];
    s += p.color === 'w' ? v : -v;
  }
  return s;
};
const CASTLE = 32 | 64; // chess.js's flag bits for castling either side
const square = (i) => 'abcdefgh'[i & 15] + (8 - (i >> 4));

// negamax with alpha-beta, scored for the side to move
const search = (game, depth, alpha, beta) => {
  const moves = game._moves({ legal: true });
  if (!moves.length) return game._isKingAttacked(game._turn) ? -1e5 : 0;
  if (depth === 0) return (game._turn === 'w' ? 1 : -1) * evaluate(game);
  moves.sort((a, b) => (b.captured ? VALUE[b.captured] : 0) - (a.captured ? VALUE[a.captured] : 0));
  for (const m of moves) {
    game._makeMove(m);
    const v = -search(game, depth - 1, -beta, -alpha);
    game._undoMove();
    if (v >= beta) return v;
    if (v > alpha) alpha = v;
  }
  return alpha;
};

const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
const weighted = (counts) => {
  const entries = Object.entries(counts);
  let r = Math.random() * entries.reduce((n, [, c]) => n + c, 0);
  for (const [san, c] of entries) if ((r -= c) < 0) return san;
  return entries[0]?.[0];
};

// the move to play, for the side to move. brain is what learn() found: { book, style }
export function choose(game, brain = {}) {
  const me = game.turn(), sign = me === 'w' ? 1 : -1, history = game.history();
  const legal = game.moves({ verbose: true });
  // his openings first: if Shadin has been here, mostly play what he played
  const seen = brain.book?.[me]?.[history.join(' ')];
  if (seen && Math.random() < 0.85) {
    const m = legal.find((x) => x.san === weighted(seen));
    if (m) return m;
  }
  const style = { capture: 0, check: 0, earlyQueen: 0, castle: 15, ...brain.style };
  const careless = Math.random() < 0.12; // this move, it doesn't look at your reply
  const think = new Chess(game.fen()); // a copy to search on, so the real game is never touched
  let best = null, bestScore = -Infinity;
  for (const m of think._moves({ legal: true })) {
    think._makeMove(m);
    const check = think._isKingAttacked(think._turn);
    const mate = check && !think._moves({ legal: true }).length;
    let score = mate ? 1e5 : careless ? sign * evaluate(think) : -search(think, 1, -Infinity, Infinity);
    think._undoMove();
    // his habits, as a nudge
    if (m.captured) score += style.capture;
    if (check) score += style.check;
    if (m.piece === 'q' && history.length < 20) score += style.earlyQueen;
    if (m.flags & CASTLE) score += style.castle;
    score += gauss() * 45;
    if (score > bestScore) { bestScore = score; best = m; }
  }
  const from = square(best.from), to = square(best.to);
  return legal.find((x) => x.from === from && x.to === to && (x.promotion || null) === (best.promotion || null)) || legal[0];
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// read a player's recent public games on Chess.com: the moves they open with, from either side, and how often
// they capture, check, bring the queen out early and castle. Kept for the visit, so it only reads once.
export async function learn(user, { months = 3, max = 150 } = {}) {
  const key = `chess-brain-${user.toLowerCase()}`;
  try {
    const kept = sessionStorage.getItem(key);
    if (kept) return JSON.parse(kept);
  } catch {}
  const get = (url) => fetch(url).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); });
  const { archives = [] } = await get(`https://api.chess.com/pub/player/${user.toLowerCase()}/games/archives`);
  const monthly = await Promise.all(archives.slice(-months).map((u) => get(u).catch(() => ({ games: [] }))));
  const games = monthly.flatMap((m) => m.games || []).filter((g) => g.rules === 'chess' && g.pgn).slice(-max);
  const book = { w: {}, b: {} }, n = { games: 0, moves: 0, captures: 0, checks: 0, earlyQueen: 0, castled: 0 };
  const replay = new Chess();
  for (const [i, g] of games.entries()) {
    try { replay.loadPgn(g.pgn); } catch { continue; }
    const me = g.white?.username?.toLowerCase() === user.toLowerCase() ? 'w' : 'b';
    const sans = [];
    let castled = false;
    for (const [ply, m] of replay.history({ verbose: true }).entries()) {
      if (m.color === me) {
        if (ply < 14) {
          const here = (book[me][sans.join(' ')] ||= {});
          here[m.san] = (here[m.san] || 0) + 1;
        }
        n.moves++;
        if (m.captured) n.captures++;
        if (m.san.includes('+')) n.checks++;
        if (m.piece === 'q' && ply < 20) n.earlyQueen++;
        if (m.flags.includes('k') || m.flags.includes('q')) castled = true;
      }
      sans.push(m.san);
    }
    n.games++;
    if (castled) n.castled++;
    if (i % 10 === 9) await new Promise((r) => setTimeout(r)); // let the page breathe
  }
  const per = (x) => (n.moves ? x / n.moves : 0), perGame = (x) => (n.games ? x / n.games : 0);
  const brain = {
    games: n.games,
    book,
    // nudges in centipawns, against a typical club player: ~20% of moves capture, ~6% check, about one early queen move a game
    style: n.games ? {
      capture: clamp((per(n.captures) - 0.2) * 300, -25, 40),
      check: clamp((per(n.checks) - 0.06) * 500, -15, 40),
      earlyQueen: clamp((perGame(n.earlyQueen) - 1) * 15, -25, 25),
      castle: clamp(perGame(n.castled) * 40, 0, 40),
    } : {},
  };
  try { sessionStorage.setItem(key, JSON.stringify(brain)); } catch {}
  return brain;
}
