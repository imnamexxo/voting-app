# Spec: Poll 마감 시간과 제작자 표시

Status: ready-for-agent

## Problem Statement

Creator는 "금요일 저녁까지만 의견을 받자"처럼 정해진 시각까지만 Vote를 받고 싶지만, 지금 Poll은 한 번 만들면 끝없이 열려 있다. 링크를 늦게 연 사람이 이미 끝난 투표에 Vote하거나, Creator가 언제 결과를 확정할지 알 수 없다. 또 마감 뒤에 링크를 연 사람은 Vote할 수도 없고 Results도 볼 수 없어서, 결과가 어떻게 났는지 알 방법이 없다. 이와 별개로, 앱 화면 어디에도 이 앱을 만든 사람이 표시되지 않는다.

## Solution

Creator는 Poll을 만들 때 선택적으로 Closing time(마감 시간)을 정할 수 있다. Closing time이 있는 Poll의 페이지에는 언제까지 Vote할 수 있는지 한국 시간으로 보인다. Closing time이 지나면 Poll은 Closed(마감됨)가 되어 더 이상 Vote를 받지 않는다. 페이지에는 Vote 폼 대신 "투표가 마감되었어요" 안내와 Results가 나오고, 이때 Results는 Vote 여부와 관계없이 누구나 볼 수 있다. Closing time이 없는 Poll은 지금처럼 계속 열려 있다. 모든 화면 하단에는 "제작: 유소영"이 표시된다. 기존의 Poll 만들기, Vote, Results 확인, 퍼센트 막대와 총 Vote 수 표시, 브라우저당 한 표 규칙은 그대로 유지된다.

## User Stories

### Closing time 정하기

1. As a Creator, I want to optionally set a Closing time when I create a Poll, so that Votes are only collected until then.
2. As a Creator, I want to leave the Closing time empty, so that a Poll with no deadline stays open as it does today.
3. As a Creator, I want to pick the Closing time with a date-and-time field, so that I don't have to type a date format by hand.
4. As a Creator, I want the Closing time I pick to mean my own local time, so that "6 PM" is 6 PM where I am.
5. As a Creator, I want a Closing time that isn't in the future to be rejected with a message next to the field, so that I don't create a Poll that is already Closed.
6. As a Creator, I want the Closing time I entered to be kept when my submit is rejected for another reason, so that I don't have to pick it again.
7. As a Creator, I want the other existing validation rules (question, number of Options, duplicates) to keep working together with the Closing time, so that nothing I relied on changes.

### Closing time 전에

8. As a Voter, I want to see until when I can vote on a Poll, so that I know how long I have.
9. As a Voter, I want that time shown in Korean time and a familiar Korean format (for example "10월 3일 (금) 오후 6:00까지 투표할 수 있어요"), so that I read it at a glance.
10. As a Voter, I want no Closing-time notice on a Poll without a Closing time, so that the page stays uncluttered.
11. As a Voter, I want to vote normally until the Closing time, so that the Poll works as before while it is open.
12. As a Creator, I want to see my Poll's Results before it closes, as today, so that I can track responses.
13. As a Voter, I want Results to stay hidden until I vote while the Poll is open, as today, so that other people's choices don't sway mine.

### Closing time 이후

14. As a Voter, I want a Vote I submit after the Closing time to be refused, so that the outcome can't change once the Poll is Closed.
15. As a Voter, I want a Vote submitted from a form I opened before the Closing time but sent after it to be refused too, so that the Closing time is a hard cutoff.
16. As a visitor, I want to see "투표가 마감되었어요" instead of the vote form on a Closed Poll, so that I understand why I can't vote.
17. As a visitor who never voted, I want to see the Results of a Closed Poll, so that I can learn the outcome.
18. As a Voter who voted before the Poll closed, I want to still see my choice highlighted in the Results, so that I remember my Vote.
19. As a Creator, I want to see the Results of my Closed Poll, and no longer see a note suggesting I can still vote, so that the page matches reality.
20. As a Voter, I want a Vote refused because the Poll closed to bring me to the Closed Poll page, so that I immediately see the notice and the Results.
21. As a Voter, I want the Closed notice to also say when the Poll closed, so that I know it isn't a bug.

