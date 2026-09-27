"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Today", match: (p: string) => p === "/" },
  { href: "/archive", label: "Archive", match: (p: string) => p.startsWith("/archive") },
  { href: "/bookmarks", label: "Bookmarks", match: (p: string) => p.startsWith("/bookmarks") },
];

export function HeaderNav() {
  return <NavLinks pathname={usePathname()} />;
}

/** The links themselves; `pathname` null (while the path is unknown) highlights nothing. */
export function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Main">
      <ul className="flex items-center">
        {LINKS.map(({ href, label, match }) => {
          const active = pathname !== null && match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-2 py-1.5 text-sm transition-colors sm:px-2.5",
                  active ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
