# PACE

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Current scope

PACE is a running journal with a dark, mobile-first interface. This first slice
contains a branded launch splash, three Korean onboarding pages, GPS running,
and account-connected home, history, statistics, profile, and settings screens.
Google login is connected on iOS and web; Apple login is implemented for a new iOS build.
Crew and race rooms use authenticated backend
APIs rather than sample data; an empty account can create a crew or race room.

- Next, centered page indicators, and horizontal swipes across the illustration
  and text area navigate the onboarding. Swipe right to go back; there is no back
  button. Skip goes to page three.
- 온보딩 완료 여부를 기기에 저장하며, 이후 실행에서는 로그인 상태에 따라 홈 또는 로그인으로 이동합니다.
  로그인 세션이 남아 있어도 설치의 완료 기록이 없으면 온보딩을 표시합니다.
  업데이트·로그아웃·탈퇴로 완료 상태를 초기화하지 않으며, 앱 삭제 후 새 설치는 다시 표시합니다.
  iOS의 앱 정리하기(데이터 유지)나 백업 복원은 새 설치와 다릅니다.
  저장·조회 실패 시 오류와 재시도를 제공하며, 완료 CTA는 저장 중 중복 입력을 막습니다.
- 온보딩 다음에는 권한 안내를 한 번 표시합니다. 위치·Apple 건강을 선택하거나 모두 건너뛸 수 있으며,
  이후 iOS·웹 Google 로그인, iOS Apple 로그인 또는 기기 모드를 선택합니다.
  기존 설치도 새로운 권한 안내만 한 번 표시하며 온보딩은 반복하지 않습니다.
  카카오 로그인과 Android Google 로그인은 아직 연결하지 않았습니다.
  Google과 Apple은 이메일이 같아도 별개의 PACE 계정이며 자동 병합하지 않습니다.
- The dashboard at `/main` shows device or account metrics. Starting a run opens native
  GPS tracking with distance, elapsed time, speed, pause/resume, and on-device
  save. Background location requires a development/standalone build and OS
  permissions; browser/PWA and Expo Go cannot keep recording with the screen
  locked.
- The five bottom tabs use Expo Router's tab navigator: home, run history,
  statistics, crew, and profile. Switching tabs does not add a back-stack
  entry. App settings and run details are pushed as sub-screens with a back
  affordance; top-level tabs do not need one.
- Brand/back navigation, page titles, and introductory descriptions stay fixed together;
  only the body scrolls on tabs and secondary list, detail, form, and settings screens.
  Login and onboarding keep their scrollable introduction layouts.
- The crew tab has two segments. **Crew** shows weekly/monthly crew distance
  rankings, crew detail (member distances, invite code), create, join by invite
  code or request, request approval/rejection, leadership transfer, and leave
  (one crew per user). Crews have an activity region
  (시/도 + 시/군/구, picked from a list — no GPS coordinates are stored), and
  **크루 찾기** searches by name and region ("내 위치로" reverse-geocodes on the
  device; iOS/Android only). **Race** lists open and joined race rooms with
  create, join/leave, join by code, host cancel, and a scheduled-start countdown. **대결 찾기**
  filters open races by distance, start window, and full rooms (races have no
  location).
  로그인해야 조회·생성·참가할 수 있으며, 직접 상세·생성·검색 경로에 진입해도 인증을 확인합니다.
  데이터가 없으면 만들기·참가 안내를 표시하고, 조회 실패는 빈 목록과 구분합니다.
  크루 순위는 서버의 실제 러닝 기록으로 집계합니다.
  대결의 자동 출발, GPS 결과 제출·검증과 결과 순위 집계는 아직 구현하지 않았습니다.
  결과가 없는 참가자를 DNS나 가짜 순위로 표시하지 않습니다.
- 로그인하면 프로필, 주간 목표, 알림 선호, 선호 단위, 공개 범위를 서버에서 조회·저장합니다.
  실제 푸시 발송은 준비 중이며, 러닝 화면의 거리 표시는 아직 km로 고정입니다.
- GPS routes are first stored locally on the device. Force-quitting the app or
  operating-system battery restrictions can interrupt background recording;
  completed runs sync to the connected account when the server is reachable.
- Backend API contracts and open integration decisions are documented in
  [docs/API_REQUIREMENTS.md](./docs/API_REQUIREMENTS.md).
- Each fresh app launch shows an animated logo, tagline, and orbit splash before
  checking the persisted onboarding state. Reduced motion replaces the animation with a short static splash.
