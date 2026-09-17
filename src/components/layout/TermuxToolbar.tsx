import React from "react";

export function TermuxToolbar({ onTap }: { onTap: (key: string) => void }) {
  const keys = ["ESC", "TAB", "CTRL", "ALT", "/", "-", "|", "▲", "▼", "?"];
  return (
    <div className="flex gap-1 py-1 px-2 bg-zinc-900 border-t border-zinc-800 text-[10px] font-mono overflow-x-auto no-scrollbar">
      {keys.map((key) => (
        <button
          key={key}
          onClick={() => onTap(key)}
          className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 text-zinc-300 shrink-0"
        >
          {key}
        </button>
      ))}
    </div>
  );
}
