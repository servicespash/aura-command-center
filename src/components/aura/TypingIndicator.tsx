import { useState, useEffect } from "react";

export function TypingIndicator({ word }: { word: string }) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    setTyped("");
    let i = 0;
    const interval = setInterval(() => {
      if (i < word.length) {
        setTyped((prev) => prev + word[i]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [word]);

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 text-center">
      <p className="font-mono text-4xl text-white tracking-widest animate-pulse">
        {typed}
        <span className="animate-blink">|</span>
      </p>
    </div>
  );
}
