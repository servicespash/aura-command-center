import { useState, useRef, useEffect } from "react";
import { motion, useDragControls } from "framer-motion";
import { X, Maximize2, Activity } from "lucide-react";
import { useMapStore } from "@/store/mapStore";

export function StreamHUD() {
  const { streamTarget, setStreamTarget } = useMapStore();
  const dragControls = useDragControls();

  if (!streamTarget) return null;

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed bottom-6 right-6 z-50 w-80 overflow-hidden rounded-lg border border-primary/30 bg-background/80 backdrop-blur-md shadow-2xl"
    >
      <div 
        className="flex cursor-move items-center justify-between border-b border-primary/20 bg-primary/10 px-3 py-2"
        onPointerDown={(e) => dragControls.start(e)}
      >
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span className="font-display text-[10px] uppercase tracking-wider text-primary">
            LIVE: {streamTarget.id || "CCTV-01"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-primary/70 hover:text-primary transition-colors">
            <Maximize2 className="h-3 w-3" />
          </button>
          <button 
            onClick={() => setStreamTarget(null)}
            className="text-primary/70 hover:text-destructive transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      
      <div className="relative aspect-video w-full bg-black/90 p-1">
        {/* Placeholder for real HLS/MJPEG feed */}
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40">
          <div className="h-10 w-10 animate-pulse rounded-full border-2 border-dashed border-primary/50" />
          <p className="mt-2 text-[9px] uppercase tracking-widest text-primary/50">Acquiring signal</p>
        </div>
        
        {/* Synthetic overlay metrics */}
        <div className="absolute bottom-2 left-2 flex flex-col gap-0.5">
          <span className="text-[9px] text-primary/80 font-mono">LAT: {streamTarget.lat?.toFixed(4) || "0.0000"}</span>
          <span className="text-[9px] text-primary/80 font-mono">LON: {streamTarget.lon?.toFixed(4) || "0.0000"}</span>
        </div>
        <div className="absolute top-2 right-2">
          <span className="flex items-center gap-1.5 text-[9px] text-destructive font-mono blink">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
            REC
          </span>
        </div>
      </div>
    </motion.div>
  );
}
