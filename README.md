# 투표 앱

질문을 올리면 사람들이 선택지 중 하나를 골라 투표하고 결과를 보는 간단한 웹앱이에요. 도메인 용어는 [CONTEXT.md](CONTEXT.md), 설계 결정은 [docs/adr/](docs/adr/), 작업 티켓은 `.scratch/voting-app/`에 있어요.

## 준비

1. `.env.local`에 Neon Postgres 연결 문자열을 넣어요.

   ```
   DATABASE_URL=postgres://...
   OPERATOR_PASSWORD=...
   ```

   `OPERATOR_PASSWORD`는 오른쪽 위 "운영자 로그인"(`/operator/login`)에서 입력하는 비밀번호예요. 비워 두면 아무도 운영자로 로그인할 수 없어요. 바꾸면 로그인해 있던 운영자는 모두 로그아웃돼요.

2. 의존성을 설치하고 스키마를 만들어요. `db/migrations/`의 SQL 파일 중 아직 적용되지 않은 것만 순서대로 실행돼요.

   ```bash
   npm install
   npm run db:migrate
   ```

3. 개발 서버를 띄우고 http://localhost:3000 을 열어요.

   ```bash
   npm run dev
   ```

## 테스트

```bash
npm test          # Vitest
npm run typecheck
```

테스트는 가짜 저장소 없이 `.env.local`의 `DATABASE_URL`이 가리키는 **실제 DB**에 붙어요. 테스트는 데이터를 지우지 않고, 테스트마다 고유한 ID(`test-creator-…`)를 써서 서로 섞이지 않게 해요. 그래서 테스트용 Poll이 DB에 계속 쌓여요. 운영 데이터가 생기면 테스트 전용 Neon 브랜치로 분리하세요.
