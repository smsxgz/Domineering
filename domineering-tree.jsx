import { useState, useMemo, useCallback, useRef, useEffect } from "react";

// ============ GAME LOGIC ============
function createBoard(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function cloneBoard(board) {
  return board.map(r => [...r]);
}

function getVerticalMoves(board) {
  const moves = [];
  for (let r = 0; r < board.length - 1; r++)
    for (let c = 0; c < board[0].length; c++)
      if (board[r][c] === 0 && board[r + 1][c] === 0)
        moves.push([r, c, r + 1, c]);
  return moves;
}

function getHorizontalMoves(board) {
  const moves = [];
  for (let r = 0; r < board.length; r++)
    for (let c = 0; c < board[0].length - 1; c++)
      if (board[r][c] === 0 && board[r][c + 1] === 0)
        moves.push([r, c, r, c + 1]);
  return moves;
}

function applyMove(board, move, player) {
  const b = cloneBoard(board);
  b[move[0]][move[1]] = player;
  b[move[2]][move[3]] = player;
  return b;
}

function boardKey(board) {
  return board.map(r => r.join("")).join("|");
}

// Minimax with memoization
function solveMinimax(board, isLeftTurn, memo) {
  const key = boardKey(board) + (isLeftTurn ? "L" : "R");
  if (memo.has(key)) return memo.get(key);

  const moves = isLeftTurn ? getVerticalMoves(board) : getHorizontalMoves(board);
  if (moves.length === 0) {
    // current player loses under normal play
    const val = isLeftTurn ? -1 : 1; // -1 = Right wins, 1 = Left wins
    memo.set(key, val);
    return val;
  }

  let best = isLeftTurn ? -Infinity : Infinity;
  for (const m of moves) {
    const nb = applyMove(board, m, isLeftTurn ? 1 : 2);
    const val = solveMinimax(nb, !isLeftTurn, memo);
    best = isLeftTurn ? Math.max(best, val) : Math.min(best, val);
  }
  memo.set(key, best);
  return best;
}

// Build tree node lazily
function buildNode(board, isLeftTurn, memo, depth) {
  const vMoves = getVerticalMoves(board);
  const hMoves = getHorizontalMoves(board);
  const moves = isLeftTurn ? vMoves : hMoves;
  const outcome = solveMinimax(board, isLeftTurn, memo);

  return {
    board,
    isLeftTurn,
    vMoves: vMoves.length,
    hMoves: hMoves.length,
    moves,
    outcome,
    depth,
    children: null, // lazy
    key: boardKey(board) + (isLeftTurn ? "L" : "R"),
  };
}

function expandNode(node, memo) {
  if (node.children) return node;
  const children = node.moves.map(m => {
    const nb = applyMove(node.board, m, node.isLeftTurn ? 1 : 2);
    return {
      ...buildNode(nb, !node.isLeftTurn, memo, node.depth + 1),
      move: m,
    };
  });
  return { ...node, children };
}

// Count all nodes in subtree
function countNodes(node) {
  if (!node.children) return 1;
  return 1 + node.children.reduce((s, c) => s + countNodes(c), 0);
}

function countTotalTreeNodes(board, isLeftTurn, memo, cache) {
  const key = boardKey(board) + (isLeftTurn ? "L" : "R");
  if (cache.has(key)) return cache.get(key);
  const moves = isLeftTurn ? getVerticalMoves(board) : getHorizontalMoves(board);
  if (moves.length === 0) { cache.set(key, 1); return 1; }
  let total = 1;
  for (const m of moves) {
    const nb = applyMove(board, m, isLeftTurn ? 1 : 2);
    total += countTotalTreeNodes(nb, !isLeftTurn, memo, cache);
  }
  cache.set(key, total);
  return total;
}

// ============ MINI BOARD COMPONENT ============
const CELL = 22;
const GAP = 1;

function MiniBoard({ board, move, size = CELL }) {
  const rows = board.length, cols = board[0].length;
  const w = cols * (size + GAP) + GAP;
  const h = rows * (size + GAP) + GAP;

  return (
    <svg width={w} height={h} style={{ display: "block", flexShrink: 0 }}>
      <rect width={w} height={h} rx={3} fill="#1a1a2e" />
      {board.map((row, r) =>
        row.map((cell, c) => {
          const x = GAP + c * (size + GAP);
          const y = GAP + r * (size + GAP);
          const isHighlight = move && (
            (r === move[0] && c === move[1]) || (r === move[2] && c === move[3])
          );
          let fill = "#2a2a4a";
          if (cell === 1) fill = isHighlight ? "#6ea8fe" : "#3d6098";
          else if (cell === 2) fill = isHighlight ? "#ff8a80" : "#984040";
          else if (isHighlight) fill = cell === 1 ? "#6ea8fe" : "#ff8a80";

          return (
            <rect
              key={`${r}-${c}`}
              x={x} y={y}
              width={size} height={size}
              rx={2}
              fill={fill}
              stroke={isHighlight ? "#fff" : "none"}
              strokeWidth={isHighlight ? 1.5 : 0}
            />
          );
        })
      )}
    </svg>
  );
}

// ============ TREE NODE COMPONENT ============
function TreeNode({ node, memo, onUpdate, path, selectedPath, onSelect, autoExpand }) {
  const isExpanded = node.children !== null;
  const isTerminal = node.moves.length === 0;
  const isSelected = selectedPath === path;
  const outcomeLabel = node.outcome > 0 ? "L胜" : node.outcome < 0 ? "R胜" : "平";
  const outcomeColor = node.outcome > 0 ? "#6ea8fe" : node.outcome < 0 ? "#ff8a80" : "#aaa";

  const handleToggle = useCallback(() => {
    if (isTerminal) return;
    if (!isExpanded) {
      onUpdate(path, expandNode(node, memo));
    } else {
      onUpdate(path, { ...node, children: null });
    }
  }, [isExpanded, isTerminal, node, memo, onUpdate, path]);

  const handleSelect = useCallback(() => onSelect(path), [path, onSelect]);

  // Auto-expand logic
  useEffect(() => {
    if (autoExpand && !isExpanded && !isTerminal && node.moves.length <= 3 && node.depth < 3) {
      onUpdate(path, expandNode(node, memo));
    }
  }, [autoExpand]);

  return (
    <div style={{ marginLeft: node.depth > 0 ? 20 : 0 }}>
      <div
        onClick={handleSelect}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "6px 10px",
          marginBottom: 2,
          borderRadius: 6,
          cursor: "pointer",
          background: isSelected ? "rgba(110,168,254,0.12)" : "transparent",
          borderLeft: `3px solid ${node.isLeftTurn ? "#6ea8fe" : "#ff8a80"}`,
          transition: "background 0.15s",
        }}
        onMouseEnter={e => {
          if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        }}
        onMouseLeave={e => {
          if (!isSelected) e.currentTarget.style.background = "transparent";
        }}
      >
        {/* Expand/collapse toggle */}
        <div
          onClick={e => { e.stopPropagation(); handleToggle(); }}
          style={{
            width: 20, height: 20,
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 4,
            background: isTerminal ? "transparent" : "rgba(255,255,255,0.06)",
            color: isTerminal ? "#555" : "#ccc",
            fontSize: 12,
            fontFamily: "monospace",
            cursor: isTerminal ? "default" : "pointer",
            flexShrink: 0,
            transition: "transform 0.2s",
            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          {isTerminal ? "○" : "▶"}
        </div>

        <MiniBoard board={node.board} move={node.move} />

        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: node.isLeftTurn ? "#6ea8fe" : "#ff8a80",
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.03em",
            }}>
              {node.isLeftTurn ? "▍Left(竖)" : "▍Right(横)"}
            </span>
            <span style={{
              fontSize: 11,
              color: "#888",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              d={node.depth}
            </span>
            <span style={{
              fontSize: 10,
              padding: "1px 6px",
              borderRadius: 3,
              background: `${outcomeColor}22`,
              color: outcomeColor,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {outcomeLabel}
            </span>
          </div>
          <div style={{
            fontSize: 10,
            color: "#777",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            竖:{node.vMoves} 横:{node.hMoves}
            {node.moves.length > 0 && !isExpanded &&
              <span style={{ color: "#555", marginLeft: 6 }}>
                [{node.moves.length}个子节点]
              </span>
            }
          </div>
        </div>
      </div>

      {/* Children */}
      {isExpanded && node.children && (
        <div style={{
          borderLeft: "1px solid rgba(255,255,255,0.06)",
          marginLeft: 11,
        }}>
          {node.children.map((child, i) => (
            <TreeNode
              key={child.key + i}
              node={child}
              memo={memo}
              onUpdate={(p, updated) => {
                const newChildren = [...node.children];
                if (p === `${path}/${i}`) {
                  newChildren[i] = updated;
                  onUpdate(path, { ...node, children: newChildren });
                } else {
                  // Deeper update
                  const subUpdate = (subPath, subUpdated) => {
                    newChildren[i] = subUpdated;
                    onUpdate(path, { ...node, children: newChildren });
                  };
                  // We need to pass through
                  onUpdate(p, updated);
                }
              }}
              path={`${path}/${i}`}
              selectedPath={selectedPath}
              onSelect={onSelect}
              autoExpand={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Recursive update helper ============
function updateTreeAtPath(root, pathStr, updated) {
  const parts = pathStr.split("/").filter(Boolean).slice(1); // remove "root"
  if (parts.length === 0) return updated;

  function recurse(node, idx) {
    if (idx === parts.length) return updated;
    const childIdx = parseInt(parts[idx]);
    if (!node.children || !node.children[childIdx]) return node;
    const newChildren = [...node.children];
    newChildren[childIdx] = recurse(node.children[childIdx], idx + 1);
    return { ...node, children: newChildren };
  }
  return recurse(root, 0);
}

// ============ DETAIL PANEL ============
function DetailPanel({ node }) {
  if (!node) return (
    <div style={{
      color: "#555",
      fontSize: 13,
      textAlign: "center",
      padding: 30,
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      点击节点查看详情
    </div>
  );

  const outcomeLabel = node.outcome > 0 ? "Left(竖)获胜" : node.outcome < 0 ? "Right(横)获胜" : "平局";
  const outcomeColor = node.outcome > 0 ? "#6ea8fe" : node.outcome < 0 ? "#ff8a80" : "#aaa";

  return (
    <div style={{ padding: 16, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <MiniBoard board={node.board} move={node.move} size={36} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <InfoRow label="当前行动方" value={node.isLeftTurn ? "Left（竖放）" : "Right（横放）"}
          color={node.isLeftTurn ? "#6ea8fe" : "#ff8a80"} />
        <InfoRow label="深度" value={node.depth} />
        <InfoRow label="Left可选走法" value={node.vMoves} color="#6ea8fe" />
        <InfoRow label="Right可选走法" value={node.hMoves} color="#ff8a80" />
        <InfoRow label="Minimax结果" value={outcomeLabel} color={outcomeColor} />
        {node.children && (
          <InfoRow label="已展开子节点" value={node.children.length} />
        )}
      </div>

      {node.isLeftTurn && node.outcome > 0 && node.children && (
        <div style={{
          marginTop: 14, padding: 10, borderRadius: 6,
          background: "rgba(110,168,254,0.08)",
          fontSize: 11, color: "#6ea8fe", lineHeight: 1.5,
        }}>
          💡 Left在此局面有必胜策略
        </div>
      )}
      {!node.isLeftTurn && node.outcome < 0 && node.children && (
        <div style={{
          marginTop: 14, padding: 10, borderRadius: 6,
          background: "rgba(255,138,128,0.08)",
          fontSize: 11, color: "#ff8a80", lineHeight: 1.5,
        }}>
          💡 Right在此局面有必胜策略
        </div>
      )}
      {node.moves.length === 0 && (
        <div style={{
          marginTop: 14, padding: 10, borderRadius: 6,
          background: "rgba(255,255,255,0.05)",
          fontSize: 11, color: "#aaa", lineHeight: 1.5,
        }}>
          🏁 终止局面 — 当前行动方无合法走法，判负
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "#888" }}>{label}</span>
      <span style={{
        fontSize: 13, fontWeight: 600,
        color: color || "#ddd",
        fontFamily: "'JetBrains Mono', monospace",
      }}>{value}</span>
    </div>
  );
}

// ============ STATS BAR ============
function StatsBar({ totalNodes, maxDepth, root }) {
  const expanded = countNodes(root);
  return (
    <div style={{
      display: "flex", gap: 16, padding: "10px 16px",
      background: "rgba(255,255,255,0.03)",
      borderRadius: 8, marginBottom: 12,
      flexWrap: "wrap",
    }}>
      {[
        { label: "总节点数", value: totalNodes.toLocaleString(), color: "#e0c97f" },
        { label: "已展开", value: expanded.toLocaleString(), color: "#8be9fd" },
        { label: "最大深度", value: maxDepth, color: "#bd93f9" },
        { label: "根节点结果", value: root.outcome > 0 ? "Left胜" : root.outcome < 0 ? "Right胜" : "平",
          color: root.outcome > 0 ? "#6ea8fe" : root.outcome < 0 ? "#ff8a80" : "#aaa" },
      ].map(s => (
        <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 10, color: "#666", fontFamily: "'IBM Plex Sans', sans-serif" }}>{s.label}</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</span>
        </div>
      ))}
    </div>
  );
}

// ============ PRESETS ============
const PRESETS = [
  { label: "2×2", rows: 2, cols: 2, desc: "最小示例 · 约10个节点" },
  { label: "2×3", rows: 2, cols: 3, desc: "经典教学 · 约60个节点" },
  { label: "3×3", rows: 3, cols: 3, desc: "复杂度初现 · ~4000节点" },
  { label: "2×4", rows: 2, cols: 4, desc: "窄长棋盘 · ~200节点" },
  { label: "3×4", rows: 3, cols: 4, desc: "⚠ 较大 · 需要几秒计算" },
];

// ============ MAIN APP ============
export default function DomineeringExplorer() {
  const [preset, setPreset] = useState(1); // default 2x3
  const [root, setRoot] = useState(null);
  const [selectedPath, setSelectedPath] = useState(null);
  const [computing, setComputing] = useState(false);
  const [stats, setStats] = useState(null);
  const [firstMove, setFirstMove] = useState("L"); // who goes first
  const memoRef = useRef(new Map());
  const treeRef = useRef(null);

  const selectedNode = useMemo(() => {
    if (!selectedPath || !root) return root;
    const parts = selectedPath.split("/").filter(Boolean).slice(1);
    let node = root;
    for (const p of parts) {
      if (!node.children) return node;
      node = node.children[parseInt(p)];
      if (!node) return root;
    }
    return node;
  }, [selectedPath, root]);

  const handleGenerate = useCallback(() => {
    setComputing(true);
    setTimeout(() => {
      const p = PRESETS[preset];
      const board = createBoard(p.rows, p.cols);
      const memo = new Map();
      memoRef.current = memo;

      const isLeftFirst = firstMove === "L";
      const rootNode = buildNode(board, isLeftFirst, memo, 0);

      // Calculate total tree size
      const sizeCache = new Map();
      const totalNodes = countTotalTreeNodes(board, isLeftFirst, memo, sizeCache);

      // Compute max depth (using memo trick)
      let maxDepth = 0;
      for (const [k] of memo) {
        const brd = k.slice(0, -1);
        const empties = (brd.match(/0/g) || []).length;
        const d = p.rows * p.cols - empties;
        if (d > maxDepth) maxDepth = d;
      }

      // Auto-expand root
      const expanded = expandNode(rootNode, memo);

      setRoot(expanded);
      setStats({ totalNodes, maxDepth });
      setSelectedPath("root");
      setComputing(false);
    }, 50);
  }, [preset, firstMove]);

  const handleUpdate = useCallback((path, updated) => {
    setRoot(prev => updateTreeAtPath(prev, path, updated));
  }, []);

  // Expand all to depth N
  const expandToDepth = useCallback((maxD) => {
    if (!root) return;
    const memo = memoRef.current;
    function recurse(node) {
      if (node.depth >= maxD || node.moves.length === 0) return node;
      let expanded = node.children ? node : expandNode(node, memo);
      return {
        ...expanded,
        children: expanded.children.map(c => recurse(c)),
      };
    }
    setRoot(recurse(root));
  }, [root]);

  const collapseAll = useCallback(() => {
    if (!root) return;
    setRoot({ ...root, children: null });
  }, [root]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d0d1a",
      color: "#e0e0e0",
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: "24px 24px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <h1 style={{
          fontSize: 22,
          fontWeight: 700,
          margin: 0,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "-0.02em",
          background: "linear-gradient(135deg, #6ea8fe, #ff8a80)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          Domineering 博弈树探索器
        </h1>
        <p style={{
          fontSize: 12, color: "#666", margin: "6px 0 0",
          lineHeight: 1.5,
        }}>
          <span style={{ color: "#6ea8fe" }}>■ Left（竖放）</span>
          {" vs "}
          <span style={{ color: "#ff8a80" }}>■ Right（横放）</span>
          {" · 无法行动者判负 · 点击节点展开子树"}
        </p>
      </div>

      {/* Controls */}
      <div style={{
        padding: "16px 24px",
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        alignItems: "flex-end",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div>
          <div style={{ fontSize: 10, color: "#666", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            棋盘大小
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {PRESETS.map((p, i) => (
              <button key={i} onClick={() => setPreset(i)}
                style={{
                  padding: "6px 12px",
                  border: "1px solid",
                  borderColor: preset === i ? "#6ea8fe" : "rgba(255,255,255,0.1)",
                  borderRadius: 5,
                  background: preset === i ? "rgba(110,168,254,0.15)" : "transparent",
                  color: preset === i ? "#6ea8fe" : "#888",
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: preset === i ? 700 : 400,
                }}>
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>
            {PRESETS[preset].desc}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, color: "#666", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            先手
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[["L", "Left(竖)"], ["R", "Right(横)"]].map(([v, l]) => (
              <button key={v} onClick={() => setFirstMove(v)}
                style={{
                  padding: "6px 12px",
                  border: "1px solid",
                  borderColor: firstMove === v
                    ? (v === "L" ? "#6ea8fe" : "#ff8a80")
                    : "rgba(255,255,255,0.1)",
                  borderRadius: 5,
                  background: firstMove === v
                    ? (v === "L" ? "rgba(110,168,254,0.15)" : "rgba(255,138,128,0.15)")
                    : "transparent",
                  color: firstMove === v ? (v === "L" ? "#6ea8fe" : "#ff8a80") : "#888",
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: firstMove === v ? 700 : 400,
                }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleGenerate} disabled={computing}
          style={{
            padding: "8px 24px",
            border: "none",
            borderRadius: 6,
            background: computing ? "#333" : "linear-gradient(135deg, #6ea8fe, #a78bfa)",
            color: "#fff",
            cursor: computing ? "wait" : "pointer",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "'IBM Plex Sans', sans-serif",
            marginLeft: "auto",
          }}>
          {computing ? "计算中..." : "生成博弈树"}
        </button>
      </div>

      {!root && !computing && (
        <div style={{
          padding: 60,
          textAlign: "center",
          color: "#444",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎲</div>
          <div style={{ fontSize: 14, marginBottom: 8 }}>选择棋盘大小，点击"生成博弈树"开始探索</div>
          <div style={{ fontSize: 11, color: "#555", lineHeight: 1.6, maxWidth: 420, margin: "0 auto" }}>
            Domineering: Left竖放多米诺骨牌，Right横放。
            无法行动者判负（Normal Play Convention）。
            博弈树的每个节点代表一个局面，每条边代表一次走法。
          </div>
        </div>
      )}

      {root && stats && (
        <>
          {/* Toolbar */}
          <div style={{
            padding: "10px 24px",
            display: "flex", gap: 8, alignItems: "center",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
          }}>
            <span style={{ fontSize: 10, color: "#555", marginRight: 4 }}>展开至深度:</span>
            {[1, 2, 3, 4, 5].map(d => (
              <button key={d} onClick={() => expandToDepth(d)}
                style={{
                  padding: "3px 10px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 4,
                  background: "transparent",
                  color: "#888",
                  cursor: "pointer",
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                {d}
              </button>
            ))}
            <button onClick={collapseAll}
              style={{
                padding: "3px 10px",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 4,
                background: "transparent",
                color: "#888",
                cursor: "pointer",
                fontSize: 11,
                marginLeft: 8,
              }}>
              全部折叠
            </button>
          </div>

          {/* Main area */}
          <div style={{
            display: "flex",
            height: "calc(100vh - 260px)",
            minHeight: 400,
          }}>
            {/* Tree panel */}
            <div ref={treeRef} style={{
              flex: 1,
              overflow: "auto",
              padding: "16px 24px",
            }}>
              <StatsBar totalNodes={stats.totalNodes} maxDepth={stats.maxDepth} root={root} />
              <TreeNode
                node={root}
                memo={memoRef.current}
                onUpdate={handleUpdate}
                path="root"
                selectedPath={selectedPath}
                onSelect={setSelectedPath}
                autoExpand={false}
              />
            </div>

            {/* Detail panel */}
            <div style={{
              width: 240,
              borderLeft: "1px solid rgba(255,255,255,0.06)",
              overflow: "auto",
              background: "rgba(255,255,255,0.02)",
              flexShrink: 0,
            }}>
              <div style={{
                padding: "12px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                fontSize: 11,
                color: "#666",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}>
                节点详情
              </div>
              <DetailPanel node={selectedNode} />
            </div>
          </div>
        </>
      )}

      {/* Legend at bottom */}
      {root && (
        <div style={{
          padding: "8px 24px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          display: "flex", gap: 16, flexWrap: "wrap",
          fontSize: 10, color: "#555",
        }}>
          <span>▶ 点击箭头展开/折叠</span>
          <span>● 点击行查看详情</span>
          <span style={{ color: "#6ea8fe" }}>■ Left竖放占位</span>
          <span style={{ color: "#ff8a80" }}>■ Right横放占位</span>
          <span>○ 终止节点(叶子)</span>
        </div>
      )}
    </div>
  );
}
