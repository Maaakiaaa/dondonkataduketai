// features/auth/components/SignUpForm.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { login, signUp } from "../api";

export const SignUpForm = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await signUp(email, password, username);
      console.log("signUp result:", res);

      // If session is present, user is already logged in
      if (res?.session) {
        alert("登録成功！自動ログインしました。");
        router.push("/");
        return;
      }

      // If a user object exists but no session, try to sign in using credentials
      if (res?.user) {
        try {
          const loginRes = await login(email, password);
          console.log("login after signUp result:", loginRes);
          if (loginRes?.session) {
            alert("登録成功！自動ログインしました。");
            router.push("/");
            return;
          }
        } catch (err) {
          // ignore and fallthrough to email-confirmation flow
          console.warn("auto-login after signUp failed:", err);
        }

        // If we get here, registration succeeded but no active session
        alert(
          "登録は完了しました。確認メールを送信しました。メール確認後にログインしてください。",
        );
        router.push("/login");
        return;
      }

      // Fallback
      alert("登録処理が完了しました。ログインしてください。");
      router.push("/login");
    } catch (e) {
      if (e instanceof Error) setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 p-4 border rounded shadow-md max-w-sm mx-auto bg-white"
    >
      <h2 className="text-xl font-bold mb-2">アカウント作成</h2>

      {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}

      {/* ユーザー名入力欄 */}
      <label className="flex flex-col">
        <span className="text-sm text-gray-600">ユーザー名</span>
        <input
          type="text"
          className="border p-2 rounded"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          placeholder="yourname"
        />
      </label>

      <label className="flex flex-col">
        <span className="text-sm text-gray-600">メールアドレス</span>
        <input
          type="email"
          className="border p-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>

      <label className="flex flex-col">
        <span className="text-sm text-gray-600">パスワード</span>
        <input
          type="password"
          className="border p-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6} // Supabaseはデフォルトで6文字以上必要
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "登録中..." : "新規登録"}
      </button>
    </form>
  );
};
