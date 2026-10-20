# PACE 백엔드 API 요구사항 (초안)

현재 앱의 홈, 기록, 통계, 소셜, 마이/설정 화면은 정적 샘플 데이터를 사용합니다.
이 문서는 Spring Boot 백엔드 구현을 시작할 때 필요한 API와 데이터 계약을
제안합니다. 경로와 필드명은 초안이며, 인증·러닝 측정 방식을 결정한 뒤 확정할
수 있습니다.

## 공통 규칙

- Base path: `/api/v1`
- 요청·응답 본문: UTF-8 JSON
- 시간: ISO 8601 UTC (`2026-10-20T05:00:00Z`)
- 거리: 미터 정수(`distanceMeters`), 평균 페이스: 초/킬로미터
  (`averagePaceSecondsPerKm`)
- 인증이 필요한 API는 `Authorization: Bearer <accessToken>` 사용
- 목록 응답은 커서 기반 페이지네이션 사용
- 오류 응답은 `code`, `message`, `requestId`를 포함

```json
{
  "code": "VALIDATION_ERROR",
  "message": "요청 값을 확인해 주세요.",
  "requestId": "req_01..."
}
```

## 1. 소셜 로그인

### `POST /auth/{provider}`

지원 provider: `google`, `kakao`, `apple`.

앱에서 얻은 provider 인증 결과를 서버가 검증하고, PACE 자체 세션을 발급합니다.
provider별 SDK가 주는 결과가 다를 수 있으므로 앱은 provider access token을
임의로 PACE access token처럼 사용하지 않습니다. authorization code, ID token,
PKCE 사용 여부는 플랫폼과 provider SDK 설정에 맞춰 확정합니다.

예시 요청(공통 계약의 초안):

```json
{
  "authorizationCode": "<provider authorization code>",
  "redirectUri": "pacefrontapp://auth/callback",
  "codeVerifier": "<PKCE verifier when used>"
}
```

성공 응답:

```json
{
  "accessToken": "<pace access token>",
  "refreshToken": "<pace refresh token>",
  "expiresIn": 3600,
  "user": {
    "id": "user_123",
    "displayName": "러너",
    "profileImageUrl": null
  },
  "isNewUser": true
}
```

앱 재시작 시 세션 갱신이 필요하면 `POST /auth/refresh`로 refresh token을 교환하고,
로그아웃 시 `POST /auth/logout`에서 refresh token을 폐기합니다.

### `POST /auth/refresh`

요청: `{ "refreshToken": "<pace refresh token>" }`

응답: 새 `accessToken`, 회전된 `refreshToken`, `expiresIn`을 반환합니다.
이전 refresh token은 재사용할 수 없도록 폐기합니다.

### `POST /auth/logout`

요청: `{ "refreshToken": "<pace refresh token>" }`

응답: `{ "success": true }`. 서버는 전달된 refresh token을 폐기합니다.

## 2. 내 정보

### `GET /users/me`

로그인 사용자의 `id`, `displayName`, `profileImageUrl`, `createdAt`을 반환합니다.
인사말에 쓸 이름이 아직 없을 때 앱이 사용할 표시명 규칙도 정하면 좋습니다.

## 3. 메인 대시보드

### `GET /dashboard?from=2026-10-19&to=2026-10-25`

현재 주간 요약, 일별 러닝 거리, 최근 러닝 한 건을 한 번에 반환합니다.
화면의 통계를 위해 권장하는 응답 형태:

```json
{
  "period": {
    "from": "2026-10-19",
    "to": "2026-10-25",
    "timeZone": "Asia/Seoul"
  },
  "weeklyGoalMeters": 20000,
  "weeklyDistanceMeters": 12400,
  "weeklyRunCount": 3,
  "dailyDistances": [
    { "date": "2026-10-19", "distanceMeters": 2800 },
    { "date": "2026-10-20", "distanceMeters": 0 }
  ],
  "recentRun": {
    "id": "run_123",
    "startedAt": "2026-10-18T22:00:00Z",
    "distanceMeters": 5240,
    "durationSeconds": 1949,
    "averagePaceSecondsPerKm": 372
  }
}
```

기록이 없을 때는 `recentRun: null`, 누락 날짜는 거리 `0`으로 반환하면 앱에서
빈 화면과 주간 그래프를 일관되게 표시할 수 있습니다. 주간 경계 계산은 요청의
`timeZone` 기준으로 합니다.

## 4. 러닝 기록

### `GET /runs?cursor=<cursor>&limit=20`

