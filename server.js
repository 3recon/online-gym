'use strict';
// 온라인 헬스장 서버 — 의존성 없음. 정적 파일 + SSE(실시간 피드/접속자/랭킹)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { SHOUTS, EXERCISES, isValidName, isValidWeight } = require('./public/shared.js');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'state.json');
const FEED_MAX = 40;
const BOARD_MAX = 10;
const KEEP_MAX = 200;
const LIFT_STALE_MS = 30000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const dayKST = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

// ---------- 상태 ----------
// boards[운동].today / .allTime: id -> { name, best, at }
const emptyBoards = () => Object.fromEntries(EXERCISES.map((ex) => [ex, { today: {}, allTime: {} }]));
let saved = { day: dayKST(), todayVolume: 0, todayLifts: 0, boards: emptyBoards() };
try {
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  // 예전 형식(운동 구분 없음)은 스쿼트 기록으로 옮김
  if (raw.today || raw.allTime) {
    raw.boards = emptyBoards();
    raw.boards.squat = { today: raw.today || {}, allTime: raw.allTime || {} };
    delete raw.today;
    delete raw.allTime;
  }
  saved = Object.assign(saved, raw);
  for (const ex of EXERCISES) saved.boards[ex] = saved.boards[ex] || { today: {}, allTime: {} };
} catch { /* 첫 실행 */ }
let dirty = false;

const feed = [];
const clients = new Map(); // id -> { name, conns: Set<res>, lifting: {weight, since} | null, last: {} }

function rollDay() {
  const d = dayKST();
  if (saved.day === d) return;
  saved.day = d;
  saved.todayVolume = 0;
  saved.todayLifts = 0;
  for (const ex of EXERCISES) saved.boards[ex].today = {};
  dirty = true;
}

function top(table) {
  return Object.values(table)
    .sort((a, b) => b.best - a.best || a.at - b.at)
    .slice(0, BOARD_MAX)
    .map(({ name, best }) => ({ name, best }));
}

function prune(table) {
  const ids = Object.keys(table);
  if (ids.length <= KEEP_MAX) return;
  ids.sort((a, b) => table[b].best - table[a].best).slice(KEEP_MAX).forEach((id) => delete table[id]);
}

function recordBest(table, id, name, weight) {
  const cur = table[id];
  if (cur && cur.best >= weight) return false;
  table[id] = { name, best: weight, at: Date.now() };
  prune(table);
  return true;
}

function boardPayload() {
  rollDay();
  const boards = {};
  for (const ex of EXERCISES) boards[ex] = { today: top(saved.boards[ex].today), allTime: top(saved.boards[ex].allTime) };
  return { boards, todayVolume: saved.todayVolume, todayLifts: saved.todayLifts };
}

function presencePayload() {
  const now = Date.now();
  const lifters = [];
  for (const c of clients.values()) {
    if (c.lifting && now - c.lifting.since > LIFT_STALE_MS) c.lifting = null;
    if (c.lifting) lifters.push({ name: c.name, weight: c.lifting.weight, exercise: c.lifting.exercise });
  }
  return { online: clients.size, lifters };
}

// ---------- SSE ----------
function send(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function broadcast(event, data) {
  for (const c of clients.values()) for (const res of c.conns) send(res, event, data);
}

let feedSeq = 0;
function pushFeed(item) {
  item.seq = ++feedSeq;
  item.at = Date.now();
  feed.push(item);
  if (feed.length > FEED_MAX) feed.shift();
  broadcast('feed', item);
}

function openStream(req, res, url) {
  const id = String(url.searchParams.get('id') || '');
  const name = String(url.searchParams.get('name') || '');
  if (!/^[a-z0-9]{8,32}$/i.test(id) || !isValidName(name)) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('bad id or name');
  }
  req.socket.setTimeout(0);
  req.socket.setNoDelay(true);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 3000\n\n');

  let c = clients.get(id);
  const isNew = !c;
  if (!c) {
    c = { name, conns: new Set(), lifting: null, last: {} };
    clients.set(id, c);
  }
  c.name = name;
  c.conns.add(res);

  send(res, 'init', Object.assign(presencePayload(), { feed, board: boardPayload() }));
  if (isNew) broadcast('presence', presencePayload());

  res.on('close', () => {
    c.conns.delete(res);
    if (c.conns.size === 0 && clients.get(id) === c) {
      clients.delete(id);
      broadcast('presence', presencePayload());
    }
  });
}

