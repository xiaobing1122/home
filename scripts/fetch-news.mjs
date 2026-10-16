import { writeFile } from 'node:fs/promises';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const LIMIT = 80;

const stripTags = (s) => (s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const clip = (s, n) => (s && s.length > n ? s.slice(0, n) + '…' : s || '');

function toBeijingISO(input) {
  const ms = typeof input === 'number' ? input : new Date(input).getTime();
  return new Date(ms + 8 * 3600 * 1000).toISOString().slice(0, 19) + '+08:00';
}

async function getJSON(url, headers = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, ...headers },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchWallstreetcn() {
  const channels = ['a-stock-channel', 'global-channel'];
  const lists = await Promise.all(
    channels.map(async (ch) => {
      const j = await getJSON(`https://api-one.wallstcn.com/apiv1/content/lives?channel=${ch}&client=pc&limit=30`);
      return j.data?.items || [];
    }),
  );
  return lists.flat().map((it) => ({
    source: '华尔街见闻',
    title: (it.title || '').trim() || clip(stripTags(it.content_text), 60),
    summary: clip(stripTags(it.content_text), 160),
    url: it.uri,
    time: toBeijingISO(it.display_time * 1000),
    important: false,
  }));
}

async function fetchEastmoney() {
  const url =
    'https://np-listapi.eastmoney.com/comm/web/getFastNewsList?client=web&biz=web_724&fastColumn=102&sortEnd=&pageSize=30&req_trace=' +
    Date.now();
  const j = await getJSON(url);
  return (j.data?.fastNewsList || []).map((it) => {
    const title = (it.title || '').trim();
    let summary = (it.summary || '').trim();
    const m = summary.match(/^【(.+?)】/);
    if (m && m[1] === title) summary = summary.slice(m[0].length).trim();
    return {
      source: '东方财富',
      title: title || clip(summary, 60),
      summary: clip(summary, 160),
      url: `https://finance.eastmoney.com/a/${it.code}.html`,
      time: it.showTime ? it.showTime.replace(' ', 'T') + '+08:00' : toBeijingISO(Date.now()),
      important: false,
    };
  });
}

async function fetchJin10() {
  const j = await getJSON('https://flash-api.jin10.com/get_flash_list?channel=-8200&vip=1', {
    'x-app-id': 'bVBF4FyRTn5NJF5n',
    'x-version': '1.0.0',
  });
  return (j.data || [])
    .filter((it) => it.data && !it.data.lock && stripTags(it.data.content))
    .map((it) => ({
      source: '金十数据',
      title: (it.data.title || '').trim() || clip(stripTags(it.data.content), 50),
      summary: clip(stripTags(it.data.content), 160),
      url: `https://flash.jin10.com/detail/${it.id}`,
      time: it.time.replace(' ', 'T') + '+08:00',
      important: it.important === 1,
    }));
}

const results = await Promise.allSettled([fetchWallstreetcn(), fetchEastmoney(), fetchJin10()]);
const items = [];
for (const r of results) {
  if (r.status === 'fulfilled') items.push(...r.value);
  else console.error('一个数据源抓取失败：', r.reason?.message || r.reason);
}

const seen = new Set();
const deduped = items.filter((it) => {
  const key = it.title.replace(/[\s\p{P}]/gu, '').slice(0, 24);
  if (!key || seen.has(key)) return false;
  seen.add(key);
  return true;
});

deduped.sort((a, b) => new Date(b.time) - new Date(a.time));
const latest = deduped.slice(0, LIMIT);

if (latest.length === 0) {
  console.error('所有数据源均未返回内容，保留原有 news.json');
  process.exit(1);
}

const out = { updatedAt: toBeijingISO(Date.now()), count: latest.length, items: latest };
await writeFile(new URL('../news.json', import.meta.url), JSON.stringify(out, null, 1), 'utf8');
console.log(`已更新 news.json：${latest.length} 条（抓取 ${items.length} 条，去重后 ${deduped.length} 条）`);