사용자 러닝 기록 목록. 최신순 정렬과 `nextCursor`를 반환합니다.

응답 예시:

```json
{
  "items": [
    {
      "id": "run_123",
      "title": "한강 저녁 러닝",
      "startedAt": "2026-10-18T09:42:00Z",
      "distanceMeters": 5240,
      "durationSeconds": 1949,
      "averagePaceSecondsPerKm": 372
    }
  ],
  "nextCursor": null
}
```

### `POST /runs`

러닝 종료 후 요약과 경로를 서버에 저장합니다. 모바일 네트워크가 끊겨도 기록을
잃지 않도록 앱은 먼저 기기에 저장하고, 연결 복구 시 동기화하는 흐름을 권장합니다.
현재 앱 프로토타입은 위치 권한을 받은 뒤 네이티브 백그라운드 작업으로 GPS 위치를
수집하고 러닝 경로/요약을 기기에 저장합니다. 서버 동기화는 아직 연결되지
않았습니다. GPS 수집은 Expo Location을 이용하는 앱의 네이티브 기능이며,
백엔드 API와는 별개입니다. 앱은 화면 잠금 중에도 위치를 수집하도록 OS에
요청하고 러닝 종료 즉시 해당 작업을 중지합니다. 서버 업로드 시 중복 생성을
방지하기 위해 `Idempotency-Key` 헤더를 지원합니다.

```json
{
  "clientRunId": "local-run-uuid",
  "startedAt": "2026-10-20T05:00:00Z",
  "endedAt": "2026-10-20T05:32:29Z",
  "distanceMeters": 5240,
  "durationSeconds": 1949,
  "routePoints": [
    {
      "sequence": 0,
      "recordedAt": "2026-10-20T05:00:00Z",
      "latitude": 37.544,
      "longitude": 127.037,
      "altitudeMeters": 18.2,
      "accuracyMeters": 8,
      "speedMetersPerSecond": 2.68
    }
  ]
}
```

서버는 저장된 러닝 `id`, 확정된 요약 값, 생성 시각을 반환합니다. 거리·페이스
계산의 최종 책임이 클라이언트인지 서버인지 구현 전에 결정해야 합니다. 권장안은
원시 경로를 보존하고 서버가 검증·재계산한 요약을 돌려주는 방식입니다.

거리 계산은 연속된 유효 GPS 좌표 간 geodesic 거리의 합입니다. 클라이언트는
정확도가 낮은 위치와 비현실적인 GPS 점프를 제외하지만, 실제 출시 전에 필터링
기준과 pause 구간, 고도/속도 계산, GPS 오차 표시 정책을 검증해야 합니다. 기기
센서가 반환한 순간 속도는 네트워크/수신 상태에 따라 null 또는 노이즈가 될 수
있으므로 원시 속도를 검증하고 서버에서도 요약값을 확인합니다.

#### iOS/Android 권한 및 실행 조건

- 위치 권한은 사용자가 러닝 시작을 누른 시점에 요청합니다. 앱 사용 중 위치 권한을
  먼저 요청하고, 화면 잠금 중에도 추적하려면 별도 백그라운드/Always 권한을
  요청합니다. 거부 시 위치 수집을 시작하지 않습니다.
- Android는 백그라운드 권한 외에 러닝 중 위치 Foreground Service와 지속 알림이
  필요합니다. iOS는 `location` background mode와 위치 권한 설명이 필요합니다.
- Expo 설정은 `expo-location` config plugin을 사용합니다. 백그라운드 위치는
  Expo Go와 웹/PWA에서 지원하지 않으므로 실제 기기용 development/standalone
  빌드에서 검증해야 합니다.
- OS가 앱을 종료하거나 제조사 배터리 정책이 적용되면 백그라운드 수집이 중단될 수
  있습니다. 앱 강제 종료 시 무중단 추적을 보장하지 않습니다.
- 좌표는 민감한 개인정보입니다. 사용자 동의와 보관·삭제 정책을 마련하고,
  목적에 필요한 기간만 저장하며, 공개 피드에 공유하는 경로는 기본 비공개로
  처리합니다. 화면 잠금 중 수집 여부와 수집 중단 상태를 명확히 보여줍니다.

### `GET /runs/{runId}`

러닝 상세와 요약을 조회합니다. 전체 GPS 경로가 필요하면 경로 포함 여부를 쿼리
옵션으로 분리해 응답 크기를 제한할 수 있습니다.

상세 응답은 목록 필드 외에 `endedAt`, `calories`, `splits`를 포함할 수 있습니다.
기록 상세의 경로 지도는 `includeRoute=true`일 때만 반환하고, GPS 민감정보를
최소화합니다.

