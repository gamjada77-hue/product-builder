"use client";

import Link from "next/link";
import { ClipboardList, ChevronRight, TrendingUp } from "lucide-react";

// TODO: Firestore에서 실제 데이터 fetch
const MOCK_RECENT = [
  { date: "오늘", name: "가슴 · 삼두", duration: "58분", volume: "4,320kg" },
  { date: "어제", name: "등 · 이두", duration: "65분", volume: "5,100kg" },
  { date: "2일 전", name: "하체", duration: "72분", volume: "8,750kg" },
];

export default function WorkoutJournalCard() {
  return (
    <section className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <ClipboardList size={16} className="text-emerald-400" />
          <h2 className="text-sm font-bold text-zinc-100">운동 일지</h2>
        </div>
        <Link
          href="/history"
          className="flex items-center gap-0.5 text-xs text-zinc-500 hover:text-zinc-300"
        >
          전체보기 <ChevronRight size={13} />
        </Link>
      </div>

      {/* 주간 운동 횟수 */}
      <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5">
        <TrendingUp size={14} className="text-emerald-400" />
        <span className="text-xs text-emerald-300">
          이번 주 <strong>3회</strong> 운동 · 목표까지 <strong>2회</strong> 남음
        </span>
      </div>

      {/* 최근 운동 목록 */}
      <ul className="divide-y divide-zinc-800/60">
        {MOCK_RECENT.map((log, i) => (
          <li key={i} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-zinc-200">{log.name}</p>
              <p className="text-xs text-zinc-500">{log.date} · {log.duration}</p>
            </div>
            <span className="text-xs font-semibold text-zinc-400">{log.volume}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
