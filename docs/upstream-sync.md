# Upstream Sync

上游入口默认是 `https://paratranz.cn/doudou/`。同步命令只镜像从入口资源图发现的同源响应；第三方 URL 会进入报告，但不会写入仓库。

## Commands

```bash
npm run upstream:check
npm run upstream:check -- --report upstream-report.json
npm run upstream:sync
```

`upstream:check` 默认同时运行静态发现和 Chromium 网络记录，不写 `upstream/`。退出码含义：

- `0`：快照与线上资源图一致。
- `1`：发现 added、changed 或 removed 漂移。
- `2`：抓取、解析或文件操作失败。

使用 `--no-browser` 可只检查 HTML、CSS、JavaScript 和 manifest 的静态引用，但动态加载资源可能被报告为 removed。只有在无法运行 Chromium、且明确接受这个限制时使用。

## Discovery

- HTML：`script`、`link`、图片和媒体、`srcset`、内联样式/脚本、import map。
- CSS：`@import` 和 `url(...)`。
- JavaScript：静态 import/export、dynamic import、`fetch`、`new URL`、Worker、service worker 和静态 `src/href/poster` 赋值。
- Manifest：图标、截图、快捷方式和启动 URL。
- Browser：页面加载期间实际收到的 HTTP(S) 响应。

入口目录内的 URL 保持相对路径；同源但位于入口目录外的资源放在 `_origin/`。带 query 的资源会在扩展名前增加 query 哈希，避免不同响应覆盖同一文件。

`upstream/.snapshot.json` 不包含抓取时间，只记录 URL、相对路径、内容类型、字节数和 SHA-256，因此同一线上版本可生成稳定快照。

## Review

1. 先运行 `npm run upstream:check -- --report upstream-report.json`。
2. 阅读 added、changed、removed、externalReferences 和 warnings。
3. 确认后运行 `npm run upstream:sync`；脚本会先生成 staging，再替换整棵快照。
4. 用 `git diff -- upstream/` 检查上游变化，不直接把上游代码覆盖到 `src/`。
5. 移植玩法时按本项目领域模型、存档兼容和测试约束重新实现。
