"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type Props = {
  children: React.ReactNode;
  active?: "todo" | "home" | "music";
};

export default function Frame({ children, active = "home" }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const tabClass = (name: string) =>
    `flex-1 h-full flex items-center justify-center transition-colors duration-200 ${
      active === name
        ? "bg-black text-white"
        : "bg-white text-black hover:bg-gray-100"
    }`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFD700] bg-[radial-gradient(#ffffff_4px,transparent_4px)] [background-size:24px_24px] p-6 font-sans">
      <div className="w-[360px] h-[780px] bg-white rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b-4 border-black bg-white z-10">
          <div className="mx-2">
            <Image
              src="/dondonkataduketai.png"
              alt="どんどぅん片付けたい！"
              width={220}
              height={28}
              priority
            />
          </div>
          <Link href="/profile" aria-label="プロフィール設定へ">
            <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white">
              ぎ
            </div>
          </Link>
        </header>

        {/* Content area */}
        <main className="flex-1 p-4 overflow-auto bg-white relative">
          {children}

          {menuOpen && (
            <div
              role="dialog"
              aria-modal="true"
              className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-50"
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
        <nav className="h-16 border-t-4 border-black flex bg-white">
          <Link
            href="/todo"
            className={`${tabClass("todo")} border-r-4 border-black`}
          >
            <span className="text-lg font-black">TODO</span>
          </Link>
          <Link
            href="/"
            className={`${tabClass("home")} border-r-4 border-black`}
          >
            <span className="text-3xl">🏠</span>
          </Link>
          <Link href="/music" className={tabClass("music")}>
            <span className="text-base font-black flex items-center gap-1">
              <span className="text-[#FF6B6B]">お</span>
              <span className="text-[#FF9F1C]">ん</span>
              <span className="text-[#FFD700]">が</span>
              <span className="text-[#4ECDC4]">く</span>
              <span className="text-[#2EC4B6]">♪</span>
            </span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
