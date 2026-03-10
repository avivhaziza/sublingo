"use client";

import { useEffect, useRef } from "react";
import { TranscriptSegment } from "@/app/api/transcript/route";

interface Props {
  segments: TranscriptSegment[];
  currentIdx: number;
  onSegmentClick: (offsetMs: number) => void;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SubtitlePanel({
  segments,
  currentIdx,
  onSegmentClick,
}: Props) {
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentIdx]);

  return (
    <div
      className="h-full flex flex-col rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div
        className="px-4 py-3 flex items-center gap-2 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          כתוביות
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: "var(--accent-glow)", color: "var(--accent-hover)" }}
        >
          {segments.length}
        </span>
      </div>

      <div className="overflow-y-auto flex-1 p-2">
        {segments.map((seg, idx) => {
          const isActive = idx === currentIdx;
          return (
            <div
              key={idx}
              ref={isActive ? activeRef : undefined}
              onClick={() => onSegmentClick(seg.offset)}
              className={`px-3 py-2.5 rounded-xl mb-1 cursor-pointer transition-all text-right ${
                isActive ? "subtitle-active" : ""
              }`}
              style={{
                background: isActive
                  ? "rgba(99, 102, 241, 0.15)"
                  : "transparent",
                border: isActive
                  ? "1px solid rgba(99, 102, 241, 0.4)"
                  : "1px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLDivElement).style.background =
                    "var(--bg-card-hover)";
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLDivElement).style.background =
                    "transparent";
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <p
                  className="text-sm leading-relaxed flex-1"
                  style={{
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {seg.translatedText || seg.text}
                </p>
                <span
                  className="text-xs flex-shrink-0 mt-0.5 font-mono"
                  style={{ color: isActive ? "var(--accent-hover)" : "var(--text-secondary)", opacity: 0.7 }}
                >
                  {formatTime(seg.offset)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
