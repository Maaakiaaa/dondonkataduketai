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
    const { durationMinutes, genre } = body;

    if (!durationMinutes || durationMinutes <= 0) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    }

    spotifyApi.setAccessToken(accessToken);
    if (refreshToken) {
      spotifyApi.setRefreshToken(refreshToken);
    }

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

    const targetDurationMs = durationMinutes * 60 * 1000;

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
