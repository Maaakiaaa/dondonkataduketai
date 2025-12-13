"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function NotificationButton() {
  const [user, setUser] = useState<User | null>(null);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [isLoading, setIsLoading] = useState(false);
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [swReady, setSwReady] = useState(false);

  // 初期処理
  /**
   * Fetch the current user from Supabase
   * and set the user state to the result
   */
  useEffect(() => {
    // ユーザー取得
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    // 通知状態
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }

    // Service Worker 登録
    const registerSW = async () => {
      if (!("serviceWorker" in navigator)) return;

      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        console.log("Service Worker 登録成功", reg);
        setRegistration(reg);
        setSwReady(true);
      } catch (err) {
        console.error("Service Worker 登録失敗", err);
      }
    };

    registerSW();
  }, []);

  // 通知許可
  const requestPermission = async () => {
    if (!swReady) {
      console.warn("Service Worker 準備中");
      return;
    }

    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        await subscribeToPush();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Push 購読
  const subscribeToPush = async () => {
    if (!registration) {
      console.error("Service Worker 未登録");
      return;
    }
    if (!user) {
      console.error("未ログイン");
      return;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.error("VAPID 公開鍵が未設定");
      return;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    await fetch("/api/save-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription,
        userId: user.id,
      }),
    });
  };

  // テスト通知
  const sendTestNotification = async () => {
    await fetch("/api/send-notification", { method: "POST" });
  };

  // Base64 → Uint8Array
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  };

  if (!("Notification" in window)) {
    return <p>このブラウザは通知非対応</p>;
  }

  return (
    <div style={{ padding: 20 }}>
      <p>通知状態: {permission}</p>
      <p>SW状態: {swReady ? "準備完了" : "準備中"}</p>

      {permission !== "granted" && (
        <button
          type="button"
          onClick={requestPermission}
          disabled={isLoading || !swReady}
        >
          {isLoading ? "処理中..." : "通知を許可する"}
        </button>
      )}

      {permission === "granted" && (
        <button type="button" onClick={sendTestNotification}>
          テスト通知送信
        </button>
      )}
    </div>
  );
}
