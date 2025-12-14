// app/demo/task-modal/page.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { AddTaskModal } from "@/features/todos/components/AddTaskModal";

// useSearchParams を使うコンポーネントを分離
function TaskModalContent() {
  const router = useRouter();
  // モーダルの開閉状態を管理するステート
  const [isModalOpen, setIsModalOpen] = useState(false);
  // ログイン状態のチェック用
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // ページを開いた時にログインチェック
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setCheckingAuth(false);
    };
    checkAuth();
  }, []);

  // モーダルを開く関数
  const openModal = () => setIsModalOpen(true);

  // モーダルを閉じる関数（AddTaskModalのonCloseに渡す）
  const closeModal = () => {
    // モーダルを閉じるために /todo に遷移する
    router.replace("/todo");
  };

  // URL クエリで open=1 がある場合、ページ読み込み時にモーダルを自動で開く
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams?.get("open") === "1") {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-[#FFD700] bg-[radial-gradient(#ffffff_4px,transparent_4px)] [background-size:24px_24px] p-8 flex flex-col items-center justify-center font-sans">
        <div className="animate-spin h-12 w-12 border-4 border-black border-t-transparent rounded-full mb-4"></div>
        <p className="font-black text-xl tracking-widest">LOADING...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFD700] bg-[radial-gradient(#ffffff_4px,transparent_4px)] [background-size:24px_24px] p-8 flex flex-col items-center justify-center font-sans">
      <div className="bg-white p-8 rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black text-center max-w-md w-full relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#4ECDC4] rounded-full opacity-20 pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-[#FF6B6B] rounded-full opacity-20 pointer-events-none" />

        <h1 className="text-3xl font-black mb-6 text-black tracking-wider">
          タスク追加モーダル
          <br />
          <span className="text-[#FF6B6B]">動</span>
          <span className="text-[#4ECDC4]">作</span>
          <span className="text-[#FFE66D]">デ</span>
          <span className="text-[#9b5de5]">モ</span>
        </h1>

        <p className="text-gray-600 font-bold mb-8">
          下のボタンを押すと、作成した
          <br />
          「AddTaskModal」コンポーネントが開きます。
        </p>

        {/* ログインしていない場合の警告 */}
        {!isAuthenticated && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border-2 border-red-200 mb-6 text-sm font-bold">
            <p className="flex items-center justify-center gap-2 mb-1">
              <span>⚠️</span> 未ログイン状態です
            </p>
            <p className="font-normal mb-2">
              モーダルは開けますが、保存時にエラーになります。
            </p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="underline text-red-600 hover:text-red-800"
            >
              ログイン画面へ移動
            </button>
          </div>
        )}

        {/* モーダルを開くトリガーボタン */}
        <button
          type="button"
          onClick={openModal}
          className="bg-[#4ECDC4] hover:bg-[#3dbdb5] text-white text-xl font-black px-8 py-4 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:shadow-none active:translate-x-[4px] active:translate-y-[4px]"
        >
          ＋ タスクを追加する
        </button>
      </div>

      {/* ★ここが重要！
        isModalOpen が true の時だけ AddTaskModal を表示します。
        onClose プロップスには、モーダルを閉じるための関数を渡します。
      */}
      {isModalOpen && <AddTaskModal onClose={closeModal} />}
    </main>
  );
}

export default function TaskModalDemoPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">読み込み中...</div>}>
      <TaskModalContent />
    </Suspense>
  );
}
