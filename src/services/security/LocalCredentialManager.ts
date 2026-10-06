// LocalCredentialManager: Secure client-side storage for operator profiles and session keys.
// Generates and persists synthetic TOTP and session key pairs to localStorage,
// fully removing any dependencies on external OIDC providers. (SSR-safe + Permissions check).

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer: Uint8Array): string {
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
  if (typeof window === "undefined" || !window.crypto?.subtle) return "000000";
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
  lastActive: number;
  telemetrySettings: {
    refreshRateMs: number;
    nodePatchingEnabled: boolean;
    encryptionLevel: "standard" | "quantum" | "hardened";
    activeSectors: string[];
  };
}

const STORAGE_KEY = "aura_secure_credential_vault_v1";
const SESSION_STATE_KEY = "aura_active_session_token_v1";
const DIAGNOSTIC_TEST_KEY = "aura_storage_diagnostic_probe";

function obfuscate(text: string): string {
  const key = 0x5a;
  return btoa(
    Array.from(text)
      .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ (key + (i % 7))))
      .join(""),
  );
}

function deobfuscate(encoded: string): string {
  try {
    const text = atob(encoded);
    const key = 0x5a;
    return Array.from(text)
      .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ (key + (i % 7))))
      .join("");
  } catch {
    return "{}";
  }
}

export const LocalCredentialManager = {
  checkLocalStoragePermissions(): { success: boolean; error?: string } {
    console.log(
      "[LocalCredentialManager] checkLocalStoragePermissions checking write/read access...",
    );
    if (typeof window === "undefined" || !window.localStorage) {
      return {
        success: false,
        error: "Window or localStorage is undefined in this execution environment.",
      };
    }
    try {
      const probeKey = DIAGNOSTIC_TEST_KEY;
      const probeVal = "test_perm_" + Date.now();
      localStorage.setItem(probeKey, probeVal);
      const readVal = localStorage.getItem(probeKey);
      localStorage.removeItem(probeKey);

      if (readVal !== probeVal) {
        throw new Error("Storage permission validation failed: read-back value mismatch.");
      }
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[LocalCredentialManager] checkLocalStoragePermissions failed:", msg);
      return { success: false, error: `Mobile sandbox blocked localStorage write: ${msg}` };
    }
  },

  runStorageDiagnostic(): { success: boolean; error?: string } {
    return this.checkLocalStoragePermissions();
  },

  generateCredentials(email: string): OperatorProfile {
    console.log("[LocalCredentialManager] === START generateCredentials ===", { email });
    const permCheck = this.checkLocalStoragePermissions();
    if (!permCheck.success) {
      throw new Error(`Credential generation blocked: ${permCheck.error}`);
    }

    const randomBytes = new Uint8Array(10);
    if (typeof window !== "undefined" && window.crypto) {
      window.crypto.getRandomValues(randomBytes);
    }
    const totpSecret = base32Encode(randomBytes);

    const sessionKeyBytes = new Uint8Array(16);
    if (typeof window !== "undefined" && window.crypto) {
      window.crypto.getRandomValues(sessionKeyBytes);
    }
    const sessionKeyHex = Array.from(sessionKeyBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const profile: OperatorProfile = {
      email: email.trim().toLowerCase(),
      totpSecret,
      sessionKey: `sk_aura_${sessionKeyHex}`,
      createdAt: Date.now(),
      lastActive: Date.now(),
      telemetrySettings: {
        refreshRateMs: 2500,
        nodePatchingEnabled: true,
        encryptionLevel: "hardened",
        activeSectors: ["EU-CENTRAL", "NA-EAST"],
      },
    };

    this.saveProfile(profile);
    console.log("[LocalCredentialManager] === SUCCESS generateCredentials ===");
    return profile;
  },

  saveProfile(profile: OperatorProfile): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const permCheck = this.checkLocalStoragePermissions();
      if (!permCheck.success) {
        throw new Error(permCheck.error);
      }
      const payload = JSON.stringify(profile);
      const obfuscated = obfuscate(payload);
      localStorage.setItem(STORAGE_KEY, obfuscated);
      localStorage.setItem(SESSION_STATE_KEY, profile.sessionKey);
      console.log("[LocalCredentialManager] Profile successfully persisted to localStorage.");
    } catch (e) {
      console.error("[LocalCredentialManager] CRITICAL save error:", e);
      throw e;
    }
  },

  getProfile(): OperatorProfile | null {
    if (typeof window === "undefined" || !window.localStorage) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const json = deobfuscate(raw);
      return JSON.parse(json) as OperatorProfile;
    } catch (err) {
      console.error("[LocalCredentialManager] getProfile parse error:", err);
      return null;
    }
  },

  async validateCredentials(
    emailInput: string,
    totpInput: string,
    sessionKeyInput: string,
  ): Promise<{ success: boolean; error?: string }> {
    console.log("[LocalCredentialManager] === START validateCredentials ===", { emailInput });
    const profile = this.getProfile();
    if (!profile) {
      return {
        success: false,
        error: "No operator credential vault found. Please provision a new account.",
      };
    }

    if (!emailInput || !constantTimeEqual(emailInput.trim().toLowerCase(), profile.email)) {
      return { success: false, error: "Identity assertion rejected: Operator email mismatch." };
    }

    if (!/^\d{6}$/.test(totpInput.trim())) {
      return { success: false, error: "Authenticator assertion rejected: Invalid TOTP format." };
    }

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

    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(SESSION_STATE_KEY, profile.sessionKey);
    }
    profile.lastActive = Date.now();
    this.saveProfile(profile);
    console.log("[LocalCredentialManager] === SUCCESS validateCredentials ===");
    return { success: true };
  },

  isSessionActive(): boolean {
    if (typeof window === "undefined" || !window.localStorage) return false;
    const activeToken = localStorage.getItem(SESSION_STATE_KEY);
    const profile = this.getProfile();
    if (!activeToken || !profile) return false;
    return activeToken === profile.sessionKey;
  },

  clearSession(): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    console.log("[LocalCredentialManager] Clearing local credential vault and active session.");
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SESSION_STATE_KEY);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.clear();
    }
  },
};
