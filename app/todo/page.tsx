"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
      setTodos(todos.map((t) => (t.id === id ? updated : t)));
    } catch (e) {
      alert("更新失敗");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("本当に消す？")) return;
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

  if (loading) return <div className="p-10">読み込み中...</div>;

  return (
    <Frame active="todo">
      <main className="max-w-md mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">マイタスク</h1>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-red-500 hover:underline"
          >
            ログアウト
          </button>
        </div>

        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.push("/todo/task-modal?open=1")}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          >
            タスク追加
          </button>
        </div>

        <ul className="space-y-3">
          {todos.map((todo) => (
            <li key={todo.id} className="bg-white p-4 rounded shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={todo.is_completed ?? false}
                    onChange={() =>
                      handleToggle(todo.id, todo.is_completed ?? false)
                    }
                    className="w-5 h-5 cursor-pointer"
                  />
                  <span
                    className={
                      todo.is_completed
                        ? "line-through text-gray-400 font-semibold"
                        : "font-semibold"
                    }
                  >
                    {todo.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(todo.id)}
                  className="text-gray-400 hover:text-red-500 flex-shrink-0"
                >
                  🗑️
                </button>
              </div>

              <div className="text-xs text-gray-600 space-y-1 ml-8">
                {todo.start_at ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">開始:</span>
                      <span>
                        {new Date(todo.start_at).toLocaleString("ja-JP")}
                      </span>
                    </div>
                    {todo.estimated_time && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">期限:</span>
                          <span>
                            {new Date(
                              new Date(todo.start_at).getTime() +
                                todo.estimated_time * 60000,
                            ).toLocaleString("ja-JP")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">所要時間:</span>
                          <span>
                            {Math.floor(todo.estimated_time / 60)}時間
                            {todo.estimated_time % 60 > 0
                              ? `${todo.estimated_time % 60}分`
                              : ""}
                          </span>
                        </div>
                      </>
                    )}
                  </>
                ) : todo.due_at ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">期限:</span>
                      <span>
                        {new Date(todo.due_at).toLocaleString("ja-JP")}
                      </span>
                    </div>
                    {todo.estimated_time && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">所要時間:</span>
                        <span>
                          {Math.floor(todo.estimated_time / 60)}時間
                          {todo.estimated_time % 60 > 0
                            ? `${todo.estimated_time % 60}分`
                            : ""}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  todo.estimated_time && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">所要時間:</span>
                      <span>
                        {Math.floor(todo.estimated_time / 60)}時間
                        {todo.estimated_time % 60 > 0
                          ? `${todo.estimated_time % 60}分`
                          : ""}
                      </span>
                    </div>
                  )
                )}
              </div>
            </li>
          ))}
          {todos.length === 0 && (
            <p className="text-center text-gray-500">タスクがありません</p>
          )}
        </ul>
      </main>
    </Frame>
  );
}
