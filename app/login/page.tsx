"use client";

import Image from "next/image";
import { useState } from "react";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { SignUpForm } from "@/features/auth/components/SignUpForm";

export default function AuthPage() {
  // trueならログイン画面、falseなら登録画面を表示
  const [isLoginMode, setIsLoginMode] = useState(true);

  const titleColors = [
    "text-[#FF6B6B]", // Red
    "text-[#4ECDC4]", // Teal
    "text-[#FFE66D]", // Yellow
    "text-[#FF6B6B]", // Red
    "text-[#4ECDC4]", // Teal
    "text-[#1A535C]", // Dark Teal
    "text-[#FF9F1C]", // Orange
    "text-[#2EC4B6]", // Cyan
    "text-[#E71D36]", // Red
    "text-[#7209B7]", // Purple
    "text-[#3A0CA3]", // Blue
    "text-[#F72585]", // Pink
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#FFD700] bg-[radial-gradient(#ffffff_4px,transparent_4px)] [background-size:24px_24px] p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black p-6 sm:p-8 relative overflow-hidden">
        {/* 装飾的な背景円 */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-200 rounded-full opacity-50 pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-green-200 rounded-full opacity-50 pointer-events-none" />

        {/* ロゴエリア */}
        <div className="flex flex-col items-center mb-8 relative z-10 w-full">
          <h1 className="text-3xl sm:text-4xl font-black text-center tracking-wider drop-shadow-sm flex flex-col items-center gap-2">
            <div className="flex justify-center gap-1">
              {["ど", "ぅ", "ん", "ど", "ぅ", "ん"].map((char, index) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: Static list
                  key={index}
                  className={`inline-block transform hover:scale-125 transition-transform duration-200 cursor-default ${titleColors[index % titleColors.length]}`}
                >
                  {char}
                </span>
              ))}
            </div>
            <div className="flex justify-center gap-1 pl-12">
              {["片", "付", "け", "た", "い", "！"].map((char, index) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: Static list
                  key={index}
                  className={`inline-block transform hover:scale-125 transition-transform duration-200 cursor-default ${titleColors[(index + 6) % titleColors.length]}`}
                >
                  {char}
                </span>
              ))}
            </div>
          </h1>
        </div>

        {/* 切り替えタブ */}
        <div className="flex mb-8 bg-gray-100 rounded-full p-1.5 border-2 border-black relative z-10">
          <button
            type="button"
            className={`flex-1 py-2 px-4 rounded-full text-sm font-black transition-all duration-200 ${
              isLoginMode
                ? "bg-[#4ECDC4] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-black transform -translate-y-0.5"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setIsLoginMode(true)}
          >
            ログイン
          </button>
          <button
            type="button"
            className={`flex-1 py-2 px-4 rounded-full text-sm font-black transition-all duration-200 ${
              !isLoginMode
                ? "bg-[#FF6B6B] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-black transform -translate-y-0.5"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setIsLoginMode(false)}
          >
            新規登録
          </button>
        </div>

        {/* フォーム表示 */}
        {/* 
           子コンポーネントのスタイルを強制的に上書きして、
           このカードのデザインに馴染ませる
        */}
        <div className="relative z-10 [&_form]:!shadow-none [&_form]:!border-none [&_form]:!p-0 [&_form]:!bg-transparent [&_form]:!max-w-none [&_input]:!border-2 [&_input]:!border-black [&_input]:!rounded-xl [&_input]:!bg-gray-50 [&_button[type='submit']]:!bg-black [&_button[type='submit']]:!text-white [&_button[type='submit']]:!font-bold [&_button[type='submit']]:!py-3 [&_button[type='submit']]:!rounded-xl [&_button[type='submit']]:!shadow-[4px_4px_0px_0px_rgba(100,100,100,1)] [&_button[type='submit']]:active:!shadow-none [&_button[type='submit']]:active:!translate-x-[4px] [&_button[type='submit']]:active:!translate-y-[4px] [&_button[type='submit']]:!transition-all">
          {isLoginMode ? <LoginForm /> : <SignUpForm />}
        </div>
      </div>
    </main>
  );
}
