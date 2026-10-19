-- 온라인 헬스장 — Supabase 설정
-- Supabase 대시보드 > SQL Editor > New query 에 이 파일 내용을 통째로 붙여넣고 Run.
-- 여러 번 실행해도 괜찮음. (make-schema.js로 만든 파일. 고칠 땐 schema.template.sql을 고치고 다시 만들 것)

-- ===== 테이블 =====
create table if not exists public.players (
  id text primary key,
  name text not null,
  lift_started_at timestamptz,
  lift_weight numeric,
  lift_exercise text,
  last_result_at timestamptz,
  last_shout_at timestamptz,
  created_at timestamptz not null default now()
);

-- 날짜별 최고 기록 (오늘 순위)
create table if not exists public.records_daily (
  player_id text not null,
  exercise text not null,
  day date not null,
  name text not null,
  best numeric not null,
  at timestamptz not null default now(),
  primary key (player_id, exercise, day)
);
create index if not exists records_daily_board on public.records_daily (exercise, day, best desc);

-- 역대 최고 기록 (명예의 전당)
create table if not exists public.records_all (
  player_id text not null,
  exercise text not null,
  name text not null,
  best numeric not null,
  at timestamptz not null default now(),
  primary key (player_id, exercise)
);
create index if not exists records_all_board on public.records_all (exercise, best desc);

create table if not exists public.daily_stats (
  day date primary key,
  volume numeric not null default 0,
  lifts int not null default 0
);

create table if not exists public.feed_items (
  id bigserial primary key,
  at timestamptz not null default now(),
  kind text not null,  -- 'lift' | 'shout'
  name text not null,
  exercise text,
  weight numeric,
  success boolean,
  pr boolean,
  cpm int,
  text text
);

-- ===== 권한: 브라우저는 피드만 직접 읽고, 쓰기·순위는 아래 함수로만 =====
alter table public.players enable row level security;
alter table public.records_daily enable row level security;
alter table public.records_all enable row level security;
alter table public.daily_stats enable row level security;
alter table public.feed_items enable row level security;

drop policy if exists "feed read" on public.feed_items;
create policy "feed read" on public.feed_items for select to anon, authenticated using (true);

-- 새 피드가 들어오면 접속자들에게 바로 전달
do $$
begin
  alter publication supabase_realtime add table public.feed_items;
exception when duplicate_object then null;
end $$;

-- ===== 닉네임 검사: 게임이 만드는 "형용사 명사" 조합만 허용 =====
create or replace function public.gym_name_ok(p_name text)
returns boolean
language plpgsql
immutable
as $$
declare
  v_adj text[] := array['출근한', '퇴근하고 싶은', '몰래 득근하는', '하체 빼먹는', '닭가슴살 먹는', '점심 거른', '폼롤러 굴리는', '거울만 보는', '벌크업 중인', '커팅 중인', '새벽 운동하는', '야근하는', '칼퇴하는', '회의 중인', '엑셀 켜놓은', '단백질 마시는', '어깨가 넓은', '말벅지', '숨 참는', '자세 좋은', '3대 500 아닌', '월요병 걸린', '근손실 두려운', '오운완 한', '스트레칭 안 한', '쉬는 시간 긴'];
  v_noun text[] := array['헬린이', '인턴', '신입', '사원', '주임', '대리', '과장', '차장', '부장', '팀장', '프리랜서', '감자', '고구마', '두부', '다람쥐', '햄스터', '곰', '고양이', '펭귄', '닭가슴살', '프로틴', '덤벨', '케틀벨', '폼롤러', '헬창'];
  v_pos int;
begin
  if p_name is null or length(p_name) > 40 or position(' ' in p_name) = 0 then
    return false;
  end if;
  v_pos := length(p_name) - position(' ' in reverse(p_name)) + 1; -- 마지막 공백 위치
  return left(p_name, v_pos - 1) = any(v_adj) and substr(p_name, v_pos + 1) = any(v_noun);
end $$;

-- ===== 게임 이벤트: 들기 시작 / 결과 / 응원 =====
create or replace function public.gym_event(
  p_type text,
  p_player text,
  p_name text,
  p_exercise text default null,
  p_weight numeric default null,
  p_success boolean default null,
  p_pr boolean default false,
  p_cpm int default null,
  p_idx int default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'Asia/Seoul')::date;
  v_p public.players%rowtype;
  v_prev numeric;
  v_shouts text[] := array['가보자', '한 개 더', '자세 좋다', '숨 쉬세요', '물 마셔요', '라이트웨잇 베이비', '오운완', '부장님 온다'];
