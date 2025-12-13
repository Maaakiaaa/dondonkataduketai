"use client";

import { useCallback, useEffect, useState } from "react";
import Frame from "@/app/components/Frame";
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
    <Frame active="home">
      <div className="space-y-8 pb-20">
        {/* 自分のID表示（コピー用） */}
        <div className="bg-[#FFE66D] p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-white rounded-full border-4 border-black opacity-20" />
          <p className="font-black text-sm mb-2 flex items-center gap-2">
            <span className="text-xl">🆔</span> あなたのID
          </p>
          <button
            type="button"
            className="bg-white p-3 rounded-lg border-2 border-black font-mono text-xs break-all select-all cursor-pointer hover:bg-gray-50 transition-colors text-left w-full"
            onClick={() => {
              navigator.clipboard.writeText(myId);
              alert("コピーしました！");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                navigator.clipboard.writeText(myId);
                alert("コピーしました！");
              }
            }}
          >
            {myId}
          </button>
          <p className="text-xs text-right mt-2 font-bold opacity-70">
            ※タップしてコピーしてね
          </p>
        </div>

        {/* 申請フォーム */}
        <div className="bg-white p-5 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="font-black text-lg mb-4 flex items-center gap-2">
            <span className="text-2xl">💌</span> フレンド申請
          </h2>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              className="w-full border-2 border-black p-3 rounded-lg focus:outline-none focus:ring-4 focus:ring-[#4ECDC4]/30 font-bold transition-all"
              placeholder="相手のIDをここに貼り付け"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            />
            <button
              type="button"
              onClick={handleRequest}
              disabled={loading}
              className="w-full bg-[#4ECDC4] text-white font-black py-3 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3dbdb4]"
            >
              {loading ? "送信中..." : "申請を送る！"}
            </button>
          </div>
        </div>

        {/* 承認待ちリスト */}
        {requests.length > 0 && (
          <div className="bg-[#FF6B6B] p-5 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="font-black text-lg mb-4 text-white flex items-center gap-2">
              <span className="text-2xl">📬</span> 承認待ち ({requests.length})
            </h2>
            <ul className="space-y-3">
              {requests.map((req) => (
                <li
                  key={req.id}
                  className="bg-white p-3 rounded-lg border-2 border-black flex justify-between items-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  <span className="font-bold truncate mr-2">
                    {req.sender.username}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAccept(req.id)}
                    className="bg-[#FFE66D] text-black px-4 py-1.5 rounded-md border-2 border-black font-black text-xs hover:bg-[#ffd700] active:translate-y-0.5 active:shadow-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
                  >
                    承認する
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* フレンドリスト */}
        <div>
          <h2 className="font-black text-xl mb-4 flex items-center gap-2 pl-2">
            <span className="text-2xl">🤝</span> マブダチ
            <span className="bg-black text-white text-sm px-2 py-0.5 rounded-full ml-1">
              {friends.length}
            </span>
          </h2>

          {friends.length === 0 ? (
            <div className="text-center py-10 text-gray-400 font-bold border-4 border-dashed border-gray-300 rounded-xl bg-gray-50">
              <p className="text-4xl mb-2">😢</p>
              <p>まだ友達がいません...</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {friends.map((f) => (
                <li
                  key={f.friendshipId}
                  className="bg-white p-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-4 hover:translate-x-1 transition-transform"
                >
                  <div className="w-14 h-14 rounded-full border-2 border-black overflow-hidden bg-gray-100 shrink-0 shadow-sm">
                    {f.profile.avatar_url ? (
                      <img
                        src={f.profile.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#4ECDC4] text-white font-black text-2xl">
                        {f.profile.username?.[0] ?? "?"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-lg leading-tight truncate mb-2">
                      {f.profile.username}
                    </p>

                    {/* 達成率バー */}
                    <div className="relative pt-1">
                      <div className="flex justify-between text-xs font-bold mb-1 text-gray-600">
                        <span>達成率</span>
                        <span>{achievementRates[f.profile.id] ?? 0}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-4 border-2 border-black overflow-hidden relative">
                        <div
                          className="bg-[#4ECDC4] h-full transition-all duration-500 ease-out border-r-2 border-black"
                          style={{
                            width: `${achievementRates[f.profile.id] ?? 0}%`,
                          }}
                        />
                        {/* ストライプ模様のオーバーレイ */}
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.3)_25%,rgba(255,255,255,0.3)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.3)_75%,rgba(255,255,255,0.3)_100%)] bg-[length:10px_10px] opacity-50" />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Frame>
  );
}
