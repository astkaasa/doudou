# Doudou Airline

本项目是从 `https://paratranz.cn/doudou/` 整理出来的本地工程化版本。技术栈是 Vite + vanilla JavaScript modules。

## 普通玩家运行

不需要安装 npm、Python 或本地网页服务。直接双击：

```text
dist/standalone.html
```

不要双击 `dist/index.html`。它是普通静态网站产物，需要通过网页服务访问。

## 开发者运行

```bash
cd /Users/as/Developer/doudou
npm install
npm run dev
```

打开：

```text
http://127.0.0.1:5173/
```

常用命令：

```bash
npm run test
npm run build
npm run check
npm run balance -- --runs 20
```

`npm run build` 会生成普通静态产物和单文件产物；`npm run check` 会先测试再构建。
`npm run balance` 会用固定种子批量运行四时代和多种经营策略；可使用 `--era era3`、`--policy balanced`、`--turns 40` 或 `--json` 缩小范围或输出明细。

## 文件角色

- `index.html`：Vite 源码入口，开发和构建都需要保留。
- `src/`：游戏源码。
- `src/data/`：城市、地图、机型、AI、新闻、时代剧本等数据。
- `src/domain/`：经济模型、航线、机队、事件修正器、存档、回合推进等核心规则。
- `src/ui/`：HUD、地图、面板、弹窗、教程等界面渲染。
- `src/styles/app.css`：主要样式。
- `scripts/`：构建辅助脚本，包括生成 `dist/standalone.html`。
- `tests/`：Vitest 单元测试。
- `docs/balance-baseline.md`：四时代批量模拟方法、当前基线和待验证的平衡问题。
- `public/`：开发和构建使用的静态资源。
- `upstream/`：原始上游快照，包含入口 HTML 和按资源图发现的同源资源，只用于对照，不要手动修改。
- `dist/index.html`：构建生成的普通静态网站入口。
- `dist/standalone.html`：给普通玩家双击运行的单文件版本。

## 开发约定

- 不手动修改 `dist/`；需要更新产物时运行 `npm run build` 或 `npm run check`。
- 不手动修改 `upstream/`；同步上游时需要按当前线上结构更新整棵快照。上游可能是单文件 HTML，也可能引用拆分脚本、CSS、构建产物目录、hash 文件名或动态加载资源；同步时以入口页面发现的同源资源图为准。
- UI 事件使用 `data-action` 和统一事件委派，不新增内联 `onclick` / `oninput`。
- 城市源数据使用 `lat/lon`，地图坐标通过 `projectCity` / `projectLonLat` 投影生成。
- 报纸事件影响统一走 `state.activeModifiers`，经济模型负责消费修正器。
- 改核心规则时补或更新测试。

## 文档

- `README.md`：给人看的运行和目录说明。
- `AGENTS.md`：给代码助手看的开发约束。
- `CLAUDE.md`：Claude 的入口提示，规则以 `AGENTS.md` 为准。
