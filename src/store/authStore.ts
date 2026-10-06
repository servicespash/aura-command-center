import { create } from "zustand";
import {
  LocalCredentialManager,
  OperatorProfile,
} from "@/services/security/LocalCredentialManager";

interface AuthState {
  isAuthenticated: boolean;
  isInitialized: boolean;
  isProvisioning: boolean;
  profile: OperatorProfile | null;
  provisionedCreds: OperatorProfile | null;
  mode: "signin" | "register";
  error: string | null;
  toastMsg: string | null;
  checking: boolean;

  checkSession: () => void;
  setMode: (mode: "signin" | "register") => void;
  provisionAccount: (email: string) => void;
  authenticate: (email: string, totp: string, sessionKey: string) => Promise<boolean>;
  signOut: () => void;
  dismissToast: () => void;
  clearProvisionedCreds: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isInitialized: false,
  isProvisioning: false,
  profile: null,
  provisionedCreds: null,
  mode: "register",
  error: null,
  toastMsg: null,
  checking: false,

  checkSession: () => {
    if (typeof window === "undefined") {
      set({ isInitialized: true });
      return;
    }
    const permCheck = LocalCredentialManager.checkLocalStoragePermissions();
    if (!permCheck.success) {
      set({ error: permCheck.error, isInitialized: true });
      return;
    }
    const active = LocalCredentialManager.isSessionActive();
    const prof = LocalCredentialManager.getProfile();
    console.log("[AuthStore] checkSession verified:", { active, hasProfile: !!prof });
    set({
      isAuthenticated: active,
      profile: prof,
      mode: prof ? "signin" : "register",
      isInitialized: true,
    });
  },

  setMode: (mode) => {
    console.log("[AuthStore] setMode action dispatched:", mode);
    set({
      mode,
      error: null,
      toastMsg: mode === "register" ? "Ready to provision new account." : null,
      provisionedCreds: null,
    });
  },

  provisionAccount: (email: string) => {
    const state = get();
    if (state.isProvisioning) {
      console.warn("[AuthStore] Provisioning already in progress. Skipping.");
      return;
    }

    console.group("[AuthStore] provisionAccount");
    console.log("Action initiated for:", email);
    set({ isProvisioning: true, error: null });

    // Debugger breakpoint as requested to trace execution in sandbox inspector
    debugger;

    try {
      const permCheck = LocalCredentialManager.checkLocalStoragePermissions();
      if (!permCheck.success) {
        throw new Error(permCheck.error);
      }

      const trimmed = email.trim();
      if (!trimmed || !trimmed.includes("@")) {
        throw new Error("Please provide a valid operator email address (e.g. operator@aura.net).");
      }

      const newProfile = LocalCredentialManager.generateCredentials(trimmed);
      console.log("[AuthStore] Credentials generated & persisted successfully.");

      set({
        profile: newProfile,
        provisionedCreds: newProfile,
        error: null,
        toastMsg: "New account credentials generated and persisted to local vault.",
        isProvisioning: false,
      });
      console.log("[AuthStore] State successfully updated with provisionedCreds.");
    } catch (err) {
      console.error("[AuthStore] CRITICAL provisionAccount exception:", err);
      set({
        error:
          err instanceof Error
            ? err.message
            : "Account provisioning failed due to storage exception.",
        isProvisioning: false,
      });
    } finally {
      console.groupEnd();
    }
  },

  authenticate: async (email, totp, sessionKey) => {
    console.log("[AuthStore] authenticate action dispatched for:", email);
    set({ checking: true, error: null });
    try {
      const result = await LocalCredentialManager.validateCredentials(email, totp, sessionKey);
      if (!result.success) {
        throw new Error(result.error || "Authentication failed.");
      }
      console.log("[AuthStore] Authentication verified successfully.");
      set({
        isAuthenticated: true,
        profile: LocalCredentialManager.getProfile(),
        toastMsg: "Authentication verified. Opening secure perimeter...",
        checking: false,
      });
      return true;
    } catch (err) {
      console.error("[AuthStore] authenticate error:", err);
      set({
        error: err instanceof Error ? err.message : "Authentication failed.",
        checking: false,
      });
      return false;
    }
  },

  signOut: () => {
    console.log("[AuthStore] signOut action dispatched.");
    LocalCredentialManager.clearSession();
    set({
      isAuthenticated: false,
      profile: null,
      provisionedCreds: null,
      mode: "register",
      toastMsg: "Session terminated and vault unmounted.",
    });
  },

  dismissToast: () => set({ toastMsg: null }),

  clearProvisionedCreds: () => set({ provisionedCreds: null }),
}));
