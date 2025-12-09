import Frame from "../components/Frame";

export default function MusicPage() {
  return (
    <Frame active="music">
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Music</h2>
        <div className="mt-2 rounded-md border p-3">
          <p className="text-sm">
            お気に入りのプレイリストを流して片付けを楽しくしましょう。
          </p>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Upbeat Cleaning</div>
              <div className="text-xs text-zinc-500">
                30分・ポップ/エレクトロ
              </div>
            </div>
            <button
              type="button"
              className="rounded-full bg-black text-white w-10 h-10"
            >
              ▶
            </button>
          </div>
        </div>
      </div>
    </Frame>
  );
}
