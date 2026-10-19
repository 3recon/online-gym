// Cloudflare Worker
// - 사이트: public 폴더의 파일은 Worker를 거치지 않고 바로 나감. 여기 fetch에는 없는 주소만 들어옴
// - 깨우기: Supabase 무료 프로젝트는 일주일 동안 요청이 없으면 잠들어서, 하루 한 번 순위판을 불러 둠
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(ping(env));
  },
};

async function ping(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return; // 아직 Supabase를 안 붙였으면 할 일 없음
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/get_board`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  console.log('supabase ping', res.status);
}
