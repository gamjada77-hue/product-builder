import * as admin from "firebase-admin";

if (!admin.apps.length) {
  // Firebase Studio 환경: Application Default Credentials 사용
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

export const db = admin.firestore();
