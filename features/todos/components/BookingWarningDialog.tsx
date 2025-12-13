"use client";

import { useId } from "react";
import type { Todo } from "@/features/todos/api";

type BookingWarningDialogProps = {
  overlappingTodos: Todo[];
  onConfirmSave: () => void;
  onChangeTime: () => void;
};

// 時刻をフォーマットする関数
const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// タスクの時間帯を「HH:MM - HH:MM」形式で表示
const formatTaskTimeRange = (todo: Todo): string => {
  if (!todo.start_at) return "";
  const start = new Date(todo.start_at);
  const end = new Date(start.getTime() + (todo.estimated_time || 0) * 60000);
  return `${formatTime(start)} - ${formatTime(end)}`;
};

export const BookingWarningDialog = ({
  overlappingTodos,
  onConfirmSave,
  onChangeTime,
}: BookingWarningDialogProps) => {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black relative overflow-hidden">
        {/* 警告の赤ヘッダー */}
        <div className="absolute top-0 left-0 w-full h-4 bg-[#FF6B6B] border-b-4 border-black" />

        {/* 警告アイコン */}
        <div className="flex justify-center mt-4 mb-4">
          <div className="w-16 h-16 bg-[#FFE66D] rounded-full border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-3xl leading-none flex items-center justify-center">
              ⚠️
            </span>
          </div>
        </div>

        {/* タイトル */}
        <h3
          id={titleId}
          className="text-xl font-black text-center mb-2 text-black"
        >
          時間が重複しています！
        </h3>

        {/* 説明 */}
        <p
          id={descriptionId}
          className="text-gray-600 text-center font-bold mb-4 text-sm"
        >
          以下のタスクと時間帯が重なっています
        </p>

        {/* 重複タスク一覧 */}
        <div className="bg-[#FFF5F5] border-2 border-[#FF6B6B] rounded-xl p-3 mb-6 max-h-40 overflow-y-auto">
          {overlappingTodos.map((todo) => (
            <div
              key={todo.id}
              className="py-2 border-b border-[#FF6B6B]/30 last:border-b-0"
            >
              <p className="font-black text-black truncate">{todo.title}</p>
              <p className="text-sm text-[#FF6B6B] font-bold">
                🕐 {formatTaskTimeRange(todo)}
              </p>
            </div>
          ))}
        </div>

        {/* ボタン */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onChangeTime}
            className="w-full bg-[#4ECDC4] text-white font-black py-3 px-6 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
          >
            時間を変更する
          </button>
          <button
            type="button"
            onClick={onConfirmSave}
            className="w-full bg-white text-gray-600 font-black py-3 px-6 rounded-xl border-2 border-gray-300 hover:bg-gray-50 transition-all"
          >
            このまま保存する
          </button>
        </div>
      </div>
    </div>
  );
};
