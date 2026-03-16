import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import OfflineStatusBar from "@/components/pwa/OfflineStatusBar";
import BottomNav from "@/components/layout/BottomNav";

/**
 * Noto Sans JP 설정
 *
 * CJK 폰트는 파일이 100개 이상으로 분할되므로 preload: false 필수.
 * preload: false 시 font-display가 자동으로 'swap'으로 변경됨.
 * next/font가 빌드 시 자동 셀프호스팅 처리 (Google Fonts 요청 없음).
 */
const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  preload: false, // CJK 폰트 필수 설정
  display: "swap",
  variable: "--font-noto-sans-jp",
  fallback: [
    "Hiragino Sans",
    "Hiragino Kaku Gothic ProN",
    "Yu Gothic",
    "Meiryo",
    "sans-serif",
  ],
});

export const metadata: Metadata = {
  title: {
    default: "ToreNote - トレーニングノート",
    template: "%s | ToreNote",
  },
  description: "ジムでのトレーニングを記録・管理するフィットネスアプリ。地下ジムでもオフライン対応。",
  keywords: ["トレーニング", "筋トレ", "ワークアウト", "フィットネス", "記録"],
  authors: [{ name: "ToreNote" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ToreNote",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "ToreNote",
    title: "ToreNote - トレーニングノート",
    description: "ジムでのトレーニングを記録・管理するフィットネスアプリ",
  },
};

/**
 * viewport는 metadata와 분리하여 export (Next.js 14+ 권장)
 * 다크 모드: theme-color를 미디어 쿼리로 두 개 선언
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // 운동 기록 중 실수로 확대되는 것 방지
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning className={notoSansJP.variable}>
      <head>
        {/* iOS Safari: 홈 화면 아이콘 */}
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.png" />
        {/* iOS Safari: 스플래시 스크린 (iPhone 14 Pro 예시) */}
        <link
          rel="apple-touch-startup-image"
          href="/icons/splash-1179x2556.png"
          media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)"
        />
      </head>
      <body className={`${notoSansJP.className} bg-zinc-950 text-zinc-100 antialiased`}>
        {/* 오프라인 상태 바 — 최상단 고정 */}
        <OfflineStatusBar />
        {children}
        <BottomNav />
        <InstallPrompt />
      </body>
    </html>
  );
}
