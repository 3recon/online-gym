# 배포하는 법 (전부 무료)

구성: **Cloudflare Pages**(사이트, https://online-gym.pages.dev) + **Cloudflare Worker**(Supabase를 하루 한 번 깨우기) + **Supabase**(접속자·피드·순위)

둘 다 GitHub 저장소(`3recon/online-gym`)에 연결돼 있어서 `main`에 푸시하면 각각 자동으로 배포됩니다.
사이트로 나가는 건 `public` 폴더뿐이고, `server.js`는 내 컴퓨터에서 테스트할 때만 씁니다.

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
4. 같은 두 값을 두 군데에 붙여넣기
   - `public/config.js`의 `supabaseUrl`, `supabaseAnonKey` (사이트용)
   - `wrangler.toml`의 `SUPABASE_URL`, `SUPABASE_ANON_KEY` (하루 한 번 깨우기용)
5. 커밋하고 푸시 → 자동 배포

> **service_role 키(또는 secret 키)는 어디에도 넣지 마세요.** 이 프로젝트는 그 키가 필요 없습니다.

### 내 컴퓨터에서 먼저 확인 (선택)

```powershell
npm start
```

http://localhost:3000 을 브라우저 두 개로 열어서 한쪽에서 들면 다른 쪽 피드에 뜨는지 보면 됩니다.

---

## 2. Cloudflare에 GitHub 저장소 연결 (처음 한 번, 이미 해 둠)

### 사이트: Pages

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages** 탭 → **Git에 연결**
2. `3recon/online-gym` 선택
3. 프로젝트 이름 `online-gym`, 프레임워크 없음, 빌드 명령 **비워 두기**, 빌드 출력 디렉터리 **`public`**
4. **저장 및 배포** → `https://online-gym.pages.dev`

빌드 로그에 `wrangler.toml` 관련 경고가 나오는 건 무시해도 됩니다 (그 파일은 아래 Worker용).

### Supabase 깨우기: Worker

1. **Workers & Pages → Create → Import a repository** → `3recon/online-gym`
2. 프로젝트 이름 `online-gym` (`wrangler.toml`의 `name`과 같아야 함), 빌드 명령 비워 두기, 배포 명령 `npx wrangler deploy`
3. 매일 새벽 3시(한국 시간)에 `wrangler.toml`의 Supabase 주소로 요청을 한 번 보냄. 주소는 없음

---

## 3. 올린 다음에 할 것

- [x] **카톡 미리보기**: `public/index.html`의 `og:url`, `og:image`를 실제 주소로 (도메인을 바꾸면 다시)
- [ ] **문의 이메일**: `public/about.html`, `public/privacy.html`의 `TODO 이메일` 부분
- [ ] **실제 폰으로 한글 입력 테스트**: 아이폰 사파리, 안드로이드 크롬

---

## 4. 광고 붙이기 (나중에)

1. 일단 무료 주소로 신청해 보고, 거절되면 **도메인 사기**: Cloudflare → Domain Registration (.com 1년 약 10달러)
   → Pages 프로젝트 → **Custom domains** 에서 연결 (`og:url`, `og:image`도 새 주소로)
2. 3번의 이메일을 꼭 채운 상태로 [애드센스](https://adsense.google.com) 가입 → 사이트 추가
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
| Cloudflare Pages | 정적 파일 요청 무제한, 빌드 월 500번 | — |
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
