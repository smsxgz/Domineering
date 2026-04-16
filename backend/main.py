"""
FastAPI application for Domineering Game Tree Explorer.

Endpoints:
  POST /api/init    — Initialize game tree (solve root, expand first level)
  POST /api/expand  — Expand a node (returns children with symmetry dedup)
  POST /api/solve   — Solve a single position
  GET  /api/presets  — List available board presets
"""

import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from board import BoardState, get_vertical_moves, get_horizontal_moves, count_vertical_moves, count_horizontal_moves
from symmetry import canonical_mask
from cache import PersistentCache
from solver import get_solver
from tree import build_node_data, expand_node_deduped
from models import (
    InitRequest, InitResponse,
    ExpandRequest, ExpandResponse,
    SolveRequest, SolveResponse,
    SolveStatsData, PresetData,
)

sys.setrecursionlimit(10000)

cache: PersistentCache | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global cache
    cache = PersistentCache("domineering_cache.db")
    yield
    if cache:
        cache.close()


app = FastAPI(title="Domineering Explorer", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


PRESETS = [
    PresetData(label="2×2", rows=2, cols=2, desc="最小示例 · 约10个节点"),
    PresetData(label="2×3", rows=2, cols=3, desc="经典教学 · 约60个节点"),
    PresetData(label="3×3", rows=3, cols=3, desc="复杂度初现 · ~4000节点"),
    PresetData(label="2×4", rows=2, cols=4, desc="窄长棋盘 · ~200节点"),
    PresetData(label="3×4", rows=3, cols=4, desc="⚠ 较大 · 需要几秒计算"),
    PresetData(label="4×4", rows=4, cols=4, desc="⚠ ~2M局面"),
    PresetData(label="5×5", rows=5, cols=5, desc="⚠ 大型 · 可能需要较长时间"),
    PresetData(label="4×6", rows=4, cols=6, desc="中型矩形棋盘"),
    PresetData(label="6×6", rows=6, cols=6, desc="⚠⚠ 很大 · 惰性探索"),
    PresetData(label="8×8", rows=8, cols=8, desc="⚠⚠⚠ 极大 · 仅惰性探索"),
]


@app.get("/api/presets")
async def get_presets() -> list[PresetData]:
    return PRESETS


@app.post("/api/init")
async def init_tree(req: InitRequest) -> InitResponse:
    is_left_first = req.first_move == "L"
    state = BoardState.initial(req.rows, req.cols)
    solver = get_solver(req.solver_type, cache)

    # Solve root position
    outcome = solver.solve(state, is_left_first)
    root_stats = SolveStatsData(
        nodes_visited=solver.stats.nodes_visited,
        cache_hits=solver.stats.cache_hits,
        time_ms=solver.stats.time_ms,
    )

    # Build root display grid (all empty)
    root_grid = [[0] * req.cols for _ in range(req.rows)]
    root_node = build_node_data(root_grid, state, is_left_first, outcome, 0)

    # Expand root's children
    children, expand_stats = expand_node_deduped(
        root_grid, state, is_left_first, 0, solver
    )

    # Combine stats
    combined_stats = SolveStatsData(
        nodes_visited=root_stats.nodes_visited + expand_stats.nodes_visited,
        cache_hits=root_stats.cache_hits + expand_stats.cache_hits,
        time_ms=root_stats.time_ms + expand_stats.time_ms,
    )

    return InitResponse(
        node=root_node,
        children=children,
        solve_status="solved",
        stats=combined_stats,
    )


@app.post("/api/expand")
async def expand_node(req: ExpandRequest) -> ExpandResponse:
    state = BoardState.from_grid(req.board)
    solver = get_solver(req.solver_type, cache)

    children, stats = expand_node_deduped(
        req.board, state, req.is_left_turn, req.depth, solver
    )

    return ExpandResponse(
        children=children,
        solve_status="solved",
        stats=stats,
    )


@app.post("/api/solve")
async def solve_position(req: SolveRequest) -> SolveResponse:
    state = BoardState.from_grid(req.board)
    solver = get_solver(req.solver_type, cache)

    outcome = solver.solve(state, req.is_left_turn)

    return SolveResponse(
        outcome=outcome,
        status="solved",
        stats=SolveStatsData(
            nodes_visited=solver.stats.nodes_visited,
            cache_hits=solver.stats.cache_hits,
            time_ms=solver.stats.time_ms,
        ),
    )


# Serve frontend static files if the dist directory exists
import os
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")
