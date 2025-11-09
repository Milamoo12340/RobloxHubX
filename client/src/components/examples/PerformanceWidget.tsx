import { PerformanceWidget } from "../PerformanceWidget";
import { Cpu, Gauge, HardDrive, Wifi } from "lucide-react";

export default function PerformanceWidgetExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      <PerformanceWidget
        title="FPS"
        value={144}
        max={144}
        icon={Gauge}
        color="primary"
        trend="stable"
      />
      <PerformanceWidget
        title="CPU"
        value={42}
        max={100}
        unit="%"
        icon={Cpu}
        color="accent"
        trend="down"
      />
      <PerformanceWidget
        title="RAM"
        value={8.2}
        max={16}
        unit="GB"
        icon={HardDrive}
        color="chart-2"
        trend="up"
      />
      <PerformanceWidget
        title="PING"
        value={28}
        unit="ms"
        icon={Wifi}
        color="primary"
        trend="stable"
      />
    </div>
  );
}
