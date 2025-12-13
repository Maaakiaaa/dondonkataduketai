"use client";

import { useEffect, useId, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { addTodo } from "@/features/todos/api";

export const AddTaskModal = ({ onClose }: { onClose: () => void }) => {
  // 入力ステート
  const [title, setTitle] = useState("");
  const [estimated, setEstimated] = useState(45);

  // ユニークID生成
  const taskTitleId = useId();
  const estimatedId = useId();

  // 日時モード
  const [dateMode, setDateMode] = useState<"start" | "due">("start");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [endTimeDisplay, setEndTimeDisplay] = useState("");

  // 初期値セット（次の00分）
  useEffect(() => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    const isoString = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setSelectedDate(isoString);
  }, []);

  // 終了時間計算
  useEffect(() => {
    if (!selectedDate || dateMode === "due") {
      setEndTimeDisplay("");
      return;
    }
    const start = new Date(selectedDate);
    const end = new Date(start.getTime() + estimated * 60000);
    setEndTimeDisplay(
      end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    );
  }, [selectedDate, estimated, dateMode]);

  const handleSave = async () => {
    if (!title) return alert("タスク名を入れてください");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("ログインしてください");

      await addTodo(
        title,
        user.id,
        estimated,
        dateMode === "start" ? new Date(selectedDate).toISOString() : undefined,
        dateMode === "due" ? new Date(selectedDate).toISOString() : undefined,
      );

      alert("保存しました！");
      onClose();
    } catch (e) {
      alert("エラー: " + (e as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl overflow-y-auto max-h-[90vh]">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-6">
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 font-bold"
          >
            キャンセル
          </button>
          <h2 className="font-bold text-lg">タスク追加</h2>
          <button
            type="button"
            onClick={handleSave}
            className="text-blue-600 font-bold"
          >
            保存する
          </button>
        </div>
        {/* タスク名 */}
        <div className="mb-6">
          <label
            htmlFor={taskTitleId}
            className="text-xs text-gray-400 font-bold block mb-1"
          >
            タスク名
          </label>
          <input
            id={taskTitleId}
            type="text"
            className="w-full text-xl font-bold placeholder-gray-300 outline-none border-b border-transparent focus:border-blue-500 transition"
            placeholder="例: プレゼン資料作成"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* 所要時間スライダー */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <label
              htmlFor={estimatedId}
              className="text-xs text-gray-400 font-bold"
            >
              ⏳ 所要時間 (見積もり)
            </label>
            <span className="text-xs text-gray-300">平均的な作業時間</span>
          </div>

          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <div className="text-center mb-4">
              <span className="text-4xl font-bold text-blue-600">
                {estimated}
              </span>
              <span className="text-sm text-gray-400 ml-1">分</span>
            </div>

            <input
              type="range"
              min="15"
              max="180"
              step="15"
              value={estimated}
              onChange={(e) => setEstimated(Number(e.target.value))}
              className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />

            <div className="flex justify-between mt-4 gap-2">
              {[15, 30, 60, 120].map((mins) => (
                <button
                  type="button"
                  key={mins}
                  onClick={() => setEstimated(mins)}
                  className="flex-1 py-1 rounded-md text-xs font-bold bg-gray-50 text-gray-600 hover:bg-gray-100 border"
                >
                  {mins >= 60 ? `${mins / 60}時間` : `${mins}分`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 日時設定 */}
        <div className="mb-4">
          <label
            htmlFor="dateMode"
            className="text-xs text-gray-400 font-bold block mb-2"
          >
            いつやりますか？
          </label>

          <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
            <button
              type="button"
              onClick={() => setDateMode("start")}
              className={`flex-1 py-2 rounded-md text-sm font-bold transition flex items-center justify-center gap-2
                ${dateMode === "start" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400"}`}
            >
              📅 日時を指定
            </button>
            <button
              type="button"
              onClick={() => setDateMode("due")}
              className={`flex-1 py-2 rounded-md text-sm font-bold transition flex items-center justify-center gap-2
                ${dateMode === "due" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400"}`}
            >
              ⏰ 期限を設定
            </button>
          </div>

          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-gray-600">
                {dateMode === "start" ? "開始日時" : "締め切り日時"}
              </span>
              <input
                type="datetime-local"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="font-mono text-lg font-bold bg-transparent outline-none text-right"
              />
            </div>

            {dateMode === "start" && endTimeDisplay && (
              <div className="flex justify-between items-center pt-2 border-t mt-2 text-blue-600">
                <span className="text-sm font-bold">終了日時 (自動計算)</span>
                <span className="text-lg font-bold">{endTimeDisplay}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
