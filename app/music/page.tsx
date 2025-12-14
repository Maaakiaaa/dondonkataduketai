"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { getTodos, type Todo } from "@/features/todos/api";
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

interface SpotifyDeviceEvent {
  device_id: string;
}

interface SpotifyErrorEvent {
  message: string;
}

interface SpotifyArtistInfo {
  name: string;
  uri: string;
}

interface SpotifyTrackInfo {
  name: string;
  artists: SpotifyArtistInfo[];
  album: {
    name: string;
  };
}

interface SpotifyPlayerState {
  paused: boolean;
  track_window: {
    current_track: SpotifyTrackInfo;
  };
}

interface SpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(
    event: "ready" | "not_ready",
    callback: (data: SpotifyDeviceEvent) => void,
  ): void;
  addListener(
    event:
      | "initialization_error"
      | "authentication_error"
      | "account_error"
      | "playback_error",
    callback: (data: SpotifyErrorEvent) => void,
  ): void;
  addListener(
    event: "player_state_changed",
    callback: (state: SpotifyPlayerState | null) => void,
  ): void;
  removeListener(event: string): void;
  getCurrentState(): Promise<SpotifyPlayerState | null>;
  setName(name: string): void;
  getVolume(): Promise<number>;
  setVolume(volume: number): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  togglePlay(): Promise<void>;
  seek(position_ms: number): Promise<void>;
  previousTrack(): Promise<void>;
  nextTrack(): Promise<void>;
}

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
  }
}

