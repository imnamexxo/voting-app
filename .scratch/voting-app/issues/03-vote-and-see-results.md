# 03: Vote하고 Results 보기

**What to build:** Voter가 Poll 페이지에서 Option 하나를 골라 Vote하면 곧바로 Results를 본다. Results에는 Option별 Vote 수와 비율, Option마다 간단한 막대, 전체 Vote 수가 나오고, 자신이 고른 Option이 강조된다. Vote 수는 페이지를 불러올 때 계산하고, 새로고침하면 다시 계산한다(실시간 아님). Voter는 01에서 만든 익명 ID 쿠키로 식별한다.

**Blocked by:** 01 (Poll 만들고 링크로 열기)

**Status:** ready-for-agent

- [x] 마이그레이션으로 `votes` 테이블(poll_id, option_id, voter_id, created_at)을 만든다
- [x] Poll 모듈에 `castVote({ pollId, optionId, voterId })`와 `getResults({ pollId, viewerId })`가 추가된다
- [x] Option을 고르지 않으면 제출할 수 없다
- [x] Vote하면 Results 화면이 나오고, Option별 수·비율, 막대, 전체 Vote 수, 내가 고른 Option 강조가 보인다
- [x] Vote가 0개인 Poll의 Results는 모든 Option을 0%로 보여 주고 오류가 나지 않는다
- [x] 해당 Poll에 속하지 않는 Option으로 Vote하면 거부된다("이 Poll의 Option이 아님")
- [x] 없는 Poll에 Vote하면 "Poll 없음" 결과를 돌려준다
- [x] 위 동작마다 Poll 모듈 테스트가 있다 (Results의 수·비율 계산 포함)

## Comments

- 구현 완료. 비율은 Option마다 `Math.round`로 반올림하므로 합이 100%가 아닐 수 있다(예: 1/1/1 → 33/33/33). 스펙이 합계를 요구하지 않아 그대로 둔다.
- Vote 폼은 Poll id를 hidden 입력으로 보낸다. `castVoteAction.bind(null, pollId)`로 보내면 JS 없는 POST가 30초 동안 멈췄다(Next.js 16.3.6).
- Poll 페이지는 지금 `chosenOptionId`가 있으면 Results, 없으면 Vote 폼을 보여 준다. 공개 규칙은 05에서 모듈로 옮긴다.
- 지금은 같은 Voter가 여러 번 Vote할 수 있다(04에서 막음). 개발 DB에 중복 Vote가 이미 있을 수 있다.
