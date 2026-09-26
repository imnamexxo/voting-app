# 01: Poll 만들고 링크로 열기

**What to build:** 방문자가 홈에서 질문과 Option들을 입력해 Poll을 만들면, 추측하기 어려운 고유 URL의 Poll 페이지로 이동한다. 그 페이지에서 질문과 Option을 입력한 순서대로 볼 수 있다. 잘못된 링크를 열면 "Poll을 찾을 수 없음" 페이지가 나온다. 이 티켓에서 나머지 티켓이 쓸 기반도 함께 만든다: Neon Postgres 연결(연결 문자열은 환경 변수), 스키마 마이그레이션 SQL과 그것을 실행하는 npm 스크립트, 실제 테스트 DB를 쓰는 Vitest 설정, 첫 방문 시 발급하는 익명 ID 쿠키(httpOnly, Creator 식별에 사용). 구현 전에 `node_modules/next/dist/docs/`에서 Next.js 16 가이드를 확인한다.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] 마이그레이션 스크립트로 `polls`, `options` 테이블을 만들 수 있다 (polls.id는 URL에 쓰는 추측 불가능한 문자열이고 creator_id를 가짐, options는 position을 가짐)
- [x] Poll 도메인 모듈에 `createPoll({ question, options, creatorId })`과 `getPoll(pollId)`가 있고, 페이지와 Server Action은 이 모듈만 호출한다
- [x] 홈 화면이 곧바로 Poll 만들기 폼이다
- [x] Poll을 만들면 새 Poll 페이지로 이동하고, 질문과 Option이 입력한 순서대로 보인다
- [x] Poll을 만든 브라우저의 익명 ID가 creator_id로 저장된다
- [x] 존재하지 않는 Poll id로 접속하면 not-found 페이지가 나온다
- [x] `npm test`가 실제 테스트 DB에 대해 Vitest를 실행하고, createPoll → getPoll 왕복과 없는 Poll 조회 테스트가 통과한다
- [x] 테스트 DB 연결 방법이 README에 적혀 있다

## Comments

- 구현 완료. 익명 ID 쿠키는 첫 방문이 아니라 Poll을 만드는 Server Action에서 발급한다. 테스트는 사용자 결정에 따라 `.env.local`의 `DATABASE_URL`(개발 DB)을 쓴다. 선택지를 모두 비운 직접 POST로 빈 Poll이 저장되는 문제가 있고, 02에서 막는다.
