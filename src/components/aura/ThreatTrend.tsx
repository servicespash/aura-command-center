import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

export function ThreatTrend({ data }: { data: number[] }) {
  const chartData = data.map((v, i) => ({ name: i, value: v }));
  return (
    <div className="h-10 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="value" stroke="#ff4444" strokeWidth={2} dot={false} />
          <YAxis hide domain={[0, 100]} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