begin
  if p_player is null or p_player !~ '^[a-z0-9]{8,32}$' then return 'bad player'; end if;
  if not public.gym_name_ok(p_name) then return 'bad name'; end if;

  insert into public.players (id, name) values (p_player, p_name)
  on conflict (id) do update set name = excluded.name;
  select * into v_p from public.players where id = p_player for update;

  if p_type in ('start', 'result') then
    if p_exercise is null or p_exercise not in ('squat', 'deadlift', 'bench') then return 'bad exercise'; end if;
    if p_weight is null or p_weight < 20 or p_weight > 1000 or (p_weight * 0.8) <> round(p_weight * 0.8) then
      return 'bad weight';
    end if;
  end if;

  if p_type = 'start' then
    update public.players
      set lift_started_at = now(), lift_weight = p_weight, lift_exercise = p_exercise
      where id = p_player;
    return 'ok';

  elsif p_type = 'result' then
    if p_success is null then return 'bad result'; end if;
    -- 들기 시작을 알린 그 무게·운동이어야 함
    if v_p.lift_started_at is null or v_p.lift_weight <> p_weight or v_p.lift_exercise <> p_exercise then
      return 'no start';
    end if;
    if v_p.last_result_at is not null and now() - v_p.last_result_at < interval '1.5 seconds' then
      return 'too fast';
    end if;
    update public.players set lift_started_at = null, last_result_at = now() where id = p_player;

    if p_success then
      -- 문장을 쳐야 하니 아무리 빨라도 3초는 걸림
      if now() - v_p.lift_started_at < interval '3 seconds' then return 'too fast'; end if;
      -- 최고 기록에서 한 번에 20kg 넘게 뛰는 건 거름 (처음엔 100kg까지)
      select best into v_prev from public.records_all where player_id = p_player and exercise = p_exercise;
      if p_weight > greatest(100, coalesce(v_prev, 0) + 20) then return 'too heavy'; end if;

      insert into public.records_daily as r (player_id, exercise, day, name, best)
      values (p_player, p_exercise, v_day, p_name, p_weight)
      on conflict (player_id, exercise, day) do update
        set best = greatest(r.best, excluded.best),
            name = excluded.name,
            at = case when excluded.best > r.best then now() else r.at end;

      insert into public.records_all as r (player_id, exercise, name, best)
      values (p_player, p_exercise, p_name, p_weight)
      on conflict (player_id, exercise) do update
        set best = greatest(r.best, excluded.best),
            name = excluded.name,
            at = case when excluded.best > r.best then now() else r.at end;

      insert into public.daily_stats as s (day, volume, lifts)
      values (v_day, p_weight, 1)
      on conflict (day) do update set volume = s.volume + excluded.volume, lifts = s.lifts + 1;
    end if;

    insert into public.feed_items (kind, name, exercise, weight, success, pr, cpm)
    values (
      'lift', p_name, p_exercise, p_weight, p_success,
      p_success and coalesce(p_pr, false),
      case when p_success and p_cpm between 1 and 2999 then p_cpm end
    );

  elsif p_type = 'shout' then
    if p_idx is null or p_idx < 0 or p_idx >= array_length(v_shouts, 1) then return 'bad shout'; end if;
    if v_p.last_shout_at is not null and now() - v_p.last_shout_at < interval '1.5 seconds' then
      return 'too fast';
    end if;
    update public.players set last_shout_at = now() where id = p_player;
    insert into public.feed_items (kind, name, text) values ('shout', p_name, v_shouts[p_idx + 1]);

  else
    return 'bad type';
  end if;

  -- 피드는 최근 300개만 남김
  delete from public.feed_items where id < (select max(id) - 300 from public.feed_items);
  return 'ok';
end $$;

-- ===== 순위판: 운동별 오늘/역대 상위 10명 + 오늘 다 같이 든 무게 =====
create or replace function public.get_board()
returns json
language sql
stable
security definer
set search_path = public
as $$
  with d as (select (now() at time zone 'Asia/Seoul')::date as day)
  select json_build_object(
    'boards', (
      select json_object_agg(ex, json_build_object(
        'today', coalesce((
          select json_agg(json_build_object('name', t.name, 'best', t.best) order by t.best desc, t.at)
          from (
            select r.name, r.best, r.at
            from public.records_daily r, d
            where r.exercise = ex and r.day = d.day
            order by r.best desc, r.at
            limit 10
          ) t
        ), '[]'::json),
        'allTime', coalesce((
          select json_agg(json_build_object('name', t.name, 'best', t.best) order by t.best desc, t.at)
          from (
            select r.name, r.best, r.at
            from public.records_all r
            where r.exercise = ex
            order by r.best desc, r.at
            limit 10
          ) t
        ), '[]'::json)
      ))
      from unnest(array['squat', 'deadlift', 'bench']) as ex
    ),
    'todayVolume', coalesce((select s.volume from public.daily_stats s, d where s.day = d.day), 0),
    'todayLifts', coalesce((select s.lifts from public.daily_stats s, d where s.day = d.day), 0)
  );
$$;

-- 브라우저(anon)는 이 두 함수만 부를 수 있음
revoke all on function public.gym_event(text, text, text, text, numeric, boolean, boolean, int, int) from public;
grant execute on function public.gym_event(text, text, text, text, numeric, boolean, boolean, int, int) to anon, authenticated;
revoke all on function public.get_board() from public;
grant execute on function public.get_board() to anon, authenticated;
