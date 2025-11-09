import { PerformanceChart } from "../PerformanceChart";

export default function PerformanceChartExample() {
  const fpsData = [
    { time: "0s", value: 142 },
    { time: "5s", value: 144 },
    { time: "10s", value: 138 },
    { time: "15s", value: 144 },
    { time: "20s", value: 141 },
    { time: "25s", value: 144 },
    { time: "30s", value: 143 },
  ];

  const pingData = [
    { time: "0s", value: 28 },
    { time: "5s", value: 25 },
    { time: "10s", value: 32 },
    { time: "15s", value: 27 },
    { time: "20s", value: 29 },
    { time: "25s", value: 26 },
    { time: "30s", value: 28 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      <PerformanceChart title="FPS Over Time" data={fpsData} color="hsl(var(--primary))" />
      <PerformanceChart title="Ping Over Time" data={pingData} color="hsl(var(--accent))" />
    </div>
  );
}