- On phones, illustration size adapts to the measured space left after the header,
  copy, controls, and safe areas so onboarding fits without vertical scrolling.
  Scrolling is only enabled when unusually large accessibility text or an extremely
  short window cannot fit the text and a minimum illustration. Tablet and wide web
  layouts use two columns. Safe areas and reduced motion are supported.
  Navigation has 20 points of bottom padding in addition to the device safe area.
- Project structure:

  | Path | Role |
  | --- | --- |
  | `src/app` | Expo Router routes only (thin wrappers around feature screens) |
  | `src/features/<feature>` | Screens and feature UI (home, runs, stats, crew, race, profile, …) |
  | `src/features/running` | Run domain: `types.ts`, pure session logic (`run-session.ts`), aggregates (`run-insights.ts`), GPS background task (`location-tracking.ts`) |
  | `src/data` | API와 기기 기록 저장·동기화를 담당하는 저장소 |
  | `src/features/auth` | Google·Apple 로그인, SecureStore 세션, 토큰 갱신, iOS 앱 잠금 |
  | `src/features/health` | 온디바이스 Apple 건강 권한·조회·러닝 저장 및 연동 화면 |
  | `src/hooks` | Shared hooks (`use-focus-query.ts` reloads data on screen focus) |
  | `src/lib` | Pure helpers (`format.ts`, `geo.ts`) |
  | `src/components` | Shared UI (`back-header.tsx`, `pace-brand.tsx`, feedback, swipe-to-delete) |
  | `src/constants/pace.ts` | Colors and fonts |
- Native splash configuration requires a new development/release build to preview
  accurately; Expo Go does not reproduce the final native splash.
- Korean UI uses bundled static Pretendard Regular, SemiBold, and Bold fonts,
  loaded before the native splash is hidden. The italic PACE wordmark retains its
  system lettering. Pretendard is free for commercial use under the SIL Open Font
  License; the original notice is included in `assets/fonts/OFL.txt`.

Validate changes with `npm run lint`, `npx tsc --noEmit`, and
`node --test tests/*.test.cjs`.

## 1.0.4: 보안·건강 연동 및 UX

**이 변경은 네이티브 모듈과 entitlement를 추가합니다. 1.0.3(7)에 OTA로 배포하면 안 됩니다.**
`app.json`의 버전/런타임은 1.0.4이며 새 development/TestFlight 빌드가 필요합니다.
Expo Go, 웹, TypeScript 검사만으로 Apple 로그인·Face ID·HealthKit의 실제 동작을 검증할 수 없습니다.

### Apple 로그인

- Apple 공식 로그인 로고와 공통 시스템 글꼴을 사용하는 버튼을 iOS에서만 표시합니다.
  Apple 요청의 `state`를 확인하고, 해시 nonce를 Apple에 전달하며 원본 nonce와 서명된 ID 토큰을
  `/auth/apple`로 보냅니다. 서버에서 서명·issuer·audience·만료·nonce를 검증해야 합니다.
- Apple이 최초 로그인에만 제공하는 이름은 선택 정보입니다. 클라이언트 이메일을 신뢰하거나
  같은 이메일의 Google 계정을 자동 연결하지 않습니다.
- Apple 연결 해제 이벤트와 앱 복귀 시 credential 상태를 확인하여 해당 Apple 세션을 정리합니다.
  네트워크 등 상태 조회 실패는 로그로 남기고 유효한 기존 세션을 임의로 삭제하지 않습니다.
- Apple Developer의 `com.hocompany.pace` App ID에 Sign in with Apple을 활성화하고,
  아래 백엔드 설정·배포를 완료한 후 실제 계정으로 테스트해야 합니다.
- Apple 계정 탈퇴는 새 Apple 인증을 받아 `DELETE /users/me`에
  `{ appleAuthorizationCode, appleNonce }`를 전달합니다. 서버가 코드 교환·subject 대조·Apple 토큰
  폐기를 완료한 후에만 탈퇴를 진행합니다. 재인증 취소나 Apple 폐기 실패 시 계정을 유지합니다.
  서버에는 `APPLE_CLIENT_IDS`, `APPLE_CLIENT_ID`(기본 `com.hocompany.pace`),
  유효한 `APPLE_CLIENT_SECRET`이 필요하며 기존 DB에는
  백엔드의 `database/apple-auth-schema.sql`을 먼저 적용해야 합니다.
  Apple client secret은 서버 전용 ES256 JWT로, 만료 전 교체해야 하며 프런트 환경 변수에 넣지 않습니다.

