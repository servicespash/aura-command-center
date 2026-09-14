import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function TerminalCommandPrompt() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<{ cmd: string; resp: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Simulate simple command responses
    let response = `Command '${input}' recognized. Executing...`;
    if (input === "help") response = "Available commands: status, scan, report, clear";
    if (input === "status") response = "System: AURA-NET ONLINE. Threat level: NOMINAL.";
    if (input === "clear") {
      setHistory([]);
      setInput("");
      return;
    }

    setHistory((h) => [...h, { cmd: input, resp: response }]);
    setInput("");
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history]);

  return (
    <div className="panel p-4 rounded-lg font-mono text-xs w-full max-w-sm h-48 flex flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2">
        {history.map((h, i) => (
          <div key={i}>
            <div className="text-primary">{`> ${h.cmd}`}</div>
            <TypewriterText text={h.resp} />
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="mt-2 flex gap-1">
        <span className="text-primary">{">"}</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="bg-transparent flex-1 outline-none text-foreground"
          placeholder="Enter command..."
        />
      </form>
    </div>
  );
}

function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 20);
    return () => clearInterval(interval);
  }, [text]);

  return <div>{displayed}</div>;
}
