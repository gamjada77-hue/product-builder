# 킨토레쿤 v2 기능 확장 - Design Document

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | 킨토레쿤 v2 — 주간 플랜 추천 + 헬스장 탐색 + 커뮤니티 랭킹 |
| **작성일** | 2026-03-13 |
| **Phase** | Design |
| **전문가 팀** | 아키텍트, 프론트엔드, 데이터, 알고리즘, QA/보안, 샘플데이터 (총 6명) |

### Value Delivered (4 perspectives)

| 관점 | 내용 |
|------|------|
| **Problem** | 운동 기록은 있지만 이번 주 플랜을 매번 사용자가 결정해야 하고, 혼자 하는 운동은 동기 부여가 부족하다 |
| **Solution** | 기록 데이터 기반 자동 PPL 플랜 추천 + 위치 기반 헬스장 탐색 + Firebase 커뮤니티 랭킹 |
| **Function/UX Effect** | 7일 플랜 카드로 한눈에 주간 운동 확인, 체크인으로 소속감, 랭킹 등재로 성취감 |
| **Core Value** | 기록 → 분석 → 추천의 선순환 + 커뮤니티 연결로 혼자 하는 운동을 함께 하는 경험으로 전환 |

---

## 1. 시스템 아키텍처 (CTO/아키텍트)

### 1.1 전체 구조

```
킨토레쿤 v2 아키텍처
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────┐
│              Browser (Vanilla JS)        │
│  ┌───────────┐ ┌────────────┐ ┌───────┐ │
│  │ 운동노트  │ │ 마이페이지 │ │헬스장 │ │
│  │  탭 #1   │ │   탭 #2   │ │ 탭 #3│ │
│  └─────┬─────┘ └─────┬──────┘ └──┬────┘ │
│        │             │            │      │
│  ┌─────▼─────────────▼────────────▼────┐ │
│  │           State Manager              │ │
│  │  (localStorage + in-memory cache)   │ │
│  └─────────────────────────────────────┘ │
└──────────┬──────────────┬────────────────┘
           │              │
    ┌──────▼──────┐ ┌─────▼──────────┐
    │ Overpass API│ │ Firebase       │
    │ (Geolocation│ │ Firestore      │
    │  + 헬스장)  │ │ (커뮤니티랭킹) │
    └─────────────┘ └────────────────┘
```

### 1.2 상태 관리 계층

| 계층 | 저장소 | 데이터 | TTL |
|------|--------|--------|-----|
| 영속 | localStorage | 운동 기록, 유저 정보, 루틴, 플랜 | 무제한 |
| 캐시 | localStorage | 헬스장 검색 결과 | 10분 |
| 세션 | localStorage | 체크인 상태 | 수동 해제 |
| 원격 | Firestore | 커뮤니티 랭킹 | 서버 관리 |

### 1.3 컴포넌트 계층

```
index.html
├── [탭1] workout-page
│   ├── routine-checklist-section  ← Todo 스타일 체크
│   ├── weekly-plan-section        ← 알고리즘 추천 (Feature 1)
│   ├── recommendations            ← 오늘의 권장 무게
│   ├── workout-entry              ← 기록 폼
│   └── timeline-section           ← 히스토리
├── [탭2] mypage
│   ├── user-info-section          ← 프로필 + BMI
│   ├── stats-overview             ← 통계
│   ├── calendar-section           ← 월간 플래너
│   └── management-widgets         ← 루틴/커스텀 운동 관리
└── [탭3] gym-page
    ├── gym-search-section          ← GPS + Overpass (Feature 2)
    ├── checkin-status-section      ← 체크인 현황
    └── gym-ranking-section         ← Firebase 랭킹 (Feature 3)
```

### 1.4 확장성 고려사항

- **스키마 버전**: `*-v5` 접미사로 버전 관리 (v5 → v6 마이그레이션 시 자동 변환)
- **Firebase 선택적 의존성**: `firebase-config.js` 없어도 Feature 1, 2 완전 동작
- **캐시 무효화**: Overpass 캐시는 위치 변경 시(`haversine > 100m`) 자동 무효화

---

## 2. UI/UX 컴포넌트 설계 (프론트엔드 전문가)

### 2.1 디자인 토큰 (CSS Custom Properties)

