# 04: 제작자 표시

**What to build:** 앱의 모든 화면 하단에 앱 제작자 "제작: 유소영"이 표시된다. Poll의 Creator("투표를 만든 사람")와 헷갈리지 않도록 이 문구만 쓴다. 이 표시는 도메인 개념이 아니므로 CONTEXT.md에 넣지 않는다.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] 루트 레이아웃에 공통 푸터가 있고 "제작: 유소영"이 보인다
- [x] 홈, Poll, Results, not-found, 오류 화면에 모두 보인다(루트 레이아웃 자체가 실패한 경우는 제외)
- [x] 360px에서 푸터 때문에 가로 스크롤이 생기지 않고, 내용이 짧은 화면에서도 푸터가 화면 아래쪽에 있다

## Comments

- 구현 완료. 루트 레이아웃의 `<body>`(이미 `min-h-full flex flex-col`)에 `mt-auto` 푸터를 두어 내용이 짧아도 화면 아래에 붙는다.
- headless Chrome(360px)으로 확인: 홈, 열린 Poll, 마감된 Poll(Results), Poll not-found, 오류 화면(프로덕션 빌드를 닿지 않는 DB로 띄움) 모두 "제작: 유소영"이 뷰포트 맨 아래에 있고 가로 스크롤 0.
- 남은 점: `/no-such-page` 같은 앱 밖 경로는 Next 기본 404(영어, 높이 `100vh`)가 나와서 푸터가 한 번 스크롤한 아래에 있다. 앱 전용 `app/not-found.tsx`를 두면 해결되지만 이번 범위가 아니라서 만들지 않았다.
