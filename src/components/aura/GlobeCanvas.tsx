import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import { threatBand, threatScore, type GeoNode } from "./data";
import { useSpring } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";

export type { GeoNode };

function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

type Props = {
  nodes: GeoNode[];
  selectedId?: string | null | undefined;
  onSelect?: (node: GeoNode) => void;
  mode: "globe" | "map";
  zoom: number;
};

/** Rotating wireframe earth. Nodes are colored by live threat score and clickable. */
export function GlobeCanvas({ nodes, selectedId, onSelect, mode, zoom }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const selectedRef = useRef<string | null>(selectedId ?? null);
  selectedRef.current = selectedId ?? null;
  const selectHandler = useRef(onSelect);
  selectHandler.current = onSelect;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const targetLocationRef = useRef<[number, number] | null>(null);
  const worldAtlas = useRef<GeoJSON.FeatureCollection | null>(null);

  // React Spring for physics-based rotation
  const [{ spinX, spinY, animZoom }, api] = useSpring(() => ({
    spinX: 0,
    spinY: 0,
    animZoom: zoom,
    config: { mass: 1, tension: 120, friction: 14 },
  }));

  useEffect(() => {
    api.start({ animZoom: zoom });
  }, [zoom, api]);

  const interactionTimer = useRef<number | null>(null);
  const autoRotate = useRef(true);

  const resetInteraction = () => {
    autoRotate.current = false;
    if (interactionTimer.current) window.clearTimeout(interactionTimer.current);
    interactionTimer.current = window.setTimeout(() => {
      autoRotate.current = true;
    }, 3000);
  };

  // useDrag for smooth swipe gestures
  useDrag(
    ({ movement: [mx, my], down, velocity: [vx, vy], direction: [dx, dy] }) => {
      if (mode !== "globe") return;
      if (down) {
        resetInteraction();
        // Pause auto-rotation completely during drag, spin relative to current spring value
        const sensitivity = 0.2 / animZoom.get();
        api.start({
          spinX: spinX.get() + mx * sensitivity,
          spinY: spinY.get() - my * sensitivity,
          immediate: true,
        });
      } else {
        // Inertia throw on release
        const sensitivity = 50 / animZoom.get();
        api.start({
          spinX: spinX.get() + vx * dx * sensitivity,
          spinY: spinY.get() - vy * dy * sensitivity,
          config: { mass: 1, tension: 40, friction: 30 }, // slower decay for swipe
        });
      }
    },
    { target: ref, filterTaps: true, eventOptions: { pointer: true } },
  );

  useEffect(() => {
    d3.json("https://unpkg.com/world-atlas@2.0.2/countries-110m.json").then((data) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const topology = data as any;
      worldAtlas.current = topojson.feature(
        topology,
        topology.objects.countries,
      ) as unknown as GeoJSON.FeatureCollection;
    });
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors = {
      grid: cssVar("--grid", "rgba(120,220,255,0.12)"),
      land: cssVar("--land", "rgba(120,220,255,0.03)"),
      border: cssVar("--border", "rgba(120,220,255,0.15)"),
      clear: cssVar("--success", "oklch(0.75 0.16 160)"),
      elevated: cssVar("--warning", "oklch(0.8 0.15 80)"),
      critical: cssVar("--destructive", "oklch(0.63 0.22 20)"),
      primary: cssVar("--primary", "oklch(0.82 0.16 195)"),
    };

    let raf = 0;
    let hits: { node: GeoNode; x: number; y: number }[] = [];
    let latestProjection: d3.GeoProjection | null = null;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const nodeColor = (score: number) => {
      const band = threatBand(score);
      return band === "critical"
        ? colors.critical
        : band === "elevated"
          ? colors.elevated
          : colors.clear;
    };

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cx = w / 2;
      const cy = h / 2;
      const selected = nodesRef.current.find((n) => n.id === selectedRef.current) ?? null;

      const z = animZoom.get();
      const r = Math.min(w, h) * 0.38 * z;

      if (mode === "globe") {
        if (selected) {
          const targetX = -selected.lon;
          const targetY = -selected.lat;
          // Smooth animate to target
          const currentX = spinX.get();
          const deltaX = ((targetX - currentX + 540) % 360) - 180;
          api.start({
            spinX: currentX + deltaX * 0.1,
            spinY: spinY.get() + (targetY - spinY.get()) * 0.1,
            immediate: true,
          });
        } else if (targetLocationRef.current) {
          const targetX = -targetLocationRef.current[0];
          const targetY = -targetLocationRef.current[1];
          const currentX = spinX.get();
          const deltaX = ((targetX - currentX + 540) % 360) - 180;
          api.start({
            spinX: currentX + deltaX * 0.1,
            spinY: spinY.get() + (targetY - spinY.get()) * 0.1,
            immediate: true,
          });
        } else if (autoRotate.current) {
          api.start({
            spinX: (spinX.get() + 0.12) % 360,
            spinY: spinY.get() + (0 - spinY.get()) * 0.05, // slowly return to equator
            immediate: true,
          });
        }
      }

      ctx.clearRect(0, 0, w, h);

      const projection =
        mode === "globe"
          ? d3.geoOrthographic().scale(r).translate([cx, cy]).rotate([spinX.get(), spinY.get()])
          : d3
              .geoEquirectangular()
              .scale(r / Math.PI)
              .translate([cx, cy]);
      latestProjection = projection;

      const path = d3.geoPath(projection, ctx);

      // Draw Countries
      if (worldAtlas.current) {
        // Calculate country scores
        const countryScores: Record<string, { total: number; count: number }> = {};
        for (const n of nodesRef.current) {
          if (!countryScores[n.country]) {
            countryScores[n.country] = { total: 0, count: 0 };
          }
          countryScores[n.country].total += threatScore(n);
          countryScores[n.country].count += 1;
        }

        // Zoom sensitive scaling
        const scaleFactor = Math.max(0.2, 1 / z);
        const baseLineWidth = 0.5 * scaleFactor;

        // Draw each feature
        for (const feature of worldAtlas.current.features) {
          const name = feature.properties?.name;
          let fill = colors.land;

          if (name && countryScores[name]) {
            const avgScore = countryScores[name].total / countryScores[name].count;
            if (avgScore > 75) {
              fill = "oklch(0.63 0.22 20 / 0.4)"; // critical tint
            } else if (avgScore > 40) {
              fill = "oklch(0.8 0.15 80 / 0.3)"; // warning tint
            } else {
              fill = "oklch(0.75 0.16 160 / 0.2)"; // clear tint
            }
          }

          ctx.beginPath();
          path(feature);
          ctx.fillStyle = fill;
          ctx.fill();
          ctx.strokeStyle = colors.border;
          ctx.lineWidth = baseLineWidth;
          ctx.stroke();
        }
      }

      // Draw Graticule
      ctx.beginPath();
      path(d3.geoGraticule10());
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Draw Globe Outline
      if (mode === "globe") {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const t = performance.now() / 1000;
      hits = [];

      for (const n of nodesRef.current) {
        const coords = projection([n.lon, n.lat]);
        if (!coords) continue;

        // For orthographic, we need to manually check if point is visible on the front hemisphere
        let visible = true;
        if (mode === "globe") {
          // Calculate distance from center of rotation to determine if it's on the back
          const gDistance = d3.geoDistance([n.lon, n.lat], [-spinX.get(), -spinY.get()]);
          if (gDistance > Math.PI / 2 + 0.01) visible = false;
        }

        if (!visible) continue;

        const p = { x: coords[0], y: coords[1] };
        hits.push({ node: n, x: p.x, y: p.y });

        const score = threatScore(n);
        const color = nodeColor(score);
        const isSelected = selected?.id === n.id;
        const pulse = 0.5 + 0.5 * Math.sin(t * 2 + n.lat);
        const nodeScale = Math.max(0.5, z);

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.arc(
          p.x,
          p.y,
          (isSelected ? 3.6 : 2.4 + (score / 100) * 1.6) * nodeScale,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        ctx.globalAlpha = 0.18 + 0.4 * pulse;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (4 + pulse * (6 + (score / 100) * 10)) * nodeScale, 0, Math.PI * 2);
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
          ctx.fillText(`${n.label}  ${n.lat.toFixed(2)}, ${n.lon.toFixed(2)}`, p.x + 20, p.y - 6);
          ctx.fillText(`score ${score}`, p.x + 20, p.y + 9);
        }
      }

      raf = requestAnimationFrame(draw);
    };

    const onPointerMove = (ev: PointerEvent) => {
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
      canvas.style.cursor = hovered ? "pointer" : "grab";
    };

    canvas.addEventListener("pointermove", onPointerMove);

    const onClick = (ev: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      let best: { node: GeoNode; d: number } | null = null;
      for (const hit of hits) {
        const d = Math.hypot(hit.x - x, hit.y - y);
        if (d < 16 && (!best || d < best.d)) best = { node: hit.node, d };
      }
      if (best) {
        selectHandler.current?.(best.node);
        targetLocationRef.current = null;
      } else if (latestProjection && latestProjection.invert) {
        const lonLat = latestProjection.invert([x, y]);
        if (lonLat && worldAtlas.current) {
          for (const feature of worldAtlas.current.features) {
            if (d3.geoContains(feature, lonLat)) {
              const centroid = d3.geoCentroid(feature);
              targetLocationRef.current = centroid;
              break;
            }
          }
        }
      }
    };
    canvas.addEventListener("click", onClick);

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      if (interactionTimer.current) clearTimeout(interactionTimer.current);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", resize);
    };
  }, [mode, api, spinX, spinY]);

  return (
    <canvas
      ref={ref}
      className="h-full w-full cursor-pointer touch-none"
      style={{ touchAction: "none" }}
      aria-label="Live global threat map — select a node for details"
    />
  );
}
