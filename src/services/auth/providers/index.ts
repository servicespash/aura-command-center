export type ProviderCategory =
  | "Big Tech"
  | "Dev Ecosystem"
  | "Creator Platforms"
  | "Enterprise SSO/OIDC"
  | "Perimeter Nodes/Web3/Domains";

export type StrategyType = "OAuth2" | "OIDC" | "SAML2" | "Web3Signature" | "DomainNode";

export interface BaseStrategy {
  type: StrategyType;
  name: string;
  category: ProviderCategory;
  clientId?: string;
}

export interface OAuth2Strategy extends BaseStrategy {
  type: "OAuth2";
  authorizationEndpoint: string;
  tokenEndpoint: string;
}

export interface OIDCStrategy extends BaseStrategy {
  type: "OIDC";
  issuer: string;
  discoveryUrl: string;
}

export interface SAML2Strategy extends BaseStrategy {
  type: "SAML2";
  entryPoint: string;
  issuer: string;
}

export interface Web3SignatureStrategy extends BaseStrategy {
  type: "Web3Signature";
  contractAddress?: string;
  chainIds: number[];
}

export interface DomainNodeStrategy extends BaseStrategy {
  type: "DomainNode";
  nodeUrl: string;
  trustChain: string[];
}

export type AnyStrategy =
  OAuth2Strategy | OIDCStrategy | SAML2Strategy | Web3SignatureStrategy | DomainNodeStrategy;

export class ProviderRegistry {
  private providers: Map<string, AnyStrategy> = new Map();
  private oidcMetadataCache: Map<string, Record<string, unknown>> = new Map();

  public register(id: string, strategy: AnyStrategy): void {
    this.providers.set(id, strategy);
  }

  public get(id: string): AnyStrategy | undefined {
    return this.providers.get(id);
  }

  public getAll(): AnyStrategy[] {
    return Array.from(this.providers.values());
  }

  public async resolveOIDCMetadata(id: string): Promise<Record<string, unknown> | null> {
    const strategy = this.providers.get(id);
    if (!strategy || strategy.type !== "OIDC") {
      throw new Error(`Provider ${id} is not an OIDC strategy.`);
    }

    if (this.oidcMetadataCache.has(id)) {
      return this.oidcMetadataCache.get(id) || null;
    }

    try {
      const response = await fetch(strategy.discoveryUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.statusText}`);
      }
      const data = (await response.json()) as Record<string, unknown>;
      this.oidcMetadataCache.set(id, data);
      return data;
    } catch (error) {
      console.error(`[ProviderRegistry] OIDC resolution failed for ${id}:`, error);
      return null;
    }
  }

  // Pre-load common template providers
  public bootstrapTemplates(): void {
    this.register("google", {
      type: "OIDC",
      name: "Google Workspace",
      category: "Big Tech",
      issuer: "https://accounts.google.com",
      discoveryUrl: "https://accounts.google.com/.well-known/openid-configuration",
    });

    this.register("github", {
      type: "OAuth2",
      name: "GitHub",
      category: "Dev Ecosystem",
      authorizationEndpoint: "https://github.com/login/oauth/authorize",
      tokenEndpoint: "https://github.com/login/oauth/access_token",
    });

    this.register("eth-mainnet", {
      type: "Web3Signature",
      name: "Ethereum Mainnet",
      category: "Perimeter Nodes/Web3/Domains",
      chainIds: [1],
    });
  }
}

export const globalProviderRegistry = new ProviderRegistry();
globalProviderRegistry.bootstrapTemplates();
