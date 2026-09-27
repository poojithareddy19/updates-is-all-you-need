import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="group flex flex-col">
          <span className="text-lg font-semibold tracking-tight group-hover:underline">Updates Is All You Need</span>
          <span className="text-muted-foreground text-xs">Daily AI news, papers and discussion</span>
        </Link>
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
