const SOURCE_COLOR = {
  '华尔街见闻': '#c98a2b',
  '东方财富': '#2f6fed',
  '金十数据': '#159a63',
};

const listEl = document.getElementById('news-list');
const filtersEl = document.getElementById('filters');
const updatedEl = document.getElementById('updated');
const emptyEl = document.getElementById('empty');

let allItems = [];
let active = '全部';

const shDateKey = (t) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(t));

const shTime = (t) =>
  new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(t));

function dateLabel(t) {
  const now = Date.now();
  if (shDateKey(t) === shDateKey(now)) return '今天';
  if (shDateKey(t) === shDateKey(now - 86400000)) return '昨天';
  return shDateKey(t).slice(5);
}

function renderFilters() {
  filtersEl.textContent = '';
  const names = ['全部', ...Object.keys(SOURCE_COLOR)];
  for (const name of names) {
    const count = name === '全部' ? allItems.length : allItems.filter((i) => i.source === name).length;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip' + (name === active ? ' active' : '');
    btn.textContent = `${name} ${count}`;
    btn.addEventListener('click', () => {
      active = name;
      render();
    });
    filtersEl.appendChild(btn);
  }
}

function render() {
  renderFilters();
  const items = active === '全部' ? allItems : allItems.filter((i) => i.source === active);
  emptyEl.hidden = items.length > 0;
  listEl.textContent = '';

  for (const it of items) {
    const li = document.createElement('li');
    li.className = 'card' + (it.important ? ' important' : '');

    const timeBox = document.createElement('div');
    timeBox.className = 'time';
    const hm = document.createElement('span');
    hm.className = 'hm';
    hm.textContent = shTime(it.time);
    const day = document.createElement('span');
    day.className = 'day';
    day.textContent = dateLabel(it.time);
    timeBox.append(hm, day);

    const body = document.createElement('div');
    body.className = 'body';

    const meta = document.createElement('div');
    meta.className = 'meta';
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = SOURCE_COLOR[it.source] || '#999';
    const src = document.createElement('span');
    src.textContent = it.source;
    meta.append(dot, src);
    if (it.important) {
      const imp = document.createElement('span');
      imp.className = 'imp';
      imp.textContent = '重要';
      meta.appendChild(imp);
    }

    const h2 = document.createElement('h2');
    const a = document.createElement('a');
    a.href = it.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = it.title;
    h2.appendChild(a);

    body.append(meta, h2);
    if (it.summary && it.summary !== it.title) {
      const p = document.createElement('p');
      p.className = 'summary';
      p.textContent = it.summary;
      body.appendChild(p);
    }

    li.append(timeBox, body);
    listEl.appendChild(li);
  }
}

async function load() {
  try {
    const res = await fetch('news.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    allItems = data.items || [];
    updatedEl.textContent = data.updatedAt
      ? `更新于 ${dateLabel(data.updatedAt)} ${shTime(data.updatedAt)}`
      : '';
    render();
  } catch (err) {
    updatedEl.textContent = '加载失败';
    emptyEl.hidden = false;
    emptyEl.textContent = '新闻数据加载失败：' + err.message;
  }
}

document.getElementById('refresh').addEventListener('click', load);
load();
setInterval(load, 5 * 60 * 1000);
