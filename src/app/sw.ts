import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate, NetworkOnly } from "serwist";
import { Serwist } from "serwist";
import { ExpirationPlugin } from "serwist";
import { CacheableResponsePlugin } from "serwist";

// TypeScript: Serwist 글로벌 타입 선언
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const OFFLINE_PAGE = "/offline";
const STATIC_CACHE = "torenote-static-v1";
const EXERCISE_CACHE = "torenote-exercises-v1";
const IMAGE_CACHE = "torenote-images-v1";
const WORKOUT_CACHE = "torenote-workouts-v1";
const FONT_CACHE = "torenote-fonts-v1";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // ─────────────────────────────────────────────
    // 1. 오프라인 폴백 페이지 (Cache First)
    // ─────────────────────────────────────────────
    {
      matcher: ({ url }) => url.pathname === OFFLINE_PAGE,
      handler: new CacheFirst({
        cacheName: STATIC_CACHE,
      }),
    },

    // ─────────────────────────────────────────────
    // 2. 정적 에셋: JS, CSS (Cache First)
    //    빌드 해시가 포함되어 있으므로 영구 캐시 가능
    // ─────────────────────────────────────────────
    {
      matcher: ({ request }) =>
        request.destination === "script" || request.destination === "style",
      handler: new CacheFirst({
        cacheName: STATIC_CACHE,
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1년
          }),
        ],
      }),
    },

    // ─────────────────────────────────────────────
    // 3. 일본어 폰트 (Cache First + 장기 캐시)
    //    구글 폰트 CDN 또는 next/font 셀프호스팅
    // ─────────────────────────────────────────────
    {
      matcher: ({ url }) =>
        url.origin === "https://fonts.gstatic.com" ||
        url.pathname.includes("/_next/static/media/"),
      handler: new CacheFirst({
        cacheName: FONT_CACHE,
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 30,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1년
          }),
        ],
      }),
    },

    // ─────────────────────────────────────────────
    // 4. 운동 라이브러리 (StaleWhileRevalidate)
    //    /exercises/* — 자주 바뀌지 않지만 최신 상태 유지 필요
    //    오프라인에서 캐시된 데이터 즉시 반환, 백그라운드 갱신
    // ─────────────────────────────────────────────
    {
      matcher: ({ url }) => url.pathname.startsWith("/exercises"),
      handler: new StaleWhileRevalidate({
        cacheName: EXERCISE_CACHE,
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7일
          }),
        ],
      }),
    },
    // ─────────────────────────────────────────────
    // 헬스 체크 API (Network Only)
    // ─────────────────────────────────────────────
    {
      matcher: ({ url }) => url.pathname === '/api/health',
      handler: new NetworkOnly(),
    },

    // ─────────────────────────────────────────────
    // 5. 운동 기록 API (Network First)
    //    /api/workouts/* — 최신 데이터가 중요하나 오프라인 지원 필요
    //    Firestore가 IndexedDB 오프라인 캐시를 직접 처리하므로
    //    SW는 API 라우트에 대해 Network First로 처리
    // ─────────────────────────────────────────────
    {
      matcher: ({ url }) =>
        url.pathname.startsWith("/api/workouts") ||
        url.pathname.startsWith("/workout"),
      handler: new NetworkFirst({
        cacheName: WORKOUT_CACHE,
        networkTimeoutSeconds: 5, // 5초 이내 응답 없으면 캐시 반환
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 24 * 60 * 60, // 24시간
          }),
        ],
      }),
    },

    // ─────────────────────────────────────────────
    // 6. 운동 썸네일 이미지 (Cache First)
    //    Firebase Storage 이미지 — 변경 빈도 낮음
    // ─────────────────────────────────────────────
    {
      matcher: ({ url, request }) =>
        request.destination === "image" ||
        url.hostname === "firebasestorage.googleapis.com",
      handler: new CacheFirst({
        cacheName: IMAGE_CACHE,
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30일
          }),
        ],
      }),
    },

    // ─────────────────────────────────────────────
    // 7. AI 루틴 추천 API (Network Only)
    //    실시간 생성이 필요한 API — 오프라인 시 실패 허용
    //    오프라인 상태에서는 UI에서 별도 안내 처리
    // ─────────────────────────────────────────────
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/ai"),
      handler: new NetworkOnly(),
    },

    // ─────────────────────────────────────────────
    // 8. Firebase Auth 토큰 관련 요청 (Network Only)
    //    보안상 캐싱 금지 — 항상 최신 토큰 사용
    // ─────────────────────────────────────────────
    {
      matcher: ({ url }) =>
        url.hostname.includes("identitytoolkit.googleapis.com") ||
        url.hostname.includes("securetoken.googleapis.com"),
      handler: new NetworkOnly(),
    },

    // ─────────────────────────────────────────────
    // 9. Next.js 기본 캐싱 전략 (Serwist 기본값)
    // ─────────────────────────────────────────────
    ...defaultCache,
  ],
});

// 오프라인 폴백: 네비게이션 요청이 실패하면 /offline 반환
serwist.addEventListeners();
