import React, { useState, useEffect, useRef } from "react";
import { History, Archive, Trash2 } from "lucide-react";
import { parseCommand } from "@/lib/CommandParser";
import { COMMAND_REGISTRY } from "@/lib/CommandRegistry";
import { useTelemetryStore } from "@/store/telemetryStore";
import { StorageService } from "@/lib/StorageService";
import { AudioEngine } from "@/lib/AudioEngine";
import { Button } from "@/components/ui/button";

export function TerminalCommandPrompt() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<{ cmd: string; resp: React.ReactNode; id: number }[]>([]);
  const [archive, setArchive] = useState<{ cmd: string; resp: React.ReactNode; id: number }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { installedPackages, installPackage } = useTelemetryStore();
  const [isProcessing, setIsProcessing] = useState(false);

  // Load from IDB on mount
  useEffect(() => {
    StorageService.zustandGet("terminal_history").then((saved) => {
      if (saved && Array.isArray(saved)) setHistory(saved);
    });
    StorageService.zustandGet("terminal_archive").then((savedArchive) => {
      if (savedArchive && Array.isArray(savedArchive)) setArchive(savedArchive);
    });
  }, []);

  // Save to IDB on change
  useEffect(() => {
    if (history.length > 0) {
      // Only save entries that are purely strings to avoid serialization errors
      const serializableHistory = history.filter((h) => typeof h.resp === "string");
      StorageService.zustandSet("terminal_history", serializableHistory).catch(console.error);
    }
  }, [history]);

  useEffect(() => {
    if (archive.length > 0) {
      // Only save entries that are purely strings to avoid serialization errors
      const serializableArchive = archive.filter((h) => typeof h.resp === "string");
      StorageService.zustandSet("terminal_archive", serializableArchive).catch(console.error);
    }
  }, [archive]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isProcessing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const currentInput = input.trim();
    setInput("");
    setHistoryIndex(-1);

    if (currentInput.toLowerCase() === "clear") {
      setHistory([]);
      return;
    }

    // Add command to history early with loading state
    const entryId = Date.now();
    setHistory((h) => [...h, { cmd: currentInput, resp: "Executing...", id: entryId }]);

    const parsed = parseCommand(currentInput);
    const cmdDef = COMMAND_REGISTRY[parsed.command];

    let responseNode: React.ReactNode = "";

    if (!cmdDef) {
      responseNode = `[ERROR] Command '${parsed.command}' not recognized. Type 'help' for a list of commands.`;
    } else {
      // Intercept missing packages
      if (cmdDef.requiredPkg !== "built-in" && !installedPackages.includes(cmdDef.requiredPkg)) {
        responseNode = (
          <div className="flex flex-col gap-1 text-destructive">
            <div>
              [ERROR] Command failed to execute: Missing security package '{cmdDef.requiredPkg}'.
            </div>
            <div className="text-muted-foreground">
              [HINT] Run 'pkg install {cmdDef.requiredPkg}' to install missing dependencies.
            </div>
          </div>
        );
      } else {
        // Special case for pkg install
        if (
          parsed.command === "pkg" &&
          parsed.args["pos_1"] === "install" &&
          parsed.args["pos_2"]
        ) {
          const pkgName = parsed.args["pos_2"] as string;
          setIsProcessing(true);

          // Animate progress bar
          setHistory((h) =>
            h.map((item) =>
              item.id === entryId
                ? {
                    ...item,
                    resp: (
                      <InstallProgress
                        pkg={pkgName}
                        onComplete={() => {
                          installPackage(pkgName);
                          setIsProcessing(false);
                        }}
                      />
                    ),
                  }
                : item,
            ),
          );
          return;
        }

        // Execute regular command
        let rawResponse = "";
        const setResp = (msg: string) => {
          rawResponse = msg;
        };

        try {
          await cmdDef.execute(parsed.args, setResp);
          responseNode = rawResponse;
        } catch (err: unknown) {
          responseNode = `[ERROR] Execution failed: ${err instanceof Error ? err.message : String(err)}`;
        }
      }
    }

    setHistory((h) =>
      h.map((item) => (item.id === entryId ? { ...item, resp: responseNode } : item)),
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { audioEnabled } = useTelemetryStore.getState();
    if (audioEnabled && e.key.length === 1) {
      // Only play on printable chars
      AudioEngine.getInstance().playKeystroke();
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex < history.length) {
        setHistoryIndex(nextIndex);
        const entry = history[history.length - 1 - nextIndex];
        if (entry) setInput(entry.cmd);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const prevIndex = historyIndex - 1;
        setHistoryIndex(prevIndex);
        const entry = history[history.length - 1 - prevIndex];
        if (entry) setInput(entry.cmd);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  };

  const handleToolbarTap = (key: string) => {
    if (key === "?") {
      setInput("help");
      // Simulate form submission
      setTimeout(() => {
        const form = document.getElementById("terminal-form") as HTMLFormElement;
        form?.requestSubmit();
      }, 50);
    } else {
      setInput((prev) => prev + key);
    }
  };

  const deleteEntry = (id: number) => setHistory((h) => h.filter((item) => item.id !== id));

  const archiveEntry = (id: number) => {
    const item = history.find((h) => h.id === id);
    if (item) {
      setArchive((a) => [...a, item]);
      deleteEntry(id);
    }
  };

  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden bg-transparent p-3 font-mono text-xs md:p-4">
      <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/5">
        <span className="text-primary/70 font-semibold flex items-center gap-2">
          <History className="w-3 h-3" />
          TERMINAL HISTORY
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setArchive((a) => [...a, ...history]);
              setHistory([]);
            }}
            className="size-7 text-muted-foreground hover:text-primary"
            title="Archive All"
          >
            <Archive className="w-3 h-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setHistory([])}
            className="size-7 text-muted-foreground hover:text-destructive"
            title="Clear History"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-none">
        {history.map((h) => (
          <div key={h.id} className="group relative pr-6">
            <div className="text-primary">{`> ${h.cmd}`}</div>
            <div className="text-muted-foreground whitespace-pre-wrap">{h.resp}</div>
            <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 flex flex-col gap-1 transition-opacity">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => archiveEntry(h.id)}
                className="size-6 text-muted-foreground hover:text-primary"
                aria-label="Archive entry"
              >
                <Archive className="w-3 h-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => deleteEntry(h.id)}
                className="size-6 text-muted-foreground hover:text-destructive"
                aria-label="Delete entry"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
        {history.length === 0 && (
          <div className="text-muted-foreground/50 italic">No command history...</div>
        )}
      </div>

      <div className="flex sm:hidden overflow-x-auto gap-1 py-2 my-1 border-t border-b border-border/20 text-[10px] font-mono no-scrollbar">
        {["ESC", "TAB", "CTRL", "ALT", "/", "-", "|", "▲", "▼", "?"].map((key) => (
          <Button
            key={key}
            onClick={() => handleToolbarTap(key)}
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 shrink-0 px-2 text-[10px] text-muted-foreground"
          >
            {key}
          </Button>
        ))}
      </div>

      <form id="terminal-form" onSubmit={handleSubmit} className="mt-2 flex gap-2 items-center">
        <span className="text-primary">{">"}</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isProcessing}
          className="bg-transparent flex-1 outline-none text-foreground placeholder:text-muted-foreground/50"
          placeholder={isProcessing ? "Processing..." : "Enter command..."}
          autoComplete="off"
          spellCheck="false"
        />
      </form>
    </div>
  );
}

function InstallProgress({ pkg, onComplete }: { pkg: string; onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 15) + 5;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setTimeout(onComplete, 300);
      }
      setProgress(current);
    }, 150);
    return () => clearInterval(interval);
  }, [onComplete]);

  const barCount = 24;
  const filledBars = Math.floor((progress / 100) * barCount);
  const barString = "=".repeat(filledBars) + " ".repeat(barCount - filledBars);

  return (
    <div className="flex flex-col gap-1 text-primary">
      <div>[PKG] Installing dependency '{pkg}'...</div>
      <div>
        [PKG] Unpacking [{barString}] {progress}%
      </div>
      {progress === 100 && <div>[PKG] Successfully installed '{pkg}'.</div>}
    </div>
  );
}
