// app/api/save-subscription/route.ts

import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

// Supabaseクライアントを作成
// これを使ってデータベースに保存する
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // サーバー側なのでサービスロールキーを使用
);

export async function POST(request: NextRequest) {
  try {
    // リクエストボディからサブスクリプション情報を取得
    const body = await request.json();
    const { subscription, userId } = body;

    // user_idが必須
    if (!userId) {
      return NextResponse.json(
        { error: "ユーザーIDが必要です" },
        { status: 400 },
      );
    }

    // Supabaseのテーブルに保存
    // テーブル名: push_subscriptions
    const { data, error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint, // プッシュサーバーのエンドポイント
        p256dh: subscription.keys.p256dh, // 暗号化鍵1
        auth: subscription.keys.auth, // 暗号化鍵2
        created_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,endpoint", // 同じユーザー＋エンドポイントなら更新
      },
    );

    if (error) {
      console.error("Supabaseエラー:", error);
      return NextResponse.json(
        { error: "サブスクリプションの保存に失敗しました" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("サーバーエラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
