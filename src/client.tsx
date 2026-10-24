import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start-client";
import { getRouter } from "./router";

const router = getRouter();

// @ts-expect-error StartClient router prop compatibility
hydrateRoot(document.getElementById("root")!, <StartClient router={router} />);