## 5. 통계

### `GET /stats/running?period=week&timeZone=Asia%2FSeoul`

`period`: `week` 또는 `month`. 기간별 거리·시간·러닝 횟수·평균 페이스와
그래프에 쓸 일별/주별 집계를 반환합니다.

```json
{
  "period": "week",
  "from": "2026-10-19",
  "to": "2026-10-25",
  "timeZone": "Asia/Seoul",
  "totals": {
    "distanceMeters": 12400,
    "durationSeconds": 4930,
    "runCount": 3,
    "averagePaceSecondsPerKm": 398,
    "longestRunMeters": 5240
  },
  "buckets": [
    { "date": "2026-10-19", "distanceMeters": 2800, "runCount": 1 },
    { "date": "2026-10-20", "distanceMeters": 0, "runCount": 0 }
  ]
}
```

주간/월간 경계는 요청한 `timeZone`의 달력 기준으로 계산합니다. 기록이 없는
기간에도 `buckets`를 채워 0을 반환합니다.

## 6. 소셜 피드와 친구

### `GET /social/feed?cursor=<cursor>&limit=20`

내가 팔로우한 사용자의 공개 러닝 게시물을 최신순으로 반환합니다. 비공개 프로필,
차단, 팔로우 권한은 서버에서 강제해야 합니다.

```json
{
  "items": [
    {
      "id": "post_101",
      "author": {
        "id": "user_456",
        "displayName": "지수",
        "profileImageUrl": null
      },
      "createdAt": "2026-10-20T06:30:00Z",
      "message": "오늘 아침 한강 러닝 완료!",
      "attachments": [
        {
          "id": "asset_122",
          "url": "https://cdn.example/social/asset_122.jpg",
          "width": 1200,
          "height": 1600
        }
      ],
      "run": {
        "id": "run_456",
        "distanceMeters": 5200,
        "durationSeconds": 1910,
        "averagePaceSecondsPerKm": 368
      },
      "reactionCount": 12,
      "reactedByMe": false
    }
  ],
  "nextCursor": null
}
```

피드의 필터는 `following`(팔로우 계정) 또는 `recommended`(추천 공개 게시물)로
확장할 수 있습니다. 현재 앱 UI의 “친구”는 상호 승인 관계가 아니라 팔로우 관계를
뜻하며, 비공개 계정은 요청 수락 후 게시물이 노출되는 방식으로 구분합니다.

### `GET /social/posts/me?cursor=<cursor>&limit=20`

로그인 사용자가 작성한 게시물을 최신순으로 반환합니다. 본인에게만 공개되는
게시물도 포함하며, 각 항목에 `visibility`와 공유된 러닝 요약을 반환합니다.

### `DELETE /social/posts/{postId}`

내 게시물을 삭제합니다. 게시물 소유자만 삭제할 수 있어야 합니다. 성공 시
`{ "success": true }`를 반환하고 연결된 미디어의 보관·정리 정책을 적용합니다.

### `POST /media/uploads`

이미지 업로드용 짧은 수명의 presigned URL을 발급합니다. 앱은 반환된 URL로
이미지 바이트를 직접 업로드한 뒤 완료 API를 호출합니다. 게시물을 작성하기 전에
업로드를 완료해야 합니다.

요청:

```json
{
  "fileName": "morning-run.jpg",
  "contentType": "image/jpeg",
  "sizeBytes": 1824000,
  "purpose": "social-post"
}
```

응답:

```json
{
  "uploadId": "upload_123",
  "uploadUrl": "https://storage.example/signed-upload-url",
  "method": "PUT",
  "requiredHeaders": { "Content-Type": "image/jpeg" },
  "expiresAt": "2026-10-20T07:00:00Z"
}
```

클라이언트는 `uploadUrl`로 바이너리를 `PUT` 업로드한 다음
`POST /media/uploads/{uploadId}/complete`를 호출합니다. 완료 응답의 `assetId`를
게시물 요청의 `attachmentIds`에 포함합니다. presigned URL은 짧게 만료시킵니다.

### `POST /media/uploads/{uploadId}/complete`

요청: `{ "checksumSha256": "<optional hex digest>" }`

응답:

```json
{
  "assetId": "asset_123",
  "contentType": "image/jpeg",
  "url": "https://cdn.example/social/asset_123.jpg",
  "width": 1200,
  "height": 1600
}
```