### 앱 잠금

- 설정의 **Face ID · 기기 암호로 앱 잠금**에서 계정별로 켤 수 있습니다.
  설정 변경 때도 기기 인증을 요구하고, 설정은 SecureStore에 보관합니다.
- 앱 시작과 **백그라운드 5분 이상** 이탈 후 복귀를 보호합니다. 시스템 권한창의 inactive나
  5분 미만 앱 전환만으로 재인증하지 않습니다. 비활성 상태에서는 프라이버시 커버를 사용합니다.
  최초 잠금 해제 전에는 보호된 화면을 마운트하지 않고,
  복귀 시에는 기존 화면 위를 가려 진행 중인 GPS 기록을 중단하지 않습니다.
  인증창 자체의 앱 상태 변화는 재잠금 루프를 만들지 않습니다.
- Face ID/Touch ID 실패 시 iOS 기기 암호를 허용합니다. 별도 PACE PIN을 만들거나 저장하지 않습니다.
  이 기능은 기존 세션 잠금 해제용이며 로그아웃·세션 만료를 소셜 로그인 없이 우회하지 않습니다.
  취소·오류는 잠금 해제 성공으로 처리하지 않고 재시도 상태를 제공합니다.

### Apple 건강

- iPhone 전용, 명시적 동의 후 연동합니다. 서버 설정 API가 실패해도 로컬 보안·건강 메뉴는 접근할 수 있습니다.
  화면 안의 동의 버튼에서 직접 시스템 권한을 요청하며, RN 확인 모달과 네이티브 권한창이 겹치지 않습니다.
  권한 요청은 60초, 모듈 로드·조회·저장은 각각 15초 후 명시적 오류·재시도를 제공합니다.
  시간 초과는 네이티브 요청을 취소하지 않습니다. 미완료 권한 요청 중 중복 요청을 차단하며,
  늦은 완료를 연동 성공으로 저장하지 않습니다. 권한창을 완료한 뒤 다시 시도하고,
  창이 없다면 앱을 종료 후 재실행합니다. 저장 재시도는 동일 sync identifier를 사용합니다.
- 읽기: **오늘 걸음 수**, **최근 30일 운동 최대 20개**. 원본과 조회 결과는 메모리에서만 사용하며
  PACE 서버 업로드, PACE 러닝 자동 생성, 크루·대결 순위 반영을 하지 않습니다.
- 쓰기: 연동 후 완료한 PACE 러닝을 건강 앱에 자동 저장합니다. 러닝 상세에서 기존 기록 저장·실패 재시도가 가능합니다.
  거리와 시작·종료 시각만 운동으로 저장하며 GPS 경로·심박·칼로리를 추정해 쓰지 않습니다.
- **건강 앱의 운동 시간은 시작~종료(일시 정지 포함)**입니다. 선택한 라이브러리가 pause event 저장을
  제공하지 않아 PACE의 실제 활동 시간과 다를 수 있으며, 이를 동의·상세 화면에 명시합니다.
  실제 활동 시간은 운동 metadata에 별도로 보존하고 기존 PACE 시간·페이스는 변경하지 않습니다.
- 로컬/서버 기록에 동일한 원본 `clientRunId` 기반 HealthKit sync identifier와 version을 사용해
  중복·중단 후 재시도를 보호합니다. 건강 앱 저장 실패는 이미 저장한 PACE 기록을 되돌리지 않습니다.
- Apple은 읽기 권한 거부 여부를 앱에 알려주지 않으므로 **데이터 없음/읽기 미허용 가능성**으로 안내합니다.
  연동 켜짐을 모든 권한 허용으로 표시하지 않고 쓰기 허용 여부는 별도로 검사합니다.
- 연동 끄기는 이후 조회·저장만 중단합니다. 기존 건강 운동의 삭제는 건강 앱에서 직접 해야 하며,
  PACE 기록 삭제·탈퇴 시 건강 기록까지 삭제했다고 표시하지 않습니다.
- 네이티브 HealthKit 연동은 `@kingstinct/react-native-healthkit` + Nitro Modules를 사용합니다.
  Expo SDK 57용 Apple/생체 인증 모듈과 config plugin이 권한 문구·capability를 생성합니다.
  HealthKit background delivery는 사용하지 않습니다.

### 권한·법적 안내와 공개 전 확인

