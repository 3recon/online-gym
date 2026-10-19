// Cloudflare Worker — Supabase 깨우기 전용 (사이트는 Cloudflare Pages가 public 폴더로 올림)
// Supabase 무료 프로젝트는 일주일 동안 요청이 없으면 잠들어서, 하루 한 번 순위판을 불러 둠
export default {
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
