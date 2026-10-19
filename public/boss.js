/* 온라인 헬스장 — 부장님 모드: 문서 편집기로 위장. 따라 칠 문장은 '검토 의견' 메모로 뜨고, 친 문장은 문서에 그대로 들어간다 */
window.GymBoss = (function () {
  'use strict';
  const DOC_TITLE = '주간업무보고_최종_진짜최종(3).docx - 문서 편집기';
  const REPORT = [
    '1. 금주 주요 추진 실적',
    '  가. 하체 기반 경쟁력 강화 TF 운영',
    '    - 스쿼트 중량 목표 대비 달성률 점검 및 미달 원인 분석(코어 브레이싱 미흡)',
    '    - 무릎-발끝 정렬 프로세스 표준화 추진, 유관 부서(대퇴사두근팀) 협조 요청 완료',
    '  나. 단백질 공급망 안정화',
    '    - 닭가슴살 재고 현황 파악 및 분기별 수급 계획 수립',
    '    - 셰이크 일 3회 섭취 체계 정착, 유당불내증 리스크 별도 관리',
    '',
    '2. 차주 추진 계획',
    '  가. 3대 500 달성을 위한 중장기 로드맵 고도화',
    '    - 1RM 대비 80% 강도 5×5 프로그램 시범 운영',
    '  나. 유관 부서 협업',
    '    - 등(광배근)팀, 어깨(삼각근)팀과 상·하체 분할 일정 조율',
    '',
    '3. 이슈 및 건의 사항',
    '    - 스쿼트 랙 내 컬 수행 사례 지속 발생, 관리 부서(관장님) 조치 필요',
    '    - 덤벨 제자리 반납률 43% 수준으로 개선 시급',
    '',
    '4. 추가 사항 (검토 의견 반영)',
    '',
  ].join('\n');

  let root, textNode, canvas, slot, commentText, commentMeta, syncEl, syncBar, countEl, sizeEl, toastBox;
  let active = false;
  let chars = 0;
  let prevTitle = '';
  let lastSync = '';
  let lastComment = '';
  let opts = {};

  function h(tag, cls, text, parent) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }

  function init(o) {
    opts = o || {};
    root = document.getElementById('boss');
    root.innerHTML = '';

    const bar = h('div', 'b-titlebar', null, root);
    h('span', 'b-appicon', '문', bar);
    h('span', 'b-title', DOC_TITLE, bar);
    const win = h('span', 'b-winbtns', null, bar);
    h('span', null, '─', win);
    h('span', null, '☐', win);
    const x = h('button', 'b-close', '✕', win);
    x.type = 'button';
    x.title = '닫기 (Esc)';
    x.addEventListener('click', () => opts.onExit && opts.onExit());

    const menu = h('div', 'b-menubar', null, root);
    ['파일', '편집', '보기', '삽입', '서식', '도구', '검토', '창', '도움말'].forEach((m) => h('span', null, m, menu));

    const tools = h('div', 'b-toolbar', null, root);
    h('span', 'b-select', '맑은 고딕 ▾', tools);
    h('span', 'b-select small', '10 ▾', tools);
    h('span', 'b-sep', null, tools);
    ['가', '가', '가'].forEach((t, i) => h('span', 'b-tool b-t' + i, t, tools));
    h('span', 'b-sep', null, tools);
    ['≡', '≣', '☰', '⋮≡'].forEach((t) => h('span', 'b-tool', t, tools));
    h('span', 'b-sep', null, tools);
    ['↶', '↷', '🖨', '💾'].forEach((t) => h('span', 'b-tool', t, tools));

    h('div', 'b-ruler', null, root);
    canvas = h('div', 'b-canvas', null, root);
    const page = h('div', 'b-page', null, canvas);
    h('h1', null, '주간 업무 보고', page);
    const meta = h('div', 'b-meta', null, page);
    h('span', null, '보고일: ' + new Date().toLocaleDateString('ko-KR'), meta);
    opts.whoEl = h('span', 'b-who', '', meta);
    const body = h('div', 'b-text', null, page);
    textNode = document.createTextNode(REPORT);
    body.appendChild(textNode);
    chars = REPORT.length;
    // 여기에 입력칸이 들어옴
    slot = h('div', 'b-slot', null, page);
    h('span', 'b-bullet', '    - ', slot);

    // 오른쪽 메모: 따라 칠 문장
    const side = h('div', 'b-comments', null, canvas);
    const c = h('div', 'b-comment', null, side);
    const head = h('div', 'b-c-head', null, c);
    h('span', 'b-c-avatar', '부', head);
    h('b', null, '부장님', head);
    h('span', 'b-c-time', '방금', head);
    h('div', 'b-c-body', '아래 문구 추가해 주세요.', c);
    commentText = h('div', 'b-c-quote', '', c);
    commentMeta = h('div', 'b-c-meta', '', c);

    const st = h('div', 'b-status', null, root);
    h('span', null, '페이지 1/1', st);
    countEl = h('span', null, '', st);
    sizeEl = h('span', null, '', st);
    h('span', null, '한국어', st);
    const sync = h('span', 'b-sync', null, st);
    syncBar = h('i', null, null, h('span', 'b-track', null, sync));
    syncEl = h('b', null, '모든 변경 내용이 저장됨', sync);
    updateCount();

    toastBox = h('div', 'b-toasts', null, root);
  }

  function updateCount() {
    countEl.textContent = '글자 수 ' + chars.toLocaleString('ko-KR');
  }

  function followSlot() {
    const s = slot.getBoundingClientRect();
    const v = canvas.getBoundingClientRect();
    const over = s.bottom - (v.bottom - 100);
    if (over > 0) canvas.scrollTop += over;
  }

  function show() {
    active = true;
    root.hidden = false;
    prevTitle = document.title;
    document.title = DOC_TITLE;
    if (opts.whoEl && opts.getName) opts.whoEl.textContent = '작성: ' + opts.getName();
    followSlot();
  }

  function hide() {
    active = false;
    root.hidden = true;
    document.title = prevTitle || document.title;
  }

  // 따라 칠 문장을 메모로
  function setComment(text, meta) {
    const key = text + '|' + meta;
    if (key === lastComment) return;
    lastComment = key;
    commentText.textContent = text ? `"${text}"` : '';
    commentMeta.textContent = meta || '';
  }

  // 다 친 문장은 문서 본문에 들어감
  function commit(line) {
    textNode.appendData('    - ' + line + '\n');
    chars += line.length;
    updateCount();
    followSlot();
  }

  // 스쿼트 진행 상황을 '자동 저장'으로 위장
  function status(state, h, weight) {
    let text;
    let pct = 0;
    if (state === 'push' || state === 'descend') { pct = Math.round(h * 100); text = `자동 저장 중… ${pct}%`; }
    else if (state === 'success') { pct = 100; text = '저장 완료'; }
    else if (state === 'fail') text = '저장 실패 — 다시 시도하는 중';
    else text = '모든 변경 내용이 저장됨';
    const key = text + '|' + weight;
    if (key === lastSync) return;
    lastSync = key;
    syncEl.textContent = text;
    syncBar.style.width = pct + '%';
    sizeEl.textContent = '문서 크기 ' + weight + 'KB';
  }

  function toast(title, body) {
    const t = h('div', 'b-toast', null, toastBox);
    h('b', null, title, t);
    h('span', null, body, t);
    setTimeout(() => t.classList.add('out'), 3600);
    setTimeout(() => t.remove(), 4200);
  }

  return {
    init, show, hide, setComment, commit, status, toast,
    get slot() { return slot; },
    get active() { return active; },
  };
})();
