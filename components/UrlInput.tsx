"use client";

import { useState } from "react";
import { Search, Link2 } from "lucide-react";
import { extractVideoId } from "@/lib/youtube";

interface Props {
  onSubmit: (videoId: string, url: string) => void;
  loading: boolean;
}

export default function UrlInput({ onSubmit, loading }: Props) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const videoId = extractVideoId(url.trim());
    if (!videoId) {
      setError("קישור YouTube לא תקין. נסה שוב.");
      return;
    }
    onSubmit(videoId, url.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <div
            className="absolute inset-y-0 end-4 flex items-center pointer-events-none"
            style={{ color: "var(--text-secondary)" }}
          >
            <Link2 size={18} />
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="הדבק קישור YouTube כאן..."
            dir="ltr"
            className="w-full h-12 pe-12 ps-4 rounded-xl text-sm outline-none transition-all"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              fontFamily: "Rubik, sans-serif",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--accent)";
              e.target.style.boxShadow = "0 0 0 3px var(--accent-glow)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--border)";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="h-12 px-6 rounded-xl font-medium text-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          style={{
            background: loading
              ? "var(--bg-card)"
              : "linear-gradient(135deg, #6366f1, #818cf8)",
            color: "white",
            border: "none",
          }}
        >
          {loading ? (
            <div
              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              style={{ animation: "spin 0.8s linear infinite" }}
            />
          ) : (
            <Search size={16} />
          )}
          {loading ? "מעבד..." : "טען"}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm" style={{ color: "#f87171" }}>
          {error}
        </p>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  );
}
