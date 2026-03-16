// wger API 기반 운동 종목 타입 정의

export interface ExerciseCategory {
  id: number;
  name: string;
}

export interface Muscle {
  id: number;
  name: string; // 라틴어
  nameEn: string; // 영어
  isFront: boolean;
  imageUrlMain: string;
  imageUrlSecondary: string;
}

export interface Equipment {
  id: number;
  name: string;
}

// Firestore에 저장되는 운동 종목 문서
export interface Exercise {
  id: number; // wger exercise id
  uuid: string;
  name: string; // 영어 이름
  description: string; // HTML 태그 제거된 평문
  categoryId: number;
  categoryName: string;
  muscleIds: number[]; // 주동근
  muscleSecondaryIds: number[]; // 보조근
  equipmentIds: number[];
  // 검색용 키워드 (소문자)
  keywords: string[];
  importedAt: FirebaseFirestore.Timestamp | Date;
}

// wger API 응답 타입
export interface WgerTranslation {
  id: number;
  uuid: string;
  name: string;
  description: string;
  language: number;
  license: number;
  license_author: string;
}

export interface WgerMuscle {
  id: number;
  name: string;
  name_en: string;
  is_front: boolean;
  image_url_main: string;
  image_url_secondary: string;
}

export interface WgerEquipment {
  id: number;
  name: string;
}

export interface WgerCategory {
  id: number;
  name: string;
}

export interface WgerExerciseInfo {
  id: number;
  uuid: string;
  created: string;
  last_update: string;
  category: WgerCategory;
  muscles: WgerMuscle[];
  muscles_secondary: WgerMuscle[];
  equipment: WgerEquipment[];
  translations: WgerTranslation[];
}

export interface WgerListResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
