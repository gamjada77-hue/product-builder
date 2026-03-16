/**
 * 오프라인 폴백 페이지
 *
 * Service Worker가 네트워크 요청을 처리할 수 없을 때 표시되는 페이지.
 * 사전 캐시(precache)에 포함되어 있어 항상 오프라인에서도 접근 가능.
 */
"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
      {/* アイコン */}
      <div className="w-24 h-24 rounded-2xl bg-zinc-800 flex items-center justify-center mb-8">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-12 h-12 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M18.364 5.636a9 9 0 010 12.728m-3.536-3.536a4 4 0 000-5.656M6.343 6.343a9 9 0 000 12.728m3.536-3.536a4 4 0 010-5.656M12 12h.01"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-white mb-3">
        オフラインです
      </h1>

      <p className="text-zinc-400 text-base leading-relaxed max-w-xs mb-2">
        ネットワークに接続できません。
      </p>
      <p className="text-zinc-500 text-sm leading-relaxed max-w-xs mb-8">
        トレーニング記録は引き続き入力できます。
        オンライン復帰後、自動的にサーバーに同期されます。
      </p>

      {/* ヒント */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 max-w-xs w-full text-left mb-6">
        <h2 className="text-zinc-300 text-sm font-semibold mb-3">
          オフラインでできること
        </h2>
        <ul className="space-y-2">
          {[
            "セット・レップ・重量の記録",
            "過去のトレーニング履歴の閲覧",
            "エクササイズライブラリの参照",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-zinc-400 text-sm">
              <span className="text-green-500" aria-hidden="true">✓</span>
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <h3 className="text-zinc-500 text-xs font-medium mb-2">
            オフラインでできないこと
          </h3>
          <ul className="space-y-1">
            {["AI ルーティン提案", "アカウント作成・ログイン"].map((item) => (
              <li key={item} className="flex items-center gap-2 text-zinc-600 text-xs">
                <span aria-hidden="true">✕</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-xl transition-colors text-sm"
      >
        再接続を試みる
      </button>
    </div>
  );
}
