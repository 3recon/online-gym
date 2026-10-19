/* 온라인 헬스장 — 브라우저와 서버가 같이 쓰는 데이터 (닉네임 단어, 응원 문구, 무게 검증) */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GymShared = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ADJ = [
    '출근한', '퇴근하고 싶은', '몰래 득근하는', '하체 빼먹는', '닭가슴살 먹는', '점심 거른',
    '폼롤러 굴리는', '거울만 보는', '벌크업 중인', '커팅 중인', '새벽 운동하는', '야근하는',
    '칼퇴하는', '회의 중인', '엑셀 켜놓은', '단백질 마시는', '어깨가 넓은', '말벅지',
    '숨 참는', '자세 좋은', '3대 500 아닌', '월요병 걸린', '근손실 두려운', '오운완 한',
    '스트레칭 안 한', '쉬는 시간 긴'
  ];
  var NOUN = [
    '헬린이', '인턴', '신입', '사원', '주임', '대리', '과장', '차장', '부장', '팀장',
    '프리랜서', '감자', '고구마', '두부', '다람쥐', '햄스터', '곰', '고양이', '펭귄',
    '닭가슴살', '프로틴', '덤벨', '케틀벨', '폼롤러', '헬창'
  ];
  var SHOUTS = [
    '가보자', '한 개 더', '자세 좋다', '숨 쉬세요', '물 마셔요',
    '라이트웨잇 베이비', '오운완', '부장님 온다'
  ];
  var MIN_W = 20;
  var MAX_W = 1000;
  var EXERCISES = ['squat', 'deadlift', 'bench'];

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  function randomName() { return pick(ADJ) + ' ' + pick(NOUN); }

  function isValidName(name) {
    if (typeof name !== 'string') return false;
    var i = name.lastIndexOf(' ');
    return i > 0 && ADJ.indexOf(name.slice(0, i)) !== -1 && NOUN.indexOf(name.slice(i + 1)) !== -1;
  }

  // 20kg 빈 봉부터 1.25kg 단위
  function isValidWeight(w) {
    return typeof w === 'number' && isFinite(w) && w >= MIN_W && w <= MAX_W &&
      Math.abs(w * 0.8 - Math.round(w * 0.8)) < 1e-6;
  }

  return {
    ADJ: ADJ, NOUN: NOUN, SHOUTS: SHOUTS, MIN_W: MIN_W, MAX_W: MAX_W, EXERCISES: EXERCISES,
    randomName: randomName, isValidName: isValidName, isValidWeight: isValidWeight
  };
});
