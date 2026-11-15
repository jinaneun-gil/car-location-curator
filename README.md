# 지나는 길에

**지나가는 차를 지역 상점의 손님으로 연결하는 차량용 음성 앱.**
내비 경로와 속도로 곧 지날 곳의 이야기와 상점 혜택을 알맞은 때에 들려주고, 운전자는 "가 볼래" 한마디로 들르고, 상인은 노출부터 방문까지 성과를 확인합니다.

> 현대자동차그룹 차량용 앱 개발 공모전 출품작 · Pleos Connect (Android Automotive OS)
> 이 저장소의 차량 신호(기어, 속도, 위치, 내비 안내)는 시뮬레이션이며, 홍보 상호는 모두 가상입니다.

![지도 중심형 차량 화면](design/car-01-driving-story.png)

## 저장소 구성

| 경로 | 내용 |
|---|---|
| `android/` | Pleos Connect용 Android Automotive 앱 (Kotlin). Pleos SDK(Vehicle, NaviHelper, TextToSpeech)와 AAOS Car API 연동 |
| `prototype/` | 차량 화면과 차량 신호를 흉내 낸 웹 프로토타입. 시연 영상은 이 프로토타입으로 녹화 |
| `design/` | 차량 화면 9장, 휴대폰 화면 3장 시안 (`design/index.html`에서 모아 보기), Pleos Connect Emulator 구동 캡처 2장 (`emulator-*.png`) |
| `apk/` | release APK |

판단 엔진(재생 시간표 계산)은 웹 `prototype/a/planner.js`와 Android `Planner.kt`가 같은 규칙으로 동작하며, 같은 제주 콘텐츠(`prototype/b/content.js`)를 씁니다.

## 실행 방법

### 1. 웹 프로토타입 (설치 없음)

1. PC의 Chrome으로 `prototype/index.html`을 엽니다.
2. 오른쪽 조작 패널의 **주행 시작**을 누르면 제주 애월~곽지 일주서로 구간(약 3.1km)을 60km/h로 달리며 이야기와 광고를 음성으로 들려줍니다.
3. 속도를 낮추면 긴 이야기로 바뀌고, **내비 안내 지금 발생**으로 내비 우선 동작을, **기어 P**로 정차 화면(지나온 곳, 쿠폰 QR)을 확인합니다.
4. **폰 앱 보기**에서 상인의 광고 등록과 성과, 운전자의 쿠폰함을 확인합니다.
5. 주소 끝에 `?demo`를 붙이면 광고 등록부터 상인 성과 확인까지 정해진 순서로 자동 시연합니다.

### 2. Android 앱 (Pleos Connect Emulator)

**설치:** `apk/` 폴더의 APK를 에뮬레이터에 설치합니다.

```
adb install -r apk/지나는길에_지나는길에_release.apk
```

**직접 빌드:** JDK 17, Gradle 8.9, Android SDK(API 34, `android.car` 라이브러리)가 필요합니다. Pleos SDK는 `settings.gradle.kts`에 등록된 Pleos Maven 저장소에서 받습니다.

```
gradle -p android :app:assembleRelease
```

**실행:**
1. 앱을 실행하고 위치 권한을 허용합니다.
2. Virtual Console(`adb forward tcp:8088 tcp:8088` 후 `http://127.0.0.1:8088`)에서 기어를 D로, 속도를 60km/h로 바꿉니다.
3. 앱이 제주 시연 구간을 따라 차량 속도만큼 위치를 진행시키며 이야기와 광고를 TTS로 재생합니다. `adb emu geo fix <경도> <위도>`로 경로 위의 GPS 위치를 주면 GPS 위치를 우선 씁니다.
4. 기어 P에서는 정차 화면(지나온 곳, 쿠폰)이 표시되고, 주행 중에는 `CarUxRestrictions`에 따라 제목과 큰 버튼만 표시됩니다.
5. 음성은 포그라운드 서비스에서 재생되어 내비 화면이 앞에 있어도 계속되고, 차량 미디어 카드에 지금 재생 중인 이야기가 표시됩니다.

## 테스트 환경과 필요한 설정

| 항목 | 내용 |
|---|---|
| 웹 프로토타입 | Windows PC Chrome. 한국어 음성(Windows 설정 → 시간 및 언어 → 음성에서 한국어 추가)이 있어야 소리가 납니다 |
| 에뮬레이터 | Pleos Connect Emulator v2.1.0 (API 34, Automotive AVD) |
| SDK | 앱: Vehicle 2.3.2, NaviHelper 3.0.5, TextToSpeech 3.3.1. 에뮬레이터 사전 시험에서는 SpeechToText 3.3.1, FusedLocation 1.1.3도 확인 |
| 앱 | minSdk 28, targetSdk 34, 패키지 `app.curator`, Activity에 `distractionOptimized` 선언 |
| 자동 시험 | `.github/workflows/android-boot.yml`: GitHub Actions에서 앱 빌드, 단위 시험, 에뮬레이터 부팅, 설치·실행, 화면 캡처 |
| 판단 엔진 시험 | `node prototype/a/planner.test.js` |

- 에뮬레이터 첫 부팅 때는 On-device TTS 음성 모델 준비에 몇 분이 걸려 첫 음성이 늦게 나올 수 있습니다. 앱이 자동으로 다시 시도합니다.
- release APK는 공모전 시연용으로 debug 키로 서명했습니다.
- 에뮬레이터 시험 결과와 주의점은 [07_에뮬레이터_시험결과.md](07_에뮬레이터_시험결과.md)에 있습니다.

## APK 위치

`apk/지나는길에_지나는길에_release.apk`

## 문서

| 파일 | 내용 |
|---|---|
| `06_기획서_초안.md` | 기획서 (접수양식 02 항목과 같은 순서) |
| `07_에뮬레이터_시험결과.md` | Pleos Connect Emulator 시험 결과와 개발 시 주의점 |
| `02_Pleos_개발환경_제약_원문정리.md` | Pleos 개발 환경과 주행 규제 정리 |
| `prototype/b/SOURCES.md` | 제주 장소 이야기의 출처 |

지도 데이터 © OpenStreetMap 기여자
