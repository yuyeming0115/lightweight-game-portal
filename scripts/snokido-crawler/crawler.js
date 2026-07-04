const axios = require('axios');
const fs = require('fs-extra');
const { parseGamePage } = require('./parser');
const { batchMap } = require('./data-mapper');

// 配置
const CONFIG = {
  baseUrl: 'https://www.snokido.com/game/',
  requestDelay: 2000, // 请求延迟（毫秒）
  timeout: 30000, // 请求超时（毫秒）
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

/**
 * 抓取单个游戏页面
 * @param {string} url - 游戏页面 URL
 * @returns {Promise<Object>} 游戏数据
 */
async function crawlGamePage(url) {
  console.log(`[抓取] ${url}`);
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': CONFIG.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: CONFIG.timeout
    });
    
    const gameData = parseGamePage(response.data, url);
    console.log(`[成功] ${gameData.name} (${gameData.developer})`);
    return gameData;
  } catch (err) {
    console.error(`[失败] ${url}: ${err.message}`);
    return null;
  }
}

/**
 * 批量抓取游戏页面
 * @param {Array<string>} urls - 游戏页面 URL 数组
 * @returns {Promise<Array>} 游戏数据数组
 */
async function batchCrawl(urls) {
  const results = [];
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`\n[进度] ${i + 1}/${urls.length}`);
    
    const gameData = await crawlGamePage(url);
    if (gameData) {
      results.push(gameData);
    }
    
    // 延迟，避免请求过快
    if (i < urls.length - 1) {
      const delay = CONFIG.requestDelay + Math.random() * 1000;
      console.log(`[延迟] ${(delay / 1000).toFixed(1)}秒...`);
      await sleep(delay);
    }
  }
  
  return results;
}

/**
 * 导出为项目导入格式
 * @param {Array} snokidoGames - Snokido 游戏数据数组
 * @param {string} outputPath - 输出文件路径
 */
function exportImportJson(snokidoGames, outputPath) {
  // 映射到项目数据模型
  const games = batchMap(snokidoGames);
  
  // 构建导入文件
  const importData = {
    meta: {
      schemaVersion: 3,
      updatedAt: new Date().toISOString(),
      source: 'Snokido Crawler',
      importBatch: `batch-${Date.now().toString(36)}`
    },
    games: games
  };
  
  // 写入文件
  fs.writeJsonSync(outputPath, importData, { spaces: 2 });
  console.log(`\n[导出] 已导出 ${games.length} 款游戏到: ${outputPath}`);
  
  return importData;
}

/**
 * 从文件读取 URL 列表
 * @param {string} filePath - URL 列表文件路径（每行一个 URL）
 * @returns {Array<string>} URL 数组
 */
function loadUrlsFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

/**
 * 睡眠函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  
  // 解析命令行参数
  let urls = [];
  let outputPath = 'snokido-import.json';
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
      urls.push(args[i + 1]);
      i++;
    } else if (args[i] === '--batch' && args[i + 1]) {
      urls = loadUrlsFromFile(args[i + 1]);
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputPath = args[i + 1];
      i++;
    } else if (args[i] === '--help') {
      console.log(`
Usage:
  node crawler.js --url <url> [--output <path>]
  node crawler.js --batch <urls.txt> [--output <path>]

Options:
  --url <url>       抓取单个游戏页面
  --batch <file>      从文件批量抓取（每行一个 URL）
  --output <path>     指定输出文件路径（默认：snokido-import.json）
  --help              显示帮助信息

Examples:
  node crawler.js --url https://www.snokido.com/game/egg-adventure
  node crawler.js --batch urls.txt --output data/import.json
      `);
      return;
    }
  }
  
  // 如果没有提供 URL，显示帮助
  if (urls.length === 0) {
    console.log('请提供游戏 URL。使用 --help 查看帮助。');
    console.log('\n示例：');
    console.log('  node crawler.js --url https://www.snokido.com/game/egg-adventure');
    return;
  }
  
  // 抓取游戏数据
  console.log(`\n[开始] 共 ${urls.length} 个游戏页面\n`);
  const snokidoGames = await batchCrawl(urls);
  
  // 过滤失败的结果
  const validGames = snokidoGames.filter(g => g !== null);
  console.log(`\n[完成] 成功抓取 ${validGames.length}/${urls.length} 个游戏`);
  
  // 导出为导入格式
  if (validGames.length > 0) {
    exportImportJson(validGames, outputPath);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { crawlGamePage, batchCrawl, exportImportJson };
