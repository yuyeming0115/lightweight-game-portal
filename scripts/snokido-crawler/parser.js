const cheerio = require('cheerio');

/**
 * 解析 Snokido 游戏页面 HTML，提取游戏数据
 * @param {string} html - 页面 HTML
 * @param {string} url - 页面 URL
 * @returns {Object} 游戏数据对象
 */
function parseGamePage(html, url) {
  const $ = cheerio.load(html);
  
  // 1. 游戏名
  const name = $('h1').first().text().trim();
  
  // 2. 开发者
  const developer = $('a[href*="/author/"]').first().text().trim();
  
  // 3. 游玩次数（暂时留空，静态 HTML 中可能不包含）
  let plays = '';
  // TODO: 如果需要游玩次数，可以使用 Playwright 渲染 JavaScript 后提取
  // 当前先留空，避免提取到错误数据
  
  // 4. 描述
  let description = '';
  const descSelectors = ['.gameinfo p', '[itemprop="description"]', '#game-description'];
  for (const selector of descSelectors) {
    const el = $(selector).first();
    if (el.length > 0) {
      description = el.text().trim();
      break;
    }
  }
  if (!description) {
    description = $('meta[property="og:description"]').attr('content') || '';
  }
  
  // 5. 标签
  const tags = [];
  $('a[href*="/games/"]').each((i, el) => {
    const tag = $(el).text().trim();
    if (tag && !tags.includes(tag) && tag !== 'Games') {
      tags.push(tag);
    }
  });
  
  // 6. 封面图
  const coverImage = $('meta[property="og:image"]').attr('content') || 
                   extractJsonLd($).image || 
                   '';
  
  // 7. 游戏 iframe
  const gameIframe = $('iframe').first().attr('src') || '';
  
  // 8. JSON-LD 数据
  const jsonLd = extractJsonLd($);
  
  return {
    name,
    developer,
    plays,
    description,
    tags,
    coverImage,
    gameUrl: gameIframe, // 游戏嵌入 URL
    rating: jsonLd.aggregateRating ? jsonLd.aggregateRating.ratingValue : null,
    ratingCount: jsonLd.aggregateRating ? jsonLd.aggregateRating.ratingCount : null,
    pageUrl: url
  };
}

/**
 * 从页面提取 JSON-LD 数据
 */
function extractJsonLd($) {
  const jsonLdScript = $('script[type="application/ld+json"]').html();
  if (jsonLdScript) {
    try {
      return JSON.parse(jsonLdScript);
    } catch (e) {
      console.warn('Failed to parse JSON-LD:', e.message);
    }
  }
  return {};
}

module.exports = { parseGamePage, extractJsonLd };
