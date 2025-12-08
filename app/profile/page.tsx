import Link from "next/link";

export default function ProfilePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 p-6">
      <div className="w-[360px] h-[780px] border-2 border-zinc-500 rounded-xl bg-white shadow-md flex flex-col overflow-hidden">
        <header className="px-4 py-3 border-b">
          <Link href="/" className="text-sm text-zinc-600">
            ← 戻る
          </Link>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <h2 className="text-lg font-semibold mb-4">
            プロフィール設定（モック）
          </h2>

          <div className="space-y-4">
            <label className="text-sm block">
              名前
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                defaultValue="ぎユーザー"
              />
            </label>

            <label className="text-sm block">
              メール
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                defaultValue="user@example.com"
              />
            </label>

            <div className="text-sm block">
              <div className="font-medium">アバター</div>
              <div className="mt-2">
                <div className="w-12 h-12 rounded-full bg-blue-400 flex items-center justify-center text-white">
                  ぎ
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="button"
                className="w-full rounded-md bg-black text-white py-2"
              >
                保存する（モック）
              </button>
            </div>
          </div>
        </main>

        <footer className="h-14 border-t flex items-center justify-center text-sm text-zinc-500">
          プロフィールはローカルで保存されません（モック）
        </footer>
      </div>
    </div>
  );
}
