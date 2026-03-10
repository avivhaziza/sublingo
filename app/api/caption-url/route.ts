import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get("videoId");
  if (!videoId) return NextResponse.json({ error: "חסר videoId" }, { status: 400 });

  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  const html = await res.text();
  const split = html.split('"captions":');
  if (split.length < 2) return NextResponse.json({ error: "לא נמצאו כתוביות" }, { status: 404 });

  let captions;
  try {
    captions = JSON.parse(split[1].split(',"videoDetails')[0].replace(/\n/g, ""))
      ?.playerCaptionsTracklistRenderer;
  } catch {
    return NextResponse.json({ error: "שגיאה בפרסור" }, { status: 500 });
  }

  const tracks: Array<{ baseUrl: string; languageCode: string }> =
    captions?.captionTracks ?? [];

  if (!tracks.length) return NextResponse.json({ error: "אין כתוביות לסרטון זה" }, { status: 404 });

  const track =
    tracks.find((t) => t.languageCode === "en") ||
    tracks.find((t) => t.languageCode.startsWith("en")) ||
    tracks[0];

  return NextResponse.json({ captionUrl: track.baseUrl + "&fmt=json3" });
}
