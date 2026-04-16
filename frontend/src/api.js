const API_BASE = "/api";

export async function initTree(rows, cols, firstMove, solverType) {
  const res = await fetch(`${API_BASE}/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rows,
      cols,
      first_move: firstMove,
      solver_type: solverType,
    }),
  });
  if (!res.ok) throw new Error(`Init failed: ${res.status}`);
  return res.json();
}

export async function expandNode(rows, cols, board, isLeftTurn, depth, solverType) {
  const res = await fetch(`${API_BASE}/expand`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rows,
      cols,
      board,
      is_left_turn: isLeftTurn,
      depth,
      solver_type: solverType,
    }),
  });
  if (!res.ok) throw new Error(`Expand failed: ${res.status}`);
  return res.json();
}

export async function solvePosition(rows, cols, board, isLeftTurn, solverType) {
  const res = await fetch(`${API_BASE}/solve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rows,
      cols,
      board,
      is_left_turn: isLeftTurn,
      solver_type: solverType,
    }),
  });
  if (!res.ok) throw new Error(`Solve failed: ${res.status}`);
  return res.json();
}

export async function fetchPresets() {
  const res = await fetch(`${API_BASE}/presets`);
  if (!res.ok) throw new Error(`Presets failed: ${res.status}`);
  return res.json();
}
