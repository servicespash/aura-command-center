import { useEffect, useState } from "react";

export function FloatingHUD({ className = "" }: { className?: string }) {
  const [stats, setStats] = useState({ ram: 42, latency: 12 });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        ram: Math.floor(40 + Math.random() * 10),
        latency: Math.floor(10 + Math.random() * 5),
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`fixed bottom-4 left-4 panel p-3 z-50 text-[10px] space-y-1 ${className}`}>
      <div className="text-muted-foreground">SYS_RES_MON</div>
      <div className="flex gap-4">
        <span>RAM: {stats.ram}%</span>
        <span>LAT: {stats.latency}ms</span>
      </div>
    </div>
  );
}
