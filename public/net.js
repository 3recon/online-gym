/* 온라인 헬스장 — 서버 연결
 * 1) config.js에 Supabase가 있으면 Supabase (배포용)
 * 2) 없으면 같은 주소의 node 서버(npm start, 로컬 테스트용)
 * 3) 둘 다 없으면 혼자 연습 모드
 * 어느 쪽이든 app.js에는 같은 이벤트(status/init/presence/feed/board)로 알려줌
 */
window.GymNet = (function () {
  'use strict';
  const CFG = window.GYM_CONFIG || {};
  const SB_LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js';
  const handlers = {};
  let backend = '';
  let id = '';
  let name = '';
  let status = 'idle';
  let everOnline = false;

  function on(type, fn) { (handlers[type] || (handlers[type] = [])).push(fn); }

  function emit(type, data) {
    (handlers[type] || []).forEach((fn) => {
      try { fn(data); } catch (e) { console.error(e); }
    });
  }

  function setStatus(s) {
    if (s === status) return;
    status = s;
    emit('status', s);
  }

  function connect(_id, _name) {
    id = _id;
    name = _name;
    if (CFG.supabaseUrl && CFG.supabaseAnonKey) {
      backend = 'supabase';
      sbConnect();
    } else if (/^https?:$/.test(location.protocol) && typeof EventSource !== 'undefined') {
      backend = 'sse';
      sseOpen();
    } else {
      setStatus('offline');
    }
  }

  function post(type, data) {
    if (backend === 'supabase') sbPost(type, data || {});
    else if (backend === 'sse') ssePost(type, data || {});
  }

  function rename(n) {
    name = n;
    if (backend === 'supabase') sbTrack();
    else if (backend === 'sse' && everOnline) sseOpen(); // 스트림을 새 이름으로 다시 연다
  }

  // ===== Supabase =====
  let sb = null;
  let chan = null;
  let lifting = null;
  let boardTimer = 0;
  let firstTimer = 0;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function sbConnect() {
    setStatus('connecting');
    try {
      if (!window.supabase) await loadScript(SB_LIB);
      sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    } catch (e) {
      setStatus('offline');
      return;
    }
    // 8초 안에 못 붙으면 일단 혼자 연습 모드로 (뒤에서 계속 재시도함)
    firstTimer = setTimeout(() => { if (!everOnline) setStatus('offline'); }, 8000);

    chan = sb.channel('gym', { config: { presence: { key: id } } });
    chan.on('presence', { event: 'sync' }, () => emit('presence', sbPresence()));
    chan.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_items' }, (p) => {
      const item = toItem(p.new);
      emit('feed', item);
      if (item.kind === 'lift' && item.success) sbBoardSoon();
    });
    chan.subscribe(async (st) => {
      if (st === 'SUBSCRIBED') {
        clearTimeout(firstTimer);
        sbTrack();
        const [feed, board] = await Promise.all([sbFeed(), sbBoard()]);
        everOnline = true;
        setStatus('online');
        emit('init', Object.assign(sbPresence(), { feed, board }));
      } else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT' || st === 'CLOSED') {
        if (everOnline) setStatus('reconnecting');
      }
    });
    // 날짜가 바뀌거나 놓친 갱신이 있어도 순위가 너무 오래 묵지 않게
    setInterval(() => { if (status === 'online') sbBoardSoon(); }, 60000);
  }

  function sbTrack() {
    if (chan) chan.track({ name, lifting }).catch(() => {});
  }

  // 접속자 수 = 지금 채널에 붙어 있는 사람 수. 이름은 다른 사람이 보낸 값이라 형식 검사
  function sbPresence() {
    const state = chan ? chan.presenceState() : {};
    const lifters = [];
    for (const key in state) {
      const metas = state[key];
      const m = metas && metas[metas.length - 1];
      if (m && m.lifting && window.GymShared.isValidName(m.name)) {
        lifters.push({ name: m.name, weight: Number(m.lifting.weight), exercise: m.lifting.exercise });
      }
    }
    return { online: Object.keys(state).length, lifters };
  }

  function toItem(r) {
    const at = Date.parse(r.at);
    return {
      seq: Number(r.id),
      at: isNaN(at) ? Date.now() : at,
      kind: r.kind,
      name: r.name,
      exercise: r.exercise || undefined,
      weight: r.weight == null ? undefined : Number(r.weight),
      success: r.success,
      pr: !!r.pr,
      cpm: r.cpm || undefined,
      text: r.text || undefined,
    };
  }

  async function sbFeed() {
    const { data, error } = await sb.from('feed_items').select('*').order('id', { ascending: false }).limit(40);
    return error || !data ? [] : data.reverse().map(toItem);
  }

  async function sbBoard() {
    const { data, error } = await sb.rpc('get_board');
    return error ? null : data;
  }

  function sbBoardSoon() {
    clearTimeout(boardTimer);
    boardTimer = setTimeout(async () => {
      const b = await sbBoard();
      if (b) emit('board', b);
    }, 800);
  }

  // 기록·응원은 DB 함수(gym_event)가 검사해서 저장 → 피드는 실시간으로 다시 내려옴
  function sbPost(type, data) {
    if (!sb) return;
    if (type === 'start') { lifting = { weight: data.weight, exercise: data.exercise }; sbTrack(); }
    if (type === 'result') { lifting = null; sbTrack(); }
    const args = { p_type: type, p_player: id, p_name: name };
    if (data.exercise) args.p_exercise = data.exercise;
    if (data.weight != null) args.p_weight = data.weight;
    if (typeof data.success === 'boolean') args.p_success = data.success;
    if (data.pr) args.p_pr = true;
    if (data.cpm) args.p_cpm = data.cpm;
    if (data.idx != null) args.p_idx = data.idx;
    sb.rpc('gym_event', args).then(() => {}, () => {});
  }

  // ===== 로컬 node 서버 (SSE) =====
  let es = null;
  let retryTimer = 0;

  function sseOpen() {
    clearTimeout(retryTimer);
    if (es) es.close();
    setStatus(everOnline ? 'reconnecting' : 'connecting');
    const src = new EventSource('api/stream?id=' + encodeURIComponent(id) + '&name=' + encodeURIComponent(name));
    es = src;
    src.addEventListener('init', (e) => {
      everOnline = true;
      setStatus('online');
      emit('init', JSON.parse(e.data));
    });
    ['presence', 'feed', 'board'].forEach((type) => {
      src.addEventListener(type, (e) => emit(type, JSON.parse(e.data)));
    });
    src.onerror = () => {
      if (es !== src) return;
      if (!everOnline) {
        // 서버가 없는 정적 호스팅/파일로 열었을 때
        src.close();
        es = null;
        setStatus('offline');
        return;
      }
      setStatus('reconnecting');
      if (src.readyState === EventSource.CLOSED) retryTimer = setTimeout(sseOpen, 5000);
    };
  }

  function ssePost(type, data) {
    if (status !== 'online') return;
    fetch('api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ id, type }, data)),
    }).catch(() => {});
  }

  return {
    on, connect, post, rename,
    get status() { return status; },
    get online() { return status === 'online'; },
  };
})();
