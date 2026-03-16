"use client";

import { useState, useEffect, useCallback } from "react";

// beforeinstallprompt 이벤트 타입 (브라우저 표준 미포함, 수동 선언)
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

type Platform = "android" | "ios" | "desktop" | "unknown";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * PWA 설치 유도 컴포넌트
 *
 * 플랫폼별 동작:
 * - Android Chrome: beforeinstallprompt 이벤트 캡처 후 사용자가 원할 때 표시
 * - iOS Safari: 설치 방법 안내 모달 표시 (Share → "ホーム画面に追加")
 * - 이미 설치된 경우: 표시하지 않음
 *
 * 일본 사용자 대상 현지화:
 * - UI 텍스트를 일본어로 제공
 * - 헬스장 맥락에 맞는 메시지 사용
 */
export default function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showAndroidBanner, setShowAndroidBanner] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 이미 설치된 경우 표시 안 함
    if (isInStandaloneMode()) return;

    // 이미 사용자가 닫은 경우 (세션 내)
    const dismissed = sessionStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    const detectedPlatform = detectPlatform();
    setPlatform(detectedPlatform);

    // Android: beforeinstallprompt 이벤트 캡처
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // 브라우저 기본 프롬프트 억제
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowAndroidBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // iOS: Safari에서는 beforeinstallprompt가 없으므로 직접 안내
    // 첫 방문 후 3초 뒤에 안내 표시 (너무 즉각적이면 사용자 이탈)
    if (detectedPlatform === "ios") {
      const timer = setTimeout(() => {
        const hasSeenIOSGuide = localStorage.getItem("pwa-ios-guide-shown");
        if (!hasSeenIOSGuide) {
          setShowIOSGuide(true);
        }
      }, 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleAndroidInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        console.info("[PWA] ユーザーがインストールを承認しました");
      } else {
        console.info("[PWA] ユーザーがインストールを拒否しました");
      }
    } catch (error) {
      console.error("[PWA] インストールプロンプトエラー:", error);
    } finally {
      setDeferredPrompt(null);
      setShowAndroidBanner(false);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowAndroidBanner(false);
    setShowIOSGuide(false);
    setIsDismissed(true);
    sessionStorage.setItem("pwa-install-dismissed", "true");
  }, []);

  const handleIOSGuideClose = useCallback(() => {
    setShowIOSGuide(false);
    localStorage.setItem("pwa-ios-guide-shown", "true");
  }, []);

  // 표시 조건 미충족 시 렌더링 안 함
  if (isDismissed) return null;
  if (!showAndroidBanner && !showIOSGuide) return null;

  // ── Android 설치 배너 ──────────────────────────────────
  if (platform === "android" && showAndroidBanner) {
    return (
      <div
        role="banner"
        aria-label="アプリインストール案内"
        className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-zinc-900 border-t border-zinc-700 shadow-2xl"
      >
        <div className="flex items-center gap-3 max-w-md mx-auto">
          {/* アイコン */}
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-lg">
            T
          </div>

          {/* テキスト */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">
              ToreNoteをホーム画面に追加
            </p>
            <p className="text-zinc-400 text-xs mt-0.5 leading-snug">
              オフラインでもトレーニング記録OK。地下ジムでも安心！
            </p>
          </div>

          {/* ボタン群 */}
          <div className="flex flex-col gap-1 flex-shrink-0">
            <button
              onClick={handleAndroidInstall}
              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold rounded-lg transition-colors"
              aria-label="アプリをインストール"
            >
              追加する
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1 text-zinc-500 text-xs hover:text-zinc-300 transition-colors text-center"
              aria-label="後で"
            >
              後で
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── iOS Safari 設置案内モーダル ────────────────────────
  if (platform === "ios" && showIOSGuide) {
    return (
      <>
        {/* オーバーレイ */}
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={handleIOSGuideClose}
          aria-hidden="true"
        />

        {/* モーダル */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ホーム画面への追加方法"
          className="fixed bottom-0 left-0 right-0 z-50 p-6 bg-zinc-900 rounded-t-2xl border-t border-zinc-700 shadow-2xl"
        >
          <div className="max-w-md mx-auto">
            {/* ハンドルバー */}
            <div className="w-10 h-1 bg-zinc-600 rounded-full mx-auto mb-5" />

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                T
              </div>
              <div>
                <h2 className="text-white font-bold text-base">
                  ホーム画面に追加する
                </h2>
                <p className="text-zinc-400 text-xs">
                  アプリとして快適に使えます
                </p>
              </div>
            </div>

            {/* 手順 */}
            <ol className="space-y-3 mb-6">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <div>
                  <p className="text-white text-sm font-medium">
                    Safariの共有ボタンをタップ
                  </p>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    画面下部の{" "}
                    <span className="inline-block border border-zinc-600 rounded px-1 text-zinc-300">
                      ⎋
                    </span>{" "}
                    アイコン
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <div>
                  <p className="text-white text-sm font-medium">
                    「ホーム画面に追加」を選択
                  </p>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    リストをスクロールして見つけてください
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <div>
                  <p className="text-white text-sm font-medium">「追加」をタップ</p>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    右上の「追加」ボタンをタップして完了
                  </p>
                </div>
              </li>
            </ol>

            <button
              onClick={handleIOSGuideClose}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      </>
    );
  }

  return null;
}
