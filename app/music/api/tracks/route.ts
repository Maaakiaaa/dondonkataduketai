import { type NextRequest, NextResponse } from "next/server";
import spotifyApi from "../../lib/spotify";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("spotify_access_token")?.value;
  const refreshToken = request.cookies.get("spotify_refresh_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  spotifyApi.setAccessToken(accessToken);
  if (refreshToken) {
    spotifyApi.setRefreshToken(refreshToken);
  }

  try {
    const savedTracks = await spotifyApi.getMySavedTracks({ limit: 50 });
    const topTracks = await spotifyApi.getMyTopTracks({ limit: 50 });

    const tracks = {
      saved: savedTracks.body.items.map((item: any) => ({
        id: item.track.id,
        name: item.track.name,
        artists: item.track.artists.map((artist: any) => artist.name),
        album: item.track.album.name,
        duration_ms: item.track.duration_ms,
        uri: item.track.uri,
      })),
      top: topTracks.body.items.map((track: any) => ({
        id: track.id,
        name: track.name,
        artists: track.artists.map((artist: any) => artist.name),
        album: track.album.name,
        duration_ms: track.duration_ms,
        uri: track.uri,
      })),
    };

    return NextResponse.json(tracks);
  } catch (error: unknown) {
    console.error("Error fetching tracks:", error);

    if (
      error &&
      typeof error === "object" &&
      "statusCode" in error &&
      error.statusCode === 401
    ) {
      if (refreshToken) {
        try {
          const data = await spotifyApi.refreshAccessToken();
          const newAccessToken = data.body.access_token;

          spotifyApi.setAccessToken(newAccessToken);

          const savedTracks = await spotifyApi.getMySavedTracks({ limit: 50 });
          const topTracks = await spotifyApi.getMyTopTracks({ limit: 50 });

          const tracks = {
            saved: savedTracks.body.items.map((item: any) => ({
              id: item.track.id,
              name: item.track.name,
              artists: item.track.artists.map((artist: any) => artist.name),
              album: item.track.album.name,
              duration_ms: item.track.duration_ms,
              uri: item.track.uri,
            })),
            top: topTracks.body.items.map((track: any) => ({
              id: track.id,
              name: track.name,
              artists: track.artists.map((artist: any) => artist.name),
              album: track.album.name,
              duration_ms: track.duration_ms,
              uri: track.uri,
            })),
          };

          const response = NextResponse.json(tracks);
          response.cookies.set("spotify_access_token", newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: data.body.expires_in,
            sameSite: "lax",
            path: "/",
          });

          return response;
        } catch (refreshError) {
          console.error("Error refreshing token:", refreshError);
          return NextResponse.json(
            { error: "Token refresh failed" },
            { status: 401 },
          );
        }
      }

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch tracks" },
      { status: 500 },
    );
  }
}
