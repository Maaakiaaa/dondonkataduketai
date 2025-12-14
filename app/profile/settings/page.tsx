"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import Frame from "../../components/Frame";
import { supabase } from "../../lib/supabase";

export default function ProfileSettingsPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);

  // 通知時間の設定
  const [morningTime, setMorningTime] = useState("07:00");
  const [eveningTime, setEveningTime] = useState("20:00");

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
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setLoading(false);
        return;
      }

      // Supabaseからプロフィール情報を取得
      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("avatar_url, username")
          .eq("id", userData.user.id)
          .single();

        if (profileData) {
          // アバター画像を設定
          if (profileData.avatar_url) {
            setPreview(profileData.avatar_url);
            localStorage.setItem("profileAvatar", profileData.avatar_url);
          } else {
            // localStorageからフォールバック
            try {
              const v = localStorage.getItem("profileAvatar");
              if (v) setPreview(v);
            } catch {}
          }

          // ユーザー名を設定
          if (profileData.username) {
            setUsername(profileData.username);
          } else if (userData.user.user_metadata?.username) {
            setUsername(userData.user.user_metadata.username);
          }
        }
      } catch (error) {
        console.error("プロフィール情報の取得エラー:", error);
        // エラー時はlocalStorageからフォールバック
        try {
          const v = localStorage.getItem("profileAvatar");
          if (v) setPreview(v);
        } catch {}
        if (userData.user.user_metadata?.username) {
          setUsername(userData.user.user_metadata.username);
        }
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

  /* ---------------- Service Worker登録 ---------------- */
  const registerServiceWorker = async () => {
    try {
      if (!("serviceWorker" in navigator)) {
        throw new Error("このブラウザはService Workerをサポートしていません");
      }

      console.log("📝 Service Workerを登録中...");

      // 既に登録済みか確認
      const existingRegistration =
        await navigator.serviceWorker.getRegistration();
      if (existingRegistration) {
        console.log("✅ Service Workerは既に登録済み");
        return existingRegistration;
      }

      // 新規登録
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("✅ Service Worker登録成功:", registration.scope);

      // Service Workerがアクティブになるまで待機
      if (registration.installing) {
        console.log("⏳ Service Workerのインストールを待機中...");
        await new Promise<void>((resolve) => {
          const worker = registration.installing;
          if (worker) {
            worker.addEventListener("statechange", () => {
              if (worker.state === "activated") {
                console.log("✅ Service Workerがアクティブになりました");
                resolve();
              }
            });
          } else {
            resolve();
          }
        });
      }

      return registration;
    } catch (error) {
      console.error("❌ Service Worker登録エラー:", error);
      throw error;
    }
  };

  /* ---------------- 通知 OFF ---------------- */
  const disableNotification = async () => {
    try {
      if (!("serviceWorker" in navigator)) {
        console.error("Service Workerがサポートされていません");
        throw new Error("Service Workerがサポートされていません");
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        console.log("サブスクリプションが見つかりません");
        return;
      }

      const res = await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      if (!res.ok) {
        throw new Error("サブスクリプション削除APIエラー");
      }

      await subscription.unsubscribe();
      console.log("✅ 通知を無効にしました");
    } catch (error) {
      console.error("❌ 通知の無効化エラー:", error);
      throw error;
    }
  };

  /* ---------------- 通知 ON ---------------- */
  const enableNotification = async () => {
    try {
      console.log("🔔 通知有効化を開始...");

      // 1. Service Workerを登録
      await registerServiceWorker();

      // 2. 通知許可チェック
      if (Notification.permission !== "granted") {
        console.log("📢 通知許可をリクエスト中...");
        const p = await Notification.requestPermission();
        if (p !== "granted") {
          throw new Error("通知が許可されませんでした");
        }
        console.log("✅ 通知が許可されました");
      }

      // 3. VAPID公開鍵チェック
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        throw new Error(
          "VAPID公開鍵が設定されていません。.env.localを確認してください",
        );
      }
      console.log("✅ VAPID公開鍵を取得");

      // 4. Service Worker準備完了待機
      console.log("⏳ Service Workerの準備を待機中...");
      const registration = await navigator.serviceWorker.ready;
      console.log("✅ Service Worker準備完了");

      // 5. プッシュサブスクリプション作成
      console.log("📝 プッシュサブスクリプションを作成中...");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      console.log("✅ サブスクリプション作成完了");

      // 6. ユーザー情報取得
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error("ログインしてください");
      }

      // 7. サーバーに保存
      console.log("💾 サーバーに保存中...");
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
        console.error("❌ API エラー:", errorData);
        throw new Error(`サーバーエラー: ${errorData.error || "不明なエラー"}`);
      }

      console.log("✅ 通知を有効にしました（テスト通知が送信されます）");
    } catch (error) {
      console.error("❌ 通知の有効化エラー:", error);
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
      } else {
        throw new Error("時間の更新に失敗しました");
      }
    } catch (error) {
      console.error("時間更新エラー:", error);
      alert("時間の更新に失敗しました");
    }
  };

  /* ---------------- ユーザーネームの更新 ---------------- */
  const updateUsername = async () => {
    if (!username.trim()) {
      alert("ユーザー名を入力してください");
      return;
    }

    setUsernameLoading(true);
    try {
      // 現在のユーザーIDを取得
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("ユーザーが見つかりません");

      // 1. auth.user_metadataを更新
      const { error: authError } = await supabase.auth.updateUser({
        data: { username: username.trim() },
      });

      if (authError) throw authError;

      // 2. profilesテーブルも更新
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ username: username.trim() })
        .eq("id", user.id);

      if (profileError) throw profileError;

      alert("ユーザー名を更新しました");

      // Frameコンポーネントに通知
      window.dispatchEvent(new Event("usernameUpdated"));
    } catch (error) {
      console.error("ユーザー名更新エラー:", error);
      alert("ユーザー名の更新に失敗しました");
    } finally {
      setUsernameLoading(false);
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
    } catch (error: unknown) {
      console.error("❌ トグルエラー:", error);
      const errorMessage =
        error instanceof Error ? error.message : "通知の切り替えに失敗しました";
      alert(
        `エラー: ${errorMessage}\n\nブラウザのコンソールを確認してください（F12キー）`,
      );
    } finally {
      setToggleLoading(false);
    }
  };

  /* ---------------- ログアウト ---------------- */
  const handleLogout = async () => {
    if (!confirm("ログアウトしますか？")) return;

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // localStorageをクリア
      localStorage.removeItem("profileAvatar");

      alert("ログアウトしました");
      window.location.href = "/login";
    } catch (error) {
      console.error("ログアウトエラー:", error);
      alert("ログアウトに失敗しました");
    }
  };

  if (loading || !mounted) {
    return <Frame active="home">読み込み中...</Frame>;
  }

  return (
    <Frame active="home">
      <div className="p-4">
        <div className="mb-6">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 px-2 py-1 bg-white hover:bg-gray-50 text-black font-black text-sm rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
          >
            <span className="text-lg">←</span>
            戻る
          </Link>
        </div>

        <div className="space-y-6">
          {/* ユーザーネーム */}
          <div className="space-y-2">
            <div className="text-sm font-black">ユーザー名</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ユーザー名を入力"
                className="flex-1 px-3 py-1.5 text-sm border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4ECDC4] font-bold"
                maxLength={20}
              />
              <button
                type="button"
                onClick={updateUsername}
                disabled={usernameLoading}
                className="px-3 py-1.5 text-sm bg-[#4ECDC4] hover:bg-[#3dbdb4] text-white font-black rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50"
              >
                {usernameLoading ? "更新中..." : "保存"}
              </button>
            </div>
          </div>

          {/* avatar */}
          <div className="space-y-3">
            <div className="text-sm font-black">プロフィール画像</div>
            <div className="bg-white p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full border-4 border-black flex items-center justify-center overflow-hidden bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  {preview ? (
                    <Image
                      src={preview}
                      alt="preview"
                      width={80}
                      height={80}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-400 text-xs font-bold">
                      アイコン
                    </div>
                  )}
                </div>

                <label className="flex-1 cursor-pointer">
                  <div className="px-4 py-2 bg-[#FFE66D] hover:bg-[#ffd700] text-black font-black text-sm text-center rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all">
                    画像を選択
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const reader = new FileReader();
                      reader.onload = async () => {
                        const result = String(reader.result);
                        setPreview(result);
                        localStorage.setItem("profileAvatar", result);

                        // Supabaseのprofilesテーブルにも保存
                        try {
                          const { data: userData } =
                            await supabase.auth.getUser();
                          if (userData.user) {
                            await supabase
                              .from("profiles")
                              .update({ avatar_url: result })
                              .eq("id", userData.user.id);
                            console.log("✅ アバターをSupabaseに保存しました");
                          }
                        } catch (error) {
                          console.error("❌ アバター保存エラー:", error);
                        }

                        // カスタムイベントを発火して他のコンポーネントに通知
                        window.dispatchEvent(new Event("avatarUpdated"));
                      };
                      reader.readAsDataURL(f);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* 通知 */}
          <div className="bg-white p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <label className="flex items-center justify-between">
              <span className="font-black text-base">通知を有効にする</span>
              <div className="flex items-center gap-2">
                {toggleLoading && (
                  <span className="text-sm text-gray-500 font-bold">
                    処理中...
                  </span>
                )}
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={toggle}
                  disabled={toggleLoading}
                  className="w-5 h-5 cursor-pointer accent-[#4ECDC4]"
                />
              </div>
            </label>

            {enabled && (
              <div className="mt-3 px-3 py-2 bg-[#4ECDC4]/10 rounded-lg border-2 border-[#4ECDC4]">
                <span className="text-sm font-bold text-[#4ECDC4]">
                  ✅ 通知が有効です
                </span>
              </div>
            )}
          </div>

          {/* 通知時間設定 */}
          {enabled && (
            <div className="bg-white p-5 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
              <div className="text-base font-black flex items-center gap-2">
                <span className="text-xl">⏰</span>
                通知時間
              </div>

              {/* 朝の通知 */}
              <div className="space-y-2">
                <label
                  htmlFor={morningTimeId}
                  className="text-sm font-bold text-gray-700 flex items-center gap-2"
                >
                  <span className="text-lg">🌅</span>
                  朝の通知（今日のTODOを確認しよう！）
                </label>
                <input
                  id={morningTimeId}
                  type="time"
                  value={morningTime}
                  onChange={(e) => setMorningTime(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded-lg bg-white font-bold text-base focus:outline-none focus:ring-2 focus:ring-[#FFE66D]"
                />
              </div>

              {/* 夜の通知 */}
              <div className="space-y-2">
                <label
                  htmlFor={eveningTimeId}
                  className="text-sm font-bold text-gray-700 flex items-center gap-2"
                >
                  <span className="text-lg">🌙</span>
                  夜の通知（今日のTODOは片付いたかな？）
                </label>
                <input
                  id={eveningTimeId}
                  type="time"
                  value={eveningTime}
                  onChange={(e) => setEveningTime(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded-lg bg-white font-bold text-base focus:outline-none focus:ring-2 focus:ring-[#FFE66D]"
                />
              </div>

              <button
                type="button"
                onClick={updateNotificationTimes}
                className="w-full py-3 bg-[#4ECDC4] hover:bg-[#3dbdb4] text-white text-sm font-black rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
              >
                時間を保存
              </button>
            </div>
          )}

          {/* ログアウト */}
          <div className="pt-4">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-3 bg-[#FF6B6B] hover:bg-[#ff5252] text-white text-base font-black rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2"
            >
              <span className="text-xl">🚪</span>
              ログアウト
            </button>
          </div>
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
