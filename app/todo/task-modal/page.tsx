// app/todo/task-modal/page.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AddTaskModal } from "@/features/todos/components/AddTaskModal";

// useSearchParams を使うコンポーネントを分離
function TaskModalContent() {
  const router = useRouter();
  // モーダルの開閉状態を管理するステート
  const [isModalOpen, setIsModalOpen] = useState(false);

  // モーダルを開く関数
  const openModal = () => setIsModalOpen(true);

  // モーダルを閉じる関数（AddTaskModalのonCloseに渡す）
  const closeModal = () => {
    // モーダルを閉じるために /todo に遷移する
    router.replace("/todo");
  };

  // URL クエリで open=1 がある場合、ページ読み込み時にモーダルを自動で開く
  // また、id パラメータから編集対象のタスクIDを取得
  const searchParams = useSearchParams();
  const todoId = searchParams?.get("id") || undefined;

  useEffect(() => {
    if (searchParams?.get("open") === "1") {
      setIsModalOpen(true);
    }
  }, [searchParams]);

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
        todoId プロップスには、編集対象のタスクIDを渡します（新規作成時はundefined）。
      */}
      {isModalOpen && <AddTaskModal onClose={closeModal} todoId={todoId} />}
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
