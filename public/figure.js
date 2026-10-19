/* 온라인 헬스장 — 운동하는 사람 (SVG). 캐릭터: 하체 빼먹은 헬창 (상체는 산만, 다리는 젓가락)
 * 스쿼트·데드리프트는 정면, 벤치는 위에서 비스듬히 내려다본 모습. 좌표계: 가로 0~400 중심 200, 바닥 y=372
 * 팔다리는 부품을 돌리고 늘여서 배치하고(인형 관절), 외곽선 층과 색 층을 따로 그려서 관절 이음새가 안 보임
 */
window.GymFigure = (function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const INK = '#2b2722';
  const GROUND = 372;
  const PIN_Y = 236;          // 안전바 위 바벨 중심 높이
  const HOOK_Y = 166;         // J후크 안쪽 바닥
  const POSTS = [100, 290];   // 랙 기둥 x (폭 10)
  const POST_W = 10;
  const COLLAR = [96, 304];   // 원판이 꽂히기 시작하는 위치
  const HANDS = [120, 280];       // 스쿼트: 어깨 위 넓게
  const HANDS_DL = [146, 254];    // 데드리프트: 허벅지 바깥
  const HANDS_BENCH = [120, 280]; // 벤치
  const PLATES = [
    { kg: 25, h: 96, w: 13, c: '#cf3b2a' },
    { kg: 20, h: 92, w: 12, c: '#2e62bf' },
    { kg: 15, h: 80, w: 10, c: '#e2b01c' },
    { kg: 10, h: 68, w: 9, c: '#2f8f4e' },
    { kg: 5, h: 46, w: 7, c: '#f1efe8' },
    { kg: 2.5, h: 36, w: 6, c: '#c4473c' },
    { kg: 1.25, h: 28, w: 5, c: '#b3b8bd' },
  ];

  // 캐릭터 색과 치수
  const SKIN = [220, 160, 122];
  const HOT = [226, 104, 84];
  const TANK = '#2d3138';
  const SHORTS = '#7d8590';
  const HAIR = '#2b2522';
  const BAND = '#d9432c';
  const SHOULDER_W = 54;  // 목 중심 → 어깨
  const HIP_W = 10;
  const ANKLE_W = 13;
  const ANKLE_Y = 342;
  const UPPER = 36, FORE = 32, THIGH = 46, SHIN = 46;
  const TORSO = 96;       // 목 → 엉덩이 (서 있을 때)

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const OUT = { stroke: INK, 'stroke-width': 2.4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
  const P = (d, fill, parent, extra) => el('path', Object.assign({ d, fill }, OUT, extra || {}), parent);
  const SKINP = (d, parent, extra) => el('path', Object.assign({ d, class: 'fg-skin-f' }, OUT, extra || {}), parent);
  const LINE = (d, parent, w, color, extra) => el('path', Object.assign({ d, fill: 'none', stroke: color || INK, 'stroke-width': w || 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, extra || {}), parent);

  function platesFor(W) {
    let side = Math.max(0, (W - 20) / 2);
    const out = [];
    for (const p of PLATES) {
      while (side >= p.kg - 1e-9) { out.push(p); side -= p.kg; }
    }
    return out;
  }

  // ---------- 부품 ----------
  // 끝이 둥근 테이퍼 (지역 좌표: (0,0) → (0,len))
  function taper(len, w1, w2) {
    return `M${-w1 / 2} 0L${-w2 / 2} ${len}A${w2 / 2} ${w2 / 2} 0 0 0 ${w2 / 2} ${len}L${w1 / 2} 0A${w1 / 2} ${w1 / 2} 0 0 0 ${-w1 / 2} 0Z`;
  }
  const PART = {
    upper: 'M-16 -2C-24 10 -23 26 -11 37L11 37C19 26 22 10 16 -2C8 -9 -8 -9 -16 -2Z', // 알통
    fore: taper(FORE, 21, 15),
    thigh: taper(THIGH, 10.5, 8),  // 젓가락 다리
    shin: taper(SHIN, 8, 7),
  };

  // 지역 좌표 부품을 (x1,y1)→(x2,y2)에 맞게 돌리고 늘이는 변환
  function segT(x1, y1, x2, y2, len, flip) {
    const dx = x2 - x1, dy = y2 - y1;
    const ang = (Math.atan2(-dx, dy) * 180) / Math.PI;
    const s = Math.hypot(dx, dy) / len;
    return `translate(${x1.toFixed(1)} ${y1.toFixed(1)}) rotate(${ang.toFixed(2)}) scale(${flip ? -1 : 1} ${s.toFixed(3)})`;
  }
  // 외곽선 층·색 층에 같은 부품을 하나씩 → 둘 다 같은 변환을 받음
  function limbPair(outLayer, fillLayer, d, knee) {
    const o = el('g', {}, outLayer);
    el('path', { d, fill: INK, stroke: INK, 'stroke-width': 5, 'stroke-linejoin': 'round' }, o);
    if (knee) el('circle', { r: knee + 2.5, fill: INK }, o);
    const f = el('g', {}, fillLayer);
    el('path', { d, class: 'fg-skin-f' }, f);
    if (knee) el('circle', { r: knee, class: 'fg-skin-f' }, f);
    return [o, f];
  }
  function setPair(pair, x1, y1, x2, y2, len, flip) {
    const t = segT(x1, y1, x2, y2, len, flip);
    pair[0].setAttribute('transform', t);
    pair[1].setAttribute('transform', t);
  }

  function buildHand(parent) {
    const g = el('g', {}, parent);
    SKINP('M-11 -4Q-11 -12 0 -12Q12 -12 12 -3L12 6Q12 13 4 13L-6 13Q-12 13 -12 6Z', g, { 'stroke-width': 2.2 });
    LINE('M-5 -11V-4M2 -11V-4', g, 1.4, INK, { opacity: 0.6 });
    return g;
  }

  function buildShoe(parent) {
    const g = el('g', {}, parent);
    P('M-6 -10H6V2H-6Z', '#fff', g, { 'stroke-width': 2 });
    P('M-19 12Q-19 -4 -5 -4H5Q19 -4 19 12Z', '#f2f2ee', g);
    P('M-20 11H20V16Q20 18 18 18H-18Q-20 18 -20 16Z', INK, g, { 'stroke-width': 2 });
    LINE('M-6 2H6M-5 6H5', g, 1.4);
    return g;
  }

  // 몸통: 원점 = 목 아래, 엉덩이까지 TORSO(96)
  function buildTorso(parent) {
    const g = el('g', {}, parent);
    SKINP('M-14 -16L14 -16L18 6L-18 6Z', g, { 'stroke-width': 2 });
    SKINP('M-62 16C-56 -2 -36 -6 0 -6C36 -6 56 -2 62 16L48 66L32 98L-32 98L-48 66Z', g);
    P('M-30 0L-19 0Q0 30 19 0L30 0L42 40L32 98L-32 98L-42 40Z', TANK, g);
    LINE('M-19 0Q0 30 19 0', g, 2.2);
    LINE('M-40 22Q-30 34 -16 30M40 22Q30 34 16 30', g, 1.6, INK, { opacity: 0.55 });
    const veins = LINE('M-10 -14q2 6 0 12M10 -14q-2 6 0 12', g, 1.8, '#c0392b', { opacity: 0 });
    return { g, veins };
  }
  // 반바지: 원점 = 엉덩이
  function buildShorts(parent) {
    const g = el('g', {}, parent);
    P('M-34 -8L34 -8L32 16L4 18L0 8L-4 18L-32 16Z', SHORTS, g);
    return g;
  }

  // ---------- 얼굴 ----------
  function vein(g, x, y, s) {
    s = s || 1;
    LINE(`M${x - 5 * s} ${y - 2 * s}q3 0 3 -3M${x + 5 * s} ${y - 2 * s}q-3 0 -3 -3M${x - 5 * s} ${y + 2 * s}q3 0 3 3M${x + 5 * s} ${y + 2 * s}q-3 0 -3 3`, g, 2, '#d0202f');
  }
  function eyeWhite(g, x, y, rx, ry) {
    el('ellipse', Object.assign({ cx: x, cy: y, rx, ry, fill: '#fff' }, OUT, { 'stroke-width': 1.8 }), g);
  }
  const EXPR = {
    // 평소: 거만한 반쯤 감은 눈 + 이 드러낸 씩 웃음
    calm(g) {
      LINE('M-21 -9L-5 -7M5 -7L21 -9', g, 4.2);
      eyeWhite(g, -12, 3, 6, 5); eyeWhite(g, 12, 3, 6, 5);
      el('circle', { cx: -11, cy: 4, r: 3.4, fill: '#3b2f2a' }, g);
      el('circle', { cx: 13, cy: 4, r: 3.4, fill: '#3b2f2a' }, g);
      LINE('M-19 0H-5M5 0H19', g, 2.6);
      P('M-13 18Q0 31 13 18Z', '#fff', g, { 'stroke-width': 2.2 });
      LINE('M-13 18Q0 21 13 18M-4 19V25M4 19V25', g, 1.3);
    },
    // 힘줌: 눈 가늘게, 이 악물기
    effort(g) {
      LINE('M-21 -6L-5 -11M5 -11L21 -6', g, 4.2);
      eyeWhite(g, -12, 3, 6.5, 3.2); eyeWhite(g, 12, 3, 6.5, 3.2);
      el('circle', { cx: -12, cy: 3, r: 2.4, fill: '#3b2f2a' }, g);
      el('circle', { cx: 12, cy: 3, r: 2.4, fill: '#3b2f2a' }, g);
      el('rect', Object.assign({ x: -12, y: 15, width: 24, height: 11, rx: 4, fill: '#fff' }, OUT, { 'stroke-width': 2 }), g);
      LINE('M-10 20.5H10M-4 15V26M4 15V26', g, 1.3);
    },
    // 한계: 눈 튀어나옴 + 소리 지름
    max(g) {
      LINE('M-21 -14Q-12 -19 -4 -12M4 -12Q12 -19 21 -14', g, 4.2);
      el('circle', Object.assign({ cx: -12, cy: 2, r: 8.5, fill: '#fff' }, OUT, { 'stroke-width': 2 }), g);
      el('circle', Object.assign({ cx: 12, cy: 2, r: 8.5, fill: '#fff' }, OUT, { 'stroke-width': 2 }), g);
      el('circle', { cx: -12, cy: 2, r: 2.2, fill: INK }, g);
      el('circle', { cx: 12, cy: 2, r: 2.2, fill: INK }, g);
      P('M-12 15Q0 13 12 15Q14 30 0 32Q-14 30 -12 15Z', '#7a2a1f', g, { 'stroke-width': 2.2 });
      P('M-10 16Q0 14 10 16L9 20Q0 18 -9 20Z', '#fff', g, { 'stroke-width': 1.4 });
    },
    // 성공: 눈 감고 활짝
    happy(g) {
      LINE('M-21 -12Q-13 -16 -5 -11M5 -11Q13 -16 21 -12', g, 4.2);
      LINE('M-18 4Q-12 -3 -6 4M6 4Q12 -3 18 4', g, 2.8);
      P('M-14 15Q0 13 14 15Q13 32 0 33Q-13 32 -14 15Z', '#7a2a1f', g, { 'stroke-width': 2.2 });
      P('M-12 16Q0 14 12 16L11 20Q0 18 -11 20Z', '#fff', g, { 'stroke-width': 1.4 });
      P('M-6 28Q0 24 6 28Q3 32 0 32Q-3 32 -6 28Z', '#e8796b', g, { stroke: 'none' });
    },
    // 깔림: X 눈, 혀
    dead(g) {
      LINE('M-21 -8L-5 -9M5 -9L21 -8', g, 4);
      LINE('M-18 -3L-6 8M-6 -3L-18 8M6 -3L18 8M18 -3L6 8', g, 2.6);
      LINE('M-11 21q2.75 -4 5.5 0q2.75 4 5.5 0q2.75 -4 5.5 0q2.75 4 5.5 0', g, 2.2);
      P('M3 23Q3 31 8 31Q13 31 12 23Z', '#e8796b', g, { 'stroke-width': 1.8 });
    },
  };

  // 머리: 원점 = 얼굴 가운데
  function buildHead(parent) {
    const H = { faces: {}, last: '' };
    const g = (H.g = el('g', {}, parent));
    SKINP('M-37 2a6 9 0 1 0 12 0a6 9 0 1 0 -12 0Z', g, { 'stroke-width': 2 });
    SKINP('M25 2a6 9 0 1 0 12 0a6 9 0 1 0 -12 0Z', g, { 'stroke-width': 2 });
    SKINP('M-30 -26C-28 -40 28 -40 30 -26L32 8C32 28 16 38 0 38C-16 38 -32 28 -32 8Z', g);
    P('M-31 -10C-32 -34 -18 -44 0 -44C18 -44 32 -34 31 -10C26 -22 14 -27 0 -27C-14 -27 -26 -22 -31 -10Z', HAIR, g);
    LINE('M-3 33Q0 35 3 33', g, 1.6, INK, { opacity: 0.6 }); // 턱 보조개
    H.blush = el('g', { opacity: 0 }, g);
    el('ellipse', { cx: -21, cy: 14, rx: 7, ry: 4, fill: '#d8443a' }, H.blush);
    el('ellipse', { cx: 21, cy: 14, rx: 7, ry: 4, fill: '#d8443a' }, H.blush);
    for (const k in EXPR) {
      H.faces[k] = el('g', { display: 'none' }, g);
      EXPR[k](H.faces[k]);
    }
    LINE('M-1 6Q-4 13 2 13.5', g, 1.8); // 코
    H.vein = el('g', { opacity: 0 }, g);
    vein(H.vein, -22, -18);
    vein(H.vein, 22, -16, 0.9);
    H.sweat = el('g', { opacity: 0 }, g);
    [[-40, -18, 0], [42, 0, 0.35], [-36, 12, 0.7]].forEach(([x, y, delay]) => {
      const d = el('g', { transform: `translate(${x} ${y})` }, H.sweat);
      el('path', Object.assign({ d: 'M0 -7Q5.5 1 0 5Q-5.5 1 0 -7Z', fill: '#9fd8f5', class: 'fg-drop', style: `animation-delay:${delay}s` }, OUT, { 'stroke-width': 1.6 }), d);
    });
    return H;
  }

  function paintFace(H, face, strain) {
    if (face !== H.last) {
      for (const k in H.faces) H.faces[k].setAttribute('display', k === face ? 'inline' : 'none');
      H.last = face;
    }
    H.blush.setAttribute('opacity', clamp((strain - 0.3) * 1.2, 0, 0.7).toFixed(2));
    H.vein.setAttribute('opacity', clamp((strain - 0.65) / 0.25, 0, 1).toFixed(2));
    H.sweat.setAttribute('opacity', clamp((strain - 0.4) / 0.3, 0, 1).toFixed(2));
  }

  // ---------- 상태 ----------
  let svg, world, gBar, gPlates, rackG;
  let mode = 'squat';
  let hands = HANDS;
  let barRest = GROUND - 30; // 데드리프트: 바닥에 놓인 바벨 중심 높이
  let barShown = null;
  let barLines = [];
  const barParts = [];     // 바벨을 따라 휘는 것들: { el, x }
  let plateParts = [];
  let barL = 40, barR = 360, sagBase = 0;
  const vb = { x: -100, w: 600 };
  const vbTarget = { x: -100, w: 600 };

  // 서 있는 사람 부품
  const legs = [];
  const arms = [];
  let torso, shorts, headS, shakeG;

  // 벤치프레스는 위에서 약간 비스듬히(발 쪽에서) 내려다본 모습. 머리가 위, 발이 아래.
  // 높이 있는 건 화면 위쪽으로 올라가고 카메라에 가까워져 조금 커 보임
  const B = {
    neckY: 132,
    rackY: 68,                 // 거치대에 걸린 바벨 (이마 위)
    lockY: 150, chestY: 196,   // 팔 다 폈을 때 / 가슴에 닿았을 때
    lockScale: 1.1,
    elbowsLow: [[96, 214], [304, 214]], // 가슴까지 내렸을 때 팔꿈치 (옆으로 벌어짐)
  };
  let benchG, benchMove, bArms = [], bBarSlot, bShadow, headB;
  let benchBarY = B.rackY;

  // ---------- 조립 ----------
  function mount(target) {
    svg = target;
    svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');
    svg.setAttribute('viewBox', '-100 0 600 400');
    const defs = el('defs', {}, svg);
    const stripe = el('pattern', { id: 'fg-stripe', width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    el('rect', { width: 8, height: 8, fill: '#f0c419' }, stripe);
    el('rect', { width: 4, height: 8, fill: INK }, stripe);

    // 고무 매트 바닥 + 나무 플랫폼
    el('rect', { x: -4000, y: GROUND, width: 8400, height: 600, fill: '#4a4744' }, svg);
    for (let x = -4000; x < 4400; x += 60) el('path', { d: `M${x} ${GROUND}V${GROUND + 600}`, stroke: '#3c3936', 'stroke-width': 1.5 }, svg);
    el('rect', { x: 40, y: GROUND, width: 320, height: 600, fill: '#b07f52', stroke: INK, 'stroke-width': 2 }, svg);
    for (let x = 80; x < 360; x += 40) el('path', { d: `M${x} ${GROUND}V${GROUND + 600}`, stroke: 'rgba(43,39,34,.25)', 'stroke-width': 1 }, svg);
    el('path', { d: `M-4000 ${GROUND}H4400`, stroke: INK, 'stroke-width': 2 }, svg);

    // 랙
    rackG = el('g', { stroke: INK, 'stroke-width': 1.8, 'stroke-linejoin': 'round' }, svg);
    el('rect', { x: POSTS[0] - 2, y: 26, width: POSTS[1] - POSTS[0] + POST_W + 4, height: 9, rx: 1.5, fill: '#5b5f64' }, rackG);
    for (const x of POSTS) {
      el('rect', { x, y: 30, width: POST_W, height: GROUND - 30, fill: '#5b5f64' }, rackG);
      for (let y = 56; y < GROUND - 16; y += 16) el('circle', { cx: x + POST_W / 2, cy: y, r: 1.4, fill: INK, stroke: 'none' }, rackG);
      el('path', { d: `M${x - 5} ${HOOK_Y - 8}v19h${POST_W + 10}v-19h-3v8h-${POST_W + 4}v-8z`, fill: '#7a7f85' }, rackG);
      el('rect', { x: x - 11, y: PIN_Y + 3, width: POST_W + 22, height: 8, rx: 1.5, fill: 'url(#fg-stripe)' }, rackG);
    }
    el('ellipse', { cx: 200, cy: GROUND - 1, rx: 56, ry: 5, fill: 'rgba(0,0,0,.22)' }, svg);

    world = el('g', {}, svg);

    // 바벨 (스쿼트는 몸 뒤, 데드리프트는 setExercise에서 몸 앞으로 옮김)
    gBar = el('g', {}, world);
    const shaftO = el('path', { fill: 'none', stroke: INK, 'stroke-width': 7, 'stroke-linecap': 'round' }, gBar);
    const sleeveLO = el('path', { fill: 'none', stroke: INK, 'stroke-width': 11, 'stroke-linecap': 'round' }, gBar);
    const sleeveRO = el('path', { fill: 'none', stroke: INK, 'stroke-width': 11, 'stroke-linecap': 'round' }, gBar);
    const shaft = el('path', { fill: 'none', stroke: '#9ba1a7', 'stroke-width': 3.5, 'stroke-linecap': 'round' }, gBar);
    const sleeveL = el('path', { fill: 'none', stroke: '#cdd1d5', 'stroke-width': 7, 'stroke-linecap': 'round' }, gBar);
    const sleeveR = el('path', { fill: 'none', stroke: '#cdd1d5', 'stroke-width': 7, 'stroke-linecap': 'round' }, gBar);
    barLines = { shaft: [shaftO, shaft], left: [sleeveLO, sleeveL], right: [sleeveRO, sleeveR] };
    for (const x of [COLLAR[0] + 3, COLLAR[1] - 3]) {
      const g = el('g', {}, gBar);
      el('rect', { x: -3, y: -9, width: 6, height: 18, rx: 1.5, fill: '#b2b7bc', stroke: INK, 'stroke-width': 1.5 }, g);
      barParts.push({ el: g, x });
    }
    gPlates = el('g', {}, gBar);

    // 다리 → 신발 → 반바지 → 몸통 → 머리 → 팔 → 손
    const legOut = el('g', {}, world);
    const legFill = el('g', {}, world);
    for (const s of [-1, 1]) {
      const shin = limbPair(legOut, legFill, PART.shin, 6); // 무릎 뼈가 툭 튀어나옴
      const thigh = limbPair(legOut, legFill, PART.thigh);
      legs.push({ s, shin, thigh });
    }
    for (const L of legs) L.shoe = buildShoe(world);
    shorts = buildShorts(world);
    torso = buildTorso(world);
    headS = buildHead(world);
    const armOut = el('g', {}, world);
    const armFill = el('g', {}, world);
    for (const s of [-1, 1]) {
      const upper = limbPair(armOut, armFill, PART.upper);
      const fore = limbPair(armOut, armFill, PART.fore);
      LINE('M-10 14Q-2 20 6 14', upper[1], 1.5, INK, { opacity: 0.5 }); // 알통 선
      el('rect', Object.assign({ x: -9.5, y: 21, width: 19, height: 8, rx: 2, fill: BAND }, OUT, { 'stroke-width': 1.8 }), fore[1]); // 손목 밴드
      arms.push({ s, upper, fore });
    }
    for (const A of arms) A.hand = buildHand(world);
    // 다리 후들후들 표시
    shakeG = el('g', { opacity: 0 }, world);
    for (const L of legs) L.shake = LINE('M0 0q-5 4 0 8M-5 -3q-5 6 0 13', shakeG, 1.8, INK, { opacity: 0.75 });

    buildBench();
    setWeight(20);
  }

  // ---------- 벤치프레스 (위에서 비스듬히) ----------
  function buildBench() {
    benchG = el('g', { display: 'none' }, svg);
    const ink = { stroke: INK, 'stroke-width': 2, 'stroke-linejoin': 'round' };

    // 위에서 보니 화면 전체가 바닥. 이음매가 위로 갈수록 좁아지고 모여서 비스듬한 느낌
    el('rect', { x: -4000, y: -4000, width: 8400, height: 8400, fill: '#4a4744' }, benchG);
    const seams = el('g', { stroke: '#3c3936', 'stroke-width': 1.5 }, benchG);
    for (let y = 410; y > -420; y -= Math.max(20, 46 + (y - 400) * 0.05)) el('path', { d: `M-4000 ${y.toFixed(1)}H4400` }, seams);
    for (let x = -1000; x <= 1400; x += 60) el('path', { d: `M${x} 420L${200 + (x - 200) * 0.78} -420` }, seams);
    // 나무 플랫폼
    el('path', Object.assign({ d: 'M58 396L342 396L322 14L78 14Z', fill: '#b07f52' }, ink), benchG);
    for (const t of [0.25, 0.5, 0.75]) {
      const xb = 58 + 284 * t, xt = 78 + 244 * t;
      el('path', { d: `M${xb} 396L${xt} 14`, stroke: 'rgba(43,39,34,.25)', 'stroke-width': 1 }, benchG);
    }

    // 머리 쪽 거치대 기둥 (높이 = 화면 위로)
    const frame = { fill: '#5b5f64', stroke: INK, 'stroke-width': 1.8, 'stroke-linejoin': 'round' };
    for (const x of [108, 292]) {
      el('rect', Object.assign({ x: x - 13, y: 128, width: 26, height: 12, rx: 2 }, frame), benchG);
      el('rect', Object.assign({ x: x - 4.5, y: B.rackY + 14, width: 9, height: 136 - B.rackY - 14 }, frame), benchG);
      el('path', Object.assign({ d: `M${x - 9} ${B.rackY - 2}v14h18v-14h-3v8h-12v-8z`, fill: '#7a7f85' }, { stroke: INK, 'stroke-width': 1.5 }), benchG);
    }
    // 벤치: 윗면(머리 쪽이 살짝 좁음) + 발 쪽 옆면 + 다리
    for (const x of [176, 216]) el('rect', Object.assign({ x, y: 314, width: 8, height: 16 }, frame), benchG);
    el('path', Object.assign({ d: 'M168 308L232 308L232 319L168 319Z', fill: '#2c2f34' }, ink), benchG);
    el('path', Object.assign({ d: 'M174 60L226 60L232 308L168 308Z', fill: '#3d4148' }, ink), benchG);

    benchMove = el('g', {}, benchG);
    // 다리: 허벅지는 벤치 따라 아래로, 무릎에서 꺾여 발은 벤치 양옆 바닥에
    const hipY = B.neckY + TORSO;
    const legOut = el('g', {}, benchMove);
    const legFill = el('g', {}, benchMove);
    const feet = [];
    for (const s of [-1, 1]) {
      const hip = [200 + s * HIP_W, hipY - 2], knee = [200 + s * 26, hipY + 52], ankle = [200 + s * 54, hipY + 92];
      setPair(limbPair(legOut, legFill, PART.shin, 6), knee[0], knee[1], ankle[0], ankle[1], SHIN, s < 0);
      setPair(limbPair(legOut, legFill, PART.thigh), hip[0], hip[1], knee[0], knee[1], THIGH, s < 0);
      feet.push([ankle[0] + s * 2, ankle[1] + 14, s]);
    }
    for (const [x, y, s] of feet) buildShoe(benchMove).setAttribute('transform', `translate(${x} ${y}) scale(${s} 1)`);
    buildShorts(benchMove).setAttribute('transform', `translate(200 ${hipY})`);
    buildTorso(benchMove).g.setAttribute('transform', `translate(200 ${B.neckY})`);
    headB = buildHead(benchMove);
    headB.g.setAttribute('transform', `translate(200 ${B.neckY - 40})`);

    // 바벨 그림자: 바벨이 높이 뜰수록 바벨과 떨어져 보임
    bShadow = el('rect', { x: 100, y: 0, width: 200, height: 7, rx: 3.5, fill: 'rgba(0,0,0,.25)' }, benchMove);
    bBarSlot = el('g', {}, benchMove); // 정면용 바벨(gBar)을 그대로 옮겨 씀
    // 팔 (손이 바벨 위)
    const armOut = el('g', {}, benchMove);
    const armFill = el('g', {}, benchMove);
    for (const s of [-1, 1]) {
      const upper = limbPair(armOut, armFill, PART.upper);
      const fore = limbPair(armOut, armFill, PART.fore);
      LINE('M-10 14Q-2 20 6 14', upper[1], 1.5, INK, { opacity: 0.5 });
      el('rect', Object.assign({ x: -9.5, y: 21, width: 19, height: 8, rx: 2, fill: BAND }, OUT, { 'stroke-width': 1.8 }), fore[1]);
      bArms.push({ s, i: s < 0 ? 0 : 1, upper, fore });
    }
    for (const A of bArms) A.hand = buildHand(benchMove);
  }

  function renderBench(s, d, c, sag) {
    // 거치대 ↔ 가슴 위로 옮길 땐 부드럽게, 누르는 중엔 바로 따라감
    const target = s.racked ? B.rackY : lerp(B.lockY, B.chestY, d) + 4 * c;
    benchBarY += (target - benchBarY) * (s.racked || Math.abs(target - benchBarY) > 30 ? 0.2 : 1);
    const by = benchBarY + (s.whip || 0) * 0.3;
    const lift = clamp((B.chestY - by) / (B.chestY - B.lockY), 0, 1.3); // 0 가슴 ~ 1 팔 다 폄
    const k = 1 + (B.lockScale - 1) * lift;

    const j = s.jitter || 0;
    benchMove.setAttribute('transform', `translate(${((Math.random() * 2 - 1) * j).toFixed(2)} ${((Math.random() * 2 - 1) * j * 0.6).toFixed(2)})`);
    gBar.setAttribute('transform', `translate(200 ${by.toFixed(1)}) scale(${k.toFixed(3)}) translate(-200 ${(-by).toFixed(1)})`);
    drawBar(by, sag);

    // 그림자는 바벨 바로 아래 몸 위에 떨어짐
    const shadowY = (s.racked ? benchBarY + (B.chestY - B.lockY) : B.chestY) + 8;
    bShadow.setAttribute('y', shadowY.toFixed(1));
    bShadow.setAttribute('opacity', clamp(1 - lift * 0.45, 0.4, 1).toFixed(2));

    // 팔: 다 폈을 땐 쭉, 가슴까지 내리면 팔꿈치가 옆으로 벌어짐
    const bend = s.racked ? 0 : d;
    for (const A of bArms) {
      const sx = 200 + A.s * SHOULDER_W, sy = B.neckY + 10;
      const hx = 200 + (HANDS_BENCH[A.i] - 200) * k;
      const ex = lerp((sx + hx) / 2 + A.s * 4, B.elbowsLow[A.i][0], bend);
      const ey = lerp((sy + by) / 2, B.elbowsLow[A.i][1], bend);
      setPair(A.upper, sx, sy, ex, ey, UPPER, A.s < 0);
      setPair(A.fore, ex, ey, hx, by, FORE, A.s < 0);
      A.hand.setAttribute('transform', `translate(${hx.toFixed(1)} ${by.toFixed(1)})`);
    }
  }

  function setWeight(W) {
    plateParts.forEach((p) => p.el.remove());
    plateParts = [];
    const side = platesFor(W);
    let off = 0;
    for (const p of side) {
      for (const dir of [-1, 1]) {
        const x = dir < 0 ? COLLAR[0] - off - p.w / 2 : COLLAR[1] + off + p.w / 2;
        const g = el('g', {}, gPlates);
        el('rect', { x: -p.w / 2, y: -p.h / 2, width: p.w, height: p.h, rx: 2.5, fill: p.c, stroke: INK, 'stroke-width': 1.6 }, g);
        plateParts.push({ el: g, x });
      }
      off += p.w + 0.5;
    }
    if (side.length) {
      for (const dir of [-1, 1]) {
        const x = dir < 0 ? COLLAR[0] - off - 2.5 : COLLAR[1] + off + 2.5;
        const g = el('g', {}, gPlates);
        el('rect', { x: -2.5, y: -8, width: 5, height: 16, rx: 1, fill: '#c3c8cd', stroke: INK, 'stroke-width': 1.4 }, g);
        plateParts.push({ el: g, x });
      }
    }
    const sleeve = Math.max(58, off + 16);
    barL = COLLAR[0] - sleeve;
    barR = COLLAR[1] + sleeve;
    // 제일 큰 원판이 바닥에 닿는 높이 (빈 봉이면 블록 위에 올려둔 셈)
    barRest = GROUND - Math.max(30, side.length ? side[0].h / 2 : 0);
    sagBase = clamp(Math.pow(W / 600, 1.6) * 60, 0, 70);
    updateCamera();
  }

  // 원판이 많아져 바벨이 길어지면 줌아웃 (벤치는 바벨이 들리면 커지니까 조금 더 여유)
  function updateCamera() {
    vbTarget.x = Math.min(-100, barL - 34 - (mode === 'bench' ? (200 - barL) * 0.12 : 0));
    vbTarget.w = 400 - 2 * vbTarget.x;
  }

  // ---------- 매 프레임 ----------
  // 손 바깥쪽부터 끝으로 갈수록 처짐
  function yAt(x, y, sag) {
    const ax = Math.abs(x - 200) - (200 - hands[0]);
    if (ax <= 0) return y;
    const t = ax / (barR - hands[1]);
    return y + sag * t * t;
  }

  function slopeAt(x, sag) {
    const ax = Math.abs(x - 200) - (200 - hands[0]);
    if (ax <= 0) return 0;
    const L = barR - hands[1];
    const s = (2 * sag * ax) / (L * L);
    return x > 200 ? s : -s;
  }

  function sampled(x0, x1, y, sag) {
    let d = '';
    for (let i = 0; i <= 6; i++) {
      const x = lerp(x0, x1, i / 6);
      d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + yAt(x, y, sag).toFixed(1);
    }
    return d;
  }

  function setD(pair, d) {
    pair[0].setAttribute('d', d);
    pair[1].setAttribute('d', d);
  }

  function drawBar(y, sag) {
    const mL = (barL + hands[0]) / 2;
    const mR = (hands[1] + barR) / 2;
    setD(barLines.shaft, `M${barL} ${y + sag}Q${mL} ${y} ${hands[0]} ${y}L${hands[1]} ${y}Q${mR} ${y} ${barR} ${y + sag}`);
    setD(barLines.left, sampled(barL, COLLAR[0], y, sag));
    setD(barLines.right, sampled(COLLAR[1], barR, y, sag));
    for (const p of barParts.concat(plateParts)) {
      const py = yAt(p.x, y, sag);
      const a = Math.atan(slopeAt(p.x, sag)) * 57.2958;
      p.el.setAttribute('transform', `translate(${p.x.toFixed(1)} ${py.toFixed(2)}) rotate(${a.toFixed(2)})`);
    }
  }

  function ik(hx, hy, ax, ay, a, b, dir) {
    const dx = ax - hx, dy = ay - hy;
    const d = Math.min(Math.hypot(dx, dy), a + b - 0.01);
    const cosA = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
    const ang = Math.atan2(dy, dx) + dir * Math.acos(cosA);
    return [hx + a * Math.cos(ang), hy + a * Math.sin(ang)];
  }

  /**
   * s.d: 앉은 깊이 0(섬)~1(바닥), s.c: 깔림 0~1, s.strain: 힘듦 0~1,
   * s.face: calm|effort|max|happy|dead, s.jitter: 떨림(px), s.whip: 바벨 출렁임(px),
   * s.hold: 데드리프트에서 바벨을 잡고 있는지, s.racked: 벤치에서 바벨이 거치대에 있는지
   */
  function render(s) {
    const d = clamp(s.d, 0, 1);
    const c = clamp(s.c || 0, 0, 1);
    const strain = clamp(s.strain || 0, 0, 1);

    // 카메라: 원판이 많아지면 줌아웃
    vb.x = lerp(vb.x, vbTarget.x, 0.12);
    vb.w = 400 - 2 * vb.x;
    const vbH = (400 * vb.w) / 600;
    svg.setAttribute('viewBox', `${vb.x.toFixed(2)} ${(400 - vbH).toFixed(2)} ${vb.w.toFixed(2)} ${vbH.toFixed(2)}`);

    const rgb = SKIN.map((v, i) => Math.round(lerp(v, HOT[i], strain * 0.75)));
    svg.style.setProperty('--skin', `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`);

    if (mode === 'bench') {
      renderBench(s, d, c, sagBase + (s.whip || 0));
      paintFace(headB, s.face || 'calm', strain);
      return;
    }

    const j = s.jitter || 0;
    world.setAttribute('transform', `translate(${((Math.random() * 2 - 1) * j).toFixed(2)} ${((Math.random() * 2 - 1) * j * 0.6).toFixed(2)})`);

    let hipY, torsoLen, barY, headY, thighLen;
    let handY = null;
    let sag = sagBase + (s.whip || 0);
    if (mode === 'squat') {
      hipY = lerp(252, 300, d) + 14 * c;
      torsoLen = lerp(TORSO, 80, d) - 8 * c;
      barY = Math.min(hipY - torsoLen + 6, PIN_Y);
      headY = hipY - torsoLen - 40 + 5 * c;
      thighLen = lerp(44.5, 30, d) - 4 * c;
    } else {
      // 데드리프트: 엉덩이를 빼며 상체를 숙임(정면이라 몸통이 짧아 보임). 실패하면 그대로 주저앉음
      hipY = lerp(252, 304, d) + 40 * c;
      torsoLen = lerp(TORSO, 62, d) + 14 * c;
      headY = hipY - torsoLen - lerp(40, 30, d) + 4 * c;
      thighLen = lerp(44.5, 38, d) - 6 * c;
      const reach = hipY - torsoLen + 10 + 72; // 팔을 쭉 폈을 때 손 높이
      const target = s.hold ? Math.min(reach, barRest) : barRest;
      // 들고 있으면 손을 따라가고, 놓으면 툭 떨어짐
      barShown = barShown == null || s.hold ? target : barShown + (target - barShown) * 0.35;
      barY = barShown;
      if (!s.hold) handY = Math.min(reach, barRest);
      sag *= clamp((barRest - barY) / 15, 0, 1); // 바닥에 놓여 있으면 안 휨
    }
    const neckY = hipY - torsoLen;

    drawBar(barY, sag);

    // 다리: 젓가락 다리라 쪼그려 앉으면 무릎이 개구리처럼 벌어짐
    const shakeOn = clamp((strain - 0.55) / 0.3, 0, 1);
    for (const L of legs) {
      const hx = 200 + L.s * HIP_W, ax = 200 + L.s * ANKLE_W;
      const [kx, ky] = ik(hx, hipY, ax, ANKLE_Y, thighLen, SHIN, L.s < 0 ? 1 : -1);
      setPair(L.thigh, hx, hipY, kx, ky, THIGH, L.s < 0);
      setPair(L.shin, kx, ky, ax, ANKLE_Y, SHIN, L.s < 0);
      L.shoe.setAttribute('transform', `translate(${ax + L.s * 2} ${ANKLE_Y + 14}) scale(${L.s} 1)`);
      L.shake.setAttribute('transform', `translate(${(kx + L.s * 16).toFixed(1)} ${(ky - 4).toFixed(1)}) scale(${-L.s} 1)`);
    }
    shakeG.setAttribute('opacity', shakeOn.toFixed(2));

    shorts.setAttribute('transform', `translate(200 ${hipY.toFixed(1)})`);
    torso.g.setAttribute('transform', `translate(200 ${neckY.toFixed(1)}) scale(1 ${(torsoLen / TORSO).toFixed(3)})`);
    torso.veins.setAttribute('opacity', clamp((strain - 0.7) / 0.2, 0, 1).toFixed(2));
    headS.g.setAttribute('transform', `translate(200 ${headY.toFixed(1)}) scale(1 ${(1 - 0.12 * c).toFixed(3)})`);

    for (const A of arms) {
      const i = A.s < 0 ? 0 : 1;
      const hx = hands[i];
      const sx = 200 + A.s * SHOULDER_W, sy = neckY + 10;
      const hy = handY == null ? yAt(hx, barY, sag) : handY;
      // 스쿼트는 팔꿈치가 아래로, 데드리프트는 팔을 쭉 폄
      const ex = mode === 'squat' ? 200 + A.s * (SHOULDER_W + 18) : (sx + hx) / 2 + A.s * 4;
      const ey = mode === 'squat' ? sy + 33 : (sy + hy) / 2;
      setPair(A.upper, sx, sy, ex, ey, UPPER, A.s < 0);
      setPair(A.fore, ex, ey, hx, hy, FORE, A.s < 0);
      A.hand.setAttribute('transform', `translate(${hx} ${hy.toFixed(1)})`);
    }

    paintFace(headS, s.face || 'calm', strain);
  }

  // 스쿼트: 랙 + 등 뒤 바벨 / 데드리프트: 랙 없이 바닥에서 몸 앞 바벨 / 벤치: 위에서 비스듬히
  function setExercise(m) {
    mode = m === 'deadlift' || m === 'bench' ? m : 'squat';
    hands = mode === 'deadlift' ? HANDS_DL : mode === 'bench' ? HANDS_BENCH : HANDS;
    rackG.setAttribute('display', mode === 'squat' ? 'inline' : 'none');
    world.setAttribute('display', mode === 'bench' ? 'none' : 'inline');
    benchG.setAttribute('display', mode === 'bench' ? 'inline' : 'none');
    // 바벨 하나를 운동에 맞는 자리로 옮겨 씀
    if (mode === 'bench') {
      bBarSlot.appendChild(gBar);
    } else {
      gBar.removeAttribute('transform');
      world.insertBefore(gBar, mode === 'deadlift' ? headS.g : world.firstChild);
    }
    barShown = null;
    benchBarY = B.rackY;
    updateCamera();
  }

  return { mount, setWeight, setExercise, render, platesFor, PLATES };
})();
