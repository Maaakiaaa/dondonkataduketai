import Frame from "./components/Frame";

export default function HomePage() {
  return (
    <Frame active="home">
      <div className="flex flex-col items-center gap-4">
        <h2 className="text-lg font-semibold">達成率</h2>
        <p className="text-sm text-zinc-600">
          片付けを楽しくするシンプルなTODOアプリのモックです。
        </p>

        <div className="mt-4 w-full rounded-md border border-zinc-200 p-3">
          <h3 className="text-sm font-medium">今日のおすすめ</h3>
          <ul className="mt-2 text-sm text-zinc-700 list-disc list-inside">
            <li>デスク周りを5分で片付ける</li>
            <li>本棚の不要な本を3冊選ぶ</li>
            <li>音楽を流しながら作業する</li>
          </ul>
        </div>
      </div>
    </Frame>
  );
}
