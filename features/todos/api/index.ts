import { supabase } from "@/app/lib/supabase";
import type { Database } from "@/app/types/database.supabase";

// 型定義のエイリアス（長いので短縮名をつける）
// UI側で「Todoの型」を使いたい時に便利
export type Todo = Database["public"]["Tables"]["todos"]["Row"];
export type NewTodo = Database["public"]["Tables"]["todos"]["Insert"];

// タスク一覧を取得する
export const getTodos = async () => {
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .order("created_at", { ascending: false }); // 新しい順

  if (error) {
    // UI側でエラーハンドリングしやすいようにエラーを投げる
    throw new Error(error.message);
  }

  return data as Todo[];
};

// タスクを追加する
export const addTodo = async (title: string, userId: string) => {
  // DBに入れるデータ
  const newTodo: NewTodo = {
    title,
    user_id: userId,
    estimated_time: 60, // デフォルト値（後でUIで変えられるように）
  };

  const { data, error } = await supabase
    .from("todos")
    .insert(newTodo)
    .select() // 追加した直後のデータを返してもらう
    .single(); // 配列ではなく1個のオブジェクトとして取得

  if (error) throw new Error(error.message);
  return data as Todo;
};

// タスクの状態を更新する（完了/未完了）
export const toggleTodoCompletion = async (
  id: string,
  isCompleted: boolean,
) => {
  const { data, error } = await supabase
    .from("todos")
    .update({ is_completed: isCompleted })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Todo;
};

// タスクを削除する
export const deleteTodo = async (id: string) => {
  const { error } = await supabase.from("todos").delete().eq("id", id);

  if (error) throw new Error(error.message);
};
