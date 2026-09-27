import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { NavLink } from "@/components/nav-link";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { feedHref, type FeedParams } from "@/lib/feed-params";
import { cn } from "@/lib/utils";

export function Pagination({ params, page, pageCount }: { params: FeedParams; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;
  const linkClass = buttonVariants({ variant: "outline" });
  const disabledClass = cn(linkClass, "pointer-events-none opacity-50");
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-2 pt-2">
      {page > 1 ? (
        <NavLink href={feedHref({ ...params, page: page - 1 })} className={linkClass} rel="prev">
          <ChevronLeftIcon aria-hidden /> Newer
        </NavLink>
      ) : (
        <span aria-disabled className={disabledClass}>
          <ChevronLeftIcon aria-hidden /> Newer
        </span>
      )}
      <span className="text-muted-foreground text-sm tabular-nums">
        Page {page} of {pageCount}
      </span>
      {page < pageCount ? (
        <NavLink href={feedHref({ ...params, page: page + 1 })} className={linkClass} rel="next">
          Older <ChevronRightIcon aria-hidden />
        </NavLink>
      ) : (
        <span aria-disabled className={disabledClass}>
          Older <ChevronRightIcon aria-hidden />
        </span>
      )}
    </nav>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      {children && <p className="text-muted-foreground max-w-md text-sm">{children}</p>}
      {action && (
        <Link href={action.href} className={cn(buttonVariants({ variant: "outline" }), "mt-2")}>
          {action.label}
        </Link>
      )}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-28" />
      </div>
      <Skeleton className="h-5 w-11/12" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

/** Same outline as the loaded feed, so nothing jumps when data arrives. */
export function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading items">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="h-8 w-full" />
      <div className="flex gap-3 border-b pb-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-5 w-20" />
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
