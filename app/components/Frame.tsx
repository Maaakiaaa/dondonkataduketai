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
    `flex-1 h-full flex items-center justify-center ${
      active === name ? "bg-black text-white" : "bg-transparent text-black"
    }`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 p-6">
      <div className="w-[360px] h-[780px] border-2 border-zinc-500 rounded-xl bg-white shadow-md flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-3 py-3 border-b border-zinc-200">
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
              あ
            </div>
          </Link>
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
            ></div>
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
            <span className="text-base font-medium flex items-center gap-1">
              <span className="text-red-500">お</span>
              <span className="text-orange-400">ん</span>
              <span className="text-yellow-400">が</span>
              <span className="text-green-400">く</span>
              <span className="text-sky-400">♪</span>
            </span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
