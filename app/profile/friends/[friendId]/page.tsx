"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import Frame from "@/app/components/Frame";
import { supabase } from "@/app/lib/supabase";

interface FriendProfile {
  id: string;
  username: string;
  avatar_url?: string | null;
}

interface Todo {
  id: string;
  title: string;
  due_at: string | null;
  start_at?: string | null;
  is_completed: boolean;
  estimated_time?: number;
}

// ヘルパー関数: 今日の開始時刻を取得
const getTodayStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

export default function FriendDetailPage() {
  const params = useParams();
  const router = useRouter();
  const friendId = params.friendId as string;

  const [friend, setFriend] = useState<FriendProfile | null>(null);
  const [tasks, setTasks] = useState<Todo[]>([]);
  const [completionRate, setCompletionRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [allTodosData, setAllTodosData] = useState<Todo[]>([]);

  // 日付でタスクをフィルタリングする関数
  const filterTasksByDate = useCallback(
    (todosData: Todo[], targetDate: Date) => {
      const target = new Date(targetDate);
      target.setHours(0, 0, 0, 0);
      const targetStr = target.toISOString().split("T")[0];

      console.log("フィルタリング対象日付:", targetStr);

      const filteredTodos = todosData.filter((todo) => {
        if (!todo.due_at) {
          return false;
        }

        const dueDate = new Date(todo.due_at);
        dueDate.setHours(0, 0, 0, 0);
        const dueDateStr = dueDate.toISOString().split("T")[0];

        // 選択された日のタスク
        const isTargetDay = dueDateStr === targetStr;

        // 期限切れ未完了 (期限が選択日より前 かつ 未完了)
        const isOverdue = dueDate < target && !todo.is_completed;

        return (
          isTargetDay ||
          (targetStr === new Date().toISOString().split("T")[0] && isOverdue)
        );
      });

      console.log("フィルター後のタスク:", filteredTodos);

      // ソート: 未完了が先、その中で期限が古い順
      filteredTodos.sort((a, b) => {
        if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
        return (
          new Date(a.due_at || 0).getTime() - new Date(b.due_at || 0).getTime()
        );
      });

      setTasks(filteredTodos);
    },
    [],
  );

  // 日付を変更するハンドラー
  const handleDateChange = useCallback((direction: "prev" | "next") => {
    setSelectedDate((prevDate) => {
      const newDate = new Date(prevDate);
      if (direction === "prev") {
        newDate.setDate(newDate.getDate() - 1);
      } else {
        newDate.setDate(newDate.getDate() + 1);
      }
      return newDate;
    });
  }, []);

  useEffect(() => {
    if (allTodosData.length > 0) {
      filterTasksByDate(allTodosData, selectedDate);
    }
  }, [selectedDate, allTodosData, filterTasksByDate]);

  useEffect(() => {
    const fetchFriendData = async () => {
      try {
        // 現在のユーザーを取得
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // フレンドシップを確認
        const { data: friendshipData } = await supabase
          .from("friendships")
          .select("*")
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
          .or(`user_id.eq.${friendId},friend_id.eq.${friendId}`)
          .eq("status", "accepted")
          .single();

        if (!friendshipData) {
          alert("このユーザーはあなたのフレンドではありません");
          router.push("/profile/friends");
          return;
        }

        // フレンドのプロフィールを取得
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", friendId)
          .single();

        console.log("フレンドID:", friendId);
        console.log("フレンドプロフィール:", profileData);
        console.log("現在ログインしているユーザーID:", user.id);

        if (profileData) {
          setFriend({
            id: profileData.id,
            username: profileData.username || "名前なし",
            avatar_url: profileData.avatar_url,
          });
        }

        // サービスロールキーを使わずにフレンドのタスクを取得（RLS適用）
        const { data: todosData, error: todosError } = await supabase
          .from("todos")
          .select("*")
          .eq("user_id", friendId);

        console.log("取得したフレンドのタスク:", todosData);
        console.log("タスク取得エラー:", todosError);
        console.log("エラー詳細:", JSON.stringify(todosError, null, 2));

        if (todosData && todosData.length > 0) {
          // 全タスクを保存
          setAllTodosData(todosData);

          // 選択された日付でフィルタリング
          filterTasksByDate(todosData, selectedDate);
        } else {
          console.log("タスクが0件またはnull");
          setAllTodosData([]);
          setTasks([]);
        }

        // 達成率を計算（全タスク対象）
        const { data: allTasks } = await supabase
          .from("todos")
          .select("*")
          .eq("user_id", friendId);

        if (allTasks && allTasks.length > 0) {
          const completed = allTasks.filter((t) => t.is_completed).length;
          const rate = Math.round((completed / allTasks.length) * 100);
          setCompletionRate(rate);
        }
      } catch (error) {
        console.error("Error fetching friend data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFriendData();
  }, [friendId, router, filterTasksByDate, selectedDate]);

  if (loading) {
    return (
      <Frame active="home">
        <div className="p-4 text-center">
          <p className="font-bold">読み込み中...</p>
        </div>
      </Frame>
    );
  }

  if (!friend) {
    return (
      <Frame active="home">
        <div className="p-4 text-center">
          <p className="font-bold">フレンドが見つかりません</p>
        </div>
      </Frame>
    );
  }

  return (
    <Frame active="home">
      <div className="p-2">
        {/* 戻るボタン */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-black font-black text-sm rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
          >
            <span className="text-lg">←</span>
            戻る
          </Link>
        </div>

        {/* フレンドプロフィール */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {friend.avatar_url ? (
              <Image
                src={friend.avatar_url}
                alt="アイコン"
                width={80}
                height={80}
                unoptimized
                className="w-20 h-20 rounded-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] object-cover bg-white"
              />
            ) : (
              <div className="w-20 h-20 rounded-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-2xl font-bold text-black bg-[#FFF600]">
                {friend.username[0]?.toUpperCase() || "?"}
              </div>
            )}

            <div className="pt-1">
              <div className="text-2xl font-black tracking-wider">
                {friend.username}
              </div>
              <div className="text-sm font-bold text-zinc-500 mt-1">
                @{friendId.slice(0, 8)}
              </div>
            </div>
          </div>

          {/* 達成率表示 */}
          <div className="bg-white border-4 border-black rounded-xl px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-xs font-bold text-zinc-500">達成率</div>
            <div className="text-3xl font-black">{completionRate}%</div>
          </div>
        </div>

        {/* 今日のタスクセクション */}
        <section>
          <div className="bg-white border-4 border-black rounded-2xl p-4 mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => handleDateChange("prev")}
              >
                <FiChevronLeft size={24} />
              </button>
              <h2 className="text-lg font-black">
                {selectedDate.toLocaleDateString("ja-JP", {
                  month: "numeric",
                  day: "numeric",
                  weekday: "short",
                })}{" "}
                スケジュール
              </h2>
              <button
                type="button"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => handleDateChange("next")}
              >
                <FiChevronRight size={24} />
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="p-6 border-4 border-dashed border-gray-300 rounded-xl text-center text-gray-500 font-bold bg-gray-50">
                表示するタスクはありません 🎉
                <br />
                <span className="text-sm font-normal">
                  ゆっくり休んでいるようです！
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task, index) => {
                  const dueDate = new Date(task.due_at ?? 0);
                  const startTime = task.start_at
                    ? new Date(task.start_at)
                    : null;
                  const estimatedTime = task.estimated_time || 0;

                  // 時刻フォーマット
                  const formatTime = (date: Date) =>
                    date.toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                  const startTimeStr = startTime
                    ? formatTime(startTime)
                    : formatTime(dueDate);
                  const endTime = startTime
                    ? new Date(startTime.getTime() + estimatedTime * 60000)
                    : new Date(dueDate.getTime());
                  const endTimeStr = formatTime(endTime);

                  // 所要時間に応じた背景色
                  let bgColor = "#4ECDC4"; // Blue/Cyan (Short)
                  if (estimatedTime >= 60) {
                    bgColor = "#FF4444"; // Red (Long)
                  } else if (estimatedTime >= 30) {
                    bgColor = "#FFF600"; // Yellow (Medium)
                  }

                  return (
                    <div key={task.id}>
                      <div
                        className="border-4 border-black rounded-2xl p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                        style={{ backgroundColor: bgColor }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 overflow-hidden">
                            <div className="flex-shrink-0">
                              <div className="text-sm font-black">
                                {startTimeStr}
                              </div>
                              <div className="text-xs text-gray-600">
                                ~{endTimeStr}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div
                                className={`font-black text-lg truncate ${
                                  task.is_completed
                                    ? "line-through opacity-50"
                                    : ""
                                }`}
                              >
                                {task.title}
                              </div>
                              <div className="inline-block bg-[#FFF600] border-2 border-black rounded-lg px-2 py-0.5 text-xs font-black mt-1">
                                {estimatedTime}分
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <span
                              className={`w-8 h-8 flex items-center justify-center border-2 border-black rounded-md ${
                                task.is_completed ? "bg-[#4ECDC4]" : "bg-white"
                              }`}
                            >
                              {task.is_completed && (
                                <svg
                                  className="w-5 h-5 text-white"
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
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* 空き時間の表示 */}
                      {index < tasks.length - 1 && (
                        <div className="text-center py-2">
                          <div className="inline-block bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg px-3 py-1 text-xs text-gray-500">
                            空き時間
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </Frame>
  );
}