```css
:root {
  /* Color */
  --color-push: #4f46e5;      /* 인디고 — Push 운동 */
  --color-pull: #0891b2;      /* 시안 — Pull 운동 */
  --color-legs: #059669;      /* 에메랄드 — Legs 운동 */
  --color-rest: #94a3b8;      /* 슬레이트 — 휴식일 */

  /* Spacing */
  --gap-xs: 4px;
  --gap-sm: 8px;
  --gap-md: 16px;
  --gap-lg: 24px;

  /* Border radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
}
```

### 2.2 주간 플랜 카드 (Feature 1 UI)

```
┌─────────────────────────────┐
│  월  3/13          💪 Push  │  ← plan-day-header
├─────────────────────────────┤
│  벤치프레스     52.5kg      │  ← plan-exercise-row
│  오버헤드프레스 35.0kg      │
│  딥스           체중        │
└─────────────────────────────┘
```

**반응형 그리드**:
- 데스크톱(1024px+): 7열
- 태블릿(768px): 4열
- 모바일(600px 이하): 2열

### 2.3 Todo 스타일 루틴 체크리스트

```
상태 1 (미완료):  [ ] 스쿼트 ──────────── ▶ 클릭
상태 2 (입력 중): [ ] 스쿼트 [100kg] [5회] [✓] [✕]
상태 3 (완료):    [✓] 스쿼트 100kg × 5회
```

**인터랙션 흐름**:
1. 항목 클릭 → `openTodoForm(idx)` 호출
2. 이전 기록 자동 채움 (최근 동일 운동 기록에서)
3. ✓ 버튼 → 운동 기록 저장 + 체크 상태 + 도장 조건 확인
4. ✕ 버튼 → 폼 닫기 (다른 항목 클릭 시도 자동 닫힘)

### 2.4 헬스장 검색 UI (Feature 2)

```
[🔍 주변 헬스장 검색 (2km)]    ← find-gyms-btn
  검색 중...                    ← gym-search-status

┌─────────────────────────────┐
│ 💪 강남 피트니스 클럽        │
│ 📍 약 350m                  │
│              [체크인]        │
├─────────────────────────────┤
│ 💪 헬스파크                  │
│ 📍 약 820m                  │
│              [체크인]        │
└─────────────────────────────┘
```

### 2.5 커뮤니티 랭킹 UI (Feature 3)

```
[🏋️ 스쿼트] [⚡ 데드리프트] [💪 벤치프레스]

🥇  김철수  스쿼트 짱     180kg
🥈  이영희               160kg
🥉  박민준               155kg
 4  홍길동               145kg

─── 내 최고 기록 등록 ───
[닉네임      ] [무게(kg)    ] [등록]
```

---

## 3. 데이터 설계 (데이터 전문가)

### 3.1 localStorage 스키마 (v5)

```typescript
// 운동 기록 (kintore-workouts-v5)
interface WorkoutEntry {
  id: string;           // `${Date.now()}-${Math.random()}`
  name: string;         // 운동 이름
  weight: number;       // 무게 (kg)
  reps: number;         // 횟수
  date: string;         // "YYYY년 M월 D일" (표시용)
  fullDate: string;     // toLocaleDateString() (달력 매칭용)
  timestamp: number;    // Date.now() (정렬용)
}

// 유저 정보 (kintore-user-info-v5)
interface UserInfo {
  nickname: string;
  gender: 'male' | 'female';
  height: number;       // cm
  weight: number;       // kg
  goalWeight: number;   // kg
  character: string;    // FontAwesome class
}

// 월간 플랜 (kintore-plans-v5)
interface MonthlyPlans {
  [dateStr: string]: Array<{  // "YYYY-MM-DD"
    name: string;
    weight: number;
  }>;
}

// 체크인 (kintore-checkin-v5)
interface CheckinData {
  gymName: string;
  gymId: string;        // "node_1234567" 또는 "way_1234567"
  checkinTime: string;  // ISO 8601
  lat: number;
  lon: number;
}

// 헬스장 캐시 (kintore-gym-cache-v5)
interface GymCache {
  lat: number;
  lon: number;
  timestamp: number;    // Date.now()
  gyms: Array<{
    id: string;
    name: string;
    lat: number;
    lon: number;
    distance: number;   // metres (런타임 계산, 저장 안 함)
  }>;
}
```

### 3.2 Firestore 스키마

```
gyms/{gymId}                           // gymId = "node_1234567890"
├── name: string
├── lat: number
├── lon: number
└── leaderboard/{exercise}             // exercise ∈ {squat, deadlift, bench}
    └── entries: Array<{
          nickname: string,
          weight: number,
          submittedAt: string,         // ISO 8601
          badge: string                // "스쿼트 짱" | ""
        }>                             // max 20개, weight DESC
```

