import EventEmitter from "eventemitter3";

export const globalEvents = new EventEmitter();

export const EVENTS = {
  MAP_FLY_TO: "MAP_FLY_TO",
  MAP_TELEMETRY_PULSE: "MAP_TELEMETRY_PULSE",
  TERMINAL_TOGGLE: "TERMINAL_TOGGLE",
} as const;

export type SpatialPulse = {
  id: string;
  center: [number, number];
  radius: number;
  source: string;
  timestamp: number;
};

export function emitSpatialPulse(pulse: SpatialPulse) {
  globalEvents.emit(EVENTS.MAP_TELEMETRY_PULSE, pulse);
}
