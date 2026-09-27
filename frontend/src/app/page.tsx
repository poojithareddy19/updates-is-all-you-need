import { Suspense } from "react";
import { FeedSection } from "@/components/feed-section";
import { FeedSkeleton } from "@/components/feed-states";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <FeedSection searchParams={searchParams} />
    </Suspense>
  );
}
