import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "../ui/button";

export function SystemDiagnosticsDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;
  return (
    <motion.div
      className="fixed right-0 top-0 h-full w-80 panel z-[100] p-6 border-l border-border"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="label-hud">Diagnostics</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          X
        </Button>
      </div>
      <div className="space-y-4">
        <div className="text-xs">Memory: 84% usage</div>
        <div className="w-full bg-border h-1">
          <div className="bg-primary h-full" style={{ width: "84%" }}></div>
        </div>
        <div className="text-xs">Network: 42ms</div>
      </div>
    </motion.div>
  );
}
