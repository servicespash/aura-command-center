import { Tenant, ThreatEvent } from "../components/aura/data";

export interface SessionReport {
  timestamp: string;
  tenants: Tenant[];
  events: ThreatEvent[];
  activeNodes: number;
  egressIndex: number;
}

export function generateSessionReport(sessionState: SessionReport) {
  const css = `
    body { font-family: 'Inter', -apple-system, sans-serif; color: #1a1a1a; line-height: 1.6; padding: 40px; max-width: 900px; margin: 0 auto; }
    h1 { font-size: 24px; font-weight: 700; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.05em; }
    h2 { font-size: 16px; font-weight: 600; text-transform: uppercase; margin-top: 40px; border-bottom: 1px solid #ddd; padding-bottom: 5px; color: #444; }
    .meta-box { background: #f9f9f9; border: 1px solid #eee; padding: 15px; border-radius: 4px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 30px; font-size: 14px; }
    .meta-item strong { color: #555; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #eee; }
    th { font-weight: 600; color: #666; background: #fbfbfb; text-transform: uppercase; letter-spacing: 0.02em; font-size: 11px; }
    .badge { display: inline-block; padding: 3px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .bg-critical { background: #fee2e2; color: #991b1b; }
    .bg-elevated { background: #fef3c7; color: #92400e; }
    .bg-clear { background: #dcfce3; color: #166534; }
    .text-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  `;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>AURA-NET Audit Report - ${new Date(sessionState.timestamp).toISOString()}</title>
      <style>${css}</style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px; text-align: right;">
        <button onclick="window.print()" style="padding: 8px 16px; background: #1a1a1a; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Print to PDF</button>
      </div>

      <h1>Tactical Threat Intelligence Audit</h1>
      
      <div class="meta-box">
        <div class="meta-item"><strong>Report Generated:</strong><br/> ${new Date(sessionState.timestamp).toUTCString()}</div>
        <div class="meta-item"><strong>Active Threat Nodes:</strong><br/> ${sessionState.activeNodes.toLocaleString()}</div>
        <div class="meta-item"><strong>Egress Route Index:</strong><br/> ${sessionState.egressIndex}</div>
        <div class="meta-item"><strong>Monitored Tenants:</strong><br/> ${sessionState.tenants.length}</div>
      </div>

      <h2>1. Domain Perimeter (Tenants)</h2>
      ${
        sessionState.tenants.length === 0
          ? "<p>No domains onboarded during this session.</p>"
          : `
      <table>
        <thead><tr><th>Domain</th><th>Status</th><th>Verification</th><th>Telemetry Key</th><th>24h Events</th></tr></thead>
        <tbody>
          ${sessionState.tenants
            .map(
              (t) => `
            <tr>
              <td style="font-weight: 500;">${t.domain}</td>
              <td><span class="badge ${t.status === "verified" ? "bg-clear" : "bg-elevated"}">${t.status}</span></td>
              <td class="text-mono">${t.method}</td>
              <td class="text-mono">${t.key}</td>
              <td>${t.events24h}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
      `
      }

      <h2>2. Threat Event Log</h2>
      ${
        sessionState.events.length === 0
          ? "<p>No threat events logged during this session.</p>"
          : `
      <table>
        <thead><tr><th>Timestamp (UTC)</th><th>Severity</th><th>Event Kind</th><th>Source IP</th><th>Origin</th></tr></thead>
        <tbody>
          ${sessionState.events
            .map(
              (e) => `
            <tr>
              <td class="text-mono" style="color: #666;">${e.at.toISOString()}</td>
              <td><span class="badge bg-${e.severity}">${e.severity}</span></td>
              <td style="font-weight: 500;">${e.kind}</td>
              <td class="text-mono">${e.ip}</td>
              <td>${e.origin}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
      `
      }
      
      <div style="margin-top: 50px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px;">
        AURA-NET Automated Telemetry System &middot; END OF REPORT
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `aura-audit-${new Date().toISOString().replace(/[:.]/g, "-")}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
