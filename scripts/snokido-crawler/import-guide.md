# Snokido 游戏数据导入指南

## 📊 批量抓取结果

**生成时间：** 2026-07-04  
**成功抓取：** 12/21 个游戏  
**输出文件：** `snokido-games-20260704.json`

### ✅ 成功抓取的游戏

| # | 游戏名 | 开发者 | 类型 |
|---|---------|--------|------|
| 1 | Egg Adventure | Yizhiyuan Network | 解谜 |
| 2 | Snail Bob 7 | Hunter Hamster | 解谜 |
| 3 | Block Blast | 2Play | 解谜 |
| 4 | Bouncemasters | Famobi | 动作 |
| 5 | Basketball Stars | Mad Puffers | 体育 |
| 6 | Fireboy & Watergirl 6 | Septimaniac | 冒险 |
| 7 | Adam & Eve | Functu | 冒险 |
| 8 | Red Ball 5 | - | 动作 |
| 9 | Flappy Bird | - | 街机 |
| 10 | 2048 | - | 街机 |
| 11 | Hill Climb Racing | - | 竞速 |
| 12 | Happy Wheels | - | 技巧 |

---

## 🚀 如何导入到项目

### 方法 1：通过 UI 导入（推荐）

1. **启动项目**
   ```bash
   cd D:\GitWork\Demo\ai-ai\apps\sites\lightweight-game-portal-mvp
   # 打开 index.html（双击或用浏览器打开）
   ```

2. **导入 JSON**
   - 在项目页面中，找到"导入"按钮（通常在顶部或侧边栏）
   - 点击"导入"按钮
   - 选择文件：`scripts/snokido-crawler/snokido-games-20260704.json`
   - 等待导入完成

3. **验证导入**
   - 检查游戏列表，确认 12 个游戏都已导入
   - 点击某个游戏，查看详情是否正确

### 方法 2：通过开发者工具导入

如果项目支持 localStorage 直接导入：

1. **打开浏览器开发者工具**（F12）
2. **在 Console 中运行：**
   ```javascript
   // 读取 JSON 文件（需要先通过 <input type="file"> 加载）
   // 或者复制 JSON 内容，然后：
   const json = /* 粘贴 JSON 内容 */;
   const data = JSON.parse(json);
   localStorage.setItem('games', JSON.stringify(data.games));
   location.reload(); // 刷新页面
   ```

---

## 📝 如何获取更多游戏 URL

由于我猜测的某些 URL slug 不正确（返回 404），建议你手动获取真实的游戏 URL：

### 方法 1：从 Snokido 分类页面获取

1. 访问 Snokido 分类页面：
   - 解谜：https://www.snokido.com/logic-games
   - 动作：https://www.snokido.com/action-games
   - 体育：https://www.snokido.com/sports-games

2. 右键点击游戏缩略图 → "复制链接地址"

3. 将 URL 添加到 `urls.txt`

### 方法 2：使用搜索功能

1. 在 Snokido 搜索框中输入游戏名
2. 点击搜索结果中的游戏
3. 复制地址栏的 URL

### 方法 3：使用 P1 油猴脚本（推荐）

1. 安装 Tampermonkey 扩展
2. 导入 `snokido-extractor.user.js`
3. 浏览 Snokido 游戏页面时，点击右上角按钮一键提取

---

## 🔄 批量抓取命令

```bash
cd scripts/snokido-crawler

# 1. 编辑 urls.txt，添加游戏 URL

# 2. 运行批量抓取
node crawler.js --batch urls.txt --output snokido-games-$(date +%Y%m%d).json

# 3. 查看结果
cat snokido-games-*.json | grep -c '"name":'  # 统计游戏数量
```

---

## ⚙️ 数据字段说明

| 字段 | 来源 | 说明 |
|------|------|------|
| `name` | Snokido 页面 `<h1>` | 游戏名 |
| `genre` | Snokido 标签 + 映射表 | 游戏类型（解谜/动作/体育等） |
| `team` | Snokido 开发者链接 | 开发者/工作室 |
| `screenshotNotes` | `og:image` | 封面图 URL |
| `playSource` | 页面 URL | 原始链接 |
| `tags` | Snokido 标签 | 包含所有原始标签 |
| `reason` | `og:description` | 游戏描述 |

**默认值字段**（需手动修改）：
- `art`, `dev`：设为"待评估"
- `lgos`：设为 0（需手动评分）
- `region`：设为"欧美"

---

## 🎯 下一步建议

### 选项 1：立即分析（推荐）
1. 导入 12 个游戏到项目
2. 开始研究分析，填写 `lgos` 评分
3. 运行 LGOS 汇总，找出高潜力游戏

### 选项 2：先扩充数据
1. 手动获取 20-30 个真实游戏 URL
2. 重新运行批量抓取
3. 导入更多游戏后分析

### 选项 3：使用 P1 油猴脚本
1. 安装 Tampermonkey
2. 浏览 Snokido，遇到感兴趣的游戏时一键提取
3. 逐步建立游戏库

---

## 🐛 常见问题

### Q1：导入后游戏类型不对？
**A：** 检查 `genre` 字段。爬虫按优先级映射类型（解谜 > 冒险 > 体育 > 动作）。如果不正确，可以手动修改。

### Q2：某些字段是空的？
**A：** 这是正常的。Snokido 页面可能不包含某些信息（如开发者、游玩次数）。你可以手动补充。

### Q3：如何更新已有游戏的数据？
**A：** 目前需要手动删除旧游戏，然后重新导入。后续可以添加"更新"功能。

---

**生成时间：** 2026-07-04 17:10  
**文件路径：** `scripts/snokido-crawler/import-guide.md`
