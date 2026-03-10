"use client";

import { useEffect, useState } from "react";

const steps = [
  "מאתר כתוביות מיוטיוב...",
  "שולח לתרגום חכם...",
  "מסנכרן עם הוידאו...",
  "כמעט מוכן...",
];

export default function LoadingState() {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIdx((p) => Math.min(p + 1, steps.length - 1));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      {/* Spinner */}
      <div className="relative w-16 h-16">
        <div
          className="w-16 h-16 rounded-full border-4 border-t-transparent"
          style={{
            borderColor: "rgba(99, 102, 241, 0.2)",
            borderTopColor: "#6366f1",
            animation: "spin 1s linear infinite",
          }}
        />
        <div
          className="absolute inset-2 rounded-full border-4 border-b-transparent"
          style={{
            borderColor: "rgba(129, 140, 248, 0.15)",
            borderBottomColor: "#818cf8",
            animation: "spin 1.5s linear infinite reverse",
          }}
        />
      </div>

      <div className="text-center">
        <p className="font-semibold text-lg mb-1" style={{ color: "var(--text-primary)" }}>
          מעבד את הוידאו
        </p>
        <p className="text-sm transition-all" style={{ color: "var(--text-secondary)" }}>
          {steps[stepIdx]}
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full transition-all duration-500"
            style={{
              background: i <= stepIdx ? "var(--accent)" : "var(--border)",
              transform: i === stepIdx ? "scale(1.3)" : "scale(1)",
            }}
          />
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
