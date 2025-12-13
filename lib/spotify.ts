import SpotifyWebApi from "spotify-web-api-node";

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

export default spotifyApi;

export interface TrackData {
  id: string;
  name: string;
  artist: string;
  album: string;
  duration_ms: number;
  uri: string;
  preview_url: string | null;
  popularity: number;
  genres?: string[];
}

export interface UserMusicData {
  savedTracks: TrackData[];
  topTracks: TrackData[];
  recentlyPlayed: TrackData[];
}

export async function getUserSavedTracks(
  accessToken: string,
  limit = 50,
): Promise<TrackData[]> {
  spotifyApi.setAccessToken(accessToken);

  try {
    const response = await spotifyApi.getMySavedTracks({ limit });
    return response.body.items.map((item) => ({
      id: item.track.id,
      name: item.track.name,
      artist: item.track.artists.map((a) => a.name).join(", "),
      album: item.track.album.name,
      duration_ms: item.track.duration_ms,
      uri: item.track.uri,
      preview_url: item.track.preview_url,
      popularity: item.track.popularity,
    }));
  } catch (error) {
    console.error("Error fetching saved tracks:", error);
    throw error;
  }
}

export async function getUserTopTracks(
  accessToken: string,
  limit = 50,
  timeRange: "short_term" | "medium_term" | "long_term" = "medium_term",
): Promise<TrackData[]> {
  spotifyApi.setAccessToken(accessToken);

  try {
    const response = await spotifyApi.getMyTopTracks({
      limit,
      time_range: timeRange,
    });
    return response.body.items.map((track) => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map((a) => a.name).join(", "),
      album: track.album.name,
      duration_ms: track.duration_ms,
      uri: track.uri,
      preview_url: track.preview_url,
      popularity: track.popularity,
    }));
  } catch (error) {
    console.error("Error fetching top tracks:", error);
    throw error;
  }
}

export async function getUserRecentlyPlayed(
  accessToken: string,
  limit = 50,
): Promise<TrackData[]> {
  spotifyApi.setAccessToken(accessToken);

  try {
    const response = await spotifyApi.getMyRecentlyPlayedTracks({ limit });
    return response.body.items.map((item) => ({
      id: item.track.id,
      name: item.track.name,
      artist: item.track.artists.map((a) => a.name).join(", "),
      album: item.track.album.name,
      duration_ms: item.track.duration_ms,
      uri: item.track.uri,
      preview_url: item.track.preview_url,
      popularity: item.track.popularity,
    }));
  } catch (error) {
    console.error("Error fetching recently played tracks:", error);
    throw error;
  }
}

export async function getAllUserMusicData(
  accessToken: string,
): Promise<UserMusicData> {
  const [savedTracks, topTracks, recentlyPlayed] = await Promise.all([
    getUserSavedTracks(accessToken),
    getUserTopTracks(accessToken),
    getUserRecentlyPlayed(accessToken),
  ]);

  return {
    savedTracks,
    topTracks,
    recentlyPlayed,
  };
}

export async function createPlaylist(
  accessToken: string,
  userId: string,
  name: string,
  description: string,
  trackUris: string[],
): Promise<string> {
  spotifyApi.setAccessToken(accessToken);

  try {
    const playlist = await spotifyApi.createPlaylist(name, {
      description,
      public: false,
    });

    if (trackUris.length > 0) {
      await spotifyApi.addTracksToPlaylist(playlist.body.id, trackUris);
    }

    return playlist.body.id;
  } catch (error) {
    console.error("Error creating playlist:", error);
    throw error;
  }
}

export async function getCurrentUser(accessToken: string) {
  spotifyApi.setAccessToken(accessToken);

  try {
    const response = await spotifyApi.getMe();
    return response.body;
  } catch (error) {
    console.error("Error fetching current user:", error);
    throw error;
  }
}
