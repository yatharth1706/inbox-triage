"use client";

import type { CategoryCounts, Email, LogLine } from "@/lib/types";
import { ActivityLog } from "./activity-log";
import { FolderTiles } from "./folder-tiles";
import { NowClassifying } from "./now-classifying";
import { ProgressRing } from "./progress-ring";

export function RunningStep({
  percent,
  processed,
  total,
  log,
  current,
  counts,
  showConfidence,
}: {
  percent: number;
  processed: number;
  total: number;
  log: readonly LogLine[];
  current: Email | undefined;
  counts: CategoryCounts;
  showConfidence: boolean;
}) {
  return (
    <section className="w-full max-w-[1080px] animate-rise pt-12">
      <div className="flex flex-wrap items-start gap-10">
        <div className="min-w-[260px] flex-[1_1_260px]">
          <ProgressRing percent={percent} processed={processed} total={total} />
          <p className="mt-[26px] max-w-[34ch] text-pretty text-[13px] leading-[1.6] text-muted-strong">
            JEV is reading headers, thread history and intent signals, then tossing each
            message into a folder.
          </p>
          <ActivityLog lines={log} />
        </div>

        <div className="min-w-[300px] flex-[2_1_380px]">
          <NowClassifying email={current} showConfidence={showConfidence} />
          <FolderTiles counts={counts} />
        </div>
      </div>
    </section>
  );
}
