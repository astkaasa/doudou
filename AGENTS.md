# AGENTS.md

本文件是给 Codex、Claude、Cline 等代码助手看的工程约束。开始改代码前先读本文件，再读 `README.md`。

## 项目定位

这是一个 Vite + vanilla JavaScript modules 的航空经营小游戏。不要在没有明确需求时引入 React、Vue、TypeScript、状态管理库或新的构建系统。

普通玩家入口是：

```text
dist/standalone.html
```

开发入口是：

```bash
npm install
npm run dev
npm run check
```

## 边界

- `src/` 是源码。
- `dist/` 是构建产物，不要手动编辑。
- `upstream/index.html` 是原始快照，不要修改。
- `index.html` 是 Vite 源码入口，需要保留。
- `scripts/build-standalone.mjs` 负责生成单文件版本。

## 必守规则

1. 不手动修改 `dist/index.html`、`dist/assets/*`、`dist/standalone.html`。
2. 不新增 `run-game.command`、Python 本地服务脚本或玩家运行脚本；普通玩家只双击 `dist/standalone.html`。
3. 不新增内联 `onclick`、`oninput` 等事件属性；UI 事件统一走 `data-action` 和集中事件委派。
4. 不随意改城市 id。新闻事件、测试、存档和默认总部依赖 `beijing`、`shanghai`、`tokyo`、`dubai`、`singapore`、`sydney` 等 id。
5. 改玩法计算优先改 `src/domain/`，并补或更新测试。
6. 改 UI 时保持当前深色管理面板风格，不做营销页、落地页或大幅装饰化重设计。

## 城市和地图

`src/data/cities.js` 的城市源数据只使用 `lat/lon`，不要给城市对象重新添加 `x/y` 字段。

需要地图坐标时使用：

```js
projectCity(city)
projectLonLat(lat, lon)
```

地图渲染在 `src/ui/map.js`。当前地图支持 Natural Earth 矢量底图、城市触控热区、hover 城市名、滚轮缩放、横向循环卷轴滚动，以及缩放时城市点和标签尺寸补偿。

改地图时至少检查：

- 城市点是否仍能点击。
- 总部、选中城市、已通航城市高亮是否正确。
- 放大后点和标签是否过大或遮挡。
- 横向循环滚动是否仍能衔接。
- 手机触控热区是否仍够大。

## 回合和事件

当前规则是：

```text
1 回合 = 1 个季度 = 3 个月
```

状态字段是 `year`、`quarter`、`turnsPlayed`。没有真实日期、小时、昼夜、晨昏线逻辑。

报纸事件不要直接改航线票价、品牌或临时塞字段到 route 上。事件影响统一走：

```js
state.activeModifiers
```

相关路径：

- `src/data/news.js`：生成事件修正器。
- `src/domain/modifiers.js`：匹配、叠加、过期。
- `src/domain/economy.js`：消费修正器计算收入、成本、客座率和停飞。
- `src/domain/turn.js`：季度推进和修正器递减。
- `src/domain/save.js`：存档兼容和迁移。

## 交付检查

提交前必须检查本次改动是否需要更新 `CHANGELOG.md`。玩家可见的新玩法、体验变化、规则调整和 bug 修复都应更新；纯内部重构、测试整理或无玩家可见影响的维护项可以不写。

交付前至少运行：

```bash
npm run check
```

如果改了 UI 或地图，建议手动冒烟：选择时代和总部、买飞机、开航线、推进一回合、存档和读档。

如果不能运行测试或浏览器验证，交付说明必须写清原因。

## 新手开发建议

- 优先做小改动，不要一次重构多个模块。
- 改数据前先搜索 id 引用。
- 改经济模型前看 `tests/economy.test.js`、`tests/routes.test.js`、`tests/events.test.js`。
- 改回合逻辑前看 `tests/turn.test.js`。
- 改地图前看 `src/data/cities.js` 和 `src/ui/map.js`。
- 看不懂构建产物时，不要改 `dist/`，回到 `src/` 找源头。
