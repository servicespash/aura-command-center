import { useEffect, useRef } from "react";

export type GeoNode = {
  id: string;
  lat: number;
  lon: number;
  label: string;
  threat: "low" | "medium" | "critical";
};

function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Rotating wireframe earth with live connection arcs, drawn on canvas. */
export function GlobeCanvas({ nodes }: { nodes: GeoNode[] }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors = {
      grid: cssVar("--grid", "rgba(120,220,255,0.12)"),
      primary: cssVar("--primary", "oklch(0.82 0.16 195)"),
      accent: cssVar("--accent", "oklch(0.8 0.15 80)"),
      alert: cssVar("--destructive", "oklch(0.63 0.22 20)"),
    };

    let raf = 0;
    let spin = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const project = (lat: number, lon: number, r: number, cx: number, cy: number) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + spin) * (Math.PI / 180);
      const x = r * Math.sin(phi) * Math.sin(theta);
      const y = -r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.cos(theta);
      return { x: cx + x, y: cy + y, visible: z > 0, z };
    };

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.38;

      ctx.clearRect(0, 0, w, h);

      // halo
      const halo = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 1.5);
      halo.addColorStop(0, "rgba(0,0,0,0)");
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;

      // outline
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // parallels
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        for (let lon = -180; lon <= 180; lon += 4) {
          const p = project(lat, lon, r, cx, cy);
          if (!p.visible) continue;
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      // meridians
      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath();
        for (let lat = -90; lat <= 90; lat += 4) {
          const p = project(lat, lon, r, cx, cy);
          if (!p.visible) continue;
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      // nodes + arcs to origin
      const t = performance.now() / 1000;
      for (const n of nodesRef.current) {
        const p = project(n.lat, n.lon, r, cx, cy);
        if (!p.visible) continue;
        const color =
          n.threat === "critical"
            ? colors.alert
            : n.threat === "medium"
              ? colors.accent
              : colors.primary;

        const pulse = 0.5 + 0.5 * Math.sin(t * 2 + n.lat);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.18 + 0.35 * pulse;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 + pulse * 9, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      spin = (spin + 0.12) % 360;
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="h-full w-full" aria-label="Live global threat map" />;
}
