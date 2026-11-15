# 시연 구간 지도

`aewol-map.png`는 제주 애월~곽지 시연 구간만 포함한 OpenStreetMap 배경이다. `map-config.json`의 Web Mercator 타일 좌표와 같은 투영으로 웹/안드로이드 경로를 겹친다. 실행 시 타일 서버에 접속하지 않는다.

- 지도 데이터 및 지도 스타일: **© OpenStreetMap contributors**, https://www.openstreetmap.org/copyright
- 타일 출처: https://tile.openstreetmap.org/ (zoom 15, x 27880–27882, y 13147–13150, 12장)
- 출처 표시는 웹 지도 오른쪽 아래와 Android RouteView에 항상 보인다.
- 실제 내비게이션 기능은 차량 내비 앱이 담당한다. 이 배경은 공모전의 고정 경로 시연용이다.
- 다른 지역/실서비스로 확장할 때는 해당 용도에 맞는 지도 제공자와 이용 조건을 별도 확인한다.

다시 만들기: `sharp` 설치 후 `node design/build-map.cjs`. 이 스크립트는 고정된 작은 구간 12장만 받으며, 범용 타일 수집기로 사용하지 않는다.
