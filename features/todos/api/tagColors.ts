import { supabase } from "@/app/lib/supabase";

export type TagColor = {
  id: string;
  user_id: string;
  tag_name: string;
  color: string;
  created_at: string;
};

// ユーザーのタグカラー設定を取得
export const getTagColors = async (): Promise<Record<string, string>> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase
    .from("tag_colors")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    console.error("タグカラー取得エラー:", error);
    return {};
  }

  // { tag_name: color } の形式に変換
  const colorMap: Record<string, string> = {};
  data?.forEach((item) => {
    colorMap[item.tag_name] = item.color;
  });

  return colorMap;
};

// タグの色を設定・更新
export const setTagColor = async (
  tagName: string,
  color: string,
): Promise<void> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインしてください");

  // upsert（存在すれば更新、なければ挿入）
  const { error } = await supabase.from("tag_colors").upsert(
    {
      user_id: user.id,
      tag_name: tagName,
      color,
    },
    {
      onConflict: "user_id,tag_name",
    },
  );

  if (error) throw new Error(error.message);
};

// タグの色を削除
export const deleteTagColor = async (tagName: string): Promise<void> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインしてください");

  const { error } = await supabase
    .from("tag_colors")
    .delete()
    .eq("user_id", user.id)
    .eq("tag_name", tagName);

  if (error) throw new Error(error.message);
};
