"""
Bitboard representation and move generation for Domineering.

Each cell (r, c) maps to bit position r * cols + c.
A '1' bit in empty_mask means the cell is empty.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class BoardState:
    rows: int
    cols: int
    empty_mask: int

    @staticmethod
    def initial(rows: int, cols: int) -> "BoardState":
        mask = (1 << (rows * cols)) - 1
        return BoardState(rows=rows, cols=cols, empty_mask=mask)

    @staticmethod
    def from_grid(grid: list[list[int]]) -> "BoardState":
        """Create from 2D grid where 0 = empty, nonzero = occupied."""
        rows = len(grid)
        cols = len(grid[0])
        mask = 0
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == 0:
                    mask |= 1 << (r * cols + c)
        return BoardState(rows=rows, cols=cols, empty_mask=mask)

    def bit(self, r: int, c: int) -> int:
        return 1 << (r * self.cols + c)

    def is_empty(self, r: int, c: int) -> bool:
        return bool(self.empty_mask & self.bit(r, c))

    def place(self, r1: int, c1: int, r2: int, c2: int) -> "BoardState":
        new_mask = self.empty_mask & ~self.bit(r1, c1) & ~self.bit(r2, c2)
        return BoardState(rows=self.rows, cols=self.cols, empty_mask=new_mask)

    @property
    def n_cells(self) -> int:
        return self.rows * self.cols

    @property
    def n_empty(self) -> int:
        return bin(self.empty_mask).count("1")


def get_vertical_moves(state: BoardState) -> list[tuple[int, int, int, int]]:
    """Get all valid vertical (Left player) moves."""
    moves = []
    for r in range(state.rows - 1):
        for c in range(state.cols):
            if state.is_empty(r, c) and state.is_empty(r + 1, c):
                moves.append((r, c, r + 1, c))
    return moves


def get_horizontal_moves(state: BoardState) -> list[tuple[int, int, int, int]]:
    """Get all valid horizontal (Right player) moves."""
    moves = []
    for r in range(state.rows):
        for c in range(state.cols - 1):
            if state.is_empty(r, c) and state.is_empty(r, c + 1):
                moves.append((r, c, r, c + 1))
    return moves


def count_vertical_moves(state: BoardState) -> int:
    """Fast bitwise count of vertical moves."""
    mask = state.empty_mask
    return bin(mask & (mask >> state.cols)).count("1")


def count_horizontal_moves(state: BoardState) -> int:
    """Fast bitwise count of horizontal moves."""
    mask = state.empty_mask
    # Build column mask: exclude rightmost column to prevent wrap
    col_mask = 0
    for r in range(state.rows):
        for c in range(state.cols - 1):
            col_mask |= 1 << (r * state.cols + c)
    return bin((mask & col_mask) & (mask >> 1)).count("1")


def grid_to_display(state: BoardState, move_history: list[tuple[int, int, int, int, bool]] | None = None) -> list[list[int]]:
    """Convert state + move history to 2D display grid (0=empty, 1=Left, 2=Right).

    move_history: list of (r1, c1, r2, c2, is_left) tuples in order played.
    If None, all occupied cells are marked as 1.
    """
    grid = [[0] * state.cols for _ in range(state.rows)]

    if move_history:
        for r1, c1, r2, c2, is_left in move_history:
            val = 1 if is_left else 2
            grid[r1][c1] = val
            grid[r2][c2] = val
    else:
        # Mark all non-empty cells generically
        for r in range(state.rows):
            for c in range(state.cols):
                if not state.is_empty(r, c):
                    grid[r][c] = 1  # default

    return grid
