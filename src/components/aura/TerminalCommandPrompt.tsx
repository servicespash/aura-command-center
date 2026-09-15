import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, Archive, Trash2 } from "lucide-react";

export function TerminalCommandPrompt() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<{ cmd: string; resp: string; id: number }[]>([]);
  const [archive, setArchive] = useState<{ cmd: string; resp: string; id: number }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("terminal_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
    const savedArchive = localStorage.getItem("terminal_archive");
    if (savedArchive) {
      try {
        setArchive(JSON.parse(savedArchive));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem("terminal_history", JSON.stringify(history));
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history]);

  useEffect(() => {
    localStorage.setItem("terminal_archive", JSON.stringify(archive));
  }, [archive]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    let response = `Command '${input}' recognized. Executing...`;

    if (input === "help") response = "Available commands: status, scan, report, clear, archive";
    if (input === "status") response = "System: AURA-NET ONLINE. Threat level: NOMINAL.";
    if (input === "clear") {
      setHistory([]);
      setInput("");
      setHistoryIndex(-1);
      return;
    }
    if (input === "archive") {
      if (history.length === 0) {
        response = "No history to archive.";
      } else {
        setArchive((a) => [...a, ...history]);
        setHistory([]);
        response = `${history.length} entries moved to permanent archive.`;
        // To show the archive response we still add this to history, or just display temporarily.
        // Let's keep it in the new history.
      }
    }

    setHistory((h) => [...h, { cmd: input, resp: response, id: Date.now() }]);
    setInput("");
    setHistoryIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex < history.length) {
        setHistoryIndex(nextIndex);
        setInput(history[history.length - 1 - nextIndex].cmd);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const prevIndex = historyIndex - 1;
        setHistoryIndex(prevIndex);
        setInput(history[history.length - 1 - prevIndex].cmd);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  };

  const deleteEntry = (id: number) => {
    setHistory((h) => h.filter((item) => item.id !== id));
  };

  const archiveEntry = (id: number) => {
    const item = history.find((h) => h.id === id);
    if (item) {
      setArchive((a) => [...a, item]);
      deleteEntry(id);
    }
  };

  return (
    <div className="panel p-4 rounded-lg font-mono text-xs w-full h-[300px] flex flex-col relative border-0 bg-transparent">
      <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/5">
        <span className="text-primary/70 font-semibold flex items-center gap-2">
          <History className="w-3 h-3" />
          TERMINAL HISTORY
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setArchive((a) => [...a, ...history]);
              setHistory([]);
            }}
            className="hover:text-primary text-muted-foreground transition-colors"
            title="Archive All"
          >
            <Archive className="w-3 h-3" />
          </button>
          <button
            onClick={() => setHistory([])}
            className="hover:text-destructive text-muted-foreground transition-colors"
            title="Clear History"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-none">
        {history.map((h) => (
          <div key={h.id} className="group relative pr-6">
            <div className="text-primary">{`> ${h.cmd}`}</div>
            <TypewriterText text={h.resp} />
            <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 flex flex-col gap-1 transition-opacity">
              <button
                onClick={() => archiveEntry(h.id)}
                className="text-muted-foreground hover:text-primary"
                title="Archive"
              >
                <Archive className="w-3 h-3" />
              </button>
              <button
                onClick={() => deleteEntry(h.id)}
                className="text-muted-foreground hover:text-destructive"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
        {history.length === 0 && (
          <div className="text-muted-foreground/50 italic">No command history...</div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="mt-2 flex gap-2 items-center">
        <span className="text-primary">{">"}</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-transparent flex-1 outline-none text-foreground placeholder:text-muted-foreground/50"
          placeholder="Enter command..."
          autoComplete="off"
          spellCheck="false"
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
    }, 10);
    return () => clearInterval(interval);
  }, [text]);

  return <div className="text-muted-foreground">{displayed}</div>;
}
