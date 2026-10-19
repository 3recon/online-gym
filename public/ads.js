/* 광고: config.js에 adsenseClient와 광고 단위 ID가 있을 때만 켜짐.
 * 광고 자리는 피드·순위 옆과 페이지 맨 아래뿐. 입력칸·운동 화면 근처에는 두지 않음 (실수 클릭 = 정책 위반)
 */
(function () {
  'use strict';
  const C = window.GYM_CONFIG || {};
  if (!C.adsenseClient) return;

  const lib = document.createElement('script');
  lib.async = true;
  lib.crossOrigin = 'anonymous';
  lib.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(C.adsenseClient);
  document.head.appendChild(lib);

  document.querySelectorAll('.ad-slot').forEach((box) => {
    const slot = (C.adSlots || {})[box.dataset.slot];
    if (!slot) return;
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.dataset.adClient = C.adsenseClient;
    ins.dataset.adSlot = slot;
    ins.dataset.adFormat = 'auto';
    ins.dataset.fullWidthResponsive = 'true';
    box.appendChild(ins);
    box.hidden = false;
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  });
})();
