import type { NextConfig } from "next";
// import withSerwistInit from "@serwist/next";

// const withSerwist = withSerwistInit({
//   // Service Worker 엔트리 파일 경로
//   swSrc: "src/app/sw.ts",
//   // 빌드 후 생성되는 SW 경로 (public/)
//   swDest: "public/sw.js",
//   // 개발 환경에서는 SW 비활성화 (캐시 혼란 방지)
//   disable: process.env.NODE_ENV === "development",
//   // Workbox 매니페스트에서 제외할 패턴
//   exclude: [/middleware-manifest\.json$/],
//   // 추가 Workbox 옵션
//   additionalPrecacheEntries: [{ url: "/offline", revision: null }],
// });

const nextConfig: NextConfig = {
  // 이미지 최적화: WebP/AVIF 자동 변환
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
  // 실험적 기능
  experimental: {
    // App Router 서버 컴포넌트 최적화
    optimizePackageImports: ["firebase/app", "firebase/firestore", "firebase/auth"],
  },
};

// export default withSerwist(nextConfig);
export default nextConfig;
