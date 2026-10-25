// Shadin's chess AI, for the board on the home page. It plays at roughly 800–900: it looks two moves ahead
// (its move and your reply), adds a little noise, and now and then doesn't look at your reply at all, which is
// how it hangs a piece or grabs a poisoned pawn. Where it can, it plays the way Shadin does: its brain is
// src/data/chess-style.json, made by scripts/chess-style.mjs from his games on Chess.com, with the moves he plays
// in the opening and how his habits differ from his opponents' (more checks, kingside castling, and so on).
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
const CASTLE = 32 | 64; // chess.js's flag bits for castling: 32 short, 64 long
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

// the move to play, for the side to move. brain is chess-style.json: { book, style }
export function choose(game, brain = {}) {
  const sign = game.turn() === 'w' ? 1 : -1, ply = game.history().length;
  const legal = game.moves({ verbose: true });
  // his openings first: if Shadin has had this position, play what he played there; nearly always where it's
  // a habit (five games or more), a little less where he's only been there once or twice
  const seen = brain.book?.[game.fen().split(' ').slice(0, 4).join(' ')];
  const times = seen ? Object.values(seen).reduce((a, b) => a + b, 0) : 0;
  if (seen && Math.random() < (times >= 5 ? 0.97 : 0.85)) {
    const san = weighted(seen), m = legal.find((x) => x.san === san);
    if (m) return m;
  }
  const style = { capture: 0, check: 0, earlyQueen: 0, flank: 0, castle: 15, castleSide: 0.8, pieces: {}, ...brain.style };
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
    if (m.piece === 'q' && ply < 20) score += style.earlyQueen;
    if (m.piece === 'p' && ply < 20 && [0, 1, 6, 7].includes(m.from & 15)) score += style.flank; // a, b, g and h pawns
    if (m.flags & CASTLE) score += style.castle * (m.flags & 32 ? style.castleSide : 1 - style.castleSide);
    score += style.pieces[m.piece] || 0;
    score += gauss() * 45;
    if (score > bestScore) { bestScore = score; best = m; }
  }
  const from = square(best.from), to = square(best.to);
  return legal.find((x) => x.from === from && x.to === to && (x.promotion || null) === (best.promotion || null)) || legal[0];
}
