import Link from "next/link";
import Frame from "../components/Frame";

export default function TodoPage() {
  const items = new Array(3)
    .fill(0)
    .map((_, i) => ({ id: i + 1, text: "タスク名" }));

  return (
    <Frame active="todo">
      <div className="relative">
        {/* top toggle buttons */}
        <div className="flex gap-3 mb-4">
          <Link
            href="/todo/new"
            className="flex-1 rounded-full border px-4 py-2 text-sm text-center"
          >
            今日のTODO作成
          </Link>
          <button
            type="button"
            className="flex-1 rounded-full border px-4 py-2 text-sm"
          >
            カレンダー
          </button>
        </div>

        {/* task list */}
        <ul className="space-y-4">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between rounded-md border p-4 bg-white"
            >
              <div className="flex items-center gap-4">
                <div className="text-xl font-semibold">{it.text}</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-md border px-3 py-1 text-sm"
                >
                  編集
                </button>
                <button
                  type="button"
                  className="rounded-md border px-3 py-1 text-sm"
                >
                  達成
                </button>
              </div>
            </li>
          ))}
        </ul>

        {/* floating add button */}
        <button
          type="button"
          aria-label="タスク追加"
          className="absolute right-4 bottom-4 w-12 h-12 rounded-full bg-white border shadow flex items-center justify-center text-xl"
        >
          +
        </button>
      </div>
    </Frame>
  );
}
