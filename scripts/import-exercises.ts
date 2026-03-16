/**
 * wger 운동 데이터 → Firestore 1회성 import 스크립트
 *
 * 실행 방법:
 *   npx tsx scripts/import-exercises.ts
 *
 * 사전 준비:
 *   .env.local 에 Firebase Admin 환경변수 필요
 *     FIREBASE_PROJECT_ID=...
 *     FIREBASE_CLIENT_EMAIL=...
 *     FIREBASE_PRIVATE_KEY=...
 */

import * as admin from "firebase-admin";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// ─── Firebase Admin 초기화 ────────────────────────────────────────────────────
// Firebase Studio 환경: Application Default Credentials 사용
// 별도 서비스 계정 키 불필요

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

// ─── wger API 타입 ────────────────────────────────────────────────────────────

interface WgerTranslation {
  id: number;
  name: string;
  description: string;
  language: number;
}

interface WgerMuscle {
  id: number;
  name: string;
  name_en: string;
  is_front: boolean;
  image_url_main: string;
  image_url_secondary: string;
}

interface WgerEquipment {
  id: number;
  name: string;
}

interface WgerCategory {
  id: number;
  name: string;
}

interface WgerExerciseInfo {
  id: number;
  uuid: string;
  category: WgerCategory;
  muscles: WgerMuscle[];
  muscles_secondary: WgerMuscle[];
  equipment: WgerEquipment[];
  translations: WgerTranslation[];
}

interface WgerListResponse<T> {
  count: number;
  next: string | null;
  results: T[];
}

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

/** HTML 태그 제거 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

/** 검색용 키워드 배열 생성 */
function buildKeywords(name: string, categoryName: string): string[] {
  const words = name.toLowerCase().split(/\s+/);
  return [...new Set([name.toLowerCase(), categoryName.toLowerCase(), ...words])];
}

/** wger API fetch (재시도 1회) */
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

// ─── wger 데이터 fetch ────────────────────────────────────────────────────────

const WGER_BASE = "https://wger.de/api/v2";
const ENGLISH_LANG_ID = 2;
const PAGE_LIMIT = 100; // wger 최대 100

async function fetchAllExercises(): Promise<WgerExerciseInfo[]> {
  const all: WgerExerciseInfo[] = [];
  let url: string | null =
    `${WGER_BASE}/exerciseinfo/?format=json&language=${ENGLISH_LANG_ID}&limit=${PAGE_LIMIT}`;
  let page = 1;

  while (url) {
    console.log(`  페이지 ${page} 가져오는 중...`);
    const data = await fetchJson<WgerListResponse<WgerExerciseInfo>>(url);
    all.push(...data.results);
    url = data.next;
    page++;
    // API 부하 방지
    if (url) await new Promise((r) => setTimeout(r, 300));
  }

  return all;
}

async function fetchCategories(): Promise<WgerCategory[]> {
  const data = await fetchJson<WgerListResponse<WgerCategory>>(
    `${WGER_BASE}/exercisecategory/?format=json`
  );
  return data.results;
}

async function fetchMuscles(): Promise<WgerMuscle[]> {
  const data = await fetchJson<WgerListResponse<WgerMuscle>>(
    `${WGER_BASE}/muscle/?format=json`
  );
  return data.results;
}

async function fetchEquipment(): Promise<WgerEquipment[]> {
  const data = await fetchJson<WgerListResponse<WgerEquipment>>(
    `${WGER_BASE}/equipment/?format=json`
  );
  return data.results;
}

// ─── Firestore 저장 ───────────────────────────────────────────────────────────

const BATCH_SIZE = 400; // Firestore 최대 500, 여유 두고 400

async function importCategories(categories: WgerCategory[]) {
  const batch = db.batch();
  for (const cat of categories) {
    const ref = db.collection("exerciseCategories").doc(String(cat.id));
    batch.set(ref, { id: cat.id, name: cat.name });
  }
  await batch.commit();
  console.log(`  카테고리 ${categories.length}개 저장 완료`);
}

async function importMuscles(muscles: WgerMuscle[]) {
  const batch = db.batch();
  for (const m of muscles) {
    const ref = db.collection("muscles").doc(String(m.id));
    batch.set(ref, {
      id: m.id,
      name: m.name,
      nameEn: m.name_en,
      isFront: m.is_front,
      imageUrlMain: m.image_url_main,
      imageUrlSecondary: m.image_url_secondary,
    });
  }
  await batch.commit();
  console.log(`  근육 ${muscles.length}개 저장 완료`);
}

async function importEquipment(equipment: WgerEquipment[]) {
  const batch = db.batch();
  for (const eq of equipment) {
    const ref = db.collection("equipment").doc(String(eq.id));
    batch.set(ref, { id: eq.id, name: eq.name });
  }
  await batch.commit();
  console.log(`  기구 ${equipment.length}개 저장 완료`);
}

async function importExercises(exercises: WgerExerciseInfo[]) {
  // 영어 번역이 없는 종목 필터링
  const validExercises = exercises.filter((ex) => {
    const eng = ex.translations.find((t) => t.language === ENGLISH_LANG_ID);
    return eng && eng.name.trim() !== "";
  });

  console.log(
    `  유효 운동 종목: ${validExercises.length}개 (전체 ${exercises.length}개 중)`
  );

  const importedAt = admin.firestore.Timestamp.now();
  let saved = 0;

  for (let i = 0; i < validExercises.length; i += BATCH_SIZE) {
    const chunk = validExercises.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const ex of chunk) {
      const eng = ex.translations.find((t) => t.language === ENGLISH_LANG_ID)!;
      const ref = db.collection("exercises").doc(String(ex.id));

      batch.set(ref, {
        id: ex.id,
        uuid: ex.uuid,
        name: eng.name.trim(),
        description: stripHtml(eng.description),
        categoryId: ex.category.id,
        categoryName: ex.category.name,
        muscleIds: ex.muscles.map((m) => m.id),
        muscleSecondaryIds: ex.muscles_secondary.map((m) => m.id),
        equipmentIds: ex.equipment.map((e) => e.id),
        keywords: buildKeywords(eng.name, ex.category.name),
        importedAt,
      });
    }

    await batch.commit();
    saved += chunk.length;
    console.log(`  운동 종목 ${saved}/${validExercises.length} 저장 완료`);
  }
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== ToreNote 운동 데이터 import 시작 ===\n");

  try {
    console.log("1. 카테고리 가져오는 중...");
    const categories = await fetchCategories();
    await importCategories(categories);

    console.log("\n2. 근육 데이터 가져오는 중...");
    const muscles = await fetchMuscles();
    await importMuscles(muscles);

    console.log("\n3. 운동 기구 가져오는 중...");
    const equipment = await fetchEquipment();
    await importEquipment(equipment);

    console.log("\n4. 운동 종목 가져오는 중 (전체 ~885개, 잠시 시간이 걸립니다)...");
    const exercises = await fetchAllExercises();
    await importExercises(exercises);

    console.log("\n=== import 완료 ===");
    process.exit(0);
  } catch (err) {
    console.error("\nimport 실패:", err);
    process.exit(1);
  }
}

main();
