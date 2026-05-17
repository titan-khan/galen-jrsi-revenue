import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfidenceSegments } from "./ConfidenceSegments";
import type { WebSearchPola } from "@/types/webSearch";

interface LivePolaListItemProps {
  pola: WebSearchPola;
  /** Sesi this Live Pola belongs to — used to construct the detail link. */
  sesiId: string;
  /** How many citations from the parent search the LLM grouped under this Pola.
   *  We don't get this back from the model, so the caller passes a derived count. */
  evidenceCount: number;
}

/**
 * Visual counterpart to PolaListItem, but for Live mode.
 *
 * Navigates to `/research/sesi/{sesiId}/live-pola/{polaNumber}` which mounts
 * LivePolaDetail — same cache hit as the parent BriefingDetail, so the detail
 * page renders instantly from the in-memory result.
 */
export function LivePolaListItem({ pola, sesiId, evidenceCount }: LivePolaListItemProps) {
  return (
    <Link
      to={`/research/sesi/${sesiId}/live-pola/${pola.number}`}
      className={cn(
        "group grid grid-cols-[28px_1fr_auto] items-start gap-4 rounded-xl border border-border bg-card p-5",
        "transition-all duration-200 cursor-pointer",
        "hover:shadow-sm hover:bg-accent/30",
      )}
    >
      {/* Number badge */}
      <div className="grid h-7 w-7 place-items-center self-start rounded-md border border-border bg-background font-mono text-[12px] font-medium text-muted-foreground">
        {pola.number}
      </div>

      {/* Main column */}
      <div className="min-w-0">
        <div className="mb-1 flex items-baseline gap-2">
          <h3 className="truncate text-[13px] font-semibold leading-tight text-foreground">
            {pola.title}
          </h3>
        </div>
        <span className="mb-2 inline-block rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {pola.eventType}
        </span>
        <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground/80">
          {pola.description}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground/70">
          <span className="font-mono">{evidenceCount} bukti</span>
          <span className="text-border">·</span>
          <span>diturunkan dari pencarian web live</span>
        </div>
      </div>

      {/* Right rail */}
      <div className="flex flex-col items-end gap-2">
        <ConfidenceSegments level={pola.confidence} />
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
      </div>
    </Link>
  );
}
