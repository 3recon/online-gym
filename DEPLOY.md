# 배포하는 법 (전부 무료)

구성: **Cloudflare Pages**(사이트) + **Supabase**(접속자·피드·순위) + **Cloudflare Worker**(Supabase가 잠들지 않게 하루 한 번 깨움)

배포할 땐 `public` 폴더만 올리면 됩니다. `server.js`는 내 컴퓨터에서 테스트할 때만 씁니다.

---

## 1. Supabase 만들기 (5분)

1. [supabase.com](https://supabase.com) 가입 → **New project**
   - Name: `online-gym` (아무거나)
   - Database Password: 길게 아무거나 (따로 적어 두기)
   - Region: **Northeast Asia (Seoul)**
2. 프로젝트가 만들어지면 왼쪽 메뉴 **SQL Editor** → **New query**
   → `supabase/schema.sql` 파일 내용을 **통째로** 붙여넣고 **Run**
   → 아래에 `Success` 가 나오면 끝 (여러 번 실행해도 괜찮음)
3. **Project Settings → API Keys** (또는 Data API)에서 두 값을 복사
   - **Project URL** (예: `https://abcdefghijkl.supabase.co`)
   - **anon public** 키 (새 화면에서는 **publishable** 키라고 나올 수도 있음. 둘 다 됨)
4. `public/config.js`의 `supabaseUrl`, `supabaseAnonKey`에 붙여넣기

> **service_role 키(또는 secret 키)는 어디에도 넣지 마세요.** 이 프로젝트는 그 키가 필요 없습니다.

### 내 컴퓨터에서 먼저 확인 (선택)

```powershell
npm start
```

http://localhost:3000 을 브라우저 두 개로 열어서 한쪽에서 들면 다른 쪽 피드에 뜨는지 보면 됩니다.

---

## 2. Cloudflare Pages에 올리기

### 가장 쉬운 방법: 드래그해서 올리기

1. [dash.cloudflare.com](https://dash.cloudflare.com) 가입
2. **Workers & Pages → Create → Pages → Upload assets**
3. 프로젝트 이름 `online-gym` → **`public` 폴더를 통째로 끌어다 놓기** → **Deploy**
4. `https://online-gym.pages.dev` 같은 주소가 나옴 (이름이 이미 있으면 뒤에 글자가 붙음)

수정한 걸 다시 올릴 땐: 같은 프로젝트 → **Create deployment** → `public` 폴더 다시 끌어다 놓기

### 명령어로 올리기 (선택)

```powershell
npx wrangler login
```

```powershell
npx wrangler pages deploy public --project-name online-gym
```

---

## 3. 자동 깨우기 (Supabase 일시정지 방지)

Supabase 무료는 일주일 동안 아무 요청이 없으면 잠듭니다. 하루 한 번 순위판을 불러서 깨워 두는 작업입니다.

1. `keepalive/wrangler.toml`의 `SUPABASE_URL`, `SUPABASE_ANON_KEY`에 1번에서 복사한 값 넣기
2. 배포

```powershell
cd keepalive
```

```powershell
npx wrangler login
```

```powershell
npx wrangler deploy
```

3. 확인: 배포 후 나오는 주소(`https://online-gym-keepalive.xxx.workers.dev`)를 열어서 `supabase ping: 200` 이 나오면 정상
   매일 새벽 3시(한국 시간)에 자동으로 돌아갑니다.

---

## 4. 올린 다음에 할 것

- [ ] **카톡 미리보기**: `public/index.html`의 `og:image`를 실제 주소로 (`https://내주소/og.png`)
- [ ] **문의 이메일**: `public/about.html`, `public/privacy.html`의 노란 표시 부분에 이메일 주소
- [ ] **실제 폰으로 한글 입력 테스트**: 아이폰 사파리, 안드로이드 크롬

---

## 5. 광고 붙이기 (나중에)

1. **도메인 사기**: Cloudflare → Domain Registration (.com 1년 약 10달러)
   → Pages 프로젝트 → **Custom domains** 에서 연결
2. 4번의 이메일을 꼭 채운 상태로 [애드센스](https://adsense.google.com) 가입 → 사이트 추가
3. 애드센스가 주는 확인 코드를 `public/index.html`의 `<head>`에 넣기 (자리 표시해 둠)
4. 애드센스가 알려주는 내용으로 `public/ads.txt` 파일 만들기
5. 승인되면 **광고 단위**(디스플레이, 반응형)를 두 개 만들고 `public/config.js`에 입력
   - `adsenseClient`: `ca-pub-...`
   - `adSlots.side`, `adSlots.bottom`: 광고 단위 ID
6. 다시 배포

광고 자리는 피드·순위 옆과 페이지 맨 아래뿐입니다. 입력칸이나 운동 화면 근처에는 두지 마세요 (실수 클릭은 정책 위반).

---

## 무료 한도 (2026년 기준, 바뀔 수 있음)

| 서비스 | 한도 | 넘치면 |
|---|---|---|
| Supabase | 실시간 동시 접속 약 200명, 메시지 월 약 200만 개, DB 500MB | 넘친 사람은 혼자 연습 모드로 (사이트는 안 죽음) |
| Cloudflare Pages | 정적 파일 요청 무제한 | — |
| Cloudflare Workers | 하루 10만 요청 (깨우기는 하루 1번) | — |

## 순위 조작 방지 (DB 함수 `gym_event`가 검사)

- 들기 시작을 알린 그 무게·운동의 결과만 받음
- 시작하고 3초 안에 끝난 성공은 무시
- 최고 기록보다 한 번에 20kg 넘게 뛴 기록은 무시 (처음엔 100kg까지)
- 닉네임은 게임이 만드는 "형용사 명사" 조합만, 응원은 정해진 문구만
- 브라우저는 기록 테이블에 직접 쓰거나 읽을 수 없음

천천히 조금씩 올리는 스크립트까지 완전히 막지는 못합니다. 재미로 하는 순위 정도로 생각해 주세요.

## 닉네임 단어·응원 문구를 바꿀 때

`public/shared.js`를 고친 뒤

```powershell
node supabase/make-schema.js
```

→ 새로 만들어진 `supabase/schema.sql`을 Supabase SQL Editor에서 다시 Run.
