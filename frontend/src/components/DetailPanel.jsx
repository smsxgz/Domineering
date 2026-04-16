import React from "react";
import MiniBoard from "./MiniBoard";

function InfoRow({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "#888" }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: color || "#ddd",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function DetailPanel({ node }) {
  if (!node)
    return (
      <div
        style={{
          color: "#555",
          fontSize: 13,
          textAlign: "center",
          padding: 30,
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}
      >
        点击节点查看详情
      </div>
    );

  const outcomeLabel =
    node.outcome > 0
      ? "Left(竖)获胜"
      : node.outcome < 0
        ? "Right(横)获胜"
        : node.outcome === 0
          ? "平局"
          : "未解出";
  const outcomeColor =
    node.outcome > 0 ? "#6ea8fe" : node.outcome < 0 ? "#ff8a80" : "#aaa";

  return (
    <div style={{ padding: 16, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <MiniBoard board={node.board} move={node.move} size={36} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <InfoRow
          label="当前行动方"
          value={node.isLeftTurn ? "Left（竖放）" : "Right（横放）"}
          color={node.isLeftTurn ? "#6ea8fe" : "#ff8a80"}
        />
        <InfoRow label="深度" value={node.depth} />
        <InfoRow label="Left可选走法" value={node.vMoves} color="#6ea8fe" />
        <InfoRow label="Right可选走法" value={node.hMoves} color="#ff8a80" />
        <InfoRow label="Minimax结果" value={outcomeLabel} color={outcomeColor} />
        {node.symmetricCount > 0 && (
          <InfoRow label="对称等价局面" value={`+${node.symmetricCount}`} color="#e0c97f" />
        )}
        {node.children && <InfoRow label="已展开子节点" value={node.children.length} />}
      </div>

      {node.isLeftTurn && node.outcome > 0 && node.children && (
        <div
          style={{
            marginTop: 14,
            padding: 10,
            borderRadius: 6,
            background: "rgba(110,168,254,0.08)",
            fontSize: 11,
            color: "#6ea8fe",
            lineHeight: 1.5,
          }}
        >
          Left在此局面有必胜策略
        </div>
      )}
      {!node.isLeftTurn && node.outcome < 0 && node.children && (
        <div
          style={{
            marginTop: 14,
            padding: 10,
            borderRadius: 6,
            background: "rgba(255,138,128,0.08)",
            fontSize: 11,
            color: "#ff8a80",
            lineHeight: 1.5,
          }}
        >
          Right在此局面有必胜策略
        </div>
      )}
      {node.moveCount === 0 && (
        <div
          style={{
            marginTop: 14,
            padding: 10,
            borderRadius: 6,
            background: "rgba(255,255,255,0.05)",
            fontSize: 11,
            color: "#aaa",
            lineHeight: 1.5,
          }}
        >
          终止局面 — 当前行动方无合法走法，判负
        </div>
      )}
    </div>
  );
}
