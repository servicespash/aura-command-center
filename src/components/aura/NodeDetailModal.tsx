import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  bandLabel,
  bandTextClass,
  frequencyScore,
  threatBand,
  threatScore,
  type GeoNode,
} from "./data";

function Bar({ label, value, weight }: { label: string; value: number; weight: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="label-hud">
          {label} · {weight}
        </span>
        <span className="text-xs text-foreground">{value}</span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded bg-secondary">
        <div
          className="h-1.5 rounded bg-primary"
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

const RISK_VALUE = { low: 15, medium: 55, high: 95 } as const;

export function NodeDetailModal({ node, onClose }: { node: GeoNode | null; onClose: () => void }) {
  if (!node) return null;
  const score = threatScore(node);
  const band = threatBand(score);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="panel max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-base tracking-[0.14em] text-primary">
            {node.label}
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            {node.lat.toFixed(4)}, {node.lon.toFixed(4)} · {node.asn} · {node.country}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded border border-border/60 px-3 py-2">
          <span className="label-hud">Threat score</span>
          <span className={`font-display text-2xl font-bold ${bandTextClass(band)}`}>
            {score} <span className="text-[10px]">{bandLabel(band)}</span>
          </span>
        </div>

        <div className="space-y-3">
          <Bar label="Connection frequency" weight="40%" value={frequencyScore(node.connections)} />
          <Bar label="Geolocation risk" weight="35%" value={RISK_VALUE[node.geoRisk]} />
          <Bar label="Subdomain target risk" weight="25%" value={RISK_VALUE[node.subdomainRisk]} />
        </div>

        <dl className="grid grid-cols-2 gap-3 text-[11px]">
          <div>
            <dt className="label-hud">IP address</dt>
            <dd className="text-foreground">{node.ip}</dd>
          </div>
          <div>
            <dt className="label-hud">Target subdomain</dt>
            <dd className="text-foreground">{node.targetSubdomain}</dd>
          </div>
          <div>
            <dt className="label-hud">Identity detected</dt>
            <dd className={node.email ? "text-warning" : "text-muted-foreground"}>
              {node.email ?? "no signed-in identity"}
            </dd>
          </div>
          <div>
            <dt className="label-hud">Connections 24h</dt>
            <dd className="text-foreground">{node.connections.toLocaleString()}</dd>
          </div>
        </dl>

        <div>
          <p className="label-hud">Connection history</p>
          <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto pr-1">
            {node.history.map((h, i) => (
              <li
                key={`${h.at.getTime()}-${i}`}
                className="flex items-baseline justify-between gap-2 border-b border-border/50 pb-1 text-[11px] last:border-0"
              >
                <span className="text-foreground">{h.action}</span>
                <span className="text-muted-foreground">{h.ip}</span>
                <span className="text-muted-foreground">
                  {h.at.toLocaleTimeString([], { hour12: false })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
