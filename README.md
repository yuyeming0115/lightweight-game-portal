# AI 世代轻量游戏门户研究工作台

这是《AI 世代轻量游戏门户 MVP 计划》的可运行静态版本。当前定位是自用研究工作台，用于持续收录轻量游戏、拆解玩法、沉淀模块，并组合自己的小游戏原型。

## 当前功能

- 机会雷达：展示样本数量、重点游戏和当前研究方向。
- 游戏库：支持搜索、平台筛选、手动收录和游戏详情查看。
- LGOS 九维评分：录入游戏时按 9 个维度评分并自动计算总分。
- 第一批样本池：内置 20 款候选样本，支持按优先级和状态筛选。
- 玩法拆解台：表单已扩展到计划中的 14 个核心段落。
- 拆解导出：支持单条玩法拆解下载为 Markdown。
- 游戏情报卡导出：支持单个游戏下载为 Markdown。
- 模块灵感库：支持按类型筛选和手动新增模块。
- MVP 组合器：根据题材、玩法、平台、周期和引用模块生成原型方案，并保存到本地。
- 研究模板：内置游戏情报卡、玩法拆解模板、模块卡，可复制。
- 本地数据：使用 `localStorage` 保存新增内容。
- 导入导出：支持导出 / 导入 JSON 数据。
- Markdown：支持复制或下载当前 MVP 方案。
- 样本转入：支持从第一批样本池一键转入游戏库。
- 研究汇总：支持整库 Markdown 汇总导出。
- 来源记录：支持来源可信度、截图观察、视频 / 评论笔记字段。
- 数据完整度：游戏卡片和详情中显示资料完整度与缺失字段。
- 流程联动：支持从游戏详情创建拆解草稿，从玩法拆解沉淀模块。

## 文件结构

```text
lightweight-game-portal-mvp/
  index.html
  styles.css
  app.js
  data/
    static-data.js
  tests/
    smoke-test.mjs
```

## 使用方式

直接打开：

```text
D:\GitWork\Demo\ai-ai\apps\sites\lightweight-game-portal-mvp\index.html
```

## 测试

```powershell
node --check D:\GitWork\Demo\ai-ai\apps\sites\lightweight-game-portal-mvp\app.js
node --check D:\GitWork\Demo\ai-ai\apps\sites\lightweight-game-portal-mvp\data\static-data.js
node D:\GitWork\Demo\ai-ai\apps\sites\lightweight-game-portal-mvp\tests\smoke-test.mjs
```

## 后续计划

1. 用真实样本替换示例游戏。
2. 增加样本池批量导入。
3. 增加 LGOS 和平台统计图。
4. 增加模块复用关系图。
5. 评估升级为 Vite / React，并把数据从 JS 常量迁移到 JSON 或接口。
