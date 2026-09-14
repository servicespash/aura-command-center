import { useEffect, useRef } from "react";
import { threatBand, threatScore, type GeoNode } from "./data";

export type { GeoNode };

function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

type Props = {
  nodes: GeoNode[];
  selectedId?: string | null;
  onSelect?: (node: GeoNode) => void;
};

/** Rotating wireframe earth. Nodes are colored by live threat score and clickable. */
export function GlobeCanvas({ nodes, selectedId, onSelect }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const selectedRef = useRef<string | null>(selectedId ?? null);
  selectedRef.current = selectedId ?? null;
  const selectHandler = useRef(onSelect);
  selectHandler.current = onSelect;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors = {
      grid: cssVar("--grid", "rgba(120,220,255,0.12)"),
      clear: cssVar("--success", "oklch(0.75 0.16 160)"),
      elevated: cssVar("--warning", "oklch(0.8 0.15 80)"),
      critical: cssVar("--destructive", "oklch(0.63 0.22 20)"),
      primary: cssVar("--primary", "oklch(0.82 0.16 195)"),
    };

    let raf = 0;
    let spin = 0;
    let zoom = 1;
    // Screen positions of the last frame, used for click hit-testing.
    let hits: { node: GeoNode; x: number; y: number }[] = [];

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

    const nodeColor = (score: number) => {
      const band = threatBand(score);
      return band === "critical" ? colors.critical : band === "elevated" ? colors.elevated : colors.clear;
    };

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cx = w / 2;
      const cy = h / 2;
      const selected = nodesRef.current.find((n) => n.id === selectedRef.current) ?? null;
      const r = Math.min(w, h) * 0.38 * zoom;

      // Ease toward the selected node (centered, zoomed) or free rotation.
      if (selected) {
        const target = -selected.lon;
        let delta = ((target - spin + 540) % 360) - 180;
        spin += delta * 0.08;
        zoom += (1.35 - zoom) * 0.06;
      } else {
        spin = (spin + 0.12) % 360;
        zoom += (1 - zoom) * 0.06;
      }

      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        for (let lon = -180; lon <= 180; lon += 4) {
          const p = project(lat, lon, r, cx, cy);
          if (!p.visible) continue;
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath();
        for (let lat = -90; lat <= 90; lat += 4) {
          const p = project(lat, lon, r, cx, cy);
          if (!p.visible) continue;
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      const t = performance.now() / 1000;
      hits = [];
      for (const n of nodesRef.current) {
        const p = project(n.lat, n.lon, r, cx, cy);
        if (!p.visible) continue;
        hits.push({ node: n, x: p.x, y: p.y });

        const score = threatScore(n);
        const color = nodeColor(score);
        const isSelected = selected?.id === n.id;
        const pulse = 0.5 + 0.5 * Math.sin(t * 2 + n.lat);

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isSelected ? 3.6 : 2.4 + (score / 100) * 1.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.18 + 0.4 * pulse;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 + pulse * (6 + (score / 100) * 10), 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.stroke();
        ctx.globalAlpha = 1;

        if (isSelected) {
          ctx.strokeStyle = colors.primary;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
          ctx.stroke();
          ctx.font = "11px ui-monospace, monospace";
          ctx.fillStyle = colors.primary;
          ctx.fillText(
            `${n.label}  ${n.lat.toFixed(2)}, ${n.lon.toFixed(2)}`,
            p.x + 20,
            p.y - 6,
          );
          ctx.fillText(`score ${score}`, p.x + 20, p.y + 9);
        }
      }

      raf = requestAnimationFrame(draw);
    };

    const onMouseMove = (ev: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      
      let hovered: GeoNode | null = null;
      let minD = 20; 
      for (const hit of hits) {
        const d = Math.hypot(hit.x - x, hit.y - y);
        if (d < minD) {
          minD = d;
          hovered = hit.node;
        }
      }
      canvas.style.cursor = hovered ? "pointer" : "default";
    };
    canvas.addEventListener("mousemove", onMouseMove);

    const onClick = (ev: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      let best: { node: GeoNode; d: number } | null = null;
      for (const hit of hits) {
        const d = Math.hypot(hit.x - x, hit.y - y);
        if (d < 16 && (!best || d < best.d)) best = { node: hit.node, d };
      }
      if (best) selectHandler.current?.(best.node);
    };
    canvas.addEventListener("click", onClick);

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="h-full w-full cursor-pointer"
      aria-label="Live global threat map — select a node for details"
    />
  );
}
