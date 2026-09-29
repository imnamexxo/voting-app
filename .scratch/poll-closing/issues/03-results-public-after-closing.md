# 03: 마감 후 Results 전체 공개

**What to build:** Poll이 Closed가 되면 Vote는 더 바뀌지 않으므로, Vote하지 않은 사람을 포함해 누구나 Results를 볼 수 있다. Closed 전에는 기존 규칙(Vote한 사람과 Creator만)이 그대로다. Closed Poll의 Results는 열린 Poll과 같은 퍼센트 막대, Option별 "N표 · N%", 총 Vote 수, 내 선택 강조로 보인다.

**Blocked by:** 01 (Closing time 정하고 보기)

**Status:** ready-for-agent

- [x] `getResults({ pollId, viewerId, now })`는 Closed Poll의 Results를 누구에게나 `status: "visible"`로 돌려준다. `reason` 우선순위는 `"voted"` → `"closed"` → `"creator"`다
- [x] Closed 전에는 공개 규칙이 그대로다(숨김 / voted / creator)
- [x] Closed Poll 페이지에서 Vote하지 않은 사람에게도 Results가 보인다
- [x] Closed Poll에서 Vote했던 Voter는 자기 선택이 강조된 Results를 본다
- [x] Closed Poll에서 Creator에게 "투표하기 전에도 결과를 볼 수 있어요" 안내가 나오지 않는다
- [x] 페이지는 `reason`과 `closed`만 보고 화면을 고르고, 공개 규칙을 다시 계산하지 않는다
- [x] Poll 모듈 테스트: Closed Poll에서 Vote 안 한 사람 → `"closed"`, Vote했던 Voter → `"voted"`와 자기 선택, Vote 안 한 Creator → `"closed"`

## Comments

- 구현 완료. `getResults`가 `closes_at`을 함께 읽고 `now`로 Closed를 판단한다. Poll 페이지는 `getPoll`과 `getResults`에 같은 `now`를 넘겨서 두 호출이 Closed 여부에서 어긋나지 않는다. 페이지 분기는 `closed`와 `reason`만 본다.
- headless Chrome(360px)으로 확인: 마감된 Poll(2표/1표)을 Vote하지 않은 브라우저와 Creator 쿠키로 열면 둘 다 "2표 · 67%", "1표 · 33%", "총 3표"가 보이고 Vote 폼과 Creator 안내는 없다. 마감 전에 Vote한 브라우저는 마감 뒤에도 "내 선택" 강조를 본다. 가로 스크롤 0.
