"use client";

import { useId, useState } from "react";
import Frame from "../../components/Frame";

export default function FriendsPage() {
  const id = useId();
  const [query, setQuery] = useState("");

  const friends = Array.from({ length: 8 }).map((_, i) => ({
    id: i + 1,
    name: `@user_id${i + 1}`,
  }));

  const filtered = friends.filter(
    (f) => f.name.includes(query) || query === "",
  );

  return (
    <Frame active="home">
      <div className="p-4">
        <h2 className="text-lg font-medium mb-3">フレンド検索</h2>

        <label htmlFor={`friend-search-${id}`} className="sr-only">
          フレンド検索
        </label>
        <div className="mb-4">
          <input
            id={`friend-search-${id}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍"
            className="w-full border border-zinc-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-300"
          />
        </div>

        <div className="space-y-4">
          {filtered.map((f) => (
            <div key={f.id} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-zinc-300 flex items-center justify-center bg-white" />
              <div className="text-sm">{f.name}</div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-sm text-zinc-500 text-center py-8">
              該当するフレンドがいません
            </div>
          )}

          <div className="flex justify-center pt-6">
            <div className="text-zinc-500">・</div>
            <div className="mx-3 text-zinc-500">・</div>
            <div className="text-zinc-500">・</div>
          </div>
        </div>
      </div>
    </Frame>
  );
}
