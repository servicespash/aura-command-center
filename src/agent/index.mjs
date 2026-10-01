import { createServer } from "node:http";
import { lookup } from "node:dns/promises";
import { Socket } from "node:net";
import { URL } from "node:url";

const PORT = Number(process.env.AURA_AGENT_PORT || 4317);
const TOKEN = process.env.AURA_AGENT_TOKEN || "";
const ALLOWLIST = (process.env.AURA_AGENT_ALLOWLIST || "")
  .split(",")
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean);
const allowed = (host) => {
  const value = host.toLowerCase().replace(/\.$/, "");
  return ALLOWLIST.some((entry) => value === entry || value.endsWith("." + entry));
};
const send = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
};

async function tcp(host, port, timeoutMs) {
  const started = performance.now();
  await new Promise((resolve, reject) => {
    const socket = new Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("TCP connection timed out"));
    }, timeoutMs);
    socket.once("connect", () => {
      clearTimeout(timer);
      socket.destroy();
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    socket.connect(port, host);
  });
  return { reachable: true, port, latencyMs: Math.round(performance.now() - started) };
}

createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/probe") return send(res, 404, { error: "Not found" });
  if (!TOKEN || req.headers.authorization !== "Bearer " + TOKEN)
    return send(res, 401, { error: "Unauthorized" });
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", async () => {
    const started = performance.now();
    try {
      const request = JSON.parse(raw);
      let target, data;
      if (request.operation === "dns") {
        target = String(request.host || "").trim();
        if (!allowed(target)) throw new Error("Target is not in AURA_AGENT_ALLOWLIST");
        data = { addresses: await lookup(target, { all: true }) };
      } else if (request.operation === "tcp") {
        target = String(request.host || "").trim();
        if (!allowed(target)) throw new Error("Target is not in AURA_AGENT_ALLOWLIST");
        const port = Number(request.port);
        if (!Number.isInteger(port) || port < 1 || port > 65535)
          throw new Error("Invalid TCP port");
        data = await tcp(
          target,
          port,
          Math.min(Math.max(Number(request.timeoutMs) || 5000, 250), 30000),
        );
      } else if (request.operation === "http") {
        const url = new URL(String(request.url));
        if (!["http:", "https:"].includes(url.protocol))
          throw new Error("Only HTTP(S) targets are supported");
        if (!allowed(url.hostname)) throw new Error("Target is not in AURA_AGENT_ALLOWLIST");
        const controller = new AbortController();
        const timer = setTimeout(
          () => controller.abort(),
          Math.min(Math.max(Number(request.timeoutMs) || 10000, 500), 30000),
        );
        const response = await fetch(url, {
          method: request.method === "GET" ? "GET" : "HEAD",
          redirect: "manual",
          signal: controller.signal,
        });
        clearTimeout(timer);
        target = url.toString();
        data = {
          status: response.status,
          statusText: response.statusText,
          location: response.headers.get("location"),
          server: response.headers.get("server"),
          contentType: response.headers.get("content-type"),
        };
      } else throw new Error("Unsupported probe operation");
      send(res, 200, {
        ok: true,
        operation: request.operation,
        target,
        durationMs: Math.round(performance.now() - started),
        data,
      });
    } catch (error) {
      send(res, 400, {
        ok: false,
        durationMs: Math.round(performance.now() - started),
        error: error instanceof Error ? error.message : "Probe failed",
      });
    }
  });
}).listen(PORT, "127.0.0.1", () =>
  console.log("AURA runtime agent listening on 127.0.0.1:" + PORT),
);
