import { invoke } from "@tauri-apps/api/core";

export const NativeBridge = {
  async connectVpn(target: string) {
    return await invoke<string>("trigger_vpn_connect", { target });
  },
  async getHardwareStatus() {
    return await invoke<string>("get_storage_status");
  },
};
