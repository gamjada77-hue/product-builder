"use client";

import { Sparkles, ChevronRight } from "lucide-react";

// TODO: Claude API 연동 후 실제 메시지로 교체
const MOCK_MESSAGE = {
  greeting: "좋은 아침이에요! 💪",
  body: "어제 휴식을 잘 취하셨군요. 오늘은 가슴과 삼두 루틴이 최적입니다. 지난 주보다 5% 무게를 올려볼 준비가 됐나요?",
};

const MOCK_ROUTINE = {
  name: "AI 추천 루틴 — 가슴 · 삼두",
  exercises: [
    { name: "바벨 벤치프레스", sets: 4, reps: "6-8", weight: "80kg" },
    { name: "인클라인 덤벨 프레스", sets: 3, reps: "10-12", weight: "28kg" },
    { name: "케이블 크로스오버", sets: 3, reps: "12-15", weight: "20kg" },
    { name: "트라이셉스 푸시다운", sets: 3, reps: "12", weight: "30kg" },
    { name: "오버헤드 트라이셉스", sets: 3, reps: "10", weight: "22kg" },
  ],
  estimatedTime: "55분",
  difficulty: "중급",
};

export default function AICoachCard() {
  return (
    <section className="space-y-3">
      {/* AI 코치 메시지 */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border border-blue-500/20 p-4">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/20">
            <Sparkles size={14} className="text-blue-400" />
          </div>
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">AI 코치</span>
        </div>
        <p className="text-sm font-semibold text-zinc-100">{MOCK_MESSAGE.greeting}</p>
        <p className="mt-1 text-sm leading-relaxed text-zinc-400">{MOCK_MESSAGE.body}</p>
      </div>

      {/* AI 추천 루틴 */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles size={13} className="text-blue-400" />
              <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">오늘의 추천 루틴</span>
            </div>
            <h2 className="text-base font-bold text-zinc-100">{MOCK_ROUTINE.name}</h2>
          </div>
        </div>

        {/* 요약 배지 */}
        <div className="flex gap-2 px-4 pb-3">
          <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
            ⏱ {MOCK_ROUTINE.estimatedTime}
          </span>
          <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
            🏋️ {MOCK_ROUTINE.difficulty}
          </span>
          <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
            {MOCK_ROUTINE.exercises.length}가지 종목
          </span>
        </div>

        {/* 운동 목록 */}
        <ul className="divide-y divide-zinc-800/60">
          {MOCK_ROUTINE.exercises.map((ex, i) => (
            <li key={i} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-bold text-zinc-400">
                  {i + 1}
                </span>
                <span className="text-sm text-zinc-200">{ex.name}</span>
              </div>
              <span className="text-xs text-zinc-500">
                {ex.sets}세트 × {ex.reps} · {ex.weight}
              </span>
            </li>
          ))}
        </ul>

        {/* 시작 버튼 */}
        <div className="p-4">
          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors active:bg-blue-700">
            이 루틴으로 운동 시작
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
