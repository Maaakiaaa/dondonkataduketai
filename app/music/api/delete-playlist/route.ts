import { type NextRequest, NextResponse } from "next/server";
import spotifyApi from "../../lib/spotify";

export async function DELETE(request: NextRequest) {
  const accessToken = request.cookies.get("spotify_access_token")?.value;
  const refreshToken = request.cookies.get("spotify_refresh_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { playlistId } = body;

    if (!playlistId) {
      return NextResponse.json(
        { error: "Playlist ID is required" },
        { status: 400 },
      );
    }

    spotifyApi.setAccessToken(accessToken);
    if (refreshToken) {
      spotifyApi.setRefreshToken(refreshToken);
    }

    await spotifyApi.unfollowPlaylist(playlistId);

    return NextResponse.json({
      success: true,
      message: "Playlist deleted successfully",
    });
  } catch (error: unknown) {
    console.error("Error deleting playlist:", error);

    if (
      error &&
      typeof error === "object" &&
      "statusCode" in error &&
      error.statusCode === 401
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to delete playlist" },
      { status: 500 },
    );
  }
}
