# PACE

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Current scope

PACE is a running journal with a dark, mobile-first interface. This first slice
contains a branded launch splash, three Korean onboarding pages, a social-login
UI prototype, and sample running home, history, statistics, crew/race, profile,
and settings screens. Screen data and social login buttons are prototypes and
are not connected to a backend.

- Next, centered page indicators, and horizontal swipes across the illustration
  and text area navigate the onboarding. Swipe right to go back; there is no back
  button. Skip goes to page three.
- The final onboarding page leads to a login prototype. Its provider buttons do
  not authenticate yet; use the preview link to open the sample dashboard.
- The dashboard at `/main` shows sample metrics. Starting a run opens native
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
  code or request, and leave (one crew per user). Crews have an activity region
  (시/도 + 시/군/구, picked from a list — no GPS coordinates are stored), and
  **크루 찾기** searches by name and region ("내 위치로" reverse-geocodes on the
  device; iOS/Android only). **Race** lists open and joined remote races (same
  start time, ranked by time to the target distance), with create, join/leave,
  join by code, host cancel, a start countdown, and results. **대결 찾기**
  filters open races by distance, start window, and full rooms (races have no
  location).
  All crew/race data is in-memory sample data (`src/data/crew-repository.ts`,
  `src/data/race-repository.ts`) and resets when the app restarts.
- Settings controls only update the preview UI; they are not persisted or synced.
- GPS routes are stored locally on the device. Force-quitting the app or
  operating-system battery restrictions can interrupt background recording;
  cloud sync is not connected.
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
  | `src/data` | Repositories — the only layer that touches storage. Swap these for API calls when the backend is connected |
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

Validate changes with `npm run lint` and `npx tsc --noEmit`.

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
