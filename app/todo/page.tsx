"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiChevronUp,
} from "react-icons/fi";
import { supabase } from "@/app/lib/supabase";
import {
  getTodos,
  type Todo,
  toggleTodoCompletion,
  updateTodo,
} from "@/features/todos/api";
import Frame from "../components/Frame";

// 空き時間スロットの型定義
type GapSlot = {
  id: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
};

// ドラッグ可能な未配置タスクコンポーネント
function DraggableTask({
  todo,
  isUrgent,
  onEdit,
  onToggle,
}: {
  todo: Todo;
  isUrgent: boolean;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: todo.id,
    data: { todo },
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative border-2 border-black rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all ${
        isDragging ? "opacity-30 border-dashed" : "hover:-translate-y-0.5"
      } ${isUrgent ? "bg-[#FF6B6B] text-white" : "bg-white text-black"}`}
    >
      <div className="flex items-start gap-3">
        {/* ドラッグハンドル */}
        <div
          {...attributes}
          {...listeners}
          className={`flex-shrink-0 cursor-grab active:cursor-grabbing p-1 rounded ${
            isUrgent ? "hover:bg-white/20" : "hover:bg-gray-100"
          }`}
        >
          <svg
            className={`w-4 h-4 ${isUrgent ? "text-white/70" : "text-gray-400"}`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <title>ドラッグして移動</title>
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
        </div>

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
            onClick={onEdit}
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
            onClick={onToggle}
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
}

// ドロップ可能な空き時間スロットコンポーネント
function DroppableGapSlot({
  gap,
  isExpanded,
  onToggle,
}: {
  gap: GapSlot;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: gap.id,
    data: { gap },
  });

  const formatTime = (date: Date) =>
    `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}時間${mins}分`;
    if (hours > 0) return `${hours}時間`;
    return `${mins}分`;
  };

  return (
    <div className="relative">
      {/* 折りたたみ時の表示 */}
      <button
        type="button"
        onClick={onToggle}
        className={`w-full py-2 px-3 flex items-center justify-center gap-2 text-xs font-bold transition-all ${
          isExpanded
            ? "bg-[#4ECDC4]/20 border-2 border-[#4ECDC4] rounded-t-lg border-b-0"
            : "bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-200"
        }`}
      >
        <span className="text-gray-500">
          {formatTime(gap.startTime)} ~ {formatTime(gap.endTime)}
        </span>
        <span className="text-[#4ECDC4] font-black">
          空き {formatDuration(gap.durationMinutes)}
        </span>
        {isExpanded ? (
          <FiChevronUp className="text-gray-500" />
        ) : (
          <FiChevronDown className="text-gray-500" />
        )}
      </button>

      {/* 展開時のドロップゾーン */}
      {isExpanded && (
        <div
          ref={setNodeRef}
          className={`p-4 border-2 border-t-0 border-[#4ECDC4] rounded-b-lg transition-all ${
            isOver ? "bg-[#4ECDC4]/30" : "bg-[#4ECDC4]/10"
          }`}
        >
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
              isOver
                ? "border-[#4ECDC4] bg-[#4ECDC4]/20"
                : "border-gray-300 bg-white/50"
            }`}
          >
            <p className="text-sm font-bold text-gray-500">
              {isOver ? "ここにドロップ！" : "タスクをここにドラッグ"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {formatTime(gap.startTime)} から開始
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ドラッグ中のオーバーレイ表示用コンポーネント
function TaskDragOverlay({
  todo,
  width,
}: {
  todo: Todo;
  width?: number | null;
}) {
  const isUrgent =
    todo.due_at && new Date(todo.due_at) < new Date(Date.now() + 86400000);

  return (
    <div
      style={width ? { width } : undefined}
      className={`border-2 border-black rounded-xl p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
        isUrgent ? "bg-[#FF6B6B] text-white" : "bg-white text-black"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* ドラッグハンドル（装飾用） */}
        <div
          className={`flex-shrink-0 p-1 rounded ${
            isUrgent ? "bg-white/20" : "bg-gray-100"
          }`}
        >
          <svg
            className={`w-4 h-4 ${isUrgent ? "text-white/70" : "text-gray-400"}`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <title>ドラッグ中</title>
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-black text-base leading-tight mb-1 truncate">
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
      </div>
    </div>
  );
}

export default function TodoPage() {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set());
  const [activeDragTodo, setActiveDragTodo] = useState<Todo | null>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);

  // D&Dセンサー設定（タッチとポインター両対応）
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

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

  // スケジュールタスクを時刻順にソート
  const sortedScheduledTodos = [...scheduledTodos].sort(
    (a, b) => new Date(a.start_at!).getTime() - new Date(b.start_at!).getTime(),
  );

  // 空き時間スロットを計算（8時〜22時の範囲）
  const calculateGapSlots = (): GapSlot[] => {
    const dayStart = new Date(selectedDate);
    dayStart.setHours(8, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(22, 0, 0, 0);

    const gaps: GapSlot[] = [];
    let currentTime = dayStart;

    for (const todo of sortedScheduledTodos) {
      const todoStart = new Date(todo.start_at!);
      const todoEnd = new Date(
        todoStart.getTime() + (todo.estimated_time || 30) * 60000,
      );

      // タスク開始前に空き時間があれば追加
      if (todoStart > currentTime) {
        const durationMinutes = Math.floor(
          (todoStart.getTime() - currentTime.getTime()) / 60000,
        );
        if (durationMinutes >= 15) {
          // 15分以上の空きのみ表示
          gaps.push({
            id: `gap-${currentTime.getTime()}`,
            startTime: new Date(currentTime),
            endTime: todoStart,
            durationMinutes,
          });
        }
      }
      currentTime = todoEnd > currentTime ? todoEnd : currentTime;
    }

    // 最後のタスク後の空き時間
    if (currentTime < dayEnd) {
      const durationMinutes = Math.floor(
        (dayEnd.getTime() - currentTime.getTime()) / 60000,
      );
      if (durationMinutes >= 15) {
        gaps.push({
          id: `gap-${currentTime.getTime()}`,
          startTime: new Date(currentTime),
          endTime: dayEnd,
          durationMinutes,
        });
      }
    }

    return gaps;
  };

  const gapSlots = calculateGapSlots();

  // スケジュールとギャップを時系列で結合
  type ScheduleItem =
    | { type: "todo"; data: Todo }
    | { type: "gap"; data: GapSlot };

  const buildTimelineItems = (): ScheduleItem[] => {
    const items: ScheduleItem[] = [];
    let gapIndex = 0;

    for (const todo of sortedScheduledTodos) {
      const todoStart = new Date(todo.start_at!);

      // このタスクより前のギャップを追加
      while (
        gapIndex < gapSlots.length &&
        gapSlots[gapIndex].endTime <= todoStart
      ) {
        items.push({ type: "gap", data: gapSlots[gapIndex] });
        gapIndex++;
      }

      items.push({ type: "todo", data: todo });
    }

    // 残りのギャップを追加
    while (gapIndex < gapSlots.length) {
      items.push({ type: "gap", data: gapSlots[gapIndex] });
      gapIndex++;
    }

    return items;
  };

  const timelineItems = buildTimelineItems();

  // D&Dハンドラー
  const handleDragStart = (event: DragStartEvent) => {
    const todo = event.active.data.current?.todo as Todo | undefined;
    if (todo) {
      setActiveDragTodo(todo);
      // ドラッグ開始時の要素の幅を取得
      const rect = event.active.rect.current.initial;
      if (rect) {
        setDragWidth(rect.width);
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragTodo(null);
    setDragWidth(null);

    const { active, over } = event;
    if (!over) return;

    const todo = active.data.current?.todo as Todo | undefined;
    const gap = over.data.current?.gap as GapSlot | undefined;

    if (!todo || !gap) return;

    // 楽観的UI更新
    const newStartAt = gap.startTime.toISOString();
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, start_at: newStartAt } : t)),
    );

    // 展開状態をリセット
    setExpandedSlots(new Set());

    try {
      await updateTodo(todo.id, { start_at: newStartAt });
    } catch (e) {
      // エラー時はロールバック
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, start_at: null } : t)),
      );
      alert("スケジュール配置に失敗しました");
    }
  };

  const toggleSlotExpansion = (slotId: string) => {
    setExpandedSlots((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(slotId)) {
        newSet.delete(slotId);
      } else {
        newSet.add(slotId);
      }
      return newSet;
    });
  };

  // タスクを未配置に戻す（task_type=deadlineのタスクのみ）
  const handleUnschedule = async (todo: Todo) => {
    if (todo.task_type === "scheduled") {
      alert("開始時間付きタスクは未配置に戻せません");
      return;
    }

    // 楽観的UI更新
    const previousStartAt = todo.start_at;
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, start_at: null } : t)),
    );

    try {
      await updateTodo(todo.id, { start_at: null });
    } catch (e) {
      // エラー時はロールバック
      setTodos((prev) =>
        prev.map((t) =>
          t.id === todo.id ? { ...t, start_at: previousStartAt } : t,
        ),
      );
      alert("未配置への変更に失敗しました");
    }
  };

  // Get date string for display
  const dateStr = `${selectedDate.getMonth() + 1}/${selectedDate.getDate()}(${["日", "月", "火", "水", "木", "金", "土"][selectedDate.getDay()]})`;

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
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
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

          {/* Timeline with Scheduled Tasks and Gap Slots */}
          {timelineItems.length > 0 ? (
            <div className="space-y-2 mb-6">
              {timelineItems.map((item) => {
                if (item.type === "gap") {
                  return (
                    <DroppableGapSlot
                      key={item.data.id}
                      gap={item.data}
                      isExpanded={expandedSlots.has(item.data.id)}
                      onToggle={() => toggleSlotExpansion(item.data.id)}
                    />
                  );
                }

                const todo = item.data;
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
                        {/* 未配置に戻すボタン（deadline タスクのみ） */}
                        {todo.task_type === "deadline" && (
                          <button
                            type="button"
                            onClick={() => handleUnschedule(todo)}
                            className="px-2 py-1 text-[10px] font-bold border border-gray-400 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
                            title="未配置に戻す"
                          >
                            解除
                          </button>
                        )}
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
              {/* 空の日でも最初のギャップスロットを表示 */}
              {gapSlots.length > 0 && (
                <div className="mt-4">
                  <DroppableGapSlot
                    gap={gapSlots[0]}
                    isExpanded={expandedSlots.has(gapSlots[0].id)}
                    onToggle={() => toggleSlotExpansion(gapSlots[0].id)}
                  />
                </div>
              )}
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
                  <DraggableTask
                    key={todo.id}
                    todo={todo}
                    isUrgent={!!isUrgent}
                    onEdit={() =>
                      router.push(`/todo/task-modal?id=${todo.id}&open=1`)
                    }
                    onToggle={() => handleToggle(todo.id, false)}
                  />
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
        {/* Drag Overlay */}
        <DragOverlay>
          {activeDragTodo && (
            <TaskDragOverlay todo={activeDragTodo} width={dragWidth} />
          )}
        </DragOverlay>
      </DndContext>{" "}
    </Frame>
  );
}
