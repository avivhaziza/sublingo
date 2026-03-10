import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

export interface RawSegment {
  offset: number; // ms
  duration: number; // ms
  text: string;
}

export async function fetchYouTubeTranscript(videoId: string): Promise<RawSegment[]> {
  const tmpDir = os.tmpdir();
  const prefix = `sublingo_${videoId}`;
  const outputPrefix = path.join(tmpDir, prefix);
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  // Cleanup old files for this video
  for (const f of fs.readdirSync(tmpDir)) {
    if (f.startsWith(prefix)) {
      try { fs.unlinkSync(path.join(tmpDir, f)); } catch { /* ignore */ }
    }
  }

  const runYtDlp = async (extraArgs: string) => {
    const cmd = `python -m yt_dlp --write-auto-sub --sub-lang en --sub-format json3 --skip-download --no-warnings --quiet ${extraArgs} -o "${outputPrefix}" "${url}"`;
    await execAsync(cmd, { timeout: 30000 });
  };

  // Try English auto-subs first, then fallback to any available language
  try {
    await runYtDlp("");
  } catch {
    try {
      await runYtDlp("--write-sub");
    } catch {
      // Last resort: no language filter
      const cmd = `python -m yt_dlp --write-auto-sub --write-sub --sub-format json3 --skip-download --no-warnings --quiet -o "${outputPrefix}" "${url}"`;
      await execAsync(cmd, { timeout: 30000 });
    }
  }

  // Find the downloaded json3 file
  const files = fs.readdirSync(tmpDir).filter(
    (f) => f.startsWith(prefix) && f.endsWith(".json3")
  );

  if (files.length === 0) {
    throw new Error("לא נמצאו כתוביות לסרטון זה. ייתכן שהסרטון אינו כולל כתוביות אוטומטיות.");
  }

  // Prefer English
  const chosenFile =
    files.find((f) => /\.en\.json3$/.test(f)) ||
    files.find((f) => /\.en-/.test(f)) ||
    files[0];

  const raw = fs.readFileSync(path.join(tmpDir, chosenFile), "utf-8");

  // Cleanup
  for (const f of files) {
    try { fs.unlinkSync(path.join(tmpDir, f)); } catch { /* ignore */ }
  }

  const json3 = JSON.parse(raw) as {
    events?: Array<{
      tStartMs?: number;
      dDurationMs?: number;
      segs?: Array<{ utf8?: string }>;
    }>;
  };

  const segments: RawSegment[] = [];

  for (const event of json3.events ?? []) {
    if (!event.segs || event.tStartMs === undefined) continue;
    const text = event.segs
      .map((s) => s.utf8 ?? "")
      .join("")
      .replace(/\n/g, " ")
      .trim();
    if (!text || text === " ") continue;
    segments.push({
      offset: event.tStartMs,
      duration: event.dDurationMs ?? 2000,
      text,
    });
  }

  if (segments.length === 0) {
    throw new Error("הכתוביות ריקות");
  }

  return segments;
}
