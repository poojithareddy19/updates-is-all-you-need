import { EmptyState } from "@/components/feed-states";

export default function NotFound() {
  return (
    <EmptyState title="Page not found" action={{ href: "/", label: "Go to Today" }}>
      That page does not exist. Archive days use the format /archive/2026-09-24.
    </EmptyState>
  );
}
