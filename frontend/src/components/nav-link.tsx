"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function PendingDot() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        "ml-1.5 inline-block size-1.5 shrink-0 rounded-full bg-current transition-opacity",
        pending ? "animate-pulse opacity-70" : "opacity-0",
      )}
    />
  );
}

/** A Link with a small pulsing dot while its navigation is in flight. */
export function NavLink({ children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link {...props}>
      {children}
      <PendingDot />
    </Link>
  );
}
