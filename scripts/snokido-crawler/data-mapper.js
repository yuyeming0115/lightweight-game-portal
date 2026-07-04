/**
 * 将 Snokido 游戏数据映射到项目数据模型
 */

// 游戏类型映射表（按优先级排序）
const GENRE_MAP = {
  'Logic': '解谜',
  'Brain Games': '解谜',
  'Puzzle': '解谜',
  'Physics': '物理解谜',
  'Adventure': '冒险',
  'Action': '动作',
  'Sports': '体育',
  'Racing': '竞速',
  'Arcade': '街机',
  'Strategy': '策略',
  'RPG': 'RPG',
  'Fighting': '格斗',
  'Shooting': '射击',
  'Launch': '发射',
  'Upgrades': '升级'
};

// 类型优先级（数字越小优先级越高）
const GENRE_PRIORITY = [
  'Logic', 'Puzzle', 'Physics', // 解谜类优先
  'Action', 'Adventure', // 动作冒险
  'Sports', 'Racing', // 体育竞速
  'Arcade', 'Strategy', // 街机策略
  'RPG', 'Fighting', 'Shooting' // 其他
];

/**
 * 智能确定游戏类型
 * @param {Array<string>} tags - 游戏标签数组
 * @returns {string} 游戏类型
 */
function determineGenre(tags) {
  if (!tags || tags.length === 0) {
    return '解谜'; // 默认类型
  }
  
  // 按优先级查找匹配的类型
  for (const priorityGenre of GENRE_PRIORITY) {
    if (tags.includes(priorityGenre)) {
      return GENRE_MAP[priorityGenre] || '解谜';
    }
  }
  
  // 如果没有匹配的优先级类型，使用第一个标签
  const firstTag = tags[0];
  return GENRE_MAP[firstTag] || '解谜';
}

/**
 * 映射 Snokido 数据到项目模型
 * @param {Object} snokidoData - parseGamePage 返回的数据
 * @returns {Object} 项目数据模型
 */
function mapToProjectData(snokidoData) {
  // 生成唯一 ID
  const id = `game-snokido-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  
  // 确定游戏类型（使用智能映射）
  const genre = determineGenre(snokidoData.tags);
  
  // 处理游玩次数
  let heatSource = 'Snokido';
  if (snokidoData.plays) {
    const playsCount = parseInt(snokidoData.plays.replace(/[,\s]/g, ''), 10);
    if (!isNaN(playsCount) && playsCount > 0) {
      heatSource = `Snokido plays: ${playsCount.toLocaleString()}`;
    }
  }
  
  return {
    id: id,
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
    sourceCredibility: 'B', // Snokido 是知名平台
    wechatFit: '可改造',
    playSource: `Snokido: ${snokidoData.pageUrl}`,
    heatSource: heatSource,
    screenshotNotes: snokidoData.coverImage ? `封面图: ${snokidoData.coverImage}` : '',
    videoNotes: snokidoData.developer ? `开发者: ${snokidoData.developer}` : '',
    commentNotes: '',
    lgos: 0, // 默认 0，用户后续手动评分
    lgosDetails: {
      clarity: 0,
      soloFeasible: 0,
      artCost: 0,
      attract3s: 0,
      retain3m: 0,
      growth: 0,
      monetizeNatural: 0,
      platformFit: 0,
      moduleReuse: 0
    },
    tags: ['Snokido', ...(snokidoData.tags || [])],
    reason: snokidoData.description 
      ? snokidoData.description.substring(0, 200) + '...'
      : '从 Snokido 导入，待补充研究判断。'
  };
}

/**
 * 批量映射
 * @param {Array} snokidoGames - Snokido 游戏数据数组
 * @returns {Array} 项目数据模型数组
 */
function batchMap(snokidoGames) {
  return snokidoGames
    .filter(game => game && game.name) // 过滤无效数据
    .map(game => mapToProjectData(game));
}

module.exports = { mapToProjectData, batchMap, determineGenre, GENRE_MAP };
