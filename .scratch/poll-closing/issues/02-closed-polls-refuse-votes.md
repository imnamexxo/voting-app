# 02: 마감된 Poll은 Vote를 받지 않음

**What to build:** Closing time이 지나 Closed가 된 Poll에는 더 이상 Vote할 수 없다. 마감 전에 열어 둔 폼으로 늦게 보내도 거부된다. Closed Poll 페이지에는 Vote 폼 대신 "투표가 마감되었어요" 안내와 마감 시각이 나온다. Closed 때문에 거부된 Vote는 Poll 페이지로 돌아가 이 안내를 보여 준다. 브라우저당 한 표 규칙은 그대로다.

**Blocked by:** 01 (Closing time 정하고 보기)

**Status:** ready-for-agent

- [x] `castVote({ ..., now })`가 Closed Poll에 대해 `{ status: "closed" }`를 돌려주고 Vote를 저장하지 않는다. Closed 판단은 insert 조건 안에 있어서, 확인과 저장 사이에 마감이 끼어들 수 없다
- [x] 결과 우선순위: poll-not-found → closed → option-not-in-poll → already-voted. 이미 Vote한 Voter가 Closed Poll에 다시 보내도 `"closed"`다
- [x] 열린 Poll(마감 없음, 또는 Closing time 전)에서는 Vote가 지금처럼 동작한다
- [x] Vote 액션은 `"closed"`를 받으면 Poll 페이지로 redirect한다
- [x] Closed Poll 페이지에는 Vote 폼이 없고, "투표가 마감되었어요"와 마감 시각(Asia/Seoul, 기존 형식)이 나온다
- [x] Poll 모듈 테스트: Closed Poll에 Vote하면 거부되고 집계되지 않음, 이미 Vote한 Voter도 `"closed"`, Closing time 직전에는 Vote됨

## Comments

- 구현 완료. Closed 판단(`closes_at IS NULL OR closes_at > now`)을 Vote INSERT의 WHERE에 넣어서 확인과 저장이 한 문장에서 일어난다. 저장되지 않았을 때 이유를 묻는 쿼리도 같은 `now`를 쓴다.
- Vote 액션은 `"closed"`도 기존처럼 Poll 페이지로 redirect한다(별도 분기 없이 같은 경로).
- headless Chrome(360px)으로 확인: 25초 뒤 마감되는 Poll을 열어 두고 마감 뒤에 제출하면 Poll 페이지로 돌아가 "투표가 마감되었어요"와 "9월 29일 (화) 오전 9:31에 마감되었어요."가 나오고, Vote 폼과 "…까지 투표할 수 있어요"는 없다. DB에도 Vote가 저장되지 않았다. 가로 스크롤 0.
