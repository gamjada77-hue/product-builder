"use client";

import { UtensilsCrossed, Plus, ChevronRight } from "lucide-react";
import Link from "next/link";

// TODO: Firestore에서 실제 데이터 fetch
const MOCK_DIET = {
  targetKcal: 2800,
  currentKcal: 1640,
  meals: [
    { time: "07:30", name: "닭가슴살 샐러드", kcal: 420 },
    { time: "12:00", name: "현미밥 + 된장찌개", kcal: 680 },
    { time: "15:00", name: "단백질 쉐이크", kcal: 180 },
    { time: "18:30", name: "고구마 + 삶은 달걀", kcal: 360 },
  ],
};

export default function DietCard() {
  const percent = Math.min(
    Math.round((MOCK_DIET.currentKcal / MOCK_DIET.targetKcal) * 100),
    100
  );
  const remaining = MOCK_DIET.targetKcal - MOCK_DIET.currentKcal;

  return (
    <section className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <UtensilsCrossed size={16} className="text-orange-400" />
          <h2 className="text-sm font-bold text-zinc-100">오늘 식단</h2>
        </div>
        <Link
          href="/diet"
          className="flex items-center gap-0.5 text-xs text-zinc-500 hover:text-zinc-300"
        >
          전체보기 <ChevronRight size={13} />
        </Link>
      </div>

      {/* 칼로리 진행바 */}
      <div className="px-4 pb-3">
        <div className="mb-1.5 flex items-end justify-between">
          <span className="text-2xl font-bold text-zinc-100">
            {MOCK_DIET.currentKcal.toLocaleString()}
            <span className="ml-1 text-sm font-normal text-zinc-500">kcal</span>
          </span>
          <span className="text-xs text-zinc-500">
            목표 {MOCK_DIET.targetKcal.toLocaleString()}kcal · 잔여 {remaining}kcal
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-1 text-right text-[10px] text-zinc-600">{percent}% 달성</p>
      </div>

      {/* 식단 목록 */}
      <ul className="divide-y divide-zinc-800/60">
        {MOCK_DIET.meals.map((meal, i) => (
          <li key={i} className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-3">
              <span className="w-10 shrink-0 text-xs text-zinc-600">{meal.time}</span>
              <span className="text-sm text-zinc-300">{meal.name}</span>
            </div>
            <span className="text-xs text-zinc-500">{meal.kcal}kcal</span>
          </li>
        ))}
      </ul>

      {/* 식단 추가 버튼 */}
      <div className="p-4">
        <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 py-2.5 text-sm text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-300 active:bg-zinc-800">
          <Plus size={15} />
          식단 추가
        </button>
      </div>
    </section>
  );
}
