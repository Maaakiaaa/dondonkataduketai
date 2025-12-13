// scripts/check-notifications.js
const { createClient } = require("@supabase/supabase-js");
const webpush = require("web-push");

// Web Push設定
webpush.setVapidDetails(
  "mailto:dondonkataduketai@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function checkAndSendNotifications() {
  try {
    // 日本時間で計算
    const now = new Date();
    const jstOffset = 9 * 60; // 日本時間はUTC+9
    const jstTime = new Date(now.getTime() + jstOffset * 60 * 1000);

    const currentHour = jstTime.getUTCHours();
    const currentMinute = jstTime.getUTCMinutes();
    const today = jstTime.toISOString().split("T")[0]; // YYYY-MM-DD

    console.log(
      `[${now.toISOString()}] 日本時間: ${currentHour}:${currentMinute.toString().padStart(2, "0")}`,
    );

    // 全てのサブスクリプションを取得
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (error) {
      console.error("Supabaseエラー:", error);
      process.exit(1);
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("📭 登録済みサブスクリプションなし");
      return;
    }

    console.log(
      `📬 ${subscriptions.length}件のサブスクリプションをチェック中...`,
    );

    for (const sub of subscriptions) {
      const morningHour = parseInt(sub.morning_time?.slice(0, 2) || "7");
      const morningMinute = parseInt(sub.morning_time?.slice(3, 5) || "0");
      const eveningHour = parseInt(sub.evening_time?.slice(0, 2) || "20");
      const eveningMinute = parseInt(sub.evening_time?.slice(3, 5) || "0");

      // 今日既に送信したかチェック
      const lastMorning = sub.last_morning_notification?.split("T")[0];
      const lastEvening = sub.last_evening_notification?.split("T")[0];

      // 朝の通知
      if (
        currentHour === morningHour &&
        currentMinute === morningMinute &&
        lastMorning !== today
      ) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            JSON.stringify({
              title: "おはようございます！ ☀️",
              body: "今日のTODOを確認しよう！",
              icon: "/icon.png",
              data: { url: "/todo" },
            }),
          );

          // 送信時刻を記録
          await supabase
            .from("push_subscriptions")
            .update({ last_morning_notification: jstTime.toISOString() })
            .eq("id", sub.id);

          console.log(
            `✅ 朝の通知送信: ${sub.user_id} (${morningHour}:${morningMinute.toString().padStart(2, "0")})`,
          );
        } catch (error) {
          console.error("通知送信失敗:", error);
          // 無効なサブスクリプションを削除
          if (error.statusCode === 410) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
            console.log(`🗑️ 無効なサブスクリプション削除`);
          }
        }
      }

      // 夜の通知
      if (
        currentHour === eveningHour &&
        currentMinute === eveningMinute &&
        lastEvening !== today
      ) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            JSON.stringify({
              title: "お疲れさまです！ 🌙",
              body: "今日のTODOは片付いたかな？",
              icon: "/icon.png",
              data: { url: "/todo" },
            }),
          );

          // 送信時刻を記録
          await supabase
            .from("push_subscriptions")
            .update({ last_evening_notification: jstTime.toISOString() })
            .eq("id", sub.id);

          console.log(
            `✅ 夜の通知送信: ${sub.user_id} (${eveningHour}:${eveningMinute.toString().padStart(2, "0")})`,
          );
        } catch (error) {
          console.error("通知送信失敗:", error);
          if (error.statusCode === 410) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
            console.log(`🗑️ 無効なサブスクリプション削除`);
          }
        }
      }
    }

    console.log("✨ チェック完了");
  } catch (error) {
    console.error("スケジューラーエラー:", error);
    process.exit(1);
  }
}

checkAndSendNotifications();
