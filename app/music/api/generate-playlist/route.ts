import { type NextRequest, NextResponse } from "next/server";
import { getGeminiModel } from "../../lib/gemini";
import spotifyApi from "../../lib/spotify";
import type {
  SpotifyArtist,
  SpotifySavedTrackItem,
  SpotifyTrack,
} from "../../lib/types";

interface Track {
  id: string;
  name: string;
  artists: string[];
  album: string;
  duration_ms: number;
  uri: string;
}

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("spotify_access_token")?.value;
  const refreshToken = request.cookies.get("spotify_refresh_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { durationMinutes, genre, trackSource = "user" } = body;

    if (!durationMinutes || durationMinutes <= 0) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    }

    spotifyApi.setAccessToken(accessToken);
    if (refreshToken) {
      spotifyApi.setRefreshToken(refreshToken);
    }

    const targetDurationMs = durationMinutes * 60 * 1000;

    // Spotify全体から選択する場合
    if (trackSource === "spotify") {
      const genreCondition = genre ? `「${genre}」ジャンルの` : "";
      const prompt = `Spotifyで聴ける${genreCondition}楽曲から、合計再生時間が約${durationMinutes}分になるプレイリストを作成してください。

要件:
- 合計再生時間が目標時間（約${durationMinutes}分）に可能な限り近くなるように選曲してください
- 1曲あたり平均3〜4分と仮定して、適切な曲数を選んでください
- 有名な楽曲や人気のある楽曲を中心に選んでください
- 以下のJSON形式で返してください（他の文字は一切含めないでください）:
[
  {"name": "曲名", "artist": "アーティスト名"},
  {"name": "曲名", "artist": "アーティスト名"}
]

回答:`;

      console.log("Generating playlist from Spotify catalog with Gemini...");

      const geminiModel = getGeminiModel();
      const result = await geminiModel.generateContent(prompt);
      const response = result.response;
      const generatedText = response.text().trim();

      console.log("Gemini response:", generatedText);

      // JSONを抽出（マークダウンのコードブロックを除去）
      const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("AIからの応答が正しい形式ではありません");
      }

      const suggestions: { name: string; artist: string }[] = JSON.parse(
        jsonMatch[0],
      );

      console.log("AI suggestions:", suggestions);

      // 各楽曲をSpotifyで検索
      const selectedTracks: Track[] = [];
      for (const suggestion of suggestions) {
        try {
          const searchResult = await spotifyApi.searchTracks(
            `track:${suggestion.name} artist:${suggestion.artist}`,
            { limit: 1 },
          );

          if (
            searchResult.body.tracks &&
            searchResult.body.tracks.items.length > 0
          ) {
            const track = searchResult.body.tracks.items[0];
            selectedTracks.push({
              id: track.id,
              name: track.name,
              artists: track.artists.map(
                (artist: SpotifyArtist) => artist.name,
              ),
              album: track.album.name,
              duration_ms: track.duration_ms,
              uri: track.uri,
            });
          }
        } catch (error) {
          console.error(
            `Failed to search for ${suggestion.name} by ${suggestion.artist}:`,
            error,
          );
        }
      }

      console.log("Found tracks count:", selectedTracks.length);

      const totalDuration = selectedTracks.reduce(
        (sum: number, track: Track) => sum + track.duration_ms,
        0,
      );

      return NextResponse.json({
        tracks: selectedTracks,
        totalDuration,
        targetDuration: targetDurationMs,
      });
    }

    // ユーザーのライブラリから選択する場合（従来の処理）
    const savedTracks = await spotifyApi.getMySavedTracks({ limit: 50 });
    const topTracks = await spotifyApi.getMyTopTracks({ limit: 50 });

    const allTracks: Track[] = [
      ...savedTracks.body.items.map((item: SpotifySavedTrackItem) => ({
        id: item.track.id,
        name: item.track.name,
        artists: item.track.artists.map((artist: SpotifyArtist) => artist.name),
        album: item.track.album.name,
        duration_ms: item.track.duration_ms,
        uri: item.track.uri,
      })),
      ...topTracks.body.items.map((track: SpotifyTrack) => ({
        id: track.id,
        name: track.name,
        artists: track.artists.map((artist: SpotifyArtist) => artist.name),
        album: track.album.name,
        duration_ms: track.duration_ms,
        uri: track.uri,
      })),
    ];

    const uniqueTracks = Array.from(
      new Map(allTracks.map((track) => [track.id, track])).values(),
    );

    const genreCondition = genre
      ? `\n- ジャンルは「${genre}」に関連する楽曲を優先的に選んでください`
      : "";

    const prompt = `以下の楽曲リストから、合計再生時間が約${durationMinutes}分（${targetDurationMs}ミリ秒）になるように楽曲を選んでプレイリストを作成してください。

楽曲リスト:
${uniqueTracks
  .map(
    (track, index) =>
      `${index + 1}. "${track.name}" by ${track.artists.join(", ")} (${track.duration_ms}ms, ID: ${track.id})`,
  )
  .join("\n")}

要件:
- 合計再生時間が目標時間（${targetDurationMs}ms）に可能な限り近くなるように選曲してください${genreCondition}
- 選んだ楽曲のIDのみをカンマ区切りで返してください（他の文字は一切含めないでください）
- 例: track_id_1,track_id_2,track_id_3

回答:`;

    console.log("Generating playlist with Gemini...");
    console.log("Unique tracks count:", uniqueTracks.length);

    const geminiModel = getGeminiModel();
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text().trim();

    console.log("Gemini response:", generatedText);
    console.log("Response length:", generatedText.length);

    const selectedTrackIds = generatedText
      .split(",")
      .map((id: string) => id.trim());

    console.log("Selected track IDs:", selectedTrackIds);
    console.log("Track IDs count:", selectedTrackIds.length);

    const selectedTracks = selectedTrackIds
      .map((id: string) => {
        const track = uniqueTracks.find((track) => track.id === id);
        if (!track) {
          console.log(`Track not found for ID: ${id}`);
        }
        return track;
      })
      .filter((track): track is Track => track !== undefined);

    console.log("Selected tracks count:", selectedTracks.length);

    const totalDuration = selectedTracks.reduce(
      (sum: number, track: Track) => sum + track.duration_ms,
      0,
    );

    return NextResponse.json({
      tracks: selectedTracks,
      totalDuration,
      targetDuration: targetDurationMs,
    });
  } catch (error: unknown) {
    console.error("Error generating playlist:", error);

    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    if (
      error &&
      typeof error === "object" &&
      "statusCode" in error &&
      error.statusCode === 401
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: "Failed to generate playlist",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
