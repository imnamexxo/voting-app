# 02: 마감된 Poll은 Vote를 받지 않음

**What to build:** Closing time이 지나 Closed가 된 Poll에는 더 이상 Vote할 수 없다. 마감 전에 열어 둔 폼으로 늦게 보내도 거부된다. Closed Poll 페이지에는 Vote 폼 대신 "투표가 마감되었어요" 안내와 마감 시각이 나온다. Closed 때문에 거부된 Vote는 Poll 페이지로 돌아가 이 안내를 보여 준다. 브라우저당 한 표 규칙은 그대로다.

**Blocked by:** 01 (Closing time 정하고 보기)

**Status:** ready-for-agent

- [ ] `castVote({ ..., now })`가 Closed Poll에 대해 `{ status: "closed" }`를 돌려주고 Vote를 저장하지 않는다. Closed 판단은 insert 조건 안에 있어서, 확인과 저장 사이에 마감이 끼어들 수 없다
- [ ] 결과 우선순위: poll-not-found → closed → option-not-in-poll → already-voted. 이미 Vote한 Voter가 Closed Poll에 다시 보내도 `"closed"`다
- [ ] 열린 Poll(마감 없음, 또는 Closing time 전)에서는 Vote가 지금처럼 동작한다
- [ ] Vote 액션은 `"closed"`를 받으면 Poll 페이지로 redirect한다
- [ ] Closed Poll 페이지에는 Vote 폼이 없고, "투표가 마감되었어요"와 마감 시각(Asia/Seoul, 기존 형식)이 나온다
- [ ] Poll 모듈 테스트: Closed Poll에 Vote하면 거부되고 집계되지 않음, 이미 Vote한 Voter도 `"closed"`, Closing time 직전에는 Vote됨
