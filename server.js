const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const cron = require('node-cron');
const fsSync = require('fs');
const path = require('path');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files (index.html, app.js, style.css, etc.)
app.use(express.static(__dirname));

// ---- Shared scraping helpers ----

// Repeatedly scroll the counter list until all items are loaded
async function scrollToLoadAll(page) {
    let prevCount = 0;
    let noChangeCount = 0;
    for (let attempt = 0; attempt < 30; attempt++) {
        const currentCount = await page.evaluate(() => {
            const items = document.querySelectorAll('ul.border-t li');
            return items.length;
        });
        
        if (currentCount === prevCount && attempt > 0) {
            noChangeCount++;
            if (noChangeCount >= 2) break; // Only break if it fails to load twice in a row
        } else {
            noChangeCount = 0;
        }
        prevCount = currentCount;
        
        await page.evaluate(() => {
            window.scrollBy(0, 5000);
            window.scrollTo(0, document.body.scrollHeight);
            
            // Try to find ANY scrollable div and scroll it down
            const divs = document.querySelectorAll('div');
            for(let div of divs) {
                if (div.scrollHeight > div.clientHeight) {
                    div.scrollTop = div.scrollHeight;
                }
            }
            
            // OP.GG sometimes uses a "더보기" (Show more) button
            const buttons = document.querySelectorAll('button');
            for (let btn of buttons) {
                if (btn.textContent.includes('더보기') || btn.textContent.includes('Show more')) {
                    btn.click();
                }
            }
        });
        await new Promise(r => setTimeout(r, 2000));
    }
}

// Extract counter data from page DOM
async function scrapeCounterData(page, myChamp) {
    return await page.evaluate((myChamp) => {
        const results = {};
        
        const listItems = document.querySelectorAll('ul.border-t li');
        if (listItems.length > 0) {
            listItems.forEach(li => {
                try {
                    const img = li.querySelector('img[alt]');
                    if (!img) return;
                    let champId = img.alt.trim();
                    const srcMatch = img.src.match(/champion\/([^.]+)\./);
                    if (srcMatch) champId = srcMatch[1];
                    if (champId.toLowerCase() === myChamp.toLowerCase()) return;
                    
                    const strong = li.querySelector('strong');
                    if (!strong) return;
                    const winRate = parseFloat(strong.textContent.trim().replace('%', ''));
                    if (isNaN(winRate)) return;
                    
                    let games = 0;
                    li.querySelectorAll('div').forEach(div => {
                        const text = div.textContent.trim().replace(/,/g, '');
                        if (/^\d+$/.test(text) && parseInt(text) > 5) games = parseInt(text);
                    });
                    results[champId] = { opggWinRate: winRate, games, displayName: champId };
                } catch(e) {}
            });
        }
        
        // Fallback for alternate OP.GG layouts
        if (Object.keys(results).length === 0) {
            const altItems = document.querySelectorAll('li, div.flex');
            altItems.forEach(el => {
                try {
                    const img = el.querySelector('img[src*="champion"]');
                    if (!img) return;
                    const match = el.textContent.match(/(\d{2}\.\d{2})%/);
                    if (match) {
                        let champId = img.alt.trim();
                        const srcMatch = img.src.match(/champion\/([^.]+)\./);
                        if (srcMatch) champId = srcMatch[1];
                        if (champId && champId.toLowerCase() !== myChamp.toLowerCase() && !results[champId]) {
                            results[champId] = { opggWinRate: parseFloat(match[1]), games: 0, displayName: champId };
                        }
                    }
                } catch(e) {}
            });
        }
        
        return results;
    }, myChamp);
}

// Apply tier rules to scraped data
function applyTierRules(data) {
    const tieredData = {};
    for (const [champ, info] of Object.entries(data)) {
        let tier = '2';
        if (info.opggWinRate > 52.00) tier = '1';
        else if (info.opggWinRate < 48.00) tier = '3';
        tieredData[champ] = { tier, opggWinRate: info.opggWinRate, games: info.games, displayName: info.displayName };
    }
    return tieredData;
}


const CACHE_FILE = path.join(__dirname, 'opgg_cache.json');

async function fetchAllChampions() {
    return new Promise((resolve, reject) => {
        https.get('https://ddragon.leagueoflegends.com/api/versions.json', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const version = JSON.parse(data)[0];
                https.get(`https://ddragon.leagueoflegends.com/cdn/${version}/data/ko_KR/champion.json`, (res2) => {
                    let data2 = '';
                    res2.on('data', chunk => data2 += chunk);
                    res2.on('end', () => {
                        const champData = JSON.parse(data2).data;
                        resolve(Object.keys(champData));
                    });
                }).on('error', reject);
            });
        }).on('error', reject);
    });
}

