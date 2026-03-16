"use client";

import { useState, useCallback } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  type DocumentReference,
} from "firebase/firestore";
import { getFirestoreWithOffline } from "@/lib/firebase/firestore-offline";
import { useNetworkStatus } from "./useNetworkStatus";

export interface WorkoutSet {
  exerciseId: string;
  weight: number; // kg
  reps: number;
  setNumber: number;
  note?: string;
}

export interface WorkoutLog {
  userId: string;
  sets: WorkoutSet[];
  startedAt: Date;
  completedAt?: Date;
  note?: string;
}

export type SyncStatus = "idle" | "saving" | "saved" | "pending-sync" | "error";

export interface UseOfflineWorkoutReturn {
  syncStatus: SyncStatus;
  pendingCount: number;
  saveSet: (set: WorkoutSet, workoutLog: WorkoutLog) => Promise<DocumentReference | null>;
  error: Error | null;
}

/**
 * 오프라인 지원 운동 기록 저장 훅
 *
 * 핵심 동작 원리:
 * 1. Firestore의 addDoc()은 오프라인 상태에서도 즉시 "성공"을 반환한다.
 *    (낙관적 업데이트 — 내부적으로 IndexedDB에 저장)
 * 2. 온라인 복귀 시 Firestore SDK가 자동으로 서버에 동기화한다.
 * 3. 개발자는 네트워크 상태와 무관하게 동일한 코드로 저장 가능.
 *
 * 따라서 별도의 큐 관리나 동기화 로직이 불필요하다.
 * (Firestore 오프라인 퍼시스턴스가 이를 처리)
 */
export function useOfflineWorkout(): UseOfflineWorkoutReturn {
  const { isOffline } = useNetworkStatus();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const saveSet = useCallback(
    async (set: WorkoutSet, workoutLog: WorkoutLog): Promise<DocumentReference | null> => {
      const db = getFirestoreWithOffline();
      setSyncStatus("saving");
      setError(null);

      try {
        // addDoc()은 오프라인에서도 즉시 반환 (낙관적 쓰기)
        // Firestore SDK가 내부적으로 IndexedDB에 저장하고 추후 동기화
        const docRef = await addDoc(
          collection(db, "users", workoutLog.userId, "workoutLogs"),
          {
            ...set,
            startedAt: workoutLog.startedAt,
            completedAt: workoutLog.completedAt ?? null,
            note: workoutLog.note ?? null,
            // serverTimestamp()도 오프라인에서 로컬 타임스탬프로 임시 처리됨
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );

        if (isOffline) {
          // 오프라인 상태에서 저장된 경우: 대기 카운트 증가
          setSyncStatus("pending-sync");
          setPendingCount((prev) => prev + 1);
        } else {
          setSyncStatus("saved");
          // 3초 후 상태 초기화
          setTimeout(() => setSyncStatus("idle"), 3000);
        }

        return docRef;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("저장 실패");
        console.error("[useOfflineWorkout] 저장 오류:", error);
        setError(error);
        setSyncStatus("error");
        return null;
      }
    },
    [isOffline]
  );

  return {
    syncStatus,
    pendingCount,
    saveSet,
    error,
  };
}
