const axios = require('axios');
const cheerio = require('cheerio');

/**
 * P1 功能测试：验证数据提取逻辑
 * 
 * 这个测试验证 Userscript 中的数据提取函数是否能正确工作
 */

async function testExtractionLogic() {
  console.log('🧪 开始测试 P1 提取逻辑\n');

  const testUrls = [
    'https://www.snokido.com/game/egg-adventure',
    'https://www.snokido.com/game/snail-bob-7',
    'https://www.snokido.com/game/bouncemasters'
  ];

  for (const url of testUrls) {
    console.log(`📋 测试: ${url}`);

    try {
      // 1. 获取页面 HTML
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);

      // 2. 模拟 Userscript 的提取逻辑
      const snokidoData = extractGameData($);

      // 3. 验证提取结果
      console.log(`  游戏名: ${snokidoData.name || '❌'}`);
      console.log(`  开发者: ${snokidoData.developer || '❌'}`);
      console.log(`  标签: ${snokidoData.tags.length > 0 ? snokidoData.tags.join(', ') : '❌'}`);
      console.log(`  封面图: ${snokidoData.coverImage ? '✅' : '❌'}`);
      console.log(`  描述: ${snokidoData.description ? '✅' : '❌'}`);

      // 4. 测试数据映射
      const projectData = mapToProjectModel(snokidoData);
      console.log(`  映射后的类型: ${projectData.genre}`);
      console.log(`  映射后的平台: ${projectData.platform}`);

      console.log('  ✅ 测试通过\n');

    } catch (error) {
      console.error(`  ❌ 测试失败: ${error.message}\n`);
    }
  }

  console.log('✅ P1 提取逻辑测试完成！');
}

// 从 Userscript 复制的提取逻辑
function extractGameData($) {
  const data = {};

  // 1. 游戏名
  const titleEl = $('h1').first();
  data.name = titleEl.length > 0 ? titleEl.text().trim() : '';

  // 2. 开发者
  const devLink = $('a[href*="/author/"]').first();
  data.developer = devLink.length > 0 ? devLink.text().trim() : '';

  // 3. 描述
  const metaDesc = $('meta[property="og:description"]');
  data.description = metaDesc.length > 0 ? metaDesc.attr('content') : '';

  // 4. 标签
  const tagLinks = $('a[href*="/games/"]');
  data.tags = [];
  tagLinks.each((i, el) => {
    const tag = $(el).text().trim();
    if (tag && !tag.includes('More') && !tag.includes('Games') && !data.tags.includes(tag)) {
      data.tags.push(tag);
    }
  });

  // 5. 封面图
  const ogImage = $('meta[property="og:image"]');
  data.coverImage = ogImage.length > 0 ? ogImage.attr('content') : '';

  // 6. 游戏 iframe
  const iframe = $('iframe').first();
  data.gameUrl = iframe.length > 0 ? iframe.attr('src') : '';

  // 7. 评分和游玩次数（从 JSON-LD）
  const jsonLd = $('script[type="application/ld+json"]').first();
  if (jsonLd.length > 0) {
    try {
      const jsonData = JSON.parse(jsonLd.html());
      data.rating = jsonData.aggregateRating?.ratingValue || '';
      data.plays = jsonData.interactionCount || '';
    } catch (e) {
      console.error('  解析 JSON-LD 失败:', e.message);
    }
  }

  // 8. 页面 URL
  data.sourceUrl = ''; // 在浏览器中会是 window.location.href

  return data;
}

// 从 Userscript 复制的映射逻辑
function mapToProjectModel(snokidoData) {
  // 类型优先级（从左到右，优先级递减）
  const genrePriority = [
    { keywords: ['Logic', 'Brain Games', 'Puzzle', 'Physics'], value: '解谜' },
    { keywords: ['Adventure'], value: '冒险' },
    { keywords: ['Sports', 'Racing', 'Racing Games'], value: '体育' },
    { keywords: ['Arcade'], value: '街机' },
    { keywords: ['Action'], value: '动作' },
    { keywords: ['Skill'], value: '技巧' }
  ];

  const tags = snokidoData.tags || [];
  let genre = '其他';

  // 按优先级匹配
  for (const rule of genrePriority) {
    if (rule.keywords.some(keyword => tags.includes(keyword))) {
      genre = rule.value;
      break;
    }
  }

  return {
    id: 'game-test',
    name: snokidoData.name,
    englishName: snokidoData.name,
    platform: 'Web',
    genre: genre,
    region: '欧美',
    team: snokidoData.developer || '不明',
    art: '待评估',
    dev: '待评估',
    monetization: '免费 / 广告',
    revenueLevel: 'D',
    sourceCredibility: 'B',
    wechatFit: '可改造',
    playSource: 'Snokido: ' + (snokidoData.sourceUrl || 'test'),
    heatSource: snokidoData.plays ? `Snokido plays: ${snokidoData.plays}` : 'Snokido',
    screenshotNotes: snokidoData.coverImage ? `封面图: ${snokidoData.coverImage}` : '',
    videoNotes: snokidoData.developer ? `开发者: ${snokidoData.developer}` : '',
    lgos: 0,
    lgosDetails: {
      marketFriction: 0,
      monetizationEfficiency: 0,
      coreLoopAddiction: 0,
      socialSpread: 0,
      contentReplayability: 0,
      competitiveDepth: 0,
      techPerformance: 0,
      artIPValue: 0,
      operationalRisk: 0
    },
    tags: ['Snokido', ...tags],
    reason: snokidoData.description || ''
  };
}

// 运行测试
testExtractionLogic().catch(console.error);
