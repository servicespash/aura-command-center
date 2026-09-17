# 🛰️ AURA-NET v2: STANDALONE HIGH-PERFORMANCE COMMAND ENGINE ARCHITECTURE

## 🎯 ARCHITECTURAL DIRECTIVE & VISION
AURA-NET is an isolated, standalone global threat intelligence, interactive telemetry simulation, and cinematic command deck. It is completely decoupled from any external applications, institutional portals, or educational platforms. All telemetry computations, coordinate map projections, command parsing, and session states operate within a zero-latency local client-side environment.

---

## 🏗️ 5-PHASE SYSTEM UPGRADE ROADMAP

### PHASE 1: TELEMETRY ENGINE EXTRACTION & REACTIVE STATE (ZUSTAND)
* **God-Object Elimination:** Deconstruct `CommandDeck.tsx` by removing all direct state variables, timers, and hardcoded side effects.
* **Global Telemetry Store (`useTelemetryStore`):** Implement a reactive Zustand store handling active nodes, global threat events, tenant registries, and system health status.
* **Isolated Telemetry Generator (`TelemetryEngine.ts`):** Move the random event generator (2–5s polling loop) into an unmounted background class that writes strictly to the telemetry store.

### PHASE 2: POSIX TERMINAL COMMAND REGISTRY & MAP CROSS-LINKING
* **Command Tokenizer & Flag Parser (`CommandParser.ts`):** Tokenize command strings into arguments and flags (e.g., `scan --ip 192.168.1.1 --depth full`).
* **Modular Command Registry (`CommandRegistry.ts`):** Encapsulate commands (`scan`, `login`, `find`, `egress`, `archive`) into modular execution handlers.
* **Canvas Globe Binding (`GlobeEventEmitter`):** Commands such as `find --ip <address>` parse GeoIP coordinates and emit a spatial event that triggers smooth camera centering and visual beeping indicators on `GlobeCanvas.tsx`.

### PHASE 3: ASYNCHRONOUS DATA ACCESS LAYER (INDEXEDDB DAL)
* **Storage Layer Upgrade (`StorageService.ts`):** Remove synchronous `localStorage` dependencies and replace them with an asynchronous IndexedDB wrapper (`idb` or `localforage`).
* **Append-Only Telemetry Ledger:** Write raw incident logs, archived scan reports, and tenant keys to IndexedDB to sustain tens of thousands of event records without browser UI freezing.

### PHASE 4: WEB WORKER OFFLOADING & 60FPS CANVAS ENGINE
* **Off-Main-Thread Projections (`map.worker.ts`):** Shift D3 geographical math, node distance matrix calculations, and threat score weightings (40% connection, 35% geo-risk, 25% target-risk) into a dedicated Web Worker.
* **Zero-Jank Globe Canvas:** Pass pre-calculated x,y rendering vectors to `GlobeCanvas.tsx` via `postMessage`, keeping map rotation, drag inertia, and zooming locked at 60 FPS.

### PHASE 5: GHOST EGRESS CYCLER & CRT AUDIO-THEME MODULATION
* **Dynamic Ghost Egress Rotator:** Cycle active outbound proxies (GH-01 through GH-04) every 5 seconds or via manual trigger, updating masked IP metadata and latency gauges.
* **WebAudio Engine Singleton (`AudioManager.ts`):** Synthesize contextual audio triggers for terminal keystrokes, ambient telemetry sweeps, radar hums, and critical alarm alerts.
* **Threat Observer Theme Shifting:** Automatically adjust global CSS variables (scanline glow, CRT flicker depth, red color shift) when the system Threat Score crosses the 70+ CRITICAL threshold.

### TERMINAL COMMAND REGISTRY DATA TABLE (20 CLI COMMANDS)

