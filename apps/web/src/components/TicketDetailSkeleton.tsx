import { Skeleton } from "@/components/ui/skeleton";

export default function TicketDetailSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-96" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
