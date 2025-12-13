"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import Frame from "../components/Frame";
import TaskPile, { type Task } from "./components/TaskPile";

export default function ProfilePage() {
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const v = localStorage.getItem("profileAvatar");
      if (v) setAvatarSrc(v);
    } catch {
      // ignore
    }

    const fetchTasks = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_completed", true)
        .order("created_at", { ascending: false });

      if (data) {
        const mappedTasks: Task[] = data.map((t) => ({
          id: t.id,
          title: t.title || "No Title",
          completedAt: t.created_at, // 完了日時のカラムがないため作成日時で代用
          estimatedTime: t.estimated_time || 0,
        }));
        setTasks(mappedTasks);
      }
    };

    fetchTasks();
  }, []);

  return (
    <Frame active="home">
      <div className="p-2">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt="アイコン"
                width={80}
                height={80}
                unoptimized
                className="w-20 h-20 rounded-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] object-cover bg-white"
              />
            ) : (
              <div className="w-20 h-20 rounded-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-sm font-bold text-black bg-white">
                アイコン
              </div>
            )}

            <div className="pt-1">
              <div className="text-2xl font-black tracking-wider">名前</div>
              <div className="text-sm font-bold text-zinc-500 mt-1">
                @user_id
              </div>
            </div>
          </div>

          <Link
            href="/profile/settings"
            aria-label="設定"
            className="p-2 hover:rotate-90 transition-transform duration-300"
          >
            <Image src="/setting.webp" alt="設定" width={35} height={35} />
          </Link>
        </div>

        <div className="mb-6">
          <Link
            href="/profile/friends"
            aria-label="フレンド検索へ移動"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#4ECDC4] border-2 border-black rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-none transition-all"
          >
            <span className="font-black text-white">フレンド検索</span>
            <span className="text-sm">🔍</span>
          </Link>
        </div>

        <div className="rounded-xl border-4 border-black h-[55vh] bg-white overflow-hidden flex flex-col shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <TaskPile tasks={tasks} />
        </div>
      </div>
    </Frame>
  );
}
