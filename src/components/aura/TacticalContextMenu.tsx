import React, { useState, useEffect, useCallback } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export function TacticalContextMenu({ children }: { children: React.ReactNode }) {
  const [isLongPress, setIsLongPress] = useState(false);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  const startPress = useCallback(() => {
    setTimer(setTimeout(() => setIsLongPress(true), 500));
  }, []);

  const endPress = useCallback(() => {
    if (timer) clearTimeout(timer);
    setIsLongPress(false);
  }, [timer]);

  return (
    <ContextMenu>
      <ContextMenuTrigger
        className="cursor-context-menu"
        onMouseDown={startPress}
        onMouseUp={endPress}
        onTouchStart={startPress}
        onTouchEnd={endPress}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>Blacklist IP</ContextMenuItem>
        <ContextMenuItem>Trace Origin</ContextMenuItem>
        <ContextMenuItem>Flag for Review</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
