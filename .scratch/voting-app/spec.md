# Spec: 투표 앱 MVP

Status: ready-for-agent

## Problem Statement

간단한 질문 하나에 대해 여러 사람의 의견을 빠르게 모으고 싶지만, 기존 설문 도구는 가입·설정 과정이 번거롭다. 질문과 선택지만 적으면 바로 링크를 공유할 수 있고, 받은 사람은 가입 없이 한 번 고르면 결과를 볼 수 있는 도구가 필요하다.

## Solution

누구나 가입 없이 Poll(질문 + Option 목록)을 만들고 고유 링크를 받는다. 링크를 연 Voter는 Option 하나를 골라 Vote하고, Vote한 뒤에 Results(Option별 표 수와 비율)를 본다. 한 브라우저에서는 Poll당 한 번만 Vote할 수 있다. Creator는 Vote하지 않아도 자기 Poll의 Results를 언제든 볼 수 있다. Poll은 마감되지 않는다.

## User Stories

### Poll 만들기

1. As a Creator, I want to create a Poll without signing up, so that I can start collecting opinions immediately.
2. As a Creator, I want to enter a question for my Poll, so that Voters know what they are choosing about.
3. As a Creator, I want to add between 2 and 10 Options, so that Voters have a meaningful but manageable set of choices.
4. As a Creator, I want to add and remove Option input fields while creating a Poll, so that I can adjust the number of Options before submitting.
5. As a Creator, I want to be stopped from submitting an empty question, so that I don't publish a meaningless Poll.
6. As a Creator, I want to be stopped from submitting empty or duplicate Options, so that every Option is distinct and meaningful.
7. As a Creator, I want leading and trailing whitespace trimmed from the question and Options, so that accidental spaces don't create near-duplicates.
8. As a Creator, I want to see a clear error message next to the invalid field, so that I know exactly what to fix.
9. As a Creator, I want to be taken to my new Poll after creating it, so that I can check it and share it right away.
10. As a Creator, I want a shareable link for my Poll, so that I can send it to others.
11. As a Creator, I want a one-click "copy link" button, so that sharing is effortless.
12. As a Creator, I want the Poll link to be hard to guess, so that strangers can't stumble onto my Poll by changing a number in the URL.

### Vote하기

13. As a Voter, I want to open a Poll link and see the question and its Options, so that I can decide what to choose.
14. As a Voter, I want to vote without signing up, so that participating takes only a few seconds.
15. As a Voter, I want to pick exactly one Option, so that my Vote is unambiguous.
16. As a Voter, I want the Options shown in the order the Creator entered them, so that the Poll reads as the Creator intended.
17. As a Voter, I want to be prevented from submitting without selecting an Option, so that I don't cast an empty Vote by accident.
18. As a Voter, I want to see my Results right after I vote, so that I get immediate feedback.
19. As a Voter, I want to see which Option I chose highlighted in the Results, so that I remember my own Vote.
20. As a Voter, I want to be shown the Results instead of the voting form when I revisit a Poll I already voted on, so that I don't get confused about whether my Vote counted.
21. As a Voter, I want a second Vote from the same browser to be rejected, so that Results aren't inflated by repeated clicks or refreshes.
22. As a Voter, I want double-clicking the submit button to count only once, so that a flaky connection doesn't cause an error or a duplicate Vote.

### Results 보기

23. As a Voter, I want Results hidden until I vote, so that other people's choices don't influence mine.
24. As a Voter, I want to see the number of Votes for each Option, so that I understand the outcome.
25. As a Voter, I want to see each Option's percentage of the total, so that I can compare Options at a glance.
26. As a Voter, I want a simple bar for each Option, so that the Results are easy to read visually.
27. As a Voter, I want to see the total number of Votes, so that I know how many people participated.
28. As a Voter, I want Results for a Poll with zero Votes to show 0% everywhere without errors, so that a brand-new Poll still displays correctly.
29. As a Voter, I want to refresh the page to see updated Results, so that I can check the latest counts.
30. As a Creator, I want to see my Poll's Results at any time without voting, so that I can track responses.
31. As a Creator, I want to still be able to vote on my own Poll, so that my own opinion counts too.

### 오류와 예외

32. As a visitor, I want a clear "Poll not found" page for an invalid or deleted link, so that I understand the link is wrong.
33. As a visitor, I want the app to work on my phone, so that I can vote from a link sent in a messenger.
34. As a Voter, I want a Vote for an Option that doesn't belong to the Poll to be rejected, so that tampered requests can't corrupt Results.
35. As a visitor, I want a friendly message if something goes wrong on the server, so that I know to try again.

### 홈

36. As a visitor, I want the home page to go straight to creating a Poll, so that the main action is obvious.

## Implementation Decisions