### 3.3 데이터 흐름 다이어그램

```
[사용자 운동 기록]
       │
       ▼
 workouts[] (localStorage)
       │
       ├──► analyzeMuscleGroupCoverage()  → PPL 빈도 집계
       │              │
       │              ▼
       │        assignPPLSplit()          → 7일 스플릿 배열
       │              │
       ├──► detectProgressiveOverload()   → 각 운동별 추천 무게
       │              │
       │              ▼
       └──────► generateWeeklyPlan()      → 7일 플랜 객체
                      │
                      ▼
               renderWeeklyPlan()         → DOM 렌더링
```

### 3.4 마이그레이션 전략

구버전(`*-v4` 이하) 데이터 감지 시:
```js
// 앱 시작 시 마이그레이션 체크 (향후 v6 업그레이드 시 참고)
if (localStorage.getItem('kintore-workouts-v4')) {
  const old = JSON.parse(localStorage.getItem('kintore-workouts-v4'));
  // 변환 로직 실행
  localStorage.setItem('kintore-workouts-v5', JSON.stringify(migrated));
  localStorage.removeItem('kintore-workouts-v4');
}
```

---

## 4. 알고리즘 설계 (알고리즘 전문가)

### 4.1 근육군 매핑 상수

```js
const MUSCLE_GROUP_MAP = {
  // Push (밀기)
  '벤치프레스': 'push', '인클라인벤치': 'push', '딥스': 'push',
  '오버헤드프레스': 'push', '숄더프레스': 'push', '체스트프레스': 'push',
  // Pull (당기기)
  '데드리프트': 'pull', '풀업': 'pull', '랫풀다운': 'pull',
  '바벨로우': 'pull', '시티드로우': 'pull', '케이블로우': 'pull',
  // Legs (하체)
  '스쿼트': 'legs', '레그프레스': 'legs', '런지': 'legs',
  '레그컬': 'legs', '레그익스텐션': 'legs', '힙쓰러스트': 'legs',
};

const EXERCISE_TEMPLATES = {
  Push: ['벤치프레스', '오버헤드프레스', '딥스', '인클라인벤치', '체스트프레스'],
  Pull: ['데드리프트', '풀업', '바벨로우', '랫풀다운', '케이블로우'],
  Legs: ['스쿼트', '레그프레스', '런지', '힙쓰러스트', '레그컬'],
};

const BASE_MULTIPLIERS = {
  '벤치프레스': 0.6, '오버헤드프레스': 0.4, '딥스': 0.5,
  '데드리프트': 0.9, '풀업': 0.5, '바벨로우': 0.6,
  '스쿼트': 0.8, '레그프레스': 1.2, '런지': 0.4,
  _default: 0.5,
};
```

### 4.2 근육군 커버리지 분석

```
analyzeMuscleGroupCoverage(daysBack=28)

입력: workouts[], daysBack
출력: { push: N, pull: N, legs: N }

알고리즘:
1. 오늘 기준 daysBack일 이내 기록 필터링
2. 각 운동명을 MUSCLE_GROUP_MAP으로 분류
3. 미분류 운동은 'unknown' (집계 제외)
4. 카운트 반환
```

### 4.3 점진적 과부하 계산

```
detectProgressiveOverload(exerciseName)

입력: exerciseName, workouts[], userInfo.weight
출력: 추천 무게 (2.5kg 단위 반올림)

로직:
  recent7  = 최근 7일 동일 운동 기록
  recent28 = 최근 28일 동일 운동 기록

  if (recent7.length >= 3):      baseWeight = recent7[0].weight × 1.025
  elif (recent28.length >= 9):   baseWeight = recent28[0].weight × 1.050
  elif (recent28.length > 0):    baseWeight = recent28[0].weight
  else:                          baseWeight = userInfo.weight × BASE_MULTIPLIERS[name]

  multiplier = 1.0 (일반) 또는 0.9 (여성)
  recommended = round(baseWeight × multiplier / 2.5) × 2.5
  maxSafe = userInfo.weight × BASE_MULTIPLIERS[name] × 2.5
  return clamp(recommended, 20, maxSafe)
```

### 4.4 PPL 스플릿 할당

| 가장 부족한 근육군 | 주간 스케줄 |
|--------------------|-------------|
| Push (밀기 부족) | Push→Pull→Legs→Push→Pull→Legs→Rest |
| Pull (당기기 부족) | Pull→Push→Legs→Pull→Push→Legs→Rest |
| Legs (하체 부족) | Legs→Push→Pull→Legs→Push→Pull→Rest |

