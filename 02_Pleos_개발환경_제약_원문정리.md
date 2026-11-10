# Pleos 차량용 앱 개발 환경과 제약 (원문 기반 정리)

> 공모전 개발 환경 페이지(https://appdevchallenge.auto-hmg.io/guide/development)와, 거기서 연결된 Pleos 공식 문서(https://document.pleos.ai) 전체를 정리함.
> 원문 문장을 최대한 그대로 두고 어려운 용어만 풀어 씀. 의견은 넣지 않았고, 꼭 필요한 보충 설명만 "(풀이)"로 표시. 코드는 핵심 설정만 남김.
> 정리일: 2026-11-04

---

## 0. 공모전 사이트의 "개발 환경" 페이지 원문

**개발 환경 요구사항**
Pleos 개발 문서의 개발 환경 요구사항을 기준으로 Android API 28 이상, Gradle 8.0 이상, Java 또는 Kotlin을 사용합니다. 문서와 대응하는 SDK 버전도 같은 페이지에 있습니다.

**Pleos Playground**
- Pleos는 현대자동차그룹의 소프트웨어 중심 모빌리티 브랜드입니다.
- Pleos Connect는 차량용 인포테인먼트(차 안 화면에서 정보와 오락을 제공하는 시스템) 플랫폼입니다.
- Pleos Playground는 Pleos의 개발자 포털입니다. 문서에서 주요 플랫폼과 개발에 필요한 정보를 확인할 수 있습니다.

**Pleos Connect SDK**
Pleos Connect 환경에서 동작하는 앱을 개발할 때 쓰는 개발 도구입니다.

| 기능 | SDK |
|---|---|
| 차량 정보 | Vehicle SDK |
| 위치 정보 | FusedLocation SDK |
| 길 안내 연동 | NaviHelper SDK |
| 음성 입출력 | TextToSpeech SDK · SpeechToText SDK |

각 SDK의 현재 제공 상태와 사용 조건은 개별 문서에서 확인해 주세요.

**예시 시나리오** (참고용 예시이며 실제 제공 여부를 보장하지 않음)
- 음성 메모 앱: SpeechToText SDK로 말한 내용을 받아 메모로 저장
- 차량 상태 알림 앱: Vehicle SDK로 받은 차량 데이터로 상태 변화를 알려줌
- 경로 연동 앱: NaviHelper SDK로 길 안내와 연결된 경로 정보를 제공

에뮬레이터로 앱 동작과 차량 데이터 연동을 확인할 수 있습니다.

**FAQ: 개발은 어떻게 시작하나요?**
- 순서: Pleos Connect 환경을 이해하고 → Pleos Playground 개발 문서를 보며 아이디어를 기획하고 → Pleos Connect SDK로 개발합니다.
- 접수양식 5번(개발 계획)에는 다음을 구체적으로 적어야 합니다.
  - Pleos Connect 환경에서 앱을 어떻게 구현할지
  - 주요 개발 범위
  - SDK/API 사용 계획

---

## 1. Pleos Connect SDK 전체 개요

Pleos Connect SDK는 Pleos Connect 환경에서 동작하는 인포테인먼트 앱을 개발하기 위한 통합 개발 도구입니다.
- 구글 **Android Automotive OS(AAOS, 차량용 안드로이드)**를 기반으로 만들어져 표준화된 인터페이스를 제공합니다.
- 복잡한 하드웨어 연동 과정 없이도 차량 관련 앱을 효율적으로 개발할 수 있습니다.

SDK의 API와 에뮬레이터로 구현할 수 있는 핵심 기능은 두 묶음입니다.
- 차량 제어 및 모니터링: Vehicle SDK, FusedLocation SDK
- 내비게이션 및 음성 서비스: NaviHelper SDK, SpeechToText SDK, TextToSpeech SDK

**모듈 구성**

| SDK | 제공하는 API |
|---|---|
| Vehicle SDK | 차량 상태 조회, 차량 제어 |
| NaviHelper SDK | 경로 안내 제어, 내비게이션 정보 조회 |
| TextToSpeech SDK | 음성 합성 (글자 → 음성) |
| SpeechToText SDK | 음성 인식 (음성 → 글자) |
| FusedLocation SDK | 차량 위치 정보 |

### API 정책
- **AAOS에 맞추기**: 같거나 비슷한 기능의 API가 Android Automotive OS에 이미 있으면, 플랫폼 파편화(같은 기능이 여러 방식으로 갈라지는 것)를 줄이기 위해 AAOS 쪽에 맞추는 것이 원칙입니다.
- **하위 호환성**: Vehicle SDK의 기능이 나중에 AAOS 표준에 들어가더라도, 기존 SDK 기능은 **최소 2개 메이저 버전 동안 그대로 쓸 수 있게** 유지합니다. 그 이후 유지·변경·제거 여부는 별도 정책과 릴리스 노트로 안내합니다.

### Vehicle SDK API 사용과 앱 심사
- 각 API를 지원하는지는 도메인별 `checkXXXCapabilities` API로 확인합니다.
- API를 쓰려면 필요한 **퍼미션(권한)을 앱에 선언**해야 합니다.
- 퍼미션은 **Pleos App Market과 미리 협의해 승인받은 범위 안에서만** 쓸 수 있습니다.
- **승인되지 않은 퍼미션을 선언하거나 그 API를 호출하면 앱 심사를 통과할 수 없습니다.**

---

## 2. 개발 환경과 에뮬레이터

### 소프트웨어 개발 환경

| 구분 | 버전 |
|---|---|
| 최소 Android SDK | Android API 28 이상 |
| Gradle | 8.0 이상 |
| 개발 언어 | Java, Kotlin |
| Pleos Connect Emulator | 2.1.0 |
| Pleos Connect Virtual Console | 지원하는 에뮬레이터 최소 버전 2.1.0 |

⚠️ 주의: minSDK는 반드시 Android API 28 이상이어야 합니다. 차량 사이버 보안 요건(앱 서명 키 교체·이력 관리 지원) 때문입니다.

### Pleos Connect Emulator란
Android Studio 같은 안드로이드 개발 도구에서 Pleos Connect 앱을 개발하고 검증할 수 있는 가상 실행 환경입니다.
- Android API와 Pleos Connect API를 함께 테스트할 수 있습니다.
- 차량 제어 기능과 차량 상황 데이터를 흉내 내어(에뮬레이션) 앱 동작을 확인할 수 있습니다.

### 설치

**사전 준비**
- 최신 Android Studio를 설치합니다. (https://developer.android.com/studio)
- Android Emulator를 돌릴 수 있는 시스템 요구사항을 갖췄는지 확인합니다.

**Android Studio에 에뮬레이터 추가** (이전 버전이 설치되어 있으면 먼저 삭제)
1. Android Studio에서 Menu > Tools > SDK Manager를 엽니다.
2. SDK Update Sites 탭에서 + 버튼을 누릅니다.
3. 아래처럼 입력하고 OK를 누릅니다.
   - Name: `Pleos Connect System Image`
   - URL (Mac): `https://nexus-playground.pleos.ai/repository/raw-releases/connect-avd/2.x/crp-arm64-sys-img.xml`
   - URL (Windows/Linux): `https://nexus-playground.pleos.ai/repository/raw-releases/connect-avd/2.x/crp-sys-img.xml`
4. SDK Platforms 탭에서 **Android API Level 34의 Pleos Connect System Image**에 체크합니다. Show Package Details도 켭니다.
5. OK를 눌러 설치하고, 끝나면 Finish를 누른 뒤 Android Studio를 재시작합니다.

**가상 기기(AVD) 만들기**
1. Tools > Device Manager > Create device로 들어갑니다. (구버전은 AVD Manager > Create Virtual Device)
2. Form Factor에서 **Automotive**를 고르고, **Pleos Connect v2.1.0**을 선택합니다.
3. Advanced Settings에서 다음처럼 설정합니다.
   - Default boot: **Cold**
   - RAM: **4 GB**
   - (구버전 Android Studio라면 Graphics: Hardware, Boot option: Cold boot)
4. Device 탭에서 API 34 → Pleos Connect v2.1.0 APIs를 고르고 Finish를 누릅니다.
5. Device Manager에서 만든 AVD를 실행합니다.

**문제가 생기면** Android 공식 문서의 "Android Emulator 알려진 문제"와 "Android Studio·Gradle 플러그인 알려진 문제"를 참고합니다.

---

## 3. 빠른 시작 (첫 앱 만들기)

**사전 준비**: Android Studio, Android SDK API 34, minSdk API 28 이상, Pleos Connect Emulator 시스템 이미지

1. **프로젝트 만들기**
   - File > New > New Project에서 **Car(또는 Automotive)** 카테고리 > Empty Activity를 고릅니다.
   - 언어는 Kotlin, Minimum SDK는 API 28 이상으로 설정합니다.
2. **에뮬레이터 설치·구성**: 위 2장과 같습니다.
3. **Vehicle SDK 가져오기**
   - `settings.gradle.kts`에 Maven 저장소를 추가합니다.
     ```kotlin
     maven { url = uri("https://nexus-playground.pleos.ai/repository/maven-releases/") }
     ```
   - `app/build.gradle.kts`에 의존성을 추가합니다.
     ```kotlin
     implementation("ai.pleos.playground:Vehicle:2.3.1")
     ```
4. **차량 권한 선언**: `AndroidManifest.xml`에 추가합니다.
   ```xml
   <uses-permission android:name="pleos.car.permission.CAR_DOORS" />
   ```
5. **첫 API 호출**
   - 흐름: `Vehicle(context)` 생성 → `initialize()` → `getDoor()` → `getCurrentDoorPosition(...)`
   - 결과는 비동기 콜백인 `onComplete`와 `onFailed`로 옵니다.
   - `release()`는 콜백 처리가 끝난 뒤나, 앱이 SDK를 더 쓰지 않는 시점(예: `onDestroy`)에 호출합니다.
6. **에뮬레이터에서 확인**
   - 값을 못 읽으면 다음을 차례로 확인합니다: minSdk 28 이상인지, 권한을 선언했는지, 의존성 동기화가 됐는지, 에뮬레이터가 정상 실행됐는지, `onFailed`에 온 예외 메시지

**문서가 권하는 다음 단계 순서**
앱 기획·설계 가이드 → 앱 개발 가이드 → SDK API 문서 → 권한·Capability·Get API → Sample App 가이드 → Virtual Console로 테스트 → 등록·배포 가이드에 따라 App Market에 제출

---

## 4. Vehicle SDK (v2.3.2 기준)

**구조**
- 차량 정보 조회와 제어 API를 제공합니다.
- 외부 개발사 앱(3rd party 앱)은 Vehicle SDK로 Pleos Connect의 **Vehicle Service**에 연결합니다.
- Vehicle Service는 AAOS 위에서 동작합니다. 앱이 API로 조회·제어를 요청하면 Vehicle Service가 처리합니다.

**진입점과 도메인 구조**
- API는 도메인(기능 분야)별 인터페이스로 나뉘어 있습니다.
- Door, Brake 같은 도메인 객체는 직접 만들지 않습니다. 반드시 `Vehicle` 인스턴스의 `getDoor()`, `getBrake()` 같은 함수로만 얻습니다.
- 도메인 객체에서 호출하는 API는 4종류입니다.

| 종류 | 역할 |
|---|---|
| Capability (`checkXxxCapabilities`) | 기능을 지원하는지, 허용되는 값 범위가 어디까지인지 확인 |
| Get (`getCurrentXxx`) | 현재 값 조회 |
| Set (`setXxx`) | 값 변경 |
| Callback | 리스너를 등록해 상태 변화를 구독 |

**사용 규칙**
- 연결은 `initialize()`로 시작하고 `release()`로 해제합니다.
- 차량 통신은 IPC(프로세스 간 통신)라서 결과가 바로 오지 않고 `onComplete`/`onFailed` 비동기 람다로 전달됩니다.
- 비동기 콜백이 끝나기 전에 `release()`를 호출하지 않도록 주의합니다.

**도메인 목록 (원문 그대로)**

| 도메인 | 설명 |
|---|---|
| Brake | 브레이크 페달, 주차 브레이크 상태 조회 |
| CarInfo | 차량 기본 정보(외부 크기, 제조사, 연식 등) 조회 |
| Display | 인포테인먼트 표시 단위(온도 단위 등) 조회/설정 |
| Door | 도어 열림/닫힘, 잠금/해제 제어 및 상태 조회 |
| DrivingMode | 드라이브 모드, 크루즈 컨트롤 정보 조회 |
| EvBattery | EV 배터리·충전 상태 및 전비(전기 효율) 조회 |
| Fuel | 연비 등 연료 관련 정보 조회 |
| HVAC | 난방·환기·공조(온도, 풍량, 습도 등) 제어 및 조회 |
| Light | 조명 상태 조회, 앰비언트 라이트 등 제어 |
| Odometer | 총 주행 거리, 트립 주행 거리/시간, 거리 단위 조회 |
| Safety | 차량 경고 정보 조회 |
| Seat | 좌석 위치·각도·기능 제어 및 조회 |
| SideMirror | 사이드미러 열선 상태 조회/설정 |
| Steeringwheel | 핸들 상태, 열선 조회/제어 |
| Tire | 타이어 상태 조회 |
| Toll | 하이패스(ETCS) 음성 안내 음량 등 조회/설정 |
| TurnSignal | 방향지시등 상태 조회 |
| Window | 창문 제어 및 상태 조회 |
| Wiper | 와이퍼 제어 및 상태 조회 |

### 퍼미션 선언
- Vehicle SDK API는 매니페스트에 Pleos 차량 퍼미션을 선언해야 호출할 수 있습니다.
- 형식은 `pleos.car.permission.{상수명}`입니다.

| 접두사 | 예시 | 용도 |
|---|---|---|
| `CAR_*` | `CAR_DOORS` | 도메인 데이터 조회(get) |
| `CONTROL_CAR_*` | `CONTROL_CAR_DOORS` | 도메인 제어(set) |

**도메인별 대표 조회 퍼미션**

| 도메인 | 퍼미션 |
|---|---|
| Door | `CAR_DOORS` |
| Window, Wiper | `CAR_WINDOWS` |
| HVAC | `CAR_CLIMATE` |
| DrivingMode, Brake, Odometer | `CAR_DRIVE` |
| EvBattery, Fuel | `CAR_ENERGY` |
| CarInfo, Display | `CAR_INFO` |
| Light, TurnSignal | `CAR_LIGHTS` |
| SideMirror | `CAR_MIRRORS` |
| Safety, Tire | `CAR_SAFETY` |
| Seat | `CAR_SEATS` |
| Toll | `CAR_TOLL` |

- 세부 API마다 필요한 퍼미션이 다를 수 있습니다. 호출 전에 해당 함수의 `@RequiresPermission`을 확인하세요.
- 사용하는 도메인에 맞는 퍼미션만 선언하면 됩니다.
- 퍼미션이 없으면 `onFailed`로 예외가 오고, `ERROR_SECURITY_PERMISSION`에 해당할 수 있습니다.

### Capability 확인
`checkXxxCapabilities`로 기능 지원 여부와 허용 범위를 확인합니다.

| 반환 타입 | 의미 |
|---|---|
| `CapabilityConfig` | 기능 단위 접근 수준. `AccessType`이 `NONE`(불가), `READ`(읽기만), `WRITE`(쓰기만), `READ_WRITE`(둘 다) 중 하나 |
| `AreaBounds` | 영역별 허용 값 범위(`minValue`, `maxValue`) |
| `Map<Area, AreaBounds>` | 영역(예: 운전석 앞문)별 범위 |

원문 예제는 `READ`나 `READ_WRITE`면 값을 조회하고, `NONE`이거나 `WRITE`만 되면 **UI를 비활성화하거나 다른 흐름으로 처리**하라고 안내합니다.

---

## 5. NaviHelper SDK (v3.0.5 기준)

**구조**
- 경로 안내 제어와 내비게이션 정보 조회 API를 제공합니다.
- 앱은 NaviHelper SDK로 Pleos Connect의 **Navi Service**와 연동합니다.
- 앱이 목적지·경유지 설정, 경로 변경, 정보 조회, 내비 화면 표시를 요청하면 Navi Service가 처리합니다. 처리 결과와 주행 상태 변화는 이벤트로 전달됩니다.

**제공 기능**
- 목적지 설정·확인·취소
- 경로 옵션 변경 및 재탐색
- 경유지 추가·조회·제거
- 경유지를 포함한 경로 요청
- 경로 탐색·주행 상태 이벤트 수신
- 내비게이션 정보 조회와 내비 화면 요청

**동작 방식**
- 요청은 **Pleos Connect 내비게이션 앱**에 전달됩니다.
- 결과와 주행 중 변경 사항은 `NaviHelperEventListener` 콜백으로 옵니다.
- 실제로 오는 이벤트는 내비 앱의 구현과 현재 상태에 따라 달라질 수 있습니다.

**사용 순서**
`NaviHelper` 생성 → `initialize()` → `addListener()` → 경로 요청·정보 조회 → 콜백 처리 → `removeListener()`, `release()`

### 목적지
- `requestRoute()`로 설정하고, `getDestinationInfo()`로 확인하고, `cancelRoute()`로 취소합니다.
- `RouteInfo`에 들어가는 값: 위도, 경도, POI(장소) 이름·ID, 주소, 경로 옵션
- 경로 탐색 진행 상황을 알려주는 콜백:

| 콜백 | 호출 시점 |
|---|---|
| `onRouteStarted` | 탐색 시작 |
| `onRoutingCompleted` | 탐색 완료 |
| `onDestinationChanged` | 목적지 설정 또는 제거 |
| `onError` | 경로 요청 처리 중 오류 |

- ⚠️ `requestRoute()` 호출이 성공했다고 탐색이 끝난 것은 아닙니다. 최종 결과는 이벤트 콜백으로 확인합니다.
- 정보 조회 API는 값을 바로 돌려주지 않고, 대응하는 콜백으로 결과를 줍니다.

### 경로 옵션 (`RouteOption`)

| 값 | 의미 |
|---|---|
| `RECOMMENDED` | 추천 |
| `SHORT_DISTANCE` | 최단 거리 |
| `SHORT_TIME` | 최단 시간 |
| `FREE` | 무료 도로 우선 |
| `HIGHWAY` | 고속도로 우선 |
| `COMFORTABLE` | 편안한 경로 |
| `SCHOOL_ZONE` | 스쿨존 고려 |

- 목적지를 처음 정할 때 지정하거나, 안내 중에 `changeRouteOption()`으로 바꿉니다.
- 재탐색은 `requestReRoute()`로 합니다.
- 옵션 변경과 재탐색은 **활성 경로가 있을 때만** 요청할 수 있습니다.

### 이벤트 종류

| 분류 | 콜백 |
|---|---|
| 경로 탐색 | onRouteStarted, onRoutingCompleted, onRouteCancelled, onReRouteEnded, onRouteOptionChanged |
| 목적지·경유지 | onDestinationChanged, onDestinationArrived, onWaypointChanged, onWayPointArrived |
| 정보 조회 | onBookmarkInfo(즐겨찾기), onBookMarkChanged, onRecentDestinationInfo(최근 목적지), onCurrentLocationInfo(현재 위치), onDestinationInfo, onWayPointInfo, onRouteStateInfo, **onTBTInfo**(턴바이턴 안내), **onChargerOperatorInfo**(충전소 사업자), **onTripInfo**, onNavigationStatus, **onDrivingInfo**, **onCurrentRoadSpeedLimit**(현재 도로 제한속도), **onCameraAlert**(단속카메라), **onCautionPointInfo**(주의 지점) |
| 오류 | onError |

- 필요한 콜백만 재정의해서 쓰면 됩니다.
- 리스너를 해제할 때는 등록할 때 쓴 **같은 인스턴스**를 넘겨야 합니다.

---

## 6. SpeechToText SDK (v3.3.1 기준)

- 음성을 텍스트로 바꾸는 API입니다.
- 앱은 Pleos Connect의 **Speech Service**와 연동합니다. 앱이 요청하면 서비스가 음성을 텍스트로 바꿔 결과를 돌려줍니다.

⚠️ **음성 명령 기능은 제공하지 않습니다.**
- 사용자 발화를 "음악 틀어줘" 같은 텍스트로 바꿔서 돌려줄 뿐, 음악 재생 같은 실제 동작은 실행하지 않습니다.
- 인식한 명령으로 앱 기능을 실행하려면 **Gleo Interface**를 참고하라고 안내합니다.

**인식 모드**

| 모드 | 설명 |
|---|---|
| `HYBRID` (기본) | 서버 인식을 먼저 쓰고, 네트워크가 실패하면 자동으로 차 안의 엔진(On-device)으로 전환. 서버 인식을 쓰려면 앱 등록 필요 |
| `SERVER` | 서버 인식만 사용. 네트워크와 앱 등록이 필요하고, 실패해도 On-device로 넘어가지 않음 |
| `ON_DEVICE` | 차량 내부 엔진으로 인식. 네트워크가 필요 없고, 이 모드만 쓰면 앱 등록도 필요 없음 |

**사용 순서**
`SpeechToText(context, Mode)` 생성 → `initialize()` → `addListener()` → (필요하면) `setLocale()`로 언어 설정 → (서버 모드면) 앱 등록 → `request()`로 인식 시작 → `stop()` → `removeListener()`, `release()`

**앱 등록**
- Pleos Playground에서 **My Project**를 만들 때 받은 **Client ID**와 **Client Secret**으로 등록합니다.
- 초기화가 끝난 뒤 `registerApp()`을 호출하고, `onConnected()`가 온 다음에 서버 요청을 시작합니다.

---

## 7. TextToSpeech SDK (v3.3.1 기준)

- 텍스트를 음성으로 만들어 재생하는 API입니다.
- Speech Service가 합성한 음성을 **차량 오디오 시스템으로 재생**합니다.

**모드**

| 모드 | 설명 |
|---|---|
| `HYBRID` (기본) | 서버 스트리밍 합성을 먼저 쓰고, 실패하면 On-device로 전환. 앱 등록 필요 |
| `SERVER` | 서버만 사용. 실패하면 전환 없이 오류 이벤트 전달 |
| `ON_DEVICE` | 차량 엔진으로 합성. 네트워크·앱 등록 불필요 |

**사용 순서**
생성 → `initialize()` → `addEventListener()` → `setLocale()` → (서버 모드면) 앱 등록 → `onConnected()` 이후 `speak()` → `stop()` → `removeEventListener()`, `release()`

---

## 8. FusedLocation SDK (v1.1.3 기준)

- 앱이 차량 위치 데이터를 받을 수 있게 해 주는 SDK입니다.
- Pleos Connect의 **FusedLocation Service**와 연동합니다.

**제공 기능**

| API | 기능 |
|---|---|
| `getLastKnownLocation()` | 마지막으로 확인된 위치 1회 조회 |
| `registerFusedLocationCallback()` | 위치 업데이트 수신 시작 |
| `unregisterFusedLocationCallback()` | 위치 업데이트 수신 중지 |
| `isSupported()` | 지원 환경인지 확인 |
| `showLocationAccessBlockedPopup()` | 위치 접근이 막혔을 때 안내 팝업 표시 |
| `addProximityAlert()` | 지정 영역 진입/이탈 알림 등록 (위도, 경도, 반경 m, ENTER/EXIT) |
| `removeProximityAlert()` | 진입/이탈 알림 해제 |

**주의할 점**
- `getLastKnownLocation()`은 위치를 새로 계산하지 않고, 지금 쓸 수 있는 마지막 위치를 돌려줍니다. 위치 데이터가 없으면 `null`이 올 수 있습니다.
- 사용 전에 **반드시 `isSupported()`로 지원 여부를 확인**해야 합니다. 지원되지 않는 환경에서는 API가 정상 동작하지 않을 수 있으니, 그때는 위치 기능을 제공하지 않도록 처리합니다.
- 위치 결과(`LocationData`)에는 위도, 경도, 고도, 진행 방향, 신뢰도, 타임스탬프가 들어 있습니다.
- `pleos.car.permission.FUSED_LOCATION` 권한을 선언해야 합니다.
- 위치 업데이트를 받으면 `onChanged(LocationData?)`, 오류가 나면 `onError(Exception)`이 호출됩니다.

**사용 순서**
생성 → `isSupported()` → `initialize()` → 조회 또는 콜백 등록 → 해제 → `release()`

> 참고: Pleos 문서 목록에 "LLM" SDK 항목이 있지만 페이지 내용이 비어 있고, 공모전 SDK 목록에도 없습니다.

---

## 9. Pleos Connect Virtual Console (차량 상태 시뮬레이터)

Pleos Connect Emulator 환경에서 차량의 핵심 기능을 재현하는 개발·테스트 도구입니다. 실제 사용자 동작과 비슷한 방식으로 차량 상태와 이벤트를 조작해 다음을 확인할 수 있습니다.
- 차량 속도, 도어, 조명 등 차량 상태 변경
- 주행·차량 이벤트 시나리오 재현
- 앱 화면에 반영되는 실시간 차량 상태
- 차량 제어 명령의 정상 동작 여부
- 반복 테스트와 데모 시나리오 실행

지원하는 에뮬레이터 최소 버전은 v2.1.0입니다.

**실행 방법**
1. 터미널에서 `adb forward tcp:8088 tcp:8088`을 실행합니다.
2. PC 브라우저에서 `http://127.0.0.1:8088/`을 엽니다.

**사용 방법**
Emulation Controls를 열고 → 왼쪽에서 도메인을 고르거나 카드 이름을 검색하고 → (영역 선택이 있으면) 영역을 고르고 → 버튼·목록·슬라이더로 값을 바꾼 뒤 → 에뮬레이터와 앱에서 결과를 확인합니다.

**조작 가능한 카드 전체 목록**

| 도메인 | 카드와 설정 범위 |
|---|---|
| **Vehicle** | Notification 1: 식별자 1번 차량 알림 표시/숨김 |
| **Motion** | 기어 P/R/N/D · 브레이크 페달 0~100% · 누적 주행거리 0~1,000,000km(1km 단위) · 조향각 -540~540°(1° 단위) · 핸들 열선 Off/Low/Medium/High |
| **ADAS** | 크루즈 상태 Not ready/Ready/Longitudinal/Lateral/Full autonomous · 크루즈 목표속도 5.556~27.778 m/s(약 20~100km/h) |
| **Convenience** | 하이패스 전원 On/Off · 하이패스 시나리오(카드 삽입·제거, 요금소 진입·진출) · 도어 열림/닫힘(앞뒤 좌우) · 도어 잠금 · 트렁크/프렁크 · 실내등 · 독서등(좌석별) · 앰비언트 밝기 0~100% · 앰비언트 색 Cyan/Blue/Purple/White · 외부 조명 Off/Auto/미등/하향등 · 상향등 · 비상등 · 제동등 · 트렁크 조명 · 방향지시등 Off/좌·우 Blink/좌·우 Flash · 창문 위치 0~100%(좌석별) · 뒷창문 잠금 · **좌석 탑승 여부 Empty/Occupied(운전석, 동승석, 뒷좌석 좌우)** · 와이퍼(앞·뒤) Off/Auto/Low/High · 글로브박스 |
| **Safety** | Telltales(경고등): 주차 브레이크, 안전벨트, ABS, TPMS 등 Off/On/Blink |
| **Energy** | 주행가능거리 0~1,000,000m · 배터리 에너지 0~200kWh · SOC(충전량) 0~100% · 배터리 용량 · 충전 전류 제한 10~48A · 목표 충전량 50~100% · 충전 스위치 · 충전 포트 Open/Closed |
| **Climate** | 공조 전원 · 에어컨 · 오토 · 듀얼(운전석·동승석 동기화) · 내기/외기 · 풍량 0~8단 · 송풍 방향 Face/Floor/Defrost · 성에 제거(앞·뒤) · 목표 온도 16~30°C(0.5° 단위) · 시트 통풍 3단/Off/열선 3단 · 공기청정 |

**테마와 시점**
- 기어가 P일 때 상단 주행 화면을 Highway 테마나 Forest 테마로 바꿀 수 있습니다. 테스트 기능에는 영향이 없습니다.
- Highway 테마에서는 1인칭/3인칭 시점을 고를 수 있습니다.

**접속이 안 될 때 확인 순서**
에뮬레이터 실행 여부 → 지원 이미지인지 → `adb devices`로 연결 확인 → `adb forward` 재실행 → 8088 포트를 다른 프로그램이 쓰는지 → 브라우저 재접속

> (풀이) 셋업 문서는 "차량 속도 변경"이 가능하다고 적었지만, 사용 가이드의 카드 목록에는 속도 카드가 없습니다.

---

## 10. 앱 기획·설계 가이드 (공식 "앱 설계 원칙" 전체)

> 모바일 앱을 Pleos Connect 앱으로 바꾸려 하거나, 처음부터 Pleos Connect 앱을 설계할 때 반드시 고려해야 할 사항을 안내합니다.

### 10-1. 앱 카테고리
설계 시점부터 앱의 카테고리를 명확히 정해야 합니다.

| 카테고리 | 핵심 목적 |
|---|---|
| Maps/Navigation | 위치 기반 길 안내 |
| Mobility Services | 이동 수단·이동 서비스 제공 |
| Lifestyle | 일상생활 관리 및 향상 |
| Entertainment | 오락 및 여가 |
| Business | 업무 및 생산성 |
| Music/Audio | 오디오 콘텐츠 중심 |
| Kids | 아동 대상 콘텐츠 |
| Social/Communication | 사람 간 소통·네트워크 |

카테고리와 주행 상태에 따라 주행 중 쓸 수 있는 기능 범위가 달라집니다. 일부 카테고리는 운전자에게 필요한 정보 제공이나 최소한의 조작 범위에서 주행 중 기능이 **제한적으로 허용될 수 있습니다**. 실제 적용은 주행 상태와 지역 정책에 따라 다릅니다.
- **Music/Audio**: 앨범 아트 같은 단순 시각 정보, 재생·일시정지·곡 넘기기, 음악 스트리밍 청취, 라디오 채널 변경, 오디오북 재생
- **Maps/Navigation**: 경로 안내와 실시간 교통 정보, 주의를 분산시키지 않는 간결한 지도, TBT 음성 안내, 목적지 경로 탐색, 실시간 빠른 길 안내, 주변 교통 상황 안내
- **Mobility Services**: 주행과 밀접한 차량 관리 서비스, 현재 위치 기반 즉각 정보, 전기차 충전소 찾기와 경유지 설정, 가까운 주유소 탐색, 주행 중 접근 가능한 주차장 위치 확인

### 10-2. 앱 구조 및 동작 모델
Pleos Connect는 **Driving view**(운전 정보 화면)와 앱 영역을 함께 보여 주고, 앱 영역에는 **최대 2개의 앱**을 띄울 수 있는 차량용 멀티 윈도우 환경입니다. 표시 영역과 화면 방향이 바뀔 수 있으므로, 모바일과 다른 화면 구성과 앱 생명주기를 고려해야 합니다.

**화면 구성**
- Driving view는 운전자와 가까운 **고정 영역**입니다. 앱이 임의로 가리거나 종료할 수 없습니다.
- 앱 영역은 차량과 디스플레이 구성에 따라 window(창) 1개 또는 2개로 나뉩니다.

**Portrait와 Landscape**
- **portrait**: 앱이 창 1칸을 쓰는 형태입니다. 앱 2개가 동시에 뜨면 보통 각각 portrait입니다.
- **landscape**: 앱 하나가 창 2칸을 합쳐 쓰는 형태로, 추가 정보나 확장 콘텐츠를 보여 줄 수 있습니다.
- **두 형태 모두 화면을 설계해야 합니다.** portrait에는 핵심 기능과 주요 정보를, landscape에는 부가 정보와 확장 기능을 배치합니다.

**앱 실행과 창 전환**
- 새 앱은 현재 화면 방향을 따라갑니다. landscape 앱이 떠 있으면 새 앱도 landscape로, portrait 앱 2개가 떠 있으면 새 앱은 주 창(primary window)에 portrait로 뜹니다.
- 화면에서 사라졌다고 앱이 종료되는 것은 아닙니다. 백그라운드에 남아 있다가, 표시 중인 앱이 종료되면 최근 사용 순으로 다시 나타날 수 있습니다.
- 사용자는 window bar나 제스처로 앱 위치와 크기를 바꿀 수 있습니다. 크기가 바뀌어도 핵심 기능을 쓸 수 있게 화면을 유연하게 구성해야 합니다.

**화면 방향과 크기**
- `screenOrientation`을 지정하지 않으면 기본은 portrait(창 1칸)입니다. `landscape`로 지정하면 창 2칸을 씁니다.
- 레이아웃이 깨지지 않도록 반응형 레이아웃을 씁니다. 화면 방향은 `AndroidManifest.xml`의 `screenOrientation` 설정을 따르므로 화면 설계와 함께 검토합니다.

**포그라운드·백그라운드 전환**
화면 분할, 창 이동, 다른 앱 실행, 주행 상황 변화로 전환이 자주 일어납니다.
- 포그라운드로 돌아오면 현재 상태를 복원하고, 크기와 방향에 맞게 UI를 다시 구성합니다.
- 백그라운드로 가면 화면 갱신, 애니메이션, 불필요한 센서 수집처럼 바로 멈출 수 있는 작업을 정리합니다.
- 오디오 재생, 통신, 다운로드처럼 백그라운드에서도 계속할 작업은 실행 조건과 중단·재개 규칙을 명확히 정합니다.
- 백그라운드에서 불필요한 상주, 타이머, 폴링(주기적 확인), 네트워크 요청을 줄입니다.
- 앱이 종료되거나 다시 생성되어도 사용자 데이터와 진행 상태를 복원할 수 있게 상태 저장 전략을 마련합니다.

### 10-3. 주행 안전을 고려한 설계
운전자의 주의를 분산시키지 않도록 설계해야 합니다. **AAOS 운전자 주의 분산 가이드라인**(https://source.android.com/docs/automotive/driver_distraction/guidelines)을 지키고, 아래 원칙에 유의합니다.

**주행 규제 상태에 따른 앱 동작**
- 앱은 `CarUxRestrictions`(OS가 보내 주는 주행 중 제한 상태)를 기준으로 제한 대상 기능의 UI와 동작을 축소하거나 비활성화해야 합니다.
- 주행 규제 상태에서는 **영상 재생을 시작하거나 재개하지 않습니다.**
- 오디오 재생은 오디오 포커스 가이드의 정책을 따릅니다.

**시선 분산 최소화**
- 운전에 필요한 정보는 짧은 시간 안에 이해할 수 있게 간결하고 명확하게 보여 줍니다. HUD·클러스터·OSD 영역을 쓰면 해당 정책을 따릅니다.
- 주행 중에는 시선을 끄는 동영상, 애니메이션, 움직이는 이미지를 최소화하거나 제한합니다.
- 이미지는 정보 전달에 필요한 만큼만 쓰고, 장식적이거나 반복해서 움직이는 요소는 피합니다.

**정보 구조와 인터랙션**
- 주행 중 필요한 정보와 기능에 우선순위를 두고, 짧은 시간 안에 쓸 수 있는 위치에 둡니다.
- 최소한의 조작으로 기능에 도달하도록 메뉴 구조를 단순화합니다.
- 자주 쓰는 기능은 첫 화면이나 상단에 두고, 드롭다운이나 다단 메뉴를 남용하지 않습니다.
- 자동 애니메이션과 반복적인 화면 전환을 최소화합니다.
- 운전에 중요한 오디오 안내가 나올 때는 미디어를 일시정지하거나 볼륨을 줄이는 등 적절히 대응합니다.

**터치 조작 최적화**
- UI Design Guide에 따라 큰 터치 영역, 높은 대비, 텍스트 최소화 패턴을 적용합니다.
- 터치 조작을 줄이고, 음성 명령이나 물리 버튼 같은 차량 입력 방식과 연계합니다.
- 게임, 인터넷 서핑, 피트니스처럼 주의를 분산시키는 활동을 유도하지 않습니다.
- 버튼 크기와 간격은 UI Design Guide 기준을 따릅니다.

**텍스트 입력 최소화, 음성·프리셋 우선**
- 검색과 로그인에서도 키보드 입력보다 프리셋 선택, 최근 항목, 음성 입력을 우선합니다.
- 음악 앱은 프리셋 플레이리스트, 최근 재생, 즐겨찾기처럼 자주 쓰는 기능을 첫 화면에 둡니다.

### 10-4. 지역별 주행 규제 정책
- 주행 규제는 차량의 속도·기어·브레이크 같은 하드웨어 신호와 지역별 안전 규정에 따라 적용됩니다.
- 플랫폼 버전과 양산 차량에 따라 정책이 다를 수 있습니다.

**DO(Distraction Optimization, 주행 중 사용 최적화) 선언 여부**

| 상황 | DO를 선언하지 않은 앱 |
|---|---|
| Parking (주차) | 사용 가능 |
| Drive (주행) | **사용 불가** |

**주행 중(Driving) 기능별 허용 여부** (✅ 가능 / ⛔ 제한 / 🎤 음성으로만 가능. 주차 중에는 모든 지역에서 전부 ✅)

| 기능 (해당 제한 플래그) | 북미 | 유럽 | 그 외 지역 |
|---|---|---|---|
| 키보드 (NO_KEYBOARD) | ⛔ | ✅ | ✅ |
| 다이얼패드 (NO_DIALPAD) | ⛔ | ✅ | ✅ |
| 검색 (NO_KEYBOARD, NO_FILTERING) | 🎤 | ✅ | ✅ |
| 미디어 앱 로그인·설정·검색 (NO_SETUP, NO_KEYBOARD, NO_FILTERING) | ⛔ | ⛔ | ✅ |
| 디지털키·도어·시트·차량 설정 (NO_SETUP) | ⛔ | ⛔ | ⛔ |
| 동영상 시청 (NO_VIDEO) | ⛔ | ⛔ | ⛔ |
| 내비게이션 검색 (NO_KEYBOARD, NO_FILTERING) | ⛔ | ✅ | ✅ |
| QR 로그인 (NO_SETUP) | ⛔ | ⛔ | ⛔ |
| 매뉴얼 등 대용량 텍스트 (LIMIT_CONTENT, LIMIT_STRING_LENGTH) | ⛔ | ⛔ | ⛔ |

- 표의 "검색"은 웹 검색이 아니라 **차량 시스템 안의 통합 검색**입니다.
- InfoLINK용 앱은 지역별 키보드 정책에 따른 분기 처리가 필요할 수 있습니다(문의: partnership@pleos.ai).
- (풀이) 원문에 "한국" 항목은 따로 없습니다.

### 10-5. 성능 및 리소스 효율
인포테인먼트 시스템에서는 여러 앱이 동시에 돌아가므로, 빠르게 켜지고 가볍게 상주하도록 설계해야 합니다.

**앱 시작 시간**
- Cold start(처음 실행) 때 스플래시 화면에 오래 머물지 않게 꼭 필요한 것만 초기화합니다.
- 필요한 리소스만 먼저 불러오고, 나머지는 나중에 불러옵니다(지연 로딩).

**CPU·메모리 기준**

| 항목 | 기준 |
|---|---|
| 내비게이션 앱 (주행 중) CPU | 15% 이하 |
| 내비게이션이 아닌 앱 (주행 중) CPU | **5% 미만** |
| 모든 앱 (정차 중) CPU | 25% 이하 |
| RAM | **400MB 이하** |

- 백그라운드의 긴 작업, 불필요한 타이머와 폴링을 최소화합니다.
- 이미지나 리스트는 RecyclerView와 캐시 전략으로 메모리를 아낍니다.

**오디오·미디어**
- 시스템 전체 **오디오 포커스 정책**(여러 앱 중 누가 소리를 낼지 정하는 규칙)을 따라, 다른 앱이나 알림과 충돌하지 않게 합니다.
- 포커스를 얻고 잃는 변화에 대응하는 로직을 **반드시** 구현합니다.

### 10-6. 하드웨어 접근 정책
- 앱은 Pleos Connect SDK의 **표준 플랫폼 API를 통해서만** 하드웨어에 접근해야 합니다.
- 모바일 기준으로 만든 앱은 차량에서 그대로 돌리기 어렵고, 모바일용 API가 없거나 제한될 수 있습니다.

**차량 하드웨어 접근**
- **직접 접근 금지**: 차량의 물리적 제어나 센서에 직접 접근하면 안 됩니다.
- **플랫폼 API 우선**: 차량 상태는 SDK의 표준 플랫폼 API로 확인하고 제어합니다.

**모바일 전용 API 주의**
- 제한될 수 있는 기능: **전화(Telephony), SMS, 일부 센서(자이로, 근접 등), 캘린더, 주소록** 등
- 대응: 차량에서 꼭 필요하지 않은 기능은 빼거나, API 지원 여부를 확인한 뒤에만 동작하도록 선택적(Optional) 구조로 설계합니다.

**주행 중 네트워크 대응**
셀룰러나 Wi-Fi가 끊기거나 속도가 급격히 떨어질 수 있습니다. 오프라인이나 느린 환경에서도 핵심 기능을 쓸 수 있게 다음을 권장합니다.
- 캐싱: 최근 콘텐츠를 기기에 저장해 오프라인에서도 표시
- 통신 최적화: 재시도 로직과 적절한 타임아웃
- 사용자 안내: 연결이 끊기면 알 수 있도록 오프라인 모드 안내 UI 제공

### 10-7. SDK API 정책 (AAOS 표준 API와 SDK 중 무엇을 쓰나)
- **표준 우선**: 같은 기능이 AAOS 표준에 이미 있으면 표준 API를 쓰기를 권장하고, SDK는 그 기능을 중복 제공하지 않습니다.
- **확장 기능**: AAOS 표준으로 접근할 수 없거나 제조사 고유의 보안·특화 제어가 필요한 영역만 SDK 전용 API로 제공합니다.
- **하위 호환**: SDK 기능이 AAOS 표준에 들어가도 최소 2개 메이저 버전 동안 유지되므로, 충분한 기간을 두고 점진적으로 옮기면 됩니다.

| 구분 | 접근 경로 | 예시 |
|---|---|---|
| 표준 데이터 | **AAOS Car API** | **속도, 기어 상태, 외기 온도, 연료 레벨** 등 |
| 특화 기능 | **Pleos Connect SDK** | 제조사 전용 시트 제어, 특화 라이팅, 고유 보안 인증 등 |

### 10-8. API 호환성 및 가용성
설계·개발 전에 차량에서 쓸 수 있는 SDK API와 AAOS 차량 속성을 미리 확인해야 합니다.

| SDK | 차량 모델별 호환성 |
|---|---|
| Vehicle SDK | **모델에 따라 다름** (`checkXXXCapabilities`로 확인) |
| NaviHelper SDK | **내비게이션이 탑재된 차량에 한해** 전체 호환 |
| TextToSpeech, SpeechToText | 전체 호환 |
| FusedLocation SDK | **모델에 따라 다름** (`isSupported`로 확인) |

**AAOS 차량 속성(Vehicle Property)**
- 지원 여부와 접근 가능 상태는 차량 모델과 속성마다 다릅니다.
- 속성 정의와 ID는 `VehiclePropertyIds`에서, 실제 차에서 쓸 수 있는지는 `CarPropertyManager`로 확인합니다.
- ⚠️ **차량 모델명으로 분기 처리하지 말고**, 위 두 가지로 실제 지원 여부를 확인하세요.
- SDK가 제공하지 않는 특수 속성이 필요하면, 직접 구현하기 전에 반드시 기술 지원팀에 검토를 요청하세요.

### 10-9. 보안 및 개인정보 보호
차량은 여러 사람이 함께 쓰는 기기입니다. App Market 등록 시의 상세 기준은 앱 보안 가이드를 따릅니다.

**계정·세션 관리**
- 차량 소유자가 바뀌거나 운전자가 바뀔 때 쉽게 로그아웃하고 계정을 전환할 수 있어야 합니다.
- 소셜 로그인, OTT 계정 같은 토큰은 **Keystore**(안드로이드 보안 저장소) 같은 안전한 곳에 저장합니다.

**개인정보 최소 수집**
- 위치, 음성, 계정 정보를 요구할 때 "왜 필요한지" 명확히 밝히고, 동의 절차는 간단하고 이해하기 쉽게 만듭니다.
- 불필요한 개인정보는 저장하지 않고, 로그에 개인정보가 들어가면 가려서(마스킹) 기록합니다.

**차량 밖으로 나가는 데이터** (통계·분석 이벤트를 설계할 때 포함할 것)
- 차량 ID와 사용자 ID를 어떻게 익명화·가명화할지 정책을 세웁니다.
- 운전 중 행동 데이터를 마케팅 목적으로 쓰지 않도록 구분합니다.

---

## 11. 주행 규제 개발 가이드 (구현 방법)
- 앱은 플랫폼이 주는 `CarUxRestrictions` 상태를 기준으로 주행 중 UX 제한을 적용해야 합니다.
- AAOS의 `CarUxRestrictionsManager`에 `registerListener()`를 등록하면, 상태가 바뀔 때마다 `onUxRestrictionsChanged()` 콜백으로 새 `CarUxRestrictions`를 받습니다.
- **DO를 선언한 앱도** 주행 규제가 켜지면 `ActiveRestrictions`(지금 켜진 제한 목록)를 확인해 기능별 제한을 직접 적용해야 합니다.
- 예: 동영상(DMB)은 `UX_RESTRICTIONS_NO_VIDEO`로 재생 제한 여부를 판단합니다.
  ```java
  if (mCurrentCarUxRestrictions.isRequiresDistractionOptimization()
      && (mCurrentCarUxRestrictions.getActiveRestrictions()
          & CarUxRestrictions.UX_RESTRICTIONS_NO_VIDEO) != 0) {
      stopPlayingVideo();
  }
  ```
- 플랫폼이 지역별 규제에 맞는 `ActiveRestrictions`를 내려주므로, 앱은 받은 값만 반영하면 됩니다.
- UX 규제 피그마 사양서는 Playground에 공개하지 않습니다.

---

## 12. 앱 심사 가이드: 운전자 주의 분산 최소화
- 주행 중에도 운전자와 계속 상호작용하는 앱은 Pleos Connect UI Design Guide를 반드시 미리 확인하고 제출해야 합니다.
- 다만 가이드를 지켰다고 위험이 완전히 없다는 뜻은 아닙니다. 심사에서 추가 위험이 있다고 판단되면 **등록이 거부될 수 있습니다.**

**미디어 앱 규칙** (미디어 앱 = 동영상, 게임, 브라우저 기능이 있는 앱)
- 모든 미디어 앱은 **운전 중에 실행하거나 사용할 수 없어야** 합니다. **정차 중에만** 쓸 수 있습니다.
- 운전이 시작되면 사용이 일시정지되고 UI가 숨겨져야 합니다. 운전 중에는 일시정지를 풀 수 없습니다.
- 백그라운드에서 돌아오면 마지막 상태를 복원해야 합니다. 몇 분 안에 돌아오면 최대한 마지막 상태 그대로, 몇 시간 이상 지났으면 마지막 상태나 기본 상태에서 시작할 수 있습니다.
- 모든 미디어 항목에 한눈에 들어오는 제목과 썸네일을 넣어야 하고, 부적절한 내용이 보이면 안 됩니다.
- 미디어 앱은 **헤드업 알림**(화면 위에 튀어나오는 알림)을 띄우면 안 되고, 운전과 관련 없는 알림도 쓸 수 없습니다.
- 동영상 앱은 미디어 세션과 연동되어야 하고, 재생·일시정지·정지 명령을 지원해야 합니다.
- 여러 미디어를 동시에 재생할 수 없습니다.
- 브라우저 앱은 비밀번호나 결제 정보를 저장하거나 접근을 허용하면 안 됩니다. 프로필 잠금으로 막을 수 있으면 예외입니다. 동기화한다면 인증 메시지를 띄우고, 데이터가 차와 동기화된다고 화면에서 알려야 합니다.

---

## 13. 디자인 기본 원칙 (Designing apps for driving)
Pleos Connect는 Connect-S, Connect-W 등 다양한 디스플레이 형태(폼팩터)에 맞춰 디자인 시스템을 제공합니다.

**사용성과 안전성 (Easy & Safe)**
- Connect-W는 사용자의 좌석에 따라 특화된 UI와 인터랙션을 제공합니다.
- 운전 중 시각적·인지적 부담을 최소화합니다.
- 운전 중 **동영상, 움직이는 이미지, 자동으로 스크롤되는 텍스트**처럼 시선을 끄는 요소를 쓰면 안 됩니다.
- 조작은 **한 손으로** 가능해야 하고, 양손을 쓰게 하면 안 됩니다. 단순한 조작만 요구하고, 운전자가 손이나 발을 움직이게 유도하면 안 됩니다.

**일관성 (Consistency)**
- 아이콘, 용어, 상호작용 방식을 일관되게 유지합니다.
- Pleos 디자인 가이드를 활용해 기본 탑재 UI와 통일감을 맞춥니다.

**즉시성 (Glanceability)**
- 운전자는 **1~2초 안에** 정보를 파악해야 합니다. 핵심 정보만 보여 주고 불필요한 요소는 뺍니다.
- 사용자 입력 후 시스템 응답은 **0.25초를 넘으면 안 됩니다.** 시간이 걸리면 응답 중이라는 표시를 보여 줍니다.

**(참고) Gleo AI: 내장 AI 비서**
- 사용자의 이동을 챙겨 주는 개인형 모빌리티 어시스턴트입니다. 대화로 답하거나 기능을 실행합니다.
- 대화 상태: Sleep → Listening → Thinking → Asking/Speaking → Standby
- OS 화면 계층에서 상단바(GNB) 바로 아래에 있어서, Gleo가 뜨면 **다른 앱 화면을 잠시 가릴 수 있습니다.**
- 차량에는 **CCP**(조그 다이얼 형태의 물리 조작 장치)가 있어서 회전, 기울이기, 누르기로 메뉴를 탐색할 수 있습니다.

---

## 원문 링크
- 공모전 개발 환경: https://appdevchallenge.auto-hmg.io/guide/development
- 빠른 시작: https://document.pleos.ai/docs/pleos-only/getting-started
- 에뮬레이터 설치: https://document.pleos.ai/docs/connect/guide/getting-started/application-development/setup-connect-sdk-emulator
- Virtual Console 셋업: https://document.pleos.ai/docs/connect/guide/getting-started/application-development/use-vehicle-emulator
- Virtual Console 사용법: https://document.pleos.ai/docs/pleos-only/app-test-guide/virtual-console-guide
- SDK 개요: https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/
- SDK API 레퍼런스: https://document.pleos.ai/api-reference/connect-sdk-pleos
- 앱 설계 가이드: https://document.pleos.ai/docs/pleos-only/vehicle-app-planning-guide/intro
- 주행 규제 개발 가이드: https://document.pleos.ai/docs/pleos-only/vehicle-app-developer-guide/driving-restriction-development-guide
- 앱 심사 가이드: https://document.pleos.ai/docs/pleos-only/distribute/app-review-guide/

## 이번 정리에 포함하지 않은 Pleos 문서
- 오디오 포커스 개발 가이드, 내비 앱·음악 앱 개발 가이드, CCP(조그 다이얼) 개발 가이드
- UI 컴포넌트 디자인 가이드 (버튼, 팝업, 위젯 등)
- 앱 보안·등록·업데이트 가이드
- Gleo 연동 (app-integration-guide)
