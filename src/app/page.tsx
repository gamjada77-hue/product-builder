import AICoachCard from "@/components/home/AICoachCard";
import WorkoutJournalCard from "@/components/home/WorkoutJournalCard";
import DietCard from "@/components/home/DietCard";
import { Bell } from "lucide-react";

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 pb-24 pt-6">
      {/* 상단 헤더 */}
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500">2026년 3월 16일 월요일</p>
          <h1 className="text-xl font-bold text-zinc-100">안녕하세요 👋</h1>
        </div>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-200">
          <Bell size={18} />
          {/* 알림 뱃지 */}
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-500" />
        </button>
      </header>

      {/* 콘텐츠 */}
      <div className="space-y-4">
        <AICoachCard />
        <WorkoutJournalCard />
        <DietCard />
      </div>
    </main>
  );
}
