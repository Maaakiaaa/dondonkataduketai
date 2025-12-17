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

// 時刻が範囲内かチェック（±5分の余裕を持たせる）
function isWithinTimeRange(
  currentHour,
  currentMinute,
  targetHour,
  targetMinute,
) {
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const targetTotalMinutes = targetHour * 60 + targetMinute;
  const diff = Math.abs(currentTotalMinutes - targetTotalMinutes);

  // 5分以内ならtrue
  return diff <= 5;
}

// 期限30分前の通知をチェック
async function checkDeadlineNotifications() {
  try {
    const now = new Date();
    const in30Minutes = new Date(now.getTime() + 30 * 60 * 1000);
    const in25Minutes = new Date(now.getTime() + 25 * 60 * 1000);

    // 25分後〜30分後の間に期限が来るタスクを取得
    const { data: upcomingTasks, error: tasksError } = await supabase
      .from("todos")
      .select("*, profiles(id)")
      .eq("is_completed", false)
      .gte("due_at", in25Minutes.toISOString())
      .lte("due_at", in30Minutes.toISOString());

    if (tasksError) {
      console.error("タスク取得エラー:", tasksError);
      return;
    }

    if (!upcomingTasks || upcomingTasks.length === 0) {
      return;
    }

    console.log(`⏰ ${upcomingTasks.length}件の期限間近タスク`);

    for (const task of upcomingTasks) {
      // ユーザーのサブスクリプション取得
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", task.user_id);

      if (!subscriptions || subscriptions.length === 0) continue;

      const dueDate = new Date(task.due_at);
      const timeStr = dueDate.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      });

      for (const sub of subscriptions) {
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
              title: "⏰ タスク期限が近づいています！",
              body: `「${task.title}」の期限は ${timeStr} です`,
              icon: "/dolundolun.png",
              badge: "/dolundolun.png",
              tag: `deadline-${task.id}`,
              data: { url: "/todo", taskId: task.id },
            }),
          );
          console.log(`✅ 期限通知送信: ${task.title} (${task.user_id})`);
        } catch (error) {
          console.error("期限通知送信失敗:", error);
          if (error.statusCode === 410) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
          }
        }
      }
    }
  } catch (error) {
    console.error("期限通知チェックエラー:", error);
  }
}

// スマート通知: ユーザーの作業パターンに基づく通知
async function checkSmartNotifications() {
  try {
    const now = new Date();
    const jstOffset = 9 * 60;
    const jstTime = new Date(now.getTime() + jstOffset * 60 * 1000);
    const currentHour = jstTime.getUTCHours();

    // 全ユーザーの作業履歴を取得
    const { data: allUsers, error: usersError } = await supabase
      .from("profiles")
      .select("id");

    if (usersError || !allUsers) return;

    for (const user of allUsers) {
      // ユーザーの完了履歴から好みの作業時間帯を分析
      const { data: completionHistory } = await supabase
        .from("task_completion_history")
        .select("completed_hour")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(50);

      if (!completionHistory || completionHistory.length < 5) continue;

      // 最頻出の作業時間帯を計算
      const hourCounts = {};
      for (const h of completionHistory) {
        hourCounts[h.completed_hour] = (hourCounts[h.completed_hour] || 0) + 1;
      }

      const preferredHours = Object.entries(hourCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => parseInt(hour));

      // 現在時刻が好みの作業時間帯なら通知
      if (preferredHours.includes(currentHour)) {
        // 未完了タスクを確認
        const { data: incompleteTasks } = await supabase
          .from("todos")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_completed", false)
          .limit(1);

        if (incompleteTasks && incompleteTasks.length > 0) {
          // サブスクリプション取得
          const { data: subscriptions } = await supabase
            .from("push_subscriptions")
            .select("*")
            .eq("user_id", user.id);

          if (!subscriptions || subscriptions.length === 0) continue;

          // 今日既にスマート通知を送ったかチェック
          const today = jstTime.toISOString().split("T")[0];
          const lastSmartNotif =
            subscriptions[0].last_smart_notification?.split("T")[0];

          if (lastSmartNotif === today) continue;

          for (const sub of subscriptions) {
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
                  title: "🎯 いつもの時間だよ！",
                  body: `${currentHour}時台はあなたがよく作業する時間です。未完了タスクがあります！`,
                  icon: "/dolundolun.png",
                  badge: "/dolundolun.png",
                  tag: "smart-notification",
                  data: { url: "/todo" },
                }),
              );

              // 送信記録
              await supabase
                .from("push_subscriptions")
                .update({ last_smart_notification: jstTime.toISOString() })
                .eq("id", sub.id);

              console.log(
                `🧠 スマート通知送信: ${user.id} (${currentHour}時台)`,
              );
            } catch (error) {
              console.error("スマート通知送信失敗:", error);
              if (error.statusCode === 410) {
                await supabase
                  .from("push_subscriptions")
                  .delete()
                  .eq("endpoint", sub.endpoint);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("スマート通知チェックエラー:", error);
  }
}

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

    // 期限30分前通知をチェック
    await checkDeadlineNotifications();

    // スマート通知をチェック
    await checkSmartNotifications();

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

      console.log(
        `ユーザーID: ${sub.user_id}, 朝の通知: ${morningHour}:${morningMinute.toString().padStart(2, "0")}, 夜の通知: ${eveningHour}:${eveningMinute.toString().padStart(2, "0")}`,
      );

      // 今日既に送信したかチェック
      const lastMorning = sub.last_morning_notification?.split("T")[0];
      const lastEvening = sub.last_evening_notification?.split("T")[0];

      // 朝の通知（5分以内なら送信）
      if (
        isWithinTimeRange(
          currentHour,
          currentMinute,
          morningHour,
          morningMinute,
        ) &&
        lastMorning !== today
      ) {
        try {
          console.log(`🔔 朝の通知を送信中: ${sub.user_id}`);

          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            JSON.stringify({
              title: "どぅんどぅん",
              body: "おはよう！ ☀️今日のTODOを確認しよう！",
              icon: "/dolundolun.png",
              data: { url: "/todo" },
            }),
          );

          // 送信時刻を記録
          await supabase
            .from("push_subscriptions")
            .update({ last_morning_notification: jstTime.toISOString() })
            .eq("id", sub.id);

          console.log(
            `✅ 朝の通知送信成功: ${sub.user_id} (設定時刻: ${morningHour}:${morningMinute.toString().padStart(2, "0")}, 送信時刻: ${currentHour}:${currentMinute.toString().padStart(2, "0")})`,
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

      // 夜の通知（5分以内なら送信）
      if (
        isWithinTimeRange(
          currentHour,
          currentMinute,
          eveningHour,
          eveningMinute,
        ) &&
        lastEvening !== today
      ) {
        try {
          console.log(`🔔 夜の通知を送信中: ${sub.user_id}`);

          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            JSON.stringify({
              title: "どぅんどぅん",
              body: "お疲れさま！🌙今日のTODOは片付いたかな？",
              icon: "/dolundolun.png",
              data: { url: "/todo" },
            }),
          );

          // 送信時刻を記録
          await supabase
            .from("push_subscriptions")
            .update({ last_evening_notification: jstTime.toISOString() })
            .eq("id", sub.id);

          console.log(
            `✅ 夜の通知送信成功: ${sub.user_id} (設定時刻: ${eveningHour}:${eveningMinute.toString().padStart(2, "0")}, 送信時刻: ${currentHour}:${currentMinute.toString().padStart(2, "0")})`,
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