서버에서 MIME type·파일 크기·실제 파일 형식을 검증하며, 공개 피드에 게시되기
전 이미지의 GPS EXIF를 제거합니다. 업로드 실패 시 임시 파일은 정리합니다.

게시물 이미지 정책 초안은 이미지 최대 4장, 장당 최대 10 MB이며, 허용 포맷은
JPEG, PNG, HEIC/WebP 여부를 앱과 스토리지에서 검증한 뒤 확정합니다.

### `POST /social/posts`

메시지와 이미지를 게시하고, 원하면 완료한 내 러닝도 함께 공유합니다. `runId`는
선택 사항이며, 제공된 경우 원본 러닝 소유권을 확인합니다. 공개 범위는 매 게시물
작성 시 `visibility`로 필수 선택하며 서버 기본값에 의존하지 않습니다. 게시물에는
메시지, 러닝 기록 또는 이미지 중 하나 이상이 있어야 합니다.

요청:

```json
{
  "message": "한강 저녁 러닝 완료!",
  "visibility": "followers",
  "attachmentIds": ["asset_123", "asset_124"],
  "runId": "run_123"
}
```

응답은 생성된 게시물의 피드 항목을 반환합니다. `visibility`는 `private`,
`followers`, `public` 중 하나입니다.

```json
{
  "id": "post_102",
  "createdAt": "2026-10-20T06:45:00Z",
  "message": "한강 저녁 러닝 완료!",
  "visibility": "followers",
  "attachments": [
    {
      "id": "asset_123",
      "url": "https://cdn.example/social/asset_123.jpg",
      "width": 1200,
      "height": 1600
    }
  ],
  "run": {
    "id": "run_123",
    "distanceMeters": 5240,
    "durationSeconds": 1949,
    "averagePaceSecondsPerKm": 372
  },
  "reactionCount": 0,
  "reactedByMe": false
}
```

### `POST /social/posts/{postId}/reactions`

응원(cheer) 반응을 추가합니다. 같은 사용자의 중복 반응은 멱등 처리합니다.

요청: `{ "type": "cheer" }`

응답: `{ "reactionCount": 13, "reactedByMe": true }`

### `DELETE /social/posts/{postId}/reactions/cheer`

내 응원을 취소합니다. 응답은 갱신된 `reactionCount`와 `reactedByMe: false`를
반환합니다.

### `GET /social/users?query=<검색어>&cursor=<cursor>&limit=20`

로그인 사용자가 공개 검색을 허용한 프로필 중 `nickname`(닉네임) 또는
`alias`(별칭)으로 검색합니다. 검색은 대소문자를 구분하지 않는 부분 일치를
지원합니다. 검색어는 2자 이상이어야 하며, 전화번호나 이메일로 검색하지
않습니다. 차단된 계정과 검색 비허용 계정은 결과에서 제외합니다.

응답 항목은 친구 요청 UI에 필요한 `userId`, `nickname`, `alias`,
`profileImageUrl`, `followStatus`를 포함합니다. `followStatus`는
`none | outgoing_pending | incoming_pending | following` 중 하나이며,
전화번호·이메일·비공개 프로필의 러닝 기록은 응답하지 않습니다.

### `GET /social/follows?type=following|followers&cursor=<cursor>&limit=20`

내 팔로잉 또는 팔로워 목록을 반환합니다. 항목에는 `userId`, 표시명, 프로필
이미지, `followStatus`를 포함하고 커서 기반으로 페이지를 나눕니다.

### `POST /social/follows` 및 `DELETE /social/follows/{userId}`

요청: `{ "userId": "user_456" }`. 팔로우 요청 응답에 `status` (`pending` 또는
`following`)와 갱신된 `followerCount`를 반환합니다. 비공개 계정은 승인 전까지
피드가 노출되지 않습니다.

```json
{
  "userId": "user_456",
  "status": "pending",
  "followerCount": 84
}
```

비공개 계정이 받은 요청을 관리하기 위한 API:

- `GET /social/follow-requests?direction=incoming`: 받은 요청 목록을 조회합니다.
- `POST /social/follow-requests/{userId}/accept`: 요청을 수락하고 팔로우 관계를
  활성화합니다.
- `DELETE /social/follow-requests/{userId}`: 요청을 거절하거나 보낸 대기 요청을
  취소합니다.

요청 처리 API는 요청 대상 계정만 수락·거절할 수 있도록 권한을 검사합니다.

## 7. 내 프로필 및 앱 설정

### `PATCH /users/me`

표시명, 프로필 이미지, 프로필 공개 범위를 수정합니다. 변경 가능한 필드만
요청에 포함합니다.

