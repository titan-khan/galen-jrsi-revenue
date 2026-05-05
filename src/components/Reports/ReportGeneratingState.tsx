import { useState, useEffect } from "react";
import { Loader2, Database, Sparkles, FileText, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportGeneratingStateProps {
  /** Report title to display */
  title: string;
}

const phases = [
  { label: "Querying database...", icon: Database, duration: 3000 },
  { label: "Analyzing insights...", icon: Sparkles, duration: 5000 },
  { label: "Generating report...", icon: FileText, duration: Infinity },
] as const;

const ReportGeneratingState = ({ title }: ReportGeneratingStateProps) => {
  const [currentPhase, setCurrentPhase] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Advance to phase 1 after 3s
    timers.push(
      setTimeout(() => setCurrentPhase(1), phases[0].duration)
    );

    // Advance to phase 2 after 3s + 5s = 8s
    timers.push(
      setTimeout(
        () => setCurrentPhase(2),
        phases[0].duration + phases[1].duration
      )
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="animate-in fade-in duration-500 mx-auto max-w-3xl py-12 px-4">
      {/* Title */}
      <h2 className="text-xl font-semibold text-center mb-8">{title}</h2>

      {/* Phase steps */}
      <div className="flex flex-col gap-1 mb-10">
        {phases.map((phase, index) => {
          const PhaseIcon = phase.icon;
          const isCompleted = index < currentPhase;
          const isCurrent = index === currentPhase;
          const isPending = index > currentPhase;

          return (
            <div key={phase.label} className="flex items-start gap-3">
              {/* Vertical connector + icon column */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300",
                    isCompleted &&
                      "border-green-500 bg-green-50 text-green-600",
                    isCurrent &&
                      "border-primary bg-primary/10 text-primary",
                    isPending &&
                      "border-muted-foreground/30 bg-muted text-muted-foreground/50"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isCurrent ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PhaseIcon className="h-4 w-4" />
                  )}
                </div>
                {/* Vertical line connector (not on last item) */}
                {index < phases.length - 1 && (
                  <div
                    className={cn(
                      "w-0.5 h-6 transition-colors duration-300",
                      isCompleted ? "bg-green-500" : "bg-muted-foreground/20"
                    )}
                  />
                )}
              </div>

              {/* Label */}
              <div className="flex items-center h-8">
                <span
                  className={cn(
                    "text-sm font-medium transition-colors duration-300",
                    isCompleted && "text-green-600",
                    isCurrent && "text-foreground",
                    isPending && "text-muted-foreground/50"
                  )}
                >
                  {isCompleted
                    ? phase.label.replace("...", " — done")
                    : phase.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Skeleton preview */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        {/* Title skeleton */}
        <div className="h-6 w-2/3 rounded bg-muted animate-pulse" />

        {/* Section content skeletons */}
        <div className="space-y-2 pt-2">
          <div className="h-3 w-full rounded bg-muted animate-pulse" />
          <div className="h-3 w-5/6 rounded bg-muted animate-pulse" />
          <div className="h-3 w-4/6 rounded bg-muted animate-pulse" />
          <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
        </div>

        {/* Bottom callout skeleton */}
        <div className="h-8 w-3/5 rounded bg-muted animate-pulse mt-4" />
      </div>
    </div>
  );
};

export default ReportGeneratingState;