- `/permissions`는 기기별 완료 상태를 온보딩과 별도로 저장합니다. 최초 안내에 진입하면 앱이 활성 상태일 때
  아직 결정하지 않은 foreground 위치 권한만 자동 요청합니다. 이미 거부한 권한·설정에서 연 안내는 자동 요청하지 않습니다.
  background 권한은 러닝 시작 시, Apple 건강은 처리 범위를 읽고 연동을 선택할 때 요청합니다.
  위치를 거부해도 확인 후 계속할 수 있고, 설정에서 다시 안내를 열 수 있습니다. Face ID는 로그인 후 별도 opt-in입니다.
- 이용 안내에서 온보딩 다시 보기 링크를 제거했습니다. 온보딩은 설치별 최초 완료 전까지 표시합니다.
- iOS 로그인 버튼은 문구 없이 공식 로고만 표시하는 56pt 원형 버튼을 가로로 배치합니다.
  VoiceOver에는 제공자별 로그인 이름을 전달하며 공식 Apple SVG의 비율·패딩은 유지합니다.
  [Apple 공식 로고 자산](https://developer.apple.com/design/resources/)과 동봉 라이선스는
  `assets/images/apple-login-*`에 보관합니다. 로그인 중에는 해당 제공자에만 진행 표시가 나타나며,
  다른 제공자의 버튼에는 진행 표시가 나타나지 않고 중복 인증은 차단됩니다. 웹은 Google SDK의 공식 원형 아이콘 버튼을 사용합니다.
  Google 아이콘은 Google 제공
  [로그인 브랜드 자산](https://developers.google.com/identity/branding-guidelines)을 기기에 포함해 네트워크 없이 표시합니다.
- 권한 안내는 필수 권한 없음, 선택 권한별 사용 목적, 변경 방법을 구분하고 확인 CTA를 하단에 고정합니다.
  실제 구현된 위치·건강·앱 잠금만 안내하며, 미구현 사진 업로드·푸시 권한을 미리 요구하지 않습니다.
- 로그인은 대형 PACE 워드마크·러닝 트랙 모티브를 중심으로 소개, 소셜 로그인, 법적 안내를 구분합니다.
  상단에는 뒤로가기만 두어 브랜드를 중복하지 않으며, 작은 화면에서는 전체 콘텐츠를 스크롤할 수 있습니다.
  실제 뒤로 갈 화면이 없으면 비동작 뒤로가기 버튼을 표시하지 않습니다.
- 로그인·설정 → **앱 정보 · 업데이트**에서 설치 버전/빌드, 실제 실행 중인 OTA ID,
  embedded/emergency 상태, 채널·런타임을 확인할 수 있습니다. 확인 후 다운로드와 적용을 분리하고,
  적용 직전에 진행 중인 러닝을 조회해 재시작을 차단합니다. 저장소 조회 실패도 우회하지 않습니다.
  네트워크 실패·이전 실행 실패·선택 정책 거부를 “최신 버전”으로 표시하지 않습니다.
  웹·개발 실행에서는 업데이트 API를 호출하지 않습니다.
- EAS 게시 성공과 실제 기기의 적용 성공은 다릅니다. 문제 보고 시 설치 빌드와 OTA ID를 함께
  확인하고, manifest뿐 아니라 프로토콜의 `assetRequestHeaders`를 사용해 번들·이미지의 실제 다운로드를
  검증합니다. 헤더 없이 CDN을 호출한 403은 자산 유실의 증거가 아닙니다.
  기존 설치에 새 화면이 없으면 이 안내를 받을 새 빌드 또는 OTA가 먼저 필요합니다.
  앱 삭제는 미동기화 기록을 지울 수 있으므로 업데이트 복구의 첫 단계로 권하지 않습니다.
- 로그인 화면과 설정에서 개인정보 처리방침·이용약관을, 설정에서 도움말·삭제 요청 안내를 제공합니다.
  운영자 **김호성**, 문의 **hosung0806@gmail.com**을 사용합니다.
- **현재 정책은 테스트 서비스 안내 초안입니다.** 실제 서버는 탈퇴를 삭제 대기로 전환하고 토큰을
  폐기하므로 즉시 완전 삭제로 안내하지 않습니다. 정식 공개 전 물리 삭제 절차·실제 보관기간·로그·백업,
  서버 소재지·위탁 업체·국외 이전 고지를 확정하고 문서를 법률 검토해야 합니다.
  이 화면을 추가한 것만으로 법적 요건이나 App Store 공개용 정책 URL 준비가 완료되지는 않습니다.
- Google/Apple 버튼은 별개의 터치 영역입니다. 크루의 내 행은 카드 여백 없이 전체 연두색으로 표시하며,
  빈 랭킹에는 내부 여백을 둡니다. 기록을 포함한 탭 제목·설명은 브랜드 헤더와 함께 고정합니다.
  Live Activity 타이머는 표시 영역별 폭과 오른쪽 정렬을 지정합니다.

### 러닝 성취 · 목표 · 공유

- 홈과 내 메뉴에서 배지 컬렉션·개인 최고 기록에 접근합니다. 배지는 첫 러닝, 단일 거리,
  누적 거리, 한 주 3일, 월 10회 달성으로 모으며 로그인 계정은 획득 이력과 대표 배지를 서버에 보관합니다.
- 배지는 외부 이미지·아이콘 팩을 다운로드하지 않고 PACE 전용 도형·타이포그래피로 직접 그립니다.
  첫 러닝·거리·꾸준함·크루 목표의 10종 디자인을 컬렉션, 대표 배지 요약, 완료 화면에 재사용합니다.
  획득 배지는 고유 컬러, 미획득 배지는 회색·진행률·도전 중 문구로 구분합니다.
  외부 배지 에셋 라이선스나 유료 구독은 필요하지 않으며 새 네이티브 의존성도 추가하지 않습니다.
  게스트는 기기의 PACE 기록에서 계산합니다. Apple 건강에서 읽은 운동은 중복 합산하지 않습니다.
- 주간 목표는 기존 계정 설정의 `weeklyGoalMeters`를 그대로 사용합니다.
  주·월 집계는 Asia/Seoul 기준입니다. 개인 최고 기록은 최장 거리와 실제 연속 GPS 1km 최단 경과 시간입니다.
  GPS 시각·거리로 정확히 1km 경계를 보간하고, 30초 초과 공백·부정확한 위치·비현실적 속도 구간을 끊습니다.
  짧은 정지는 경과 시간에 포함되며 전체 평균 페이스를 1/5/10km 기록으로 임의 환산하지 않습니다.
  동률은 최초 기록을 유지하고 완료 시 해당 러닝에서 세운 PR만 축하 팝업·애니메이션으로 보여줍니다.
  동작 줄이기 설정에서는 움직임을 생략합니다.
- 러닝 전 자유·3/5/10km·30분 목표와 음성 코치를 선택합니다. 목표 도달 후 자동 종료하지 않습니다.
  음성은 러닝 화면을 열어 둔 동안 1km마다 거리·평균 페이스와 목표 달성을 안내합니다.
  백그라운드 GPS 기록과 달리 잠금/다른 화면에서 음성 안내를 보장하지 않으며 iPhone 무음 모드에서는 들리지 않을 수 있습니다.
- 러닝 시작·일시정지·종료 버튼과 뒤로가기는 스크롤 밖에 고정합니다. 종료 화면에서 성취·배지와 공유 카드를 확인하고
  러닝 상세에서 컨디션(쉬움/적당/힘듦)·500자 이내 메모를 저장합니다.
  로그인 계정은 러닝 서버 동기화 후 회고를 계정에 저장하며, 게스트 회고는 기기에만 저장합니다.
- 공유 이미지는 완료 화면에서 자동 생성되는 인증서 스타일 PNG이며 거리·시간·페이스·경로 개요,
  해당 러닝에서 얻은 배지·PR을 포함합니다. 프라이버시 옵션을 바꾸면 이미지를 다시 만들고,
  OS 공유창에서 설치된 인스타그램·카카오톡 등 지원 대상을 선택합니다. 특정 앱으로 자동 게시하지 않습니다.
  지도 배경 타일이 아닌 경로 개요를 사용하며 생성·공유 오류와 재시도를 명시적으로 표시합니다.
  기본적으로 출발·도착 반경 200m를 숨기고 비공개 구간을 직선으로 잇지 않습니다.
  위치 추정 가능성이 완전히 제거되는 것은 아니므로 공유 전 이미지를 확인해야 합니다.
  사진 라이브러리 권한 없이 OS 공유창을 사용하며 웹에서는 이미지 공유를 지원하지 않습니다.
- 크루 상세에 월간 공동 목표·기여 거리를 표시합니다. 목표 변경은 크루장만 가능하고
  현재 멤버가 가입 후 시작한 해당 월의 PACE 러닝을 합산합니다.
  설정 전 목표는 미설정으로 안내하며, 목표 설정 후 새로 달성했을 때 기여한 현재 멤버에게 공동 배지를 지급합니다.
  목표를 낮추거나 과거 기록을 늦게 가져온 것만으로 소급 지급하지 않습니다.
- **서버 배포 전에** 백엔드 `database/progress-schema.sql`을 운영자가 수동 적용해야 합니다.
  실제 DB 변경이나 서버 배포는 이 코드 작업에 포함되지 않습니다.
- **새 네이티브 빌드가 필요합니다.** `expo-speech`, `expo-sharing`, `react-native-view-shot` 추가로
  앱 버전/런타임을 **1.0.5**로 올렸습니다. 기존 1.0.4 빌드에 이 변경을 OTA로 보내면 안 됩니다.
  EAS 빌드 및 실제 iPhone에서 음성·이미지 공유·GPS·안전 영역을 확인한 뒤 배포해야 합니다.

### 검증 및 실제 기기 확인 항목

- 자동 검사: 기존 API·Google 웹 로그인·환경 테스트, 온보딩 저장 실패,
  Apple nonce/state/취소, 생체 인증 취소·계정별 설정, 건강 동의·권한 거부·중복 키·조회 범위.
- 웹: 온보딩 완료 후 새로고침 시 재노출 없음, 게스트 보안/건강 메뉴, 미지원 플랫폼 안내,
  크루 랭킹/멤버 강조 배경이 둥근 카드 밖으로 나오지 않는지 확인합니다.
- 새 iOS 빌드: Apple 최초/재로그인·취소·연결 해제·탈퇴, Face ID 허용/거부·기기 암호·앱 복귀,
  GPS 기록 중 잠금·복귀, 건강 읽기/쓰기 개별 허용·거부·중복 재시도를 실제 iPhone에서 확인해야 합니다.
  native production compilation과 실제 OS 권한창·Apple/HealthKit 성공은 JS export만으로 완료 처리하지 않습니다.

## 백엔드 연동과 iOS 빌드

### 연결 주소와 인증 설정

- 기본 API: `https://hosung-macmini.tailfb288b.ts.net/dev/api/api/v1`
- Swagger: `https://hosung-macmini.tailfb288b.ts.net/dev/api/swagger-ui/index.html`
- `/dev/api`는 프록시 접두사, `/api/v1`은 서버의 API 경로입니다. `api` 중복을 임의로 제거하면 안 됩니다.
- 테스트 iPhone도 **Tailscale에 로그인하고 해당 서버에 접근 가능**해야 합니다.
  개발 서버는 인터넷에 공개된 운영 API가 아닙니다.
- `.env.example`을 참고해 `.env.local`에 `EXPO_PUBLIC_API_BASE_URL`을 지정할 수 있습니다.
  Expo의 public 환경 변수는 빌드·업데이트 때 번들에 포함됩니다. 서버 비밀번호나
  OAuth 클라이언트 시크릿을 넣지 마세요.
- 공개 Google 클라이언트 ID는 `src/constants/api.ts`에 있습니다.
  iOS 클라이언트의 번들 ID는 `com.hocompany.pace`여야 합니다.
- 백엔드의 `GOOGLE_CLIENT_IDS`에는 다음 **두 ID를 쉼표로 구분**해 설정합니다.
  서버가 ID 토큰의 `aud`와 `azp`를 검사하므로 한쪽이 빠지면 실제 로그인이 거절될 수 있습니다.

  ```text
  569856299617-orl7jldniqah1qqmit3kutc9516n9f8o.apps.googleusercontent.com,569856299617-2ulippt30k87ubgkq1sotovovlfvsst7.apps.googleusercontent.com
  ```

### 저장·동기화 동작

- iOS 토큰은 SecureStore에 저장하며, 액세스 토큰 만료 시 refresh 요청을 한 번만 공유합니다.
  웹은 Google Identity Services 공식 버튼의 ID 토큰을 같은 `/auth/google` API로 전송합니다.
  웹 세션은 현재 탭의 메모리에만 저장하므로 페이지 새로고침·종료 후에는 다시 로그인해야 합니다.

### 개발·운영 환경 표시

- `EXPO_PUBLIC_APP_ENV=development`이면 공통 PACE 로고 옆에 `DEV` 배지를 표시합니다.
  기본값도 `development`라서 현재 개발 API를 쓰는 TestFlight 앱에도 표시합니다.
- 운영에서는 `EXPO_PUBLIC_APP_ENV=production`과 실제 운영 `EXPO_PUBLIC_API_BASE_URL`을
  함께 지정합니다. 운영 환경에는 배지가 렌더링되지 않습니다.
- 잘못된 환경 값이나 운영 설정에서 기본 개발 API·`/dev` 경로·localhost를 사용하는 경우
  설정 오류로 중단합니다. 개발 서버를 운영으로 잘못 표시하지 않도록 하기 위함입니다.
- `__DEV__`, TestFlight 여부, EAS 채널·환경 이름으로 API 환경을 판별하지 않습니다.
  EAS `production` 환경을 쓰더라도 개발 API라면 위 값은 `development`로 유지하세요.
- 값은 번들 생성 시 포함됩니다. 로컬에서는 `.env.local`에 설정하고 Expo를 다시 시작합니다.
  배포 시에는 해당 EAS 환경에도 동일하게 설정한 뒤 새 빌드 또는 EAS Update를 발행해야 합니다.
- 연결 실패 안내는 환경과 관계없이 “인터넷 연결을 확인해 주세요.”로 표시합니다.

### 로컬 웹 Google 로그인

```bash
npx expo start --web --port 8088
```

- `http://localhost:8088/login`에서 로그인합니다. Google Cloud의 **웹 클라이언트**에
  승인된 JavaScript 원본 `http://localhost:8088`을 등록해야 합니다.
  `http://127.0.0.1:8088`은 다른 원본이므로 별도 등록 없이 바꾸어 사용하지 마세요.
- 웹 클라이언트 ID는 `GOOGLE_WEB_CLIENT_ID`를 사용합니다. 클라이언트 시크릿은 필요하지 않습니다.
- 팝업 방식이므로 Google 계정 선택 창을 허용하세요. OAuth 앱이 테스트 상태라면
  Google Cloud에 해당 계정을 테스트 사용자로 등록해야 합니다.
- 브라우저가 Google 스크립트를 차단하거나 불러오지 못하면 오류와 재시도를 표시합니다.
- API에 접근하려면 이 컴퓨터에서도 Tailscale이 필요합니다. 백엔드 CORS 허용 원본에
  `http://localhost:8088`이 포함되어 있어야 합니다. Google 원본 등록과 API CORS는 별개입니다.
- 배포된 웹에서도 사용하려면 실제 HTTPS 웹 원본을 Google Cloud와 서버 CORS에 각각 등록합니다.

### 계정 기록 동작

- 로그인 전 러닝은 기존 기기 저장소를 그대로 사용합니다. 로그인 안내에 따라
  미연결 완료 기록과 GPS 경로를 첫 연결 계정으로 이전하고 서버에 전송합니다.
- 로그인한 상태의 완료 기록은 계정별 전송 대기열에 먼저 저장합니다.
  네트워크 실패 시 기기 저장 완료와 서버 동기화 실패를 구분해 안내합니다.
  홈·기록·통계 화면을 다시 열면 미전송 기록을 재시도합니다. 실패를 정상적인 빈 목록으로
  숨기지 않으며, 오프라인 계정 목록 조회는 현재 지원하지 않습니다.
- `clientRunId`와 `Idempotency-Key`를 유지해 재전송 중복을 방지합니다.
  계정을 바꿔도 이전 계정의 대기 기록이 다른 계정으로 전송되지 않습니다.
- GPS 수집 시 러닝 시작 전 캐시, 수신 시각 이후, 역순 샘플은 제외합니다.
  이전 버전의 미전송 기록은 기기 원본을 유지하며 시작·종료 범위와 시간 순서를
  만족하는 경로만 전송합니다. 제외 개수는 진단 로그에 남기며 거리·러닝 시간은 변경하지 않습니다.
- 진행 중인 러닝이 있으면 로그인·로그아웃·탈퇴를 막습니다. 먼저 종료·저장해 주세요.
- 삭제는 서버 성공을 확인하며 되돌리기도 서버 복구 API를 사용합니다.
  계정 탈퇴는 확인창을 거쳐 서버에 삭제를 요청하고 해당 계정의 기기 캐시와 세션을 정리합니다.
- 계정 홈·통계는 `Asia/Seoul` 기준입니다. 기기 모드는 기기의 로컬 시간대를 사용합니다.
- 크루·대결 방 데이터는 서버에 저장합니다. 미디어 업로드·실제 푸시·대결 GPS 결과 집계는
  이번 연동 범위가 아닙니다.
- 마이 탭의 프로필 수정은 별도 화면에서 닉네임(2~30자)과 소개(최대 150자)를 편집합니다.
  키보드 회피, 입력 길이 안내, 저장 중 중복 요청 방지와 오류 후 재시도를 지원합니다.
- 홈·기록·통계·프로필은 로딩이나 조회 실패를 가짜 0값·빈 기록으로 표시하지 않습니다.
  실패 시 화면 내 재시도로 복구할 수 있습니다.

### 크루·대결 API 배포 순서

이 프론트엔드는 새 크루·대결 API가 필요합니다. **DB와 백엔드를 먼저 배포한 뒤 OTA를 발행**합니다.

1. 백엔드 저장소의 `database/community-schema.sql`을 DBeaver에서 대상 DB에 수동 적용합니다.
   기존 사용자·러닝 스키마를 지우거나 전체 초기화 SQL을 다시 실행하지 마세요.
2. 백엔드를 Jenkins/Argo 배포 절차로 배포하고 Swagger에서 `/crews`, `/races`,
   `/users/me/crew` 경로를 확인합니다.
3. 인증된 기기에서 빈 목록 → 생성 → 재조회 → 참가·탈퇴를 검증합니다.
4. 아래 OTA 명령을 실행합니다. EAS의 `production` 환경 선택만으로 개발 API가 운영 API로
   바뀌지는 않습니다. 배포 대상에 맞는 `EXPO_PUBLIC_API_BASE_URL`을 확인하세요.

### 네이티브 빌드와 후속 EAS Update

Google 네이티브 모듈, iOS URL scheme, SecureStore가 추가되었으므로 **새 iOS 빌드가 필요**합니다.
`app.json`의 현재 앱 버전은 `1.0.5`, runtimeVersion 정책은 `appVersion`입니다.
현재 네이티브 변경을 기존 `1.0.4` 이하 설치본에 OTA로 전달하지 마세요.

```bash
# iPhone/TestFlight용 서명 빌드 생성 (업로드·심사 요청은 하지 않음)
npx eas-cli@latest build --platform ios --profile production

# App Store Connect/TestFlight 업로드가 필요할 때만 별도 실행
npx eas-cli@latest submit --platform ios --profile production --latest

# 1.0.5 빌드 설치 후 네이티브 변경 없는 JS/UI 수정에만 사용
npx eas-cli@latest update --channel production --environment production --platform ios --message "Connect crews and races; polish profile UX"
```

`development-simulator` 프로필은 시뮬레이터용입니다. iPhone에 설치할 수 없고 Expo Go에도
새 Google 네이티브 모듈이 포함되지 않습니다. `production` 프로필은 빌드 이름일 뿐이며,
현재 기본 API는 개발 서버입니다. 정식 배포 전 운영 API 주소, 개인정보 처리방침,
Google 동의 화면과 테스트 사용자 설정을 확인해야 합니다.

최종 기기 검증은 새 빌드에서 Google 로그인 → 게스트 기록 이전 → 러닝 저장 →
홈·통계 확인 → 삭제·복구 → 로그아웃·재로그인 순서로 진행합니다.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

   If your phone cannot reach the development server over LAN, use a tunnel:

   ```bash
   npx expo start --tunnel --clear
   ```

   Stop the existing server with `Ctrl+C` before restarting. Use Expo Go compatible
   with SDK 57. After changing native dependencies, restart Metro with `--clear`;
   development builds also need to be rebuilt. Keep native package versions aligned
   with the SDK using `npx expo install --check` and `npx expo install <package>`.
   A working tunnel does not prevent errors caused by incompatible native modules.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Deploy the web app with Docker

The image serves the Expo web app with nginx on port 80, not the Expo
development server. Web output is `static`: Expo exports HTML and assets into
`dist`, which the image copies into the nginx document root. Server rendering
and API routes require a separate server deployment.

Build and publish after authenticating to GHCR with an account that can push:

```bash
docker build --no-cache -t ghcr.io/hosung98/pace-frontend:v1 .
docker push ghcr.io/hosung98/pace-frontend:v1
```

On the deployment host:

```bash
docker pull ghcr.io/hosung98/pace-frontend:v1
docker run -d --name pace-frontend -p 8080:80 ghcr.io/hosung98/pace-frontend:v1
```

Open `http://localhost:8080` on that host. If a container already exists, stop
and remove that container before running its replacement. Pushing the same tag
does not update running containers: pull the new image and recreate them.
Build for the deployment host's CPU architecture if it differs from the build
machine.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **example** directory and create a blank **src/app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
