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
npm run test:e2e
npm run build
npm run check
npm run balance -- --runs 20
npm run balance:acceptance
npm run data:airports
npm run data:audit
npm run release:verify
npm run upstream:check
```

`npm run build` 会生成普通静态产物和单文件产物；`npm run check` 会先测试再构建。
首次运行浏览器测试前执行 `npx playwright install chromium`；`npm run test:e2e` 会自动启动独立的 Vite 服务，并在桌面与手机视口验证核心经营流程。
`npm run balance` 会用固定种子批量运行四时代和多种经营策略；可使用 `--era era3`、`--policy balanced`、`--turns 40` 或 `--json` 缩小范围或输出明细。使用 `--hq beijing,london` 可对比指定总部，`--regional` 会覆盖北京、迪拜、伦敦、纽约和悉尼五个区域样本。
`npm run balance:acceptance` 会并行运行四时代、四策略、五总部、每组合 20 个固定种子的正式验收矩阵，并自动对照 `docs/balance-targets.md`。可用 `--workers 4` 控制并发，用 `--output /tmp/balance.json` 保存可复现明细；`--strict` 会在矩阵不完整或指标越界时返回非零状态。
`npm run data:airports` 使用仓库内固定的 OurAirports 精简快照重建机场源码和审计报告，普通构建不会联网；`npm run data:audit` 同时校验城市来源、历史市场、机场匹配、稳定 ID 和抽象回退。
`npm run release:verify` 会运行构建、版本与 standalone 校验、正式平衡验收、双视口 E2E，并用 `file://` 直接启动玩家单文件产物。推送与 `GAME_VERSION` 一致的 `v*` tag 后，GitHub Actions 会上传 `dist/standalone.html` 和 SHA-256 发布清单，并创建对应 Release。
`npm run upstream:check` 会从线上入口递归发现 HTML、CSS、JavaScript、manifest 和浏览器实际加载的同源资源，只报告与 `upstream/` 的差异；第三方外链只进入报告，不会复制。确认差异后使用 `npm run upstream:sync` 原子更新快照；可加 `-- --no-browser` 只做静态发现，或 `-- --report upstream-report.json` 保存报告。

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
- `docs/balance-targets.md`：四时代平衡验收目标、区域样本矩阵和通关评级阈值。
- `docs/airport-city-system-design.md`：城市数据重整、机场领域模型、存档兼容和分阶段实施方案。
- `docs/airport-slot-feasibility.md`：时刻资产交易的阶段 5 可行性结论、延后原因和后续立项条件。
- `docs/visual-regression.md`：桌面与手机界面的视觉回归场景矩阵和失败标准。
- `docs/upstream-sync.md`：上游资源图发现、漂移检查、原子同步和审查流程。
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
