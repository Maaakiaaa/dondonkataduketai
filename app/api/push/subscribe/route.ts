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
    const { subscription, userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userIdが必要です" }, { status: 400 });
    }

    const {
      endpoint,
      keys: { p256dh, auth },
    } = subscription;

    // DB保存（重複は無視）
    const { error } = await supabase.from("push_subscriptions").upsert({
      user_id: userId,
      endpoint,
      p256dh,
      auth,
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
          body: "タスクの期限が近づくとお知らせします",
          icon: "/icon.png",
        }),
      );
      console.log("テスト通知送信成功");
    } catch (pushError) {
      console.error("テスト通知送信エラー:", pushError);
      // 通知送信失敗してもサブスクリプション登録は成功とする
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
