import Link from "next/link";
import { Suspense } from "react";
import { HeaderNav, NavLinks } from "@/components/header-nav";
import { ThemeToggle } from "@/components/theme";

export function SiteHeader() {
  return (
    <header className="bg-background/90 supports-backdrop-filter:bg-background/75 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="group flex min-w-0 flex-col">
          <span className="truncate font-semibold tracking-tight group-hover:underline sm:text-lg">Updates Is All You Need</span>
          <span className="text-muted-foreground hidden text-xs sm:block">Daily AI news, papers and discussion</span>
        </Link>
        <div className="flex items-center gap-1">
          {/* On dynamic routes the path is only known at request time; the fallback has the same links. */}
          <Suspense fallback={<NavLinks pathname={null} />}>
            <HeaderNav />
          </Suspense>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="text-muted-foreground border-t text-xs">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        Headlines and summaries come from each source&apos;s public feed or API, and every item links to the original.
      </div>
    </footer>
  );
}
