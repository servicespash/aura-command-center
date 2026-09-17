// VPN & Hardware Bridge Modules
mod vpn;
mod hardware;

#[tauri::command]
fn trigger_vpn_connect(target: String) -> Result<String, String> {
    vpn::connect(target)
}

#[tauri::command]
fn get_storage_status() -> Result<String, String> {
    hardware::get_otg_status()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![trigger_vpn_connect, get_storage_status])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
