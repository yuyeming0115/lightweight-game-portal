const axios = require('axios');
const cheerio = require('cheerio');

// 测试抓取 Snokido 游戏页面
async function testFetchGamePage(url) {
  console.log(`\n=== 正在抓取: ${url} ===\n`);
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 30000
    });
    
    analyzeHtmlStructure(response.data, url);
    return response.data;
  } catch (err) {
    console.error('抓取失败:', err.message);
    return null;
  }
}

// 分析 HTML 结构
function analyzeHtmlStructure(html, url) {
  const $ = cheerio.load(html);
  
  console.log('=== 页面结构分析 ===\n');
  
  // 1. 游戏名
  const h1 = $('h1').first();
  console.log('1. 游戏名 (h1):', h1.length > 0 ? h1.text().trim() : '未找到');
  
  // 2. Meta 标签
  const ogImage = $('meta[property="og:image"]').attr('content');
  const ogTitle = $('meta[property="og:title"]').attr('content');
  const ogDesc = $('meta[property="og:description"]').attr('content');
  
  console.log('\n2. Meta 标签:');
  console.log('   og:image:', ogImage || '未找到');
  console.log('   og:title:', ogTitle || '未找到');
  console.log('   og:description:', ogDesc ? ogDesc.substring(0, 100) + '...' : '未找到');
  
  // 3. 开发者信息
  const developerLink = $('a[href*="/author/"]').first();
  console.log('\n3. 开发者:', developerLink.length > 0 ? developerLink.text().trim() : '未找到');
  
  // 4. 游玩次数（改进版）
  let plays = '';
  
  // 方法1：搜索包含 "plays" 的元素
  $('*').each((i, el) => {
    const text = $(el).text();
    const match = text.match(/([\d,\s]+)\s*plays?/i);
    if (match && text.indexOf('plays') < 50) { // 限制文本长度
      plays = match[1].trim();
      return false; // 停止循环
    }
  });
  
  // 方法2：如果方法1失败，查找开发者链接所在的元素
  if (!plays) {
    const devElement = $('a[href*="/author/"]').first();
    if (devElement.length > 0) {
      // 查找父元素或相邻元素的文本
      const parentText = devElement.parent().text();
      const match = parentText.match(/([\d,\s]+)\s*plays?/i);
      if (match) {
        plays = match[1].trim();
      }
    }
  }
  
  console.log('\n4. 游玩次数:', plays || '未找到');
  
  // 5. 游戏描述
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
    description = ogDesc || '';
  }
  console.log('\n5. 游戏描述:', description ? description.substring(0, 150) + '...' : '未找到');
  
  // 6. 标签/分类
  const tags = [];
  const tagSelectors = ['a[href*="/games/"]', '.gametags a', '.tags a'];
  for (const selector of tagSelectors) {
    $(selector).each((i, el) => {
      const tag = $(el).text().trim();
      if (tag && !tags.includes(tag) && tag !== 'Games') {
        tags.push(tag);
      }
    });
    if (tags.length > 0) break;
  }
  console.log('\n6. 标签/分类:', tags.length > 0 ? tags.slice(0, 10).join(', ') : '未找到');
  
  // 7. 封面图（使用 og:image 或 JSON-LD）
  const coverImage = ogImage || (() => {
    const jsonLdScript = $('script[type="application/ld+json"]').html();
    if (jsonLdScript) {
      try {
        const jsonLd = JSON.parse(jsonLdScript);
        return jsonLd.image;
      } catch (e) {}
    }
    return null;
  })();
  console.log('\n7. 封面图:', coverImage || '未找到');
  
  // 8. 游戏 iframe
  const iframe = $('iframe').first();
  const gameUrl = iframe.length > 0 ? iframe.attr('src') : null;
  console.log('\n8. 游戏 iframe:', gameUrl || '未找到');
  
  // 9. JSON-LD 数据
  const jsonLdScript = $('script[type="application/ld+json"]').html();
  if (jsonLdScript) {
    try {
      const jsonLd = JSON.parse(jsonLdScript);
      console.log('\n9. JSON-LD 数据:');
      console.log('   名称:', jsonLd.name || 'N/A');
      console.log('   描述:', jsonLd.description ? jsonLd.description.substring(0, 100) + '...' : 'N/A');
      console.log('   图片:', jsonLd.image || 'N/A');
      console.log('   评分:', jsonLd.aggregateRating ? jsonLd.aggregateRating.ratingValue : 'N/A');
    } catch (e) {
      console.log('\n9. JSON-LD 数据: 解析失败');
    }
  } else {
    console.log('\n9. JSON-LD 数据: 未找到');
  }
  
  // 10. 页面中的关键 CSS 类名
  console.log('\n10. 页面关键元素统计:');
  console.log('   h1 数量:', $('h1').length);
  console.log('   iframe 数量:', $('iframe').length);
  console.log('   img 数量:', $('img').length);
  console.log('   .gameinfo 数量:', $('.gameinfo').length);
  console.log('   .gametags 数量:', $('.gametags').length);
  
  // 11. 提取所有关键数据
  console.log('\n11. 提取的数据汇总:');
  const gameData = extractGameData($, url);
  console.log(JSON.stringify(gameData, null, 2));
}

// 提取游戏数据
function extractGameData($, url) {
  // 游戏名
  const name = $('h1').first().text().trim();
  
  // 开发者
  const developer = $('a[href*="/author/"]').first().text().trim();
  
  // 游玩次数
  let plays = '';
  $('*').each((i, el) => {
    const text = $(el).text();
    const match = text.match(/([\d,\s]+)\s*plays?/i);
    if (match && text.indexOf('plays') < 50) {
      plays = match[1].trim();
      return false;
    }
  });
  
  // 描述
  let description = '';
  const descSelectors = ['.gameinfo p', '[itemprop="description"]'];
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
  
  // 标签
  const tags = [];
  $('a[href*="/games/"]').each((i, el) => {
    const tag = $(el).text().trim();
    if (tag && !tags.includes(tag) && tag !== 'Games') {
      tags.push(tag);
    }
  });
  
  // 封面图
  const coverImage = $('meta[property="og:image"]').attr('content');
  
  // iframe
  const gameIframe = $('iframe').first().attr('src');
  
  // JSON-LD
  let jsonLd = {};
  const jsonLdScript = $('script[type="application/ld+json"]').html();
  if (jsonLdScript) {
    try {
      jsonLd = JSON.parse(jsonLdScript);
    } catch (e) {}
  }
  
  return {
    name,
    developer,
    plays,
    description: description.substring(0, 200),
    tags,
    coverImage,
    gameIframe,
    jsonLd: {
      name: jsonLd.name,
      image: jsonLd.image,
      rating: jsonLd.aggregateRating ? jsonLd.aggregateRating.ratingValue : null
    },
    pageUrl: url
  };
}

// 主函数
async function main() {
  const testUrls = [
    'https://www.snokido.com/game/egg-adventure',
    'https://www.snokido.com/game/snail-bob-7',
    'https://www.snokido.com/game/bouncemasters'
  ];
  
  for (const url of testUrls) {
    await testFetchGamePage(url);
    console.log('\n' + '='.repeat(80) + '\n');
    
    // 延迟 2 秒，避免请求过快
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

main().catch(console.error);
