import EventEmitter from "eventemitter3";

export const globalEvents = new EventEmitter();

// Event Definitions
export const EVENTS = {
  MAP_FLY_TO: "MAP_FLY_TO",
  TERMINAL_TOGGLE: "TERMINAL_TOGGLE",
};
