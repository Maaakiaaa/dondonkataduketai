import Image from "next/image";
import Link from "next/link";
import Frame from "../components/Frame";

export default function ProfilePage() {
  return (
    <Frame active="home">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full border-2 border-zinc-300 flex items-center justify-center text-sm text-zinc-500">
              アイコン
            </div>
            <div>
              <div className="text-xl font-semibold">名前</div>
            </div>
          </div>

          <Link href="/profile/settings" aria-label="設定" className="p-2">
            <Image src="/file.svg" alt="設定" width={20} height={20} />
          </Link>
        </div>

        <div className="rounded-md border border-zinc-300 h-[60vh] p-4 flex items-center justify-center text-zinc-500 text-sm">
          ここら辺に積み上げたタスク
        </div>
      </div>
    </Frame>
  );
}
