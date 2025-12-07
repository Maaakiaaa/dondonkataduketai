"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  children: React.ReactNode;
  active?: "todo" | "home" | "music";
};

export default function Frame({ children, active = "home" }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const tabClass = (name: string) =>
    `flex-1 h-full flex items-center justify-center ${
      active === name ? "bg-black text-white" : "bg-transparent text-black"
    }`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 p-6">
      <div className="w-[360px] h-[780px] border-2 border-zinc-500 rounded-xl bg-white shadow-md flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-3 py-3 border-b border-zinc-200">
          <button
            type="button"
            onClick={() => setMenuOpen((s) => !s)}
            aria-expanded={menuOpen}
            className="w-8 h-8 rounded-md border border-zinc-300 flex items-center justify-center"
          >
            ≡
          </button>
          <h1 className="text-sm font-semibold tracking-tight">
            <span className="text-pink-500">ど</span>
            <span className="text-orange-400">ん</span>
            <span className="text-yellow-400">ど</span>
            <span className="text-green-400">ぅ</span>
            <span className="text-sky-400">ん</span>
            <span className="ml-1">片付けたい！</span>
          </h1>
          <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white">
            ぎ
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 p-3 overflow-auto bg-white relative">
          {children}

          {menuOpen && (
            <div
              role="dialog"
              aria-modal="true"
              className="absolute inset-0 flex items-center justify-center bg-black/20"
              onClick={(e) => {
                if (e.target === e.currentTarget) setMenuOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setMenuOpen(false);
              }}
            >
              <div className="w-[84%] h-[64%] max-h-[86%] rounded-md border border-zinc-400 bg-white px-6 py-3 overflow-auto">
                <div className="h-full flex flex-col items-center justify-center text-center text-sm text-zinc-800">
                  <div className="space-y-3">
                    <div>フレンド</div>
                    <div>TODO</div>
                    <div>プロフィール</div>
                    <div>ミュージック</div>
                    <div>ログアウト</div>
                  </div>

                  <div className="mt-6 text-[12px] text-zinc-500">
                    ＊それっぽい雰囲気
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Bottom navigation */}
        <nav className="h-14 border-t border-zinc-200 flex">
          <Link href="/todo" className={tabClass("todo")}>
            <span className="text-sm font-medium">TODO</span>
          </Link>
          <Link href="/" className={tabClass("home")}>
            <span className="text-2xl">🏠</span>
          </Link>
          <Link href="/music" className={tabClass("music")}>
            <span className="text-sm font-medium">MUSIC</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