- **도메인 용어**: CONTEXT.md의 Poll / Option / Vote / Voter / Creator / Results를 코드와 문서 전체에서 쓴다. UI 문구는 한국어("투표", "선택지", "표")로 쓴다.
- **스택**: Next.js 16 App Router + React 19 + Tailwind 4 (이미 설치됨). 이 Next.js 버전은 기존 지식과 다를 수 있으므로 구현 전에 `node_modules/next/dist/docs/`의 해당 가이드를 확인한다.
- **저장소**: Neon Postgres, `@neondatabase/serverless` 드라이버 사용 (이미 설치됨). 연결 문자열은 환경 변수로 받는다. ORM 없이 SQL을 직접 쓴다.
- **Poll 도메인 모듈 (단일 deep module)**: 모든 영속화와 규칙을 이 모듈 하나가 담당하고, 페이지와 Server Action은 이 모듈만 호출한다. 인터페이스:
  - `createPoll({ question, options, creatorId })` → 생성된 Poll의 id. 검증 실패 시 필드별 오류를 담은 도메인 오류를 던진다.
  - `getPoll(pollId)` → Poll(question, 순서가 있는 Option 목록) 또는 없음.
  - `castVote({ pollId, optionId, voterId })` → 성공, 또는 "이미 Vote함" / "Poll 없음" / "이 Poll의 Option이 아님" 결과.
  - `getResults({ pollId, viewerId })` → Option별 Vote 수·비율, 전체 Vote 수, viewer가 고른 Option(있으면). viewer가 Vote하지 않았고 Creator도 아니면 "볼 수 없음"을 돌려준다. 결과 공개 규칙은 이 모듈 안에 둔다.
- **Voter/Creator 식별**: 첫 방문 시 추측하기 어려운 익명 ID를 httpOnly 쿠키로 발급하고, 같은 ID를 voterId와 creatorId로 함께 쓴다. 근거는 ADR-0001 참고.
- **스키마**:
  - `polls`: id(추측 불가능한 문자열, URL에 사용), question, creator_id, created_at
  - `options`: id, poll_id(FK), label, position
  - `votes`: poll_id, option_id(FK), voter_id, created_at. **(poll_id, voter_id)에 유일성 제약**을 걸어 중복 Vote를 DB 수준에서 막는다. 동시에 두 번 제출해도 하나만 저장되고, 나머지는 "이미 Vote함"으로 바뀐다.
  - option_id가 해당 poll_id에 속하는지는 castVote가 확인한다.
- **검증 규칙**: question은 trim 후 1–200자. Option은 trim 후 1–100자이고 2–10개이며, 대소문자를 무시해도 중복되면 안 된다.
- **라우트**: 홈(Poll 만들기 폼), Poll 페이지(Vote 폼 또는 Results), 없는 Poll용 not-found.
- **쓰기 작업**: Server Actions로 처리한다. 제출 중에는 버튼을 비활성화한다.
- **Results 갱신**: 실시간이 아니다. 페이지를 불러올 때 계산하고, 새로고침하면 다시 계산한다.
- **마이그레이션**: 스키마를 만드는 SQL 파일과, 그것을 실행하는 npm 스크립트를 둔다.

## Testing Decisions

- **좋은 테스트의 기준**: 외부 동작만 검증한다. 테스트는 Poll 도메인 모듈의 공개 인터페이스(createPoll / getPoll / castVote / getResults)만 호출하고, 테이블 구조나 SQL 같은 내부 구현을 직접 검사하지 않는다.
- **seam은 하나**: Poll 도메인 모듈. 페이지와 Server Action은 모듈을 얇게 호출하는 계층이므로 자동 테스트를 하지 않고 수동으로 확인한다. E2E 테스트는 이번 범위에 없다.
- **실제 Postgres로 테스트**: 테스트 전용 Neon 브랜치나 로컬 Postgres를 쓴다. in-memory 가짜 저장소는 만들지 않는다. 테스트마다 데이터를 격리한다(테스트마다 고유한 creator/voter ID를 쓰거나 테이블을 비운다).
- **테스트 러너**: Vitest를 새로 설치한다.
- **다룰 시나리오**: 정상 생성, 각 검증 규칙 위반, Vote 후 Results, 중복 Vote 거부, 동시에 들어온 중복 Vote 중 하나만 저장, 다른 Poll의 Option으로 Vote 시 거부, 없는 Poll, Vote 전 Results 비공개, Creator는 항상 Results를 볼 수 있음, Vote 0개인 Poll의 Results.
- **기존 사례**: 코드베이스에 테스트가 아직 없다. 이 스펙의 테스트가 첫 사례다.

## Out of Scope

- 로그인·계정과 계정 단위 중복 방지
- Poll 마감(수동 또는 마감 시각)
- Vote 변경·취소
- 여러 Option 동시 선택(복수 선택), 순위 투표
- 실시간 Results 갱신(WebSocket, 폴링)
- Poll 수정·삭제, Creator 대시보드, 내 Poll 목록
- 공개 Poll 목록·검색
- 봇 차단, 요청 속도 제한, CAPTCHA
- E2E 테스트

## Further Notes

- 이 스펙은 grilling 1라운드의 추천안을 사용자가 일괄 채택해 만들었다. 2라운드 항목(Vote 변경, Option 개수, 실시간 갱신)은 논의하지 않았고, 이 스펙에서 다음과 같이 가정했다: Vote 변경 불가, Option 2–10개, 새로고침으로만 갱신. 모두 나중에 쉽게 바꿀 수 있다.
- Creator 식별이 브라우저 쿠키에 묶여 있어, Creator가 쿠키를 지우거나 다른 기기를 쓰면 Vote하기 전에는 Results를 볼 수 없다. MVP에서는 받아들인다.
- 브라우저 단위 중복 방지는 우회할 수 있다(ADR-0001).
