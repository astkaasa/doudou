# 数据来源快照

此目录保存可提交、可审计的小型来源快照和来源元数据，不保存几十 MB 的原始工作簿。玩家构建和 `npm run check` 不联网。

## 城市人口

- `city-population-wup-2025.json` 保存本项目 123 个城市市场所需的来源行、显式城市映射和历史观测值。
- 默认来源为 UN DESA World Urbanization Prospects 2025；底层城市中心统计来自 GHS-WUP-MTUC R2025A V1.1。
- 关岛和塞班不是 WUP 城市中心，分别使用世界银行的关岛和北马里亚纳群岛人口序列，表示岛屿航空市场而非市区人口。
- WUP 在城市尚未达到统一城市中心阈值的年份可能没有记录；生成器会使用首两个来源观测值、将年增长率限制在 -3% 至 6% 后回推，并把这些年份标为 `derived-backcast`，不会伪装成来源原值。

更新流程：

```bash
npm run data:sync:cities
npm run data:cities
npm run data:audit:write
```

`data:sync:cities` 会联网下载官方工作簿；也可以通过 `--input /path/to/file.xlsx --offline` 使用本地文件。生成和审计命令完全离线。

## 机场与跑道

- `ourairports-selected.json` 是 2026-07-09 的 OurAirports `airports.csv` 与 `runways.csv` 精简快照，只保留 123 个城市的候选机场和所需跑道字段。
- `src/data/airports.generated.js` 由精简快照离线生成；每个真实机场使用 `oa-{OurAirports id}` 稳定 ID，每个城市另有 `virtual-{cityId}` 抽象机场。
- 伦敦、东京、纽约、北京和上海的多机场映射，以及少量明显的现代主机场选择，保存在 `src/data/airportOverrides.js`，不会混入事实快照。
- OurAirports 数据为 Public Domain，但不保证准确性或适用性；自动匹配的分数、候选、距离、置信度和警告见 `docs/airport-data-audit.md`。

更新命令：

```bash
npm run data:sync:airports
npm run data:airports
npm run data:audit
```
