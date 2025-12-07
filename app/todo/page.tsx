import Frame from "../components/Frame";

export default function TodoPage() {
  const items = [
    { id: 1, text: "キッチンを片付ける" },
    { id: 2, text: "不要な服を分ける" },
    { id: 3, text: "書類を整理する" },
  ];

  return (
    <Frame active="todo">
      <div>
        <h2 className="text-base font-semibold">TODO リスト</h2>
        <ul className="mt-3 space-y-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between rounded-md border p-2"
            >
              <div className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-sm">{it.text}</span>
              </div>
              <button type="button" className="text-xs text-zinc-500">
                ⋯
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="mt-4 w-full rounded-md bg-black text-white py-2 text-sm"
        >
          タスクを追加
        </button>
      </div>
    </Frame>
  );
}
