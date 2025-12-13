"use client";

import { useState } from "react";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { SignUpForm } from "@/features/auth/components/SignUpForm";

export default function AuthPage() {
  // trueならログイン画面、falseなら登録画面を表示
  const [isLoginMode, setIsLoginMode] = useState(true);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        {/* 切り替えタブ */}
        <div className="flex mb-4 border-b">
          <button
            type="button"
            className={`flex-1 p-2 ${isLoginMode ? "border-b-2 border-blue-500 font-bold" : "text-gray-500"}`}
            onClick={() => setIsLoginMode(true)}
          >
            ログイン
          </button>
          <button
            type="button"
            className={`flex-1 p-2 ${!isLoginMode ? "border-b-2 border-green-500 font-bold" : "text-gray-500"}`}
            onClick={() => setIsLoginMode(false)}
          >
            新規登録
          </button>
        </div>

        {/* フォーム表示 */}
        {isLoginMode ? <LoginForm /> : <SignUpForm />}
      </div>
    </main>
  );
}
