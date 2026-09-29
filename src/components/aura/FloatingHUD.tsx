import { useEffect, useState } from "react";

export function FloatingHUD({ className = "" }: { className?: string }) {
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      const connection = (navigator as Navigator & { connection?: { rtt?: number } }).connection;
      setLatency(typeof connection?.rtt === "number" ? connection.rtt : null);
    };
    update();
    const timer = window.setInterval(update, 5000);
    return () => window.clearInterval(timer);
  }, []);

  return <div className={`fixed bottom-4 left-4 panel p-3 z-50 text-[10px] space-y-1 ${className}`}>
    <div className="text-muted-foreground">RUNTIME STATUS</div>
    <div>NETWORK RTT: {latency === null ? "N/A" : `${latency}ms`}</div>
  </div>;
}
