# 05: Results 공개 규칙

**What to build:** 다른 사람의 선택이 판단에 영향을 주지 않도록, Voter는 Vote하기 전에는 Results를 볼 수 없다. Creator(Poll을 만든 브라우저)는 Vote하지 않아도 자기 Poll의 Results를 언제든 보고, 원하면 자기 Poll에 Vote할 수도 있다. 공개 규칙은 페이지가 아니라 Poll 모듈 안에 있다.

**Blocked by:** 03 (Vote하고 Results 보기)

**Status:** ready-for-agent

- [ ] `getResults`는 viewer가 Vote하지 않았고 Creator도 아니면 "볼 수 없음"을 돌려준다
- [ ] Vote하지 않은 Voter에게는 Results 없이 Vote 폼만 보이고, Results로 가는 URL을 직접 열어도 수치가 드러나지 않는다
- [ ] Creator에게는 Vote 전에도 Results가 보이고, 같은 페이지에서 Vote도 할 수 있다
- [ ] Creator가 Vote하면 다른 Voter처럼 자기 선택이 강조된다
- [ ] Vote 안 한 Voter / Vote한 Voter / Creator 세 경우를 다루는 Poll 모듈 테스트가 있다
