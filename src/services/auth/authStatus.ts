import { globalProviderRegistry } from "./providers";

function configured(env: Record<string, unknown>, key: string): boolean {
  return String(env[key] ?? "").trim().length > 0;
}

export function getAuthConfigurationStatus(env: Record<string, unknown>) {
  const providers = globalProviderRegistry
    .getEntries()
    .filter(([, strategy]) => strategy.type === "OIDC" || strategy.type === "OAuth2")
    .map(([id, strategy]) => {
      const prefix = `AURA_AUTH_${id.toUpperCase().replace(/-/g, "_")}`;
      return {
        id,
        name: strategy.name,
        type: strategy.type,
        clientIdConfigured: configured(env, `${prefix}_CLIENT_ID`),
        clientSecretConfigured: configured(env, `${prefix}_CLIENT_SECRET`),
      };
    });

  return {
    stateSecretConfigured: configured(env, "AURA_AUTH_STATE_SECRET"),
    sessionSigningKeyConfigured: configured(env, "AURA_SESSION_SIGNING_KEY"),
    providers,
  };
}
