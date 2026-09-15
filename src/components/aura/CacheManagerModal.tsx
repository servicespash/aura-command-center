import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { Database, Trash2, Archive, RefreshCw } from "lucide-react";
import { useState } from "react";
import { ThreatEvent } from "./data";

interface CacheManagerProps {
  onClearData: () => void;
  onArchiveByDate: (date: Date) => void;
}

export function CacheManagerModal({ onClearData, onArchiveByDate }: CacheManagerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getArchiveSize = () => {
    try {
      const a1 = JSON.parse(localStorage.getItem("terminal_archive") || "[]");
      const a2 = JSON.parse(localStorage.getItem("aura_events_archive") || "[]");
      return a1.length + a2.length;
    } catch {
      return 0;
    }
  };

  const handleArchiveOlderThan = (hours: number) => {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    onArchiveByDate(cutoff);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs">
          <Database className="w-3 h-3 mr-1" /> CACHE MGR
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border/60 bg-background/95 backdrop-blur-md text-foreground font-mono">
        <DialogHeader>
          <DialogTitle className="text-primary font-bold uppercase tracking-wider flex items-center gap-2">
            <Database className="w-4 h-4" /> System Cache Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4 text-sm">
          <div>
            <h3 className="text-muted-foreground uppercase text-[11px] mb-3">Active Telemetry</h3>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => handleArchiveOlderThan(1)}
                className="justify-start hover:text-primary transition-colors h-auto py-2 px-3 text-xs"
              >
                <Archive className="w-3 h-3 mr-2" /> Archive Threat Logs &gt; 1h Old
              </Button>
              <Button
                variant="outline"
                onClick={() => handleArchiveOlderThan(24)}
                className="justify-start hover:text-primary transition-colors h-auto py-2 px-3 text-xs"
              >
                <Archive className="w-3 h-3 mr-2" /> Archive Threat Logs &gt; 24h Old
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-muted-foreground uppercase text-[11px] mb-3">Permanent Storage</h3>
            <div className="flex items-center justify-between border border-border/40 p-3 rounded bg-secondary/20">
              <div>
                <div className="text-xs font-semibold">Total Archived Entries</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Threat logs & Terminal history
                </div>
              </div>
              <div className="text-primary font-bold text-lg">{getArchiveSize()}</div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/40">
            <h3 className="text-destructive uppercase text-[11px] mb-3 font-bold">Danger Zone</h3>
            <p className="text-muted-foreground text-xs mb-3">
              Flushing data removes all active logs, tenants, and telemetry stats, returning the
              system to a clean state. Permanent archives are retained.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                onClearData();
                setIsOpen(false);
              }}
              className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              <RefreshCw className="w-3 h-3 mr-2" /> FACTORY RESET (FRESH INGESTION)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
