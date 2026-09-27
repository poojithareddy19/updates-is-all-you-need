"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center">
      <p className="font-medium">Could not load the feed</p>
      <p className="text-muted-foreground max-w-md text-sm">
        The database did not answer. This is usually temporary, so try again in a moment.
      </p>
      <Button variant="outline" className="mt-2" onClick={() => retry()}>
        Try again
      </Button>
    </div>
  );
}
