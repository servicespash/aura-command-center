import { createServer } from "node:http";
import { lookup } from "node:dns/promises";
import { Socket } from "node:net";
import { URL } from "node:url";
import type { ProbeRequest, ProbeResponse } from "./protocol";

const PORT = Number(process.env.AURA_AGENT_PORT ?? 4317);
const TOKEN = process.env.AURA_AGENT_TOKEN ?? "";
const ALLOWLIST = (process.env.AURA_AGENT_ALLOWLIST ?? "")
  .split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);

function allowed(host: string) {
  if (!ALLOWLIST.length) return false;
  const value = host.toLowerCase().replace(/\.$/, "");
  return ALLOWLIST.some((entry) => value === entry || value.endsWith("." + entry));
}

function json(res: import("node:http").ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

function auth(req: import("node:http").IncomingMessage) {
  return Boolean(TOKEN) && req.headers.authorization === `Bearer ${TOKEN}`;
}

async function tcpProbe(host: string, port: number, timeoutMs: number) {
  const started = performance.now();
  await new Promise<void>((resolve, reject) => {
    const socket = new Socket();
    const timer = setTimeout(() => { socket.destroy(); reject(new Error("TCP connection timed out")); }, timeoutMs);
    socket.once("connect", () => { clearTimeout(timer); socket.destroy(); resolve(); });
    socket.once("error", (err) => { clearTimeout(timer); reject(err); });
    socket.connect(port, host);
  });
  return { reachable: true, port, latencyMs: Math.round(performance.now() - started) };
}

const server = createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/probe") return json(res, 404, { error: "Not found" });
  if (!auth(req)) return json(res, 401, { error: "Unauthorized" });

  let body = "";
  req.on("data", (chunk) => { body += chunk; });
  req.on("end", async () => {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    try {
      const request = JSON.parse(body) as ProbeRequest;
      let data: Record<string, unknown>;
      let target: string;

      if (request.operation === "dns") {
        target = request.host.trim();
        if (!allowed(target)) throw new Error("Target is not in AURA_AGENT_ALLOWLIST");
        const addresses = await lookup(target, { all: true });
        data = { addresses };
      } else if (request.operation === "tcp") {
        target = request.host.trim();
        if (!allowed(target)) throw new Error("Target is not in AURA_AGENT_ALLOWLIST");
        if (!Number.isInteger(request.port) || request.port < 1 || request.port > 65535) throw new Error("Invalid TCP port");
        data = await tcpProbe(target, request.port, Math.min(Math.max(request.timeoutMs ?? 5000, 250), 30000));
      } else {
        const url = new URL(request.url);
        target = url.toString();
        if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP(S) targets are supported");
        if (!allowed(url.hostname)) throw new Error("Target is not in AURA_AGENT_ALLOWLIST");
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), Math.min(Math.max(request.timeoutMs ?? 10000, 500), 30000));
        const response = await fetch(url, { method: request.method ?? "HEAD", redirect: "manual", signal: controller.signal });
        clearTimeout(timer);
        data = {
          status: response.status,
          statusText: response.statusText,
          location: response.headers.get("location"),
          server: response.headers.get("server"),
          contentType: response.headers.get("content-type"),
        };
      }

      const result: ProbeResponse = { ok: true, operation: request.operation, target, startedAt, durationMs: Math.round(performance.now() - started), data };
      json(res, 200, result);
    } catch (error) {
      const result: ProbeResponse = {
        ok: false,
        operation: (JSON.parse(body) as ProbeRequest)?.operation ?? "http",
        target: "unknown",
        startedAt,
        durationMs: Math.round(performance.now() - started),
        error: error instanceof Error ? error.message : "Probe failed",
      };
      json(res, 400, result);
    }
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`AURA runtime agent listening on 127.0.0.1:${PORT}`);
});