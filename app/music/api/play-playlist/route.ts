import { type NextRequest, NextResponse } from "next/server";
import spotifyApi from "../../lib/spotify";

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("spotify_access_token")?.value;
  const refreshToken = request.cookies.get("spotify_refresh_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { playlistUri, deviceId } = body;

    if (!playlistUri) {
      return NextResponse.json(
        { error: "Playlist URI is required" },
        { status: 400 },
      );
    }

    spotifyApi.setAccessToken(accessToken);
    if (refreshToken) {
      spotifyApi.setRefreshToken(refreshToken);
    }

    // デバイスIDが指定されている場合はそのデバイスで再生
    // 指定されていない場合はアクティブなデバイスで再生
    const playOptions: {
      context_uri: string;
      device_id?: string;
    } = {
      context_uri: playlistUri,
    };

    if (deviceId) {
      playOptions.device_id = deviceId;
    }

    await spotifyApi.play(playOptions);

    return NextResponse.json({
      success: true,
      message: "Playback started",
    });
  } catch (error: unknown) {
    console.error("Error starting playback:", error);

    if (
      error &&
      typeof error === "object" &&
      "statusCode" in error &&
      error.statusCode === 401
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      error &&
      typeof error === "object" &&
      "statusCode" in error &&
      error.statusCode === 404
    ) {
      return NextResponse.json(
        {
          error: "No active device found",
          details: "Spotifyアプリを開いて、デバイスをアクティブにしてください",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to start playback",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
