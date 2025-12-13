// app/demo/task-modal/page.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { AddTaskModal } from "@/features/todos/components/AddTaskModal";

export default function TaskModalDemoPage() {
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
    setIsModalOpen(false);
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
    return <div className="p-10 text-center">認証確認中...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8 flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          タスク追加モーダル
          <br />
          動作デモ
        </h1>

        <p className="text-gray-600 mb-8">
          下のボタンを押すと、作成した
          <br />
          「AddTaskModal」コンポーネントが開きます。
        </p>

        {/* ログインしていない場合の警告 */}
        {!isAuthenticated && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm">
            <p className="font-bold">⚠️ 未ログイン状態です</p>
            <p>モーダルは開けますが、保存時にエラーになります。</p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="underline mt-2 text-blue-600"
            >
              ログイン画面へ移動
            </button>
          </div>
        )}

        {/* モーダルを開くトリガーボタン */}
        <button
          type="button"
          onClick={openModal}
          className="bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold px-8 py-4 rounded-full shadow-lg transition transform hover:scale-105 active:scale-95"
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
