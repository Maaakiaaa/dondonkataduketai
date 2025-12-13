import { type NextRequest, NextResponse } from "next/server";
import spotifyApi from "../../lib/spotify";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/music?error=${error}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/music?error=no_code`,
    );
  }

  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;

    const response = NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/music?authenticated=true`,
    );

    response.cookies.set("spotify_access_token", access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: expires_in,
      sameSite: "lax",
      path: "/",
    });

    response.cookies.set("spotify_refresh_token", refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Error getting Tokens:", err);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/music?error=auth_failed`,
    );
  }
}
