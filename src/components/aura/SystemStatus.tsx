import { useMemo } from "react";

export function SystemStatus({ status }: { status: "online" | "offline" | "degraded" }) {
  const config = useMemo(() => {
    switch (status) {
      case "online":
        return { color: "text-success", label: "system operational" };
      case "offline":
        return { color: "text-destructive", label: "system offline" };
      case "degraded":
        return { color: "text-warning", label: "performance degraded" };
    }
  }, [status]);

  return (
    <div className="flex items-center gap-2">
      <div className={`pulse-node h-2 w-2 rounded-full bg-current ${config.color}`} />
      <span className="label-hud text-[10px]">{config.label}</span>
    </div>
  );
}
