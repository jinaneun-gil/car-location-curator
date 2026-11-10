# 차량용 위치 큐레이션 앱 웹 프로토타입

공모전 시연 영상용 프로토타입이다. 실제 Pleos SDK를 쓰지 않고 차량 화면과 차량 신호를 브라우저에서 흉내 낸다.
앱 이름은 임시이며 `shared/app.js`의 `NAME` 한 곳에서만 바꾼다.

## 실행
설치할 것은 없다. `index.html`을 Chrome으로 연다.
판단 엔진 시험: `node a/planner.test.js`

## 담당자
- **A = 대표자**: `a/`, `phone/`, `../android/` 담당
- **B = 팀원**: `b/` 담당

작업을 시작할 때 사용자에게 A인지 B인지 먼저 확인하고, 그 담당 폴더만 수정한다.

## 담당 폴더 (자기 폴더만 수정)
- `a/` 판단 담당: 경로(`route.js`), 시간표 계산(`planner.js`), 조작 패널과 시뮬레이션(`sim.js`)
- `b/` 소리·화면·콘텐츠 담당: 콘텐츠(`content.js`), 음성(`audio.js`), 차량 화면(`screen.js`, `style.css`)
- `phone/` (A 담당) 휴대폰 동반 앱 화면: 쿠폰함, 광고주 등록과 성과 (진짜 앱이 아니라 같은 페이지 안의 시뮬레이션)
- 판단 규칙의 기준은 웹의 `a/planner.js`다. 수치나 규칙을 바꾸면 `android/.../Planner.kt`와 `PlannerTest.kt`도 함께 맞춘다.
- 시연 경로를 바꾸면 `android/app/src/main/assets/route.json`도 다시 만든다.
- 시간표 엔진의 입력은 장소까지 남은 거리(`distanceM`)다. 지금은 `route.js`의 데모 경로가 계산하고, 실제 앱에서는 내비·위치 데이터로 바꾼다.
- `shared/app.js` 두 사람의 약속. 바꿀 때는 서로 합의한다.

## 두 사람의 약속
- A가 B에게: `App.play({ contentId, version })` (`version`은 `short` 또는 `long`)
- A가 B에게: `App.interruptForNavi(text)` 내비 안내 때문에 설명을 멈추고 안내를 말한다
- A가 B에게: `App.setMode('driving' | 'parked')`, `App.showVehicle(state)`, `App.showWaypoint(name)`
- B가 A에게: `App.onFinished(contentId)` 재생이 끝남
- B가 A에게: `App.onCommand('next' | 'stop' | 'go')` 버튼이나 음성 명령
- B가 A에게: `App.setPreferences({ consent, interests })` 맞춤 광고 동의 여부와 고른 관심사
- B가 A에게: `App.onCouponSaved(contentId)` 쿠폰 저장

## 콘텐츠 형식
`b/content.js`에 작성한다. 배열 부분은 순수 JSON으로 유지한다 (함수, 주석, 끝 쉼표 금지). 안드로이드 앱이 같은 배열을 읽고, `node a/planner.test.js`가 형식을 검사한다. 필드: `id`, `type`(`story` 또는 `ad`), `name`, `category`, `lat`, `lon`, `importance`(1~5), `short`(약 10초), `long`(약 40초).
홍보는 추가로 `sponsor`, `bid`(1~5), `coupon`을 넣는다.

## 규칙
- 실제 장소의 설화·역사는 AI가 지어낼 수 있다. 출처를 확인한 내용만 쓴다.
- 홍보 상호는 전부 가상으로 쓴다.
- 맞춤 광고에는 직접 고른 관심사와 쿠폰 저장 이력만 쓴다. 속도, 브레이크, 경로 같은 운전 데이터로 사람을 타기팅하지 않는다.
- 광고주가 고를 수 있는 노출 조건은 위치, 노출 범위, 기간, 시간대, 업종, 우선순위뿐이다. 속도나 운전 습관을 조건으로 넣지 않는다.
- 동의는 동의 버튼을 누른 경우만 인정한다. 철회하면 쿠폰 이력과 관심사를 즉시 지운다.
- 경로는 애월~곽지 일주서로 실제 도로 좌표다 (OpenStreetMap 기여자, 영상 끝에 출처 표기). 콘텐츠 좌표는 임시값이니 실제 장소로 바꾼다. 경로에서 멀면 재생 시점이 어긋난다.
- 화면과 음성은 직접 브라우저에서 확인한 뒤에만 완료로 친다.
- 저장소와 영상에 실명, 계정 정보가 드러나지 않게 한다.
- 영상과 기획서에 차량 신호는 시뮬레이션이라고 밝힌다.
