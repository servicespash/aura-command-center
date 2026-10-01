import { verifySessionCookie } from "@/services/auth/providerAuth";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function b64urlEncode(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "==".slice((value.length + 2) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64urlEncode(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

async function validSignature(value: string, signature: string, secret: string): Promise<boolean> {
  const expected = await sign(value, secret);
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++)
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return mismatch === 0;
}

function secret(env: Record<string, unknown>): string {
  const value = String(env["AURA_P2P_SIGNING_KEY"] ?? "");
  if (value.length < 32) throw new Error("AURA_P2P_SIGNING_KEY must be at least 32 characters");
  return value;
}

export async function issueP2PToken(
  claims: { provider: string; subject: string },
  env: Record<string, unknown>,
): Promise<string> {
  const payload = b64urlEncode(
    encoder.encode(
      JSON.stringify({
        sub: claims.subject,
        provider: claims.provider,
        exp: Date.now() + 5 * 60_000,
        tokenId: crypto.randomUUID(),
      }),
    ),
  );
  return `${payload}.${await sign(payload, secret(env))}`;
}

export async function authenticateP2PToken(
  token: string,
  env: Record<string, unknown>,
): Promise<{ sub: string; provider: string; exp: number; tokenId: string } | null> {
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !(await validSignature(payload, signature, secret(env))))
    return null;
  try {
    const claims = JSON.parse(decoder.decode(b64urlDecode(payload))) as {
      sub?: string;
      provider?: string;
      exp?: number;
      tokenId?: string;
    };
    if (
      !claims.sub ||
      !claims.provider ||
      !claims.exp ||
      !claims.tokenId ||
      claims.exp <= Date.now()
    )
      return null;
    return claims as { sub: string; provider: string; exp: number; tokenId: string };
  } catch {
    return null;
  }
}

export async function authenticateSessionRequest(request: Request, env: Record<string, unknown>) {
  const header = request.headers.get("cookie") ?? "";
  const value = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("aura_session="));
  if (!value) return null;
  return verifySessionCookie(decodeURIComponent(value.slice("aura_session=".length)), env);
}

export function validateRoom(room: string): boolean {
  return /^[A-Za-z0-9_-]{8,64}$/.test(room);
}

export function validatePeerId(peerId: string): boolean {
  return /^[A-Za-z0-9_-]{8,128}$/.test(peerId);
}
