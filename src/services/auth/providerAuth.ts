import { globalProviderRegistry, type AnyStrategy, type OIDCStrategy, type OAuth2Strategy } from "./providers";

type ProviderClaims = {
  provider: string;
  subject: string;
  email?: string;
  name?: string;
  avatar?: string;
};

function env(env: Record<string, unknown>, key: string): string {
  return String(env[key] ?? "").trim();
}

function base64url(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

async function signedState(provider: string, secret: string): Promise<string> {
  const payload = base64url(new TextEncoder().encode(JSON.stringify({
    provider,
    nonce: crypto.randomUUID(),
    issuedAt: Date.now(),
  })));
  return `${payload}.${await hmac(payload, secret)}`;
}

async function verifyState(state: string, secret: string): Promise<{ provider: string } | null> {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return null;
  const expected = await hmac(payload, secret);
  if (expected.length !== signature.length) return null;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  if (mismatch !== 0) return null;

  const parsed = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload.replace(/-/g, "+").replace(/_/g, "/") + "=="), (c) => c.charCodeAt(0)))) as {
    provider?: string;
    issuedAt?: number;
  };
  if (!parsed.provider || !parsed.issuedAt || Date.now() - parsed.issuedAt > 10 * 60_000) return null;
  return { provider: parsed.provider };
}

export async function createAuthorizationUrl(
  providerId: string,
  redirectUri: string,
  envVars: Record<string, unknown>,
): Promise<{ url: string; state: string }> {
  const strategy = globalProviderRegistry.get(providerId);
  if (!strategy) throw new Error("Unknown authentication provider");

  const stateSecret = env(envVars, "AURA_AUTH_STATE_SECRET");
  if (!stateSecret) throw new Error("AURA_AUTH_STATE_SECRET is not configured");

  const state = await signedState(providerId, stateSecret);
  const clientId = env(envVars, `AURA_AUTH_${providerId.toUpperCase().replace(/-/g, "_")}_CLIENT_ID`);
  if (!clientId) throw new Error(`Authentication provider ${providerId} is not configured`);

  if (strategy.type === "OIDC") {
    const metadata = await globalProviderRegistry.resolveOIDCMetadata(providerId);
    const authorizationEndpoint = String(metadata?.["authorization_endpoint"] ?? "");
    if (!authorizationEndpoint) throw new Error("OIDC authorization endpoint unavailable");
    const url = new URL(authorizationEndpoint);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid profile email");
    url.searchParams.set("state", state);
    return { url: url.toString(), state };
  }

  if (strategy.type === "OAuth2") {
    const url = new URL((strategy as OAuth2Strategy).authorizationEndpoint);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", providerId === "github" ? "read:user user:email" : "openid profile email");
    url.searchParams.set("state", state);
    return { url: url.toString(), state };
  }

  throw new Error(`Provider strategy ${strategy.type} requires a dedicated adapter`);
}

export async function exchangeCallback(
  providerId: string,
  code: string,
  redirectUri: string,
  envVars: Record<string, unknown>,
): Promise<ProviderClaims> {
  const strategy = globalProviderRegistry.get(providerId);
  if (!strategy || (strategy.type !== "OIDC" && strategy.type !== "OAuth2")) {
    throw new Error("Unsupported callback provider");
  }

  const clientId = env(envVars, `AURA_AUTH_${providerId.toUpperCase().replace(/-/g, "_")}_CLIENT_ID`);
  const clientSecret = env(envVars, `AURA_AUTH_${providerId.toUpperCase().replace(/-/g, "_")}_CLIENT_SECRET`);
  if (!clientId || !clientSecret) throw new Error("Authentication provider credentials are not configured");

  let tokenEndpoint = "";
  let userInfoEndpoint = "";

  if (strategy.type === "OIDC") {
    const metadata = await globalProviderRegistry.resolveOIDCMetadata(providerId);
    tokenEndpoint = String(metadata?.["token_endpoint"] ?? "");
    userInfoEndpoint = String(metadata?.["userinfo_endpoint"] ?? "");
  } else {
    tokenEndpoint = strategy.tokenEndpoint;
    userInfoEndpoint = providerId === "github" ? "https://api.github.com/user" : "";
  }

  if (!tokenEndpoint) throw new Error("Token endpoint unavailable");

  const tokenResponse = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });
  if (!tokenResponse.ok) throw new Error("Authorization code exchange failed");

  const token = (await tokenResponse.json()) as { access_token?: string };
  if (!token.access_token) throw new Error("Provider returned no access token");

  if (!userInfoEndpoint) throw new Error("User information endpoint unavailable");
  const userResponse = await fetch(userInfoEndpoint, {
    headers: { authorization: `Bearer ${token.access_token}`, accept: "application/json" },
  });
  if (!userResponse.ok) throw new Error("Provider user profile request failed");

  const profile = (await userResponse.json()) as Record<string, unknown>;
  return {
    provider: providerId,
    subject: String(profile["sub"] ?? profile["id"] ?? ""),
    email: typeof profile["email"] === "string" ? profile["email"] : undefined,
    name: typeof profile["name"] === "string" ? profile["name"] : typeof profile["login"] === "string" ? profile["login"] : undefined,
    avatar: typeof profile["picture"] === "string" ? profile["picture"] : typeof profile["avatar_url"] === "string" ? profile["avatar_url"] : undefined,
  };
}

export async function verifyOAuthState(state: string, envVars: Record<string, unknown>) {
  const secret = env(envVars, "AURA_AUTH_STATE_SECRET");
  if (!secret) throw new Error("AURA_AUTH_STATE_SECRET is not configured");
  return verifyState(state, secret);
}

export async function createSessionCookie(claims: ProviderClaims, envVars: Record<string, unknown>) {
  const secret = env(envVars, "AURA_SESSION_SIGNING_KEY");
  if (!secret) throw new Error("AURA_SESSION_SIGNING_KEY is not configured");
  const payload = base64url(new TextEncoder().encode(JSON.stringify({ ...claims, issuedAt: Date.now() })));
  const signature = await hmac(payload, secret);
  return `aura_session=${payload}.${signature}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`;
}

export async function verifySessionCookie(cookieValue: string, envVars: Record<string, unknown>): Promise<ProviderClaims | null> {
  const secret = env(envVars, "AURA_SESSION_SIGNING_KEY");
  if (!secret) throw new Error("AURA_SESSION_SIGNING_KEY is not configured");
  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature) return null;
  const expected = await hmac(payload, secret);
  if (expected.length !== signature.length) return null;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  if (mismatch !== 0) return null;

  const padded = payload.replace(/-/g, "+").replace(/_/g, "/") + "==".slice((payload.length + 2) % 4);
  try {
    const claims = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(padded), (char) => char.charCodeAt(0)),
      ),
    ) as ProviderClaims & { issuedAt?: number };
    if (!claims.provider || !claims.subject || !claims.issuedAt) return null;
    if (Date.now() - claims.issuedAt > 8 * 60 * 60_000) return null;
    return claims;
  } catch {
    return null;
  }
}

export type { ProviderClaims };
