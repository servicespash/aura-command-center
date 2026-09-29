export type ProbeRequest =
  | { operation: "dns"; host: string }
  | { operation: "tcp"; host: string; port: number; timeoutMs?: number }
  | { operation: "http"; url: string; method?: "HEAD" | "GET"; timeoutMs?: number };

export type ProbeResponse = {
  ok: boolean;
  operation: ProbeRequest["operation"];
  target: string;
  startedAt: string;
  durationMs: number;
  data?: Record<string, unknown>;
  error?: string;
};