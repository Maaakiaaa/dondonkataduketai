import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAllUserMusicData } from "@/lib/spotify-api";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const musicData = await getAllUserMusicData(session.accessToken);
    return NextResponse.json(musicData);
  } catch (error) {
    console.error("Error fetching user music data:", error);
    return NextResponse.json(
      { error: "Failed to fetch music data" },
      { status: 500 },
    );
  }
}
