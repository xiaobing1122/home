# 财经快讯

一个自动更新的财经新闻页面。数据来源：华尔街见闻、东方财富、金十数据。

## 工作方式

GitHub Actions 每 2 小时自动运行一次抓取脚本，把最新新闻写入 `news.json`，
并在同一次运行中直接把页面部署到 GitHub Pages。电脑关机也照常更新。

## 项目结构

- `index.html` / `app.js` / `styles.css` — 新闻列表页（读取 `news.json` 渲染）
- `scripts/fetch-news.mjs` — 抓取脚本：抓取 → 去重 → 写入 `news.json`
- `scripts/serve.mjs` — 本地预览：`node scripts/serve.mjs` 后访问 http://localhost:8000
- `.github/workflows/update-news.yml` — 定时任务配置（每 2 小时一次）

## 手动更新

仓库 Actions 页面 → 左侧「更新财经快讯」→ 右侧 Run workflow，可立即手动刷新一次。
