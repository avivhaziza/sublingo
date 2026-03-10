"use client";

import { useState, useCallback, useRef } from "react";
import { Subtitles, Github } from "lucide-react";
import UrlInput from "@/components/UrlInput";
import VideoPlayer from "@/components/VideoPlayer";
import SubtitlePanel from "@/components/SubtitlePanel";
import LoadingState from "@/components/LoadingState";
import { TranscriptSegment } from "@/app/api/translate/route";

export default function Home() {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const playerSeekRef = useRef<((ms: number) => void) | null>(null);

  const currentSegmentIdx = segments.findLastIndex(
    (s) => s.offset <= currentTime
  );

  const handleLoad = useCallback(async (vid: string) => {
    setLoading(true);
    setError(null);
    setSegments([]);
    setVideoId(vid);

    try {
      // Step 1: server gets the caption URL (just page parsing, no blocked calls)
      const urlRes = await fetch(`/api/caption-url?videoId=${vid}`);
      const urlData = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlData.error || "לא נמצאו כתוביות");

      // Step 2: browser fetches captions directly from YouTube (residential IP + cookies)
      // Try simple unsigned URL first, then signed URL as fallback
      const tryFetch = async (url: string, withCredentials: boolean) => {
        const res = await fetch(url, { credentials: withCredentials ? "include" : "omit" });
        if (!res.ok) return null;
        const text = await res.text();
        if (text.trim().startsWith("<")) return null; // got HTML, not JSON
        return JSON.parse(text);
      };

      const captionData =
        await tryFetch(urlData.captionUrlSimple, false) ||
        await tryFetch(urlData.captionUrl, false) ||
        await tryFetch(urlData.captionUrl, true);

      if (!captionData) throw new Error("לא הצלחנו לטעון את הכתוביות מ-YouTube");

      const rawSegments: TranscriptSegment[] = (captionData.events ?? [])
        .filter((e: { segs?: unknown; tStartMs?: number }) => e.segs && e.tStartMs !== undefined)
        .map((e: { tStartMs: number; dDurationMs?: number; segs: Array<{ utf8?: string }> }) => ({
          offset: e.tStartMs,
          duration: e.dDurationMs ?? 2000,
          text: e.segs.map((s) => s.utf8 ?? "").join("").replace(/\n/g, " ").trim(),
        }))
        .filter((s: TranscriptSegment) => s.text);

      if (!rawSegments.length) throw new Error("הכתוביות ריקות");

      // Step 3: server translates with Claude
      const transRes = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segments: rawSegments, targetLang: "עברית" }),
      });
      const transData = await transRes.json();
      if (!transRes.ok) throw new Error(transData.error || "שגיאה בתרגום");
      setSegments(transData.segments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה לא ידועה");
      setVideoId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSegmentClick = useCallback((offsetMs: number) => {
    playerSeekRef.current?.(offsetMs);
  }, []);

  const hasVideo = videoId && segments.length > 0;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Header */}
      <header
        className="flex-shrink-0 px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)" }}
          >
            <Subtitles size={18} color="white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none" style={{ color: "var(--text-primary)" }}>
              SubLingo
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              שבור את מחסום השפה
            </p>
          </div>
        </div>

        <div className="flex-1 max-w-xl mx-8">
          <UrlInput onSubmit={(vid) => handleLoad(vid)} loading={loading} />
        </div>

        <div className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
          <span className="text-xs">מופעל על ידי Claude AI</span>
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: "#22c55e", boxShadow: "0 0 6px #22c55e" }}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-6">
        {/* Initial state */}
        {!loading && !hasVideo && !error && (
          <div className="flex flex-col items-center justify-center h-full py-24 gap-6">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(129,140,248,0.1))",
                border: "1px solid rgba(99,102,241,0.3)",
              }}
            >
              <Subtitles size={36} style={{ color: "var(--accent)" }} />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                ברוך הבא לSubLingo
              </h2>
              <p className="text-base" style={{ color: "var(--text-secondary)" }}>
                הדבק קישור יוטיוב בשדה למעלה ותקבל כתוביות בעברית תוך שניות
              </p>
            </div>
            <div className="flex gap-6 mt-4">
              {["תרגום AI חכם", "סנכרון מדויק", "ניווט קל"].map((feat) => (
                <div
                  key={feat}
                  className="flex items-center gap-2 text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                  {feat}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && <LoadingState />}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-center justify-center py-24">
            <div
              className="text-center max-w-md p-6 rounded-2xl"
              style={{ background: "var(--bg-card)", border: "1px solid rgba(248,113,113,0.3)" }}
            >
              <p className="text-lg font-semibold mb-2" style={{ color: "#f87171" }}>
                שגיאה בטעינה
              </p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {error}
              </p>
              <p className="text-xs mt-3" style={{ color: "var(--text-secondary)" }}>
                ייתכן שלסרטון אין כתוביות, נסה סרטון אחר
              </p>
            </div>
          </div>
        )}

        {/* Video + Subtitles layout */}
        {hasVideo && !loading && (
          <div className="flex gap-4 h-full" style={{ minHeight: "calc(100vh - 160px)" }}>
            {/* Video */}
            <div className="flex-1 min-w-0">
              <VideoPlayer
                videoId={videoId}
                segments={segments}
                onTimeUpdate={setCurrentTime}
                currentSegmentIdx={Math.max(0, currentSegmentIdx)}
                onSeekReady={(fn) => { playerSeekRef.current = fn; }}
              />
            </div>

            {/* Subtitle panel */}
            <div className="w-80 flex-shrink-0" style={{ maxHeight: "calc(100vh - 160px)" }}>
              <SubtitlePanel
                segments={segments}
                currentIdx={Math.max(0, currentSegmentIdx)}
                onSegmentClick={handleSegmentClick}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