### Results 표시 (유지)

22. As a Voter, I want each Option's Results shown as a percentage bar with its Vote count and percentage, so that I can compare Options at a glance.
23. As a Voter, I want the total number of Votes shown, so that I know how many people took part.
24. As a Voter, I want the percentage bars and total to look the same on a Closed Poll as on an open one, so that the display is consistent.

### 제작자 표시

25. As a visitor, I want to see "제작: 유소영" at the bottom of every screen, so that I know who made the app.
26. As a visitor, I want that credit to be clearly separate from the Poll's Creator, so that I don't confuse the app's author with the person who made the Poll.
27. As a visitor on a phone, I want the footer to fit at 360px width without horizontal scrolling, so that the page stays usable.

### 기존 동작 유지

28. As a Voter, I want the one-Vote-per-browser rule to keep working on Polls with a Closing time, so that Results stay trustworthy.
29. As a Creator, I want Polls created before this change to keep working with no Closing time, so that existing links don't break.

## Implementation Decisions

- **도메인 용어**: CONTEXT.md의 Closing time(마감 시간), Closed(마감됨)를 쓴다. 앱 제작자 표시는 도메인 개념이 아니므로 Creator라는 말을 쓰지 않는다.
- **시각의 기준은 하나**: 모든 시간 판단(생성 시 "미래인가", Vote 시 "Closed인가", Results 공개 여부)은 앱 서버 시계를 기준으로 한다. Poll 모듈의 시간 관련 함수는 선택 인자 `now`(기본값: 현재 시각)를 받는다. 테스트가 시간을 통제할 수 있게 하는 system boundary다. DB의 `now()`는 쓰지 않는다.
- **스키마**: `polls`에 nullable `closes_at timestamptz` 열을 추가하는 마이그레이션. 기존 Poll은 NULL(마감 없음)로 남는다.
- **Poll 모듈 인터페이스 변경**:
  - `createPoll({ question, options, creatorId, closingTime?, now? })`. `closingTime`이 있으면 `now`보다 뒤여야 한다. 아니면 `PollValidationError`의 필드 오류 `closingTime`으로 거부한다. 기존 필드 오류와 함께 한 번에 돌려준다.
  - `getPoll(pollId, { now? })`는 Poll에 `closingTime`(없으면 null)과 `closed`(boolean)를 더해 돌려준다.
  - `castVote({ pollId, optionId, voterId, now? })`는 새 결과 `{ status: "closed" }`를 가진다. Closed 판단은 insert 조건에 포함되어, 확인과 저장 사이에 마감이 끼어들 수 없다. 결과 우선순위: poll-not-found → closed → option-not-in-poll → already-voted.
  - `getResults({ pollId, viewerId, now? })`: Closed인 Poll의 Results는 누구에게나 visible이다. `reason`에 `"closed"`를 추가한다. 우선순위: `"voted"`(viewer가 Vote함) → `"closed"` → `"creator"`. Closed가 아니면 기존 규칙(Vote한 사람과 Creator만)을 그대로 따른다.
