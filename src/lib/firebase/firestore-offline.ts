/**
 * Firebase Firestore 오프라인 퍼시스턴스 초기화
 *
 * Next.js App Router 환경의 주의사항:
 * - 서버 컴포넌트에서 호출 금지 (클라이언트 전용)
 * - initializeFirestore는 getFirestore()보다 먼저 한 번만 호출해야 함
 * - persistentLocalCache()는 enableIndexedDbPersistence()의 모던 대체 API (Firebase JS SDK v9.19.1+)
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  CACHE_SIZE_UNLIMITED,
  type Firestore,
} from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase 앱 싱글톤 — 모듈 단위로 한 번만 초기화
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let isFirestoreInitialized = false;

function getFirebaseApp(): FirebaseApp {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  return app;
}

/**
 * Firestore 인스턴스를 반환한다.
 * 클라이언트 환경에서는 IndexedDB 오프라인 퍼시스턴스가 활성화된다.
 *
 * 멀티탭 전략:
 * - persistentMultipleTabManager: 여러 탭 동시 사용 시에도 오프라인 지원
 *   단, 하나의 탭이 "primary client"가 되어 Firestore 연결을 관리
 *   (구 API의 FAILED_PRECONDITION 에러를 원천 방지)
 */
export function getFirestoreWithOffline(): Firestore {
  const firebaseApp = getFirebaseApp();

  // 이미 초기화된 경우 기존 인스턴스 반환
  if (isFirestoreInitialized) {
    return getFirestore(firebaseApp);
  }

  // 서버 사이드 렌더링 환경: 오프라인 퍼시스턴스 없이 초기화
  if (typeof window === "undefined") {
    isFirestoreInitialized = true;
    return initializeFirestore(firebaseApp, {});
  }

  // 클라이언트 환경: IndexedDB 오프라인 퍼시스턴스 활성화
  try {
    db = initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({
        // 멀티탭 지원: 여러 브라우저 탭에서 동시에 사용 가능
        tabManager: persistentMultipleTabManager(),
        // 캐시 크기 무제한 (기본값 40MB 제한 해제)
        // 주의: 실제 서비스에서는 적절한 크기로 제한 권장
        cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      }),
    });

    isFirestoreInitialized = true;
    console.info("[Firestore] 오프라인 퍼시스턴스 활성화 완료 (IndexedDB)");
  } catch (error) {
    // initializeFirestore가 이미 호출된 경우 getFirestore()로 폴백
    console.warn("[Firestore] 오프라인 퍼시스턴스 초기화 실패, 기본 모드 사용:", error);
    isFirestoreInitialized = true;
    db = getFirestore(firebaseApp);
  }

  return db;
}

/**
 * Firebase Auth 인스턴스 반환
 */
export function getFirebaseAuth(): Auth {
  const firebaseApp = getFirebaseApp();
  if (!auth) {
    auth = getAuth(firebaseApp);
  }
  return auth;
}

/**
 * 현재 Firestore 오프라인 퍼시스턴스 상태를 확인한다.
 * IndexedDB 지원 여부를 체크한다.
 */
export async function checkOfflinePersistenceSupport(): Promise<{
  supported: boolean;
  reason?: string;
}> {
  if (typeof window === "undefined") {
    return { supported: false, reason: "서버 환경" };
  }

  if (!("indexedDB" in window)) {
    return { supported: false, reason: "IndexedDB 미지원 브라우저" };
  }

  // Safari 프라이빗 모드에서는 IndexedDB 용량 제한
  try {
    const testDb = indexedDB.open("torenote-offline-test");
    await new Promise<void>((resolve, reject) => {
      testDb.onsuccess = () => resolve();
      testDb.onerror = () => reject(testDb.error);
    });
    return { supported: true };
  } catch {
    return { supported: false, reason: "IndexedDB 접근 불가 (프라이빗 모드?)" };
  }
}
