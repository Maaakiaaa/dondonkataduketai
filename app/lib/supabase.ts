// lib/supabase.ts

import { createBrowserClient } from "@supabase/ssr";
// 型定義をインポート
import type { Database } from "../types/database.types";

// 環境変数を読み込む
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// クライアント作成（Cookieベースのセッション管理）
export const supabase = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
);
