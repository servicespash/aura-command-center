export type EgressEndpoint = {
  id: string;
  url: string;
  protocol: "http" | "https" | "socks5";
  region?: string;
  label?: string;
  enabled: boolean;
};

export class EgressRouter {
  private readonly endpoints: EgressEndpoint[];

  constructor(endpoints: EgressEndpoint[] = []) {
    this.endpoints = endpoints.filter((e) => e.enabled && EgressRouter.isValid(e.url));
  }

  list(): EgressEndpoint[] {
    return [...this.endpoints];
  }

  resolve(id?: string) {
    if (!this.endpoints.length) return undefined;
    if (id) return this.endpoints.find((e) => e.id === id);
    return this.endpoints[0];
  }

  static fromEnvironment(): EgressRouter {
    const raw = import.meta.env["VITE_AURA_EGRESS_ENDPOINTS"];
    if (!raw) return new EgressRouter();
    try {
      const parsed = JSON.parse(raw) as EgressEndpoint[];
      return new EgressRouter(parsed);
    } catch {
      throw new Error("VITE_AURA_EGRESS_ENDPOINTS must contain valid JSON");
    }
  }

  static isValid(value: string) {
    try {
      const url = new URL(value);
      return ["http:", "https:", "socks5:"].includes(url.protocol);
    } catch {
      return false;
    }
  }
}
