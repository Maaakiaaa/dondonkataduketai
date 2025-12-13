// features/auth/components/SignUpForm.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signUp } from "../api";

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
      await signUp(email, password, username);

      alert("登録成功！ようこそ！");
      router.push("/");
      router.refresh();
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
