# Domineering 博弈树探索器

交互式探索 Domineering 博弈树的 Web 应用。Python 后端负责计算和缓存，React 前端负责展示。

## Domineering 规则

- **Left** 竖放 2×1 多米诺骨牌，**Right** 横放 1×2 多米诺骨牌
- 双方交替行动
- 无法行动者判负（Normal Play Convention）

## 功能特点

- **两种求解器**：Plain Minimax（穷举搜索）和 Alpha-Beta（剪枝优化），可在界面切换对比
- **对称性合并**：利用水平翻转、垂直翻转、180°旋转三种对称性，去除等价局面
- **持久化缓存**：SQLite 存储已解出的局面，跨会话复用
- **惰性展开**：按需计算子节点，大棋盘也可逐层探索
- **棋盘预设**：从 2×2 到 8×8

## 快速开始

### 1. 启动后端

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

### 3. 打开浏览器

访问 http://localhost:3000

### 或者一键启动

```bash
./run.sh
```

## 项目结构

```
backend/
  board.py         # 棋盘表示（bitboard）+ 走法生成
  symmetry.py      # 对称变换 + 规范化
  solver.py        # MinimaxSolver + AlphaBetaSolver
  cache.py         # SQLite 持久化缓存
  tree.py          # 博弈树节点构建 + 对称去重
  main.py          # FastAPI 应用 + API 端点
  models.py        # Pydantic 请求/响应模型

frontend/
  src/
    App.jsx                  # 主应用
    api.js                   # 后端 API 客户端
    components/
      MiniBoard.jsx          # SVG 棋盘渲染
      TreeNode.jsx           # 博弈树节点（异步展开）
      DetailPanel.jsx        # 节点详情面板
      StatsBar.jsx           # 统计信息栏
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/init` | 初始化博弈树（解根节点 + 展开第一层） |
| POST | `/api/expand` | 展开节点（返回去重后的子节点） |
| POST | `/api/solve` | 解单个局面 |
| GET | `/api/presets` | 获取棋盘预设列表 |

## 求解器性能对比

| 棋盘 | 胜者 | Minimax 节点 | 耗时 | Alpha-Beta 节点 | 耗时 | 加速比 |
|------|------|-------------|------|----------------|------|--------|
| 3×4 | Right | 69 | 1ms | 11 | <1ms | 6× |
| 4×4 | Left | 648 | 14ms | 63 | 1ms | 10× |
| 5×5 | Right | 114,134 | 5.3s | 2,464 | 86ms | 46× |
| 5×6 | Right | 2,127,972 | 137s | 10,808 | 484ms | 197× |
| 6×6 | Left | - | - | 93,179 | 5.5s | - |
