# CLAUDE.md

请先阅读并遵守 `AGENTS.md`。本项目只维护一份完整的 agent 规则，避免多处说明互相漂移。

开始改代码前，请按这个顺序确认上下文：

1. `AGENTS.md`
2. `README.md`

最高优先级提醒：

- 源码改 `src/`，不要手动改 `dist/`；`dist/standalone.html` 只能通过构建生成。
- 城市源数据使用 `lat/lon`，不要重新给城市对象添加 `x/y`。
- UI 事件使用 `data-action` 和统一事件委派，不要新增内联事件。
- 报纸事件影响必须走 `state.activeModifiers`，不要把临时效果直接塞进 route。
- 交付前尽量运行 `npm run check`；如果没有运行，说明原因。

如果本文件和 `AGENTS.md` 有冲突，以 `AGENTS.md` 为准。