- **Closing time 입력과 시간대**: 만들기 폼에 선택 항목인 `datetime-local` 입력칸을 둔다. JavaScript가 켜져 있으면 브라우저 시간대 기준 값을 오프셋이 붙은 ISO 문자열로 바꿔 보낸다. JavaScript가 꺼져 오프셋 없는 값이 오면 Asia/Seoul 기준으로 해석한다. 빈 값은 마감 없음이다. 해석할 수 없는 값은 `closingTime` 필드 오류다.
- **표시**: Closing time은 서버에서 `Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", ... })`로 "10월 3일 (금) 오후 6:00" 형식으로 그린다. 열린 Poll에는 "…까지 투표할 수 있어요", Closed Poll에는 "투표가 마감되었어요" 안내와 마감 시각을 보여 준다. 카운트다운이나 마감 순간의 자동 새로고침은 없다.
- **Poll 페이지 분기**: 페이지는 `getPoll`의 `closed`와 `getResults`의 `reason`만 보고 화면을 고른다. 공개 규칙을 페이지에서 다시 계산하지 않는다. Closed면 Vote 폼을 그리지 않는다. Creator 안내 문구("투표하기 전에도 결과를 볼 수 있어요")는 `reason === "creator"`일 때만 나오므로 Closed Poll에서는 나오지 않는다.
- **Vote 액션**: `castVote`가 `"closed"`면 Poll 페이지로 redirect해서 마감 안내와 Results를 보여 준다.
- **Results 표시(기능 2)**: 기존 퍼센트 막대, Option별 "N표 · N%", 총 Vote 수, 내 선택 강조를 그대로 쓴다. 변경 없음.
- **제작자 표시**: 루트 레이아웃에 모든 화면 공통 푸터를 두고 "제작: 유소영"을 표시한다. not-found와 오류 화면에도 보인다(루트 레이아웃 오류 시에는 제외).

## Testing Decisions

- **좋은 테스트의 기준**: 기존과 같다. Poll 모듈의 공개 인터페이스만 호출하고, 기대값은 독립적인 리터럴로 적는다. 시간은 `now` 인자로 통제하고, 실제로 기다리지 않는다.
- **seam은 하나**: Poll 모듈. 페이지, 푸터, 시간 형식은 자동 테스트하지 않고, 기존 headless Chrome 확인 스크립트(360px)로 수동 확인한다.
- **테스트 DB**: 기존과 같이 `.env.local`의 `DATABASE_URL`을 쓰고, 테스트마다 고유 ID로 격리한다.
- **다룰 시나리오**:
  - Closing time 없이 만든 Poll은 Closed가 아니다.
  - 미래의 Closing time으로 만든 Poll은 그 시각 전 `now`에서 열려 있고, 그 시각 이후 `now`에서 Closed다(경계: 정확히 그 시각이면 Closed).
  - 과거나 현재의 Closing time은 `closingTime` 필드 오류로 거부된다.
  - 열린 Poll에는 Vote가 되고, Closed Poll에는 `"closed"`로 거부되며 집계되지 않는다.
  - Closed Poll에는 이미 Vote한 Voter가 다시 보내도 `"closed"`다.
  - Closed Poll의 Results는 Vote하지 않은 사람에게도 `reason: "closed"`로 보인다.
  - Closed Poll에서 Vote했던 Voter는 `reason: "voted"`와 자기 선택을 받는다.
  - Closed Poll에서 Vote하지 않은 Creator는 `reason: "closed"`를 받는다.
  - 열린 Poll의 기존 공개 규칙(숨김 / voted / creator)이 그대로다.
- **기존 사례**: `lib/polls.test.ts`의 `pollWith`, `resultsSeenBy`, `rejectionOf` 도우미를 확장해 쓴다.

## Out of Scope

- Closing time 수정, 일찍 마감하기, 다시 열기
- 남은 시간 카운트다운, 마감 순간의 자동 화면 갱신
- 시간대 선택(표시는 Asia/Seoul 고정)
- Closing time의 최대 기간 제한
- Results 표시 방식 변경(득표순 정렬, 1위 강조 등)
- 루트 레이아웃이 실패했을 때의 오류 화면(`global-error`)과 그 화면의 푸터

## Further Notes

- grilling에서는 마감 판단을 DB 시계로 하기로 했다. 테스트가 시간을 통제할 수 있도록 to-spec 단계에서 사용자와 합의해 앱 서버 시계와 `now` 주입으로 바꿨다. 서버가 여러 대가 되면 시계 차이가 생길 수 있지만, 지금 규모에서는 받아들인다.
- Closed 뒤 Results 전체 공개는 되돌리기 쉬운 결정이라 ADR로 남기지 않았다.
- 기능 2(퍼센트 막대그래프와 총 Vote 수)는 원래 스펙의 티켓 03에서 이미 구현되었고, 이번 스펙은 그것을 유지하고 Closed Poll에서도 같게 보이도록 할 뿐이다.
