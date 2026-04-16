"""Pydantic models for API request/response."""

from pydantic import BaseModel


class InitRequest(BaseModel):
    rows: int
    cols: int
    first_move: str = "L"  # "L" or "R"
    solver_type: str = "minimax"  # "minimax" or "alphabeta"


class ExpandRequest(BaseModel):
    rows: int
    cols: int
    board: list[list[int]]  # 2D grid: 0=empty, 1=Left, 2=Right
    is_left_turn: bool
    depth: int = 0
    solver_type: str = "minimax"


class SolveRequest(BaseModel):
    rows: int
    cols: int
    board: list[list[int]]
    is_left_turn: bool
    solver_type: str = "minimax"


class SolveStatsData(BaseModel):
    nodes_visited: int
    cache_hits: int
    time_ms: float


class NodeData(BaseModel):
    board: list[list[int]]
    is_left_turn: bool
    v_moves: int
    h_moves: int
    move_count: int
    outcome: int | None
    depth: int
    key: str


class ChildData(BaseModel):
    node: NodeData
    move: list[int]  # [r1, c1, r2, c2]
    symmetric_count: int


class InitResponse(BaseModel):
    node: NodeData
    children: list[ChildData]
    solve_status: str
    stats: SolveStatsData


class ExpandResponse(BaseModel):
    children: list[ChildData]
    solve_status: str
    stats: SolveStatsData


class SolveResponse(BaseModel):
    outcome: int | None
    status: str
    stats: SolveStatsData


class PresetData(BaseModel):
    label: str
    rows: int
    cols: int
    desc: str