### 4.5 알고리즘 시나리오별 동작

| 시나리오 | 기록 현황 | 결과 |
|----------|-----------|------|
| 신규 사용자 | 기록 없음 | 체중 기반 기본값, Push 시작 (세 그룹 0으로 동일 → push 선택) |
| 가슴 집중 | Push 10회 | Legs 또는 Pull 먼저 배치 |
| 고급 사용자 | 28일 9회+ | +5% 증량 |
| 단기 집중 | 7일 3회+ | +2.5% 증량 |
| 여성 | 동일 | 무게 × 0.9 보정 |

---

## 5. QA 및 보안 설계 (QA/보안 전문가)

### 5.1 주요 테스트 시나리오 (40개)

#### Feature 1: 주간 플랜 추천

| ID | 시나리오 | 기대 결과 |
|----|----------|-----------|
| F1-01 | 운동 기록 없는 신규 상태 | 체중 기반 기본값 표시 |
| F1-02 | Push 기록만 있을 때 | Legs 또는 Pull 우선 배치 |
| F1-03 | 7일 이내 동일 운동 3회+ | +2.5% 무게 |
| F1-04 | 28일 이내 동일 운동 9회+ | +5% 무게 |
| F1-05 | 체중 0으로 설정 | 기본값 20kg (clamp 하한) |
| F1-06 | 새로고침 버튼 | 플랜 재계산 및 렌더링 |

#### Feature 2: 헬스장 검색

| ID | 시나리오 | 기대 결과 |
|----|----------|-----------|
| F2-01 | 위치 허용 | 목록 표시 (최대 2km) |
| F2-02 | 위치 거부 | "위치 권한이 필요합니다" 메시지 |
| F2-03 | 10분 이내 재검색 | 캐시 사용 (API 미호출) |
| F2-04 | 이름 없는 헬스장 | 목록에서 제외 |
| F2-05 | 체크인 후 새로고침 | 체크인 상태 유지 |
| F2-06 | 체크아웃 후 | 섹션 2, 3 숨김 |

#### Feature 3: Firebase 랭킹

| ID | 시나리오 | 기대 결과 |
|----|----------|-----------|
| F3-01 | Firebase 없이 접속 | 안내 메시지, 오류 없음 |
| F3-02 | 닉네임 중복 등록 | 기존 기록 갱신 (덮어쓰기) |
| F3-03 | 20개 초과 등록 | 하위 기록 자동 삭제 |
| F3-04 | 동시 제출 (2 브라우저) | 트랜잭션으로 정합성 보장 |
| F3-05 | 1위 변경 시 | 뱃지 자동 재배정 |
| F3-06 | 탭 전환 (스쿼트↔데드리프트) | 해당 운동 랭킹 로드 |

### 5.2 보안 분석 및 조치

#### XSS 취약점 (중요)

현재 구현에서 innerHTML 직접 삽입이 사용되는 곳:

```js
// 위험: 사용자 입력을 innerHTML에 삽입
li.innerHTML = `<span>${entry.nickname}</span>`;  // XSS 가능

// 안전하게 수정 (DOMPurify 없이):
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
// 사용: `<span>${escapeHtml(entry.nickname)}</span>`
```

**영향을 받는 위치**:
- `renderGymRanking()` — nickname 표시
- `renderGymList()` — 헬스장 이름 표시
- 운동 기록 렌더링

**MVP 조치**: `escapeHtml()` 유틸리티 함수 추가 권장 (출시 전 적용)

