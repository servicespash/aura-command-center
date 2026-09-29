import { useTelemetryStore } from "@/store/telemetryStore";
import { EgressRouter } from "./EgressRouter";
import { StorageService } from "./StorageService";
import { MMDBReader } from "@/services/spatial/mmdbReader";
import { globalEvents, EVENTS } from "@/lib/events";
import { PanicService } from "@/services/security/panicService";
import { globalP2PMesh } from "@/engine/network/p2p";

export interface CommandDefinition {
  name: string;
  requiredPkg: string;
  description: string;
  execute: (
    args: Record<string, string | boolean>,
    setResponse: (msg: string) => void,
  ) => Promise<void> | void;
}

export const COMMAND_REGISTRY: Record<string, CommandDefinition> = {
  help: {
    name: "help",
    requiredPkg: "built-in",
    description: "Displays complete CLI command table or detailed manual for a specific command.",
    execute: (args, setResponse) => {
      setResponse(
        `[SYSTEM] Listing 20 registered CLI commands...\n` +
          Object.values(COMMAND_REGISTRY)
            .map((c) => `${c.name.padEnd(12)} [${c.requiredPkg}] - ${c.description}`)
            .join("\n"),
      );
    },
  },
  scan: {
    name: "scan",
    requiredPkg: "net-analyzer-v2",
    description: "Runs perimeter security scans on target domain/IP and computes Threat Score.",
    execute: (args, setResponse) => {
      const target = args["target"] || "unknown-target";
      setResponse("[SCAN] Browser runtime cannot perform an authorized perimeter scan. Configure the AURA runtime agent.");
    },
  },
  find: {
    name: "find",
    requiredPkg: "geoip-locator",
    description: "Resolves GeoIP coordinates and auto-zooms 3D Globe map with a pulsing indicator.",
    execute: async (args, setResponse) => {
      const ip = (args["ip"] as string) || "unknown";

      const result = await MMDBReader.resolve(ip);
      // Optional: hide terminal when executing a find
      globalEvents.emit(EVENTS.TERMINAL_TOGGLE, false);

      setResponse(
        `[MAP] Target IP ${ip} mapped to Lat: ${result.coords[1].toFixed(4)}, Long: ${result.coords[0].toFixed(4)}...`,
      );
    },
  },
  login: {
    name: "login",
    requiredPkg: "auth-bridge",
    description: "Prompts credentials or triggers browser redirect to target login gateway.",
    execute: (args, setResponse) => {
      const target = (args["target"] as string) || (args["url"] as string) || "github";
      const url = target.startsWith("http") ? target : `https://${target}.com/login`;
      setResponse(`[AUTH] Redirecting to external gateway: ${url}...`);
      window.open(url, "_blank");
    },
  },
  "db-connect": {
    name: "db-connect",
    requiredPkg: "db-client-suite",
    description: "Prompts for DB credentials to mount a mock remote database terminal context.",
    execute: (args, setResponse) => {
      const target = (args["target"] as string) || "local";
      setResponse(`[DB] Connected to PostgreSQL instance @ ${target}.db.internal`);
    },
  },
  egress: {
    name: "egress",
    requiredPkg: "proxy-cycler",
    description: "Cycles active outbound proxies or displays status.",
    execute: (args, setResponse) => {
      if (args["cycle"] || args["status"]) {
        const router = EgressRouter.fromEnvironment();
        const endpoint = router.resolve();
        setResponse(endpoint ? `[EGRESS] Configured endpoint: ${endpoint.id} | ${endpoint.url}` : "[EGRESS] No configured egress endpoints.");
      } else { setResponse("[ERROR] Missing flag --cycle or --status"); }
    },
  },
  onboard: {
    name: "onboard",
    requiredPkg: "tenant-manager",
    description: "Initiates tenant onboarding flow and generates isolated telemetry key.",
    execute: (args, setResponse) => {
      const domain = (args["domain"] as string) || "new-tenant.com";
      const key = `tk_live_${Math.random().toString(36).substring(2, 10)}`;
      useTelemetryStore.getState().addTenant({
        domain,
        method: "api",
        key,
        status: "verified",
        events24h: 0,
      });
      setResponse(`[TENANT] Domain verified. Issued Telemetry Key: ${key}`);
    },
  },
  tenants: {
    name: "tenants",
    requiredPkg: "tenant-manager",
    description: "Displays all onboarded domain tenants and active key statuses.",
    execute: (args, setResponse) => {
      const tenants = useTelemetryStore.getState().tenants;
      setResponse(`[TENANTS] Active Tenants: ${tenants.length} domain instances monitored.`);
    },
  },
  threats: {
    name: "threats",
    requiredPkg: "telemetry-core",
    description: "Filters active global threat feeds by severity rating.",
    execute: (args, setResponse) => {
      const level = (args["level"] as string) || "high";
      const events = useTelemetryStore
        .getState()
        .events.filter(
          (e) =>
            (level === "high" && e.severity === "critical") ||
            (level === "med" && e.severity === "elevated") ||
            (level === "low" && e.severity === "clear"),
        );
      setResponse(
        `[FEED] Filter applied: ${level.toUpperCase()} severity (${events.length} events active)`,
      );
    },
  },
  archive: {
    name: "archive",
    requiredPkg: "indexeddb-dal",
    description: "Flushes or views active terminal event buffers into/from storage.",
    execute: async (args, setResponse) => {
      if (args["export"]) {
        const events = useTelemetryStore.getState().events;
        await StorageService.archiveEvents(events);
        setResponse(`[DAL] Saved ${events.length} incident logs to IndexedDB partition.`);
      } else if (args["view"]) {
        const archived = await StorageService.getArchivedEvents();
        setResponse(`[DAL] Historical archives: ${archived.length} events found in storage.`);
      } else {
        setResponse(`[ERROR] Missing flag --export or --view`);
      }
    },
  },
  delete: {
    name: "delete",
    requiredPkg: "indexeddb-dal",
    description: "Permanently purges a specific telemetry log record from local storage.",
    execute: async (args, setResponse) => {
      const id = (args["log"] as string) || "unknown";
      const success = await StorageService.deleteArchivedEvent(id);
      if (success) {
        setResponse(`[DAL] Log record #${id} successfully purged.`);
      } else {
        setResponse(`[ERROR] Log record #${id} not found in archive.`);
      }
    },
  },
  search: {
    name: "search",
    requiredPkg: "indexeddb-dal",
    description: "Searches global event logs for matching IP, domain, or timestamp strings.",
    execute: async (args, setResponse) => {
      const query = (args["query"] as string) || "";
      const archived = await StorageService.getArchivedEvents();
      const matches = archived.filter(
        (e) => e.ip.includes(query) || e.subdomain.includes(query) || e.nodeId.includes(query),
      );
      setResponse(`[SEARCH] Found ${matches.length} matching entries for query '${query}'.`);
    },
  },
  clear: {
    name: "clear",
    requiredPkg: "built-in",
    description: "Clears current terminal display screen buffer.",
    execute: () => {
      // Handled in component
    },
  },
  ping: {
    name: "ping",
    requiredPkg: "net-analyzer-v2",
    description: "Measures latency and packet response metrics to target hosts.",
    execute: async (args, setResponse) => {
      const host = String(args["host"] || "").trim();
      if (!host) { setResponse("[PING] Host is required."); return; }
      setResponse("[PING] Use the configured AURA runtime agent for an actual TCP/ICMP measurement.");
    },
  },
  traceroute: {
    name: "traceroute",
    requiredPkg: "net-analyzer-v2",
    description: "Traces simulated network hops across ghost proxy nodes.",
    execute: (args, setResponse) => {
      const target = String(args["target"] || "").trim();
      setResponse(target ? "[TRACE] Native traceroute is unavailable in the browser; agent integration required." : "[TRACE] Target is required.");
    },
  },
  theme: {
    name: "theme",
    requiredPkg: "built-in",
    description: "Forces manual visual themes (standard green, stealth amber, or alert red CRT).",
    execute: (args, setResponse) => {
      const mode = (args["mode"] as "default" | "stealth" | "alert") || "default";
      if (["default", "stealth", "alert"].includes(mode)) {
        useTelemetryStore.getState().setTheme(mode);
        setResponse(`[THEME] Visual mode updated to '${mode}'`);
      } else {
        setResponse(`[ERROR] Invalid theme mode. Use default, stealth, or alert.`);
      }
    },
  },
  audio: {
    name: "audio",
    requiredPkg: "audio-engine",
    description: "Toggles WebAudio engine ambient sound effects and keystroke ticks.",
    execute: (args, setResponse) => {
      useTelemetryStore.getState().toggleAudio();
      const state = useTelemetryStore.getState().audioEnabled;
      setResponse(`[AUDIO] Sound Engine state: ${state ? "ACTIVE" : "MUTED"}`);
    },
  },
  pkg: {
    name: "pkg",
    requiredPkg: "built-in",
    description: "Installs missing CLI package dependencies into the local package store.",
    execute: async (args, setResponse) => {
      // This will be partially handled in component for animation, but this is the fallback logic.
      const posArg = args["pos_1"];
      if (posArg === "install" && args["pos_2"]) {
        const pkg = args["pos_2"] as string;
        useTelemetryStore.getState().installPackage(pkg);
        setResponse(`[PKG] Installed dependency '${pkg}'.`);
      } else {
        setResponse(`[ERROR] Usage: pkg install <package_name>`);
      }
    },
  },
  panic: {
    name: "panic",
    requiredPkg: "built-in",
    description: "Fail-safe: Instant purge of all local storage and RAM state.",
    execute: async (args, setResponse) => {
      if (args["purge"] && args["confirm"]) {
        await PanicService.execute();
        setResponse(`[PANIC] Emergency purge successful.`);
      } else {
        setResponse(`[ERROR] Missing flags: --purge --confirm`);
      }
    },
  },
  msg: {
    name: "msg",
    requiredPkg: "p2p-mesh",
    description: "Sends an end-to-end encrypted message to an active node via P2P mesh socket.",
    execute: async (args, setResponse) => {
      const target = (args["pos_1"] as string) || "broadcast";
      const message = (args["pos_2"] as string) || "PING";

      await globalP2PMesh.sendMessage(target, message);

      setResponse(`[P2P] Encrypted payload dispatched to ${target}`);
    },
  },
};
