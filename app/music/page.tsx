"use client";

import { useCallback, useEffect, useState } from "react";
import Frame from "../components/Frame";

interface Track {
  id: string;
  name: string;
  artists: string[];
  album: string;
  duration_ms: number;
  uri: string;
}

interface TracksData {
  saved: Track[];
  top: Track[];
}

export default function MusicPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tracks, setTracks] = useState<TracksData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTracks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/music/api/tracks");
      if (!response.ok) {
        throw new Error("楽曲情報の取得に失敗しました");
      }
      const data = await response.json();
      setTracks(data);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("authenticated") === "true") {
      setIsAuthenticated(true);
      fetchTracks();
    }
    if (params.get("error")) {
      setError(params.get("error"));
    }
  }, [fetchTracks]);

  const handleLogin = async () => {
    try {
      const response = await fetch("/music/api/login");
      const data = await response.json();
      window.location.href = data.url;
    } catch (err) {
      setError("ログインに失敗しました");
      console.error(err);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <Frame active="music">
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Music</h2>

        {error && (
          <div className="rounded-md border border-red-500 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!isAuthenticated ? (
          <div className="mt-2 rounded-md border p-3">
            <p className="text-sm">
              お気に入りのプレイリストを流して片付けを楽しくしましょう。
            </p>
            <button
              type="button"
              onClick={handleLogin}
              className="mt-3 w-full rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              Spotifyと連携する
            </button>
          </div>
        ) : (
          <>
            <div className="mt-2 rounded-md border p-3">
              <p className="text-sm">
                お気に入りのプレイリストを流して片付けを楽しくしましょう。
              </p>
              <button
                type="button"
                onClick={fetchTracks}
                disabled={loading}
                className="mt-3 w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? "読み込み中..." : "楽曲情報を更新"}
              </button>
            </div>

            {tracks && (
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-sm font-semibold">
                    お気に入りの曲 ({tracks.saved.length}曲)
                  </h3>
                  <div className="space-y-2">
                    {tracks.saved.slice(0, 10).map((track) => (
                      <div
                        key={track.id}
                        className="rounded-md border p-3 text-sm"
                      >
                        <div className="font-medium">{track.name}</div>
                        <div className="text-xs text-zinc-500">
                          {track.artists.join(", ")} • {track.album} •{" "}
                          {formatDuration(track.duration_ms)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">
                    よく聴く曲 ({tracks.top.length}曲)
                  </h3>
                  <div className="space-y-2">
                    {tracks.top.slice(0, 10).map((track) => (
                      <div
                        key={track.id}
                        className="rounded-md border p-3 text-sm"
                      >
                        <div className="font-medium">{track.name}</div>
                        <div className="text-xs text-zinc-500">
                          {track.artists.join(", ")} • {track.album} •{" "}
                          {formatDuration(track.duration_ms)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Frame>
  );
}
