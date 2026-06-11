"use client";

import { useState, useEffect } from "react";

interface ReadingProgressProps {
  readingTime?: number; // total reading minutes
}

export function ReadingProgress({ readingTime }: ReadingProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (progress === 0) return null;

  const minutesLeft = readingTime ? Math.max(1, Math.ceil(readingTime * (1 - progress / 100))) : 0;
  const showTimeLeft = readingTime && progress > 0 && progress < 98;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60]">
      <div className="h-[3px] bg-transparent">
        <div
          className="h-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {showTimeLeft && (
        <div className="absolute top-[3px] right-4 rtl:right-auto rtl:left-4 pointer-events-none">
          <span className="inline-block px-2.5 py-1 text-[11px] font-semibold bg-primary text-white rounded-b-lg shadow-sm">
            {minutesLeft} min left
          </span>
        </div>
      )}
    </div>
  );
}
