"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import {
  acceptFriendRequest,
  getAchievementRate,
  getFriends,
  getPendingRequests,
  requestFriend,
} from "@/features/friendship/api";

export default function FriendsPage() {
  const [myId, setMyId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [achievementRates, setAchievementRates] = useState<
    Record<string, number>
  >({});

  // データの再取得
  const fetchData = useCallback(async (userId: string) => {
    try {
      const f = await getFriends(userId);
      setFriends(f);

      // 各フレンドの達成率を取得
      const rates: Record<string, number> = {};
      for (const friend of f) {
        try {
          const rate = await getAchievementRate(friend.profile.id);
          rates[friend.profile.id] = rate;
        } catch (e) {
          console.error(`達成率取得失敗: ${friend.profile.id}`, e);
          rates[friend.profile.id] = 0;
        }
      }
      setAchievementRates(rates);

      const r = await getPendingRequests(userId);
      setRequests(r);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // 1. 初期化
  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return alert("ログインして");
      setMyId(user.id);
      fetchData(user.id);
    };
    init();
  }, [fetchData]);

  // 2. フレンド申請を送る
  const handleRequest = async () => {
    if (!targetId) return alert("相手のIDを入れて！");
    if (targetId === myId) return alert("自分とは友達になれません（悲しいね）");

    setLoading(true);
    try {
      await requestFriend(myId, targetId);
      alert("申請しました！相手の画面で確認してね");
      setTargetId("");
    } catch (e) {
      alert("申請失敗: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 3. 申請を承認する
  const handleAccept = async (friendshipId: string) => {
    try {
      await acceptFriendRequest(friendshipId);
      alert("友達になりました！");
      fetchData(myId); // リスト更新
    } catch (e) {
      alert("承認失敗");
    }
  };

  return (
    <main className="max-w-md mx-auto p-6 bg-gray-50 min-h-screen">
      {/* 自分のID表示（コピー用） */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <p className="text-sm text-gray-500">
          あなたのID (これを相手に教えてね)
        </p>
        <code className="block bg-gray-100 p-2 mt-1 select-all text-xs break-all">
          {myId}
        </code>
      </div>

      {/* 申請フォーム */}
      <div className="mb-8 border-b pb-6">
        <h2 className="font-bold mb-2">フレンド申請を送る</h2>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 border p-2 rounded text-sm"
            placeholder="相手のIDをここに貼り付け"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          />
          <button
            type="button"
            onClick={handleRequest}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            申請
          </button>
        </div>
      </div>

      {/* 承認待ちリスト */}
      <div className="mb-8">
        <h2 className="font-bold mb-2 text-orange-600">
          承認待ち ({requests.length})
        </h2>
        {requests.length === 0 && (
          <p className="text-sm text-gray-400">届いていません</p>
        )}
        <ul className="space-y-2">
          {requests.map((req) => (
            <li
              key={req.id}
              className="bg-orange-50 p-3 rounded flex justify-between items-center"
            >
              <span className="font-bold">{req.sender.username}</span>
              <button
                type="button"
                onClick={() => handleAccept(req.id)}
                className="bg-orange-500 text-white px-3 py-1 rounded text-xs"
              >
                承認する
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* フレンドリスト */}
      <div>
        <h2 className="font-bold mb-2 text-green-600">
          マブダチ ({friends.length})
        </h2>
        {friends.length === 0 && (
          <p className="text-sm text-gray-400">友達がいません...</p>
        )}
        <ul className="space-y-2">
          {friends.map((f) => (
            <li
              key={f.friendshipId}
              className="bg-white p-3 rounded shadow-sm flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
                {/* アイコンがあれば表示、なければグレー */}
                {f.profile.avatar_url ? (
                  <Image
                    src={f.profile.avatar_url}
                    alt=""
                    width={32}
                    height={32}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">{f.profile.username}</p>
                <p className="text-xs text-gray-400">
                  ID: {f.profile.id.slice(0, 8)}...
                </p>
                {/* 達成率を表示 */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${achievementRates[f.profile.id] ?? 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-600">
                    {achievementRates[f.profile.id] ?? 0}%
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
