// app/api/push/status/route.ts
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

    if (!userId) {
      return NextResponse.json({ enabled: false });
    }

    // ユーザーのサブスクリプションが存在するかチェック
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (error) {
      console.error("DB取得エラー:", error);
      return NextResponse.json({ enabled: false });
    }

    return NextResponse.json({
      enabled: data && data.length > 0,
    });
  } catch (error) {
    console.error("サーバーエラー:", error);
    return NextResponse.json({ enabled: false });
  }
}
