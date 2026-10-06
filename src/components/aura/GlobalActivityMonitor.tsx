import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useTelemetryStore } from "@/store/telemetryStore";

export function GlobalActivityMonitor() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const events = useTelemetryStore((state) => state.events);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 120;
    const height = 28;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Generate synthetic or real pulse data points from recent events
    const data =
      events.length > 0
        ? events.slice(0, 20).map((e, i) => ({ x: i, y: e.score || Math.random() * 50 + 20 }))
        : Array.from({ length: 15 }, (_, i) => ({ x: i, y: 30 + Math.sin(i * 0.5) * 20 }));

    const x = d3
      .scaleLinear()
      .domain([0, data.length - 1])
      .range([0, width]);

    const y = d3
      .scaleLinear()
      .domain([0, 100])
      .range([height - 2, 2]);

    const line = d3
      .line<{ x: number; y: number }>()
      .x((d) => x(d.x))
      .y((d) => y(d.y))
      .curve(d3.curveMonotoneX);

    const g = svg.append("g");

    // Add glowing pulse path
    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "oklch(0.82 0.16 195)")
      .attr("stroke-width", 1.5)
      .attr("d", line);

    // Add trailing point
    const last = data[data.length - 1];
    if (last) {
      g.append("circle")
        .attr("cx", x(last.x))
        .attr("cy", y(last.y))
        .attr("r", 2.5)
        .attr("fill", "oklch(0.75 0.16 160)")
        .attr("class", "pulse-node");
    }
  }, [events]);

  return (
    <div className="hidden xl:flex items-center gap-2 border-l border-border pl-4">
      <div className="text-right">
        <p className="label-hud text-[9px]">Activity Monitor</p>
        <p className="font-mono text-[10px] text-success">SYNC ACTIVE</p>
      </div>
      <svg ref={svgRef} width={120} height={28} className="overflow-visible" />
    </div>
  );
}
