import { TrendingUp, Zap, BarChart3 } from "lucide-react";

interface Insight {
  id: string;
  icon: "trend" | "spike" | "comparison";
  text: React.ReactNode;
}

interface InsightsFeedProps {
  measure: string;
  sentiment: "up-good" | "up-bad";
}

const InsightsFeed = ({ measure, sentiment }: InsightsFeedProps) => {
  const measureLabel = measure ? measure.charAt(0).toUpperCase() + measure.slice(1) : "Value";

  const insights: Insight[] = [
    {
      id: "1",
      icon: "trend",
      text: (
        <>
          <strong># {measureLabel}</strong> this month reached <strong>13.2k</strong> on November 21, 2024, which is <strong>higher</strong> than all other days in this time period.
        </>
      ),
    },
    {
      id: "2",
      icon: "spike",
      text: (
        <>
          <strong># {measureLabel}</strong> has been <strong>steadily increasing</strong> for the last 59 days and <strong>jumped 23%</strong> in the last week.
        </>
      ),
    },
    {
      id: "3",
      icon: "comparison",
      text: (
        <>
          <strong>Consumer</strong> segment is the top contributor, driving <strong>52% of total {measureLabel.toLowerCase()}</strong>, up from 48% last quarter.
        </>
      ),
    },
  ];

  const getIcon = (type: Insight["icon"]) => {
    switch (type) {
      case "trend":
        return TrendingUp;
      case "spike":
        return Zap;
      case "comparison":
        return BarChart3;
    }
  };

  return (
    <div className="space-y-4">
      {insights.map((insight, index) => {
        const Icon = getIcon(insight.icon);
        return (
          <div
            key={insight.id}
            className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0 mt-0.5">
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {insight.text}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default InsightsFeed;
