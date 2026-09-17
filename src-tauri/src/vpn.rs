// src-tauri/src/vpn.rs - Native VPN hooks (TUN/TAP + Android VpnService)
use tun::Configuration;

pub fn connect(target: String) -> Result<String, String> {
    let mut config = Configuration::default();
    config
        .name("aura-tun0")
        .address((10, 0, 0, 1))
        .netmask((255, 255, 255, 0))
        .up();

    let dev = tun::create(&config).map_err(|e| e.to_string())?;
    
    println!("Initiating native tunnel to: {} on {:?}", target, dev.name());
    Ok(format!("VPN_ACTIVE: {} [TUN_0]", target))
}

pub fn disconnect() -> Result<(), String> {
    Ok(())
}
