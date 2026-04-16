import React from "react";

const DEFAULT_CELL = 22;
const GAP = 1;

export default function MiniBoard({ board, move, size }) {
  const rows = board.length;
  const cols = board[0].length;
  // Dynamic sizing: scale down for larger boards
  const cellSize = size || Math.max(8, Math.min(DEFAULT_CELL, Math.floor(160 / Math.max(rows, cols))));
  const w = cols * (cellSize + GAP) + GAP;
  const h = rows * (cellSize + GAP) + GAP;

  return (
    <svg width={w} height={h} style={{ display: "block", flexShrink: 0 }}>
      <rect width={w} height={h} rx={3} fill="#1a1a2e" />
      {board.map((row, r) =>
        row.map((cell, c) => {
          const x = GAP + c * (cellSize + GAP);
          const y = GAP + r * (cellSize + GAP);
          const isHighlight =
            move &&
            ((r === move[0] && c === move[1]) || (r === move[2] && c === move[3]));
          let fill = "#2a2a4a";
          if (cell === 1) fill = isHighlight ? "#6ea8fe" : "#3d6098";
          else if (cell === 2) fill = isHighlight ? "#ff8a80" : "#984040";

          return (
            <rect
              key={`${r}-${c}`}
              x={x}
              y={y}
              width={cellSize}
              height={cellSize}
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