#### Firebase 보안 규칙 (MVP)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /gyms/{gymId} {
      allow read: if true;
      allow write: if true;  // MVP: 추후 Auth 기반으로 강화
    }
    match /gyms/{gymId}/leaderboard/{exercise} {
      allow read: if true;
      allow write: if true;  // MVP: 추후 rate limiting 추가
    }
  }
}
```

**향후 강화 계획**:
- Firebase Auth 도입 후 `request.auth != null` 조건 추가
- Rate limiting: Cloud Functions로 중재

#### 로컬 데이터 보안

- localStorage는 동일 Origin만 접근 (XSS 위험 있음)
- 민감 정보(체중, 키) 암호화 불필요 (공개 개인 피트니스 앱 성격)
- 체크인 데이터: 위치 정보 포함이지만 localStorage 내에서만 사용

### 5.3 브라우저 호환성

| 기능 | Chrome | Firefox | Safari | Edge | 비고 |
|------|--------|---------|--------|------|------|
| Geolocation | ✅ | ✅ | ✅ | ✅ | HTTPS 필수 |
| localStorage | ✅ | ✅ | ✅ | ✅ | Private 모드 제한 |
| Fetch API | ✅ | ✅ | ✅ | ✅ | - |
| CSS Grid | ✅ | ✅ | ✅ | ✅ | - |
| Firebase SDK | ✅ | ✅ | ✅ | ✅ | - |

---

## 6. 샘플 데이터 설계 (샘플데이터 전문가)

### 6.1 샘플 데이터 목적

신규 사용자가 앱을 처음 열었을 때 모든 기능을 즉시 체험할 수 있도록:
- 28일치 운동 기록 (PPL 불균형 포함 → Legs 약함)
- 점진적 과부하 트리거 조건 충족
- 오늘 루틴 표시
- 마이페이지 프로필 및 BMI 표시

### 6.2 initSampleData() 함수 명세

```js
function initSampleData() {
  // 이미 데이터가 있으면 실행하지 않음
  if (localStorage.getItem('kintore-sample-loaded-v5')) return;
  if (workouts.length > 0) return;

  // 유저 정보 세팅
  userInfo = {
    nickname: '운동왕', gender: 'male',
    height: 175, weight: 75, goalWeight: 70,
    character: 'fa-user-ninja'
  };
  localStorage.setItem('kintore-user-info-v5', JSON.stringify(userInfo));

  // 28일치 운동 기록 생성
  // Push: 8회 (벤치프레스 중심)
  // Pull: 7회 (데드리프트 중심)
  // Legs: 4회 (하체 부족 → Legs-first 스플릿 트리거)

  // 최근 7일 벤치프레스 3회 → +2.5% 증량 트리거
  // 최근 28일 스쿼트 9회 미만 → 기본값 유지

  // 루틴: 스쿼트, 벤치프레스, 데드리프트
  routines = ['스쿼트', '벤치프레스', '데드리프트'];
  localStorage.setItem('kintore-routines-v5', JSON.stringify(routines));

  localStorage.setItem('kintore-sample-loaded-v5', '1');
}
```

### 6.3 샘플 운동 기록 데이터

아래 표는 28일치 운동 기록의 요약이다:

| 날짜 (오늘 기준) | 운동 | 무게 | 횟수 | 근육군 |
|-----------------|------|------|------|--------|
| -27일 | 벤치프레스 | 60kg | 8회 | Push |
| -26일 | 데드리프트 | 80kg | 5회 | Pull |
| -25일 | 스쿼트 | 70kg | 8회 | Legs |
| -24일 | 오버헤드프레스 | 40kg | 10회 | Push |
| -22일 | 바벨로우 | 55kg | 8회 | Pull |
| -21일 | 벤치프레스 | 62.5kg | 8회 | Push |
| -20일 | 데드리프트 | 82.5kg | 5회 | Pull |
| -18일 | 인클라인벤치 | 50kg | 10회 | Push |
| -17일 | 풀업 | 0kg | 8회 | Pull |
| -16일 | 오버헤드프레스 | 42.5kg | 8회 | Push |
| -15일 | 데드리프트 | 85kg | 5회 | Pull |
| -14일 | 스쿼트 | 72.5kg | 8회 | Legs |
| -13일 | 벤치프레스 | 65kg | 8회 | Push |
| -11일 | 바벨로우 | 57.5kg | 8회 | Pull |
| -10일 | 딥스 | 0kg | 12회 | Push |
| -9일 | 데드리프트 | 87.5kg | 5회 | Pull |
| -8일 | 스쿼트 | 75kg | 8회 | Legs |
| -7일 | 벤치프레스 | 67.5kg | 8회 | Push |
| -6일 | 오버헤드프레스 | 45kg | 8회 | Push |
| -5일 | 데드리프트 | 90kg | 5회 | Pull |
| -4일 | 레그프레스 | 100kg | 12회 | Legs |
| -3일 | 벤치프레스 | 70kg | 6회 | Push |
| -2일 | 풀업 | 0kg | 10회 | Pull |
| -1일 (어제) | 벤치프레스 | 70kg | 8회 | Push |

**결과**: Push 11회, Pull 9회, Legs 4회 → **Legs 가장 부족** → Legs-first 스플릿 선택

**점진적 과부하 트리거**:
- 벤치프레스 최근 7일 3회 이상 → +2.5% = 71.75kg → 반올림 72.5kg
- 데드리프트 최근 28일 9회 → +5% = 94.5kg → 반올림 95kg

---

## 7. 구현 파일 구조

### 7.1 수정/추가 파일 목록

```
kintorekun/
├── index.html          ← 수정: Firebase CDN, 3번째 탭, 주간플랜 섹션, 헬스장 페이지
├── main.js             ← 수정: Feature 1~3 함수 추가 (~300줄), 버그 수정
├── style.css           ← 수정: 신규 UI 스타일 ~120줄 추가
├── firebase-config.js  ← 신규 (사용자 직접 작성 필요)
└── docs/
    ├── 01-plan/features/kintorekun-v2.plan.md
    └── 02-design/features/kintorekun-v2.design.md  ← 이 문서
