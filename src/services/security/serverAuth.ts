const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(value: string): Uint8Array {
  const normalized = value.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = "";
  for (const c of normalized) {
    const i = ALPHABET.indexOf(c);
    if (i < 0) throw new Error("Invalid TOTP secret");
    bits += i.toString(2).padStart(5, "0");
  }
  const out = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  return out;
}

function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function otp(secret: string, counter: number) {
  const decoded = base32Decode(secret);
  const raw = new ArrayBuffer(decoded.byteLength);
  new Uint8Array(raw).set(decoded);
  const key = await crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-1" }, false, [
    "sign",
  ]);
  const buffer = new ArrayBuffer(8);
  new DataView(buffer).setBigUint64(0, BigInt(counter), false);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, buffer));
  const offset = digest[digest.length - 1]! & 15;
  const value =
    ((digest[offset]! & 127) << 24) |
    ((digest[offset + 1]! & 255) << 16) |
    ((digest[offset + 2]! & 255) << 8) |
    (digest[offset + 3]! & 255);
  return String(value % 1_000_000).padStart(6, "0");
}

export async function verifyAccess(
  body: { email?: string; totp?: string; sessionKey?: string },
  env: Record<string, unknown>,
) {
  const email = String(env["AURA_AUTH_EMAIL"] ?? "")
    .trim()
    .toLowerCase();
  const secret = String(env["AURA_TOTP_SECRET"] ?? "").trim();
  const sessionKey = String(env["AURA_SESSION_KEY"] ?? "");
  if (!email || !secret || !sessionKey) throw new Error("Authentication is not configured");

  if (!body.email || !equal(body.email.trim().toLowerCase(), email))
    throw new Error("Identity assertion rejected");
  if (!/^\d{6}$/.test(String(body.totp ?? ""))) throw new Error("Authenticator assertion rejected");

  const counter = Math.floor(Date.now() / 30000);
  let valid = false;
  for (const drift of [-1, 0, 1])
    valid ||= equal(String(body.totp), await otp(secret, counter + drift));
  if (!valid) throw new Error("Authenticator assertion rejected");
  if (!body.sessionKey || !equal(body.sessionKey, sessionKey))
    throw new Error("Session key rejected");
}