```json
{
  "displayName": "PACE 러너",
  "visibility": "followers"
}
```

응답은 최신 사용자 프로필 전체를 반환합니다.

### `GET /users/me/settings`

`weeklyGoalMeters` 기본값은 `20000`이며, `5000`~`100000`m 범위에서
`5000`m 단위로 설정합니다. 로그인 전 앱은 같은 기준의 목표를 기기에 저장하고,
계정 연동 후에는 이 설정 API와 동기화합니다.

```json
{
  "distanceUnit": "km",
  "weeklyGoalMeters": 20000,
  "notifications": {
    "runReminder": true,
    "weeklySummary": true
  },
  "privateProfile": false
}
```

### `PATCH /users/me/settings`

일부 설정을 부분 갱신합니다. 미지원 값은 `400 VALIDATION_ERROR`로 응답합니다.
`weeklyGoalMeters`는 기본값·범위·단위 검증을 통과해야 합니다.

요청:

```json
{
  "distanceUnit": "mi",
  "weeklyGoalMeters": 25000,
  "notifications": {
    "runReminder": false
  },
  "privateProfile": true
}
```

응답은 수정된 설정 전체를 반환합니다. 앱 설정의 토글은 서버 저장 성공 전에는
저장 완료 상태로 표시하지 않습니다.

### `POST /devices/push-tokens`

알림을 허용한 기기의 push token을 사용자 계정에 등록하거나 갱신합니다.
토큰은 기기별로 관리하고, 로그아웃/토큰 무효화 시 삭제합니다.

요청: `{ "token": "<push token>", "platform": "ios" }`

응답: `{ "deviceId": "device_123", "active": true }`

### `DELETE /devices/push-tokens/{deviceId}`

현재 사용자 기기의 push token을 비활성화합니다. 응답은
`{ "success": true }`입니다.

### `DELETE /users/me`

계정 탈퇴 및 개인정보 삭제를 요청합니다. 로그인 재확인 정책을 적용하고,
러닝 GPS 원본·게시물·인증 provider 연결의 삭제/익명화 결과와 유예 기간을
서비스 정책으로 명확히 정의해야 합니다. 응답은 삭제 작업이 비동기라면 `202`
및 `requestId`를 반환합니다.

## 연동 전에 결정할 사항

1. Google, Kakao, Apple 각각의 OAuth 앱 등록 정보와 허용 redirect URI
2. access/refresh token 만료 시간, 회전 및 폐기 정책
3. 소셜 피드의 공개 선택 범위, 비공개 계정 승인, 신고·차단 및 게시물 삭제 정책
4. 러닝 데이터 보관 기간, 계정 탈퇴 시 기록 및 GPS 경로 삭제 정책
5. 주간 목표 기본값은 20km이며, 앱에서 5km 단위로 5~100km까지 변경 가능
6. 거리·페이스 계산, GPS 샘플링 간격 및 비정상 위치값 필터링 기준
7. 오프라인 동기화 재시도, 중복 요청 처리 및 기록 충돌 정책
8. 러닝 리마인더 시각, 푸시 토큰 수명 및 알림 수신 거부 처리
9. 이미지 업로드 최대 크기, 허용 포맷, 보관·삭제 기간 및 CDN 접근 정책

## 화면별 API 연결 요약

| 앱 화면 | 필요한 API |
| --- | --- |
| 소셜 로그인 | `POST /auth/{provider}`, `POST /auth/refresh`, `POST /auth/logout` |
| 홈 | `GET /users/me`, `GET /dashboard` |
| 기록 목록 | `GET /runs` |
| 기록 상세 | `GET /runs/{runId}` |
| 통계 | `GET /stats/running` |
| 소셜 피드 | `GET /social/feed`, media upload API, `POST /social/posts`, reactions API |
| 친구 찾기/관리 | `GET /social/users`, `GET /social/follows`, `POST /social/follows`, follow request API |
| 내 소셜 활동 | `GET /social/posts/me`, `DELETE /social/posts/{postId}` |
| 마이 프로필 | `GET /users/me`, `PATCH /users/me` |
| 앱 설정 | `GET /users/me/settings`, `PATCH /users/me/settings`, push token API |
| 계정 삭제 | `DELETE /users/me` |

실제 GPS 수집 기능을 만들기 전에는 위치 권한 안내, 백그라운드 위치 사용,
배터리 영향, 개인정보 고지와 iOS/Android 플랫폼별 권한 동작도 별도로 설계해야
합니다. 이 초안에는 특정 OAuth client secret이나 운영 credential을 넣지 않습니다.
