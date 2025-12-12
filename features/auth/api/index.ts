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
        avater_url: "",
      },
    },
  });

  if (error) throw new Error(error.message);
  return data;
};
