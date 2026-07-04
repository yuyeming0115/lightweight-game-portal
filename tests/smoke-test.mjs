import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve("D:/GitWork/Demo/ai-ai/apps/sites/lightweight-game-portal-mvp");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const dataCode = fs.readFileSync(path.join(root, "data/static-data.js"), "utf8");
const appCode = fs.readFileSync(path.join(root, "app.js"), "utf8");

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(dataCode, sandbox);
const data = sandbox.window.LG_PORTAL_DEFAULT_DATA;

const requiredHtmlTokens = [
  'data-stats',
  'data-game-grid',
  'data-lgos-inputs',
  'data-sample-board',
  'data-analysis-detail',
  'data-module-board',
  'data-composer-form',
  'data-template-grid',
  'data-game-dialog',
  'export-workbook-md',
  './data/static-data.js',
  './app.js'
];

const failures = [];

for (const token of requiredHtmlTokens) {
  if (!html.includes(token)) failures.push(`HTML 缺少 ${token}`);
}

for (const key of ["games", "analyses", "modules", "prototypes", "templates", "platforms", "genres", "moduleTypes", "lgosDimensions", "sampleCandidates"]) {
  if (!Array.isArray(data[key]) || data[key].length === 0) failures.push(`默认数据 ${key} 为空或不是数组`);
}

if (data.lgosDimensions.length !== 9) failures.push("LGOS 维度数量不是 9");
if (data.sampleCandidates.length !== 20) failures.push("第一批样本池不是 20 条");

const gameIds = new Set(data.games.map((game) => game.id));
if (gameIds.size !== data.games.length) failures.push("游戏 ID 存在重复");

const moduleIds = new Set(data.modules.map((module) => module.id));
if (moduleIds.size !== data.modules.length) failures.push("模块 ID 存在重复");

for (const analysis of data.analyses) {
  if (!gameIds.has(analysis.gameId)) failures.push(`拆解 ${analysis.id} 关联了不存在的游戏 ${analysis.gameId}`);
  if (!Array.isArray(analysis.loop) || analysis.loop.length < 3) failures.push(`拆解 ${analysis.id} 的核心循环过短`);
}

for (const game of data.games) {
  if (typeof game.lgos !== "number" || game.lgos < 0 || game.lgos > 100) failures.push(`游戏 ${game.id} 的 LGOS 不合法`);
  for (const dimension of data.lgosDimensions) {
    if (typeof game.lgosDetails?.[dimension.key] !== "number") failures.push(`游戏 ${game.id} 缺少 LGOS 维度 ${dimension.key}`);
  }
  for (const field of ["sourceCredibility", "screenshotNotes", "videoNotes"]) {
    if (!(field in game)) failures.push(`游戏 ${game.id} 缺少字段 ${field}`);
  }
}

for (const requiredFunction of ["renderAll", "addGame", "addAnalysis", "addModule", "generatePrototype", "exportJson", "importJson", "renderSamples", "renderGameDialog", "gameToMarkdown", "analysisToMarkdown", "createGameFromSample", "exportWorkbookMarkdown", "getGameCompleteness", "createAnalysisDraft", "extractModulesFromAnalysis"]) {
  if (!appCode.includes(`function ${requiredFunction}`)) failures.push(`app.js 缺少 ${requiredFunction}`);
}

for (const token of ["data-sample-to-game", "data-action=\"export-workbook-md\"", "sourceCredibility", "screenshotNotes", "videoNotes", "data-create-analysis", "data-extract-modules", "completeness"]) {
  if (!appCode.includes(token) && !html.includes(token) && !dataCode.includes(token)) failures.push(`缺少功能标记 ${token}`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("smoke-test passed");
