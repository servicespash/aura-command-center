import { expose } from "comlink";
import { GeoNode, threatScore } from "@/components/aura/data";

/**
 * Worker API for offloading heavy D3 calculations (like country score aggregation)
 */
export const WorkerAPI = {
  // Compute aggregate threat scores per country
  computeCountryScores(nodes: GeoNode[]): Record<string, { total: number; count: number }> {
    const scores: Record<string, { total: number; count: number }> = {};
    for (const n of nodes) {
      if (!scores[n.country]) {
        scores[n.country] = { total: 0, count: 0 };
      }
      scores[n.country].total += threatScore(n);
      scores[n.country].count += 1;
    }
    return scores;
  },

  // Pre-calculate expensive math for hits collision
  calculateHitDistances(
    hits: { node: GeoNode; x: number; y: number }[],
    pointerX: number,
    pointerY: number,
  ): { node: GeoNode; d: number } | null {
    let best: { node: GeoNode; d: number } | null = null;
    let minD = 20;

    for (const hit of hits) {
      const d = Math.hypot(hit.x - pointerX, hit.y - pointerY);
      if (d < minD) {
        minD = d;
        best = { node: hit.node, d };
      }
    }

    return best;
  },
};

expose(WorkerAPI);
