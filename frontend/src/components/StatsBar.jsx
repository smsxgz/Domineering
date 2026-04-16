import React from "react";

export default function StatsBar({ root, solveStats }) {
  const outcomeLabel =
    root.outcome > 0 ? "Left胜" : root.outcome < 0 ? "Right胜" : root.outcome === 0 ? "平" : "?";
  const outcomeColor =
    root.outcome > 0 ? "#6ea8fe" : root.outcome < 0 ? "#ff8a80" : "#aaa";

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        padding: "10px 16px",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 8,
        marginBottom: 12,
        flexWrap: "wrap",
      }}
    >
      {[
        { label: "根节点结果", value: outcomeLabel, color: outcomeColor },
        {
          label: "搜索节点数",
          value: solveStats ? solveStats.nodes_visited.toLocaleString() : "-",
          color: "#e0c97f",
        },
        {
          label: "缓存命中",
          value: solveStats ? solveStats.cache_hits.toLocaleString() : "-",
          color: "#8be9fd",
        },
        {
          label: "计算耗时",
          value: solveStats ? `${solveStats.time_ms.toFixed(1)}ms` : "-",
          color: "#bd93f9",
        },
      ].map((s) => (
        <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            style={{
              fontSize: 10,
              color: "#666",
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            {s.label}
          </span>
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: s.color,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
}
