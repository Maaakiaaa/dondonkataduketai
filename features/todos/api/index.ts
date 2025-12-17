import { supabase } from "@/app/lib/supabase";
import type { Database } from "@/app/types/database.types";

// 型定義のエイリアス
export type Todo = Database["public"]["Tables"]["todos"]["Row"];
type NewTodo = Database["public"]["Tables"]["todos"]["Insert"];
export type RecurrenceType = "daily" | "weekly" | "monthly" | null;
export type TaskType = "scheduled" | "deadline";

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
    case "monthly": {
      // 月末のエッジケースを処理（例: 1/31 → 2/28 or 2/29）
      const originalDay = date.getDate();
      date.setMonth(date.getMonth() + 1);
      // 月がオーバーフローした場合（例: 1/31 + 1ヶ月 → 3/3）、前月の最終日に調整
      if (date.getDate() !== originalDay) {
        date.setDate(0); // 前月の最終日に設定
      }
      break;
    }
  }
  return date.toISOString();
};

export const getTodos = async () => {
  // 現在のユーザーを取得
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not authenticated");

  // 自分のタスクのみを取得
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .eq("user_id", user.id)
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
  taskType?: TaskType,
  tags?: string[],
) => {
  const newTodo: NewTodo = {
    title,
    user_id: userId,
    estimated_time: estimated,
    is_completed: false,
    start_at: startAt ?? null,
    due_at: dueAt ?? null,
    recurrence_type: recurrenceType ?? null,
    task_type: taskType ?? "deadline",
    tags: tags ?? null,
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

  // 完了時に履歴を記録
  if (isCompleted && updatedTodo) {
    const now = new Date();
    const completedHour = now.getHours();
    const wasOverdue = updatedTodo.due_at
      ? new Date(updatedTodo.due_at) < now
      : false;

    await supabase.from("task_completion_history").insert({
      user_id: updatedTodo.user_id,
      task_id: updatedTodo.id,
      task_title: updatedTodo.title,
      task_type: updatedTodo.task_type,
      tags: updatedTodo.tags,
      estimated_time: updatedTodo.estimated_time,
      completed_at: now.toISOString(),
      completed_hour: completedHour,
      was_overdue: wasOverdue,
    });
  }

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
          console.warn(
            `[繰り返しタスク] 重複検出のためスキップ: タイトル="${updatedTodo.title}", 予定日=${newTask.due_at}`,
          );
        }
      }
    }
  }

  return updatedTodo as Todo;
};
// タスクを削除する
export const deleteTodo = async (id: string) => {
  const { error } = await supabase.from("todos").delete().eq("id", id);

  if (error) throw new Error(error.message);
};
// タスクを更新する（汎用）
export const updateTodo = async (
  id: string,
  updates: Partial<Omit<Todo, "id" | "user_id" | "created_at">>,
) => {
  const { data, error } = await supabase
    .from("todos")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Todo;
};

// 指定した時間帯に重複するタスクを取得する
export const getOverlappingTodos = async (
  userId: string,
  startAt: Date,
  estimatedMinutes: number,
  excludeId?: string,
): Promise<Todo[]> => {
  // 新規タスクの終了時刻を計算
  const newEndAt = new Date(startAt.getTime() + estimatedMinutes * 60000);

  // start_atが設定されている未完了タスクを取得
  let query = supabase
    .from("todos")
    .select("*")
    .eq("user_id", userId)
    .eq("is_completed", false)
    .not("start_at", "is", null);

  // excludeIdがある場合はDBクエリで除外（効率化）
  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (!data) return [];

  // クライアントサイドで時間帯の重複を判定
  const overlapping = data.filter((todo) => {
    // start_atがnullの場合はスキップ（クエリで除外済みだが型安全のため）
    if (!todo.start_at) return false;

    const existingStart = new Date(todo.start_at);
    const existingEnd = new Date(
      existingStart.getTime() + (todo.estimated_time || 0) * 60000,
    );

    // 重複条件: 新規タスクの開始 < 既存タスクの終了 AND 新規タスクの終了 > 既存タスクの開始
    return startAt < existingEnd && newEndAt > existingStart;
  });

  return overlapping;
};