// ---------- 이벤트 ----------
function allow(c, key, ms) {
  const now = Date.now();
  if (now - (c.last[key] || 0) < ms) return false;
  c.last[key] = now;
  return true;
}

function handleEvent(msg) {
  const id = String(msg.id || '');
  const c = clients.get(id);
  if (!c) return 404; // 스트림이 열려 있는 사람만
  rollDay();
  const ex = EXERCISES.includes(msg.exercise) ? msg.exercise : 'squat';

  switch (msg.type) {
    case 'start': {
      if (!isValidWeight(msg.weight)) return 400;
      if (!allow(c, 'start', 800)) return 429;
      c.lifting = { weight: msg.weight, exercise: ex, since: Date.now() };
      broadcast('presence', presencePayload());
      return 204;
    }
    case 'result': {
      if (!isValidWeight(msg.weight) || typeof msg.success !== 'boolean') return 400;
      if (!allow(c, 'result', 1200)) return 429;
      c.lifting = null;
      const w = msg.weight;
      if (msg.success) {
        saved.todayVolume += w;
        saved.todayLifts += 1;
        recordBest(saved.boards[ex].today, id, c.name, w);
        recordBest(saved.boards[ex].allTime, id, c.name, w);
        dirty = true;
      }
      const item = { kind: 'lift', exercise: ex, name: c.name, weight: w, success: msg.success, pr: msg.success && msg.pr === true };
      if (msg.success && Number.isInteger(msg.cpm) && msg.cpm > 0 && msg.cpm < 3000) item.cpm = msg.cpm; // 타/분
      pushFeed(item);
      broadcast('presence', presencePayload());
      if (msg.success) broadcast('board', boardPayload());
      return 204;
    }
    case 'shout': {
      const i = msg.idx;
      if (!Number.isInteger(i) || i < 0 || i >= SHOUTS.length) return 400;
      if (!allow(c, 'shout', 1500)) return 429;
      pushFeed({ kind: 'shout', name: c.name, text: SHOUTS[i] });
      return 204;
    }
    default:
      return 400;
  }
}

function readJson(req, res) {
  let body = '';
  let tooBig = false;
  req.setEncoding('utf8');
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 2048) { tooBig = true; req.destroy(); }
  });
  req.on('end', () => {
    if (tooBig) return;
    let status = 400;
    try { status = handleEvent(JSON.parse(body)); } catch { /* 잘못된 JSON */ }
    res.writeHead(status);
    res.end();
  });
}

// ---------- 정적 파일 ----------
function serveStatic(req, res, pathname) {
  let rel;
  try { rel = decodeURIComponent(pathname); } catch { res.writeHead(400); return res.end(); }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 — 이 기구는 없어요');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(req.method === 'HEAD' ? undefined : buf);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/stream' && req.method === 'GET') return openStream(req, res, url);
  if (url.pathname === '/api/event' && req.method === 'POST') return readJson(req, res);
  if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res, url.pathname);
  res.writeHead(405);
  res.end();
});

// 프록시가 SSE를 끊지 않게 주기적으로 핑
setInterval(() => {
  for (const c of clients.values()) for (const res of c.conns) res.write(': ping\n\n');
}, 20000);

function persist() {
  if (!dirty) return;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE + '.tmp', JSON.stringify(saved));
    fs.renameSync(DATA_FILE + '.tmp', DATA_FILE);
    dirty = false;
  } catch (e) {
    console.error('기록 저장 실패:', e.message);
  }
}
setInterval(persist, 15000);

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { persist(); process.exit(0); });
}

server.listen(PORT, () => {
  console.log(`🏋️  온라인 헬스장 영업 중 → http://localhost:${PORT}`);
});
