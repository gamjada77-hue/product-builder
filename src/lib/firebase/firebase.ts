"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Next.js 핫 리로드 시 중복 초기화 방지
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Firestore는 firestore-offline.ts에서 초기화 (오프라인 퍼시스턴스 설정 포함)
// db import: import { getFirestoreWithOffline } from "@/lib/firebase/firestore-offline"
export const auth: Auth = getAuth(app);
export default app;
