// app/api/push/status/route.ts
// ⚠️ このファイルは app/api/push/status/route.ts に配置してください

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    console.log("Status API呼び出し - userId:", userId); // デバッグログ

    if (!userId) {
      return NextResponse.json({ enabled: false });
    }

    // ユーザーのサブスクリプションが存在するかチェック（通知時間も取得）
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("id, morning_time, evening_time")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (error) {
      console.error("DB取得エラー:", error);
      return NextResponse.json({ enabled: false });
    }

    console.log("サブスクリプション確認結果:", data); // デバッグログ

    return NextResponse.json({
      enabled: !!data,
      morningTime: data?.morning_time || "07:00",
      eveningTime: data?.evening_time || "20:00",
    });
  } catch (error) {
    console.error("サーバーエラー:", error);
    return NextResponse.json({ enabled: false });
  }
}
