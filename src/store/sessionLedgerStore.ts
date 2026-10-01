import { create } from "zustand";

export type AgentHeartbeat = {
  agentId: string;
  observedAt: number;
  latencyMs?: number;
};

export type EndpointNodeState = {
  nodeId: string;
  state: "online" | "offline" | "degraded";
  lastSeen: number;
  address?: string;
};

type SessionLedgerState = {
  heartbeats: Record<string, AgentHeartbeat>;
  sessions: Record<string, { token: string; expiresAt: number }>;
  nodes: Record<string, EndpointNodeState>;
  recordHeartbeat: (heartbeat: AgentHeartbeat) => void;
  setSession: (sessionId: string, token: string, expiresAt: number) => void;
  revokeSession: (sessionId: string) => void;
  setNode: (node: EndpointNodeState) => void;
  prune: (now?: number) => void;
  clear: () => void;
};

const HEARTBEAT_TTL_MS = 30_000;

export const useSessionLedgerStore = create<SessionLedgerState>((set) => ({
  heartbeats: {},
  sessions: {},
  nodes: {},
  recordHeartbeat: (heartbeat) =>
    set((state) => ({
      heartbeats: { ...state.heartbeats, [heartbeat.agentId]: heartbeat },
    })),
  setSession: (sessionId, token, expiresAt) =>
    set((state) => ({
      sessions: { ...state.sessions, [sessionId]: { token, expiresAt } },
    })),
  revokeSession: (sessionId) =>
    set((state) => {
      const sessions = { ...state.sessions };
      delete sessions[sessionId];
      return { sessions };
    }),
  setNode: (node) =>
    set((state) => ({
      nodes: { ...state.nodes, [node.nodeId]: node },
    })),
  prune: (now = Date.now()) =>
    set((state) => ({
      heartbeats: Object.fromEntries(
        Object.entries(state.heartbeats).filter(
          ([, value]) => now - value.observedAt <= HEARTBEAT_TTL_MS,
        ),
      ),
      sessions: Object.fromEntries(
        Object.entries(state.sessions).filter(([, value]) => value.expiresAt > now),
      ),
      nodes: Object.fromEntries(
        Object.entries(state.nodes).filter(([, value]) => now - value.lastSeen <= HEARTBEAT_TTL_MS),
      ),
    })),
  clear: () => set({ heartbeats: {}, sessions: {}, nodes: {} }),
}));
