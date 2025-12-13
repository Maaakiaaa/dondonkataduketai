"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import type { UserMusicData } from "@/lib/spotify-api";

export default function PlayPage() {
  const { data: session, status } = useSession();
  const [musicData, setMusicData] = useState<UserMusicData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMusicData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/play/tracks");
      if (response.ok) {
        const data = await response.json();
        setMusicData(data);
      }
    } catch (error) {
      console.error("Error fetching music data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchMusicData();
    }
  }, [session, fetchMusicData]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-lg text-zinc-600 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <main className="flex flex-col items-center gap-8 p-8">
          <h1 className="text-4xl font-bold text-black dark:text-white">
            Play - Playlist Generator
          </h1>
          <p className="max-w-md text-center text-lg text-zinc-600 dark:text-zinc-400">
            Generate personalized playlists using AI. Sign in with Spotify to
            get started.
          </p>
          <button
            onClick={() => signIn("spotify")}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-green-500 px-8 text-white transition-colors hover:bg-green-600"
            type="button"
          >
            Sign in with Spotify
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto flex max-w-7xl items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-black dark:text-white">
            Play - Playlist Generator
          </h1>
          <button
            onClick={() => signOut()}
            className="rounded-full bg-zinc-200 px-6 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-300 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
            type="button"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-8">
        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold text-black dark:text-white">
            Your Music Library
          </h2>
          {loading ? (
            <p className="text-zinc-600 dark:text-zinc-400">
              Loading your music...
            </p>
          ) : musicData ? (
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-lg bg-white p-6 shadow dark:bg-zinc-900">
                <h3 className="mb-2 text-lg font-semibold text-black dark:text-white">
                  Saved Tracks
                </h3>
                <p className="text-3xl font-bold text-green-500">
                  {musicData.savedTracks.length}
                </p>
              </div>
              <div className="rounded-lg bg-white p-6 shadow dark:bg-zinc-900">
                <h3 className="mb-2 text-lg font-semibold text-black dark:text-white">
                  Top Tracks
                </h3>
                <p className="text-3xl font-bold text-blue-500">
                  {musicData.topTracks.length}
                </p>
              </div>
              <div className="rounded-lg bg-white p-6 shadow dark:bg-zinc-900">
                <h3 className="mb-2 text-lg font-semibold text-black dark:text-white">
                  Recently Played
                </h3>
                <p className="text-3xl font-bold text-purple-500">
                  {musicData.recentlyPlayed.length}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
