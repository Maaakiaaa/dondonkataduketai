"use client";

import { useState } from "react";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";
import type { Todo } from "@/features/todos/api";

type CalendarModalProps = {
  onClose: () => void;
  todos: Todo[];
  onDateSelect: (date: Date) => void;
};

export const CalendarModal = ({
  onClose,
  todos,
  onDateSelect,
}: CalendarModalProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // 月の日付を取得
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    return { daysInMonth, startDayOfWeek, year, month };
  };

  // 特定の日付のタスク数を取得
  const getTasksForDate = (date: Date): Todo[] => {
    return todos.filter((todo) => {
      if (todo.start_at) {
        const taskDate = new Date(todo.start_at);
        return (
          taskDate.getFullYear() === date.getFullYear() &&
          taskDate.getMonth() === date.getMonth() &&
          taskDate.getDate() === date.getDate()
        );
      }
      if (todo.due_at) {
        const dueDate = new Date(todo.due_at);
        return (
          dueDate.getFullYear() === date.getFullYear() &&
          dueDate.getMonth() === date.getMonth() &&
          dueDate.getDate() === date.getDate()
        );
      }
      return false;
    });
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
    );
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    setSelectedDate(clickedDate);
    onDateSelect(clickedDate);
    onClose();
  };

  const { daysInMonth, startDayOfWeek, year, month } =
    getDaysInMonth(currentMonth);

  // カレンダーグリッドを作成
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // 一意のキーを生成するためのインデックスマップ
  const getUniqueKey = (day: number | null, position: number): string => {
    if (day === null) {
      // 空要素の場合は年月と前月の日付を使う
      const prevMonthLastDay = new Date(year, month, 0).getDate();
      const prevDay = prevMonthLastDay - (startDayOfWeek - position - 1);
      return `prev-${year}-${month}-${prevDay}`;
    }
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  const isToday = (day: number | null) => {
    if (day === null) return false;
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  };

  const isSelected = (day: number | null) => {
    if (day === null) return false;
    return (
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth() === month &&
      selectedDate.getDate() === day
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="bg-white rounded-4xl w-full max-w-md p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
      >
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-black text-2xl tracking-wider">カレンダー</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FiX size={24} className="text-gray-700" />
          </button>
        </div>

        {/* 月の選択 */}
        <div className="flex items-center justify-between mb-6 bg-[#FFD700] p-3 rounded-xl border-2 border-black">
          <button
            type="button"
            onClick={handlePreviousMonth}
            className="p-1 hover:bg-black/10 rounded-full transition-colors"
          >
            <FiChevronLeft size={24} className="font-black" />
          </button>
          <span className="font-black text-lg">
            {year}年 {month + 1}月
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 hover:bg-black/10 rounded-full transition-colors"
          >
            <FiChevronRight size={24} className="font-black" />
          </button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["日", "月", "火", "水", "木", "金", "土"].map((day, index) => (
            <div
              key={day}
              className={`text-center font-black text-sm py-2 ${
                index === 0
                  ? "text-[#FF6B6B]"
                  : index === 6
                    ? "text-[#4ECDC4]"
                    : "text-gray-700"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* カレンダーグリッド */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return (
                <div key={getUniqueKey(day, index)} className="aspect-square" />
              );
            }

            const date = new Date(year, month, day);
            const tasksForDay = getTasksForDate(date);
            const hasScheduled = tasksForDay.some((t) => t.start_at);
            const hasDeadline = tasksForDay.some(
              (t) => t.due_at && !t.start_at,
            );

            // 吹き出しの位置を計算（行と列）
            const colIndex = index % 7; // 0-6
            const rowIndex = Math.floor(index / 7); // 行番号
            const totalRows = Math.ceil(calendarDays.length / 7);

            // 下半分の行なら上に表示、上半分なら下に表示
            const showAbove = rowIndex >= Math.floor(totalRows / 2);

            // 左右の位置調整
            let horizontalPosition = "left-1/2 -translate-x-1/2";
            if (colIndex === 0) {
              // 左端
              horizontalPosition = "left-0";
            } else if (colIndex === 6) {
              // 右端
              horizontalPosition = "right-0";
            }

            return (
              <div key={getUniqueKey(day, index)} className="relative">
                <button
                  type="button"
                  onClick={() => handleDateClick(day)}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={`aspect-square w-full flex flex-col items-center justify-center rounded-xl border-2 font-bold text-sm transition-all hover:-translate-y-0.5 relative ${
                    isToday(day)
                      ? "bg-[#FFD700] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      : isSelected(day)
                        ? "bg-[#4ECDC4] border-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        : "bg-white border-gray-300 hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  }`}
                >
                  <span className="mb-0.5">{day}</span>
                  {/* タスクインジケーター */}
                  {tasksForDay.length > 0 && (
                    <div className="flex gap-0.5">
                      {hasScheduled && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#4ECDC4] border border-black"></div>
                      )}
                      {hasDeadline && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B6B] border border-black"></div>
                      )}
                    </div>
                  )}
                  {/* タスク数表示 */}
                  {tasksForDay.length > 0 && (
                    <span className="absolute bottom-0 right-0 text-[10px] font-black px-1 bg-black text-white rounded-tl-md rounded-br-lg">
                      {tasksForDay.length}
                    </span>
                  )}
                </button>

                {/* ホバー時の吹き出し */}
                {hoveredDay === day && tasksForDay.length > 0 && (
                  <div
                    className={`absolute z-10 w-48 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 pointer-events-none ${
                      showAbove
                        ? `bottom-full mb-2 ${horizontalPosition}`
                        : `top-full mt-2 ${horizontalPosition}`
                    }`}
                  >
                    {/* 吹き出しの三角形 */}
                    {showAbove ? (
                      <div
                        className={`absolute -bottom-2 w-4 h-4 bg-white border-r-2 border-b-2 border-black rotate-45 ${
                          colIndex === 0
                            ? "left-4"
                            : colIndex === 6
                              ? "right-4"
                              : "left-1/2 -translate-x-1/2"
                        }`}
                      />
                    ) : (
                      <div
                        className={`absolute -top-2 w-4 h-4 bg-white border-l-2 border-t-2 border-black rotate-45 ${
                          colIndex === 0
                            ? "left-4"
                            : colIndex === 6
                              ? "right-4"
                              : "left-1/2 -translate-x-1/2"
                        }`}
                      />
                    )}
                    <div className="relative space-y-1.5">
                      {tasksForDay.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          className="text-xs font-bold truncate flex items-center gap-1.5"
                        >
                          <div
                            className={`w-2 h-2 rounded-full border border-black flex-shrink-0 ${
                              task.start_at ? "bg-[#4ECDC4]" : "bg-[#FF6B6B]"
                            }`}
                          />
                          <span className="truncate">{task.title}</span>
                        </div>
                      ))}
                      {tasksForDay.length > 3 && (
                        <div className="text-[10px] font-bold text-gray-500 text-center pt-1 border-t border-gray-200">
                          他 {tasksForDay.length - 3}件
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 凡例 */}
        <div className="mt-6 p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
          <div className="flex flex-col gap-2 text-xs font-bold">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#4ECDC4] border-2 border-black"></div>
              <span>スケジュール済みタスク</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FF6B6B] border-2 border-black"></div>
              <span>期限付きタスク</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-lg bg-[#FFD700] border-2 border-black"></div>
              <span>今日</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
