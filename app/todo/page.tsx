"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FiCalendar,
  FiClock,
  FiLogOut,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { MdOutlineTimer } from "react-icons/md";
import { supabase } from "@/app/lib/supabase";
import { logout } from "@/features/auth/api";
import {
  deleteTodo,
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
        const sortedData = data.sort((a, b) => {
          if (a.is_completed === b.is_completed) {
            return 0;
          }
          return a.is_completed ? 1 : -1;
        });
        setTodos(sortedData);
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
      setTodos((prev) =>
        prev
          .map((t) => (t.id === id ? updated : t))
          .sort((a, b) =>
            a.is_completed === b.is_completed ? 0 : a.is_completed ? 1 : -1,
          ),
      );
    } catch (e) {
      alert("更新失敗");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("本当に削除しますか？")) return;
    try {
      await deleteTodo(id);
      setTodos(todos.filter((t) => t.id !== id));
    } catch (e) {
      alert("削除失敗");
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
    });
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0 && m === 0) return "0分";
    return `${h > 0 ? `${h}時間` : ""}${m > 0 ? `${m}分` : ""}`;
  };

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
      <div className="pb-20">
        {/* Header */}
        <header className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">
              マイタスク
            </h1>
            <p className="text-gray-600 font-bold text-sm mt-1">
              残り{" "}
              <span className="text-[#FF6B6B] text-lg">
                {todos.filter((t) => !t.is_completed).length}
              </span>{" "}
              件
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 text-black border-2 border-black rounded-lg hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
            title="ログアウト"
          >
            <FiLogOut size={20} />
          </button>
        </header>

        {/* Add Button */}
        <button
          type="button"
          onClick={() => router.push("/todo/task-modal?open=1")}
          className="w-full mb-6 bg-[#4ECDC4] text-white font-black py-3 px-4 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
        >
          <FiPlus size={24} strokeWidth={3} />
          <span>新しいタスクを追加</span>
        </button>

        {/* Task List */}
        <ul className="space-y-4">
          {todos.map((todo) => {
            const isOverdue =
              !todo.is_completed &&
              todo.due_at &&
              new Date(todo.due_at) < new Date();

            return (
              <li
                key={todo.id}
                className={`group relative bg-white p-4 rounded-xl border-2 border-black transition-all duration-200 ${
                  todo.is_completed
                    ? "opacity-60 bg-gray-50"
                    : "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      checked={todo.is_completed ?? false}
                      onChange={() =>
                        handleToggle(todo.id, todo.is_completed ?? false)
                      }
                      className="w-6 h-6 cursor-pointer appearance-none border-2 border-black rounded-md checked:bg-[#4ECDC4] checked:after:content-['✓'] checked:after:text-white checked:after:flex checked:after:justify-center checked:after:items-center checked:after:text-sm checked:after:font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4ECDC4]"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h3
                        className={`text-lg font-bold leading-tight break-words ${
                          todo.is_completed
                            ? "text-gray-500 line-through decoration-2"
                            : "text-black"
                        }`}
                      >
                        {todo.title}
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleDelete(todo.id)}
                        className="text-black hover:text-[#FF6B6B] p-1 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="削除"
                      >
                        <FiTrash2 size={18} strokeWidth={2.5} />
                      </button>
                    </div>

                    {/* Meta Info */}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                      {/* Start Date */}
                      {todo.start_at && (
                        <div className="flex items-center gap-1 bg-[#E0F7FA] text-[#006064] px-2 py-1 rounded border border-black">
                          <FiCalendar />
                          <span>{formatDate(todo.start_at)}</span>
                        </div>
                      )}

                      {/* Due Date */}
                      {(todo.due_at || isOverdue) && (
                        <div
                          className={`flex items-center gap-1 px-2 py-1 rounded border border-black ${
                            isOverdue
                              ? "bg-[#FFEBEE] text-[#C62828]"
                              : "bg-[#FFF3E0] text-[#E65100]"
                          }`}
                        >
                          <FiClock />
                          <span>
                            {todo.due_at ? formatDate(todo.due_at) : "期限なし"}
                          </span>
                        </div>
                      )}

                      {/* Estimated Time */}
                      {todo.estimated_time && (
                        <div className="flex items-center gap-1 bg-[#F3E5F5] text-[#4A148C] px-2 py-1 rounded border border-black">
                          <MdOutlineTimer size={14} />
                          <span>{formatDuration(todo.estimated_time)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}

          {todos.length === 0 && (
            <div className="text-center py-12 px-4 border-2 border-dashed border-gray-300 rounded-xl">
              <div className="bg-[#E0F7FA] w-16 h-16 rounded-full border-2 border-black flex items-center justify-center mx-auto mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <FiCalendar className="text-[#006064] text-2xl" />
              </div>
              <h3 className="text-lg font-black text-black">
                タスクがありません
              </h3>
              <p className="text-gray-500 mt-1 font-bold text-sm">
                新しいタスクを追加して
                <br />
                整理整頓を始めましょう！
              </p>
            </div>
          )}
        </ul>
      </div>
    </Frame>
  );
}
