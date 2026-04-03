import { Skeleton } from "@/components/ui/skeleton";

/** Card skeleton — used for order cards, offer cards, wallet cards */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="p-4 rounded-xl border border-border/50 bg-card space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full" style={{ width: `${85 - i * 15}%` }} />
      ))}
    </div>
  );
}

/** List of card skeletons */
export function CardListSkeleton({ count = 3, lines = 3 }: { count?: number; lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} lines={lines} />
      ))}
    </div>
  );
}

/** Stats row skeleton (3 stat cards) */
export function StatsRowSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-3 rounded-xl border border-border/30 bg-muted/30 space-y-2">
          <Skeleton className="h-4 w-4 mx-auto rounded" />
          <Skeleton className="h-5 w-12 mx-auto" />
          <Skeleton className="h-2 w-16 mx-auto" />
        </div>
      ))}
    </div>
  );
}

/** Wallet/balance skeleton */
export function WalletSkeleton() {
  return (
    <div className="p-5 rounded-2xl border border-border/50 bg-card space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-8 w-40" />
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 flex-1 rounded-lg" />
      </div>
    </div>
  );
}

/** Profile header skeleton */
export function ProfileHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4">
      <Skeleton className="w-14 h-14 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  );
}
