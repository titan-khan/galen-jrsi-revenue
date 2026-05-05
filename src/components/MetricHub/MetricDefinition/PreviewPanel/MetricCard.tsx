import { TrendingUp, TrendingDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface MetricCardProps {
  name: string;
  value: string;
  change: number;
  changeLabel: string;
  sentiment: "up-good" | "up-bad";
}

const MetricCard = ({
  name,
  value,
  change,
  changeLabel,
  sentiment,
}: MetricCardProps) => {
  const isPositive = change >= 0;
  const isGood = sentiment === "up-good" ? isPositive : !isPositive;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-foreground">
        {name || "Untitled Metric"}
      </h2>
      
      <div className="flex items-center gap-6">
        <span className="text-5xl font-bold text-foreground">{value}</span>
        
        <Separator orientation="vertical" className="h-12" />
        
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Nov 1 – Nov 22, 2024</p>
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1 text-sm font-medium ${
                isGood ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {isPositive ? "+" : ""}{change}%
            </div>
            <span className="text-sm text-muted-foreground">{changeLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
