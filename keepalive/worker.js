// Supabase 무료 프로젝트는 일주일 동안 요청이 없으면 잠듦 → 하루 한 번 순위판을 불러서 깨워 둠
// Cloudflare Workers 예약 실행(Cron Trigger)으로 돌아감. 무료.
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(ping(env));
  },
  // 주소로 직접 열어서 잘 되는지 확인할 수도 있음
  async fetch(request, env) {
    const status = await ping(env);
    return new Response(`supabase ping: ${status}\n`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
  },
};

async function ping(env) {
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
  return res.status;
}
