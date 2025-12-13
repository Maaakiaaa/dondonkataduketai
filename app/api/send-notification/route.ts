// app/api/send-notification/route.ts

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import webpush from "web-push";

// Supabaseクライアントを作成
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Web Pushの設定
// VAPID鍵を設定（メール送信者の識別に使用）
webpush.setVapidDetails(
  "mailto:dondoko@gmail.com", // あなたのメールアドレス
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function POST() {
  try {
    // Supabaseから全てのサブスクリプションを取得
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (error) {
      console.error("Supabaseエラー:", error);
      return NextResponse.json(
        { error: "サブスクリプションの取得に失敗しました" },
        { status: 500 },
      );
    }

    // 送信する通知の内容
    const notificationPayload = JSON.stringify({
      title: "どんどん片付けたい！",
      body: "テスト通知が届きました 🎉",
      icon: "/icon.png",
    });

    // 全てのサブスクリプションに通知を送信
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        // p256dhとauthを使ってサブスクリプションオブジェクトを再構築
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          notificationPayload,
        );
        console.log("通知送信成功:", sub.endpoint);
      } catch (error: any) {
        console.error("通知送信失敗:", error);

        // サブスクリプションが無効な場合は削除
        if (error.statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      }
    });

    await Promise.all(sendPromises);

    return NextResponse.json({
      success: true,
      message: `${subscriptions.length}件の通知を送信しました`,
    });
  } catch (error) {
    console.error("サーバーエラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
