"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import Frame from "../../components/Frame";

export default function ProfileSettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  // load existing avatar preview from localStorage
  useEffect(() => {
    try {
      const v = localStorage.getItem("profileAvatar");
      if (v) setPreview(v);
    } catch {
      // ignore
    }
  }, []);

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
          <div className="space-y-2">
            <div className="text-sm font-medium">プロフィール画像</div>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full border-2 border-zinc-300 flex items-center justify-center overflow-hidden bg-white">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <Image
                    src={preview}
                    alt="preview"
                    width={64}
                    height={64}
                    unoptimized
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-zinc-500 text-sm">アイコン</div>
                )}
              </div>

              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      setPreview(String(reader.result));
                    };
                    reader.readAsDataURL(f);
                  }}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-black text-white px-3 py-1 text-sm"
                    onClick={() => {
                      if (!preview) return;
                      try {
                        localStorage.setItem("profileAvatar", preview);
                        alert("アイコンを保存しました");
                      } catch {
                        alert("保存に失敗しました");
                      }
                    }}
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    className="rounded-md border px-3 py-1 text-sm"
                    onClick={() => {
                      try {
                        localStorage.removeItem("profileAvatar");
                        setPreview(null);
                        alert("アイコンをクリアしました");
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    クリア
                  </button>
                </div>
              </div>
            </div>
          </div>
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
