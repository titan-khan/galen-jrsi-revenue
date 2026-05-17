import { Globe, FlaskConical } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useDemoMode } from "@/hooks/useDemoMode";

interface DemoModeToggleProps {
  className?: string;
  size?: "sm" | "md";
}

/**
 * Demo Mode toggle for Riset views.
 *
 * ON (default)  → komponen pakai data fixture dari risetData.ts (mock).
 * OFF           → komponen pakai live web search via OpenRouter (openai/gpt-4o-mini-search-preview).
 */
export function DemoModeToggle({ className, size = "md" }: DemoModeToggleProps) {
  const { isDemoMode, setDemoMode } = useDemoMode();

  const isSmall = size === "sm";

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full border bg-card px-2.5 py-1",
          isDemoMode
            ? "border-amber-200 bg-amber-50/70"
            : "border-emerald-200 bg-emerald-50/70",
          isSmall ? "text-[11px]" : "text-[12px]",
          className,
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              {isDemoMode ? (
                <FlaskConical className={cn("text-amber-700", isSmall ? "h-3 w-3" : "h-3.5 w-3.5")} />
              ) : (
                <Globe className={cn("text-emerald-700", isSmall ? "h-3 w-3" : "h-3.5 w-3.5")} />
              )}
              <span
                className={cn(
                  "font-medium leading-none",
                  isDemoMode ? "text-amber-900" : "text-emerald-900",
                )}
              >
                {isDemoMode ? "Demo Mode" : "Live"}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[260px] text-[11.5px] leading-snug">
            {isDemoMode
              ? "Mode demo aktif — data dari fixture pre-loaded. Matikan untuk memakai pencarian web live."
              : "Live aktif — komponen riset menarik data publik via OpenRouter (openai/gpt-4o-mini-search-preview)."}
          </TooltipContent>
        </Tooltip>
        <Switch
          checked={!isDemoMode}
          onCheckedChange={(checked) => setDemoMode(!checked)}
          aria-label={isDemoMode ? "Matikan Demo Mode" : "Nyalakan Demo Mode"}
          className={cn(isSmall ? "h-4 w-8" : "h-5 w-9")}
        />
      </div>
    </TooltipProvider>
  );
}
