// app/api/push/unsubscribe/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  try {
    const { endpoint } = await req.json();

    if (!endpoint) {
      return NextResponse.json(
        { error: "endpointが必要です" },
        { status: 400 },
      );
    }

    // DBから削除
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint);

    if (error) {
      console.error("DB削除エラー:", error);
      return NextResponse.json(
        { error: "削除に失敗しました" },
        { status: 500 },
      );
    }

    console.log("サブスクリプション削除成功:", endpoint);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("サーバーエラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
