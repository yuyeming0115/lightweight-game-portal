(function () {
  const STORAGE_KEY = "lg-portal-mvp-state-v2";
  const LEGACY_STORAGE_KEY = "lg-portal-mvp-state-v1";
  const APP_SCHEMA_VERSION = 3;
  const SAMPLE_IMPORT_EXAMPLE = [
    "修仙大作战 | 微信小游戏 | 修仙 / 放置 | P0 | 研究长线成长和付费礼包",
    "整理冰箱 | 抖音小游戏 | 收纳 | P2 | 3 秒看懂",
    "Pocket Puzzle Lab | itch | 解谜 | P1 | 实验机制参考"
  ].join("\n");
  const defaultData = window.LG_PORTAL_DEFAULT_DATA;
  let bootNotice = "";
  let state = loadState();
  let selectedAnalysisId = state.analyses[0]?.id || null;
  let currentPrototypeText = "";
  let preferredComposerModuleIds = [];

  const $ = (selector) => document.querySelector(selector);
  const nodes = {
    stats: $("[data-stats]"),
    versionNote: $("[data-version-note]"),
    researchInsights: $("[data-research-insights]"),
    focusCard: $("[data-focus-card]"),
    radarColumn: $("[data-radar-column]"),
    gameGrid: $("[data-game-grid]"),
    gameSearch: $("[data-game-search]"),
    platformFilter: $("[data-platform-filter]"),
    gameForm: $("[data-game-form]"),
    lgosInputs: $("[data-lgos-inputs]"),
    samplePriority: $("[data-sample-priority]"),
    sampleStatus: $("[data-sample-status]"),
    sampleBoard: $("[data-sample-board]"),
    sampleBulkForm: $("[data-sample-bulk-form]"),
    sampleBulkInput: $("[data-sample-bulk-input]"),
    analysisList: $("[data-analysis-list]"),
    analysisDetail: $("[data-analysis-detail]"),
    analysisForm: $("[data-analysis-form]"),
    moduleBoard: $("[data-module-board]"),
    moduleGraph: $("[data-module-graph]"),
    moduleFilter: $("[data-module-filter]"),
    moduleForm: $("[data-module-form]"),
    composerForm: $("[data-composer-form]"),
    proposalPanel: $("[data-proposal-panel]"),
    prototypeList: $("[data-prototype-list]"),
    templateGrid: $("[data-template-grid]"),
    toast: $("[data-toast]"),
    importFile: $("[data-import-file]"),
    gameDialog: $("[data-game-dialog]"),
    gameDialogBody: $("[data-game-dialog-body]")
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  // 安全绑定事件：节点不存在时静默跳过，避免阻塞后续逻辑
  function on(node, eventName, handler) {
    if (node) node.addEventListener(eventName, handler);
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      const raw = saved || legacy;
      if (!raw) {
        bootNotice = `默认示例数据 · schema v${APP_SCHEMA_VERSION}`;
        return normalizeState(clone(defaultData));
      }
      const parsed = JSON.parse(raw);
      const sourceVersion = Number(parsed.meta?.schemaVersion || 1);
      if (legacy && !saved) {
        bootNotice = `已从旧版数据迁移到 schema v${APP_SCHEMA_VERSION}`;
      } else if (sourceVersion < APP_SCHEMA_VERSION) {
        bootNotice = `已补齐新字段：schema v${sourceVersion} → v${APP_SCHEMA_VERSION}`;
      } else {
        bootNotice = `本地数据已是 schema v${APP_SCHEMA_VERSION}`;
      }
      return normalizeState(parsed);
    } catch (error) {
      console.warn("读取本地数据失败，已回退默认数据。", error);
      bootNotice = "本地数据读取失败，已使用默认示例";
      return normalizeState(clone(defaultData));
    }
  }

  function normalizeState(input) {
    const next = { ...clone(defaultData), ...input };
    next.meta = {
      schemaVersion: APP_SCHEMA_VERSION,
      updatedAt: input?.meta?.updatedAt || new Date().toISOString()
    };
    for (const key of ["platforms", "genres", "moduleTypes", "lgosDimensions", "games", "sampleCandidates", "analyses", "modules", "prototypes", "templates"]) {
      if (!Array.isArray(next[key])) next[key] = clone(defaultData[key]);
    }
    next.games = next.games.map((game) => normalizeGame(game));
    next.analyses = next.analyses.map((analysis) => normalizeAnalysis(analysis));
    return next;
  }

  function normalizeGame(game) {
    const details = game.lgosDetails || estimateDetails(game.lgos || 70);
    const normalized = {
      englishName: "",
      region: "待补充",
      revenueLevel: "D",
      sourceCredibility: game.sourceCredibility || game.revenueLevel || "D",
      playSource: "待补充",
      heatSource: "待补充",
      screenshotNotes: "",
      videoNotes: "",
      commentNotes: "",
      tags: [],
      ...game,
      lgosDetails: details
    };
    normalized.lgos = computeLGOS(details);
    return normalized;
  }

  function normalizeAnalysis(analysis) {
    return {
      firstImpression: "",
      attract3s: "",
      shortVideoFit: "",
      loopSummary: "",
      tenMinutes: "",
      returnReason: "",
      systems: "",
      uiPages: "",
      numbers: "",
      monetization: "",
      reusableModules: [],
      soloJudgement: "",
      risks: [],
      avoid: [],
      conclusion: "",
      ...analysis,
      loop: Array.isArray(analysis.loop) ? analysis.loop : listFromText(analysis.loop),
      reusableModules: Array.isArray(analysis.reusableModules) ? analysis.reusableModules : listFromText(analysis.reusableModules),
      risks: Array.isArray(analysis.risks) ? analysis.risks : listFromText(analysis.risks),
      avoid: Array.isArray(analysis.avoid) ? analysis.avoid : listFromText(analysis.avoid)
    };
  }

  function estimateDetails(total) {
    const maxTotal = defaultData.lgosDimensions.reduce((sum, item) => sum + item.max, 0);
    const ratio = Math.max(0, Math.min(1, Number(total || 0) / maxTotal));
    return Object.fromEntries(defaultData.lgosDimensions.map((item) => [item.key, Math.round(item.max * ratio)]));
  }

  function saveState() {
    state.meta = {
      ...state.meta,
      schemaVersion: APP_SCHEMA_VERSION,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function listFromText(value) {
    return String(value || "")
      .split(/\n|,|，/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function computeLGOS(details) {
    return defaultData.lgosDimensions.reduce((sum, item) => sum + clampScore(details?.[item.key], item.max), 0);
  }

  function clampScore(value, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(max, Math.round(number)));
  }

  function showToast(message) {
    nodes.toast.textContent = message;
    nodes.toast.classList.add("show");
    window.setTimeout(() => nodes.toast.classList.remove("show"), 2200);
  }

  function getGame(gameId) {
    return state.games.find((game) => game.id === gameId);
  }

  function getScoreLevel(score) {
    if (score >= 85) return { label: "重点拆解", color: "var(--green)" };
    if (score >= 70) return { label: "值得收录", color: "var(--blue)" };
    if (score >= 50) return { label: "一般观察", color: "var(--yellow)" };
    return { label: "暂不深入", color: "var(--red)" };
  }

  const GENRE_ICON_MAP = [
    { match: ["合成"], emoji: "🧩", bg: "linear-gradient(135deg, #e3f4dd, #8fce6f)" },
    { match: ["放置"], emoji: "💤", bg: "linear-gradient(135deg, #e7f0fb, #9dc3ec)" },
    { match: ["放置经营", "农场"], emoji: "🌱", bg: "linear-gradient(135deg, #e3f4dd, #a8d99a)" },
    { match: ["修仙", "仙", "修真"], emoji: "🏔️", bg: "linear-gradient(135deg, #e6e2f8, #b9aee8)" },
    { match: ["塔防", "塔", "守卫"], emoji: "🏰", bg: "linear-gradient(135deg, #e7e0f3, #c8b6e8)" },
    { match: ["割草", "幸存者"], emoji: "⚔️", bg: "linear-gradient(135deg, #fde2e2, #f3a6a1)" },
    { match: ["轻肉鸽", "肉鸽", "roguelike"], emoji: "🎲", bg: "linear-gradient(135deg, #fbe4d8, #f0a875)" },
    { match: ["收纳", "整理", "冰箱"], emoji: "📦", bg: "linear-gradient(135deg, #f4e9d3, #dfc795)" },
    { match: ["解谜", "puzzle", "拼图"], emoji: "🔍", bg: "linear-gradient(135deg, #e1ecf6, #aac6e6)" },
    { match: ["卡牌", "卡", "卡组"], emoji: "🃏", bg: "linear-gradient(135deg, #f3e7e2, #e0b3a3)" },
    { match: ["经营", "商店"], emoji: "🏪", bg: "linear-gradient(135deg, #eef0d8, #d4d98e)" },
    { match: ["解压"], emoji: "🫧", bg: "linear-gradient(135deg, #eaf3ee, #b6d8c5)" },
    { match: ["抖音", "传播", "分享", "短视频"], emoji: "📱", bg: "linear-gradient(135deg, #f5e6f4, #e0a6dd)" },
    { match: ["定位动作"], emoji: "🕹️", bg: "linear-gradient(135deg, #e0ecf2, #95c3da)" }
  ];
  const DEFAULT_GENRE_ICON = { emoji: "🎮", bg: "linear-gradient(135deg, #eaeef1, #c9d3da)" };

  function getGenreIcon(genre) {
    const text = String(genre || "").toLowerCase();
    return GENRE_ICON_MAP.find((item) => item.match.some((kw) => text.includes(kw.toLowerCase()))) || DEFAULT_GENRE_ICON;
  }

  function getGameCompleteness(game) {
    const requiredFields = [
      ["英文名", game.englishName],
      ["地区", game.region],
      ["商业化", game.monetization],
      ["可玩来源", game.playSource],
      ["热度来源", game.heatSource],
      ["来源可信度", game.sourceCredibility],
      ["截图观察", game.screenshotNotes],
      ["视频 / 评论笔记", game.videoNotes],
      ["一句话判断", game.reason]
    ];
    const missing = requiredFields.filter(([, value]) => !value || value === "待补充" || value === "待评估").map(([label]) => label);
    const score = Math.round(((requiredFields.length - missing.length) / requiredFields.length) * 100);
    return { score, missing };
  }

  function option(label, value = label) {
    return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
  }

  function renderAll() {
    const fns = [
      ["renderOptions", renderOptions],
      ["renderVersionNote", renderVersionNote],
      ["renderStats", renderStats],
      ["renderInsights", renderInsights],
      ["renderRadar", renderRadar],
      ["renderGames", renderGames],
      ["renderSamples", renderSamples],
      ["renderAnalyses", renderAnalyses],
      ["renderModules", renderModules],
      ["renderComposer", renderComposer],
      ["renderTemplates", renderTemplates],
    ];
    for (const [name, fn] of fns) {
      try { fn(); } catch (e) { console.error(`[LG] ${name} crashed:`, e); }
    }
  }

  function renderVersionNote() {
    if (!nodes.versionNote) return;
    nodes.versionNote.textContent = bootNotice || `schema v${state.meta?.schemaVersion || APP_SCHEMA_VERSION}`;
  }

  function renderOptions() {
    const allPlatforms = ["全部", ...state.platforms];
    nodes.platformFilter.innerHTML = allPlatforms.map(option).join("");
    nodes.gameForm.elements.platform.innerHTML = state.platforms.map(option).join("");
    nodes.composerForm.elements.platform.innerHTML = state.platforms.map(option).join("");
    nodes.composerForm.elements.genre.innerHTML = state.genres.map(option).join("");
    nodes.analysisForm.elements.gameId.innerHTML = state.games.map((game) => option(game.name, game.id)).join("");
    nodes.moduleForm.elements.type.innerHTML = state.moduleTypes.map(option).join("");
    nodes.moduleFilter.innerHTML = ["全部", ...state.moduleTypes].map(option).join("");
    nodes.samplePriority.innerHTML = ["全部", "P0", "P1", "P2", "P3"].map(option).join("");
    nodes.sampleStatus.innerHTML = ["全部", "待收录", "已收录", "已拆解"].map(option).join("");
    nodes.composerForm.elements.moduleIds.innerHTML = state.modules.map((module) => option(`${module.name} (${module.type})`, module.id)).join("");
    nodes.lgosInputs.innerHTML = state.lgosDimensions.map((item) => `
      <label title="${escapeHtml(item.hint)}">
        <span>${escapeHtml(item.label)} / ${item.max}</span>
        <input name="lgos_${item.key}" type="number" min="0" max="${item.max}" value="${Math.round(item.max * 0.75)}" />
      </label>
    `).join("");
  }

  function renderStats() {
    const doneSamples = state.sampleCandidates.filter((item) => item.status !== "待收录").length;
    const targets = [
      ["游戏样本", state.games.length, "目标 100 款"],
      ["深度拆解", state.analyses.length, "目标 30 款"],
      ["设计模块", state.modules.length, "目标 200 个"],
      ["首批样本", `${doneSamples}/20`, "第一批候选"]
    ];
    nodes.stats.innerHTML = targets.map(([name, count, hint]) => `<article class="metric-card"><span>${name}</span><small>${hint}</small><strong>${count}</strong></article>`).join("");
  }

  function countBy(items, getKey) {
    return items.reduce((result, item) => {
      const key = getKey(item) || "未分类";
      result[key] = (result[key] || 0) + 1;
      return result;
    }, {});
  }

  function renderBarList(title, rows, emptyText = "暂无数据") {
    const max = Math.max(1, ...rows.map(([, value]) => Number(value) || 0));
    return `
      <article class="insight-card">
        <h3>${escapeHtml(title)}</h3>
        <div class="bar-list">
          ${rows.length ? rows.map(([label, value]) => `
            <div class="bar-row">
              <span>${escapeHtml(label)}</span>
              <div class="bar-track"><i style="width:${Math.max(4, ((Number(value) || 0) / max) * 100)}%"></i></div>
              <b>${escapeHtml(value)}</b>
            </div>
          `).join("") : `<p>${escapeHtml(emptyText)}</p>`}
        </div>
      </article>
    `;
  }

  function renderRankList(title, rows, scoreLabel = "分") {
    return `
      <article class="insight-card">
        <h3>${escapeHtml(title)}</h3>
        <ol class="rank-list">
          ${rows.length ? rows.map((row) => `
            <li>
              <span>${escapeHtml(row.name)}</span>
              <small>${escapeHtml(row.meta)}</small>
              <b>${escapeHtml(row.score)}${escapeHtml(scoreLabel)}</b>
            </li>
          `).join("") : "<li><span>暂无数据</span><small>先录入样本</small><b>0</b></li>"}
        </ol>
      </article>
    `;
  }

  function getSampleValue(sample) {
    const priorityScore = { P0: 100, P1: 82, P2: 64, P3: 46 }[sample.priority] || 50;
    const statusBonus = sample.status === "已拆解" ? 18 : sample.status === "已收录" ? 10 : 0;
    const platformBonus = /微信|抖音/.test(sample.platform) ? 8 : 0;
    return priorityScore + statusBonus + platformBonus;
  }

  function getModuleReuseRows() {
    return state.modules
      .map((module) => {
        const analysisHits = state.analyses.filter((analysis) => (analysis.reusableModules || []).includes(module.name)).length;
        const prototypeHits = state.prototypes.filter((proto) => (proto.modules || []).includes(module.name)).length;
        const fitHits = state.games.filter((game) => (module.fits || []).some((fit) => game.genre.includes(fit) || (game.tags || []).includes(fit))).length;
        return [module.name, analysisHits * 2 + prototypeHits * 2 + fitHits];
      })
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }

  function renderInsights() {
    if (!nodes.researchInsights) return;
    const platformRows = Object.entries(countBy(state.games, (game) => game.platform)).sort((a, b) => b[1] - a[1]);
    const genreRows = Object.entries(countBy(state.games, (game) => game.genre.split("/")[0].trim())).sort((a, b) => b[1] - a[1]);
    const credibilityRows = Object.entries(countBy(state.games, (game) => game.sourceCredibility)).sort((a, b) => a[0].localeCompare(b[0], "zh-CN"));
    const lgosRows = state.games
      .map((game) => ({ name: game.name, meta: `${game.platform} · ${game.genre}`, score: game.lgos }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    const sampleRows = state.sampleCandidates
      .map((sample) => ({ name: sample.name, meta: `${sample.priority} · ${sample.platform} · ${sample.status}`, score: getSampleValue(sample) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    const completenessRows = state.games
      .map((game) => ({ name: game.name, meta: `${getGameCompleteness(game).missing.length} 项待补`, score: getGameCompleteness(game).score }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);

    nodes.researchInsights.innerHTML = [
      renderBarList("平台分布", platformRows),
      renderBarList("玩法类型分布", genreRows),
      renderBarList("来源可信度", credibilityRows),
      renderRankList("LGOS 重点拆解榜", lgosRows),
      renderRankList("高价值样本排行榜", sampleRows, ""),
      renderRankList("资料补全优先级", completenessRows, "%"),
      renderBarList("模块复用热度", getModuleReuseRows())
    ].join("");
  }

  function renderRadar() {
    const focus = [...state.games].sort((a, b) => b.lgos - a.lgos)[0];
    const level = getScoreLevel(focus.lgos);
    nodes.focusCard.innerHTML = `
      <div class="focus-score" style="background:${level.color}">${focus.lgos}</div>
      <p class="eyebrow">今日重点样本</p>
      <h3>${escapeHtml(focus.name)}</h3>
      <p>${escapeHtml(focus.reason)}</p>
      <div class="tag-row">
        <span class="tag strong">${escapeHtml(level.label)}</span>
        <span class="tag">${escapeHtml(focus.platform)}</span>
        <span class="tag">${escapeHtml(focus.genre)}</span>
        <span class="tag">微信：${escapeHtml(focus.wechatFit)}</span>
      </div>
      <div class="lgos-breakdown">
        ${state.lgosDimensions.map((item) => {
          const value = clampScore(focus.lgosDetails?.[item.key], item.max);
          return `<div class="score-row"><span>${escapeHtml(item.label)}</span><div class="score-bar"><i style="width:${(value / item.max) * 100}%"></i></div><b>${value}</b></div>`;
        }).join("")}
      </div>
    `;

    nodes.radarColumn.innerHTML = [
      ["九维评分已接入", "新增游戏会按 LGOS 九个维度自动求和，不再只填一个总分。"],
      ["第一批样本池", "已经内置 20 款候选样本，可按 P0-P3 和收录状态追踪。"],
      ["完整拆解字段", "拆解表单已覆盖计划里的 14 个核心段落。"],
      ["导出继续增强", "当前支持数据 JSON、原型 Markdown、单条拆解 Markdown 导出。"]
    ].map(([title, body]) => `<article class="radar-note"><h3>${title}</h3><p>${body}</p></article>`).join("");
  }

  function renderGames() {
    const keyword = nodes.gameSearch.value.trim().toLowerCase();
    const platform = nodes.platformFilter.value || "全部";
    const games = state.games.filter((game) => {
      const haystack = [game.name, game.englishName, game.platform, game.genre, game.reason, ...(game.tags || [])].join(" ").toLowerCase();
      return (platform === "全部" || game.platform === platform) && (!keyword || haystack.includes(keyword));
    });

    nodes.gameGrid.innerHTML = games.map((game) => {
      const level = getScoreLevel(game.lgos);
      const icon = getGenreIcon(game.genre);
      return `
        <article class="game-card">
          <div class="game-icon" style="background:${icon.bg}">
            <span aria-hidden="true">${icon.emoji}</span>
          </div>
          <div class="tag-row">
            <span class="tag strong">${escapeHtml(game.platform)}</span>
            <span class="tag">${escapeHtml(game.genre)}</span>
            <span class="tag">${escapeHtml(level.label)}</span>
          </div>
          <h3>${escapeHtml(game.name)}</h3>
          <p>${escapeHtml(game.reason)}</p>
          <div class="lgos">
            <div class="lgos-bar"><i style="width:${Number(game.lgos) || 0}%; background:${level.color}"></i></div>
            <strong>${escapeHtml(game.lgos)}</strong>
          </div>
          <div class="meta-grid">
            <div><span>团队</span><b>${escapeHtml(game.team)}</b></div>
            <div><span>美术</span><b>${escapeHtml(game.art)}</b></div>
            <div><span>开发</span><b>${escapeHtml(game.dev)}</b></div>
            <div><span>适配</span><b>${escapeHtml(game.wechatFit)}</b></div>
          </div>
          <div class="tag-row">${(game.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
          ${renderCompleteness(game)}
          <button class="card-btn" type="button" data-game-detail="${escapeHtml(game.id)}">查看详情</button>
        </article>
      `;
    }).join("") || `<p>没有匹配的游戏样本。</p>`;
  }

  function renderSamples() {
    const priority = nodes.samplePriority.value || "全部";
    const status = nodes.sampleStatus.value || "全部";
    const samples = state.sampleCandidates.filter((sample) => (priority === "全部" || sample.priority === priority) && (status === "全部" || sample.status === status));
    nodes.sampleBoard.innerHTML = samples.map((sample) => {
      const icon = getGenreIcon(sample.genre);
      return `
      <article class="sample-card">
        <div class="game-icon" style="background:${icon.bg}">
          <span aria-hidden="true">${icon.emoji}</span>
        </div>
        <div class="tag-row">
          <span class="tag strong">${escapeHtml(sample.priority)}</span>
          <span class="tag">${escapeHtml(sample.status)}</span>
          <span class="tag">${escapeHtml(sample.platform)}</span>
        </div>
        <h3>${escapeHtml(sample.name)}</h3>
        <p>${escapeHtml(sample.note)}</p>
        <p class="sample-flow-tip">使用流程：导入 → 转入游戏库 → 拆解</p>
        <div class="sample-meta">
          <span>${escapeHtml(sample.genre)}</span>
          <div class="sample-actions">
            <button class="card-btn" type="button" data-sample-to-game="${escapeHtml(sample.id)}">转入游戏库</button>
            <button class="card-btn" type="button" data-sample-toggle="${escapeHtml(sample.id)}">${sample.status === "待收录" ? "标记已收录" : "标记待收录"}</button>
          </div>
        </div>
      </article>
    `}).join("") || `<p>没有匹配的候选样本。</p>`;
  }

  function renderAnalyses() {
    if (!selectedAnalysisId && state.analyses[0]) selectedAnalysisId = state.analyses[0].id;
    const selected = state.analyses.find((analysis) => analysis.id === selectedAnalysisId) || state.analyses[0];
    nodes.analysisList.innerHTML = state.analyses.map((analysis) => {
      const game = getGame(analysis.gameId);
      return `<button class="analysis-row ${analysis.id === selected?.id ? "active" : ""}" type="button" data-analysis-id="${analysis.id}">
        <strong>${escapeHtml(game?.name || "未关联游戏")}</strong>
        <span>${escapeHtml(analysis.concept)}</span>
      </button>`;
    }).join("");

    if (!selected) {
      nodes.analysisDetail.innerHTML = `<p>还没有玩法拆解，点击上方"新增拆解"按钮创建一条。</p>`;
      return;
    }

    const game = getGame(selected.gameId);
    nodes.analysisDetail.innerHTML = `
      <p class="eyebrow">Selected Breakdown</p>
      <h2>${escapeHtml(game?.name || "未关联游戏")}</h2>
      <p>${escapeHtml(selected.concept)}</p>
      <div class="toolbar" style="margin-top:12px">
        <button class="ghost-btn" type="button" data-export-analysis="${escapeHtml(selected.id)}">下载拆解 Markdown</button>
        <button class="ghost-btn" type="button" data-extract-modules="${escapeHtml(selected.id)}">沉淀为模块</button>
      </div>
      ${detailSection("1. 玩家第一眼看到什么", `<p>${escapeHtml(selected.firstImpression)}</p><p><strong>3 秒吸引点：</strong>${escapeHtml(selected.attract3s)}</p><p><strong>短视频传播：</strong>${escapeHtml(selected.shortVideoFit)}</p>`)}
      ${detailSection("2. 核心循环", `<ol class="loop-list">${selected.loop.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol><p>${escapeHtml(selected.loopSummary)}</p>`)}
      ${detailSection("3. 前 30 秒体验", `<p>${escapeHtml(selected.first30)}</p>`)}
      ${detailSection("4. 前 3 分钟体验", `<p>${escapeHtml(selected.first3)}</p>`)}
      ${detailSection("5. 10 分钟后继续玩的理由", `<p>${escapeHtml(selected.tenMinutes)}</p>`)}
      ${detailSection("6. 次日回流理由", `<p>${escapeHtml(selected.returnReason)}</p>`)}
      ${detailSection("7. 系统结构", `<p>${escapeHtml(selected.systems)}</p>`)}
      ${detailSection("8. UI 页面结构", `<p>${escapeHtml(selected.uiPages)}</p>`)}
      ${detailSection("9. 数值结构", `<p>${escapeHtml(selected.numbers)}</p>`)}
      ${detailSection("10. 变现结构", `<p>${escapeHtml(selected.monetization)}</p>`)}
      ${detailSection("11. 可复用模块", `<div class="tag-row">${selected.reusableModules.map((item) => `<span class="tag strong">${escapeHtml(item)}</span>`).join("")}</div>`)}
      ${detailSection("12. 单人开发判断", `<p>${escapeHtml(selected.soloJudgement)}</p>`)}
      ${detailSection("13. 不建议模仿的地方", `<ul class="plain-list">${selected.avoid.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`)}
      ${detailSection("14. 最终结论", `<p>${escapeHtml(selected.conclusion)}</p><ul class="plain-list">${selected.risks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`)}
    `;
  }

  function detailSection(title, body) {
    return `<section class="detail-section"><h4>${title}</h4>${body}</section>`;
  }

  function renderCompleteness(game) {
    const completeness = getGameCompleteness(game);
    const missingText = completeness.missing.length ? `缺：${completeness.missing.slice(0, 3).join("、")}${completeness.missing.length > 3 ? "…" : ""}` : "资料完整";
    return `
      <div class="completeness">
        <span>完整度 ${completeness.score}%</span>
        <div class="completeness-bar"><i style="width:${completeness.score}%"></i></div>
        <small>${escapeHtml(missingText)}</small>
      </div>
    `;
  }

  function renderModules() {
    const type = nodes.moduleFilter.value || "全部";
    const modules = state.modules.filter((module) => type === "全部" || module.type === type);
    nodes.moduleBoard.innerHTML = modules.map((module) => `
      <article class="module-card">
        <div class="tag-row"><span class="tag strong">${escapeHtml(module.type)}</span><span class="tag">成本 ${escapeHtml(module.cost)}</span></div>
        <h3>${escapeHtml(module.name)}</h3>
        <p>${escapeHtml(module.description)}</p>
        <div class="module-meta">${(module.fits || []).map((fit) => `<span class="tag">${escapeHtml(fit)}</span>`).join("")}</div>
        <p><strong>风险：</strong>${escapeHtml(module.risk)}</p>
        <button class="card-btn" type="button" data-add-module-composer="${escapeHtml(module.id)}">加入组合器</button>
      </article>
    `).join("") || `<p>没有匹配的模块。</p>`;
    renderModuleGraph(modules);
  }

  function renderModuleGraph(modules = state.modules) {
    if (!nodes.moduleGraph) return;
    const rows = modules.map((module) => {
      const analyses = state.analyses
        .filter((analysis) => (analysis.reusableModules || []).includes(module.name))
        .map((analysis) => getGame(analysis.gameId)?.name || "未关联游戏");
      const prototypes = state.prototypes
        .filter((proto) => (proto.modules || []).includes(module.name))
        .map((proto) => proto.title);
      return { module, analyses, prototypes };
    });

    nodes.moduleGraph.innerHTML = `
      <div class="section-head compact">
        <div>
          <p class="eyebrow">Module Graph</p>
          <h3>模块复用关系图</h3>
        </div>
        <span class="status-pill">${rows.length} 个模块 · ${state.analyses.length} 条拆解 · ${state.prototypes.length} 个原型</span>
      </div>
      <div class="graph-grid">
        ${rows.map(({ module, analyses, prototypes }) => `
          <article class="graph-card">
            <h4>${escapeHtml(module.name)}</h4>
            <div class="graph-lines">
              <div><strong>适用玩法</strong><span>${escapeHtml((module.fits || []).join("、") || "待补充")}</span></div>
              <div><strong>来自拆解</strong><span>${escapeHtml(analyses.join("、") || "暂未引用")}</span></div>
              <div><strong>进入原型</strong><span>${escapeHtml(prototypes.join("、") || "暂未使用")}</span></div>
            </div>
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderComposer() {
    const existingSelection = Array.from(nodes.composerForm.elements.moduleIds.selectedOptions).map((item) => item.value);
    const selectedModules = preferredComposerModuleIds.length
      ? preferredComposerModuleIds
      : existingSelection.length
        ? existingSelection
        : state.modules.slice(0, 3).map((module) => module.id);
    Array.from(nodes.composerForm.elements.moduleIds.options).forEach((item) => {
      item.selected = selectedModules.includes(item.value);
    });
    if (!currentPrototypeText) {
      const proto = state.prototypes[0];
      currentPrototypeText = prototypeToMarkdown(proto);
      renderProposal(proto);
    }
    renderPrototypeList();
  }

  function addModuleToComposer(moduleId) {
    const module = state.modules.find((item) => item.id === moduleId);
    if (!module) return;
    const selected = new Set(Array.from(nodes.composerForm.elements.moduleIds.selectedOptions).map((item) => item.value));
    selected.add(moduleId);
    preferredComposerModuleIds = Array.from(selected);
    renderComposer();
    document.getElementById("composer").scrollIntoView({ behavior: "smooth" });
    showToast(`已把「${module.name}」加入组合器。`);
  }

  function renderProposal(proto) {
    currentPrototypeText = prototypeToMarkdown(proto);
    nodes.proposalPanel.innerHTML = `
      <p class="eyebrow">Generated Proposal</p>
      <h2>${escapeHtml(proto.title)}</h2>
      <p>${escapeHtml(proto.concept)}</p>
      <div class="proposal-grid">
        <div class="proposal-item"><h4>核心循环</h4><ol class="plain-list">${buildLoop(proto.genre).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol></div>
        <div class="proposal-item"><h4>${escapeHtml(proto.cycle)} 必做</h4><ul class="plain-list">${buildMustHave(proto.cycle).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
        <div class="proposal-item"><h4>引用模块</h4><div class="tag-row">${(proto.modules || []).map((item) => `<span class="tag strong">${escapeHtml(item)}</span>`).join("")}</div></div>
        <div class="proposal-item"><h4>主要风险</h4><ul class="plain-list"><li>题材包装容易同质化</li><li>需要尽早验证 3 秒吸引点</li><li>首版必须控制内容量</li></ul></div>
        <div class="proposal-item full"><h4>下一步验证</h4><p>${escapeHtml(proto.nextStep)}</p></div>
      </div>
    `;
  }

  function buildLoop(genre) {
    const map = {
      "合成": ["收集低级单位", "拖拽合成升级", "产出核心资源", "解锁图鉴和新区域"],
      "放置经营": ["布置生产点", "等待产出", "完成订单", "升级场景与效率"],
      "轻肉鸽": ["进入短局", "击败敌群", "三选一强化", "带回局外成长"],
      "割草": ["自动攻击", "移动躲避", "升级选择强化", "冲击更长存活时间"],
      "塔防": ["布置塔位", "抵御波次", "升级防线", "解锁新敌人与地图"],
      "解谜": ["理解规则", "尝试解法", "获得反馈", "进入下一关"]
    };
    return map[genre] || map["合成"];
  }

  function buildMustHave(cycle) {
    if (cycle === "30 天 MVP") return ["完整核心循环和 2-3 个变体", "局外成长系统", "3 个以内变现点", "基础数据记录", "30 分钟以上体验内容"];
    return ["一条可跑通的主循环", "1 个留存模块", "1 个结算反馈页面", "1 个可选广告点", "10 分钟体验内容"];
  }

  function renderPrototypeList() {
    nodes.prototypeList.innerHTML = `<h3>已保存原型</h3>` + state.prototypes.map((proto) => `
      <article class="prototype-card">
        <h4>${escapeHtml(proto.title)}</h4>
        <p>${escapeHtml(proto.concept)}</p>
        <button class="card-btn" type="button" data-prototype-id="${proto.id}">查看</button>
      </article>
    `).join("");
  }

  function renderTemplates() {
    if (!nodes.templateGrid) return;
    nodes.templateGrid.innerHTML = state.templates.map((template) => `
      <article class="template-card">
        <h3>${escapeHtml(template.name)}</h3>
        <pre>${escapeHtml(template.content)}</pre>
        <button class="card-btn" type="button" data-template-id="${template.id}">复制模板</button>
      </article>
    `).join("");
  }

  function gameToMarkdown(game) {
    return `# 游戏情报卡：${game.name}

## 基础信息
- 英文名：${game.englishName || ""}
- 平台：${game.platform}
- 地区：${game.region}
- 类型：${game.genre}
- 团队规模：${game.team}
- 可玩来源：${game.playSource}
- 热度来源：${game.heatSource}
- 来源可信度：${game.sourceCredibility}
- 商业化：${game.monetization}
- 截图观察：${game.screenshotNotes || ""}
- 视频 / 评论笔记：${game.videoNotes || ""}

## LGOS
- 总分：${game.lgos}
${state.lgosDimensions.map((item) => `- ${item.label}：${game.lgosDetails?.[item.key] ?? 0}/${item.max}`).join("\n")}

## 一句话判断
${game.reason}`;
  }

  function analysisToMarkdown(analysis) {
    const game = getGame(analysis.gameId);
    return `# 玩法拆解：${game?.name || "未关联游戏"}

## 1. 一句话概念
${analysis.concept}

## 2. 玩家第一眼看到什么
${analysis.firstImpression}

3 秒吸引点：${analysis.attract3s}

短视频传播：${analysis.shortVideoFit}

## 3. 核心循环
${analysis.loop.map((item, index) => `${index + 1}. ${item}`).join("\n")}

${analysis.loopSummary}

## 4. 前 30 秒体验
${analysis.first30}

## 5. 前 3 分钟体验
${analysis.first3}

## 6. 10 分钟后继续玩的理由
${analysis.tenMinutes}

## 7. 系统结构
${analysis.systems}

## 8. UI 页面结构
${analysis.uiPages}

## 9. 数值结构
${analysis.numbers}

## 10. 变现结构
${analysis.monetization}

## 11. 可复用模块
${analysis.reusableModules.map((item) => `- ${item}`).join("\n")}

## 12. 单人开发判断
${analysis.soloJudgement}

## 13. 不建议模仿的地方
${analysis.avoid.map((item) => `- ${item}`).join("\n")}

## 14. 最终结论
${analysis.conclusion}

风险：
${analysis.risks.map((item) => `- ${item}`).join("\n")}`;
  }

  function prototypeToMarkdown(proto) {
    return `# ${proto.title}

## 一句话概念
${proto.concept}

## 目标平台
${proto.platform}

## 核心玩法
${proto.genre}

## 开发周期
${proto.cycle}

## 引用模块
${(proto.modules || []).map((item) => `- ${item}`).join("\n")}

## 下一步验证
${proto.nextStep}`;
  }

  function toggleAnalysisForm() {
    if (!nodes.analysisForm) return;
    const wasHidden = nodes.analysisForm.hasAttribute("hidden");
    if (wasHidden) {
      nodes.analysisForm.removeAttribute("hidden");
      nodes.analysisForm.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      nodes.analysisForm.setAttribute("hidden", "");
    }
  }

  function smartFillGame() {
    const form = nodes.gameForm;
    const name = (form.elements.name.value || "").trim();
    const platform = (form.elements.platform.value || "").trim();
    if (!name) {
      showToast("请先填写游戏名再智能填充。");
      return;
    }

    const genreRules = [
      { keys: ["合成", "合成塔", "合成猫"], genre: "合成", details: { clarity: 13, attract3s: 9, growth: 9, moduleReuse: 9 }, monetization: "激励视频 / 内购", reason: "合成反馈清晰，局外成长天然适合短周期回流，{theme}题材包装降低美术压力。" },
      { keys: ["修仙", "仙", "修真"], genre: "修仙 / 放置", details: { growth: 10, retain3m: 9, monetizeNatural: 8 }, monetization: "激励视频 / 内购礼包", reason: "修仙题材长线成长强，付费礼包和激励视频变现自然，{theme}包装降低认知门槛。" },
      { keys: ["塔防", "塔", "守卫"], genre: "塔防", details: { clarity: 12, retain3m: 9, moduleReuse: 9 }, monetization: "激励视频 / 关卡解锁", reason: "塔防关卡结构清晰，激励视频复活和关卡解锁变现点自然，适合单关拆解。" },
      { keys: ["割草", "割", "幸存者"], genre: "割草 / 轻肉鸽", details: { clarity: 11, attract3s: 10, retain3m: 8 }, monetization: "广告复活 / 插屏", reason: "割草爽感强、短视频传播天然，广告复活和插屏变现点密集，{theme}题材降低内容生产成本。" },
      { keys: ["肉鸽", "roguelike"], genre: "轻肉鸽", details: { clarity: 11, retain3m: 9, growth: 8 }, monetization: "激励视频 / 内购", reason: "轻肉鸽随机性带来高复玩，激励视频重抽和内购皮肤变现自然，局外成长延长生命周期。" },
      { keys: ["收纳", "整理", "冰箱"], genre: "收纳", details: { clarity: 13, attract3s: 10, soloFeasible: 13, artCost: 9 }, monetization: "激励视频 / 关卡解锁", reason: "收纳 3 秒看懂，关卡解锁和激励视频提示变现点自然，单人开发可行性高。" },
      { keys: ["解谜", "puzzle", "拼图"], genre: "解谜", details: { clarity: 11, retain3m: 9, moduleReuse: 8 }, monetization: "激励视频 / 提示道具", reason: "解谜关卡可分章收费，激励视频换提示道具变现自然，{theme}题材可拓展题包。" },
      { keys: ["农场", "经营", "商店"], genre: "放置经营", details: { growth: 9, retain3m: 9, monetizeNatural: 8 }, monetization: "激励视频 / 限时礼包", reason: "放置经营长线留人，限时礼包和激励视频加速变现自然，{theme}题材延展性强。" },
      { keys: ["放置", "idle"], genre: "放置", details: { growth: 10, monetizeNatural: 8, retain3m: 7 }, monetization: "激励视频 / 离线加速", reason: "放置离线加速和激励视频变现天然，{theme}题材包装降低美术压力，短周期回流自然。" },
      { keys: ["卡牌", "卡", "卡组"], genre: "卡牌轻RPG", details: { clarity: 9, growth: 9, moduleReuse: 8 }, monetization: "激励视频 / 内购礼包", reason: "卡牌收集养成长线，抽卡和礼包变现自然，{theme}题材延展卡片素材。" }
    ];
    const matched = genreRules.find((rule) => rule.keys.some((kw) => name.includes(kw)));
    const genre = matched?.genre || "合成";
    if (matched?.details) {
      for (const [key, value] of Object.entries(matched.details)) {
        const input = form.elements[`lgos_${key}`];
        if (input) input.value = value;
      }
    }

    const regionMap = [
      { keys: ["微信小游戏", "抖音小游戏"], region: "中国" },
      { keys: ["Steam"], region: "欧美" },
      { keys: ["itch"], region: "日本 / 欧美" },
      { keys: ["App Store"], region: "中国 / 欧美" }
    ];
    const region = platform ? (regionMap.find((item) => item.keys.includes(platform))?.region || "待补充") : "待补充";

    const wechatFit = /微信小游戏/.test(platform) ? "是" : /抖音小游戏|App Store/.test(platform) ? "可改造" : "可改造";

    const playSourceMap = [
      { keys: ["微信小游戏"], playSource: `微信搜索：${name}` },
      { keys: ["抖音小游戏"], playSource: `抖音小游戏中心：${name}` },
      { keys: ["Steam"], playSource: `Steam 商店页面：${name}` },
      { keys: ["itch"], playSource: `itch.io 页面：${name}` },
      { keys: ["App Store"], playSource: `App Store 搜索：${name}` }
    ];
    const playSource = platform ? (playSourceMap.find((item) => item.keys.includes(platform))?.playSource || "待补充") : "待补充";

    const heatSourceMap = [
      { keys: ["微信小游戏"], heatSource: "微信小游戏榜" },
      { keys: ["抖音小游戏"], heatSource: "抖音热门" },
      { keys: ["Steam"], heatSource: "Steam 好评" },
      { keys: ["itch"], heatSource: "Game Jam 获奖" },
      { keys: ["App Store"], heatSource: "App Store 榜单" }
    ];
    const heatSource = platform ? (heatSourceMap.find((item) => item.keys.includes(platform))?.heatSource || "待补充") : "待补充";

    const monetization = matched?.monetization || "激励视频 / 内购";
    const reason = (matched?.reason || "一款{region}{genre}轻量游戏，值得研究{genreShort}循环和反馈设计。")
      .replace(/\{theme\}/g, name)
      .replace(/\{region\}/g, region)
      .replace(/\{genre\}/g, genre)
      .replace(/\{genreShort\}/g, genre.split(/[\s/]+/)[0]);

    form.elements.genre.value = genre;
    form.elements.region.value = region;
    form.elements.wechatFit.value = wechatFit;
    form.elements.monetization.value = monetization;
    form.elements.playSource.value = playSource;
    form.elements.heatSource.value = heatSource;
    form.elements.reason.value = reason;
    showToast("已根据游戏名与平台智能填充关键字段，请复核。");
  }

  function addGame(event) {
    event.preventDefault();
    const data = new FormData(nodes.gameForm);
    const lgosDetails = Object.fromEntries(state.lgosDimensions.map((item) => [item.key, clampScore(data.get(`lgos_${item.key}`), item.max)]));
    const genre = data.get("genre").trim();
    const game = normalizeGame({
      id: uid("game"),
      name: data.get("name").trim(),
      englishName: "",
      platform: data.get("platform"),
      genre,
      region: data.get("region").trim() || "待补充",
      team: data.get("team"),
      art: "待评估",
      dev: "待评估",
      monetization: data.get("monetization").trim() || "待补充",
      revenueLevel: "D",
      sourceCredibility: data.get("sourceCredibility"),
      wechatFit: data.get("wechatFit"),
      playSource: data.get("playSource").trim() || "待补充",
      heatSource: data.get("heatSource").trim() || "待补充",
      screenshotNotes: data.get("screenshotNotes").trim(),
      videoNotes: data.get("videoNotes").trim(),
      commentNotes: "",
      lgosDetails,
      tags: listFromText(genre),
      reason: data.get("reason").trim() || "待补充：为什么值得研究。"
    });
    state.games.unshift(game);
    if (!state.genres.includes(genre)) state.genres.push(genre);
    saveState();
    nodes.gameForm.reset();
    renderAll();
    showToast("已加入游戏库。");
  }

  function createGameFromSample(sample) {
    const ratio = sample.priority === "P0" ? 0.82 : sample.priority === "P1" ? 0.72 : sample.priority === "P2" ? 0.62 : 0.52;
    const lgosDetails = Object.fromEntries(state.lgosDimensions.map((item) => [item.key, Math.round(item.max * ratio)]));
    const game = normalizeGame({
      id: uid("game"),
      name: sample.name,
      englishName: "",
      platform: sample.platform,
      genre: sample.genre,
      region: "待补充",
      team: "不明",
      art: "待评估",
      dev: "待评估",
      monetization: "待补充",
      revenueLevel: "D",
      sourceCredibility: "D",
      wechatFit: sample.platform === "微信小游戏" ? "是" : "可改造",
      playSource: "待补充",
      heatSource: sample.note,
      screenshotNotes: "",
      videoNotes: "",
      commentNotes: "",
      lgosDetails,
      tags: listFromText(sample.genre),
      reason: sample.note || "从第一批样本池转入，待补充研究判断。"
    });
    state.games.unshift(game);
    sample.status = "已收录";
    saveState();
    renderAll();
    showToast("样本已转入游戏库。");
  }

  function normalizePriority(value) {
    const priority = String(value || "").trim().toUpperCase();
    return ["P0", "P1", "P2", "P3"].includes(priority) ? priority : "P2";
  }

  function parseSampleLine(line) {
    const parts = line.split("|").map((item) => item.trim());
    if (!parts[0]) return null;
    return {
      id: uid("sample"),
      name: parts[0],
      platform: parts[1] || "待补充",
      genre: parts[2] || "待分类",
      priority: normalizePriority(parts[3]),
      status: "待收录",
      note: parts.slice(4).join(" | ") || "批量导入，待补充研究备注"
    };
  }

  function importSampleBatch(event) {
    event.preventDefault();
    const lines = nodes.sampleBulkInput.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const existingNames = new Set(state.sampleCandidates.map((sample) => sample.name.toLowerCase()));
    let added = 0;
    let skipped = 0;

    for (const line of lines) {
      const sample = parseSampleLine(line);
      if (!sample) continue;
      if (existingNames.has(sample.name.toLowerCase())) {
        skipped += 1;
        continue;
      }
      state.sampleCandidates.unshift(sample);
      existingNames.add(sample.name.toLowerCase());
      added += 1;
    }

    if (added > 0) {
      saveState();
      renderAll();
      nodes.sampleBulkInput.value = "";
    }
    showToast(`批量导入完成：新增 ${added} 条，跳过重复 ${skipped} 条。`);
  }

  function addAnalysis(event) {
    event.preventDefault();
    const data = new FormData(nodes.analysisForm);
    const analysis = normalizeAnalysis({
      id: uid("analysis"),
      gameId: data.get("gameId"),
      concept: data.get("concept").trim(),
      firstImpression: data.get("firstImpression").trim(),
      attract3s: data.get("attract3s").trim(),
      shortVideoFit: data.get("shortVideoFit").trim(),
      loop: listFromText(data.get("loop")),
      loopSummary: "待补充：核心循环一句话总结。",
      first30: data.get("first30").trim(),
      first3: data.get("first3").trim(),
      tenMinutes: data.get("tenMinutes").trim(),
      returnReason: data.get("returnReason").trim(),
      systems: data.get("systems").trim(),
      uiPages: data.get("uiPages").trim(),
      numbers: data.get("numbers").trim(),
      monetization: data.get("monetization").trim(),
      reusableModules: listFromText(data.get("modules")),
      soloJudgement: data.get("soloJudgement").trim(),
      risks: listFromText(data.get("risks")),
      avoid: listFromText(data.get("avoid")),
      conclusion: data.get("conclusion").trim()
    });
    state.analyses.unshift(analysis);
    selectedAnalysisId = analysis.id;
    saveState();
    nodes.analysisForm.reset();
    renderAll();
    showToast("已保存完整玩法拆解。");
  }

  function addModule(event) {
    event.preventDefault();
    const data = new FormData(nodes.moduleForm);
    state.modules.unshift({
      id: uid("module"),
      name: data.get("name").trim(),
      type: data.get("type"),
      fits: listFromText(data.get("fits")),
      cost: data.get("cost"),
      description: data.get("description").trim(),
      risk: data.get("risk").trim() || "待补充风险。"
    });
    saveState();
    nodes.moduleForm.reset();
    renderAll();
    showToast("已加入模块库。");
  }

  function generatePrototype(event) {
    event.preventDefault();
    const data = new FormData(nodes.composerForm);
    const selectedModuleNames = Array.from(nodes.composerForm.elements.moduleIds.selectedOptions)
      .map((opt) => state.modules.find((module) => module.id === opt.value)?.name)
      .filter(Boolean);
    const theme = data.get("theme").trim();
    const genre = data.get("genre");
    const platform = data.get("platform");
    const cycle = data.get("cycle");
    const proto = {
      id: uid("prototype"),
      title: `${theme}${genre}实验`,
      theme,
      genre,
      platform,
      cycle,
      concept: `一款围绕“${theme}”包装的${genre}轻量游戏，面向${platform}，用短反馈和低成本成长循环验证首版吸引力。`,
      modules: selectedModuleNames,
      nextStep: `先做 ${buildLoop(genre).slice(0, 2).join(" + ")}，把 ${cycle} 的核心体验跑通。`
    };
    state.prototypes.unshift(proto);
    saveState();
    renderProposal(proto);
    renderPrototypeList();
    renderStats();
    showToast("已生成并保存 MVP 方案。");
  }

  function renderGameDialog(gameId) {
    const game = getGame(gameId);
    if (!game) return;
    nodes.gameDialogBody.innerHTML = `
      <h2>${escapeHtml(game.name)}</h2>
      <p>${escapeHtml(game.reason)}</p>
      <div class="dialog-grid">
        ${[
          ["英文名", game.englishName],
          ["平台", game.platform],
          ["地区", game.region],
          ["类型", game.genre],
          ["团队", game.team],
          ["商业化", game.monetization],
          ["可玩来源", game.playSource],
          ["热度来源", game.heatSource],
          ["微信适配", game.wechatFit],
          ["收入可信度", game.revenueLevel],
          ["来源可信度", game.sourceCredibility]
        ].map(([label, value]) => `<div><span>${label}</span><b>${escapeHtml(value || "待补充")}</b></div>`).join("")}
      </div>
      ${detailSection("截图观察", `<p>${escapeHtml(game.screenshotNotes || "待补充")}</p>`)}
      ${detailSection("视频 / 评论笔记", `<p>${escapeHtml(game.videoNotes || "待补充")}</p>`)}
      <section class="detail-section">
        <h4>LGOS 九维评分：${game.lgos}</h4>
        ${state.lgosDimensions.map((item) => {
          const value = clampScore(game.lgosDetails?.[item.key], item.max);
          return `<div class="score-row dialog-score"><span>${escapeHtml(item.label)}</span><div class="score-bar"><i style="width:${(value / item.max) * 100}%"></i></div><b>${value}/${item.max}</b></div>`;
        }).join("")}
      </section>
      ${detailSection("资料完整度", `${renderCompleteness(game)}${getGameCompleteness(game).missing.length ? `<p>建议补充：${escapeHtml(getGameCompleteness(game).missing.join("、"))}</p>` : "<p>核心资料已完整。</p>"}`)}
      <button class="primary-btn" type="button" data-download-game="${escapeHtml(game.id)}">下载游戏情报卡</button>
      <button class="ghost-btn" type="button" data-create-analysis="${escapeHtml(game.id)}">创建拆解草稿</button>
    `;
    nodes.gameDialog.showModal();
  }

  function createAnalysisDraft(gameId) {
    const game = getGame(gameId);
    if (!game) return;
    const existing = state.analyses.find((analysis) => analysis.gameId === gameId);
    if (existing) {
      selectedAnalysisId = existing.id;
      nodes.gameDialog.close();
      renderAnalyses();
      document.getElementById("analysis").scrollIntoView({ behavior: "smooth" });
      showToast("已跳转到已有拆解。");
      return;
    }
    const draft = normalizeAnalysis({
      id: uid("analysis"),
      gameId,
      concept: `${game.name} 是一款 ${game.genre} 方向的轻量游戏，值得围绕核心循环、前期反馈和可复用模块进一步拆解。`,
      firstImpression: game.screenshotNotes || "待补充：玩家第一眼看到什么。",
      attract3s: "待补充：3 秒内最吸引人的点。",
      shortVideoFit: game.videoNotes || "待补充：是否适合短视频传播。",
      loop: ["待补充：步骤 1", "待补充：步骤 2", "待补充：步骤 3"],
      loopSummary: "待补充：核心循环一句话总结。",
      first30: "待补充：玩家前 30 秒体验。",
      first3: "待补充：玩家前 3 分钟体验。",
      tenMinutes: "待补充：10 分钟后继续玩的理由。",
      returnReason: "待补充：次日回流理由。",
      systems: "待补充：系统结构。",
      uiPages: "待补充：UI 页面结构。",
      numbers: "待补充：数值结构。",
      monetization: game.monetization || "待补充：变现结构。",
      reusableModules: [],
      soloJudgement: "待补充：单人开发判断。",
      risks: ["待补充：主要风险"],
      avoid: ["待补充：不建议模仿的地方"],
      conclusion: "待补充：最终结论。"
    });
    state.analyses.unshift(draft);
    selectedAnalysisId = draft.id;
    saveState();
    nodes.gameDialog.close();
    renderAll();
    document.getElementById("analysis").scrollIntoView({ behavior: "smooth" });
    showToast("已创建拆解草稿。");
  }

  function extractModulesFromAnalysis(analysisId) {
    const analysis = state.analyses.find((item) => item.id === analysisId);
    if (!analysis) return;
    let created = 0;
    for (const moduleName of analysis.reusableModules || []) {
      if (!moduleName || state.modules.some((module) => module.name === moduleName)) continue;
      state.modules.unshift({
        id: uid("module"),
        name: moduleName,
        type: "玩法",
        fits: [getGame(analysis.gameId)?.genre || "待分类"],
        cost: "待评估",
        description: `从《${getGame(analysis.gameId)?.name || "未关联游戏"}》拆解中沉淀，待补充模块说明。`,
        risk: "待补充风险。"
      });
      created += 1;
    }
    saveState();
    renderAll();
    showToast(created ? `已沉淀 ${created} 个模块。` : "没有新的可沉淀模块。");
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadText(text, filename, type = "text/markdown;charset=utf-8") {
    downloadBlob(new Blob([text], { type }), filename);
  }

  function exportWorkbookMarkdown() {
    const exportedAt = new Date().toLocaleString("zh-CN");
    const text = `# 轻量游戏研究库汇总

导出时间：${exportedAt}

## 游戏库

${state.games.map(gameToMarkdown).join("\n\n---\n\n")}

## 玩法拆解

${state.analyses.map(analysisToMarkdown).join("\n\n---\n\n")}

## 模块库

${state.modules.map((module) => `### ${module.name}

- 类型：${module.type}
- 适用：${(module.fits || []).join("、")}
- 成本：${module.cost}
- 说明：${module.description}
- 风险：${module.risk}`).join("\n\n")}

## 原型库

${state.prototypes.map(prototypeToMarkdown).join("\n\n---\n\n")}

## 第一批样本池

${state.sampleCandidates.map((sample) => `- [${sample.status}] ${sample.priority} ${sample.name}｜${sample.platform}｜${sample.genre}｜${sample.note}`).join("\n")}
`;
    downloadText(text, `lightweight-game-research-workbook-${new Date().toISOString().slice(0, 10)}.md`);
    showToast("已导出研究汇总 Markdown。");
  }

  function exportJson() {
    downloadText(JSON.stringify(state, null, 2), `lightweight-game-portal-data-${new Date().toISOString().slice(0, 10)}.json`, "application/json;charset=utf-8");
    showToast("已导出 JSON 数据。");
  }

  function exportProgressReport() {
    const exportedAt = new Date().toLocaleString("zh-CN");
    const totalGames = state.games.length;
    const totalAnalyses = state.analyses.length;
    const totalModules = state.modules.length;
    const totalPrototypes = state.prototypes.length;
    const totalSamples = state.sampleCandidates.length;
    const collectedSamples = state.sampleCandidates.filter((s) => s.status === "已收录").length;

    const byPlatform = {};
    state.games.forEach((g) => { byPlatform[g.platform] = (byPlatform[g.platform] || 0) + 1; });
    const byGenre = {};
    state.games.forEach((g) => { byGenre[g.genre] = (byGenre[g.genre] || 0) + 1; });

    const avgLgos = totalGames ? Math.round(state.games.reduce((s, g) => s + (g.lgos || 0), 0) / totalGames) : 0;
    const topGames = [...state.games].sort((a, b) => (b.lgos || 0) - (a.lgos || 0)).slice(0, 5);

    const moduleTypes = {};
    state.modules.forEach((m) => { moduleTypes[m.type] = (moduleTypes[m.type] || 0) + 1; });

    const unanalyzedGames = state.games.filter((g) => !state.analyses.some((a) => a.gameId === g.id));

    const text = `# 轻量游戏研究库 · 进度报告

导出时间：${exportedAt}

## 一、研究库总览

| 数据类型 | 当前数量 | 阶段目标 | 完成度 |
|---------|---------|---------|-------|
| 收录游戏 | ${totalGames} | 100 | ${Math.round(totalGames / 100 * 100)}% |
| 玩法拆解 | ${totalAnalyses} | 30 | ${Math.round(totalAnalyses / 30 * 100)}% |
| 可复用模块 | ${totalModules} | 200 | ${Math.round(totalModules / 200 * 100)}% |
| 原型方案 | ${totalPrototypes} | 3 | ${Math.min(100, Math.round(totalPrototypes / 3 * 100))}% |
| 样本候选池 | ${collectedSamples}/${totalSamples} 已收录 | 20 | ${Math.round(collectedSamples / totalSamples * 100)}% |

## 二、游戏库分布

### 按平台分布
${Object.entries(byPlatform).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}：${v} 款`).join("\n")}

### 按玩法类型分布
${Object.entries(byGenre).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}：${v} 款`).join("\n")}

### LGOS 评分概况
- 平均 LGOS：${avgLgos}
- Top 5 高分游戏：
${topGames.map((g, i) => `  ${i + 1}. ${g.name}（${g.platform}）- LGOS ${g.lgos}` + (g.lgos >= 85 ? " ⭐重点拆解" : "")).join("\n")}

## 三、模块库分布

${Object.entries(moduleTypes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}类：${v} 个`).join("\n")}

## 四、待办事项

### 缺少拆解的游戏（${unanalyzedGames.length} 款）
${unanalyzedGames.length ? unanalyzedGames.map((g) => `- [ ] ${g.name}（${g.platform}｜${g.genre}｜LGOS ${g.lgos}）`).join("\n") : "✅ 所有游戏都已有拆解"}

### 下一步建议
${unanalyzedGames.length > 0 ? `- 优先为 ${unanalyzedGames.length} 款无拆解游戏补充拆解` : ""}
- ${totalGames < 100 ? `继续扩充游戏库至 100 款（还差 ${100 - totalGames} 款）` : "✅ 游戏库已达 100 款目标"}
- ${totalModules < 200 ? `继续扩充模块库至 200 个（还差 ${200 - totalModules} 个）` : "✅ 模块库已达 200 个目标"}
- 持续用 MVP 组合器验证原型方案可行性

---
*本报告由 AI 世代轻量游戏门户自动生成，可直接粘贴到飞书 / Notion*
`;
    downloadText(text, `lightweight-game-progress-report-${new Date().toISOString().slice(0, 10)}.md`);
    showToast("已导出研究进度报告。");
  }

  function importJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const sourceVersion = Number(parsed.meta?.schemaVersion || 1);
        state = normalizeState({ ...clone(defaultData), ...parsed });
        bootNotice = sourceVersion < APP_SCHEMA_VERSION
          ? `导入数据已升级：schema v${sourceVersion} → v${APP_SCHEMA_VERSION}`
          : `已导入 schema v${APP_SCHEMA_VERSION} 数据`;
        saveState();
        selectedAnalysisId = state.analyses[0]?.id || null;
        renderAll();
        showToast("导入完成。");
      } catch (error) {
        showToast("导入失败：JSON 格式不正确。");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  async function copyText(text, successMessage) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      showToast(successMessage);
    } catch (error) {
      showToast("复制失败，可以手动选中文本复制。");
    }
  }

  function bindEvents() {
    nodes.gameSearch.addEventListener("input", renderGames);
    nodes.platformFilter.addEventListener("change", renderGames);
    nodes.samplePriority.addEventListener("change", renderSamples);
    nodes.sampleStatus.addEventListener("change", renderSamples);
    nodes.sampleBulkForm.addEventListener("submit", importSampleBatch);
    nodes.gameForm.addEventListener("submit", addGame);
    nodes.analysisForm.addEventListener("submit", addAnalysis);
    nodes.moduleFilter.addEventListener("change", renderModules);
    nodes.moduleForm.addEventListener("submit", addModule);
    nodes.composerForm.addEventListener("submit", generatePrototype);
    nodes.importFile.addEventListener("change", (event) => importJson(event.target.files[0]));

    nodes.gameGrid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-game-detail]");
      if (button) renderGameDialog(button.dataset.gameDetail);
    });

    nodes.sampleBoard.addEventListener("click", (event) => {
      const button = event.target.closest("[data-sample-toggle]");
      const toGameButton = event.target.closest("[data-sample-to-game]");
      if (!button && !toGameButton) return;
      const sampleId = button?.dataset.sampleToggle || toGameButton?.dataset.sampleToGame;
      const sample = state.sampleCandidates.find((item) => item.id === sampleId);
      if (!sample) return;
      if (toGameButton) {
        createGameFromSample(sample);
        return;
      }
      sample.status = sample.status === "待收录" ? "已收录" : "待收录";
      saveState();
      renderSamples();
      renderStats();
      renderInsights();
      showToast("样本状态已更新。");
    });

    nodes.moduleBoard.addEventListener("click", (event) => {
      const button = event.target.closest("[data-add-module-composer]");
      if (!button) return;
      addModuleToComposer(button.dataset.addModuleComposer);
    });

    nodes.analysisList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-analysis-id]");
      if (!button) return;
      selectedAnalysisId = button.dataset.analysisId;
      renderAnalyses();
    });

    nodes.analysisDetail.addEventListener("click", (event) => {
      const button = event.target.closest("[data-export-analysis]");
      const extractButton = event.target.closest("[data-extract-modules]");
      if (button) {
        const analysis = state.analyses.find((item) => item.id === button.dataset.exportAnalysis);
        if (analysis) downloadText(analysisToMarkdown(analysis), `analysis-${getGame(analysis.gameId)?.name || "game"}.md`);
      }
      if (extractButton) extractModulesFromAnalysis(extractButton.dataset.extractModules);
    });

    nodes.prototypeList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-prototype-id]");
      if (!button) return;
      const proto = state.prototypes.find((item) => item.id === button.dataset.prototypeId);
      if (proto) renderProposal(proto);
    });

    if (nodes.templateGrid) {
      nodes.templateGrid.addEventListener("click", (event) => {
        const button = event.target.closest("[data-template-id]");
        if (!button) return;
        const template = state.templates.find((item) => item.id === button.dataset.templateId);
        if (template) copyText(template.content, "模板已复制。");
      });
    }

    nodes.gameDialog.addEventListener("click", (event) => {
      if (event.target === nodes.gameDialog) nodes.gameDialog.close();
      const downloadButton = event.target.closest("[data-download-game]");
      if (downloadButton) {
        const game = getGame(downloadButton.dataset.downloadGame);
        if (game) downloadText(gameToMarkdown(game), `game-card-${game.name}.md`);
      }
      const createAnalysisButton = event.target.closest("[data-create-analysis]");
      if (createAnalysisButton) createAnalysisDraft(createAnalysisButton.dataset.createAnalysis);
    });

    document.addEventListener("click", (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (action === "export-json") exportJson();
      if (action === "export-workbook-md") exportWorkbookMarkdown();
      if (action === "export-progress-report") exportProgressReport();
      if (action === "sample-bulk-demo") nodes.sampleBulkInput.value = SAMPLE_IMPORT_EXAMPLE;
      if (action === "smart-fill-game") smartFillGame();
      if (action === "smart-fill-module") smartFillModule();
      if (action === "toggle-analysis-form") toggleAnalysisForm();
      if (action === "copy-prototype") copyText(currentPrototypeText, "当前方案已复制。");
      if (action === "download-prototype") downloadText(currentPrototypeText, `mvp-prototype-${new Date().toISOString().slice(0, 10)}.md`);
      if (action === "close-game-dialog") nodes.gameDialog.close();
      if (action === "reset-data" && confirm("确定重置为默认示例数据吗？本地录入会被清空。")) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        state = normalizeState(clone(defaultData));
        selectedAnalysisId = state.analyses[0]?.id || null;
        renderAll();
        showToast("已重置为默认数据。");
      }
    });
  }

  // ===== Tab 切换逻辑 =====
  const pageTitle = document.getElementById("pageTitle");
  const sideTabs = document.querySelectorAll(".side-tab");
  const tabPanels = document.querySelectorAll(".tab-panel");

  const TAB_TITLES = {
    "tab-radar": "机会雷达",
    "tab-library": "游戏库",
    "tab-samples": "样本池",
    "tab-analysis": "玩法拆解",
    "tab-modules": "模块灵感库",
    "tab-composer": "MVP 组合器"
  };

  function switchTab(targetId) {
    // 更新侧边栏
    sideTabs.forEach(t => t.classList.toggle("active", t.dataset.target === targetId));
    // 更新面板
    tabPanels.forEach(p => p.classList.toggle("active", p.id === targetId));
    // 更新标题
    if (pageTitle && TAB_TITLES[targetId]) {
      pageTitle.textContent = TAB_TITLES[targetId];
    }
    // 保存当前Tab到hash（可选）
    history.replaceState(null, "", "#" + targetId.replace("tab-", ""));
  }

  // 绑定Tab点击事件
  sideTabs.forEach(tab => {
    tab.addEventListener("click", () => switchTab(tab.dataset.target));
  });

  // 支持URL hash直接跳转
  const hashToId = { radar: "tab-radar", library: "tab-library", samples: "tab-samples", analysis: "tab-analysis", modules: "tab-modules", composer: "tab-composer" };
  const hashTarget = hashToId[location.hash.slice(1)];
  if (hashTarget) switchTab(hashTarget);

  bindEvents();
  renderAll();
})();
