# 듀오 게시판 운영

## 반영 순서

이번 버전은 게시글 필드와 보안 규칙을 함께 바꾼다. 기존 규칙으로는 새 글 저장·완료·신고가 거부된다. 사이트 파일과 루트의 `firestore.rules`를 같은 배포 작업에서 반영한다.

1. Firebase 프로젝트 `gitpage-93dfb`의 `(default)` 데이터베이스에 최신 `firestore.rules`를 게시한다. 콘솔에서 파일 내용을 붙여 넣고 **게시**하거나, 로그인된 CLI에서 아래 명령을 실행한다.
2. GitHub Pages에 `index.html`, `privacy.html`, `styles/lol-home.css`, `scripts/lol-home.js`, `scripts/duo-core.mjs`, `scripts/duo-store.js`를 배포한다. 별도 복합 인덱스는 필요 없다.
3. 페이지를 새로고침하여 비로그인 조회, 로그인 후 저장·수정·완료, 5분 뒤 다시 모집을 확인한다.

```powershell
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules --project gitpage-93dfb
```

규칙과 프런트엔드가 서로 다른 버전인 짧은 전환 기간에는 글쓰기가 실패할 수 있다. 기존 글은 읽을 수 있고, 작성자가 저장할 때 새 필드가 추가된다. Riot API나 비공개 API 키는 사용하지 않는다.

## 데이터와 동작

- `duoPosts/{uid}`: 계정당 하나. `updatedAt`은 등록·끌어올리기 시각이며 정렬 기준이다. 내용 수정과 완료 시에는 유지한다. `modifiedAt`은 마지막 변경 시각이다.
- 모집 중인 글은 `updatedAt + 2시간`부터 화면에서 만료로 취급한다. 기본 검색은 모집 중만 표시하고, 상태 필터로 완료·만료 글도 확인할 수 있다. 스케줄러로 데이터를 지우지는 않는다.
- 등록·끌어올리기·삭제 후 재등록의 5분 대기 시간은 Firestore 규칙에서도 검증한다. 처음 등록하는 계정에는 대기 시간이 없다.
- 삭제는 공개 프로필과 메모를 제거하고 `status: deleted`, `updatedAt`, `modifiedAt`만 남긴다. UID와 시각을 남겨 삭제·재등록으로 대기 시간을 우회하지 못하게 한다. Firebase 콘솔에서 문서를 완전히 삭제하면 이 제한 기록도 제거된다.
- 50개씩 서버에서 읽는다. **이전 글 더 보기**는 다음 페이지, **전체 글 검색**은 남은 페이지를 끝까지 읽는다. 읽은 글에 검색 조건을 적용하며 검색 범위를 화면에 표시한다. 전체 검색은 중지할 수 있다. 데이터가 많아지면 읽기량에 맞춰 서버 검색·인덱스 구조를 확장한다.
- 다른 사용자의 새 글은 새로고침으로 확인한다. 내 글은 실시간 구독한다. 검색 중 동시에 갱신된 글은 새로고침하면 다시 정렬된다.
- 포지션 조건 내에서는 OR, 서로 다른 조건 사이에서는 AND로 검색한다. 검색의 ‘상관없음 포함’ 체크를 해제하면 특정 포지션만 찾을 수 있다. 등록 폼의 ‘상관없음’은 다른 포지션과 함께 선택되지 않는다.
- 검색 조건은 `duo.v2.filters`, 초안과 차단 목록은 `duo.v2.draft.{uid}`, `duo.v2.blocked.{uid}`에 브라우저별로 저장한다. 비로그인 차단 목록은 `guest`로 분리한다. 다른 기기와 동기화하지 않는다.
- 입력한 티어는 직접 입력한 정보이며 이메일 인증이 Riot 계정 소유를 증명하지 않는다. OP.GG 링크는 한국 서버 기준이다.

## 신고 처리

신고는 `duoReports/{신고대상UID}/reporters/{신고자UID}`에 저장한다. 사유·상세 설명·시각 및 신고 당시 ID·메모를 보관한다. 동일 대상 신고는 계정당 24시간에 한 번 가능하다. 신고자 본인 외의 일반 사용자는 읽을 수 없다.

운영자는 Firebase 콘솔의 Firestore 데이터 화면에서 `duoReports` 아래 신고 대상과 `reporters` 하위 컬렉션을 확인한다. 신고 대상 부모 문서가 비어 있어도 하위 컬렉션은 존재할 수 있다. 자동 알림, 자동 제재, 별도의 웹 관리자 화면은 없다.

운영자가 부적절한 글을 숨기려면 해당 `duoPosts/{uid}`의 `status`를 `closed`로 변경한다. 반복 악용은 Firebase Authentication에서 해당 계정을 사용 중지하고 게시글도 처리한다. 신고 검토 완료 후 불필요한 신고 사본은 운영자가 삭제한다.

## 검증

테스트는 운영 데이터를 쓰지 않는다. Node.js에 아래 패키지가 설치되어 있거나 `NODE_PATH`로 연결되어 있어야 한다.

- UI 테스트: `playwright`와 Chromium. `node scripts/test-duo-board.cjs` (Firebase 모듈만 테스트 대역 사용)
- 규칙·저장 함수 테스트: `firebase`, `@firebase/rules-unit-testing`, Firebase CLI, Java 21 이상

```powershell
npx firebase-tools emulators:exec --only firestore --project demo-partygame --config firebase.duo-test.json "node scripts/test-duo-rules.cjs"
```

규칙 테스트의 `PERMISSION_DENIED` 로그는 잘못된 요청이 거부되는지 검증하는 과정이다. 마지막 PASS와 종료 코드 0을 확인한다. UI 캡처는 `test-results/duo-board-desktop.png`, `test-results/duo-board-mobile.png`에 저장한다.
