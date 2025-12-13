// app/api/push/update-times/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  try {
    const { userId, morningTime, eveningTime } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userIdが必要です" }, { status: 400 });
    }

    // ユーザーの通知時間を更新
    const { error } = await supabase
      .from("push_subscriptions")
      .update({
        morning_time: morningTime,
        evening_time: eveningTime,
      })
      .eq("user_id", userId);

    if (error) {
      console.error("時間更新エラー:", error);
      return NextResponse.json(
        { error: "更新に失敗しました" },
        { status: 500 },
      );
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
