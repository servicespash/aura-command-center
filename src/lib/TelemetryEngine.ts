import { useTelemetryStore } from "@/store/telemetryStore";
import { AudioEngine } from "./AudioEngine";
import { ThreatEvent } from "@/components/aura/data";

export class TelemetryEngine {
  private static instance: TelemetryEngine;
  private isRunning = false;

  private constructor() {}

  public static getInstance(): TelemetryEngine {
    if (!TelemetryEngine.instance) {
      TelemetryEngine.instance = new TelemetryEngine();
    }
    return TelemetryEngine.instance;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const store = useTelemetryStore.getState();
    if (store.audioEnabled) {
      AudioEngine.getInstance().init();
      AudioEngine.getInstance().startAmbient();
    }
  }

  public stop() {
    this.isRunning = false;
    AudioEngine.getInstance().stopAmbient();
  }

  // Public method to accept real network events from WebSockets/P2P
  public ingestRealEvent(event: ThreatEvent) {
    if (!this.isRunning) return;

    const store = useTelemetryStore.getState();
    store.addEvent(event);

    if (store.audioEnabled && event.severity === "critical") {
      AudioEngine.getInstance().playAlert();
    }

    // Auto theme modulation based on recent threat density
    const criticalCount = store.events.slice(0, 10).filter((e) => e.severity === "critical").length;
    if (criticalCount >= 3) {
      if (store.theme !== "alert") store.setTheme("alert");
    } else if (criticalCount >= 1) {
      if (store.theme !== "stealth") store.setTheme("stealth");
    } else {
      if (store.theme !== "default") store.setTheme("default");
    }

    // Reflect real node count
    store.setActiveNodes((prev) => prev + 1);
  }
}
