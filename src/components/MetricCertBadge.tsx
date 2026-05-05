import { ShieldCheck, Shield, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MetricCertification } from "@/types/metric";

const LEVEL_STYLES: Record<MetricCertification["certificationLevel"], { className: string; Icon: typeof ShieldCheck; label: string }> = {
  gold:   { className: "bg-amber-100 text-amber-800 border-amber-300",     Icon: ShieldCheck, label: "Gold"   },
  silver: { className: "bg-slate-100 text-slate-700 border-slate-300",     Icon: Shield,      label: "Silver" },
  bronze: { className: "bg-orange-100 text-orange-800 border-orange-300",  Icon: ShieldAlert, label: "Bronze" },
};

interface MetricCertBadgeProps {
  cert: MetricCertification | undefined;
  size?: "sm" | "md";
  showConfidence?: boolean;
  className?: string;
}

export function MetricCertBadge({ cert, size = "sm", showConfidence = true, className }: MetricCertBadgeProps) {
  if (!cert) return null;
  const style = LEVEL_STYLES[cert.certificationLevel];
  const isSm = size === "sm";
  const conf = cert.confidenceScore;
  const confPct = typeof conf === "number" ? Math.round(conf * 100) : null;

  return (
    <span
      title={`Certification: ${style.label}${confPct !== null ? ` · Confidence ${confPct}%` : ""}${cert.governanceSource ? ` · ${cert.governanceSource}` : ""}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        isSm ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        style.className,
        className,
      )}
    >
      <style.Icon className={isSm ? "h-2.5 w-2.5" : "h-3 w-3"} aria-hidden />
      <span>{style.label}</span>
      {showConfidence && confPct !== null && (
        <span className="opacity-75">{confPct}%</span>
      )}
    </span>
  );
}
