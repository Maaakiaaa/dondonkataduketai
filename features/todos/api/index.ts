import { supabase } from "@/app/lib/supabase";
import type { Database } from "@/app/types/database.types";

// 型定義のエイリアス
export type Todo = Database["public"]["Tables"]["todos"]["Row"];
type NewTodo = Database["public"]["Tables"]["todos"]["Insert"];
export type RecurrenceType = "daily" | "weekly" | "monthly" | null;

// 日付計算用のヘルパー関数
const calculateNextDate = (
  baseDate: string,
  type: RecurrenceType,
): string | null => {
  if (!baseDate || !type) return null;
  const date = new Date(baseDate);

  switch (type) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
  }
  return date.toISOString();
};

export const getTodos = async () => {
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Todo[];
};

// タスクを追加する
export const addTodo = async (
  title: string,
  userId: string,
  estimated: number,
  startAt: string | undefined,
  dueAt?: string | undefined,
  recurrenceType?: RecurrenceType,
) => {
  const newTodo: NewTodo = {
    title,
    user_id: userId,
    estimated_time: estimated,
    is_completed: false,
    start_at: startAt ?? null,
    due_at: dueAt ?? null,
    recurrence_type: recurrenceType ?? null,
  };

  const { data, error } = await supabase
    .from("todos")
    .insert(newTodo)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Todo;
};

// タスクの状態を更新する
export const toggleTodoCompletion = async (
  id: string,
  isCompleted: boolean,
) => {
  // 1. ステータス更新
  const { data: updatedTodo, error } = await supabase
    .from("todos")
    .update({ is_completed: isCompleted })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // 2. 繰り返し処理（完了時のみ）
  if (isCompleted && updatedTodo.recurrence_type) {
    const baseDate = updatedTodo.start_at || updatedTodo.due_at;
    const nextDate = baseDate
      ? calculateNextDate(
          baseDate,
          updatedTodo.recurrence_type as RecurrenceType,
        )
      : null;

    if (nextDate) {
      // 次のタスクを作成（due_atはDBトリガーで自動計算される）
      const { data: newTask } = await supabase
        .from("todos")
        .insert({
          title: updatedTodo.title,
          user_id: updatedTodo.user_id,
          estimated_time: updatedTodo.estimated_time,
          recurrence_type: updatedTodo.recurrence_type,
          is_completed: false,
          start_at: updatedTodo.start_at ? nextDate : null,
          due_at: updatedTodo.start_at ? null : nextDate,
        })
        .select()
        .single();

      // 作成されたタスクのdue_atで重複チェック
      if (newTask?.due_at) {
        const { data: existingTasks } = await supabase
          .from("todos")
          .select("id")
          .eq("user_id", updatedTodo.user_id)
          .eq("title", updatedTodo.title)
          .eq("due_at", newTask.due_at)
          .neq("id", newTask.id) // 今作成したタスク自身は除外
          .limit(1);

        // 重複がある場合は作成したタスクを削除
        if (existingTasks && existingTasks.length > 0) {
          await supabase.from("todos").delete().eq("id", newTask.id);
          console.log("次のタスクは既に作られているのでスキップしました");
        }
      }
    }
  }

  return updatedTodo as Todo;
};
