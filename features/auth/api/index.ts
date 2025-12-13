import { supabase } from "@/app/lib/supabase";

//ログイン処理
export const login = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(error.message);
  return data;
};

//ログアウト処理
export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
};

//今のユーザー情報を取得
export const getCurrentUser = async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return session?.user ?? null;
};

// 新規登録処理
export const signUp = async (
  email: string,
  password: string,
  username: string,
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username,
        avatar_url: "",
      },
    },
  });

  if (error) throw new Error(error.message);

  // If a user object is returned, persist a profile row in `profiles`.
  // Note: This requires a `profiles` table with at least { id, email, username, avatar_url }.
  const user = data?.user;
  if (user) {
    // Delegate profile insertion to a server-side API to avoid RLS/permission issues.
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          email: user.email ?? email,
          username,
          avatar_url: "",
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          json?.error ||
            `プロフィール作成に失敗しました (status: ${res.status})`,
        );
      }
    } catch (err: any) {
      throw new Error(err?.message ?? "プロフィール作成に失敗しました。");
    }
  }

  return data;
};
