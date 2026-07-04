// ==UserScript==
// @name         Snokido 游戏数据提取器
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  从 Snokido 游戏页面提取数据并生成导入 JSON
// @author       WorkBuddy
// @match        https://www.snokido.com/game/*
// @grant        GM_download
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';

    // 创建浮动按钮
    function createFloatingButton() {
        const btn = document.createElement('div');
        btn.id = 'snokido-extractor-btn';
        btn.innerHTML = '🎮 提取游戏数据';
        btn.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            cursor: pointer;
            z-index: 99999;
            font-family: Arial, sans-serif;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.3s;
        `;

        // 悬停效果
        btn.onmouseenter = () => {
            btn.style.transform = 'scale(1.05)';
            btn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
        };
        btn.onmouseleave = () => {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        };

        btn.onclick = extractAndDownload;
        document.body.appendChild(btn);
    }

    // 提取游戏数据
    function extractGameData() {
        const data = {};

        // 1. 游戏名
        const titleEl = document.querySelector('h1');
        data.name = titleEl ? titleEl.textContent.trim() : '';

        // 2. 开发者
        const devLink = document.querySelector('a[href*="/author/"]');
        data.developer = devLink ? devLink.textContent.trim() : '';

        // 3. 描述
        const metaDesc = document.querySelector('meta[property="og:description"]');
        data.description = metaDesc ? metaDesc.content : '';

        // 4. 标签
        const tagLinks = document.querySelectorAll('a[href*="/games/"]');
        data.tags = Array.from(tagLinks)
            .map(a => a.textContent.trim())
            .filter(tag => tag && !tag.includes('More') && !tag.includes('Games'));

        // 5. 封面图
        const ogImage = document.querySelector('meta[property="og:image"]');
        data.coverImage = ogImage ? ogImage.content : '';

        // 6. 游戏 iframe
        const iframe = document.querySelector('iframe');
        data.gameUrl = iframe ? iframe.src : '';

        // 7. 评分（从 JSON-LD）
        const jsonLd = document.querySelector('script[type="application/ld+json"]');
        if (jsonLd) {
            try {
                const jsonData = JSON.parse(jsonLd.textContent);
                data.rating = jsonData.aggregateRating?.ratingValue || '';
                data.plays = jsonData.interactionCount || '';
            } catch (e) {
                console.error('解析 JSON-LD 失败:', e);
            }
        }

        // 8. 页面 URL
        data.sourceUrl = window.location.href;

        return data;
    }

        // 映射到项目数据模型
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
            id: 'game-' + Date.now(),
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
            playSource: 'Snokido: ' + snokidoData.sourceUrl,
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

    // 提取并下载
    function extractAndDownload() {
        try {
            // 提取数据
            const snokidoData = extractGameData();
            console.log('提取的原始数据:', snokidoData);

            // 映射到项目模型
            const projectData = mapToProjectModel(snokidoData);
            console.log('映射后的数据:', projectData);

            // 生成 JSON
            const json = JSON.stringify([projectData], null, 2);

            // 下载文件
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `snokido-${projectData.name.replace(/\s+/g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // 显示成功提示
            showNotification('✅ 数据提取成功！JSON 文件已下载', 'success');

            // 同时复制到剪贴板
            GM_setClipboard(json);
            showNotification('📋 JSON 数据已复制到剪贴板', 'info');

        } catch (error) {
            console.error('提取失败:', error);
            showNotification('❌ 提取失败: ' + error.message, 'error');
        }
    }

    // 显示通知
    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 100000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }

    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    // 页面加载完成后创建按钮
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createFloatingButton);
    } else {
        createFloatingButton();
    }

})();
