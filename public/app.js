/* 온라인 헬스장 — 게임 로직 (타자연습: 문장을 따라 치면 한 칸씩 올라감) */
(function () {
  'use strict';
  const Shared = window.GymShared;
  const Sfx = window.GymSfx;
  const Net = window.GymNet;
  const Fig = window.GymFigure;
  const Boss = window.GymBoss;

  // ===== 튜닝 =====
  const DESCEND_MS = 1100;
  const SUCCESS_MS = 1800;
  const FAIL_MS = 2800;
  const EXTRA_TIME = 4;             // 제한 시간 = 전체 타수 ÷ 목표 타속 + 여유(초)
  const CHEER_TIME = 1.5;           // 응원 한 번에 늘어나는 시간(초)
  const START_STRENGTH = 40;
  const SAVE_KEY = 'onlineGym.v1';

  // 무거울수록 긴 문장. 대부분 실제로 매일 치는 말이라 옆에서 보면 그냥 일하는 중
  const PHRASES = {
    // 메신저 답장
    short: [
      '넵!', '넵 확인했습니다.', '네 알겠습니다!', '확인 부탁드립니다.', '수고하셨습니다!',
      '잠시만요, 확인해 볼게요.', '회의 들어갑니다.', '오늘 재택입니다.', '점심 뭐 드실래요?',
      '넵넵 바로 할게요!', '내일 연차입니다.', '공유 감사합니다.', '반영했습니다.', '자료 보내드렸습니다.',
      '넵 바로 확인하겠습니다.', '네 좋습니다!', '오 감사합니다!', '잠깐 자리 비웁니다.', '외근 나갑니다.',
      '방금 복귀했습니다.', '커피 사 올까요?', '지금 갈게요!', '확인했어요, 감사합니다.', '좋은 아침입니다!',
      '오늘 먼저 들어가보겠습니다.', '수정했습니다.', '다시 보내드릴게요.', '거의 다 됐습니다.',
      '조금만 기다려 주세요.', '회의실 어디예요?', '링크 다시 부탁드려요.', '화면 공유하겠습니다.',
      '음소거 해제해 주세요.', '고생 많으셨습니다.', '내일 오전에 드릴게요.', '퇴근하겠습니다!',
      '하체 하고 오겠습니다.', '단백질 챙겨 먹겠습니다.', '오운완 했습니다.', '닭가슴살 먹고 오겠습니다.',
      '스쿼트 한 세트만 하고 올게요.',
    ],
    // 메일·업무 연락
    mid: [
      '첨부 파일 확인 부탁드립니다.', '검토 후 회신드리겠습니다.', '일정 조율 가능하실까요?',
      '바쁘신 와중에 회신 감사합니다.', '말씀하신 부분 반영했습니다.', '회의록 공유드립니다.',
      '금일 중으로 전달드리겠습니다.', '확인 후 다시 연락드리겠습니다.', '관련 자료 송부드립니다.',
      '오늘도 좋은 하루 보내세요!', '혹시 통화 가능하실까요?', '수정본 다시 보내드립니다.',
      '회의 일정 다시 공유드립니다.', '내일 오전 회의 참석 가능하실까요?', '요청하신 자료 첨부드립니다.',
      '확인 부탁드리며 회신 기다리겠습니다.', '말씀 주신 일정으로 진행하겠습니다.',
      '수정 사항 있으면 편하게 말씀 주세요.', '오늘 중으로 정리해서 드리겠습니다.',
      '혹시 놓친 부분 있으면 알려 주세요.', '진행 상황 공유드립니다.', '추가로 필요한 자료 있으실까요?',
      '담당자 확인 후 다시 안내드리겠습니다.', '좋은 의견 감사합니다.', '참고 부탁드립니다.',
      '다음 주 일정 확인 부탁드립니다.', '견적서 검토 부탁드립니다.', '내부 검토 후 회신드리겠습니다.',
      '오늘 회의 수고 많으셨습니다.', '편하신 시간 알려 주시면 맞추겠습니다.',
      '기존 일정에서 하루 연기하겠습니다.', '최종본으로 다시 전달드립니다.', '늦은 회신 죄송합니다.',
      '문의 주셔서 감사합니다.',
      '금일 하체 운동 결과 보고드립니다.', '스쿼트 일정 공유드립니다.', '단백질 수급 현황 공유드립니다.',
      '하체 일정 확인 부탁드립니다.', '관장님께 확인 후 회신드리겠습니다.',
    ],
    // 보고서·공식 메일
    long: [
      '금주 주요 업무 진행 현황을 아래와 같이 보고드립니다.',
      '관련 부서와 협의하여 차주까지 완료하도록 하겠습니다.',
      '말씀하신 내용 반영하여 수정본 다시 송부드립니다.',
      '검토하신 후 의견 주시면 최대한 빠르게 반영하겠습니다.',
      '일정상 어려움이 있어 마감 기한 조정을 요청드립니다.',
      '회의 내용 정리해서 오늘 퇴근 전까지 공유드리겠습니다.',
      '바쁘시겠지만 금일 중으로 결재 부탁드립니다.',
      '불편을 드려 죄송합니다. 빠르게 확인 후 조치하겠습니다.',
      '요청하신 자료는 첨부 파일로 송부드리오니 확인 부탁드립니다.',
      '회의 결과를 아래와 같이 정리하여 공유드립니다.',
      '현재 진행 상황을 고려하여 일정을 일부 조정하고자 합니다.',
      '추가로 궁금하신 점이 있으시면 언제든지 연락 주시기 바랍니다.',
      '내부 검토 결과 일부 수정이 필요하여 다시 전달드립니다.',
      '말씀하신 일정에 맞춰 차질 없이 진행하도록 하겠습니다.',
      '담당자 부재로 회신이 늦어진 점 양해 부탁드립니다.',
      '이번 분기 목표 대비 실적을 아래와 같이 보고드립니다.',
      '관련 내용 확인하시고 의견 주시면 반영하도록 하겠습니다.',
      '예산 집행 내역을 정리하여 첨부드리오니 검토 부탁드립니다.',
      '다음 주 월요일까지 최종안을 공유드리도록 하겠습니다.',
      '프로젝트 진행 중 발생한 이슈를 아래와 같이 공유드립니다.',
      '항상 협조해 주셔서 진심으로 감사드립니다.',
      '원활한 진행을 위해 사전에 일정 공유 부탁드립니다.',
      '검토 결과에 따라 후속 조치를 진행하도록 하겠습니다.',
      '하체 강화 관련 중장기 계획을 아래와 같이 보고드립니다.',
      '근손실 방지를 위해 금일 정시 퇴근하겠습니다.',
      '3대 500 달성을 위한 분기별 추진 계획을 보고드립니다.',
      '스쿼트 중량 목표 대비 달성률을 아래와 같이 보고드립니다.',
      '하체 운동 일정 관계로 금일 회의 참석이 어렵습니다.',
    ],
  };

  const SUCCESS_LINES = ['성공', '가볍네', '들었다', '라이트웨잇', '하체 +1'];
  const FAIL_LINES = ['깔림', '깔렸다…', '중력 승', '안전바가 살렸다'];
  const NPCS = [
    {
      name: '관장님', lift: [140, 200],
      ok: ['오 좀 하네', '자세 괜찮다', '그건 이제 웜업이지?'],
      pr: ['오 기록이네 축하'],
      fail: ['안전바 있잖아 괜찮아', '한 세트 쉬고 다시'],
    },
    {
      name: 'PT쌤', lift: [100, 140],
      ok: ['호흡 좋아요', '타자 빠르시네요~'],
      pr: ['회원님 PT 연장하시죠ㅎㅎ'],
      fail: ['오타 조심~', '무게 좀 빼고 가요'],
    },
    {
      name: '새벽반 아저씨', lift: [160, 220],
      ok: ['젊은 사람이 잘하네'],
      pr: ['허허 대단하네'],
      fail: ['허리 조심해요'],
    },
  ];
  // 운동별 설정
  //  factor: 같은 근력으로 들 수 있는 무게 배율 (데드 > 스쿼트 > 벤치)
  //  sens:   무게에 얼마나 민감한지. 1보다 크면 조금만 무거워져도 확 어려워짐 (벤치)
  //  steps:  무게 버튼 단위, autoInc: 성공하면 올릴 무게 기본값
  const EX = {
    squat: {
      name: '스쿼트', short: '스쿼트', factor: 1, sens: 1, start: 40, steps: [-10, -5, 5, 10], autoInc: 5,
      go: '올려!!', fail: FAIL_LINES, failWord: '깔림', approve: '하체 강화 추진 건',
    },
    deadlift: {
      name: '데드리프트', short: '데드', factor: 1.25, sens: 1, start: 50, steps: [-10, -5, 5, 10], autoInc: 5,
      go: '당겨!!', fail: ['허리 삐끗', '바닥이랑 한 몸', '안 뜬다…', '중력 승'], failWord: '실패', approve: '후면 사슬 강화 건',
    },
    bench: {
      name: '벤치프레스', short: '벤치', factor: 0.75, sens: 1.8, start: 30, steps: [-5, -2.5, 2.5, 5], autoInc: 2.5,
      go: '밀어!!', fail: ['가슴에 깔림', '봉이 안 올라가요', '스파터 어디 갔어', '중력 승'], failWord: '깔림', approve: '상체 역량 강화 건',
    },
  };
  const NOTES = [
    '덤벨 제자리에!!', '랙에서 컬 금지', '샤워실 온수 고장 (수리 요청함)', '기구 쓰고 닦아주세요',
    '수건은 1인 1장', '음악 볼륨 건들지 마세요', '락커 열쇠 반납',
  ];
  const GYM_ICON = 'data:image/svg+xml,' + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='86'>🏋️</text></svg>");
  const DOC_ICON = 'data:image/svg+xml,' + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect x='3' y='2' width='26' height='28' rx='3' fill='#2f62b8'/><path d='M8 10h16M8 15h16M8 20h11' stroke='#fff' stroke-width='2.4' stroke-linecap='round'/></svg>");
  const CONFETTI = ['#cf3b2a', '#2e62bf', '#e2b01c', '#2f8f4e', '#f1efe8'];

  // ===== 유틸 =====
  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const fmt = (n) => (Math.round(n * 100) / 100).toLocaleString('ko-KR');
  const localDay = () => new Date().toLocaleDateString('sv');
  const hhmm = (t) => new Date(t).toTimeString().slice(0, 5);
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function h(tag, cls, text, parent) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  function setText(el, txt) {
    if (el._t === txt) return;
    el._t = txt;
    el.textContent = txt;
  }

  function rid() {
    const a = new Uint8Array(14);
    crypto.getRandomValues(a);
    return Array.from(a, (b) => (b % 36).toString(36)).join('');
  }

  // ===== 한글 자모 (타수 계산, 조합 중인 글자 판정) =====
  const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅗㅏ', 'ㅗㅐ', 'ㅗㅣ', 'ㅛ', 'ㅜ', 'ㅜㅓ', 'ㅜㅔ', 'ㅜㅣ', 'ㅠ', 'ㅡ', 'ㅡㅣ', 'ㅣ'];
  const JONG = ['', 'ㄱ', 'ㄲ', 'ㄱㅅ', 'ㄴ', 'ㄴㅈ', 'ㄴㅎ', 'ㄷ', 'ㄹ', 'ㄹㄱ', 'ㄹㅁ', 'ㄹㅂ', 'ㄹㅅ', 'ㄹㅌ', 'ㄹㅍ', 'ㄹㅎ', 'ㅁ', 'ㅂ', 'ㅂㅅ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  const COMPAT = { 'ㅘ': 'ㅗㅏ', 'ㅙ': 'ㅗㅐ', 'ㅚ': 'ㅗㅣ', 'ㅝ': 'ㅜㅓ', 'ㅞ': 'ㅜㅔ', 'ㅟ': 'ㅜㅣ', 'ㅢ': 'ㅡㅣ', 'ㄳ': 'ㄱㅅ', 'ㄵ': 'ㄴㅈ', 'ㄶ': 'ㄴㅎ', 'ㄺ': 'ㄹㄱ', 'ㄻ': 'ㄹㅁ', 'ㄼ': 'ㄹㅂ', 'ㄽ': 'ㄹㅅ', 'ㄾ': 'ㄹㅌ', 'ㄿ': 'ㄹㅍ', 'ㅀ': 'ㄹㅎ', 'ㅄ': 'ㅂㅅ' };

  function jamo(s) {
    let out = '';
    for (const ch of s) {
      const c = ch.charCodeAt(0) - 0xac00;
      if (c >= 0 && c < 11172) out += CHO[Math.floor(c / 588)] + JUNG[Math.floor((c % 588) / 28)] + JONG[c % 28];
      else out += COMPAT[ch] || ch;
    }
    return out;
  }

  // 타수 = 키 누른 횟수 (두벌식 기준, 쌍자음은 한 번으로)
  const strokesOf = (s) => jamo(s).length;
  const normalize = (s) => s.replace(/\s+/g, ' ').trim();
  const stripEnd = (s) => s.replace(/[.!?~,]+$/, '');

  // ===== 내 기록 (localStorage) =====
  function load() {
    const def = {
      id: rid(), name: Shared.randomName(), strength: START_STRENGTH, volume: 0,
      success: 0, fail: 0, taps: 0, todayTaps: 0, day: localDay(), last: Date.now(),
      ex: 'squat', weights: {}, prs: {}, autoIncs: {}, sound: false, best: [], bestCpm: 0,
    };
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { /* 저장소 막힘 */ }
    const p = Object.assign(def, raw && typeof raw === 'object' ? raw : {});
    // 예전 기록(운동 구분 없음)은 스쿼트 기록으로
    if (Shared.isValidWeight(p.weight) && !p.weights.squat) p.weights.squat = p.weight;
    if (p.pr && !p.prs.squat) p.prs.squat = p.pr;
    if (typeof p.autoInc === 'number' && p.autoIncs.squat == null) p.autoIncs.squat = p.autoIncs.deadlift = p.autoInc;
    delete p.weight;
    delete p.pr;
    delete p.autoInc;
    if (!Shared.isValidName(p.name)) p.name = Shared.randomName();
    if (!/^[a-z0-9]{8,32}$/.test(p.id)) p.id = rid();
    if (!EX[p.ex]) p.ex = 'squat';
    for (const ex in EX) {
      if (!Shared.isValidWeight(p.weights[ex])) p.weights[ex] = EX[ex].start;
      if (typeof p.prs[ex] !== 'number') p.prs[ex] = 0;
      if (typeof p.autoIncs[ex] !== 'number') p.autoIncs[ex] = EX[ex].autoInc;
    }
    p.best = Array.isArray(p.best) ? p.best.map((b) => Object.assign({ ex: 'squat' }, b)) : [];
    // P.weight / P.pr 은 지금 고른 운동의 값
    Object.defineProperty(p, 'weight', { get() { return this.weights[this.ex]; }, set(v) { this.weights[this.ex] = v; } });
    Object.defineProperty(p, 'pr', { get() { return this.prs[this.ex]; }, set(v) { this.prs[this.ex] = v; } });
    return p;
  }

  const P = load();
  let dirty = false;

  function save() {
    P.last = Date.now();
    dirty = false;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(P)); } catch { /* 무시 */ }
  }

  // 날짜가 바뀌면 오늘 타수 초기화, 오래 안 오면 근손실
  let welcomeNote = '';
  (function rollover() {
    if (P.day !== localDay()) { P.day = localDay(); P.todayTaps = 0; }
    const days = Math.floor((Date.now() - P.last) / 864e5);
    if (P.success > 0 && days >= 2 && P.strength > START_STRENGTH + 5) {
      const loss = Math.min(0.08, days * 0.01);
      P.strength = Math.max(START_STRENGTH, P.strength * (1 - loss));
      welcomeNote = `${days}일 만에 왔더니 근력이 ${Math.round(loss * 100)}% 빠졌다`;
    }
  })();

  // ===== 세트 구성 =====
  // 근력 대비 무거울수록: 문장 수↑, 문장 길이↑, 목표 타속↑
  // 근력 대비 무게 비율. 벤치는 sens 제곱이라 같은 증량에도 난이도가 훨씬 가파르게 오름
  const relOf = (W) => Math.pow(W / (P.strength * EX[P.ex].factor), EX[P.ex].sens);

  function liftParams(W) {
    const rel = relOf(W);
    return {
      N: clamp(Math.round(1 + rel), 2, 5),
      tier: rel < 1.1 ? 'short' : rel < 1.8 ? 'mid' : 'long',
      cpm: Math.round(clamp(90 + 110 * rel, 120, 700) / 10) * 10,
    };
  }

  let lastLines = [];
  function makePlan(W) {
    const p = liftParams(W);
    let pool = PHRASES[p.tier].filter((l) => !lastLines.includes(l));
    const lines = [];
    while (lines.length < p.N) {
      if (!pool.length) pool = PHRASES[p.tier].filter((l) => !lines.includes(l));
      lines.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    const strokes = lines.reduce((s, l) => s + strokesOf(l), 0);
    return Object.assign(p, { W, lines, strokes, T: strokes / (p.cpm / 60) + EXTRA_TIME });
  }

  function difficulty(plan) {
    let label = '타자왕 전용';
    if (plan.cpm <= 200) label = '여유';
    else if (plan.cpm <= 300) label = '보통';
    else if (plan.cpm <= 400) label = '빠듯';
    else if (plan.cpm <= 500) label = '손가락 불남';
    return `${plan.N}문장 · 분당 ${plan.cpm}타면 들 수 있음 (${label})`;
  }

  // ===== 게임 상태 =====
  let nextPlan = makePlan(P.weight);
  const G = {
    state: 'rack', since: performance.now(), weight: P.weight,
    h: 0, d: 0, c: 0, whipAt: -1e9, whipAmp: 0,
    plan: nextPlan, idx: 0, startAt: 0, left: 0, total: 1, doneStrokes: 0, cpm: 0,
  };
  let streakFail = 0;
  let dShown = 0;
  let tapsAt = 0;
  let lastSubmitAt = 0;
  let pendingEnter = false;

  const lifting = () => G.state === 'descend' || G.state === 'push';
  const curLine = () => G.plan.lines[G.idx] || '';

  // ===== DOM =====
  const stage = $('#stage');
  const fx = $('#fx');
  const sayEl = $('#say');
  const bubbles = $('#bubbles');
  const feedEl = $('#feed');
  const soundBtn = $('#btn-sound');
  const shoutsEl = $('#shouts');
  const autoSel = $('#auto-inc');
  const input = $('#type-input');
  const typing = $('#typing');
  const typeSlot = $('#type-slot');
  const ui = {
    prog: $('#prog-fill'), timeFill: $('#time-fill'),
    target: $('#type-target'), count: $('#type-count'), meta: $('#type-meta'),
    wNow: $('#w-now'), need: $('#need'), net: $('#net'), feedNote: $('#feed-note'),
    rank: $('#rank'), rankTitle: $('#rank-title'), tabs: $('#tabs'), total: $('#total'),
    meName: $('#me-name'), meStats: $('#me-stats'),
    clockH: $('#clock-h'), clockM: $('#clock-m'),
  };

  // 근력 대비 무거울수록 많이 성장. 가벼운 무게 반복으로는 거의 안 큼
  function gainFor(W) {
    const rel = W / (P.strength * EX[P.ex].factor);
    const intensity = clamp((rel - 0.6) / 0.4, 0, 2.5);
    return 1.6 * intensity * (100 / (P.strength + 60));
  }

  // ===== 연출 =====
  function say(text, kind) {
    sayEl.className = 'say';
    void sayEl.offsetWidth;
    sayEl.textContent = text;
    sayEl.className = 'say show k-' + (kind || 'info');
  }

  function fxSpan(cls, text) {
    const s = h('span', cls, text, fx);
    s.addEventListener('animationend', () => s.remove());
    return s;
  }

  function judgeFx(text, kind) {
    fx.querySelectorAll('.judge').forEach((j) => j.remove());
    fxSpan('judge k-' + kind, text);
  }

  function shakeTyping() {
    typing.classList.remove('shake');
    void typing.offsetWidth;
    typing.classList.add('shake');
  }

  function bubble(name, text) {
    const b = h('div', 'bubble', null, bubbles);
    h('b', null, name, b);
    h('span', null, text, b);
    setTimeout(() => b.classList.add('out'), 2400);
    setTimeout(() => b.remove(), 2900);
    while (bubbles.childElementCount > 3) bubbles.firstElementChild.remove();
  }

  function confetti() {
    const n = reduceMotion ? 8 : 30;
    for (let i = 0; i < n; i++) {
      const s = fxSpan('confetti', '');
      s.style.left = Math.random() * 100 + '%';
      s.style.animationDelay = (Math.random() * 0.4).toFixed(2) + 's';
      s.style.setProperty('--c', pick(CONFETTI));
      s.style.setProperty('--x', (Math.random() * 140 - 70).toFixed(0) + 'px');
      s.style.setProperty('--r', (Math.random() * 720 - 360).toFixed(0) + 'deg');
    }
  }

  function ambulance() {
    const s = fxSpan('ambulance', '');
    h('span', 'siren', '삐뽀삐뽀', s);
    h('span', 'car', '🚑', s);
  }

  function updateClock() {
    const d = new Date();
    const m = d.getMinutes() + d.getSeconds() / 60;
    const hr = (d.getHours() % 12) + m / 60;
    ui.clockM.setAttribute('transform', `rotate(${m * 6} 20 20)`);
    ui.clockH.setAttribute('transform', `rotate(${hr * 30} 20 20)`);
  }

  // ===== 타자 화면 =====
  // 글자별로: 맞음 / 틀림 / 조합 중 / 아직
  function paintTarget(target, typed) {
    ui.target.innerHTML = '';
    const t = [...target];
    const y = [...typed];
    t.forEach((ch, i) => {
      let cls = '';
      if (i < y.length) {
        if (y[i] === ch) cls = 'ok';
        else if (i === y.length - 1 && jamo(target.slice(i)).startsWith(jamo(y[i]))) cls = 'cur';
        else cls = 'bad';
      } else if (i === y.length) cls = 'next';
      h('span', cls, ch, ui.target);
    });
    if (y.length > t.length) h('span', 'bad extra', y.slice(t.length).join(''), ui.target);
  }

  // 지금 줄에서 앞에서부터 맞게 친 타수
  function correctPrefixStrokes(target, typed) {
    let n = 0;
    const t = [...target];
    const y = [...typed];
    for (let i = 0; i < y.length && i < t.length; i++) {
      if (y[i] !== t[i]) break;
      n += strokesOf(t[i]);
    }
    return n;
  }

  function renderTyping() {
    let target;
    if (lifting()) {
      target = curLine();
      setText(ui.count, `${G.idx + 1} / ${G.plan.N}번째 문장`);
      paintTarget(target, input.value);
    } else if (G.state === 'rack') {
      target = nextPlan.lines[0];
      setText(ui.count, '첫 문장 — 치기 시작하면 바로 들어요');
      ui.target.textContent = target;
      ui.target.className = 'type-target idle';
    } else {
      target = '';
      setText(ui.count, G.state === 'success' ? '성공' : '깔림');
      ui.target.textContent = G.state === 'success' ? `${fmt(G.weight)}kg 성공 · 분당 ${G.cpm}타` : '시간 초과… 랙 정리 중';
      ui.target.className = 'type-target idle';
    }
    if (lifting()) ui.target.className = 'type-target';
    input.readOnly = G.state === 'success' || G.state === 'fail';
    if (Boss.active) Boss.setComment(target, lifting() ? `${G.idx + 1}/${G.plan.N}` : '');
  }

  function completeLine() {
    lastSubmitAt = performance.now();
    const line = curLine();
    G.doneStrokes += strokesOf(line);
    if (Boss.active) Boss.commit(line);
    G.idx += 1;
    G.h = G.idx / G.plan.N;
    input.value = '';
    Sfx.hit(true);
    if (G.idx === G.plan.N - 1) say('마지막 한 줄!', 'warn');
    else if (G.idx < G.plan.N) judgeFx(pick(['좋아', '오케이', '한 칸 더']), 'hit');
    renderTyping();
  }

  // Enter로 넘길 때: 끝의 마침표·느낌표는 빠져도 봐줌
  function submitLine() {
    if (!lifting() || performance.now() - lastSubmitAt < 150) return;
    const typed = normalize(input.value);
    if (!typed) return;
    const target = normalize(curLine());
    if (typed === target || stripEnd(typed) === stripEnd(target)) {
      completeLine();
    } else {
      judgeFx('오타!', 'miss');
      Sfx.miss();
      shakeTyping();
    }
  }

  // ===== 피드 & 순위 =====
  function addFeed(item) {
    const li = document.createElement('li');
    if (item.me) li.classList.add('me');
    if (item.srv) li.classList.add('srv');
    if (item.kind === 'lift' && !item.success) li.classList.add('bad');
    h('time', null, hhmm(item.at || Date.now()), li);
    if (item.kind === 'note') {
      h('span', 'note', item.text, li);
    } else if (item.kind === 'lift') {
      h('b', null, item.name, li);
      const ex = EX[item.exercise] || EX.squat;
      let txt = ` ${ex.name} ${fmt(item.weight)}kg ` + (item.success ? '성공' : ex.failWord);
      if (item.success && item.cpm) txt += ` · ${fmt(item.cpm)}타`;
      if (item.pr) txt += ' · 최고 기록';
      h('span', 'txt', txt, li);
    } else {
      h('b', null, item.name, li);
      h('span', 'txt', ': ' + item.text, li);
    }
    feedEl.prepend(li);
    while (feedEl.childElementCount > 60) feedEl.lastElementChild.remove();
  }

  let board = null;
  let online = 0;
  let lifters = [];
  let tab = 'today';

  function renderRank() {
    ui.rank.innerHTML = '';
    let rows;
    let empty;
    if (Net.online) {
      setText(ui.rankTitle, `순위 · ${EX[P.ex].name}`);
      ui.tabs.hidden = false;
      const b = board && board.boards && board.boards[P.ex];
      const src = b ? (tab === 'today' ? b.today : b.allTime) : [];
      rows = src.map((r) => ({ who: r.name, kg: r.best, me: r.name === P.name }));
      empty = tab === 'today' ? '오늘은 아직 아무도 안 들었어요' : '아직 기록이 없어요';
      setText(ui.total, board && board.todayLifts ? `오늘 다 같이 든 무게 ${fmt(board.todayVolume)}kg (${fmt(board.todayLifts)}번)` : '');
    } else {
      setText(ui.rankTitle, `내 최고 기록 · ${EX[P.ex].name}`);
      ui.tabs.hidden = true;
      rows = P.best.filter((b) => b.ex === P.ex).slice(0, 8).map((b) => ({
        who: new Date(b.at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) + ' ' + hhmm(b.at),
        kg: b.w,
      }));
      empty = '아직 성공한 기록이 없어요';
      setText(ui.total, '');
    }
    if (!rows.length) {
      h('li', 'empty', empty, ui.rank);
      return;
    }
    rows.forEach((r, i) => {
      const li = h('li', r.me ? 'me' : '', null, ui.rank);
      h('span', 'pos', String(i + 1), li);
      h('span', 'who', r.who, li);
      h('span', 'kg', fmt(r.kg) + 'kg', li);
    });
  }

  // 운동별로 상위 10개씩만 보관
  function addBest(W) {
    P.best.push({ w: W, at: Date.now(), ex: P.ex });
    P.best.sort((a, b) => b.w - a.w || a.at - b.at);
    const n = {};
    P.best = P.best.filter((b) => (n[b.ex] = (n[b.ex] || 0) + 1) <= 10);
  }

  function renderNet() {
    const s = Net.status;
    ui.net.className = 'net ' + s;
    if (s === 'online') setText(ui.net, `접속 ${fmt(online)}명`);
    else if (s === 'reconnecting') setText(ui.net, '재연결 중');
    else if (s === 'offline') setText(ui.net, '혼자 연습 중');
    else setText(ui.net, '연결 중');

    if (s === 'offline') setText(ui.feedNote, '지금은 관장님이랑 둘이 운동 중');
    else if (lifters.length) {
      const names = lifters.slice(0, 3).map((l) => `${l.name}(${(EX[l.exercise] || EX.squat).short} ${fmt(l.weight)}kg)`).join(', ');
      setText(ui.feedNote, `지금 랙에: ${names}${lifters.length > 3 ? ` 외 ${lifters.length - 3}명` : ''}`);
    } else setText(ui.feedNote, '');
  }

  // ===== UI 갱신 =====
  function renderWeight() {
    setText(ui.wNow, fmt(P.weight));
    if (G.state === 'rack' && nextPlan.W !== P.weight) nextPlan = makePlan(P.weight);
    setText(ui.need, difficulty(nextPlan));
    renderTyping();
  }

  function updateStats() {
    setText(ui.meName, P.name);
    const prs = Object.keys(EX).filter((ex) => P.prs[ex]).map((ex) => `${EX[ex].short} ${fmt(P.prs[ex])}kg`);
    const parts = [
      prs.length ? `최고 ${prs.join(' / ')}` : '아직 기록 없음',
      `성공 ${fmt(P.success)}번`,
      `깔림 ${fmt(P.fail)}번`,
      `근력 ${P.strength.toFixed(1)}`,
    ];
    if (P.bestCpm) parts.push(`최고 타속 ${fmt(P.bestCpm)}타`);
    ui.meStats._base = parts.join(' · ');
    updateTaps(true);
    renderRank();
  }

  function updateTaps(force) {
    const pages = P.todayTaps / 1800;
    let t = `${ui.meStats._base}\n오늘 ${fmt(P.todayTaps)}타 쳤음`;
    if (pages >= 0.1) t += ` (보고서로 치면 ${pages.toFixed(1)}장 분량)`;
    if (force) ui.meStats._t = null;
    setText(ui.meStats, t);
  }

  function updateControls() {
    const idle = G.state === 'rack';
    document.querySelectorAll('.wbtn, .ex-tabs button').forEach((b) => { b.disabled = !idle; });
    document.querySelectorAll('.ex-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.ex === P.ex));
    // 무게 버튼 단위·자동 증량은 운동마다 다름 (벤치는 2.5kg 단위)
    document.querySelectorAll('.wbtn').forEach((b, i) => {
      const step = EX[P.ex].steps[i];
      b.dataset.dw = step;
      setText(b, (step > 0 ? '+' : '−') + Math.abs(step));
    });
    autoSel.value = String(P.autoIncs[P.ex]);
  }

  // 스쿼트 ↔ 데드리프트 (무게·최고 기록·순위는 운동별로 따로)
  function setExercise(ex) {
    if (G.state !== 'rack' || ex === P.ex || !EX[ex]) return;
    P.ex = ex;
    G.weight = P.weight;
    Fig.setExercise(ex);
    Fig.setWeight(P.weight);
    nextPlan = makePlan(P.weight);
    updateControls();
    renderWeight();
    updateStats();
    dirty = true;
  }

  // ===== 상태 전환 =====
  function setState(s, now) {
    G.state = s;
    G.since = now;
    stage.dataset.state = s;
    updateControls();
  }

  function setWeight(w) {
    P.weight = clamp(Math.round(w / 2.5) * 2.5, Shared.MIN_W, Shared.MAX_W);
    if (G.state === 'rack') {
      G.weight = P.weight;
      Fig.setWeight(P.weight);
    }
    renderWeight();
    dirty = true;
  }

  function startLift() {
    if (G.state !== 'rack') return;
    const now = performance.now();
    if (nextPlan.W !== P.weight) nextPlan = makePlan(P.weight);
    Object.assign(G, {
      plan: nextPlan, weight: P.weight, idx: 0, h: 0, c: 0, doneStrokes: 0, cpm: 0,
      startAt: now, left: nextPlan.T + DESCEND_MS / 1000, total: nextPlan.T + DESCEND_MS / 1000,
    });
    lastLines = nextPlan.lines;
    Fig.setWeight(G.weight);
    setState('descend', now);
    Sfx.clank();
    Net.post('start', { weight: G.weight, exercise: P.ex });
  }

  function liftCpm(now) {
    const min = Math.max(1 / 60, (now - G.startAt) / 60000);
    return Math.round(G.doneStrokes / min);
  }

  function succeed(now) {
    const W = G.weight;
    const isPR = W > P.pr;
    G.cpm = liftCpm(now);
    P.strength += gainFor(W);
    P.success += 1;
    P.volume += W;
    if (isPR) P.pr = W;
    if (G.cpm > P.bestCpm) P.bestCpm = G.cpm;
    addBest(W);
    streakFail = 0;
    setState('success', now);
    G.whipAt = now;
    G.whipAmp = 4 + Math.min(16, W / 25);
    if (isPR && P.success > 1) { say(`최고 기록 ${fmt(W)}kg`, 'pr'); Sfx.pr(); confetti(); }
    else { say(pick(SUCCESS_LINES), 'good'); Sfx.success(); }
    if (!Net.online) addFeed({ kind: 'lift', exercise: P.ex, name: P.name, weight: W, success: true, pr: isPR, cpm: G.cpm, me: true });
    Net.post('result', { weight: W, exercise: P.ex, success: true, pr: isPR, cpm: G.cpm });
    npcReact(isPR && P.success > 1 ? 'pr' : 'ok');
    if (Boss.active) Boss.toast('결재 알림', `[승인] ${EX[P.ex].approve} (${fmt(W)}kg)`);
    input.value = '';
    save();
    updateStats();
    renderTyping();
  }

  function fail(now) {
    const W = G.weight;
    P.strength += gainFor(W) * 0.15; // 실패해도 조금은 큼
    P.fail += 1;
    streakFail += 1;
    setState('fail', now);
    say(G.idx === G.plan.N - 1 ? '아 한 줄 남았는데' : pick(EX[P.ex].fail), 'bad');
    Sfx.fail();
    ambulance();
    if (!Net.online) addFeed({ kind: 'lift', exercise: P.ex, name: P.name, weight: W, success: false, me: true });
    Net.post('result', { weight: W, exercise: P.ex, success: false });
    npcReact('fail');
    if (Boss.active) Boss.toast('결재 알림', `[반려] ${fmt(W)}kg 건 — 사유: 기한 초과`);
    input.value = '';
    save();
    updateStats();
    renderTyping();
  }

  function rerack(now, ok) {
    setState('rack', now);
    G.h = 0;
    if (ok) {
      G.whipAt = now;
      G.whipAmp = 3 + Math.min(10, G.weight / 40);
      Sfx.clank();
      const inc = P.autoIncs[P.ex];
      if (inc > 0) P.weight = clamp(P.weight + inc, Shared.MIN_W, Shared.MAX_W);
    }
    G.weight = P.weight;
    Fig.setWeight(P.weight);
    nextPlan = makePlan(P.weight);
    renderWeight();
    if (!ok && streakFail >= 2) say('무게 좀 빼는 게…', 'info');
    dirty = true;
  }

  // ===== 입력 =====
  input.addEventListener('input', (e) => {
    if (G.state === 'rack' && input.value.trim()) startLift();
    if (!lifting()) return;
    renderTyping();
    // 마침표까지 정확히 치면 Enter 없이 바로 다음 줄
    if (!e.isComposing && normalize(input.value) === normalize(curLine())) completeLine();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') return; // 문서 전체에서 처리
    if (!e.repeat && (e.key.length === 1 || e.key === 'Process' || e.key === 'Unidentified' || e.key === 'Backspace')) {
      P.taps += 1;
      P.todayTaps += 1;
      dirty = true;
      Sfx.tick();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      // 한글 조합 중 Enter는 조합이 끝난 뒤에 처리
      if (e.isComposing || e.keyCode === 229) pendingEnter = true;
      else submitLine();
    }
  });

  input.addEventListener('compositionend', () => {
    if (!pendingEnter) return;
    pendingEnter = false;
    setTimeout(submitLine, 0);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      toggleBoss();
      return;
    }
    if (e.target === input || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target instanceof Element && e.target.closest('button, select, input, textarea, a')) return;
    // 아무 데서나 치기 시작해도 입력칸으로
    if (e.key.length === 1 || e.key === 'Process') input.focus();
  });

  stage.addEventListener('click', () => input.focus());

  // ===== 부가 기능 =====
  let soundBeforeBoss = false;
  function toggleBoss(force) {
    const on = typeof force === 'boolean' ? force : !Boss.active;
    if (on === Boss.active) return;
    if (on) {
      soundBeforeBoss = Sfx.enabled;
      Sfx.setEnabled(false);
      Boss.show();
      Boss.slot.appendChild(input);
      $('#favicon').href = DOC_ICON;
    } else {
      Boss.hide();
      typeSlot.appendChild(input);
      Sfx.setEnabled(soundBeforeBoss);
      $('#favicon').href = GYM_ICON;
    }
    renderTyping();
    input.focus();
  }

  // 다른 사람 응원 받으면 시간이 조금 늘어남
  function cheerUp() {
    if (!lifting()) return;
    G.left += CHEER_TIME;
    G.total = Math.max(G.total, G.left);
    judgeFx(`응원 +${CHEER_TIME}초`, 'hit');
  }

  let shoutReadyAt = 0;
  function shout(idx) {
    const now = performance.now();
    if (now < shoutReadyAt) return;
    shoutReadyAt = now + 1600;
    shoutsEl.classList.add('cooling');
    setTimeout(() => shoutsEl.classList.remove('cooling'), 1600);
    Sfx.shout();
    const text = Shared.SHOUTS[idx];
    if (Net.online) {
      Net.post('shout', { idx });
      return;
    }
    addFeed({ kind: 'shout', name: P.name, text, me: true });
    bubble(P.name, text);
  }

  function npcReact(kind) {
    if (kind !== 'pr' && Math.random() > 0.45) return;
    const n = pick(NPCS);
    setTimeout(() => addFeed({ kind: 'npc', name: n.name, text: pick(n[kind]) }), 800 + Math.random() * 1200);
  }

  function npcLift() {
    const n = pick(NPCS);
    const exercise = pick(Object.keys(EX));
    const w = Math.round(((n.lift[0] + Math.random() * (n.lift[1] - n.lift[0])) * EX[exercise].factor) / 5) * 5;
    const ok = Math.random() < 0.8;
    addFeed({ kind: 'lift', exercise, name: n.name, weight: w, success: ok, cpm: ok ? 180 + Math.round(Math.random() * 30) * 10 : 0 });
  }

  // 서버가 없을 때만 단골들이 가끔 운동함
  function ambient() {
    if (Net.status === 'offline') npcLift();
    setTimeout(ambient, 9000 + Math.random() * 12000);
  }

  // ===== 메인 루프 =====
  function step(now, dt) {
    const t = now - G.since;
    if (lifting()) G.left = Math.max(0, G.left - dt);
    switch (G.state) {
      case 'descend': {
        const k = Math.min(1, t / DESCEND_MS);
        G.d = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        if (k >= 1) {
          setState('push', now);
          say(EX[P.ex].go, 'info');
        }
        break;
      }
      case 'push':
        if (G.h >= 1) succeed(now);
        else if (G.left <= 0) fail(now);
        G.d = 1 - G.h;
        break;
      case 'success':
        G.d = 0;
        if (t > SUCCESS_MS) rerack(now, true);
        break;
      case 'fail':
        G.d = 1;
        G.c = Math.min(1, G.c + dt * 5);
        if (t > FAIL_MS) rerack(now, false);
        break;
      default:
        G.d = 0;
        G.c = Math.max(0, G.c - dt * 2.2);
    }
  }

  function draw(now, dt) {
    if (G.state === 'descend') dShown = G.d;
    else dShown += (G.d - dShown) * Math.min(1, dt * 6);

    const base = clamp((relOf(G.weight) - 0.3) / 1.5, 0, 1);
    let strain = 0.05;
    let face = 'calm';
    let jitter = 0;
    if (G.state === 'descend') {
      strain = 0.12 + 0.35 * base;
      face = strain > 0.4 ? 'effort' : 'calm';
      jitter = base * 0.6;
    } else if (G.state === 'push') {
      strain = clamp(0.28 + 0.4 * base + 0.4 * (1 - G.left / G.total), 0, 1);
      face = strain > 0.72 ? 'max' : 'effort';
      jitter = strain * strain * 1.6;
    } else if (G.state === 'success') {
      strain = 0.35;
      face = 'happy';
    } else if (G.state === 'fail') {
      strain = 0.6;
      face = 'dead';
    }
    if (reduceMotion) jitter *= 0.25;
    const wt = now - G.whipAt;
    const whip = wt < 1800 ? G.whipAmp * Math.sin(wt * 0.028) * Math.exp(-wt * 0.0035) : 0;
    const hold = G.state === 'push' || G.state === 'success'; // 데드리프트: 바벨을 잡고 있는지
    Fig.render({ d: dShown, c: G.c, strain, face, jitter, whip, hold, racked: G.state === 'rack' });

    hud(now);
  }

  let metaAt = 0;
  function hud(now) {
    ui.timeFill.style.width = (lifting() ? (G.left / G.total) * 100 : 0) + '%';
    const prog = lifting() ? G.h : G.state === 'success' ? 1 : 0;
    ui.prog.style.height = prog * 100 + '%';

    if (now - metaAt > 200) {
      metaAt = now;
      if (lifting()) {
        const min = Math.max(1 / 60, (now - G.startAt) / 60000);
        const live = Math.round((G.doneStrokes + correctPrefixStrokes(curLine(), input.value)) / min);
        setText(ui.meta, `남은 시간 ${Math.ceil(G.left)}초 · 지금 분당 ${live}타`);
        ui.meta.classList.toggle('low', G.left < 5);
      } else {
        setText(ui.meta, G.state === 'rack' ? `목표 분당 ${nextPlan.cpm}타` : '');
        ui.meta.classList.remove('low');
      }
    }

    if (Boss.active) Boss.status(G.state, G.h, fmt(G.weight));

    if (now - tapsAt > 300) {
      tapsAt = now;
      updateTaps();
    }
  }

  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000));
    lastT = now;
    step(now, dt);
    draw(now, dt);
    requestAnimationFrame(frame);
  }

  // ===== 초기화 =====
  Fig.mount($('#lifter'));
  Fig.setExercise(P.ex);
  Fig.setWeight(P.weight);
  Boss.init({ onExit: () => toggleBoss(false), getName: () => P.name });
  $('#favicon').href = GYM_ICON;

  // 화이트보드: 오늘 날짜 + 공지 몇 개
  const notesEl = $('#notes');
  const today = new Date();
  h('li', null, `${today.getMonth() + 1}/${today.getDate()} 하체 하는 날`, notesEl);
  NOTES.slice().sort(() => Math.random() - 0.5).slice(0, 2).forEach((n) => h('li', null, n, notesEl));
  updateClock();
  setInterval(updateClock, 15000);

  document.querySelectorAll('.wbtn').forEach((b) => {
    b.addEventListener('click', () => setWeight(P.weight + Number(b.dataset.dw)));
  });
  document.querySelectorAll('.ex-tabs button').forEach((b) => {
    b.addEventListener('click', () => setExercise(b.dataset.ex));
  });
  autoSel.addEventListener('change', () => {
    P.autoIncs[P.ex] = Number(autoSel.value);
    dirty = true;
  });
  function renderSound() {
    setText(soundBtn, P.sound ? '소리 끄기' : '소리 켜기');
  }
  soundBtn.addEventListener('click', () => {
    P.sound = !P.sound;
    Sfx.setEnabled(P.sound);
    renderSound();
    dirty = true;
  });
  $('#btn-boss').addEventListener('click', () => toggleBoss(true));
  $('#btn-reroll').addEventListener('click', () => {
    P.name = Shared.randomName();
    Net.rename(P.name);
    updateStats();
    dirty = true;
  });
  Shared.SHOUTS.forEach((text, idx) => {
    const b = h('button', null, text, shoutsEl);
    b.type = 'button';
    b.addEventListener('click', () => shout(idx));
  });
  ui.tabs.querySelectorAll('button').forEach((b) => {
    b.addEventListener('click', () => {
      tab = b.dataset.tab;
      ui.tabs.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      renderRank();
    });
  });

  // 소리는 사용자 동작 이후에만 켤 수 있음 → 첫 입력 때 복원
  if (P.sound) {
    const resume = () => {
      if (!Boss.active) Sfx.setEnabled(true);
      else soundBeforeBoss = true;
    };
    document.addEventListener('pointerdown', resume, { once: true });
    document.addEventListener('keydown', resume, { once: true });
  }
  renderSound();

  // 서버 이벤트
  let lastSeq = 0;
  function onServerFeed(item, live) {
    if (item.seq <= lastSeq) return;
    lastSeq = item.seq;
    const me = item.name === P.name;
    addFeed(Object.assign({}, item, { me, srv: true }));
    if (live && item.kind === 'shout') {
      bubble(item.name, item.text);
      if (!me) cheerUp();
    }
  }
  Net.on('status', () => { renderNet(); renderRank(); });
  Net.on('init', (data) => {
    online = data.online;
    lifters = data.lifters || [];
    board = data.board;
    feedEl.querySelectorAll('.srv').forEach((li) => li.remove());
    lastSeq = 0;
    (data.feed || []).forEach((item) => onServerFeed(item, false));
    renderNet();
    renderRank();
  });
  Net.on('presence', (p) => {
    online = p.online;
    lifters = p.lifters || [];
    renderNet();
  });
  Net.on('board', (b) => {
    board = b;
    renderRank();
  });
  Net.on('feed', (item) => onServerFeed(item, true));

  setInterval(() => { if (dirty) save(); }, 3000);
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  updateStats();
  updateControls();
  renderWeight();
  renderNet();
  Net.connect(P.id, P.name);
  setTimeout(ambient, 5000);
  if (welcomeNote) addFeed({ kind: 'note', text: welcomeNote });
  if (window.matchMedia && matchMedia('(hover: hover)').matches) input.focus();
  requestAnimationFrame(frame);
})();
