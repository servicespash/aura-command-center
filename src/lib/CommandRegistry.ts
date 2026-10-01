import { useTelemetryStore } from "@/store/telemetryStore";
import { EgressRouter } from "./EgressRouter";
import { StorageService } from "./StorageService";
import { MMDBReader } from "@/services/spatial/mmdbReader";
import { globalEvents, EVENTS } from "@/lib/events";
import { PanicService } from "@/services/security/panicService";
import { agentProbe } from "@/services/runtime/agentClient";
import { globalProviderRegistry } from "@/services/auth/providers";
import { useDeviceLedgerStore } from "@/store/deviceLedgerStore";

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
    description: "Displays the registered CLI commands and their execution requirements.",
    execute: (_args, setResponse) => {
      setResponse(
        `[SYSTEM] Registered CLI commands...\n` +
          Object.values(COMMAND_REGISTRY)
            .map((c) => `${c.name.padEnd(12)} [${c.requiredPkg}] - ${c.description}`)
            .join("\n"),
      );
    },
  },
  scan: {
    name: "scan",
    requiredPkg: "net-analyzer-v2",
    description: "Performs an allowlisted HTTP reachability probe through the AURA runtime agent.",
    execute: async (args, setResponse) => {
      const target = String(args["target"] || "").trim();
      if (!target) return setResponse("[SCAN] Target is required.");
      try {
        const url = /^https?:\/\//i.test(target) ? target : `https://${target}`;
        const result = await agentProbe({ operation: "http", url, method: "HEAD" });
        const data = result.data ?? {};
        setResponse(
          `[SCAN] ${result.target} | HTTP ${String(data["status"] ?? "unknown")} | ${result.durationMs}ms | server=${String(data["server"] ?? "unknown")}`,
        );
      } catch (error) {
        setResponse(`[SCAN] Failed: ${error instanceof Error ? error.message : "probe failed"}`);
      }
    },
  },
  find: {
    name: "find",
    requiredPkg: "geoip-locator",
    description: "Resolves an IP through the configured live GeoIP provider and centers the map.",
    execute: async (args, setResponse) => {
      const ip = String(args["ip"] || "").trim();
      if (!ip) return setResponse("[MAP] IP address is required.");
      try {
        const result = await MMDBReader.resolve(ip);
        globalEvents.emit(EVENTS.TERMINAL_TOGGLE, false);
        setResponse(
          `[MAP] ${result.ip} | ${result.city}, ${result.country} | Lat: ${result.coords[1].toFixed(4)}, Long: ${result.coords[0].toFixed(4)}`,
        );
      } catch (error) {
        setResponse(
          `[MAP] Lookup failed: ${error instanceof Error ? error.message : "lookup failed"}`,
        );
      }
    },
  },
  providers: {
    name: "providers",
    requiredPkg: "auth-bridge",
    description: "Lists configured client-visible identity provider strategies.",
    execute: (_args, setResponse) => {
      const providers = globalProviderRegistry
        .getEntries()
        .filter(([, provider]) => provider.type === "OIDC" || provider.type === "OAuth2")
        .map(([id, provider]) => `${id.padEnd(16)} ${provider.name} [${provider.type}]`);
      setResponse(providers.length ? `[AUTH] Providers\\n${providers.join("\\n")}` : "[AUTH] No browser identity providers registered.");
    },
  },
  login: {
    name: "login",
    requiredPkg: "auth-bridge",
    description: "Starts a configured external identity-provider sign-in and returns to AURA-NET.",
    execute: (args, setResponse) => {
      const provider = String(args["provider"] || args["target"] || "")
        .trim()
        .toLowerCase();
      if (!provider) {
        setResponse("[AUTH] Usage: login --provider google|github");
        return;
      }
      setResponse(`[AUTH] Starting ${provider} identity flow…`);
      window.location.assign(`/api/auth/start?provider=${encodeURIComponent(provider)}`);
    },
  },
  devices: {
    name: "devices",
    requiredPkg: "device-ledger",
    description: "Displays the transient locally enrolled devices and their last reported state.",
    execute: (_args, setResponse) => {
      const devices = Object.values(useDeviceLedgerStore.getState().devices);
      if (!devices.length) {
        setResponse("[DEVICES] No locally enrolled devices.");
        return;
      }
      setResponse(
        "[DEVICES] Transient authorized device ledger\\n" +
          devices.map((device) =>
            `${device.id} | ${device.name} | ${device.platform} | ${device.status} | lastSeen=${new Date(device.lastSeen).toISOString()}`,
          ).join("\\n"),
      );
    },
  },
  "device-enroll": {
    name: "device-enroll",
    requiredPkg: "device-ledger",
    description: "Enrolls the current device locally; network and location fields are supplied by the authorized device agent.",
    execute: (args, setResponse) => {
      const name = String(args["name"] || "").trim();
      if (!name) {
        setResponse("[DEVICES] Usage: device-enroll --name <device-name>");
        return;
      }
      const id = crypto.randomUUID();
      const platform = typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : "unknown";
      useDeviceLedgerStore.getState().enroll({
        id,
        name,
        platform,
        enrolledAt: Date.now(),
        lastSeen: Date.now(),
        status: "online",
      });
      setResponse(`[DEVICES] Enrolled ${name} locally as ${id}. IP/location remain unset until reported by the authorized device agent.`);
    },
  },
  "device-revoke": {
    name: "device-revoke",
    requiredPkg: "device-ledger",
    description: "Revokes a locally enrolled device from the transient ledger.",
    execute: (args, setResponse) => {
      const id = String(args["id"] || "").trim();
      if (!id) {
        setResponse("[DEVICES] Device ID is required.");
        return;
      }
      useDeviceLedgerStore.getState().revoke(id);
      setResponse(`[DEVICES] Revoked local device ${id}.`);
    },
  },
  "db-connect": {
    name: "db-connect",
    requiredPkg: "db-client-suite",
    description:
      "Reports database connectivity status; browser-side PostgreSQL sessions are not supported.",
    execute: (args, setResponse) => {
      const target = String(args["target"] || "").trim();
      setResponse(
        target
          ? `[DB] Direct PostgreSQL connection is unavailable in the browser. Configure a server-side database connector for ${target}.`
          : "[DB] Target is required. No database connector is configured.",
      );
    },
  },
  egress: {
    name: "egress",
    requiredPkg: "proxy-cycler",
    description: "Displays configured outbound egress endpoints.",
    execute: (args, setResponse) => {
      if (!args["cycle"] && !args["status"])
        return setResponse("[ERROR] Missing flag --cycle or --status");
      const endpoints = EgressRouter.fromEnvironment().list();
      setResponse(
        endpoints.length
          ? endpoints.map((e) => `[EGRESS] ${e.id} | ${e.protocol} | ${e.url}`).join("\n")
          : "[EGRESS] No configured egress endpoints.",
      );
    },
  },
  onboard: {
    name: "onboard",
    requiredPkg: "tenant-manager",
    description:
      "Creates a pending local tenant record; ownership verification is required before activation.",
    execute: (args, setResponse) => {
      const domain = String(args["domain"] || "").trim();
      if (!domain) return setResponse("[TENANT] Domain is required.");
      const key = `tk_pending_${crypto.randomUUID().replace(/-/g, "")}`;
      useTelemetryStore
        .getState()
        .addTenant({ domain, method: "DNS TXT", key, status: "pending", events24h: 0 });
      setResponse(`[TENANT] Pending ${domain}. Verify _aura-verify.${domain} before activation.`);
    },
  },
  tenants: {
    name: "tenants",
    requiredPkg: "tenant-manager",
    description: "Displays the number of locally persisted tenant records.",
    execute: (_args, setResponse) =>
      setResponse(
        `[TENANTS] ${useTelemetryStore.getState().tenants.length} tenant records stored locally.`,
      ),
  },
  threats: {
    name: "threats",
    requiredPkg: "telemetry-core",
    description: "Filters ingested threat events by severity.",
    execute: (args, setResponse) => {
      const level = String(args["level"] || "high");
      const events = useTelemetryStore
        .getState()
        .events.filter(
          (e) =>
            (level === "high" && e.severity === "critical") ||
            (level === "med" && e.severity === "elevated") ||
            (level === "low" && e.severity === "clear"),
        );
      setResponse(`[FEED] ${level.toUpperCase()} severity: ${events.length} ingested events.`);
    },
  },
  archive: {
    name: "archive",
    requiredPkg: "indexeddb-dal",
    description: "Archives or reads persisted telemetry records.",
    execute: async (args, setResponse) => {
      if (args["export"]) {
        const events = useTelemetryStore.getState().events;
        await StorageService.archiveEvents(events);
        setResponse(`[DAL] Saved ${events.length} incident logs to IndexedDB.`);
      } else if (args["view"]) {
        setResponse(
          `[DAL] Historical archive contains ${(await StorageService.getArchivedEvents()).length} events.`,
        );
      } else setResponse("[ERROR] Missing flag --export or --view");
    },
  },
  delete: {
    name: "delete",
    requiredPkg: "indexeddb-dal",
    description: "Permanently deletes an archived telemetry record by ID.",
    execute: async (args, setResponse) => {
      const id = String(args["log"] || "").trim();
      if (!id) return setResponse("[DAL] Log ID is required.");
      const success = await StorageService.deleteArchivedEvent(id);
      setResponse(
        success ? `[DAL] Deleted archived log #${id}.` : `[DAL] Log #${id} was not found.`,
      );
    },
  },
  search: {
    name: "search",
    requiredPkg: "indexeddb-dal",
    description: "Searches archived event records.",
    execute: async (args, setResponse) => {
      const query = String(args["query"] || "")
        .trim()
        .toLowerCase();
      if (!query) return setResponse("[SEARCH] Query is required.");
      const archived = await StorageService.getArchivedEvents();
      const matches = archived.filter(
        (e) =>
          e.ip.toLowerCase().includes(query) ||
          e.subdomain.toLowerCase().includes(query) ||
          e.nodeId.toLowerCase().includes(query),
      );
      setResponse(`[SEARCH] Found ${matches.length} archived entries for '${query}'.`);
    },
  },
  clear: {
    name: "clear",
    requiredPkg: "built-in",
    description: "Clears the terminal display buffer.",
    execute: () => {},
  },
  ping: {
    name: "ping",
    requiredPkg: "net-analyzer-v2",
    description: "Performs an allowlisted TCP reachability probe through the AURA runtime agent.",
    execute: async (args, setResponse) => {
      const host = String(args["host"] || "").trim();
      if (!host) return setResponse("[PING] Host is required.");
      try {
        const result = await agentProbe({ operation: "tcp", host, port: 443, timeoutMs: 5000 });
        const data = result.data ?? {};
        setResponse(
          `[PING] ${host}:443 | reachable=${String(data["reachable"] ?? false)} | ${String(data["latencyMs"] ?? result.durationMs)}ms`,
        );
      } catch (error) {
        setResponse(`[PING] Failed: ${error instanceof Error ? error.message : "probe failed"}`);
      }
    },
  },
  traceroute: {
    name: "traceroute",
    requiredPkg: "net-analyzer-v2",
    description:
      "Requires a native traceroute-capable runtime agent; no synthetic hops are generated.",
    execute: (args, setResponse) =>
      setResponse(
        String(args["target"] || "").trim()
          ? "[TRACE] Native traceroute is not exposed by the current runtime agent. No synthetic hops generated."
          : "[TRACE] Target is required.",
      ),
  },
  theme: {
    name: "theme",
    requiredPkg: "built-in",
    description: "Changes the local command-center visual theme.",
    execute: (args, setResponse) => {
      const mode = String(args["mode"] || "default") as "default" | "stealth" | "alert";
      if (["default", "stealth", "alert"].includes(mode)) {
        useTelemetryStore.getState().setTheme(mode);
        setResponse(`[THEME] Visual mode updated to '${mode}'.`);
      } else setResponse("[ERROR] Invalid theme mode. Use default, stealth, or alert.");
    },
  },
  audio: {
    name: "audio",
    requiredPkg: "audio-engine",
    description: "Toggles the local WebAudio engine.",
    execute: (_args, setResponse) => {
      useTelemetryStore.getState().toggleAudio();
      setResponse(
        `[AUDIO] Sound engine: ${useTelemetryStore.getState().audioEnabled ? "ACTIVE" : "MUTED"}`,
      );
    },
  },
  pkg: {
    name: "pkg",
    requiredPkg: "built-in",
    description: "Registers a package in the local package state.",
    execute: async (args, setResponse) => {
      if (args["pos_1"] === "install" && args["pos_2"]) {
        const pkg = String(args["pos_2"]);
        useTelemetryStore.getState().installPackage(pkg);
        setResponse(`[PKG] Registered dependency '${pkg}'.`);
      } else setResponse("[ERROR] Usage: pkg install <package_name>");
    },
  },
  panic: {
    name: "panic",
    requiredPkg: "built-in",
    description: "Purges configured local telemetry state.",
    execute: async (args, setResponse) => {
      if (args["purge"] && args["confirm"]) {
        await PanicService.execute();
        setResponse("[PANIC] Local purge completed.");
      } else setResponse("[ERROR] Missing flags: --purge --confirm");
    },
  },
};
