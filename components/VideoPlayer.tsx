"use client";

import { useEffect, useRef, useState } from "react";
import { TranscriptSegment } from "@/app/api/transcript/route";

interface Props {
  videoId: string;
  segments: TranscriptSegment[];
  onTimeUpdate: (timeMs: number) => void;
  currentSegmentIdx: number;
  onSeekReady: (seekFn: (ms: number) => void) => void;
}

declare global {
  interface Window {
    YT: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: () => void;
          };
        }
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
}

export default function VideoPlayer({
  videoId,
  segments,
  onTimeUpdate,
  currentSegmentIdx,
  onSeekReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [playerReady, setPlayerReady] = useState(false);

  useEffect(() => {
    const loadPlayer = () => {
      if (!containerRef.current) return;
      const el = document.createElement("div");
      el.style.width = "100%";
      el.style.height = "100%";
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(el);

      playerRef.current = new window.YT.Player(el, {
        videoId,
        playerVars: {
          autoplay: 0,
          modestbranding: 1,
          rel: 0,
          cc_load_policy: 0,
          iv_load_policy: 3,
          enablejsapi: 1,
        },
        events: {
          onReady: () => {
            setPlayerReady(true);
            onSeekReady((ms: number) => {
              playerRef.current?.seekTo(ms / 1000, true);
            });
            intervalRef.current = setInterval(() => {
              if (playerRef.current) {
                onTimeUpdate(playerRef.current.getCurrentTime() * 1000);
              }
            }, 250);
          },
        },
      });
    };

    if (window.YT?.Player) {
      loadPlayer();
    } else {
      window.onYouTubeIframeAPIReady = loadPlayer;
      if (!document.getElementById("yt-api-script")) {
        const script = document.createElement("script");
        script.id = "yt-api-script";
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (playerRef.current) playerRef.current.destroy();
      setPlayerReady(false);
    };
  }, [videoId]);

  const currentSeg = segments[currentSegmentIdx];

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden"
      style={{ background: "#000", aspectRatio: "16/9" }}
    >
      <div ref={containerRef} className="absolute inset-0" />

      {/* Subtitle overlay */}
      {playerReady && currentSeg?.translatedText && (
        <div
          className="absolute bottom-0 left-0 right-0 flex justify-center pb-10 px-6 pointer-events-none"
          style={{ zIndex: 10 }}
        >
          <span
            className="text-white text-center font-medium px-5 py-2.5 rounded-xl leading-relaxed"
            style={{
              background: "rgba(0,0,0,0.78)",
              fontSize: "clamp(14px, 1.8vw, 22px)",
              textShadow: "0 1px 4px rgba(0,0,0,0.9)",
              backdropFilter: "blur(6px)",
              maxWidth: "85%",
              display: "inline-block",
            }}
          >
            {currentSeg.translatedText}
          </span>
        </div>
      )}
    </div>
  );
}