```

### 7.2 main.js 함수 목록 (추가분)

| 분류 | 함수 | 역할 |
|------|------|------|
| Feature 1 | `analyzeMuscleGroupCoverage(daysBack)` | PPL 빈도 집계 |
| Feature 1 | `detectProgressiveOverload(name)` | 추천 무게 계산 |
| Feature 1 | `assignPPLSplit(coverage)` | PPL 스케줄 결정 |
| Feature 1 | `generateWeeklyPlan()` | 7일 플랜 생성 |
| Feature 1 | `renderWeeklyPlan()` | 플랜 DOM 렌더링 |
| Feature 2 | `haversineDistance(lat1,lon1,lat2,lon2)` | 거리 계산 (m) |
| Feature 2 | `fetchGymsFromOverpass(lat,lon)` | Overpass API 호출 |
| Feature 2 | `findNearbyGyms()` | 검색 진입점 (캐시 처리) |
| Feature 2 | `renderGymList(gyms)` | 헬스장 목록 렌더링 |
| Feature 2 | `checkInGym(gym)` | 체크인 처리 |
| Feature 2 | `checkOut()` | 체크아웃 처리 |
| Feature 2 | `renderCheckInStatus()` | 체크인 상태 복원 |
| Feature 2 | `initGymPage()` | 탭 초기화 (1회) |
| Feature 3 | `initFirebase()` | Firebase 초기화 |
| Feature 3 | `ensureGymDocument(gymId, data)` | Firestore 헬스장 문서 생성 |
| Feature 3 | `loadGymRanking(gymId, exercise)` | 랭킹 데이터 로드 |
| Feature 3 | `renderGymRanking(entries, exercise)` | 랭킹 DOM 렌더링 |
| Feature 3 | `submitBestLift(gymId, ex, weight, nick)` | 기록 등록 (Transaction) |
| Feature 3 | `switchRankingTab(exercise)` | 탭 전환 |
| Feature 3 | `submitRankingForm()` | 폼 제출 핸들러 |
| 샘플 | `initSampleData()` | 첫 실행 시 샘플 데이터 로드 |
| Todo | `openTodoForm(idx)` | 루틴 아이템 인라인 폼 열기 |
| Todo | `updateRoutineChecklist()` | 루틴 체크리스트 렌더링 |

---

## 8. 비기능 요구사항 구현 방안

| 요구사항 | 구현 방법 |
|----------|-----------|
| **성능** 15초 이내 | Overpass API timeout 15초 설정, fetch AbortController 활용 |
| **오프라인** Firebase 없이 동작 | `db` 변수 null 체크, try-catch로 Firebase 에러 격리 |
| **캐시** 10분 | `timestamp` 비교: `Date.now() - cache.timestamp < 10 * 60 * 1000` |
| **보안** MVP | `escapeHtml()` 유틸리티, Firestore open rule (MVP) |
| **반응형** 모바일 우선 | CSS Grid + media query 3단계 |

---

## 9. 출시 전 체크리스트

- [x] Feature 1: 주간 플랜 추천 구현
- [x] Feature 2: 헬스장 검색 및 체크인 구현
- [x] Feature 3: Firebase 랭킹 구현
- [x] Todo 스타일 루틴 체크리스트 구현
- [x] 샘플 데이터 `initSampleData()` 구현
- [ ] `escapeHtml()` 적용으로 XSS 취약점 해소 (권장)
- [ ] Firebase 보안 규칙 배포 (콘솔에서 수동)
- [ ] `firebase-config.js` 사용자 가이드 작성

---

## 10. firebase-config.js 작성 가이드 (사용자용)

Firebase 콘솔(console.firebase.google.com)에서 프로젝트 생성 후:

```js
// firebase-config.js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
```

이 파일이 없으면 Feature 1, 2는 정상 동작하고 Feature 3만 비활성화됩니다.
