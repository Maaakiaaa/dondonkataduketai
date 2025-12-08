"use client";

import Link from "next/link";
import { useState } from "react";
import Frame from "../../components/Frame";

export default function ProfileSettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <Frame active="home">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Link href="/profile" className="text-sm text-zinc-600">
            ← 戻る
          </Link>
          <div className="text-sm font-medium">設定</div>
          <div />
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <span>通知を受け取る</span>
            <input
              type="checkbox"
              checked={notifications}
              onChange={() => setNotifications((s) => !s)}
            />
          </label>

          <label className="flex items-center justify-between">
            <span>ダークモード</span>
            <input
              type="checkbox"
              checked={darkMode}
              onChange={() => setDarkMode((s) => !s)}
            />
          </label>

          <div className="pt-4">
            <button
              type="button"
              className="w-full rounded-md bg-black text-white py-2"
            >
              保存（モック）
            </button>
          </div>
        </div>
      </div>
    </Frame>
  );
}
