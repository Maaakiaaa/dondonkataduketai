"use client";

import { useCallback, useEffect, useId, useState } from "react";
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
  const durationInputId = useId();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tracks, setTracks] = useState<TracksData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPlaylistCreator, setShowPlaylistCreator] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [generatedPlaylist, setGeneratedPlaylist] = useState<Track[] | null>(
    null,
  );
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [createdPlaylistUrl, setCreatedPlaylistUrl] = useState<string | null>(
    null,
  );

  const fetchTracks = useCallback(async () => {
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

  const handleGeneratePlaylist = async () => {
    setPlaylistLoading(true);
    setError(null);
    setGeneratedPlaylist(null);
    setCreatedPlaylistUrl(null);

    try {
      const response = await fetch("/music/api/generate-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationMinutes }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error(errorData.details || "プレイリスト生成に失敗しました");
      }

      const data = await response.json();
      setGeneratedPlaylist(data.tracks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setPlaylistLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!generatedPlaylist || generatedPlaylist.length === 0) {
      setError("プレイリストが生成されていません");
      return;
    }

    setPlaylistLoading(true);
    setError(null);

    try {
      const trackUris = generatedPlaylist.map((track) => track.uri);
      const totalMinutes = Math.floor(
        generatedPlaylist.reduce((sum, track) => sum + track.duration_ms, 0) /
          60000,
      );

      const response = await fetch("/music/api/create-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `AI Playlist ${totalMinutes}分`,
          description: `Gemini AIが生成した${totalMinutes}分のプレイリスト`,
          trackUris,
        }),
      });

      if (!response.ok) {
        throw new Error("Spotifyプレイリスト作成に失敗しました");
      }

      const data = await response.json();
      setCreatedPlaylistUrl(data.playlistUrl);
      setGeneratedPlaylist(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setPlaylistLoading(false);
    }
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
        ) : showPlaylistCreator ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">プレイリスト作成</h3>
              <button
                type="button"
                onClick={() => {
                  setShowPlaylistCreator(false);
                  setGeneratedPlaylist(null);
                  setCreatedPlaylistUrl(null);
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                戻る
              </button>
            </div>

            {createdPlaylistUrl ? (
              <div className="rounded-md border border-green-500 bg-green-50 p-4">
                <p className="mb-2 text-sm font-semibold text-green-700">
                  プレイリストを作成しました！
                </p>
                <a
                  href={createdPlaylistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Spotifyで開く
                </a>
              </div>
            ) : (
              <>
                <div className="rounded-md border p-4">
                  <label
                    htmlFor={durationInputId}
                    className="block text-sm font-medium"
                  >
                    プレイリストの長さ（分）
                  </label>
                  <input
                    id={durationInputId}
                    type="number"
                    min="5"
                    max="180"
                    value={durationMinutes}
                    onChange={(e) =>
                      setDurationMinutes(Number.parseInt(e.target.value, 10))
                    }
                    className="mt-2 w-full rounded-md border p-2"
                  />
                  <button
                    type="button"
                    onClick={handleGeneratePlaylist}
                    disabled={playlistLoading}
                    className="mt-3 w-full rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:bg-gray-400"
                  >
                    {playlistLoading ? "生成中..." : "プレイリストを生成"}
                  </button>
                </div>

                {generatedPlaylist && generatedPlaylist.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">
                        生成されたプレイリスト ({generatedPlaylist.length}曲)
                      </h4>
                      <span className="text-xs text-zinc-500">
                        合計:{" "}
                        {formatDuration(
                          generatedPlaylist.reduce(
                            (sum, track) => sum + track.duration_ms,
                            0,
                          ),
                        )}
                      </span>
                    </div>
                    <div className="max-h-96 space-y-2 overflow-y-auto">
                      {generatedPlaylist.map((track) => (
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
                    <button
                      type="button"
                      onClick={handleCreatePlaylist}
                      disabled={playlistLoading}
                      className="w-full rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:bg-gray-400"
                    >
                      {playlistLoading ? "作成中..." : "Spotifyに保存"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            <div className="mt-2 rounded-md border p-3">
              <p className="text-sm">
                お気に入りのプレイリストを流して片付けを楽しくしましょう。
              </p>
              <button
                type="button"
                onClick={() => setShowPlaylistCreator(true)}
                className="mt-3 w-full rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
              >
                AIプレイリストを作成
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
