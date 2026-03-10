import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface TranscriptSegment {
  offset: number;
  duration: number;
  text: string;
  translatedText?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { segments, targetLang = "עברית" }: { segments: TranscriptSegment[]; targetLang?: string } =
      await req.json();

    if (!segments?.length) return NextResponse.json({ error: "אין קטעים לתרגום" }, { status: 400 });

    const BATCH = 80;
    const translated: TranscriptSegment[] = [];

    for (let i = 0; i < segments.length; i += BATCH) {
      const batch = segments.slice(i, i + BATCH);
      const batchText = batch.map((s, idx) => `[${idx}] ${s.text}`).join("\n");

      const msg = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: `תרגם את קטעי הכתוביות הבאים ל${targetLang}.\nשמור על מספר הקטע בפורמט [N].\nאל תוסיף הסברים, רק החזר את הקטעים המתורגמים.\nשמור על מושגים טכניים כפי שהם.\n\n${batchText}`,
        }],
      });

      const lines = (msg.content[0].type === "text" ? msg.content[0].text : "")
        .split("\n").filter((l) => l.trim());

      batch.forEach((seg, idx) => {
        const line = lines.find((l) => l.startsWith(`[${idx}]`));
        translated.push({ ...seg, translatedText: line ? line.replace(`[${idx}]`, "").trim() : seg.text });
      });
    }

    return NextResponse.json({ segments: translated });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "שגיאה" }, { status: 500 });
  }
}
