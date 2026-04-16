"""
Two Domineering solvers:
  - MinimaxSolver: plain exhaustive minimax (no pruning)
  - AlphaBetaSolver: alpha-beta pruning with move ordering

Both use symmetry canonicalization for transposition table keys
and share a persistent SQLite cache.
"""

import time
from dataclasses import dataclass, field

from board import BoardState, get_vertical_moves, get_horizontal_moves, count_vertical_moves, count_horizontal_moves
from symmetry import canonical_mask
from cache import PersistentCache


@dataclass
class SolveStats:
    nodes_visited: int = 0
    cache_hits: int = 0
    time_ms: float = 0.0


class MinimaxSolver:
    """Plain minimax with transposition table — no pruning."""

    def __init__(self, cache: PersistentCache | None = None):
        self.memo: dict[tuple[int, int, int, bool], int] = {}
        self.cache = cache
        self.stats = SolveStats()

    def reset_stats(self):
        self.stats = SolveStats()

    def solve(self, state: BoardState, is_left_turn: bool) -> int:
        """Returns +1 if Left wins, -1 if Right wins under optimal play."""
        self.reset_stats()
        t0 = time.monotonic()
        result = self._minimax(state, is_left_turn)
        self.stats.time_ms = (time.monotonic() - t0) * 1000
        return result

    def _minimax(self, state: BoardState, is_left_turn: bool) -> int:
        canon = canonical_mask(state.empty_mask, state.rows, state.cols)
        key = (state.rows, state.cols, canon, is_left_turn)

        if key in self.memo:
            self.stats.cache_hits += 1
            return self.memo[key]

        if self.cache:
            cached = self.cache.get(state.rows, state.cols, canon, is_left_turn)
            if cached is not None:
                self.stats.cache_hits += 1
                self.memo[key] = cached
                return cached

        self.stats.nodes_visited += 1

        moves = get_vertical_moves(state) if is_left_turn else get_horizontal_moves(state)

        if not moves:
            val = -1 if is_left_turn else 1
            self.memo[key] = val
            if self.cache:
                self.cache.put(state.rows, state.cols, canon, is_left_turn, val)
            return val

        if is_left_turn:
            best = -1
            for m in moves:
                child = state.place(*m)
                val = self._minimax(child, False)
                if val > best:
                    best = val
                # No early termination — exhaustive search
        else:
            best = 1
            for m in moves:
                child = state.place(*m)
                val = self._minimax(child, True)
                if val < best:
                    best = val
                # No early termination — exhaustive search

        self.memo[key] = best
        if self.cache:
            self.cache.put(state.rows, state.cols, canon, is_left_turn, best)
        return best


class AlphaBetaSolver:
    """Alpha-beta pruning with move ordering heuristic."""

    def __init__(self, cache: PersistentCache | None = None):
        self.memo: dict[tuple[int, int, int, bool], int] = {}
        self.cache = cache
        self.stats = SolveStats()

    def reset_stats(self):
        self.stats = SolveStats()

    def solve(self, state: BoardState, is_left_turn: bool) -> int:
        """Returns +1 if Left wins, -1 if Right wins under optimal play."""
        self.reset_stats()
        t0 = time.monotonic()
        result = self._alpha_beta(state, is_left_turn, -1, 1)
        self.stats.time_ms = (time.monotonic() - t0) * 1000
        return result

    def _order_moves(self, state: BoardState, moves: list, is_left_turn: bool) -> list:
        """Order moves by heuristic: prefer moves that hurt the opponent more."""
        def score(m):
            child = state.place(*m)
            v = count_vertical_moves(child)
            h = count_horizontal_moves(child)
            # Left wants to minimize Right's moves, Right wants to minimize Left's
            if is_left_turn:
                return h - v  # lower h (fewer opponent moves) is better, so sort ascending
            else:
                return v - h  # lower v is better
        return sorted(moves, key=score)

    def _alpha_beta(self, state: BoardState, is_left_turn: bool,
                    alpha: int, beta: int) -> int:
        canon = canonical_mask(state.empty_mask, state.rows, state.cols)
        key = (state.rows, state.cols, canon, is_left_turn)

        if key in self.memo:
            self.stats.cache_hits += 1
            return self.memo[key]

        if self.cache:
            cached = self.cache.get(state.rows, state.cols, canon, is_left_turn)
            if cached is not None:
                self.stats.cache_hits += 1
                self.memo[key] = cached
                return cached

        self.stats.nodes_visited += 1

        moves = get_vertical_moves(state) if is_left_turn else get_horizontal_moves(state)

        if not moves:
            val = -1 if is_left_turn else 1
            self.memo[key] = val
            if self.cache:
                self.cache.put(state.rows, state.cols, canon, is_left_turn, val)
            return val

        moves = self._order_moves(state, moves, is_left_turn)

        if is_left_turn:
            value = -1
            for m in moves:
                child = state.place(*m)
                value = max(value, self._alpha_beta(child, False, alpha, beta))
                alpha = max(alpha, value)
                if alpha >= beta:
                    break
        else:
            value = 1
            for m in moves:
                child = state.place(*m)
                value = min(value, self._alpha_beta(child, True, alpha, beta))
                beta = min(beta, value)
                if alpha >= beta:
                    break

        self.memo[key] = value
        if self.cache:
            self.cache.put(state.rows, state.cols, canon, is_left_turn, value)
        return value


def get_solver(solver_type: str, cache: PersistentCache | None = None):
    """Factory: create a solver by type name."""
    if solver_type == "alphabeta":
        return AlphaBetaSolver(cache)
    else:
        return MinimaxSolver(cache)
