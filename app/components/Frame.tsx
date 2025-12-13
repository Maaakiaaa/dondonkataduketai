"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  children: React.ReactNode;
  active?: "todo" | "home" | "music";
};

export default function Frame({ children, active = "home" }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("名前");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadAvatar = () => {
      try {
        const v = localStorage.getItem("profileAvatar");
        if (v) setAvatarSrc(v);
      } catch {
        // ignore
      }
    };

    const loadUsername = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.user_metadata?.username) {
          setUsername(user.user_metadata.username);
        }
      } catch {
        // ignore
      }
    };

    // 初回ロード
    loadAvatar();
    loadUsername();

    // storage イベントで他のタブの変更を検知
    window.addEventListener("storage", loadAvatar);

    // カスタムイベントで同じタブ内の変更を検知
    window.addEventListener("avatarUpdated", loadAvatar);
    window.addEventListener("usernameUpdated", loadUsername);

    return () => {
      window.removeEventListener("storage", loadAvatar);
      window.removeEventListener("avatarUpdated", loadAvatar);
      window.removeEventListener("usernameUpdated", loadUsername);
    };
  }, []);

  const tabClass = (name: string) =>
    `flex-1 h-full flex items-center justify-center transition-colors duration-200 ${
      active === name
        ? "bg-black text-white"
        : "bg-white text-black hover:bg-gray-100"
    }`;

  return (
    <div className="h-[100dvh] w-full flex items-center justify-center bg-[#FFD700] bg-[radial-gradient(#ffffff_4px,transparent_4px)] [background-size:24px_24px] p-4 md:p-6 font-sans overflow-hidden">
      <div className="w-full max-w-[360px] h-full bg-white text-black rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black flex flex-col overflow-hidden">
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
            <div
              className={`w-10 h-10 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center font-black transform hover:translate-y-0.5 hover:shadow-none transition-all overflow-hidden ${
                avatarSrc ? "bg-white" : "bg-[#4ECDC4] text-white"
              }`}
            >
              {avatarSrc ? (
                <Image
                  src={avatarSrc}
                  alt="アイコン"
                  width={40}
                  height={40}
                  unoptimized
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{username[0] ?? "?"}</span>
              )}
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
              <div className="w-[84%] h-[64%] max-h-[86%] rounded-2xl border-4 border-black bg-white px-6 py-6 overflow-auto shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="h-full flex flex-col items-center justify-center text-center text-lg font-bold text-black">
                  <div className="space-y-4 w-full">
                    <div className="p-2 hover:bg-[#FFE66D] rounded-lg cursor-pointer border-2 border-transparent hover:border-black transition-all">
                      フレンド
                    </div>
                    <div className="p-2 hover:bg-[#4ECDC4] rounded-lg cursor-pointer border-2 border-transparent hover:border-black transition-all">
                      TODO
                    </div>
                    <div className="p-2 hover:bg-[#FF6B6B] rounded-lg cursor-pointer border-2 border-transparent hover:border-black transition-all">
                      プロフィール
                    </div>
                    <div className="p-2 hover:bg-[#9b5de5] rounded-lg cursor-pointer border-2 border-transparent hover:border-black transition-all">
                      ミュージック
                    </div>
                    <div className="p-2 hover:bg-gray-200 rounded-lg cursor-pointer border-2 border-transparent hover:border-black transition-all">
                      ログアウト
                    </div>
                  </div>

                  <div className="mt-8 text-sm text-zinc-500 font-normal">
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
