"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import Frame from "../components/Frame";

function formatIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

type CalendarViewProps = {
  currentDate: string | null;
  onSelect: (iso: string) => void;
};

function CalendarView({ currentDate, onSelect }: CalendarViewProps) {
  const today = new Date();
  const initial = currentDate ? new Date(currentDate) : new Date();
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(initial));

  const first = startOfMonth(viewMonth);
  const startWeekday = first.getDay();

  // build array of 6 weeks x 7 days
  const days: { date: Date; inMonth: boolean }[] = [];
  // start from previous month's tail
  const startDate = new Date(first);
  startDate.setDate(first.getDate() - startWeekday);

  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    days.push({ date: d, inMonth: d.getMonth() === viewMonth.getMonth() });
  }

  const isoSelected = currentDate ?? null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-2 py-1 rounded border"
            onClick={() => setViewMonth((m) => addMonths(m, -1))}
          >
            ◀
          </button>
          <div className="text-sm font-medium">
            {viewMonth.getFullYear()} 年 {viewMonth.getMonth() + 1} 月
          </div>
          <button
            type="button"
            className="px-2 py-1 rounded border"
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
          >
            ▶
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-sm text-zinc-500"
            onClick={() => setViewMonth(startOfMonth(new Date()))}
          >
            今日に戻る
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-3 text-center text-base text-zinc-500 mb-2">
        <div>日</div>
        <div>月</div>
        <div>火</div>
        <div>水</div>
        <div>木</div>
        <div>金</div>
        <div>土</div>
      </div>

      <div className="grid grid-cols-7 gap-3">
        {days.map((dObj) => {
          const d = dObj.date;
          const iso = formatIso(d);
          const isToday = formatIso(today) === iso;
          const isSelected = isoSelected === iso;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              className={`py-4 rounded text-lg flex items-center justify-center ${
                dObj.inMonth ? "text-zinc-700" : "text-zinc-300"
              } ${isSelected ? "bg-black text-white" : ""} ${isToday && !isSelected ? "border border-sky-400" : ""}`}
            >
              <span className="select-none">{d.getDate()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function TodoPage() {
  const items = new Array(3)
    .fill(0)
    .map((_, i) => ({ id: i + 1, text: "タスク名" }));

  const [showCalendar, setShowCalendar] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const calRef = useRef<HTMLDivElement | null>(null);
  const calId = useId();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowCalendar(false);
    }
    function onClick(e: MouseEvent) {
      if (!calRef.current) return;
      if (showCalendar && !calRef.current.contains(e.target as Node)) {
        setShowCalendar(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [showCalendar]);

  return (
    <Frame active="todo">
      <div className="relative">
        {/* top toggle buttons */}
        <div className="flex gap-3 mb-4">
          <Link
            href="/todo/new"
            className="flex-1 rounded-full border px-4 py-2 text-sm text-center"
          >
            今日のTODO作成
          </Link>
          <button
            type="button"
            className="flex-1 rounded-full border px-4 py-2 text-sm"
            onClick={() => setShowCalendar((s) => !s)}
            aria-expanded={showCalendar}
            aria-controls={calId}
          >
            カレンダー
          </button>
        </div>

        {/* calendar popover */}
        {showCalendar && (
          <div
            ref={calRef}
            id={calId}
            className="absolute left-0 right-0 z-10 px-4 top-16"
          >
            <div className="mx-auto max-w-3xl w-[96%] bg-white rounded-md border shadow p-4 h-[85vh]">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">日付を選択</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-sm text-zinc-500"
                    onClick={() => setShowCalendar(false)}
                  >
                    閉じる
                  </button>
                </div>
              </div>

              <CalendarView
                currentDate={date}
                onSelect={(d) => {
                  setDate(d);
                }}
              />

              <div className="mt-3 text-sm text-zinc-600">
                選択中: {date ?? "未選択"}
              </div>
            </div>
          </div>
        )}

        {/* task list */}
        <ul className="space-y-4">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between rounded-md border p-4 bg-white"
            >
              <div className="flex items-center gap-4">
                <div className="text-xl font-semibold">{it.text}</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-md border px-3 py-1 text-sm"
                >
                  編集
                </button>
                <button
                  type="button"
                  className="rounded-md border px-3 py-1 text-sm"
                >
                  達成
                </button>
              </div>
            </li>
          ))}
        </ul>

        {/* floating add button */}
        <button
          type="button"
          aria-label="タスク追加"
          className="absolute right-4 bottom-4 w-12 h-12 rounded-full bg-white border shadow flex items-center justify-center text-xl"
        >
          +
        </button>
      </div>
    </Frame>
  );
}
