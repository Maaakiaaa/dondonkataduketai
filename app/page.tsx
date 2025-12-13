"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/features/auth/api";
import { getAchievementRate, getFriends } from "@/features/friendship/api";
import { getTodos, type Todo } from "@/features/todos/api";
import Frame from "./components/Frame";

type FriendStatus = {
  id: string;
  username: string;
  avatar_url: string | null;
  rate: number;
};

export default function Home() {
  const [myTasks, setMyTasks] = useState<Todo[]>([]);
  const [friendStatuses, setFriendStatuses] = useState<FriendStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // 1. 自分のタスク取得 & フィルタリング
        const allTodos = await getTodos();
        const now = new Date();
        // 今日の0時0分0秒
        const todayStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        // 明日の0時0分0秒
        const todayEnd = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1,
        );

        const filteredTodos = allTodos.filter((todo) => {
          // 自分のタスクのみ
          if (todo.user_id !== user.id) return false;
          // 期限がないものは除外（要件によるが、今回は「今日のタスク」なので期限必須と仮定）
          if (!todo.due_at) return false;

          const dueDate = new Date(todo.due_at);

          // 今日のタスク (期限が今日の範囲内)
          const isToday = dueDate >= todayStart && dueDate < todayEnd;

          // 期限切れ未完了 (期限が今日より前 かつ 未完了)
          const isOverdue = dueDate < todayStart && !todo.is_completed;

          return isToday || isOverdue;
        });

        // ソート: 未完了が先、その中で期限が古い順
        filteredTodos.sort((a, b) => {
          if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
          return new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime();
        });

        setMyTasks(filteredTodos);

        // 2. フレンドの達成率取得
        const friends = await getFriends(user.id);
        const statuses = await Promise.all(
          friends.map(async (f) => {
            const rate = await getAchievementRate(f.profile.id);
            return {
              id: f.profile.id,
              username: f.profile.username,
              avatar_url: f.profile.avatar_url,
              rate,
            };
          }),
        );

        // 達成率高い順
        statuses.sort((a, b) => b.rate - a.rate);
        setFriendStatuses(statuses);
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <Frame active="home">
      <div className="flex flex-col gap-8">
        {/* 自分のタスクセクション */}
        <section>
          <h2 className="text-xl font-black mb-4 border-b-4 border-black inline-block bg-[#FFE66D] px-2 transform -rotate-1">
            今日のタスク & 期限切れ
          </h2>
          {loading ? (
            <p className="text-center py-4 font-bold animate-pulse">
              読み込み中...
            </p>
          ) : myTasks.length === 0 ? (
            <div className="p-6 border-4 border-dashed border-gray-300 rounded-xl text-center text-gray-500 font-bold bg-gray-50">
              表示するタスクはありません 🎉
              <br />
              <span className="text-sm font-normal">
                ゆっくり休みましょう！
              </span>
            </div>
          ) : (
            <ul className="space-y-3">
              {myTasks.map((task) => {
                const dueDate = new Date(task.due_at!);
                const now = new Date();
                const todayStart = new Date(
                  now.getFullYear(),
                  now.getMonth(),
                  now.getDate(),
                );
                const isOverdue = dueDate < todayStart && !task.is_completed;

                return (
                  <li
                    key={task.id}
                    className={`p-3 border-4 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between transition-transform hover:-translate-y-1 ${
                      task.is_completed
                        ? "bg-gray-100"
                        : isOverdue
                          ? "bg-[#FF6B6B] text-white"
                          : "bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="text-xl">
                        {task.is_completed ? "✅" : isOverdue ? "🔥" : "⬜"}
                      </span>
                      <span
                        className={`font-bold truncate ${
                          task.is_completed ? "line-through text-gray-500" : ""
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-mono border-2 border-black px-2 py-1 rounded-md font-bold whitespace-nowrap ml-2 ${
                        isOverdue
                          ? "bg-white text-black"
                          : "bg-black text-white"
                      }`}
                    >
                      {dueDate.toLocaleDateString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* フレンド達成率セクション */}
        <section>
          <h2 className="text-xl font-black mb-4 border-b-4 border-black inline-block bg-[#4ECDC4] px-2 transform rotate-1">
            みんなの達成率
          </h2>
          {loading ? (
            <p className="text-center py-4 font-bold animate-pulse">
              読み込み中...
            </p>
          ) : friendStatuses.length === 0 ? (
            <div className="p-6 border-4 border-dashed border-gray-300 rounded-xl text-center text-gray-500 font-bold bg-gray-50">
              フレンドがいません 😢
              <br />
              <span className="text-sm font-normal">
                友達を誘ってみましょう！
              </span>
            </div>
          ) : (
            <ul className="space-y-4">
              {friendStatuses.map((friend, index) => (
                <li
                  key={friend.id}
                  className="flex items-center gap-3 p-3 border-4 border-black rounded-xl bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative"
                >
                  {index === 0 && (
                    <span className="absolute -top-3 -left-2 text-3xl transform -rotate-12 drop-shadow-md">
                      👑
                    </span>
                  )}
                  <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-black overflow-hidden flex-shrink-0">
                    {friend.avatar_url ? (
                      <img
                        src={friend.avatar_url}
                        alt={friend.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold bg-[#FFD700]">
                        {friend.username.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-end mb-1">
                      <span className="font-bold text-sm truncate mr-2">
                        {friend.username}
                      </span>
                      <span className="font-black text-lg font-mono">
                        {friend.rate}%
                      </span>
                    </div>
                    <div className="w-full h-4 bg-gray-100 rounded-full border-2 border-black overflow-hidden relative">
                      <div
                        className="h-full bg-[#4ECDC4] border-r-2 border-black transition-all duration-500 ease-out"
                        style={{ width: `${friend.rate}%` }}
                      />
                      {/* ストライプ模様のオーバーレイ */}
                      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.5)_25%,rgba(255,255,255,0.5)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.5)_75%,rgba(255,255,255,0.5)_100%)] bg-[length:10px_10px] opacity-30" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Frame>
  );
}
