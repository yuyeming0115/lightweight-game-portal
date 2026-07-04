# 开发文档 - LG 轻量游戏研究台

## 项目概述

静态 HTML/CSS/JS 单页应用，无需构建工具，直接浏览器打开或通过本地 HTTP 服务器运行。

- `index.html` — 主页面结构（侧边栏 + Tab 面板）
- `styles.css` — 全局样式（深色主题）
- `app.js` — 全部交互逻辑和状态管理
- `data/static-data.js` — 默认示例数据

---

## 本地开发

### 启动预览服务器

```bash
# 项目约定使用 3000 端口
npx http-server -p 3000 --cors -c-1
# 或
python -m http.server 3000
```

然后访问 http://localhost:3000

> ⚠️ 不要直接双击 `index.html` 用 `file://` 协议打开，会导致 fetch/module 加载失败。

### 数据持久化

所有数据存在 `localStorage`（key: `lg-portal-mvp-state-v2`）。
清除浏览器数据或点击页面底部「重置」按钮即可恢复默认示例数据。

---

## 常见坑与经验教训

### 坑 1：HTML 元素缺失导致整个 renderAll() 静默失败

**现象**：页面全白，所有面板都没有内容，控制台无显眼报错。

**根因**：`app.js` 顶部通过 `querySelector` 一次性收集所有 DOM 节点到 `nodes` 对象。如果 HTML 里缺少某个 `data-*` 元素（如 `data-template-grid`），对应节点为 `null`。`renderAll()` 调用各渲染函数时，若函数直接访问 `null.innerHTML` 会抛 TypeError，但未被 catch，导致后续渲染全部中断。

**教训**：
- 新增/删除 HTML 面板时，必须同步检查 `app.js` 顶部的 `nodes` 对象，确保每個 `data-*` 选择器在 HTML 中存在
- 渲染函数内部应加 null 保护：`if (!nodes.xxx) return;`
- `bindEvents()` 中的所有 `addEventListener` 调用应包装为安全函数（见下方）

**已采取的修复**：
```js
// app.js 中已添加安全绑定函数
function on(node, eventName, handler) {
  if (node) node.addEventListener(eventName, handler);
}
```

---

### 坑 2：Tab 切换不生效

**现象**：点击左侧导航按钮，主区域面板不切换。

**根因**：
1. `switchTab()` 函数已定义且绑定，但 `bindEvents()` 中某个 `nodes.xxx.addEventListener` 因节点为 null 抛错，中断了后续所有 JS 执行（包括 Tab 绑定代码）——*实际上 Tab 绑定代码在 `bindEvents` 之前，此场景未确认*
2. CSS 中 `.tab-panel { display: none }` 和 `.tab-panel.active { display: block }` 正确，但 `active` 类未被正确切换

**排查方法**：在 HTML 末尾临时添加调试脚本，点击按钮后检查 `document.querySelector('.tab-panel.active')` 的 id 是否变化。

**修复**：确保 `switchTab()` 在 DOMContentLoaded 后正确绑定，必要时在 HTML 末尾添加内联兜底脚本。

---

### 坑 3：inline script 调试技巧

当页面"看起来没内容"时，在 `</body>` 前添加：

```html
<script>
  setTimeout(function(){
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:8px;right:8px;z-index:9999;background:#c94f47;color:#fff;padding:10px;font-size:12px;font-family:monospace;border-radius:6px;';
    el.innerHTML = 'stats:' + document.querySelector('[data-stats]')?.innerHTML?.length
      + '<br>focus:' + document.querySelector('[data-focus-card]')?.innerHTML?.length;
    document.body.appendChild(el);
  }, 1000);
</script>
```

这样可以快速判断是哪个渲染函数没执行。

---

### 坑 4：CSS 变量值错误

**现象**：某个颜色渲染异常（如绿色看起来是紫色或完全透明）。

**根因**：Hex 颜色值位数错误，如 `#2f6f5`（5位）是非法的，浏览器会忽略该声明。

**检查**：搜索 CSS 中所有 `#` 后的 hex 值，确保是 3位、4位（带alpha）、6位或8位。

---

## 代码架构注意项

### nodes 对象与 HTML 的强耦合

`app.js` 第 18-49 行定义了 `nodes` 对象，通过 `data-*` 属性选择器绑定 DOM 节点。**每次修改 HTML 结构后必须检查 `nodes` 对象是否仍然有效**。

### renderAll() 无错误处理

`renderAll()` 依次调用 10+ 个渲染函数，任何一个抛异常都会中断后续渲染。建议改为：

```js
function renderAll() {
  [
    renderOptions,
    renderVersionNote,
    renderStats,
    // ...
  ].forEach(fn => {
    try { fn(); } catch(e) { console.error(fn.name, e); }
  });
}
```

### 事件绑定集中在一个函数

所有事件监听都在 `bindEvents()` 中绑定。新增交互时记得在这里添加，否则点击无反应。

---

## 提交规范

- 提交信息使用中文
- 每次提交应有实际的用户价值描述（如"修复内容消失bug"而非"改代码"）
- 大重构（如本次深色主题+侧边栏）应一次提交，附带详细说明

---

## 待改进项

- [ ] `bindEvents()` 中所有 `addEventListener` 调用改为 `on()` 安全包装
- [ ] `renderAll()` 添加 try-catch 保护
- [ ] 添加单元测试或 E2E 测试（Playwright）
- [ ] 拆分 `app.js`（当前 1400+ 行，按功能模块拆分）
- [ ] 添加 Service Worker 支持离线使用
