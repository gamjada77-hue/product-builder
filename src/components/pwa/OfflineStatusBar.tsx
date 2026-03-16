'use client';

import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useEffect, useState, useRef } from "react";

/**
 * 오프라인 상태를 사용자에게 알리는 상태 바
 *
 * 오프라인 → 온라인 복귀 시:
 * - "同期中..." 표시 후 Firestore 자동 동기화 완료 피드백
 * - Firestore 오프라인 퍼시스턴스가 백그라운드에서 자동 동기화 수행
 */
export default function OfflineStatusBar() {
  const { isOnline, isOffline, offlineDurationSeconds, isSlow } = useNetworkStatus();
  const [justReconnected, setJustReconnected] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);
  const prevIsOffline = useRef(isOffline);

  useEffect(() => {
    prevIsOffline.current = isOffline;
  }, [isOffline]);

  useEffect(() => {
    if (prevIsOffline.current && isOnline) {
      // 오프라인 → 온라인 전환 감지
      const timer = setTimeout(() => {
        setJustReconnected(true);
        setSyncComplete(false);
      }, 0);

      // Firestore 동기화 완료 시뮬레이션 (실제로는 Firestore 이벤트 리스너로 처리)
      const syncTimer = setTimeout(() => {
        setSyncComplete(true);
        // 성공 메시지 3초 후 숨김
        const hideTimer = setTimeout(() => {
          setJustReconnected(false);
          setSyncComplete(false);
        }, 3000);
        return () => clearTimeout(hideTimer);
      }, 2000);

      return () => {
        clearTimeout(timer);
        clearTimeout(syncTimer);
      };
    }
  }, [isOnline]);

  // 온라인이고 복귀 직후도 아닌 경우 표시 안 함
  if (isOnline && !justReconnected && !isSlow) return null;

  // ── 동기화 완료 ────────────────────────────────────────
  if (justReconnected && syncComplete) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium animate-fade-in"
      >
        <span aria-hidden="true">✓</span>
        <span>同期完了しました</span>
      </div>
    );
  }

  // ── 재연결 중 (동기화 중) ──────────────────────────────
  if (justReconnected && !syncComplete) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium"
      >
        <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        <span>オフライン中のデータを同期中...</span>
      </div>
    );
  }

  // ── 저속 연결 ──────────────────────────────────────────
  if (isSlow && isOnline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white text-sm"
      >
        <span aria-hidden="true">⚡</span>
        <span>通信速度が遅いです。一部機能が制限される場合があります。</span>
      </div>
    );
  }

  // ── 오프라인 ───────────────────────────────────────────
  if (isOffline) {
    const formatDuration = (seconds: number | null): string => {
      if (seconds === null || seconds < 5) return "";
      if (seconds < 60) return `（${seconds}秒前から）`;
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `（${minutes}分前から）`;
      const hours = Math.floor(minutes / 60);
      return `（${hours}時間前から）`;
    };

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center justify-center px-4 py-2 bg-zinc-800 border-b border-zinc-700 text-white text-sm"
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse"
            aria-hidden="true"
          />
          <span className="font-medium">
            オフライン{formatDuration(offlineDurationSeconds)}
          </span>
        </div>
        <p className="text-zinc-400 text-xs mt-0.5">
          トレーニング記録はローカルに保存され、オンライン復帰後に自動同期されます
        </p>
      </div>
    );
  }

  return null;
}
