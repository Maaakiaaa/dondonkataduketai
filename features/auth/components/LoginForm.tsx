"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { login } from "../api";

export const LoginForm = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      // APIを呼ぶ
      await login(email, password);

      alert("ログイン成功！");
      router.push("/"); // トップページへ移動
      router.refresh(); // 画面をリフレッシュしてログイン状態を反映させる
    } catch (e) {
      if (e instanceof Error) {
        setErrorMsg(e.message); // エラーを表示
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 p-4 border rounded shadow-md max-w-sm mx-auto bg-white"
    >
      <h2 className="text-xl font-bold mb-2">ログイン</h2>

      {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}

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
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? "通信中..." : "ログイン"}
      </button>
    </form>
  );
};
