import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { ThreatEvent } from "./data";
import { Map, LngLat } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface Props {
  map: Map;
  events: ThreatEvent[];
}

export function ThreatHeatmap({ map, events }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    
    const update = () => {
      svg.selectAll("*").remove();

      const projection = (coords: [number, number]) => {
        const point = map.project(new LngLat(coords[0], coords[1]));
        return [point.x, point.y] as [number, number];
      };

      const data = events.filter(e => e.lat && e.lon);

      svg.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => projection([d.lon!, d.lat!])[0])
        .attr("cy", d => projection([d.lon!, d.lat!])[1])
        .attr("r", 10)
        .attr("fill", "red")
        .attr("fill-opacity", 0.4);
    };

    map.on("move", update);
    map.on("zoom", update);
    update();

    return () => {
      map.off("move", update);
      map.off("zoom", update);
    };
  }, [map, events]);

  return <svg ref={svgRef} className="absolute inset-0 size-full pointer-events-none z-30" />;
}
