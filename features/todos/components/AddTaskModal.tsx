"use client";

import { useEffect, useId, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import {
  addTodo,
  getOverlappingTodos,
  type RecurrenceType,
  type Todo,
} from "@/features/todos/api";
import { BookingWarningDialog } from "./BookingWarningDialog";

export const AddTaskModal = ({ onClose }: { onClose: () => void }) => {
  // 入力ステート
  const [title, setTitle] = useState("");
  const [estimated, setEstimated] = useState(45);

  // ユニークID生成
  const taskTitleId = useId();
  const estimatedId = useId();
  const recurrenceId = useId();

  // 日時モード
  const [dateMode, setDateMode] = useState<"start" | "due">("start");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [endTimeDisplay, setEndTimeDisplay] = useState("");

  // 繰り返し設定のステート
  const [recurrence, setRecurrence] = useState<RecurrenceType>(null);

  // 重複警告ダイアログ用のステート
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [overlappingTodos, setOverlappingTodos] = useState<Todo[]>([]);

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

      // 開始日時モードの場合、重複チェックを実行
      if (dateMode === "start" && selectedDate) {
        const startAt = new Date(selectedDate);
        const overlapping = await getOverlappingTodos(
          user.id,
          startAt,
          estimated,
        );

        // 重複がある場合は警告ダイアログを表示
        if (overlapping.length > 0) {
          setOverlappingTodos(overlapping);
          setShowWarningDialog(true);
          return;
        }
      }

      // 重複がない場合、または期限モードの場合は直接保存
      await saveTask();
    } catch (e) {
      alert("エラー: " + (e as Error).message);
    }
  };

  // 実際の保存処理
  const saveTask = async () => {
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
        recurrence,
        dateMode === "start" ? "scheduled" : "deadline",
      );

      alert("保存しました！");
      onClose();
    } catch (e) {
      alert("エラー: " + (e as Error).message);
      setShowWarningDialog(false);
    }
  };

  // 警告ダイアログから「このまま保存する」を選択
  const handleConfirmSave = () => {
    saveTask();
  };

  // 警告ダイアログから「時間を変更する」を選択
  const handleChangeTime = () => {
    setShowWarningDialog(false);
    setOverlappingTodos([]);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black overflow-y-auto max-h-[90vh] relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* 装飾的な背景要素 */}
        <div className="absolute top-0 left-0 w-full h-4 bg-[#FFD700] border-b-4 border-black" />

        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-8 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 font-black hover:text-black transition-colors"
          >
            キャンセル
          </button>
          <h2 className="font-black text-2xl tracking-wider">タスク追加</h2>
          <button
            type="button"
            onClick={handleSave}
            className="bg-[#4ECDC4] text-white font-black px-4 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
          >
            保存
          </button>
        </div>

        {/* タスク名 */}
        <div className="mb-6">
          <label
            htmlFor={taskTitleId}
            className="text-sm font-black block mb-2 flex items-center gap-2"
          >
            <span className="w-3 h-3 bg-[#FF6B6B] rounded-full border border-black"></span>
            タスク名
          </label>
          <input
            id={taskTitleId}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 部屋の掃除"
            className="w-full text-xl font-bold border-2 border-black rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-black transition-all placeholder-gray-300"
          />
        </div>

        {/* 所要時間 */}
        <div className="mb-6">
          <label
            htmlFor={estimatedId}
            className="text-sm font-black block mb-2 flex items-center gap-2"
          >
            <span className="w-3 h-3 bg-[#FFE66D] rounded-full border border-black"></span>
            所要時間（分）
          </label>
          <div className="flex items-center gap-4">
            <input
              id={estimatedId}
              type="range"
              min="5"
              max="180"
              step="5"
              value={estimated}
              onChange={(e) => setEstimated(Number(e.target.value))}
              className="flex-1 h-4 bg-gray-200 rounded-full appearance-none border-2 border-black [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-[#FF9F1C] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-black [&::-webkit-slider-thumb]:cursor-pointer"
              aria-valuemin={5}
              aria-valuemax={180}
              aria-valuenow={estimated}
              aria-valuetext={`${estimated}分`}
            />
            <span className="text-xl font-black w-20 text-right">
              {estimated}分
            </span>
          </div>
          <div className="flex justify-between text-xs font-bold text-gray-400 mt-1 px-1">
            <span>5分</span>
            <span>3時間</span>
          </div>
        </div>

        {/* 日時設定 */}
        <div className="mb-6 bg-[#F0F4F8] p-4 rounded-xl border-2 border-black">
          <div className="flex gap-2 mb-4 bg-white p-1 rounded-lg border-2 border-black">
            <button
              type="button"
              onClick={() => setDateMode("start")}
              className={`flex-1 py-2 rounded-md font-black text-sm transition-all ${
                dateMode === "start"
                  ? "bg-[#FF6B6B] text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  : "text-gray-400 hover:bg-gray-100"
              }`}
              aria-pressed={dateMode === "start"}
            >
              開始日時
            </button>
            <button
              type="button"
              onClick={() => setDateMode("due")}
              className={`flex-1 py-2 rounded-md font-black text-sm transition-all ${
                dateMode === "due"
                  ? "bg-[#4ECDC4] text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  : "text-gray-400 hover:bg-gray-100"
              }`}
              aria-pressed={dateMode === "due"}
            >
              期限日時
            </button>
          </div>

          <input
            type="datetime-local"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-3 rounded-xl border-2 border-black font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
          />

          {dateMode === "start" && endTimeDisplay && (
            <div className="mt-3 text-center font-bold text-gray-600 bg-white py-2 px-4 rounded-lg border-2 border-black border-dashed">
              終了予定:{" "}
              <span className="text-[#FF6B6B] text-lg">{endTimeDisplay}</span>
            </div>
          )}
        </div>

        {/* 繰り返し設定 */}
        <div className="mb-8">
          <label
            htmlFor={recurrenceId}
            className="text-sm font-black block mb-2 flex items-center gap-2"
          >
            <span className="w-3 h-3 bg-[#A8DADC] rounded-full border border-black"></span>
            繰り返し設定
          </label>
          <div className="bg-[#F0F4F8] p-4 rounded-xl border-2 border-black">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRecurrence(null)}
                className={`py-3 px-4 rounded-lg font-black text-sm transition-all ${
                  recurrence === null
                    ? "bg-white text-black border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    : "bg-white/50 text-gray-500 border-2 border-gray-300 hover:bg-white/80"
                }`}
                aria-pressed={recurrence === null}
              >
                なし
              </button>
              <button
                type="button"
                onClick={() => setRecurrence("daily")}
                className={`py-3 px-4 rounded-lg font-black text-sm transition-all ${
                  recurrence === "daily"
                    ? "bg-[#FF6B6B] text-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    : "bg-white/50 text-gray-500 border-2 border-gray-300 hover:bg-white/80"
                }`}
                aria-pressed={recurrence === "daily"}
              >
                毎日 🔄
              </button>
              <button
                type="button"
                onClick={() => setRecurrence("weekly")}
                className={`py-3 px-4 rounded-lg font-black text-sm transition-all ${
                  recurrence === "weekly"
                    ? "bg-[#4ECDC4] text-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    : "bg-white/50 text-gray-500 border-2 border-gray-300 hover:bg-white/80"
                }`}
                aria-pressed={recurrence === "weekly"}
              >
                毎週 📅
              </button>
              <button
                type="button"
                onClick={() => setRecurrence("monthly")}
                className={`py-3 px-4 rounded-lg font-black text-sm transition-all ${
                  recurrence === "monthly"
                    ? "bg-[#FFE66D] text-black border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    : "bg-white/50 text-gray-500 border-2 border-gray-300 hover:bg-white/80"
                }`}
                aria-pressed={recurrence === "monthly"}
              >
                毎月 🗓️
              </button>
            </div>
          </div>
          {recurrence && (
            <p className="text-xs text-[#4ECDC4] mt-2 font-bold bg-[#4ECDC4]/10 p-2 rounded-lg border-2 border-[#4ECDC4] border-dashed">
              ※ タスクを完了すると、自動で次の
              {recurrence === "daily"
                ? "日"
                : recurrence === "weekly"
                  ? "週"
                  : "月"}
              にタスクが作られます
            </p>
          )}
        </div>
      </div>

      {/* 重複警告ダイアログ */}
      {showWarningDialog && overlappingTodos.length > 0 && (
        <BookingWarningDialog
          overlappingTodos={overlappingTodos}
          onConfirmSave={handleConfirmSave}
          onChangeTime={handleChangeTime}
        />
      )}
    </div>
  );
};
