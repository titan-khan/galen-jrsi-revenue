import { useState } from "react";
import { Layout, Building2, PiggyBank, Megaphone, Settings2, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCommandCenter } from "@/contexts/CommandCenterContext";
import { PRESET_CONFIGS, DashboardPreset, DashboardComponentVisibility } from "@/types/commandCenter";

const PRESET_ICONS: Record<DashboardPreset, typeof Layout> = {
  executive: Layout,
  "business-unit": Building2,
  cfo: PiggyBank,
  cmo: Megaphone,
  custom: Settings2,
};

const COMPONENT_LABELS: Record<keyof DashboardComponentVisibility, string> = {
  northStar: "North Star Metric",
  impactSummary: "Impact Summary Row",
  miniWaterfall: "Mini Waterfall Chart",
  contributingMetrics: "Contributing Metrics",
  growthDrivers: "Growth Drivers",
  riskAlerts: "Risk Alerts",
  approvalQueue: "Approval Queue",
  agentInsights: "Agent Insights",
};

export function ViewPresetSelector() {
  const { dashboardPreset, setDashboardPreset, customVisibility, setCustomVisibility, getVisibility } = useCommandCenter();
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const currentConfig = PRESET_CONFIGS[dashboardPreset];
  const CurrentIcon = PRESET_ICONS[dashboardPreset];

  const handlePresetSelect = (preset: DashboardPreset) => {
    if (preset === 'custom') {
      setCustomizeOpen(true);
    }
    setDashboardPreset(preset);
  };

  const handleToggleComponent = (key: keyof DashboardComponentVisibility) => {
    setCustomVisibility({ [key]: !customVisibility[key] });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CurrentIcon className="h-4 w-4" />
            {currentConfig.label}
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {(Object.keys(PRESET_CONFIGS) as DashboardPreset[]).map((preset) => {
            const config = PRESET_CONFIGS[preset];
            const Icon = PRESET_ICONS[preset];
            const isSelected = preset === dashboardPreset;

            return (
              <DropdownMenuItem
                key={preset}
                onClick={() => handlePresetSelect(preset)}
                className="flex items-start gap-3 py-2"
              >
                <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{config.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </div>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCustomizeOpen(true)} className="gap-2">
            <Settings2 className="h-4 w-4" />
            <span>Customize View</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Customize Dashboard View</SheetTitle>
            <SheetDescription>
              Toggle components to show or hide them from your dashboard.
            </SheetDescription>
          </SheetHeader>
          <div className="py-6 space-y-4">
            {(Object.keys(COMPONENT_LABELS) as (keyof DashboardComponentVisibility)[]).map((key) => (
              <div key={key} className="flex items-center justify-between">
                <Label htmlFor={key} className="text-sm font-normal">
                  {COMPONENT_LABELS[key]}
                </Label>
                <Switch
                  id={key}
                  checked={customVisibility[key]}
                  onCheckedChange={() => handleToggleComponent(key)}
                />
              </div>
            ))}
          </div>
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setDashboardPreset('custom');
                setCustomizeOpen(false);
              }}
            >
              Apply Custom View
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}