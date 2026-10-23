# PACE

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Current scope

PACE is a running journal with a dark, mobile-first interface. This first slice
contains a branded launch splash, three Korean onboarding pages, GPS running,
and account-connected home, history, statistics, profile, and settings screens.
Google login is connected on iOS and web. Crew and race rooms use authenticated backend
APIs rather than sample data; an empty account can create a crew or race room.

- Next, centered page indicators, and horizontal swipes across the illustration
  and text area navigate the onboarding. Swipe right to go back; there is no back
  button. Skip goes to page three.
- 온보딩 다음 화면에서 iOS·웹 Google 로그인 또는 기기 모드를 선택합니다.
  카카오·Apple 로그인과 Android Google 로그인은 아직 연결하지 않았습니다.
- The dashboard at `/main` shows device or account metrics. Starting a run opens native
  GPS tracking with distance, elapsed time, speed, pause/resume, and on-device
  save. Background location requires a development/standalone build and OS
  permissions; browser/PWA and Expo Go cannot keep recording with the screen
  locked.
- The five bottom tabs use Expo Router's tab navigator: home, run history,
  statistics, crew, and profile. Switching tabs does not add a back-stack
  entry. App settings and run details are pushed as sub-screens with a back
  affordance; top-level tabs do not need one.
- Tab titles remain fixed while the screen content scrolls.
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
  onboarding. Reduced motion replaces the animation with a short static splash.
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
  | `src/features/auth` | Google 로그인, SecureStore 세션, 토큰 갱신 |
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
`node --test tests/api-integration.test.cjs`.

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
`app.json`의 앱 버전은 `1.0.3`, runtimeVersion 정책은 `appVersion`입니다.
기존 `1.0.2` 설치본에 이 변경을 OTA로 전달하지 마세요.

```bash
# iPhone/TestFlight용 서명 빌드 생성 (업로드·심사 요청은 하지 않음)
npx eas-cli@latest build --platform ios --profile production

# App Store Connect/TestFlight 업로드가 필요할 때만 별도 실행
npx eas-cli@latest submit --platform ios --profile production --latest

# 1.0.3 설치 후 네이티브 변경 없는 JS/UI 수정에만 사용
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
