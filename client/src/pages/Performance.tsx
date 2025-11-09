import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PerformanceWidget } from "@/components/PerformanceWidget";
import { Cpu, Gauge, HardDrive, Thermometer } from "lucide-react";

interface SystemPerformance {
  cpu: number;
  ram: number;
  ramTotal: number;
}

export default function Performance() {
  const [browserFps, setBrowserFps] = useState(60);
  const [ping, setPing] = useState(0);

  const { data: systemPerf } = useQuery<SystemPerformance>({
    queryKey: ["/api/performance/system"],
    refetchInterval: 2000,
  });

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measureFps = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        setBrowserFps(Math.round(frameCount));
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationId = requestAnimationFrame(measureFps);
    };

    animationId = requestAnimationFrame(measureFps);
    return () => cancelAnimationFrame(animationId);
  }, []);

  useEffect(() => {
    const measurePing = async () => {
      const start = performance.now();
      try {
        await fetch('/api/performance/system');
        const end = performance.now();
        setPing(Math.round(end - start));
      } catch {
        setPing(0);
      }
    };

    measurePing();
    const interval = setInterval(measurePing, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Performance Monitor</h1>
        <p className="text-muted-foreground">
          Real-time system performance metrics and monitoring
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <PerformanceWidget
          title="BROWSER FPS"
          value={browserFps}
          max={60}
          icon={Gauge}
          color="primary"
        />
        <PerformanceWidget
          title="CPU USAGE"
          value={systemPerf?.cpu || 0}
          max={100}
          unit="%"
          icon={Cpu}
          color="chart-2"
        />
        <PerformanceWidget
          title="RAM"
          value={systemPerf?.ram || 0}
          max={systemPerf?.ramTotal || 16}
          unit="GB"
          icon={HardDrive}
          color="chart-2"
        />
        <PerformanceWidget
          title="PING"
          value={ping}
          unit="ms"
          icon={Thermometer}
          color="primary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">System Information</h2>
          <div className="bg-card p-6 rounded-lg space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Browser</span>
              <span className="font-medium" data-testid="text-browser-info">
                {navigator.userAgent.split(' ').slice(-2).join(' ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform</span>
              <span className="font-medium" data-testid="text-platform-info">{navigator.platform}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cores</span>
              <span className="font-medium" data-testid="text-cores-info">{navigator.hardwareConcurrency || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Performance Tips</h2>
          <div className="bg-card p-6 rounded-lg space-y-3">
            <div className="space-y-2">
              <p className="font-medium">Close unnecessary browser tabs</p>
              <p className="text-sm text-muted-foreground">Each tab consumes memory and CPU resources</p>
            </div>
            <div className="space-y-2">
              <p className="font-medium">Update your graphics drivers</p>
              <p className="text-sm text-muted-foreground">Latest drivers provide better performance</p>
            </div>
            <div className="space-y-2">
              <p className="font-medium">Lower in-game graphics settings</p>
              <p className="text-sm text-muted-foreground">Reduce graphics quality for higher FPS</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