| # | Command Syntax | Required Package | Description & Execution Logic |
|---|---|---|---|
| **1** | `help [command]` | *built-in* | Displays complete CLI command table or detailed manual for a specific command. |
| **2** | `scan --target <domain/IP>` | `net-analyzer-v2` | Runs perimeter security scans on target domain/IP and computes Threat Score. |
| **3** | `find --ip <address>` | `geoip-locator` | Resolves GeoIP coordinates and auto-zooms 3D Globe map with a pulsing indicator. |
| **4** | `login --target <google/github/domain>` | `auth-bridge` | Prompts credentials or triggers browser redirect (`window.open`) to target login gateway. |
| **5** | `db-connect --target <domain>` | `db-client-suite` | Prompts for DB credentials to mount a mock remote database terminal context. |
| **6** | `egress --cycle` | `proxy-cycler` | Forces immediate ghost proxy rotation (cycles egress node GH-01 through GH-04). |
| **7** | `egress --status` | `proxy-cycler` | Displays active proxy egress node metadata, latency (ms), and masked origin IP. |
| **8** | `onboard --domain <domain>` | `tenant-manager` | Initiates tenant onboarding flow and generates isolated `tk_live_...` telemetry key. |
| **9** | `tenants --list` | `tenant-manager` | Displays all onboarded domain tenants and active key statuses. |
| **10** | `threats --level <low/med/high>` | `telemetry-core` | Filters active global threat feeds by severity rating. |
| **11** | `archive --export` | `indexeddb-dal` | Flushes active terminal event buffers into IndexedDB storage. |
| **12** | `archive --view` | `indexeddb-dal` | Lists historical event archives stored inside IndexedDB. |
| **13** | `delete --log <id>` | `indexeddb-dal` | Permanently purges a specific telemetry log record from local storage. |
| **14** | `search --query <string>` | `indexeddb-dal` | Searches global event logs for matching IP, domain, or timestamp strings. |
| **15** | `clear` | *built-in* | Clears current terminal display screen buffer. |
| **16** | `ping --host <domain/IP>` | `net-analyzer-v2` | Measures latency and packet response metrics to target hosts. |
| **17** | `traceroute --target <IP>` | `net-analyzer-v2` | Traces simulated network hops across ghost proxy nodes. |
| **18** | `theme --mode <default/stealth/alert>` | *built-in* | Forces manual visual themes (standard green, stealth amber, or alert red CRT). |
| **19** | `audio --toggle` | `audio-engine` | Toggles WebAudio engine ambient sound effects and keystroke ticks. |
| **20** | `pkg install <package_name>` | *built-in* | Installs missing CLI package dependencies into the local package store. |

### PHASE 6: HARDENED NATIVE SYSTEM SPECIFICATION

* **DYNAMIC WASM MODULE ENGINE:** `pkg install` dynamically fetches and mounts standalone WebAssembly (.wasm) binary modules directly into memory workers.
* **DUAL-LAYER OFFLINE SPATIAL MAP ENGINE (.MBTILES & .MMDB):** Local GeoIP binary lookup (`.mmdb`) and offline vector tiles (MapLibre GL) for mapping without network.
* **COMPLIANT VPN SERVICE & MULTI-HOP ONION PROXY:** OS-level TUN/TAP traffic routing with real-time proxy health checks and WebRTC leak prevention.
* **AES-256-GCM ENCRYPTION & "OMEGA KEY" ARCHITECTURE:** In-memory ephemeral master keys with physical key verification for cold-boot decryption.
* **HARDWARE-BOUND REACTIVE AUTOMATION (USB / OTG HOOKS):** OS-level storage insertion detection for zero-click log exports/key imports.
* **FAIL-SAFE DURESS & PANIC PROTOCOL:** Immediate RAM/storage wipe and decoy HUD on duress/panic triggers.
* **RESPONSIVE CONTAINER & VIEWPORT ADAPTER:** Expanded desktop layouts (`xl`, `2xl`) and mobile virtual toolbars for full-width operations.

### PHASE 7: NATIVE KERNEL & SYSTEM DRIVER INTEGRATION
* **REAL FFI HARDWARE & NETWORK DRIVERS:** Raw TUN/TAP management (Rust `tun` crate) and OS-level USB/OTG event listeners.
* **AUTOMATED ZERO-COST CI/CD PIPELINE:** Multi-platform binary generation (`.apk`, `.exe`, `.app`) using GitHub Actions.
* **OFFLINE MAP DATASETS & GEOLOCATION BINDINGS:** Direct binary binding of `GeoLite2-City.mmdb` and local `.mbtiles` assets.
* **OMEGA KEY HARDWARE INTEGRATION:** Physical device signature binding for vault access.

### 🛰️ AURA-NET v2: PHASE 8 - MASTER OSINT & HIGH-DENSITY VISUAL TELEMETRY KERNEL
* **GPU CANVAS & "GOD'S EYE" RENDER ENGINE:** Instanced WebGL buffers for 20k+ entities, R-tree spatial indexing, and glassmorphism HUD overlays.
* **KEYLESS PUBLIC TELEMETRY PIPELINES:** Real-time Aviation/Satellite (TLE) propagators, Seismic/Thermal anomaly layers, and CCTV/RSS feed integration.
* **LOCAL RECON TOOLKIT & OFFLINE BINARIES:** Zero-latency GeoIP/ASN resolution (`.mmdb`), offline vector tile mounting (`.mbtiles`), and local threat audit engine.
* **NETWORK SECURITY & PROXY INTEGRATION:** Multi-hop egress routing for all telemetry fetches to ensure privacy and isolation.


