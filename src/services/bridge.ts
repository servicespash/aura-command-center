type TauriWindow = Window & {
  __TAURI_INTERNALS__?: {
    invoke?: <T>(command: string, args?: Record<string, unknown>) => Promise<T>;
  };
};

async function invokeNative<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (typeof window === "undefined") {
    throw new Error("Native bridge is unavailable outside the desktop runtime.");
  }

  const invoke = (window as TauriWindow).__TAURI_INTERNALS__?.invoke;
  if (!invoke) {
    throw new Error("Native bridge is unavailable in this browser session.");
  }

  return invoke<T>(command, args);
}

export const NativeBridge = {
  connectVpn(target: string) {
    return invokeNative<string>("trigger_vpn_connect", { target });
  },
  getHardwareStatus() {
    return invokeNative<string>("get_storage_status");
  },
};
