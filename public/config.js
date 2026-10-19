/* 배포 설정
 * - Supabase 값 두 개를 채우면 온라인 기능(접속자 수, 실시간 피드, 순위)이 켜짐
 * - 비워 두면: 내 컴퓨터에서 `npm start`로 띄운 서버가 있으면 그걸 쓰고, 없으면 혼자 연습 모드
 * - anon 키는 원래 브라우저에 공개되는 키라 여기 넣어도 됨. service_role 키는 절대 넣지 말 것
 */
window.GYM_CONFIG = {
  supabaseUrl: '',      // 예: https://abcdefghijkl.supabase.co
  supabaseAnonKey: '',  // Supabase > Project Settings > API > anon public

  // 애드센스 승인 받은 뒤에 채우기. 비어 있으면 광고 자리는 숨겨짐
  adsenseClient: '',    // 예: ca-pub-0000000000000000
  adSlots: {
    side: '',           // 피드/순위 옆 광고 단위 ID
    bottom: '',         // 페이지 아래 광고 단위 ID
  },
};
