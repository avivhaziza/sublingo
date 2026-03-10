from http.server import BaseHTTPRequestHandler
import json
import os
from youtube_transcript_api import YouTubeTranscriptApi
import anthropic

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")


def fetch_captions(video_id: str) -> list[dict]:
    api = YouTubeTranscriptApi()
    try:
        transcript = api.fetch(video_id, languages=["en"])
    except Exception:
        transcript = api.fetch(video_id)

    segments = []
    for item in transcript:
        text = item.text.replace("\n", " ").strip()
        if not text:
            continue
        segments.append({
            "offset": int(item.start * 1000),
            "duration": int(item.duration * 1000),
            "text": text,
        })

    if not segments:
        raise ValueError("לא נמצאו כתוביות לסרטון זה")

    return segments


def translate_segments(segments: list[dict], target_lang: str = "עברית") -> list[dict]:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    batch_size = 80
    result = []

    for i in range(0, len(segments), batch_size):
        batch = segments[i: i + batch_size]
        batch_text = "\n".join(f"[{idx}] {s['text']}" for idx, s in enumerate(batch))

        msg = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            messages=[{
                "role": "user",
                "content": (
                    f"תרגם את קטעי הכתוביות הבאים ל{target_lang}.\n"
                    "שמור על מספר הקטע בפורמט [N].\n"
                    "אל תוסיף הסברים, רק החזר את הקטעים המתורגמים.\n"
                    "שמור על מושגים טכניים כפי שהם (או עם תעתיק).\n\n"
                    + batch_text
                ),
            }],
        )

        response_text = msg.content[0].text if msg.content else ""
        lines = [l for l in response_text.split("\n") if l.strip()]

        for idx, seg in enumerate(batch):
            line = next((l for l in lines if l.startswith(f"[{idx}]")), None)
            translated = line.replace(f"[{idx}]", "").strip() if line else seg["text"]
            result.append({**seg, "translatedText": translated})

    return result


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            video_id = body.get("videoId", "").strip()
            target_lang = body.get("targetLang", "עברית")

            if not video_id:
                self._respond(400, {"error": "חסר מזהה וידאו"})
                return

            segments = fetch_captions(video_id)
            translated = translate_segments(segments, target_lang)
            self._respond(200, {"segments": translated})

        except Exception as e:
            self._respond(500, {"error": str(e)})

    def _respond(self, status: int, data: dict):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass
