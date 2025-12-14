// app/profile/settings/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useId, useState } from "react";
import Frame from "../../components/Frame";
import { supabase } from "../../lib/supabase";

export default function ProfileSettingsPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);

  // 通知時間の設定
  const [morningTime, setMorningTime] = useState("07:00");
  const [eveningTime, setEveningTime] = useState("20:00");

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // ユニークIDを生成
  const morningTimeId = useId();
  const eveningTimeId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  /* ---------------- 初期ロード ---------------- */
  useEffect(() => {
    const init = async () => {
      try {
        const v = localStorage.getItem("profileAvatar");
        if (v) setPreview(v);
      } catch {}

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/push/status?userId=${userData.user.id}`);
        if (res.ok) {
          const json = await res.json();
          setEnabled(json.enabled);
          // 保存された通知時間を取得
          if (json.morningTime) setMorningTime(json.morningTime);
          if (json.eveningTime) setEveningTime(json.eveningTime);
        }
      } catch (error) {
        console.error("通知状態の取得エラー:", error);
      }

      setLoading(false);
    };

    init();
  }, []);

  /* ---------------- 通知 OFF ---------------- */
  const disableNotification = async () => {
    try {
      if (!("serviceWorker" in navigator)) {
        console.error("Service Workerがサポートされていません");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        console.log("サブスクリプションが見つかりません");
        return;
      }

      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      await subscription.unsubscribe();
      console.log("通知を無効にしました");
    } catch (error) {
      console.error("通知の無効化エラー:", error);
      throw error;
    }
  };

  /* ---------------- 通知 ON ---------------- */
  const enableNotification = async () => {
    try {
      if (Notification.permission !== "granted") {
        const p = await Notification.requestPermission();
        if (p !== "granted") {
          alert("通知を許可してください");
          return;
        }
      }

      if (!("serviceWorker" in navigator)) {
        alert("このブラウザは通知をサポートしていません");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

      if (!vapidKey) {
        console.error("VAPID公開鍵が設定されていません");
        alert("通知の設定に失敗しました");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        alert("ログインしてください");
        return;
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription,
          userId: userData.user.id,
          morningTime,
          eveningTime,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("API エラー:", errorData);
        throw new Error("サブスクリプションの保存に失敗しました");
      }

      console.log("通知を有効にしました（テスト通知が送信されます）");
    } catch (error) {
      console.error("通知の有効化エラー:", error);
      throw error;
    }
  };

  /* ---------------- 通知時間の更新 ---------------- */
  const updateNotificationTimes = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const res = await fetch("/api/push/update-times", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userData.user.id,
          morningTime,
          eveningTime,
        }),
      });

      if (res.ok) {
        alert("通知時間を更新しました");
      }
    } catch (error) {
      console.error("時間更新エラー:", error);
    }
  };

  /* ---------------- トグル ---------------- */
  const toggle = async () => {
    setToggleLoading(true);

    try {
      if (enabled) {
        await disableNotification();
        setEnabled(false);
      } else {
        await enableNotification();
        setEnabled(true);
      }
    } catch (error) {
      console.error("トグルエラー:", error);
      alert("通知の切り替えに失敗しました");
    } finally {
      setToggleLoading(false);
    }
  };

  /* ---------------- ダークモード切り替え ---------------- */
  const toggleDarkMode = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  if (loading || !mounted) {
    return <Frame active="home">読み込み中...</Frame>;
  }

  return (
    <Frame active="home">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/profile"
            className="text-sm text-zinc-600 dark:text-zinc-400"
          >
            ← 戻る
          </Link>
          <div className="text-sm font-medium dark:text-white">設定</div>
          <div />
        </div>

        <div className="space-y-4">
          {/* avatar */}
          <div className="space-y-2">
            <div className="text-sm font-medium dark:text-white">
              プロフィール画像
            </div>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full border-2 border-zinc-300 dark:border-zinc-700 flex items-center justify-center overflow-hidden bg-white dark:bg-zinc-800">
                {preview ? (
                  <Image
                    src={preview}
                    alt="preview"
                    width={64}
                    height={64}
                    unoptimized
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-zinc-500 dark:text-zinc-400 text-sm">
                    アイコン
                  </div>
                )}
              </div>

              <input
                type="file"
                accept="image/*"
                className="dark:text-white text-sm"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const result = String(reader.result);
                    setPreview(result);
                    localStorage.setItem("profileAvatar", result);
                  };
                  reader.readAsDataURL(f);
                }}
              />
            </div>
          </div>

          {/* 通知 */}
          <label className="flex items-center justify-between dark:text-white">
            <span>通知を有効にする</span>
            <div className="flex items-center gap-2">
              {toggleLoading && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  処理中...
                </span>
              )}
              <input
                type="checkbox"
                checked={enabled}
                onChange={toggle}
                disabled={toggleLoading}
                className="cursor-pointer"
              />
            </div>
          </label>

          {enabled && (
            <div className="text-xs text-green-600 dark:text-green-400">
              ✅ 通知が有効です
            </div>
          )}

          {/* 通知時間設定 */}
          {enabled && (
            <div className="space-y-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <div className="text-sm font-medium dark:text-white">
                通知時間
              </div>

              {/* 朝の通知 */}
              <div className="space-y-1">
                <label
                  htmlFor={morningTimeId}
                  className="text-xs text-zinc-600 dark:text-zinc-400"
                >
                  朝の通知（今日のTODOを確認しよう！）
                </label>
                <input
                  id={morningTimeId}
                  type="time"
                  value={morningTime}
                  onChange={(e) => setMorningTime(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-black dark:text-white"
                />
              </div>

              {/* 夜の通知 */}
              <div className="space-y-1">
                <label
                  htmlFor={eveningTimeId}
                  className="text-xs text-zinc-600 dark:text-zinc-400"
                >
                  夜の通知（今日のTODOは片付いたかな？）
                </label>
                <input
                  id={eveningTimeId}
                  type="time"
                  value={eveningTime}
                  onChange={(e) => setEveningTime(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-black dark:text-white"
                />
              </div>

              <button
                type="button"
                onClick={updateNotificationTimes}
                className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors"
              >
                時間を保存
              </button>
            </div>
          )}

          {/* ダークモード */}
          <label className="flex items-center justify-between dark:text-white">
            <span>ダークモード</span>
            <input
              type="checkbox"
              checked={theme === "dark"}
              onChange={toggleDarkMode}
              className="cursor-pointer"
            />
          </label>
        </div>
      </div>
    </Frame>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
