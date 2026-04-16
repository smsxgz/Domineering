import { useState, useMemo, useCallback } from "react";
import { initTree, expandNode as apiExpandNode } from "./api";
import MiniBoard from "./components/MiniBoard";
import TreeNode from "./components/TreeNode";
import DetailPanel from "./components/DetailPanel";
import StatsBar from "./components/StatsBar";

// ============ Recursive update helper ============
function updateTreeAtPath(root, pathStr, updated) {
  const parts = pathStr
    .split("/")
    .filter(Boolean)
    .slice(1); // remove "root"
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

// ============ PRESETS ============
const PRESETS = [
  { label: "2×2", rows: 2, cols: 2, desc: "最小示例 · 约10个节点" },
  { label: "2×3", rows: 2, cols: 3, desc: "经典教学 · 约60个节点" },
  { label: "3×3", rows: 3, cols: 3, desc: "复杂度初现 · ~4000节点" },
  { label: "2×4", rows: 2, cols: 4, desc: "窄长棋盘 · ~200节点" },
  { label: "3×4", rows: 3, cols: 4, desc: "⚠ 较大 · 需要几秒计算" },
  { label: "4×4", rows: 4, cols: 4, desc: "⚠ ~2M局面" },
  { label: "5×5", rows: 5, cols: 5, desc: "⚠ 大型 · 可能需要较长时间" },
  { label: "4×6", rows: 4, cols: 6, desc: "中型矩形棋盘" },
  { label: "6×6", rows: 6, cols: 6, desc: "⚠⚠ 很大 · 惰性探索" },
  { label: "8×8", rows: 8, cols: 8, desc: "⚠⚠⚠ 极大 · 仅惰性探索" },
];

// ============ MAIN APP ============
export default function App() {
  const [preset, setPreset] = useState(1); // default 2x3
  const [root, setRoot] = useState(null);
  const [selectedPath, setSelectedPath] = useState(null);
  const [computing, setComputing] = useState(false);
  const [solveStats, setSolveStats] = useState(null);
  const [firstMove, setFirstMove] = useState("L");
  const [solverType, setSolverType] = useState("minimax");
  const [error, setError] = useState(null);

  const selectedNode = useMemo(() => {
    if (!selectedPath || !root) return root;
    const parts = selectedPath
      .split("/")
      .filter(Boolean)
      .slice(1);
    let node = root;
    for (const p of parts) {
      if (!node.children) return node;
      node = node.children[parseInt(p)];
      if (!node) return root;
    }
    return node;
  }, [selectedPath, root]);

  const handleGenerate = useCallback(async () => {
    setComputing(true);
    setError(null);
    try {
      const p = PRESETS[preset];
      const data = await initTree(p.rows, p.cols, firstMove, solverType);

      // Convert API response to frontend node format
      const rootNode = {
        board: data.node.board,
        isLeftTurn: data.node.is_left_turn,
        vMoves: data.node.v_moves,
        hMoves: data.node.h_moves,
        moveCount: data.node.move_count,
        outcome: data.node.outcome,
        depth: data.node.depth,
        key: data.node.key,
        move: null,
        symmetricCount: 0,
        children: data.children.map((ch) => ({
          board: ch.node.board,
          isLeftTurn: ch.node.is_left_turn,
          vMoves: ch.node.v_moves,
          hMoves: ch.node.h_moves,
          moveCount: ch.node.move_count,
          outcome: ch.node.outcome,
          depth: ch.node.depth,
          key: ch.node.key,
          children: null,
          move: ch.move,
          symmetricCount: ch.symmetric_count,
        })),
      };

      setRoot(rootNode);
      setSolveStats(data.stats);
      setSelectedPath("root");
    } catch (err) {
      setError(err.message);
      console.error("Generate failed:", err);
    } finally {
      setComputing(false);
    }
  }, [preset, firstMove, solverType]);

  const handleUpdate = useCallback((path, updated) => {
    setRoot((prev) => updateTreeAtPath(prev, path, updated));
  }, []);

  // Expand all to depth N (progressive async)
  const expandToDepth = useCallback(
    async (maxD) => {
      if (!root) return;
      const p = PRESETS[preset];

      async function recurse(node, path) {
        if (node.depth >= maxD || node.moveCount === 0) return node;
        let current = node;
        if (!current.children) {
          try {
            const data = await apiExpandNode(
              p.rows,
              p.cols,
              current.board,
              current.isLeftTurn,
              current.depth,
              solverType
            );
            const children = data.children.map((ch) => ({
              board: ch.node.board,
              isLeftTurn: ch.node.is_left_turn,
              vMoves: ch.node.v_moves,
              hMoves: ch.node.h_moves,
              moveCount: ch.node.move_count,
              outcome: ch.node.outcome,
              depth: ch.node.depth,
              key: ch.node.key,
              children: null,
              move: ch.move,
              symmetricCount: ch.symmetric_count,
            }));
            current = { ...current, children };
          } catch (err) {
            console.error("Expand failed:", err);
            return current;
          }
        }
        if (current.children && current.depth < maxD - 1) {
          const newChildren = await Promise.all(
            current.children.map((child, i) => recurse(child, `${path}/${i}`))
          );
          current = { ...current, children: newChildren };
        }
        return current;
      }

      const expanded = await recurse(root, "root");
      setRoot(expanded);
    },
    [root, preset, solverType]
  );

  const collapseAll = useCallback(() => {
    if (!root) return;
    setRoot({ ...root, children: null });
  }, [root]);

  const currentPreset = PRESETS[preset];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d0d1a",
        color: "#e0e0e0",
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
    >
      {/* Spinner keyframes */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div
        style={{
          padding: "24px 24px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            margin: 0,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "-0.02em",
            background: "linear-gradient(135deg, #6ea8fe, #ff8a80)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Domineering 博弈树探索器
        </h1>
        <p
          style={{
            fontSize: 12,
            color: "#666",
            margin: "6px 0 0",
            lineHeight: 1.5,
          }}
        >
          <span style={{ color: "#6ea8fe" }}>■ Left（竖放）</span>
          {" vs "}
          <span style={{ color: "#ff8a80" }}>■ Right（横放）</span>
          {" · 无法行动者判负 · Python后端计算 · 对称局面已合并"}
        </p>
      </div>

      {/* Controls */}
      <div
        style={{
          padding: "16px 24px",
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "flex-end",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        {/* Board size */}
        <div>
          <div
            style={{
              fontSize: 10,
              color: "#666",
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            棋盘大小
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {PRESETS.map((p, i) => (
              <button
                key={i}
                onClick={() => setPreset(i)}
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
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>
            {currentPreset.desc}
          </div>
        </div>

        {/* First move */}
        <div>
          <div
            style={{
              fontSize: 10,
              color: "#666",
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            先手
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[
              ["L", "Left(竖)"],
              ["R", "Right(横)"],
            ].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setFirstMove(v)}
                style={{
                  padding: "6px 12px",
                  border: "1px solid",
                  borderColor:
                    firstMove === v
                      ? v === "L"
                        ? "#6ea8fe"
                        : "#ff8a80"
                      : "rgba(255,255,255,0.1)",
                  borderRadius: 5,
                  background:
                    firstMove === v
                      ? v === "L"
                        ? "rgba(110,168,254,0.15)"
                        : "rgba(255,138,128,0.15)"
                      : "transparent",
                  color: firstMove === v ? (v === "L" ? "#6ea8fe" : "#ff8a80") : "#888",
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: firstMove === v ? 700 : 400,
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Solver type */}
        <div>
          <div
            style={{
              fontSize: 10,
              color: "#666",
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            求解器
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[
              ["minimax", "Minimax"],
              ["alphabeta", "Alpha-Beta"],
            ].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setSolverType(v)}
                style={{
                  padding: "6px 12px",
                  border: "1px solid",
                  borderColor:
                    solverType === v ? "#bd93f9" : "rgba(255,255,255,0.1)",
                  borderRadius: 5,
                  background:
                    solverType === v ? "rgba(189,147,249,0.15)" : "transparent",
                  color: solverType === v ? "#bd93f9" : "#888",
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: solverType === v ? 700 : 400,
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={computing}
          style={{
            padding: "8px 24px",
            border: "none",
            borderRadius: 6,
            background: computing
              ? "#333"
              : "linear-gradient(135deg, #6ea8fe, #a78bfa)",
            color: "#fff",
            cursor: computing ? "wait" : "pointer",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "'IBM Plex Sans', sans-serif",
            marginLeft: "auto",
          }}
        >
          {computing ? "计算中..." : "生成博弈树"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "12px 24px",
            background: "rgba(255,80,80,0.1)",
            color: "#ff5050",
            fontSize: 13,
          }}
        >
          错误: {error}
        </div>
      )}

      {/* Empty state */}
      {!root && !computing && (
        <div style={{ padding: 60, textAlign: "center", color: "#444" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#127922;</div>
          <div style={{ fontSize: 14, marginBottom: 8 }}>
            选择棋盘大小，点击"生成博弈树"开始探索
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#555",
              lineHeight: 1.6,
              maxWidth: 420,
              margin: "0 auto",
            }}
          >
            Domineering: Left竖放多米诺骨牌，Right横放。
            无法行动者判负（Normal Play Convention）。
            博弈树的每个节点代表一个局面，每条边代表一次走法。
            对称等价的局面会被自动合并。
          </div>
        </div>
      )}

      {root && (
        <>
          {/* Toolbar */}
          <div
            style={{
              padding: "10px 24px",
              display: "flex",
              gap: 8,
              alignItems: "center",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <span style={{ fontSize: 10, color: "#555", marginRight: 4 }}>
              展开至深度:
            </span>
            {[1, 2, 3, 4, 5].map((d) => (
              <button
                key={d}
                onClick={() => expandToDepth(d)}
                style={{
                  padding: "3px 10px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 4,
                  background: "transparent",
                  color: "#888",
                  cursor: "pointer",
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {d}
              </button>
            ))}
            <button
              onClick={collapseAll}
              style={{
                padding: "3px 10px",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 4,
                background: "transparent",
                color: "#888",
                cursor: "pointer",
                fontSize: 11,
                marginLeft: 8,
              }}
            >
              全部折叠
            </button>
          </div>

          {/* Main area */}
          <div
            style={{
              display: "flex",
              height: "calc(100vh - 280px)",
              minHeight: 400,
            }}
          >
            {/* Tree panel */}
            <div
              style={{
                flex: 1,
                overflow: "auto",
                padding: "16px 24px",
              }}
            >
              <StatsBar root={root} solveStats={solveStats} />
              <TreeNode
                node={root}
                rows={currentPreset.rows}
                cols={currentPreset.cols}
                solverType={solverType}
                onUpdate={handleUpdate}
                path="root"
                selectedPath={selectedPath}
                onSelect={setSelectedPath}
              />
            </div>

            {/* Detail panel */}
            <div
              style={{
                width: 260,
                borderLeft: "1px solid rgba(255,255,255,0.06)",
                overflow: "auto",
                background: "rgba(255,255,255,0.02)",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  fontSize: 11,
                  color: "#666",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                节点详情
              </div>
              <DetailPanel node={selectedNode} />
            </div>
          </div>
        </>
      )}

      {/* Legend */}
      {root && (
        <div
          style={{
            padding: "8px 24px",
            borderTop: "1px solid rgba(255,255,255,0.04)",
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            fontSize: 10,
            color: "#555",
          }}
        >
          <span>▶ 点击箭头展开/折叠</span>
          <span>● 点击行查看详情</span>
          <span style={{ color: "#6ea8fe" }}>■ Left竖放占位</span>
          <span style={{ color: "#ff8a80" }}>■ Right横放占位</span>
          <span style={{ color: "#e0c97f" }}>×N sym = 对称等价局面数</span>
          <span>○ 终止节点(叶子)</span>
        </div>
      )}
    </div>
  );
}
