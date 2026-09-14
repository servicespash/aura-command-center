import { ReactNode } from "react";

export function Scanline({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`scanline ${className}`}>
      {children}
      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(transparent_50%,oklch(0.16_0.03_250/0.1)_50%)] bg-[length:100%_4px] opacity-20" />
    </div>
  );
}
