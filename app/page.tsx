"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FiAlertCircle, FiClock, FiPlayCircle } from "react-icons/fi";
import { getCurrentUser } from "@/features/auth/api";
import { getAchievementRate, getFriends } from "@/features/friendship/api";
import {
  getTodos,
  type Todo,
  toggleTodoCompletion,
} from "@/features/todos/api";
import Frame from "./components/Frame";

type FriendStatus = {
  id: string;
  username: string;
  avatar_url: string | null;
  rate: number;
};

// ヘルパー関数: 今日の開始時刻を取得
const getTodayStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

// ヘルパー関数: 明日の開始時刻を取得
const getTomorrowStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
};

export default function Home() {
  const [myTasks, setMyTasks] = useState<Todo[]>([]);
  const [friendStatuses, setFriendStatuses] = useState<FriendStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiReminder, setAiReminder] = useState<{
    task: Todo;
    reason: string;
  } | null>(null);
  const [showAiReminder, setShowAiReminder] = useState(false);

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      const updated = await toggleTodoCompletion(id, !currentStatus);
      setMyTasks((prev) => {
        const newTasks = prev.map((t) => (t.id === id ? updated : t));
        // ソート: 未完了が先、その中で期限が古い順
        return newTasks.sort((a, b) => {
          if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
          return (
            new Date(a.due_at || 0).getTime() -
            new Date(b.due_at || 0).getTime()
          );
        });
      });
    } catch (error) {
      console.error("Toggle task error:", error);
      alert("更新失敗");
    }
  };

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
        // 今日の0時0分0秒
        const todayStart = getTodayStart();
        // 明日の0時0分0秒
        const tomorrowStart = getTomorrowStart();

        const filteredTodos = allTodos.filter((todo) => {
          // 自分のタスクのみ
          if (!todo.user_id || todo.user_id !== user.id) return false;
          // DB仕様上、due_atは必ず値が入るため、nullチェックは不要

          const dueDate = new Date(todo.due_at ?? 0);

          // 今日のタスク (期限が今日の範囲内)
          const isToday = dueDate >= todayStart && dueDate < tomorrowStart;

          // 期限切れ未完了 (期限が今日より前 かつ 未完了)
          const isOverdue = dueDate < todayStart && !todo.is_completed;

          return isToday || isOverdue;
        });

        // ソート: 未完了が先、その中で期限が古い順
        filteredTodos.sort((a, b) => {
          if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
          return (
            new Date(a.due_at || 0).getTime() -
            new Date(b.due_at || 0).getTime()
          );
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

        // 3. AI優先タスク取得（未完了タスクのみ）
        const incompleteTasks = filteredTodos.filter((t) => !t.is_completed);
        console.log("🤖 未完了タスク数:", incompleteTasks.length);

        if (incompleteTasks.length > 0) {
          try {
            console.log("🤖 AIに優先タスクを問い合わせ中...");
            const aiRes = await fetch("/api/ai/priority-task", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tasks: incompleteTasks }),
            });

            if (aiRes.ok) {
              const aiData = await aiRes.json();
              console.log("🤖 AI推奨タスク:", aiData);
              setAiReminder(aiData);
              setShowAiReminder(true);
              console.log("🤖 リマインドを表示します");
            } else {
              console.error("🤖 AI API エラー:", await aiRes.text());
            }
          } catch (error) {
            console.error("🤖 AI優先タスク取得エラー:", error);
          }
        } else {
          console.log("🤖 未完了タスクがないため、AIリマインドは表示しません");
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <>
      {/* AIリマインド（Frameの外側、画面最上部） */}
      {showAiReminder && aiReminder && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-9999 w-[90%] max-w-md"
          style={{
            animation: "slideDown 0.3s ease-out",
          }}
        >
          <div className="bg-linear-to-r from-[#9b5de5] to-[#6f42c1] text-white p-5 rounded-2xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
            {/* 閉じるボタン */}
            <button
              type="button"
              onClick={() => {
                setShowAiReminder(false);
                console.log("🤖 リマインドを閉じました");
              }}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full border-2 border-white/50 transition-all active:scale-95"
              aria-label="閉じる"
            >
              <span className="text-white text-xl font-bold leading-none">
                ×
              </span>
            </button>

            <div className="flex items-start gap-3 pr-8">
              <div className="text-4xl">🤖</div>
              <div className="flex-1">
                <div className="font-black text-base mb-1 opacity-90">
                  AI おすすめタスク
                </div>
                <div className="font-bold text-lg mb-2">
                  {aiReminder.task.title}
                </div>
                <div className="text-sm opacity-90 leading-relaxed">
                  {aiReminder.reason}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  // DB仕様上、due_atは必ず値が入る(start_at + estimated_timeで自動計算)
                  const dueDate = new Date(task.due_at ?? 0);
                  const todayStart = getTodayStart();
                  const isOverdue = dueDate < todayStart && !task.is_completed;

                  // 時刻フォーマット
                  const formatTime = (date: Date) =>
                    date.toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                  const formatDateTime = (date: Date) =>
                    date.toLocaleString("ja-JP", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                  let TimeIcon = FiClock;
                  let timeText = "";
                  let badgeStyle = "";

                  if (isOverdue) {
                    TimeIcon = FiAlertCircle;
                    timeText = formatDateTime(dueDate);
                    // 親が赤背景なので、白背景・赤文字にする
                    badgeStyle = "bg-white text-[#FF6B6B] border-white";
                  } else if (task.start_at) {
                    TimeIcon = FiPlayCircle;
                    timeText = formatTime(new Date(task.start_at));
                    // 親が白背景。開始時間を目立たせる（青系など）
                    badgeStyle = "bg-[#E0F7FA] text-[#006064] border-[#006064]";
                  } else {
                    TimeIcon = FiClock;
                    timeText = formatTime(dueDate);
                    // 親が白背景。期限を目立たせる（オレンジ系など）
                    badgeStyle = "bg-[#FFF3E0] text-[#E65100] border-[#E65100]";
                  }

                  // 完了済みの場合のスタイル上書き（グレーアウト）
                  if (task.is_completed) {
                    badgeStyle = "bg-gray-200 text-gray-500 border-gray-400";
                  }

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
                        <label className="inline-flex items-center cursor-pointer flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={task.is_completed ?? false}
                            onChange={() =>
                              handleToggle(task.id, task.is_completed ?? false)
                            }
                            className="sr-only peer"
                            aria-label={task.title || "タスク"}
                          />
                          <span
                            className="w-6 h-6 flex items-center justify-center border-2 border-black rounded-md bg-white peer-checked:bg-[#4ECDC4] transition-colors duration-200
                          peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-[#4ECDC4]"
                          >
                            {/* Checkmark */}
                            <svg
                              className={`w-4 h-4 text-white ${task.is_completed ? "opacity-100" : "opacity-0"}`}
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <title>Checkmark icon</title>
                              <polyline points="5 11 9 15 15 7" />
                            </svg>
                          </span>
                        </label>
                        <span
                          className={`font-bold truncate ${
                            task.is_completed
                              ? "line-through text-gray-500"
                              : ""
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-md border-2 text-xs font-bold whitespace-nowrap ml-2 ${badgeStyle}`}
                      >
                        <TimeIcon size={14} />
                        <span className="font-mono">{timeText}</span>
                      </div>
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
                  <li key={friend.id} className="relative">
                    <Link
                      href={`/profile/friends/${friend.id}`}
                      className="flex items-center gap-3 p-3 border-4 border-black rounded-xl bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all block"
                    >
                      {index === 0 && (
                        <span className="absolute -top-3 -left-2 text-3xl transform -rotate-12 drop-shadow-md">
                          👑
                        </span>
                      )}
                      <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-black overflow-hidden flex-shrink-0">
                        {friend.avatar_url ? (
                          <Image
                            src={friend.avatar_url}
                            alt={friend.username}
                            width={40}
                            height={40}
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
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </Frame>
    </>
  );
}
