# 01: Closing time 정하고 보기

**What to build:** Creator가 Poll을 만들 때 선택적으로 Closing time을 정할 수 있고, 열린 Poll의 페이지에 언제까지 Vote할 수 있는지 한국 시간으로 보인다. 비워 두면 지금처럼 마감 없는 Poll이다. 모든 시간 판단은 앱 서버 시계를 기준으로 하며, Poll 모듈의 시간 관련 함수는 테스트용으로 선택 인자 `now`를 받는다(스펙 참고). 구현 전에 `node_modules/next/dist/docs/`의 해당 가이드를 확인한다.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] 마이그레이션이 `polls`에 nullable `closes_at timestamptz`를 추가하고, 기존 Poll은 마감 없음으로 남는다
- [x] `createPoll`이 선택 인자 `closingTime`과 `now`를 받는다. `closingTime`이 `now`보다 뒤가 아니면 필드 오류 `closingTime`("마감 시간은 지금보다 뒤여야 해요.")으로 거부하고, 다른 필드 오류와 함께 한 번에 돌려준다
- [x] `getPoll(pollId, { now })`가 `closingTime`(없으면 null)과 `closed`를 돌려준다. 정확히 Closing time이 되면 `closed`는 true다
- [x] 만들기 폼에 선택 항목인 `datetime-local` 입력칸이 있다. JS가 켜져 있으면 브라우저 시간대 오프셋이 붙은 값을 보내고, JS가 꺼져 오프셋 없는 값이 오면 Asia/Seoul로 해석한다. 해석할 수 없는 값은 `closingTime` 오류다
- [x] 다른 이유로 제출이 거부되어도 입력한 Closing time이 유지된다(JS 켜짐/꺼짐 모두)
- [x] Closing time이 있는 열린 Poll 페이지에 "10월 3일 (금) 오후 6:00까지 투표할 수 있어요" 형식(Asia/Seoul)의 안내가 나오고, Closing time이 없는 Poll에는 나오지 않는다
- [x] Poll 모듈 테스트: 마감 없는 Poll은 Closed가 아님, 미래 Closing time은 그 전에는 열림·그 시각부터 Closed, 과거·현재 Closing time은 거부
- [x] 360px에서 만들기 폼과 Poll 페이지에 가로 스크롤이 없다(headless Chrome 확인)

## Comments

- 구현 완료. `closingTime`은 ISO 문자열로 받는다. 오프셋이 있으면 그대로, 없으면 Asia/Seoul(+09:00)로 읽고, 빈 값은 마감 없음, 형식이 맞지 않거나 날짜가 아닌 값은 "마감 시간을 다시 골라 주세요." 오류다.
- 폼은 `datetime-local` 값을 `closingTimeLocal`로 보내고, JS가 켜지면(하이드레이션 뒤) 같은 값에 브라우저 오프셋을 붙인 `closingTime` hidden 입력을 함께 보낸다. 액션은 `closingTime`이 있으면 그것을, 없으면 `closingTimeLocal`을 쓴다. 폼에는 항상 오프셋 없는 원래 값을 되채운다.
- headless Chrome(360px)으로 확인: 브라우저 시간대를 America/New_York으로 두고 10월 5일 18:00을 고르면 "10월 6일 (화) 오전 7:00까지 투표할 수 있어요"가 나온다. JS를 끄면 같은 입력이 "10월 5일 (월) 오후 6:00까지"가 된다. 중복 선택지로 거부되어도 JS 켜짐/꺼짐 모두 마감 시간이 유지된다. 과거 시각은 필드 옆 오류로 거부된다. 마감 없는 Poll에는 안내가 없다. 홈과 Poll 페이지 모두 가로 스크롤 0.
- 이 환경의 Node(ICU 78)는 `ko-KR`에서 오전/오후를 "AM"/"PM"으로 찍는다. 그래서 `formatToParts`에 24시간제를 받아 오전/오후를 직접 붙인다.
