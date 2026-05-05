import { useState } from "react";
import { Check, Package, Building2, Truck, Monitor, GripVertical, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { industryTemplates } from "@/data/industryTemplates";
import { metricsData } from "@/data/metricsData";
import { useCommandCenter } from "@/contexts/CommandCenterContext";

interface KPISelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Package,
  Building2,
  Truck,
  Monitor,
};

export function KPISelector({ open, onOpenChange }: KPISelectorProps) {
  const { selectedKPIIds, applyTemplate, setSelectedKPIIds } = useCommandCenter();
  const [localSelection, setLocalSelection] = useState<string[]>(selectedKPIIds);
  const [activeTab, setActiveTab] = useState("templates");

  const toggleMetric = (id: string) => {
    setLocalSelection((prev) => {
      if (prev.includes(id)) {
        return prev.filter((m) => m !== id);
      }
      if (prev.length >= 4) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleApplyTemplate = (template: typeof industryTemplates[0]) => {
    applyTemplate(template.kpiIds, template.northStarId);
    onOpenChange(false);
  };

  const handleApplyCustom = () => {
    setSelectedKPIIds(localSelection);
    onOpenChange(false);
  };

  const getMetricById = (id: string) => metricsData.find((m) => m.id === id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Configure Supporting KPIs</SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="templates" className="flex-1">Industry Templates</TabsTrigger>
            <TabsTrigger value="custom" className="flex-1">Custom Selection</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-4">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-3 pr-4">
                {industryTemplates.map((template) => {
                  const IconComponent = iconMap[template.icon] || Monitor;
                  return (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => handleApplyTemplate(template)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <IconComponent className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base">{template.name}</CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {template.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-1.5">
                          {template.kpiIds.map((id) => {
                            const metric = getMetricById(id);
                            return (
                              <Badge key={id} variant="secondary" className="text-xs">
                                {metric?.name || id}
                              </Badge>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="custom" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Select up to 4 KPIs ({localSelection.length}/4)
                </p>
                <Button
                  size="sm"
                  onClick={handleApplyCustom}
                  disabled={localSelection.length === 0}
                >
                  Apply Selection
                </Button>
              </div>

              {/* Selected KPIs */}
              {localSelection.length > 0 && (
                <div className="border rounded-lg p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-2">Selected KPIs:</p>
                  <div className="flex flex-wrap gap-2">
                    {localSelection.map((id) => {
                      const metric = getMetricById(id);
                      return (
                        <Badge
                          key={id}
                          variant="default"
                          className="gap-1.5 pr-1"
                        >
                          <GripVertical className="h-3 w-3 opacity-50" />
                          {metric?.name || id}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMetric(id);
                            }}
                            className="ml-1 p-0.5 hover:bg-primary-foreground/20 rounded"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              <ScrollArea className="h-[calc(100vh-340px)]">
                <div className="space-y-2 pr-4">
                  {metricsData.map((metric) => {
                    const isSelected = localSelection.includes(metric.id);
                    const isDisabled = !isSelected && localSelection.length >= 4;
                    
                    return (
                      <div
                        key={metric.id}
                        className={`
                          flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                          ${isSelected ? "border-primary bg-primary/5" : "hover:border-muted-foreground/30"}
                          ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
                        `}
                        onClick={() => !isDisabled && toggleMetric(metric.id)}
                      >
                        <div className={`
                          w-5 h-5 rounded border-2 flex items-center justify-center
                          ${isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"}
                        `}>
                          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{metric.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {metric.category} · {metric.displayData.currentValue}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {metric.category}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
