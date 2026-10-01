import { motion, useDragControls } from "framer-motion";
import { X, Activity } from "lucide-react";
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
            STREAM: {streamTarget.id || "UNNAMED"}
          </span>
        </div>
        <button
          onClick={() => setStreamTarget(null)}
          className="text-primary/70 transition-colors hover:text-destructive"
          aria-label="Close stream panel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="relative flex aspect-video w-full items-center justify-center bg-black/90 p-4">
        <div className="text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <div className="mb-2 text-primary">NO STREAM SOURCE CONFIGURED</div>
          <div>Attach a verified HLS, MJPEG, or WebRTC source before opening this panel.</div>
        </div>
      </div>

      <div className="border-t border-primary/20 px-3 py-2 font-mono text-[9px] text-muted-foreground">
        LAT: {streamTarget.lat.toFixed(4)} · LON: {streamTarget.lon.toFixed(4)}
      </div>
    </motion.div>
  );
}
