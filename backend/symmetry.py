"""
Symmetry transforms and canonicalization for Domineering.

Valid symmetries (preserving player roles — vertical stays vertical):
  - Identity
  - Reflect horizontal: (r, c) -> (r, cols-1-c)
  - Reflect vertical:   (r, c) -> (rows-1-r, c)
  - Rotate 180:         (r, c) -> (rows-1-r, cols-1-c)

90/270 rotation swaps vertical/horizontal and thus swaps players — not used.
"""

from functools import lru_cache


@lru_cache(maxsize=64)
def _build_permutations(rows: int, cols: int) -> list[list[int]]:
    """Precompute bit permutation tables for all 4 symmetries."""
    n = rows * cols
    transforms = [
        lambda r, c: (r, c),                       # identity
        lambda r, c: (r, cols - 1 - c),             # reflect horizontal
        lambda r, c: (rows - 1 - r, c),             # reflect vertical
        lambda r, c: (rows - 1 - r, cols - 1 - c),  # rotate 180
    ]
    perms = []
    for t in transforms:
        perm = [0] * n
        for i in range(n):
            r, c = divmod(i, cols)
            nr, nc = t(r, c)
            perm[i] = nr * cols + nc
        perms.append(perm)
    return perms


def apply_permutation(mask: int, perm: list[int], n: int) -> int:
    """Apply a bit permutation to a mask."""
    result = 0
    remaining = mask
    bit_pos = 0
    while remaining:
        if remaining & 1:
            result |= 1 << perm[bit_pos]
        remaining >>= 1
        bit_pos += 1
    return result


def all_symmetric_masks(mask: int, rows: int, cols: int) -> list[int]:
    """Return all 4 symmetry-equivalent masks."""
    perms = _build_permutations(rows, cols)
    n = rows * cols
    return [apply_permutation(mask, p, n) for p in perms]


def canonical_mask(mask: int, rows: int, cols: int) -> int:
    """Return the minimum mask among all symmetry-equivalent forms."""
    return min(all_symmetric_masks(mask, rows, cols))


def transform_move(move: tuple[int, int, int, int],
                    transform_idx: int,
                    rows: int, cols: int) -> tuple[int, int, int, int]:
    """Apply a symmetry transform to a move (r1,c1,r2,c2)."""
    perms = _build_permutations(rows, cols)
    perm = perms[transform_idx]
    r1, c1, r2, c2 = move
    i1 = r1 * cols + c1
    i2 = r2 * cols + c2
    ni1 = perm[i1]
    ni2 = perm[i2]
    nr1, nc1 = divmod(ni1, cols)
    nr2, nc2 = divmod(ni2, cols)
    return (nr1, nc1, nr2, nc2)
