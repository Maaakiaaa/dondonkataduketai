import { NextResponse } from "next/server";
import spotifyApi from "../../lib/spotify";

const scopes = [
  "user-read-private",
  "user-read-email",
  "user-library-read",
  "user-top-read",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
  "user-modify-playback-state",
  "user-read-playback-state",
  "streaming",
];

export async function GET() {
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes, "state");
  return NextResponse.json({ url: authorizeURL });
}
