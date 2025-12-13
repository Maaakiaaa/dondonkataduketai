"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { supabase } from "@/app/lib/supabase";
import {
  getTodos,
  type Todo,
  toggleTodoCompletion,
} from "@/features/todos/api";
import Frame from "../components/Frame";

export default function TodoPage() {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);

      try {
        const data = await getTodos();
        setTodos(data);
      } catch (e) {
        console.error(e);
        alert("データ取得失敗");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      const updated = await toggleTodoCompletion(id, !currentStatus);
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (e) {
      alert("更新失敗");
    }
  };

  const goToPreviousDay = () => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };

  const goToNextDay = () => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  };

  // Filter todos for the selected date
  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const scheduledTodos = todos.filter(
    (t) =>
      t.start_at &&
      !t.is_completed &&
      isSameDay(new Date(t.start_at), selectedDate),
  );
  const unscheduledTodos = todos.filter((t) => !t.start_at && !t.is_completed);
  const completedTodos = todos.filter((t) => t.is_completed);

  // Get date string for display
  const dateStr = `${selectedDate.getMonth() + 1}/${selectedDate.getDate()}(${["日", "月", "火", "水", "木", "金", "土"][selectedDate.getDay()]})`;

  // Group scheduled todos by hour
  const todosByHour: Record<number, Todo[]> = {};
  scheduledTodos.forEach((todo) => {
    const hour = new Date(todo.start_at!).getHours();
    if (!todosByHour[hour]) todosByHour[hour] = [];
    todosByHour[hour].push(todo);
  });

  if (loading)
    return (
      <Frame active="todo">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-[#4ECDC4]"></div>
        </div>
      </Frame>
    );

  return (
    <Frame active="todo">
      <div className="pb-20 font-sans">
        {/* Top Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            type="button"
            onClick={() => router.push("/todo/task-modal?open=1")}
            className="flex-1 bg-white border-2 border-black rounded-full py-2 px-4 font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none transition-all hover:bg-gray-50"
          >
            TODO作成
          </button>
          <button
            type="button"
            className="flex-1 bg-white border-2 border-black rounded-full py-2 px-4 font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none transition-all hover:bg-gray-50"
          >
            カレンダー
          </button>
        </div>

        {/* Date Header */}
        <div className="flex items-center justify-between mb-4 bg-white border-2 border-black rounded-lg p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <button
            type="button"
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            onClick={goToPreviousDay}
            aria-label="前の日"
          >
            <FiChevronLeft size={20} className="text-gray-700" />
          </button>
          <span className="font-black text-base tracking-wide text-gray-700">
            {dateStr} スケジュール
          </span>
          <button
            type="button"
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            onClick={goToNextDay}
            aria-label="次の日"
          >
            <FiChevronRight size={20} className="text-gray-700" />
          </button>
        </div>

        {/* Scheduled Tasks - Compact Cards */}
        {scheduledTodos.length > 0 ? (
          <div className="space-y-3 mb-6">
            {scheduledTodos.map((todo) => {
              const startTime = new Date(todo.start_at!);
              const endTime = new Date(
                startTime.getTime() + (todo.estimated_time || 30) * 60000,
              );

              return (
                <div
                  key={todo.id}
                  className="bg-white border-2 border-black rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform"
                >
                  <div className="flex items-start gap-3">
                    {/* Time */}
                    <div className="flex-shrink-0 w-16 pt-0.5">
                      <div className="text-xs font-black text-[#4ECDC4]">
                        {startTime.getHours().toString().padStart(2, "0")}:
                        {startTime.getMinutes().toString().padStart(2, "0")}
                      </div>
                      <div className="text-[10px] font-bold text-gray-400">
                        ~{endTime.getHours().toString().padStart(2, "0")}:
                        {endTime.getMinutes().toString().padStart(2, "0")}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-base leading-tight mb-1">
                        {todo.title}
                      </h3>
                      {todo.estimated_time && (
                        <span className="inline-block text-[10px] font-bold bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
                          {todo.estimated_time}分
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/todo/task-modal?id=${todo.id}&open=1`)
                        }
                        className="px-2 py-1 text-[10px] font-bold border border-black rounded bg-white hover:bg-gray-50"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggle(todo.id, false)}
                        className="w-6 h-6 rounded-full border-2 border-black flex items-center justify-center hover:bg-[#4ECDC4] hover:border-[#4ECDC4] transition-colors group"
                      >
                        <svg
                          className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100"
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <title>完了</title>
                          <polyline points="5 11 9 15 15 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mb-6 text-center py-8 border-2 border-dashed border-gray-300 rounded-xl">
            <p className="text-sm font-bold text-gray-400">
              今日のスケジュールはありません
            </p>
          </div>
        )}

        {/* Unplaced Tasks Section */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3 px-1">
            <h2 className="font-black text-lg text-black">未配置タスク</h2>
            <span className="text-[10px] font-bold text-gray-500">
              {unscheduledTodos.length}件
            </span>
          </div>

          <div className="space-y-3">
            {unscheduledTodos.length === 0 && (
              <div className="text-center py-6 text-gray-400 font-bold text-sm border-2 border-dashed border-gray-300 rounded-xl">
                未配置のタスクはありません
              </div>
            )}

            {unscheduledTodos.map((todo) => {
              const isUrgent =
                todo.due_at &&
                new Date(todo.due_at) < new Date(Date.now() + 86400000);

              return (
                <div
                  key={todo.id}
                  className={`relative border-2 border-black rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 ${
                    isUrgent ? "bg-[#FF6B6B] text-white" : "bg-white text-black"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-base leading-tight mb-1">
                        {todo.title}
                      </h3>
                      <div className="flex gap-2 text-[10px] font-bold flex-wrap">
                        {todo.due_at && (
                          <span
                            className={`px-2 py-0.5 rounded border ${
                              isUrgent
                                ? "bg-white/20 border-white/40"
                                : "bg-[#FFF3E0] border-[#FFB74D] text-[#E65100]"
                            }`}
                          >
                            {new Date(todo.due_at).toLocaleString("ja-JP", {
                              month: "numeric",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            まで
                          </span>
                        )}
                        {todo.estimated_time && (
                          <span
                            className={`px-2 py-0.5 rounded border ${
                              isUrgent
                                ? "bg-white/20 border-white/40"
                                : "bg-gray-100 border-gray-300 text-gray-600"
                            }`}
                          >
                            {todo.estimated_time}分
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/todo/task-modal?id=${todo.id}&open=1`)
                        }
                        className={`px-2 py-1 text-[10px] font-bold border rounded transition-colors ${
                          isUrgent
                            ? "border-white text-white hover:bg-white/20"
                            : "border-black text-black hover:bg-gray-50"
                        }`}
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggle(todo.id, false)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors group ${
                          isUrgent
                            ? "border-white hover:bg-white/20"
                            : "border-black hover:bg-[#4ECDC4] hover:border-[#4ECDC4]"
                        }`}
                      >
                        <svg
                          className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100"
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <title>完了</title>
                          <polyline points="5 11 9 15 15 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Completed Tasks Section */}
        {completedTodos.length > 0 && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-3 px-1">
              <h2 className="font-black text-lg text-gray-500">完了済み</h2>
              <span className="text-[10px] font-bold text-gray-400">
                {completedTodos.length}件
              </span>
            </div>

            <div className="space-y-3">
              {completedTodos.map((todo) => {
                const dueDate = todo.due_at ? new Date(todo.due_at) : null;

                return (
                  <div
                    key={todo.id}
                    className="relative border-2 border-gray-300 rounded-xl p-3 bg-gray-50 opacity-60"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-base leading-tight mb-1 text-gray-500 line-through">
                          {todo.title}
                        </h3>
                        <div className="flex gap-2 text-[10px] font-bold flex-wrap">
                          {dueDate && (
                            <span className="px-2 py-0.5 rounded border bg-gray-100 border-gray-300 text-gray-500">
                              {dueDate.toLocaleString("ja-JP", {
                                month: "numeric",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              まで
                            </span>
                          )}
                          {todo.estimated_time && (
                            <span className="px-2 py-0.5 rounded border bg-gray-100 border-gray-300 text-gray-500">
                              {todo.estimated_time}分
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggle(todo.id, true)}
                          className="w-6 h-6 rounded-full border-2 border-gray-400 bg-[#4ECDC4] flex items-center justify-center hover:opacity-80 transition-opacity"
                          title="未完了に戻す"
                        >
                          <svg
                            className="w-3.5 h-3.5 text-white"
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <title>未完了に戻す</title>
                            <polyline points="5 11 9 15 15 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Frame>
  );
}
