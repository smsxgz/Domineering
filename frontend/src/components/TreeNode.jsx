import React, { useState, useCallback } from "react";
import MiniBoard from "./MiniBoard";
import { expandNode as apiExpandNode } from "../api";

export default function TreeNode({
  node,
  rows,
  cols,
  solverType,
  onUpdate,
  path,
  selectedPath,
  onSelect,
}) {
  const [loading, setLoading] = useState(false);
  const isExpanded = node.children !== null;
  const isTerminal = node.moveCount === 0;
  const isSelected = selectedPath === path;

  const outcomeLabel =
    node.outcome > 0 ? "L胜" : node.outcome < 0 ? "R胜" : node.outcome === 0 ? "平" : "?";
  const outcomeColor =
    node.outcome > 0 ? "#6ea8fe" : node.outcome < 0 ? "#ff8a80" : "#aaa";

  const handleToggle = useCallback(async () => {
    if (isTerminal) return;
    if (isExpanded) {
      onUpdate(path, { ...node, children: null });
      return;
    }
    setLoading(true);
    try {
      const data = await apiExpandNode(
        rows,
        cols,
        node.board,
        node.isLeftTurn,
        node.depth,
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
      onUpdate(path, { ...node, children });
    } catch (err) {
      console.error("Expand failed:", err);
    } finally {
      setLoading(false);
    }
  }, [isExpanded, isTerminal, node, rows, cols, solverType, onUpdate, path]);

  const handleSelect = useCallback(() => onSelect(path), [path, onSelect]);

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
        onMouseEnter={(e) => {
          if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        }}
        onMouseLeave={(e) => {
          if (!isSelected) e.currentTarget.style.background = "transparent";
        }}
      >
        {/* Expand/collapse toggle */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          style={{
            width: 20,
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
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
          {loading ? (
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                border: "2px solid #555",
                borderTop: "2px solid #6ea8fe",
                borderRadius: "50%",
                animation: "spin 0.6s linear infinite",
              }}
            />
          ) : isTerminal ? (
            "○"
          ) : (
            "▶"
          )}
        </div>

        <MiniBoard board={node.board} move={node.move} />

        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: node.isLeftTurn ? "#6ea8fe" : "#ff8a80",
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.03em",
              }}
            >
              {node.isLeftTurn ? "▍Left(竖)" : "▍Right(横)"}
            </span>
            <span
              style={{
                fontSize: 11,
                color: "#888",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              d={node.depth}
            </span>
            <span
              style={{
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 3,
                background: `${outcomeColor}22`,
                color: outcomeColor,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {outcomeLabel}
            </span>
            {node.symmetricCount > 0 && (
              <span
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 3,
                  background: "rgba(224,201,127,0.15)",
                  color: "#e0c97f",
                  fontWeight: 600,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                ×{node.symmetricCount + 1} sym
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "#777",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            竖:{node.vMoves} 横:{node.hMoves}
            {node.moveCount > 0 && !isExpanded && !loading && (
              <span style={{ color: "#555", marginLeft: 6 }}>
                [{node.moveCount}个走法]
              </span>
            )}
            {loading && (
              <span style={{ color: "#6ea8fe", marginLeft: 6 }}>计算中...</span>
            )}
          </div>
        </div>
      </div>

      {/* Children */}
      {isExpanded && node.children && (
        <div
          style={{
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            marginLeft: 11,
          }}
        >
          {node.children.map((child, i) => (
            <TreeNode
              key={child.key + i}
              node={child}
              rows={rows}
              cols={cols}
              solverType={solverType}
              onUpdate={(p, updated) => {
                const newChildren = [...node.children];
                if (p === `${path}/${i}`) {
                  newChildren[i] = updated;
                  onUpdate(path, { ...node, children: newChildren });
                } else {
                  onUpdate(p, updated);
                }
              }}
              path={`${path}/${i}`}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
