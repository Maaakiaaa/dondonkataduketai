// app/api/push/subscribe/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import webpush from "../../../lib/webPush";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subscription, userId, morningTime, eveningTime } = body;

    if (!userId) {
      return NextResponse.json({ error: "userIdが必要です" }, { status: 400 });
    }

    const {
      endpoint,
      keys: { p256dh, auth },
    } = subscription;

    // DB保存（通知時間も一緒に保存）
    const { error } = await supabase.from("push_subscriptions").upsert({
      user_id: userId,
      endpoint,
      p256dh,
      auth,
      morning_time: morningTime || "07:00",
      evening_time: eveningTime || "20:00",
    });

    if (error) {
      console.error("DB保存エラー:", error);
      return NextResponse.json(
        { error: "保存に失敗しました" },
        { status: 500 },
      );
    }

    // ✅ テスト通知を即座に送信
    try {
      await webpush.sendNotification(
        {
          endpoint,
          keys: { p256dh, auth },
        },
        JSON.stringify({
          title: "通知を有効にしました 🎉",
          body: "タスクの時間になるとお知らせします",
          icon: "/icon.png",
        }),
      );
      console.log("テスト通知送信成功");
    } catch (pushError) {
      console.error("テスト通知送信エラー:", pushError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("サーバーエラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
