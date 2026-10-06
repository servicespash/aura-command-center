// Client-side operational security & 3-factor authentication service
// Using Web Crypto API for real cryptographic TOTP verification and local secure profile storage.

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buffer: Uint8Array): string {
  let bits = "";
  for (let i = 0; i < buffer.length; i++) {
    bits += buffer[i]!.toString(2).padStart(8, "0");
  }
  let output = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, "0");
    output += ALPHABET[Number.parseInt(chunk, 2)];
  }
  return output;
}

export function base32Decode(value: string): Uint8Array {
  const normalized = value.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = "";
  for (const c of normalized) {
    const i = ALPHABET.indexOf(c);
    if (i < 0) throw new Error("Invalid TOTP secret character");
    bits += i.toString(2).padStart(5, "0");
  }
  const out = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return out;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function generateTotp(secret: string, counter: number): Promise<string> {
  const decoded = base32Decode(secret);
  const raw = new ArrayBuffer(decoded.byteLength);
  new Uint8Array(raw).set(decoded);
  const key = await window.crypto.subtle.importKey(
    "raw",
    raw,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const buffer = new ArrayBuffer(8);
  new DataView(buffer).setBigUint64(0, BigInt(counter), false);
  const digest = new Uint8Array(await window.crypto.subtle.sign("HMAC", key, buffer));
  const offset = digest[digest.length - 1]! & 15;
  const value =
    ((digest[offset]! & 127) << 24) |
    ((digest[offset + 1]! & 255) << 16) |
    ((digest[offset + 2]! & 255) << 8) |
    (digest[offset + 3]! & 255);
  return String(value % 1_000_000).padStart(6, "0");
}

export interface OperatorProfile {
  email: string;
  totpSecret: string;
  sessionKey: string;
  createdAt: number;
}

const STORAGE_KEY = "aura_operator_profile";
const SESSION_AUTH_KEY = "aura_session_authenticated";

export function getStoredProfile(): OperatorProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OperatorProfile;
  } catch {
    return null;
  }
}

export function createOperatorProfile(email: string): OperatorProfile {
  // Generate random 16-byte secret for TOTP (Base32 encoded)
  const randomBytes = new Uint8Array(10);
  window.crypto.getRandomValues(randomBytes);
  const totpSecret = base32Encode(randomBytes);

  // Generate session key
  const sessionKeyBytes = new Uint8Array(16);
  window.crypto.getRandomValues(sessionKeyBytes);
  const sessionKey = Array.from(sessionKeyBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const profile: OperatorProfile = {
    email: email.trim().toLowerCase(),
    totpSecret,
    sessionKey: `sk_aura_${sessionKey}`,
    createdAt: Date.now(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  return profile;
}

export async function verifyOperatorAccess(
  emailInput: string,
  totpInput: string,
  sessionKeyInput: string,
): Promise<{ success: boolean; error?: string }> {
  const profile = getStoredProfile();
  if (!profile) {
    return {
      success: false,
      error: "No operator profile found on this node. Please register first.",
    };
  }

  if (!emailInput || !constantTimeEqual(emailInput.trim().toLowerCase(), profile.email)) {
    return { success: false, error: "Identity assertion rejected: Email mismatch." };
  }

  if (!/^\d{6}$/.test(totpInput.trim())) {
    return { success: false, error: "Authenticator assertion rejected: Invalid TOTP format." };
  }

  // Verify TOTP with 1-step drift window (30s each)
  const counter = Math.floor(Date.now() / 30000);
  let validTotp = false;
  for (const drift of [-1, 0, 1]) {
    const expected = await generateTotp(profile.totpSecret, counter + drift);
    if (constantTimeEqual(totpInput.trim(), expected)) {
      validTotp = true;
      break;
    }
  }

  if (!validTotp) {
    return {
      success: false,
      error: "Authenticator assertion rejected: Code expired or incorrect.",
    };
  }

  if (!sessionKeyInput || !constantTimeEqual(sessionKeyInput.trim(), profile.sessionKey)) {
    return { success: false, error: "Session key rejected: Invalid active session token." };
  }

  // Session authenticated successfully
  sessionStorage.setItem(SESSION_AUTH_KEY, "true");
  return { success: true };
}

export function isSessionAuthenticated(): boolean {
  return sessionStorage.getItem(SESSION_AUTH_KEY) === "true";
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_AUTH_KEY);
}
