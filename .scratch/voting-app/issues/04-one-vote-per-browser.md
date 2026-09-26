# 04: 브라우저당 한 표

**What to build:** 한 브라우저(Voter)는 Poll 하나에 한 번만 Vote할 수 있다(ADR-0001). 이미 Vote한 Voter가 Poll을 다시 열면 Vote 폼 대신 자기 선택이 강조된 Results가 보인다. 새로고침, 두 번 클릭, 동시에 들어온 두 요청 모두 Vote는 하나만 저장된다. 시크릿 창이나 다른 브라우저로 우회할 수 있다는 점은 알고 받아들인다.

**Blocked by:** 03 (Vote하고 Results 보기)

**Status:** ready-for-agent

- [ ] `votes`의 (poll_id, voter_id)에 유일성 제약을 거는 마이그레이션이 있다. 03 이후 DB에 쌓였을 수 있는 중복 Vote를 먼저 정리해야 마이그레이션이 실패하지 않는다(가장 이른 Vote만 남김)
- [ ] 같은 Voter의 두 번째 `castVote`는 오류가 아니라 "이미 Vote함" 결과를 돌려준다
- [ ] 같은 Voter가 동시에 보낸 두 `castVote` 중 하나만 저장되고, 다른 하나는 "이미 Vote함"이 된다 (테스트로 검증)
- [ ] 이미 Vote한 Voter가 Poll 페이지를 열면 Vote 폼 대신 Results가 보인다
- [ ] 제출 중에는 Vote 버튼이 비활성화된다
