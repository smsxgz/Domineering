"""
SQLite persistent cache for solved Domineering positions.

Stores outcomes keyed by (rows, cols, canonical_mask, is_left_turn).
Both solver variants share the same cache since canonical keys are identical.
"""

import sqlite3
import threading


class PersistentCache:
    def __init__(self, db_path: str = "domineering_cache.db"):
        self.db_path = db_path
        self._local = threading.local()
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        if not hasattr(self._local, "conn") or self._local.conn is None:
            conn = sqlite3.connect(self.db_path, check_same_thread=False)
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA synchronous=NORMAL")
            self._local.conn = conn
        return self._local.conn

    def _init_db(self):
        conn = self._get_conn()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS solutions (
                rows INTEGER NOT NULL,
                cols INTEGER NOT NULL,
                canonical_mask INTEGER NOT NULL,
                is_left_turn INTEGER NOT NULL,
                outcome INTEGER NOT NULL,
                PRIMARY KEY (rows, cols, canonical_mask, is_left_turn)
            )
        """)
        conn.commit()

    def get(self, rows: int, cols: int, canonical_mask: int, is_left_turn: bool) -> int | None:
        conn = self._get_conn()
        cur = conn.execute(
            "SELECT outcome FROM solutions WHERE rows=? AND cols=? AND canonical_mask=? AND is_left_turn=?",
            (rows, cols, canonical_mask, int(is_left_turn)),
        )
        row = cur.fetchone()
        return row[0] if row else None

    def put(self, rows: int, cols: int, canonical_mask: int, is_left_turn: bool, outcome: int):
        conn = self._get_conn()
        conn.execute(
            "INSERT OR IGNORE INTO solutions (rows, cols, canonical_mask, is_left_turn, outcome) VALUES (?, ?, ?, ?, ?)",
            (rows, cols, canonical_mask, int(is_left_turn), outcome),
        )
        conn.commit()

    def bulk_put(self, entries: list[tuple[int, int, int, bool, int]]):
        conn = self._get_conn()
        conn.executemany(
            "INSERT OR IGNORE INTO solutions (rows, cols, canonical_mask, is_left_turn, outcome) VALUES (?, ?, ?, ?, ?)",
            [(r, c, m, int(lt), o) for r, c, m, lt, o in entries],
        )
        conn.commit()

    def count(self, rows: int, cols: int) -> int:
        conn = self._get_conn()
        cur = conn.execute(
            "SELECT COUNT(*) FROM solutions WHERE rows=? AND cols=?",
            (rows, cols),
        )
        return cur.fetchone()[0]

    def close(self):
        if hasattr(self._local, "conn") and self._local.conn:
            self._local.conn.close()
            self._local.conn = None
