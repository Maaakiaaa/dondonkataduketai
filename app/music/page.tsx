"use client";

import { Titillium_Web } from "next/font/google";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiDisc,
  FiHeadphones,
  FiList,
  FiMusic,
  FiPause,
  FiPlay,
  FiSkipBack,
  FiSkipForward,
} from "react-icons/fi";
import {
  getTodos,
  type Todo,
  toggleTodoCompletion,
} from "@/features/todos/api";
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
    images: { url: string; height: number; width: number }[];
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
  const [aiSuggestion, setAiSuggestion] = useState<{
    taskId: string;
    taskTitle: string;
    estimatedTime: number;
    dueAt: string | null;
    reason: string;
  } | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
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
    if (playerRef.current) {
      try {
        playerRef.current.disconnect();
      } catch (e) {
        console.error("Error disconnecting player:", e);
      }
      playerRef.current = null;
    }

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
    setAiSuggestion(null); // 手動選択時は提案をクリア
    if (taskId) {
      const selectedTask = todos.find((todo) => todo.id === taskId);
      if (selectedTask) {
        setDurationMinutes(selectedTask.estimated_time);
      }
    }
  };

  const handleGetAiSuggestion = async () => {
    setSuggestionLoading(true);
    setError(null);
    setAiSuggestion(null);

    try {
      const response = await fetch("/music/api/suggest-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: todos }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "タスク提案に失敗しました");
      }

      const data = await response.json();

      if (data.suggestion) {
        setAiSuggestion(data.suggestion);
        // 提案されたタスクを自動選択
        setSelectedTaskId(data.suggestion.taskId);
        setDurationMinutes(data.suggestion.estimatedTime);
      } else {
        setError(data.message || "提案できるタスクがありません");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSuggestionLoading(false);
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

  const handleFinishTask = async () => {
    // プレイリストの再生を停止
    if (player) {
      try {
        await player.pause();
      } catch (err) {
        console.error("Failed to pause player:", err);
      }
    }

    // タスクを完了としてマーク
    if (selectedTaskId) {
      try {
        await toggleTodoCompletion(selectedTaskId, true);
        // タスクリストを更新
        await fetchTodos();
      } catch (err) {
        console.error("タスクの完了処理に失敗しました:", err);
        setError("タスクの完了処理に失敗しました");
      }
    }

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
      <div className="flex flex-col gap-6">
        <section>
          {error && (
            <div className="rounded-xl border-4 border-black bg-[#FF6B6B] p-4 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6">
              <div className="flex items-center gap-2 mb-2">
                <FiAlertTriangle size={24} className="flex-shrink-0" />
                <p className="font-black text-lg">エラー発生！</p>
              </div>
              <p className="font-bold text-sm mb-4">{error}</p>
              {(error.includes("認証") ||
                error.includes("Premium") ||
                error.includes("Authentication") ||
                error.includes("account")) && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleReauth}
                    className="text-xs bg-white text-black border-2 border-black font-bold px-3 py-2 rounded hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 transition-all"
                  >
                    再認証する
                  </button>
                  {error.includes("Premium") && (
                    <a
                      href="https://www.spotify.com/premium/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-[#1DB954] text-white border-2 border-black font-bold px-3 py-2 rounded hover:bg-[#1ed760] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 transition-all"
                    >
                      Premium詳細
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {!isAuthenticated ? (
            <div className="p-6 border-4 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white text-center">
              <div className="w-20 h-20 bg-[#1DB954] rounded-full mx-auto mb-4 border-4 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <FiHeadphones size={40} className="text-white" />
              </div>
              <h3 className="text-xl font-black mb-2">
                音楽でテンション上げましょう！
              </h3>
              <p className="font-bold text-gray-600 mb-6">
                Spotifyと連携して、タスク片付け専用の最強プレイリストを爆誕させます。
              </p>

              <div className="bg-[#FFF3E0] border-4 border-black border-dashed rounded-lg p-4 text-sm text-left mb-6 font-bold text-[#E65100]">
                <p className="mb-2">⚠️ 重要</p>
                <ul className="list-disc list-inside space-y-1 font-medium">
                  <li>Spotify Premiumアカウント</li>
                  <li>ブラウザ内で音楽を再生できます</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleLogin}
                className="w-full text-lg font-black bg-[#1DB954] text-white border-4 border-black rounded-xl py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all"
              >
                Spotifyと連携スタート
              </button>
            </div>
          ) : showPlaylistCreator ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black border-b-4 border-[#4ECDC4] inline-block">
                  プレイリスト作成
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowPlaylistCreator(false);
                    setGeneratedPlaylist(null);
                    setCreatedPlaylistUrl(null);
                    setIsPlaying(false);
                  }}
                  className="font-bold text-sm border-2 border-black bg-white px-3 py-1 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 active:shadow-none transition-all"
                >
                  戻る
                </button>
              </div>

              {createdPlaylistUrl ? (
                <div className="space-y-4">
                  {showDeleteConfirm ? (
                    <div className="rounded-xl border-4 border-black bg-[#FF6B6B] p-6 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <p className="mb-4 text-lg font-black text-center">
                        今回作ったプレイリスト、
                        <br />
                        削除しちゃいますか？
                      </p>
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={handleDeletePlaylist}
                          className="flex-1 rounded-lg bg-white border-4 border-black text-black font-black py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100 active:translate-y-1 active:shadow-none transition-all"
                        >
                          消す！
                        </button>
                        <button
                          type="button"
                          onClick={handleKeepPlaylist}
                          className="flex-1 rounded-lg bg-black border-4 border-white text-white font-black py-3 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.5)] hover:bg-gray-800 active:translate-y-1 active:shadow-none transition-all"
                        >
                          残す！
                        </button>
                      </div>
                    </div>
                  ) : showNextAction ? (
                    <div className="rounded-xl border-4 border-black bg-[#4ECDC4] p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <p className="mb-4 text-xl font-black text-center text-white drop-shadow-md">
                        お疲れ様でした！！🎉
                      </p>
                      <div className="flex flex-col gap-3">
                        <button
                          type="button"
                          onClick={handleGoHome}
                          className="w-full rounded-xl bg-white border-4 border-black px-4 py-3 text-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all"
                        >
                          ホームに戻る
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateAnother}
                          className="w-full rounded-xl bg-[#9D4EDD] border-4 border-black px-4 py-3 text-white font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all"
                        >
                          別のタスクをやる
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-xl border-4 border-black bg-[#1DB954] p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <p className="mb-2 text-white font-black text-center flex items-center justify-center gap-2">
                          <FiCheckCircle size={24} />
                          再生スタート！
                        </p>
                        <a
                          href={createdPlaylistUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-center text-xs font-bold text-white underline hover:text-gray-100"
                        >
                          Spotifyアプリで開く →
                        </a>
                      </div>

                      <button
                        type="button"
                        onClick={handleFinishTask}
                        className="w-full rounded-xl bg-[#FF9F1C] border-4 border-black px-4 py-4 text-white font-black text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all animate-bounce"
                      >
                        タスク完了！
                      </button>
                    </>
                  )}

                  {!showDeleteConfirm && !showNextAction && currentTrack && (
                    <div className="rounded-xl border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <div className="flex gap-4 mb-4">
                        {currentTrack.album.images &&
                        currentTrack.album.images.length > 0 ? (
                          <div className="flex-shrink-0">
                            <img
                              src={currentTrack.album.images[0].url}
                              alt={`${currentTrack.album.name} アルバムアート`}
                              className="w-24 h-24 rounded-lg border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-24 h-24 rounded-lg border-4 border-black bg-gray-200 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <FiMusic size={40} className="text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="inline-block px-2 py-0.5 bg-black text-white text-xs font-bold rounded mb-2">
                            NOW PLAYING
                          </div>
                          <p className="font-black text-xl truncate">
                            {currentTrack.name}
                          </p>
                          <p className="font-bold text-gray-500 truncate">
                            {currentTrack.artists
                              .map((artist) => artist.name)
                              .join(", ")}
                          </p>
                          <p className="text-xs font-bold text-gray-400 truncate mt-1">
                            {currentTrack.album.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-6">
                        <button
                          type="button"
                          onClick={handlePreviousTrack}
                          className="p-3 border-2 border-black rounded-full hover:bg-gray-100 transition-colors bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none"
                          aria-label="前の曲"
                        >
                          <FiSkipBack size={20} />
                        </button>
                        <button
                          type="button"
                          onClick={handleTogglePlay}
                          className="p-4 bg-[#4ECDC4] border-4 border-black rounded-full text-black hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                          aria-label={isPaused ? "再生" : "一時停止"}
                        >
                          {isPaused ? (
                            <FiPlay size={32} className="ml-1" />
                          ) : (
                            <FiPause size={32} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleNextTrack}
                          className="p-3 border-2 border-black rounded-full hover:bg-gray-100 transition-colors bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none"
                          aria-label="次の曲"
                        >
                          <FiSkipForward size={20} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {todos.length === 0 ? (
                    <div className="rounded-xl border-4 border-black border-dashed bg-gray-50 p-6 text-center">
                      <p className="font-black text-gray-500 mb-2">
                        タスクがありません 😴
                      </p>
                      <p className="text-sm font-bold text-gray-400">
                        プレイリストを作るには、
                        <br />
                        まずホームでタスクを追加してください。
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border-4 border-black p-5 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-5">
                      <div>
                        <label
                          htmlFor={taskSelectId}
                          className="block text-sm font-black mb-2 flex items-center gap-2"
                        >
                          <FiList />
                          どのタスクをやる？
                        </label>
                        <div className="relative">
                          <select
                            id={taskSelectId}
                            value={selectedTaskId}
                            onChange={(e) => handleTaskSelect(e.target.value)}
                            className="w-full appearance-none rounded-lg border-2 border-black bg-gray-50 p-3 font-bold focus:ring-0 focus:border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                          >
                            <option value="">選択してください...</option>
                            {todos.map((todo) => (
                              <option key={todo.id} value={todo.id}>
                                {todo.title} ({todo.estimated_time}分)
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-black">
                            <svg
                              className="h-4 w-4 fill-current"
                              viewBox="0 0 20 20"
                            >
                              <title>選択アイコン</title>
                              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                            </svg>
                          </div>
                        </div>
                        {selectedTaskId && !aiSuggestion && (
                          <p className="mt-2 text-xs font-black text-[#4ECDC4] bg-black inline-block px-2 py-1 rounded text-white transform rotate-1">
                            目標タイム(プレイリストの長さ): {durationMinutes}分
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={handleGetAiSuggestion}
                          disabled={suggestionLoading || todos.length === 0}
                          className="mt-2 text-xs font-black bg-gradient-to-r from-[#9D4EDD] to-[#FF6B6B] text-white border-2 border-black rounded-lg px-3 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {suggestionLoading
                            ? "AI分析中..."
                            : "🤖 AIにおすすめタスクを聞く"}
                        </button>
                      </div>

                      {aiSuggestion && (
                        <div className="rounded-xl border-4 border-[#9D4EDD] bg-gradient-to-br from-[#9D4EDD]/10 to-[#FF6B6B]/10 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                          <div className="flex items-start gap-2 mb-2">
                            <span className="text-2xl">🤖</span>
                            <div className="flex-1">
                              <p className="text-xs font-black text-[#9D4EDD] mb-1">
                                AIのおすすめ
                              </p>
                              <p className="font-black text-base mb-1">
                                {aiSuggestion.taskTitle}
                              </p>
                              <p className="text-xs font-bold text-gray-600 mb-2">
                                所要時間: {aiSuggestion.estimatedTime}分
                                {aiSuggestion.dueAt && (
                                  <>
                                    {" "}
                                    | 期限:{" "}
                                    {new Date(
                                      aiSuggestion.dueAt,
                                    ).toLocaleDateString("ja-JP")}
                                  </>
                                )}
                              </p>
                              <div className="bg-white border-2 border-black rounded-lg p-2">
                                <p className="text-xs font-bold text-gray-700">
                                  💡 {aiSuggestion.reason}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <fieldset className="border-2 border-black rounded-lg p-3 relative">
                        <legend className="text-sm font-black px-2 bg-white absolute -top-3 left-2 border-2 border-black rounded">
                          選曲ソース
                        </legend>
                        <div className="space-y-3 mt-2">
                          <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-gray-100 transition-colors">
                            <div className="relative flex items-center">
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
                                className="peer sr-only"
                              />
                              <div className="w-5 h-5 border-2 border-black rounded-full bg-white peer-checked:bg-black transition-all" />
                            </div>
                            <span className="text-sm font-bold">
                              マイライブラリ
                              <span className="block text-xs font-normal text-gray-500">
                                お気に入り・よく聴く曲から
                              </span>
                            </span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-gray-100 transition-colors">
                            <div className="relative flex items-center">
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
                                className="peer sr-only"
                              />
                              <div className="w-5 h-5 border-2 border-black rounded-full bg-white peer-checked:bg-black transition-all" />
                            </div>
                            <span className="text-sm font-bold">
                              Spotify全体
                              <span className="block text-xs font-normal text-gray-500">
                                AIが全楽曲からセレクト
                              </span>
                            </span>
                          </label>
                        </div>
                      </fieldset>

                      {trackSource === "spotify" && selectedGenre === "" && (
                        <p className="text-xs font-bold text-[#E65100] bg-[#FFF3E0] p-2 rounded border-2 border-[#E65100] border-dashed">
                          ⚠️
                          ジャンルを指定しないと、カオスな選曲になる可能性があります。
                        </p>
                      )}

                      <div>
                        <label
                          htmlFor={genreInputId}
                          className="block text-sm font-black mb-2 flex items-center gap-2"
                        >
                          <FiDisc />
                          ジャンル (気分)
                        </label>
                        <div className="relative">
                          <select
                            id={genreInputId}
                            value={selectedGenre}
                            onChange={(e) => setSelectedGenre(e.target.value)}
                            className="w-full appearance-none rounded-lg border-2 border-black bg-gray-50 p-3 font-bold focus:ring-0 focus:border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                          >
                            <option value="">なんでもOK！</option>
                            <option value="ジャズ">ジャズ</option>
                            <option value="J-POP">J-POP</option>
                            <option value="アニソン">アニソン</option>
                            <option value="ロック">ロック</option>
                            <option value="クラシック">クラシック</option>
                            <option value="EDM">EDM</option>
                            <option value="ヒップホップ">ヒップホップ</option>
                            <option value="R&B">R&B</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-black">
                            <svg
                              className="h-4 w-4 fill-current"
                              viewBox="0 0 20 20"
                            >
                              <title>Down Arrow</title>
                              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleGeneratePlaylist}
                        disabled={playlistLoading || !selectedTaskId}
                        className="w-full text-lg font-black bg-[#9D4EDD] text-white border-4 border-black rounded-xl py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 transition-all disabled:bg-gray-400 disabled:shadow-none disabled:translate-y-0"
                      >
                        {playlistLoading
                          ? "AIが選曲中..."
                          : "プレイリストを生成 ✨"}
                      </button>
                    </div>
                  )}

                  {generatedPlaylist && generatedPlaylist.length > 0 && (
                    <div className="space-y-4 pt-4 border-t-4 border-black border-dashed">
                      <div className="rounded-xl border-4 border-black bg-[#FFE66D] p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-black text-lg">
                            プレビュー ({generatedPlaylist.length}曲)
                          </h4>
                          <span className="font-mono font-bold text-sm bg-black text-white px-2 py-1 rounded">
                            Total:{" "}
                            {formatDuration(
                              generatedPlaylist.reduce(
                                (sum, track) => sum + track.duration_ms,
                                0,
                              ),
                            )}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-gray-700 mb-3">
                          💡
                          このプレイリストで良ければ保存、気に入らなければ再生成できます
                        </p>
                        <div className="max-h-64 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                          {generatedPlaylist.map((track) => (
                            <div
                              key={track.id}
                              className="flex items-center justify-between rounded-lg border-2 border-black bg-white p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform"
                            >
                              <div className="min-w-0">
                                <div className="font-bold truncate text-sm">
                                  {track.name}
                                </div>
                                <div className="text-xs font-bold text-gray-500 truncate">
                                  {track.artists.join(", ")}
                                </div>
                              </div>
                              <div className="font-mono text-xs font-bold whitespace-nowrap ml-2">
                                {formatDuration(track.duration_ms)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={handleGeneratePlaylist}
                          disabled={playlistLoading}
                          className="text-sm font-black bg-white text-black border-4 border-black rounded-xl py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 transition-all disabled:bg-gray-400 disabled:shadow-none disabled:translate-y-0"
                        >
                          {playlistLoading ? "再生成中..." : "🔄 再生成"}
                        </button>
                        <button
                          type="button"
                          onClick={handleCreatePlaylist}
                          disabled={playlistLoading || !deviceId}
                          className="text-sm font-black bg-[#1DB954] text-white border-4 border-black rounded-xl py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 transition-all disabled:bg-gray-400 disabled:shadow-none disabled:translate-y-0"
                        >
                          {playlistLoading
                            ? "通信中..."
                            : !deviceId
                              ? "準備中..."
                              : "✓ 保存して再生"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              <div className="p-6 border-4 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
                {!deviceId && (
                  <div className="mb-4 rounded-lg bg-[#E0F7FA] border-2 border-[#006064] p-3 text-xs font-bold text-[#006064] animate-pulse">
                    🎵 プレイヤーを準備中...
                    {error?.includes("Premium") && (
                      <span className="block mt-1 text-red-600 bg-white inline-block px-1 border border-red-600 rounded">
                        ⚠️ Spotify Premiumアカウントが必要です
                      </span>
                    )}
                  </div>
                )}
                <p className="font-bold text-gray-700 text-center mb-4">
                  片付けのBGM、用意しますか？
                  <br />
                  AIが時間にぴったりな曲を選びますよ。
                </p>
                <button
                  type="button"
                  onClick={() => setShowPlaylistCreator(true)}
                  className="w-full text-lg font-black bg-[#9D4EDD] text-white border-4 border-black rounded-xl py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all"
                >
                  AIプレイリストを作成 🪄
                </button>
              </div>

              {tracks && (
                <div className="space-y-6">
                  <div>
                    <h3 className="mb-3 text-lg font-black bg-[#FF9F1C] text-white inline-block px-2 border-b-4 border-black transform rotate-1">
                      お気に入りの曲 ({tracks.saved.length}曲)
                    </h3>
                    <div className="space-y-2">
                      {tracks.saved.slice(0, 5).map((track) => (
                        <div
                          key={track.id}
                          className="flex items-center gap-3 p-2 border-2 border-black rounded-lg bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-black flex items-center justify-center flex-shrink-0">
                            <FiMusic size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-xs truncate">
                              {track.name}
                            </div>
                            <div className="text-[10px] font-bold text-gray-500 truncate">
                              {track.artists.join(", ")}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-lg font-black bg-[#4ECDC4] text-white inline-block px-2 border-b-4 border-black transform -rotate-1">
                      よく聴く曲 ({tracks.top.length}曲)
                    </h3>
                    <div className="space-y-2">
                      {tracks.top.slice(0, 5).map((track) => (
                        <div
                          key={track.id}
                          className="flex items-center gap-3 p-2 border-2 border-black rounded-lg bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-black flex items-center justify-center flex-shrink-0">
                            <FiMusic size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-xs truncate">
                              {track.name}
                            </div>
                            <div className="text-[10px] font-bold text-gray-500 truncate">
                              {track.artists.join(", ")}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </Frame>
  );
}
