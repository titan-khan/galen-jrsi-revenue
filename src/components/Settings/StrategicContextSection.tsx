import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useMetrics } from "@/contexts/MetricsContext";
import { GOAL_LABELS, StrategicGoal } from "@/types/companyProfile";
import { Target, TrendingUp, Star } from "lucide-react";

const FISCAL_MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export const StrategicContextSection = () => {
  const { 
    companyProfile, 
    updateProfile,
    setPrimaryGoal,
    setSecondaryGoals,
    setNorthStarMetricId,
  } = useOrganization();
  
  const { metrics } = useMetrics();

  const toggleSecondaryGoal = (goal: StrategicGoal) => {
    const current = companyProfile.secondaryGoals;
    if (current.includes(goal)) {
      setSecondaryGoals(current.filter(g => g !== goal));
    } else if (current.length < 3) {
      setSecondaryGoals([...current, goal]);
    }
  };

  // Filter out primary goal from secondary options
  const secondaryGoalOptions = Object.entries(GOAL_LABELS).filter(
    ([value]) => value !== companyProfile.primaryGoal
  );

  return (
    <div className="space-y-6">
      {/* Strategic Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Strategic Goals
          </CardTitle>
          <CardDescription>
            Define your primary and secondary business objectives
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary Goal */}
          <div className="space-y-2">
            <Label>Primary Goal</Label>
            <p className="text-xs text-muted-foreground mb-2">
              What is the most important objective for your business right now?
            </p>
            <Select 
              value={companyProfile.primaryGoal} 
              onValueChange={(value: StrategicGoal) => setPrimaryGoal(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select primary goal" />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(GOAL_LABELS) as [StrategicGoal, string][]).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Secondary Goals */}
          <div className="space-y-2">
            <Label>Secondary Goals (up to 3)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Select additional objectives to track
            </p>
            <div className="flex flex-wrap gap-2">
              {secondaryGoalOptions.map(([value, label]) => (
                <Badge
                  key={value}
                  variant={companyProfile.secondaryGoals.includes(value as StrategicGoal) ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleSecondaryGoal(value as StrategicGoal)}
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* North Star Metric */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            North Star Metric
          </CardTitle>
          <CardDescription>
            Select the single most important metric for your business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select 
            value={companyProfile.northStarMetricId || '__none__'} 
            onValueChange={(value) => setNorthStarMetricId(value === '__none__' ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select North Star metric" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None selected</SelectItem>
              {metrics.map(metric => (
                <SelectItem key={metric.id} value={metric.id}>
                  {metric.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Your North Star metric will be featured prominently in the Command Center
          </p>
        </CardContent>
      </Card>

      {/* Fiscal Year */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Fiscal Year
          </CardTitle>
          <CardDescription>
            When does your fiscal year begin?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select 
            value={String(companyProfile.fiscalYearStart)} 
            onValueChange={(value) => updateProfile({ fiscalYearStart: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select fiscal year start" />
            </SelectTrigger>
            <SelectContent>
              {FISCAL_MONTHS.map(month => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
};
