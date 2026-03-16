'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type NetworkStatus = 'online' | 'offline' | 'slow' | 'unknown';

export interface NetworkState {
  status: NetworkStatus;
  isOnline: boolean;
  isOffline: boolean;
  offlineDurationSeconds: number | null;
  lastOnlineAt: Date | null;
  isSlow: boolean;
  effectiveType: string | null;
}

interface UseNetworkStatusOptions {
  updateIntervalMs?: number;
  healthCheckUrl?: string; // 헬스 체크 URL 옵션 추가
  healthCheckIntervalMs?: number; // 헬스 체크 주기 옵션 추가
}

const getInitialState = (): NetworkState => {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  return {
    status: isOnline ? 'online' : 'offline',
    isOnline,
    isOffline: !isOnline,
    offlineDurationSeconds: null,
    lastOnlineAt: isOnline ? new Date() : null,
    isSlow: false,
    effectiveType: null,
  };
};

export function useNetworkStatus(options: UseNetworkStatusOptions = {}): NetworkState {
  const {
    updateIntervalMs = 1000,
    healthCheckUrl = '/api/health', // 기본 헬스 체크 URL
    healthCheckIntervalMs = 5000, // 5초마다 헬스 체크
  } = options;

  const [state, setState] = useState<NetworkState>(getInitialState);

  const offlineStartRef = useRef<Date | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const healthCheckTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateStatus = useCallback(
    (online: boolean, reason: 'event' | 'healthcheck') => {
      const now = new Date();

      setState((prevState) => {
        // 이미 같은 상태이면 변경하지 않음
        if (prevState.isOnline === online) return prevState;

        if (online) {
          offlineStartRef.current = null;
          if (durationTimerRef.current) {
            clearInterval(durationTimerRef.current);
            durationTimerRef.current = null;
          }
          return {
            ...prevState,
            status: 'online',
            isOnline: true,
            isOffline: false,
            offlineDurationSeconds: null,
            lastOnlineAt: now,
          };
        } else {
          if (!offlineStartRef.current) {
            offlineStartRef.current = now;
          }
          return {
            ...prevState,
            status: 'offline',
            isOnline: false,
            isOffline: true,
            offlineDurationSeconds: 0,
          };
        }
      });
    },
    []
  );

  // 헬스 체크 함수
  const performHealthCheck = useCallback(async () => {
    try {
      const response = await fetch(healthCheckUrl, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }, // 캐시 방지
        signal: AbortSignal.timeout(3000), // 3초 타임아웃
      });
      if (response.ok) {
        updateStatus(true, 'healthcheck');
      } else {
        throw new Error('Health check failed');
      }
    } catch (error) {
      updateStatus(false, 'healthcheck');
    }
  }, [healthCheckUrl, updateStatus]);

  useEffect(() => {
    // 이벤트 리스너 설정
    const handleOnline = () => updateStatus(true, 'event');
    const handleOffline = () => updateStatus(false, 'event');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 주기적인 헬스 체크 시작
    performHealthCheck(); // 초기 즉시 실행
    healthCheckTimerRef.current = setInterval(performHealthCheck, healthCheckIntervalMs);

    // 오프라인 시간 경과 타이머
    if (state.isOffline && !durationTimerRef.current) {
      durationTimerRef.current = setInterval(() => {
        if (offlineStartRef.current) {
          const elapsed = Math.floor((Date.now() - offlineStartRef.current.getTime()) / 1000);
          setState((prev) => ({ ...prev, offlineDurationSeconds: elapsed }));
        }
      }, updateIntervalMs);
    } else if (state.isOnline && durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    // 클린업
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (healthCheckTimerRef.current) {
        clearInterval(healthCheckTimerRef.current);
      }
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [state.isOffline, updateStatus, performHealthCheck, healthCheckIntervalMs, updateIntervalMs]);

  return state;
}
