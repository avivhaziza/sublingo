import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchYouTubeTranscript } from "@/lib/fetchTranscript";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface TranscriptSegment {
  offset: number; // milliseconds
  duration: number;
  text: string;
  translatedText?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { videoId, targetLang = "עברית" } = await req.json();

    if (!videoId) {
      return NextResponse.json({ error: "חסר מזהה וידאו" }, { status: 400 });
    }

    const rawSegments = await fetchYouTubeTranscript(videoId);

    const segments: TranscriptSegment[] = rawSegments.map((s) => ({
      offset: s.offset,
      duration: s.duration,
      text: s.text,
    }));

    // Translate in batches of 80 segments
    const BATCH_SIZE = 80;
    const translated: TranscriptSegment[] = [];

    for (let i = 0; i < segments.length; i += BATCH_SIZE) {
      const batch = segments.slice(i, i + BATCH_SIZE);
      const batchText = batch.map((s, idx) => `[${idx}] ${s.text}`).join("\n");

      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `תרגם את קטעי הכתוביות הבאים ל${targetLang}.
שמור על מספר הקטע בפורמט [N].
אל תוסיף הסברים, רק החזר את הקטעים המתורגמים.
שמור על טון טבעי ושוטף, ושמור על מושגים טכניים כפי שהם (או עם תעתיק).

${batchText}`,
          },
        ],
      });

      const responseText =
        message.content[0].type === "text" ? message.content[0].text : "";
      const lines = responseText.split("\n").filter((l) => l.trim());

      batch.forEach((seg, idx) => {
        const line = lines.find((l) => l.startsWith(`[${idx}]`));
        const translatedText = line
          ? line.replace(`[${idx}]`, "").trim()
          : seg.text;
        translated.push({ ...seg, translatedText });
      });
    }

    return NextResponse.json({ segments: translated });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "שגיאה לא ידועה";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
