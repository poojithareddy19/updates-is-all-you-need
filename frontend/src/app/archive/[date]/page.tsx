import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FeedSection } from "@/components/feed-section";
import { FeedSkeleton } from "@/components/feed-states";
import { formatDay } from "@/lib/format";
import { isIsoDay } from "@updates/backend/config";

export async function generateMetadata({ params }: PageProps<"/archive/[date]">): Promise<Metadata> {
  const { date } = await params;
  if (!isIsoDay(date)) return { title: "Archive" };
  return {
    title: formatDay(date),
    description: `AI news, articles, research papers and community discussion published on ${formatDay(date)}.`,
  };
}

export default function ArchiveDayPage({ params, searchParams }: PageProps<"/archive/[date]">) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <ArchiveDay params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ArchiveDay({ params, searchParams }: PageProps<"/archive/[date]">) {
  const { date } = await params;
  if (!isIsoDay(date)) notFound();
  return <FeedSection day={date} searchParams={searchParams} />;
}
