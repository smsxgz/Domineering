"""
Tree node construction with symmetry deduplication.

When expanding a node, groups children by canonical mask so that
symmetric positions are collapsed into a single representative.
"""

from board import BoardState, get_vertical_moves, get_horizontal_moves, count_vertical_moves, count_horizontal_moves
from symmetry import canonical_mask
from models import NodeData, ChildData, SolveStatsData


def build_node_data(
    board_grid: list[list[int]],
    state: BoardState,
    is_left_turn: bool,
    outcome: int | None,
    depth: int,
) -> NodeData:
    """Build a NodeData from a board state."""
    v = count_vertical_moves(state)
    h = count_horizontal_moves(state)
    move_count = v if is_left_turn else h
    canon = canonical_mask(state.empty_mask, state.rows, state.cols)
    key = f"{state.rows}x{state.cols}:{canon}:{'L' if is_left_turn else 'R'}"

    return NodeData(
        board=board_grid,
        is_left_turn=is_left_turn,
        v_moves=v,
        h_moves=h,
        move_count=move_count,
        outcome=outcome,
        depth=depth,
        key=key,
    )


def expand_node_deduped(
    board_grid: list[list[int]],
    state: BoardState,
    is_left_turn: bool,
    depth: int,
    solver,
) -> tuple[list[ChildData], SolveStatsData]:
    """Expand a node's children with symmetry deduplication.

    Returns list of ChildData and solve stats.
    """
    solver.reset_stats()

    moves = get_vertical_moves(state) if is_left_turn else get_horizontal_moves(state)

    seen_canonical: dict[int, int] = {}  # canonical_mask -> index in children
    children: list[ChildData] = []

    player_val = 1 if is_left_turn else 2

    for move in moves:
        r1, c1, r2, c2 = move
        child_state = state.place(r1, c1, r2, c2)
        canon = canonical_mask(child_state.empty_mask, state.rows, state.cols)

        if canon in seen_canonical:
            idx = seen_canonical[canon]
            children[idx].symmetric_count += 1
            continue

        # Solve the child position
        child_turn = not is_left_turn
        outcome = solver.solve(child_state, child_turn)

        # Build the display grid for the child
        child_grid = [row[:] for row in board_grid]
        child_grid[r1][c1] = player_val
        child_grid[r2][c2] = player_val

        child_node = build_node_data(child_grid, child_state, child_turn, outcome, depth + 1)

        seen_canonical[canon] = len(children)
        children.append(ChildData(
            node=child_node,
            move=[r1, c1, r2, c2],
            symmetric_count=0,
        ))

    return children, SolveStatsData(
        nodes_visited=solver.stats.nodes_visited,
        cache_hits=solver.stats.cache_hits,
        time_ms=solver.stats.time_ms,
    )
