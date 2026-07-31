import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ticket, CircleDot, Sparkles, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorAlert from "@/components/ErrorAlert";
import { api } from "../lib/api";

interface DailyVolume {
  date: string;
  count: number;
}

interface TicketStats {
  total: number;
  open: number;
  aiResolved: number;
  aiResolvedPercent: number;
  avgResolutionMs: number | null;
  dailyVolume: DailyVolume[];
}

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / (60 * 1000));
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function formatAxisDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

const tiles: {
  label: string;
  value: (stats: TicketStats) => string;
  icon: typeof Ticket;
}[] = [
  { label: "Total tickets", value: (s) => s.total.toLocaleString(), icon: Ticket },
  { label: "Open tickets", value: (s) => s.open.toLocaleString(), icon: CircleDot },
  { label: "Resolved by AI", value: (s) => s.aiResolved.toLocaleString(), icon: Sparkles },
  {
    label: "% resolved by AI",
    value: (s) => `${s.aiResolvedPercent.toFixed(1)}%`,
    icon: TrendingUp,
  },
  {
    label: "Avg. resolution time",
    value: (s) => (s.avgResolutionMs === null ? "—" : formatDuration(s.avgResolutionMs)),
    icon: Clock,
  },
];

const CHART_HEIGHT = 128;

function TicketVolumeChart({ data }: { data: DailyVolume[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  const active = activeIndex === null ? null : data[activeIndex];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-normal text-muted-foreground">
          Tickets per day (last 30 days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {active && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap shadow-sm"
              style={{
                left: `${((activeIndex! + 0.5) / data.length) * 100}%`,
                top: -8,
              }}
            >
              <span className="font-semibold">{active.count}</span>{" "}
              <span className="text-muted-foreground">{formatAxisDate(active.date)}</span>
            </div>
          )}
          <div className="flex items-end gap-[2px] border-b" style={{ height: CHART_HEIGHT }}>
            {data.map((d, i) => (
              <button
                key={d.date}
                type="button"
                className="group relative flex h-full flex-1 items-end focus:outline-none"
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(i)}
                onBlur={() => setActiveIndex(null)}
                aria-label={`${d.count} ticket${d.count === 1 ? "" : "s"} on ${formatAxisDate(d.date)}`}
              >
                <span
                  className={`block w-full rounded-t-[4px] bg-primary transition-opacity ${
                    activeIndex === i ? "opacity-100" : "opacity-70 group-hover:opacity-100"
                  }`}
                  style={{
                    height: d.count > 0 ? Math.max((d.count / max) * CHART_HEIGHT, 2) : 0,
                  }}
                />
              </button>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{formatAxisDate(data[0]!.date)}</span>
            <span>{formatAxisDate(data[data.length - 1]!.date)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardStats() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ticket-stats"],
    queryFn: async () => {
      const { data } = await api.get<TicketStats>("/api/tickets/stats");
      return data;
    },
  });

  if (error) {
    return <ErrorAlert message="Failed to fetch dashboard stats" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[13px] font-medium text-muted-foreground">
                  {tile.label}
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                  <tile.icon className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading || !data ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <p className="text-3xl font-semibold tracking-tight">{tile.value(data)}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <TicketVolumeChart data={data.dailyVolume} />
      )}
    </div>
  );
}