export default function MusicPage() {
  const genreInputId = useId();
  const taskSelectId = useId();
  const trackSourceId = useId();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tracks, setTracks] = useState<TracksData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPlaylistCreator, setShowPlaylistCreator] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [trackSource, setTrackSource] = useState<"user" | "spotify">("user");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [generatedPlaylist, setGeneratedPlaylist] = useState<Track[] | null>(
    null,
  );
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [createdPlaylistUrl, setCreatedPlaylistUrl] = useState<string | null>(
    null,
  );
  const [createdPlaylistUri, setCreatedPlaylistUri] = useState<string | null>(
    null,
  );
  const [createdPlaylistId, setCreatedPlaylistId] = useState<string | null>(
    null,
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNextAction, setShowNextAction] = useState(false);
  const [_isPlaying, setIsPlaying] = useState(false);
  const [player, setPlayer] = useState<SpotifyPlayer | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrackInfo | null>(
    null,
  );
  const [isPaused, setIsPaused] = useState(false);
  const playerRef = useRef<SpotifyPlayer | null>(null);

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

  const fetchTodos = useCallback(async () => {
    try {
      const todosData = await getTodos();
      // 未完了のタスクのみを取得
      const incompleteTodos = todosData.filter((todo) => !todo.is_completed);
      setTodos(incompleteTodos);
    } catch (err) {
      console.error("タスクの取得に失敗しました:", err);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("authenticated") === "true") {
      setIsAuthenticated(true);
      fetchTracks();
      fetchTodos();
    }
    if (params.get("error")) {
      setError(params.get("error"));
    }
  }, [fetchTracks, fetchTodos]);

  // Spotify Web Playback SDKの初期化
  useEffect(() => {
    if (!isAuthenticated) return;

    // 既存のスクリプトがあれば読み込まない
    if (
      document.querySelector(
        'script[src="https://sdk.scdn.co/spotify-player.js"]',
      )
    ) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;

    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = new window.Spotify.Player({
        name: "どんどん片付け隊 Web Player",
        getOAuthToken: async (cb) => {
          try {
            const response = await fetch("/music/api/token");
            if (response.ok) {
              const data = await response.json();
              cb(data.accessToken);
            } else {
              console.error("Failed to get access token");
              cb("");
            }
          } catch (error) {
            console.error("Error getting access token:", error);
            cb("");
          }
        },
        volume: 0.5,
      });

      spotifyPlayer.addListener("ready", ({ device_id }) => {
        console.log("Ready with Device ID", device_id);
        setDeviceId(device_id);
      });

      spotifyPlayer.addListener("not_ready", ({ device_id }) => {
        console.log("Device ID has gone offline", device_id);
        setDeviceId(null);
      });

      spotifyPlayer.addListener("initialization_error", ({ message }) => {
        console.error("Initialization error:", message);
        setError(
          `プレイヤーの初期化に失敗: ${message}。Spotify Premiumアカウントが必要です。`,
        );
      });

      spotifyPlayer.addListener("authentication_error", ({ message }) => {
        console.error("Authentication error:", message);
        setError(`認証エラー: ${message}。再認証が必要です。`);
      });

      spotifyPlayer.addListener("account_error", ({ message }) => {
        console.error("Account error:", message);
        setError(
          `アカウントエラー: ${message}。Spotify Premiumアカウントが必要です。`,
        );
      });

      spotifyPlayer.addListener("playback_error", ({ message }) => {
        console.error("Playback error:", message);
        setError(`再生エラー: ${message}`);
      });

      spotifyPlayer.addListener("player_state_changed", (state) => {
        if (!state) return;

        setCurrentTrack(state.track_window.current_track);
        setIsPaused(state.paused);

        spotifyPlayer.getCurrentState().then((state) => {
          setIsPlaying(!state ? false : !state.paused);
        });
      });

      spotifyPlayer.connect();
      setPlayer(spotifyPlayer);
      playerRef.current = spotifyPlayer;
    };

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
    };
  }, [isAuthenticated]);

  const handleLogin = async () => {
    try {
      // 既存のCookieをクリア
      // biome-ignore lint/suspicious/noDocumentCookie: ブラウザ側でCookieをクリアする唯一の方法
      document.cookie =
        "spotify_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      // biome-ignore lint/suspicious/noDocumentCookie: ブラウザ側でCookieをクリアする唯一の方法
      document.cookie =
        "spotify_refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

      const response = await fetch("/music/api/login");
      const data = await response.json();
      window.location.href = data.url;
    } catch (err) {
      setError("ログインに失敗しました");
      console.error(err);
    }
  };

  const handleReauth = async () => {
    // プレイヤーを切断
    if (playerRef.current) {
      try {
        playerRef.current.disconnect();
      } catch (e) {
        console.error("Error disconnecting player:", e);
      }
      playerRef.current = null;
    }

    // 状態をリセット
    setPlayer(null);
    setDeviceId(null);
    setIsAuthenticated(false);
    setError(null);

    // Cookieをクリア
    // biome-ignore lint/suspicious/noDocumentCookie: ブラウザ側でCookieをクリアする唯一の方法
    document.cookie =
      "spotify_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    // biome-ignore lint/suspicious/noDocumentCookie: ブラウザ側でCookieをクリアする唯一の方法
    document.cookie =
      "spotify_refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    // 少し待ってから再認証
    setTimeout(() => {
      handleLogin();
    }, 500);
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
    if (taskId) {
      const selectedTask = todos.find((todo) => todo.id === taskId);
      if (selectedTask) {
        setDurationMinutes(selectedTask.estimated_time);
      }
    }
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
        body: JSON.stringify({
          durationMinutes,
          genre: selectedGenre || undefined,
          trackSource,
        }),
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
      setCreatedPlaylistUri(data.playlistUri);
      setCreatedPlaylistId(data.playlistId);
      setGeneratedPlaylist(null);

      // プレイリストを作成したら自動的に再生
      if (data.playlistUri && deviceId) {
        setTimeout(() => {
          handlePlayPlaylist(data.playlistUri);
        }, 500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setPlaylistLoading(false);
    }
  };

  const handlePlayPlaylist = async (playlistUri?: string) => {
    const uriToPlay = playlistUri || createdPlaylistUri;

    if (!uriToPlay || !deviceId) {
      setError(
        deviceId
          ? "再生するプレイリストがありません。まず「Spotifyに保存」をクリックしてください。"
          : "プレイヤーの準備ができていません。少々お待ちください。",
      );
      return;
    }

    setError(null);

    try {
      const response = await fetch("/music/api/play-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistUri: uriToPlay,
          deviceId: deviceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "再生に失敗しました");
      }

      const data = await response.json();
      console.log("Playback started:", data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  const handleTogglePlay = async () => {
    if (!player) return;

    try {
      await player.togglePlay();
    } catch (err) {
      console.error("Toggle play error:", err);
    }
  };

  const handleNextTrack = async () => {
    if (!player) return;

    try {
      await player.nextTrack();
    } catch (err) {
      console.error("Next track error:", err);
    }
  };

  const handlePreviousTrack = async () => {
    if (!player) return;

    try {
      await player.previousTrack();
    } catch (err) {
      console.error("Previous track error:", err);
    }
  };

  const handleFinishTask = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeletePlaylist = async () => {
    if (!createdPlaylistId) {
      setShowDeleteConfirm(false);
      setShowNextAction(true);
      return;
    }

    try {
      const response = await fetch("/music/api/delete-playlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId: createdPlaylistId }),
      });

      if (!response.ok) {
        throw new Error("プレイリストの削除に失敗しました");
      }

      setShowDeleteConfirm(false);
      setShowNextAction(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setShowDeleteConfirm(false);
      setShowNextAction(true);
    }
  };

  const handleKeepPlaylist = () => {
    setShowDeleteConfirm(false);
    setShowNextAction(true);
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  const handleCreateAnother = () => {
    setCreatedPlaylistUrl(null);
    setCreatedPlaylistUri(null);
    setCreatedPlaylistId(null);
    setShowNextAction(false);
    setSelectedTaskId("");
    setSelectedGenre("");
    setGeneratedPlaylist(null);
  };

  return (
    <Frame active="music">
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Music</h2>

        {error && (
          <div className="rounded-md border border-red-500 bg-red-50 p-3 text-sm text-red-600">
            <p className="font-semibold mb-1">エラーが発生しました</p>
            <p className="text-xs mb-2">{error}</p>
            {(error.includes("認証") ||
              error.includes("Premium") ||
              error.includes("Authentication") ||
              error.includes("account")) && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleReauth}
                  className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                >
                  再認証する
                </button>
                {error.includes("Premium") && (
                  <a
                    href="https://www.spotify.com/premium/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  >
                    Premium詳細
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {!isAuthenticated ? (
          <div className="mt-2 rounded-md border p-3">
            <p className="text-sm mb-3">
              お気に入りのプレイリストを流して片付けを楽しくしましょう。
            </p>
            <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-xs text-yellow-800 mb-3">
              <p className="font-semibold mb-1">⚠️ 重要な要件</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Spotify Premiumアカウントが必要です</li>
                <li>ブラウザ内で音楽を再生できます</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={handleLogin}
              className="w-full rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
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
                  setIsPlaying(false);
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                戻る
              </button>
            </div>

            {createdPlaylistUrl ? (
              <div className="space-y-3">
                {showDeleteConfirm ? (
                  <div className="rounded-md border border-red-500 bg-red-50 p-4">
                    <p className="mb-3 text-sm font-semibold text-red-700">
                      作成したプレイリストを削除しますか？
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleDeletePlaylist}
                        className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                      >
                        はい
                      </button>
                      <button
                        type="button"
                        onClick={handleKeepPlaylist}
                        className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
                      >
                        いいえ
                      </button>
                    </div>
                  </div>
                ) : showNextAction ? (
                  <div className="rounded-md border border-blue-500 bg-blue-50 p-4">
                    <p className="mb-3 text-sm font-semibold text-blue-700">
                      お疲れさまでした！！
                    </p>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleGoHome}
                        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                      >
                        ホーム画面に戻る
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateAnother}
                        className="w-full rounded-md bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700"
                      >
                        別のタスクをやる
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border border-green-500 bg-green-50 p-4">
                      <p className="mb-2 text-sm font-semibold text-green-700">
                        ✅ プレイリストを作成して再生を開始しました！
                      </p>
                      <div className="flex flex-col gap-2">
                        <a
                          href={createdPlaylistUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-center text-sm text-blue-600 hover:underline"
                        >
                          Spotifyアプリで開く →
                        </a>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleFinishTask}
                      className="w-full rounded-md bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
                    >
                      タスク終了
                    </button>
                  </>
                )}

                {!showDeleteConfirm && !showNextAction && currentTrack && (
                  <div className="rounded-md border bg-white p-4 shadow-sm">
                    <div className="mb-3">
                      <p className="text-xs text-zinc-500">再生中</p>
                      <p className="font-semibold">{currentTrack.name}</p>
                      <p className="text-sm text-zinc-600">
                        {currentTrack.artists
                          .map((artist) => artist.name)
                          .join(", ")}
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-4">
                      <button
                        type="button"
                        onClick={handlePreviousTrack}
                        className="rounded-full p-2 hover:bg-zinc-100"
                        aria-label="前の曲"
                      >
                        <svg
                          className="h-6 w-6"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                          role="img"
                          aria-label="前の曲"
                        >
                          <title>前の曲</title>
                          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={handleTogglePlay}
                        className="rounded-full bg-green-600 p-3 text-white hover:bg-green-700"
                        aria-label={isPaused ? "再生" : "一時停止"}
                      >
                        {isPaused ? (
                          <svg
                            className="h-6 w-6"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            role="img"
                            aria-label="再生"
                          >
                            <title>再生</title>
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        ) : (
                          <svg
                            className="h-6 w-6"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            role="img"
                            aria-label="一時停止"
                          >
                            <title>一時停止</title>
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                          </svg>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleNextTrack}
                        className="rounded-full p-2 hover:bg-zinc-100"
                        aria-label="次の曲"
                      >
                        <svg
                          className="h-6 w-6"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                          role="img"
                          aria-label="次の曲"
                        >
                          <title>次の曲</title>
                          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {todos.length === 0 ? (
                  <div className="rounded-md border border-amber-500 bg-amber-50 p-4">
                    <p className="text-sm text-amber-800 mb-2 font-semibold">
                      タスクがありません
                    </p>
                    <p className="text-xs text-amber-700">
                      プレイリストを作成するには、まずタスクを追加してください。タスクの所要時間に基づいてプレイリストが作成されます。
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border p-4 space-y-4">
                    <div>
                      <label
                        htmlFor={taskSelectId}
                        className="block text-sm font-medium"
                      >
                        タスクを選択
                      </label>
                      <select
                        id={taskSelectId}
                        value={selectedTaskId}
                        onChange={(e) => handleTaskSelect(e.target.value)}
                        className="mt-2 w-full rounded-md border p-2"
                      >
                        <option value="">タスクを選択してください</option>
                        {todos.map((todo) => (
                          <option key={todo.id} value={todo.id}>
                            {todo.title} ({todo.estimated_time}分)
                          </option>
                        ))}
                      </select>
                      {selectedTaskId && (
                        <p className="mt-1 text-xs text-blue-600">
                          ✓ プレイリストの長さ: {durationMinutes}分
                        </p>
                      )}
                    </div>

                    <fieldset>
                      <legend className="block text-sm font-medium mb-2">
                        楽曲の選択元
                      </legend>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            id={`${trackSourceId}-user`}
                            name="trackSource"
                            value="user"
                            checked={trackSource === "user"}
                            onChange={(e) =>
                              setTrackSource(
                                e.target.value as "user" | "spotify",
                              )
                            }
                            className="w-4 h-4"
                          />
                          <span className="text-sm">
                            マイライブラリ（お気に入り・よく聴く曲）
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            id={`${trackSourceId}-spotify`}
                            name="trackSource"
                            value="spotify"
                            checked={trackSource === "spotify"}
                            onChange={(e) =>
                              setTrackSource(
                                e.target.value as "user" | "spotify",
                              )
                            }
                            className="w-4 h-4"
                          />
                          <span className="text-sm">
                            Spotify全体（全楽曲からAIが選択）
                          </span>
                        </label>
                      </div>
                      {trackSource === "spotify" && selectedGenre === "" && (
                        <p className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                          ⚠️
                          ジャンルを指定しないと、AIが幅広い楽曲から選択します。好みに合わせてジャンルを選択することをおすすめします。
                        </p>
                      )}
                    </fieldset>

                    <div>
                      <label
                        htmlFor={genreInputId}
                        className="block text-sm font-medium"
                      >
                        ジャンル（任意）
                      </label>
                      <select
                        id={genreInputId}
                        value={selectedGenre}
                        onChange={(e) => setSelectedGenre(e.target.value)}
                        className="mt-2 w-full rounded-md border p-2"
                      >
                        <option value="">すべて</option>
                        <option value="ジャズ">ジャズ</option>
                        <option value="J-POP">J-POP</option>
                        <option value="アニソン">アニソン</option>
                        <option value="ロック">ロック</option>
                        <option value="クラシック">クラシック</option>
                        <option value="EDM">EDM</option>
                        <option value="ヒップホップ">ヒップホップ</option>
                        <option value="R&B">R&B</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleGeneratePlaylist}
                      disabled={playlistLoading || !selectedTaskId}
                      className="w-full rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:bg-gray-400"
                    >
                      {playlistLoading ? "生成中..." : "プレイリストを生成"}
                    </button>
                  </div>
                )}

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
                      disabled={playlistLoading || !deviceId}
                      className="w-full rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:bg-gray-400"
                    >
                      {playlistLoading
                        ? "作成中..."
                        : !deviceId
                          ? "プレイヤー準備中..."
                          : "Spotifyに保存して再生"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            <div className="mt-2 rounded-md border p-3">
              {!deviceId && (
                <div className="mt-2 rounded-md bg-blue-50 border border-blue-200 p-2 text-xs text-blue-800">
                  🎵 プレイヤーを準備中...
                  {error?.includes("Premium") && (
                    <span className="block mt-1 text-red-600">
                      ⚠️ Spotify Premiumアカウントが必要です
                    </span>
                  )}
                </div>
              )}
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
