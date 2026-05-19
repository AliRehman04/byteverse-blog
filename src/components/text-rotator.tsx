"use client";

import { useState, useEffect } from "react";

const words = ["AI Tools", "Web Dev", "Coding", "Tech", "Productivity"];

export function TextRotator() {
  const [index, setIndex] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setShow(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % words.length);
        setShow(true);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-block relative overflow-hidden">
      <span
        className={`inline-block gradient-text transition-all duration-400 ${
          show
            ? "translate-y-0 opacity-100"
            : "translate-y-6 opacity-0"
        }`}
      >
        {words[index]}
      </span>
    </span>
  );
}