// Global automated scraping function
async function runDailyScrape() {
    console.log('[CRON] 일일 전체 챔피언 OP.GG 스크래핑 시작...');
    
    let champions = [];
    try {
        champions = await fetchAllChampions();
        console.log(`[CRON] 총 ${champions.length}개의 챔피언 목록 가져옴.`);
    } catch (e) {
        console.error('[CRON] 챔피언 목록 가져오기 실패:', e);
        return;
    }
    
    const roles = ['top', 'jungle', 'mid', 'adc', 'support'];
    const cacheData = {
        updatedAt: new Date().toISOString(),
        matchups: {}
    };
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        
        for (const role of roles) {
            for (const champ of champions) {
                console.log(`[CRON] 스크래핑 중... ${champ} (${role})`);
                const page = await browser.newPage();
                await page.setViewport({ width: 1920, height: 1080 });
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
                await page.setRequestInterception(true);
                page.on('request', (req) => {
                    if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                        req.abort();
                    } else {
                        req.continue();
                    }
                });
                
                try {
                    const url = `https://www.op.gg/champions/${champ}/counters/${role}?region=kr&tier=emerald_plus`;
                    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
                    await new Promise(r => setTimeout(r, 4000));
                    
                    await scrollToLoadAll(page);
                    
                    const data = await scrapeCounterData(page, champ);
                    
                    if (Object.keys(data).length > 0) {
                        const tieredData = applyTierRules(data);
                        
                        if (!cacheData.matchups[champ]) cacheData.matchups[champ] = {};
                        cacheData.matchups[champ][role] = tieredData;
                        console.log(`  -> ${Object.keys(tieredData).length}개 매치업 추가`);
                    }
                } catch(e) {
                    console.log(`  -> 에러: ${e.message}`);
                }
                await page.close();
                await new Promise(r => setTimeout(r, 500));
            }
        }
        await browser.close();
        
        fsSync.writeFileSync(CACHE_FILE, JSON.stringify(cacheData));
        console.log('[CRON] 전체 데이터 업데이트 및 저장 완료!');
        
    } catch(err) {
        console.error('[CRON] 브라우저 실행 에러:', err);
    }
}

// 0 4 * * * = 한국 시간(Asia/Seoul) 매일 새벽 4시
cron.schedule('0 4 * * *', () => {
    runDailyScrape();
}, {
    timezone: "Asia/Seoul"
});

app.get('/api/cache', (req, res) => {
    if (fsSync.existsSync(CACHE_FILE)) {
        res.sendFile(CACHE_FILE);
    } else {
        res.status(404).json({ error: 'Cache not found. Run manual sync or wait for cron.' });
    }
});

// Run it once on startup if you want (commented out by default)
// runDailyScrape();


const PORT = process.env.PORT || 3000;

// Scrape counter data for a specific champion + role
app.get('/api/scrape', async (req, res) => {
    const { champion, role } = req.query;
    if (!champion || !role) {
        return res.status(400).json({ error: 'champion과 role 파라미터가 필요합니다.' });
    }

    let browser;
    try {
        console.log(`[스크래핑] ${champion} (${role}) 시작...`);
        
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
        
        // Optimize for free cloud tier: block images, stylesheets, and fonts
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });
        
        const url = `https://www.op.gg/champions/${champion}/counters/${role}?region=kr&tier=emerald_plus`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // Wait for dynamic rendering
        await new Promise(r => setTimeout(r, 4000));
        
        // Scroll repeatedly to load ALL counter items
        await scrollToLoadAll(page);
        
        // Extract counter data
        const data = await scrapeCounterData(page, champion);
        
        await browser.close();
        browser = null;
        
        if (Object.keys(data).length === 0) {
            return res.status(404).json({ error: '카운터 데이터를 찾을 수 없습니다. (데이터 표본 부족)' });
        }
        
        const tieredData = applyTierRules(data);
        
        console.log(`[완료] ${champion}: ${Object.keys(tieredData).length}개 매치업 데이터 추출`);
        res.json(tieredData);
        
    } catch (error) {
        console.error('[에러]', error.message);
        res.status(500).json({ error: 'OP.GG 스크래핑 실패: ' + error.message });
    } finally {
        if (browser) {
            try { await browser.close(); } catch(e) {}
        }
    }
});

// Batch scrape: scrape multiple champions at once
app.post('/api/scrape-batch', async (req, res) => {
    const { champions, role } = req.body;
    if (!champions || !Array.isArray(champions) || !role) {
        return res.status(400).json({ error: 'champions (배열)과 role이 필요합니다.' });
    }
    
    // We'll respond immediately and let the client poll or use SSE
    // For simplicity, just do them sequentially
    const results = {};
    const errors = {};
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        
        for (const champion of champions) {
            try {
                console.log(`[배치 스크래핑] ${champion} (${role})...`);
                const page = await browser.newPage();
                await page.setViewport({ width: 1920, height: 1080 });
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
                
                await page.setRequestInterception(true);
                page.on('request', (req) => {
                    if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                        req.abort();
                    } else {
                        req.continue();
                    }
                });

                const url = `https://www.op.gg/champions/${champion}/counters/${role}?region=kr&tier=emerald_plus`;
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
                await new Promise(r => setTimeout(r, 4000));
                
                // Scroll repeatedly to load ALL counter items
                await scrollToLoadAll(page);
                
                const data = await scrapeCounterData(page, champion);
                
                // Apply tier rules
                const tieredData = applyTierRules(data);
                
                results[champion] = tieredData;
                console.log(`  -> ${Object.keys(tieredData).length}개 매치업`);
                
                await page.close();
                
                // Brief delay between requests to avoid rate limiting
                await new Promise(r => setTimeout(r, 1000));
                
            } catch (err) {
                console.error(`  -> [에러] ${champion}: ${err.message}`);
                errors[champion] = err.message;
            }
        }
        
        await browser.close();
        
    } catch (err) {
        console.error('[배치 에러]', err.message);
        return res.status(500).json({ error: '브라우저 실행 실패: ' + err.message });
    }
    
    res.json({ results, errors });
});

app.listen(PORT, () => {
    console.log(`===================================`);
    console.log(`  LoL Pick System Server Running!`);
    console.log(`  앱 열기: http://localhost:${PORT}`);
    console.log(`===================================`);
});
