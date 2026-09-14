import { motion, AnimatePresence } from "framer-motion";

export function AuraAlert({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] bg-destructive text-destructive-foreground px-6 py-3 rounded border border-white font-display text-sm uppercase tracking-widest"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        onClick={onClose}
      >
        CRITICAL ALERT: {message}
      </motion.div>
    </AnimatePresence>
  );
}
