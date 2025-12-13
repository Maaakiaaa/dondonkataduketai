"use client";

import Link from "next/link";
import { useId, useState } from "react";
import Frame from "../../components/Frame";

export default function TodoCreatePage() {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>(["仕事", "課題", "タスク"]);
  const [newTag, setNewTag] = useState("");
  const [minutes, setMinutes] = useState(45);
  const [deadlineMode, setDeadlineMode] = useState<"date" | "period">("period");
  const [deadline, setDeadline] = useState("");
  const uid = useId();
  const titleId = `${uid}-title`;
  const todayId = `${uid}-today`;
  const tomorrowId = `${uid}-tomorrow`;

  const addTag = () => {
    const t = newTag.trim();
    if (!t) return;
    if (!tags.includes(t)) setTags((s) => [...s, t]);
    setNewTag("");
  };

  return (
    <Frame active="todo">
      <div className="flex flex-col gap-4">
        {/* header within page */}
        <div className="flex items-center justify-between border-b pb-2">
          <Link href="/todo" className="text-sm px-2">
            キャンセル
          </Link>
          <div className="text-sm font-medium">タスク追加</div>
          <button type="button" className="text-sm px-2">
            保存する
          </button>
        </div>

        <div>
          <label htmlFor={titleId} className="text-sm text-zinc-600">
            タスク名
          </label>
          <input
            id={titleId}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：テスト勉強"
            className="mt-2 w-full text-2xl placeholder:text-zinc-400 rounded-md border px-3 py-4"
          />
        </div>

        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full"
                onClick={() => setTags((s) => s.filter((x) => x !== t))}
                title="クリックで削除"
              >
                {t}
              </button>
            ))}
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTag()}
              placeholder="＋"
              className="text-xs border rounded-full px-2 py-1 w-12"
            />
            <button type="button" onClick={addTag} className="text-sm px-2">
              ＋
            </button>
          </div>
        </div>

        <div>
          <div className="text-sm text-zinc-600">所要時間(見積もり)</div>
          <div className="mt-2 p-3 border rounded-md">
            <div className="text-xl font-semibold">{minutes} 分</div>
            <input
              type="range"
              min={5}
              max={240}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="w-full mt-3"
            />
            <div className="mt-3 flex gap-3">
              {[15, 30, 60, 120].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`rounded-full border px-3 py-1 text-sm ${minutes === m ? "bg-black text-white" : "bg-white"}`}
                  onClick={() => setMinutes(m)}
                >
                  {m === 60 ? "1時間" : `${m}分`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm text-zinc-600 mb-2">いつやりますか？</div>
          <div className="border rounded-md p-3">
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                className={`flex-1 rounded-md px-3 py-2 ${deadlineMode === "date" ? "bg-black text-white" : "bg-white"}`}
                onClick={() => setDeadlineMode("date")}
              >
                日時を指定
              </button>
              <button
                type="button"
                className={`flex-1 rounded-md px-3 py-2 ${deadlineMode === "period" ? "bg-black text-white" : "bg-white"}`}
                onClick={() => setDeadlineMode("period")}
              >
                期限を設定
              </button>
            </div>

            {deadlineMode === "date" ? (
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-md border px-3 py-2"
              />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input type="radio" name="when" id={todayId} />
                  <label htmlFor={todayId}>今日中</label>
                  <input
                    type="radio"
                    name="when"
                    id={tomorrowId}
                    className="ml-4"
                  />
                  <label htmlFor={tomorrowId}>明日まで</label>
                </div>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                />
              </div>
            )}
          </div>
        </div>

        <div className="pt-4">
          <button
            type="button"
            className="w-full rounded-md bg-black text-white py-2"
          >
            タスクを保存（モック）
          </button>
        </div>
      </div>
    </Frame>
  );
}
