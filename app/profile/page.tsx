"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import Frame from "../components/Frame";

export default function ProfilePage() {
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const v = localStorage.getItem("profileAvatar");
      if (v) setAvatarSrc(v);
    } catch {
      // ignore
    }
  }, []);

  return (
    <Frame active="home">
      <div className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt="アイコン"
                width={80}
                height={80}
                unoptimized
                className="w-20 h-20 rounded-full border-2 border-zinc-300 object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full border-2 border-zinc-300 flex items-center justify-center text-sm text-zinc-500 bg-white">
                アイコン
              </div>
            )}

            <div className="pt-1">
              <div className="text-2xl font-semibold">名前</div>
              <div className="text-sm text-zinc-500 mt-1">@user_id</div>
            </div>
          </div>

          <Link href="/profile/settings" aria-label="設定" className="p-2">
            <Image src="/setting.webp" alt="設定" width={22} height={22} />
          </Link>
        </div>

        <div className="mb-4">
          <Link
            href="/profile/friends"
            aria-label="フレンド検索へ移動"
            className="text-sm text-zinc-700 flex items-center gap-2"
          >
            <span>フレンド検索</span>
            <span className="text-xs">🔍</span>
          </Link>
        </div>

        <div className="rounded-md border border-zinc-300 h-[60vh] p-6 flex items-center justify-center text-zinc-500 text-sm bg-white">
          <div className="text-center">
            <div className="text-sm">・ ここら辺に積み上げたタスク</div>
          </div>
        </div>
      </div>
    </Frame>
  );
}
