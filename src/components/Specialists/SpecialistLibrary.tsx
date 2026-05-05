import { useState } from 'react';
import { 
  Package, TrendingUp, Heart, DollarSign, Truck, ShoppingCart, 
  PieChart, Tag, MessageSquare, Calculator, Wallet, Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { SpecialistTemplate, SpecialistDomain } from '@/types/specialist';
import { useSpecialists, DOMAIN_CONFIGS } from '@/contexts/SpecialistsContext';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Package, TrendingUp, Heart, DollarSign, Truck, ShoppingCart,
  PieChart, Tag, MessageSquare, Calculator, Wallet,
};

interface SpecialistLibraryProps {
  onSelect: (template: SpecialistTemplate | null) => void;
  selectedTemplate: SpecialistTemplate | null;
}

const DOMAIN_TABS: { value: SpecialistDomain | 'all'; label: string }[] = [
  { value: 'all', label: 'All Specialists' },
  { value: 'supply-chain', label: 'Supply Chain' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'customer', label: 'Customer' },
  { value: 'finance', label: 'Finance' },
];

export function SpecialistLibrary({ onSelect, selectedTemplate }: SpecialistLibraryProps) {
  const { templates } = useSpecialists();
  const [activeDomain, setActiveDomain] = useState<SpecialistDomain | 'all'>('all');

  const filteredTemplates =
    activeDomain === 'all'
      ? templates
      : templates.filter((t) => t.domain === activeDomain);

  const handleSelect = (template: SpecialistTemplate) => {
    if (selectedTemplate?.id === template.id) {
      onSelect(null);
    } else {
      onSelect(template);
    }
  };

  const getDomainConfig = (domain: SpecialistDomain) => 
    DOMAIN_CONFIGS.find((d) => d.id === domain);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Choose a Specialist</h2>
        <p className="text-sm text-muted-foreground">
          Select the type of specialist you want to hire for your team
        </p>
      </div>

      <Tabs value={activeDomain} onValueChange={(v) => setActiveDomain(v as SpecialistDomain | 'all')}>
        <TabsList>
          {DOMAIN_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => {
          const isSelected = selectedTemplate?.id === template.id;
          const domainConfig = getDomainConfig(template.domain);
          const IconComponent = ICON_MAP[template.icon] || Package;

          return (
            <Card
              key={template.id}
              onClick={() => handleSelect(template)}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md border-l-4",
                domainConfig?.borderClass || 'border-l-primary',
                isSelected && "ring-2 ring-primary shadow-md"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      domainConfig?.bgClass || 'bg-primary/10'
                    )}>
                      <IconComponent className={cn("h-5 w-5", domainConfig?.colorClass || 'text-primary')} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <Badge variant="outline" className="text-[10px] mt-1">
                        {domainConfig?.name || template.domain}
                      </Badge>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {template.description}
                </p>

                {/* What this specialist does */}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">Monitors</p>
                    <div className="flex flex-wrap gap-1">
                      {template.monitors.slice(0, 3).map((item, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">
                          {item}
                        </Badge>
                      ))}
                      {template.monitors.length > 3 && (
                        <Badge variant="secondary" className="text-[10px]">
                          +{template.monitors.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">Detects</p>
                    <div className="flex flex-wrap gap-1">
                      {template.detects.slice(0, 2).map((item, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                          {item}
                        </Badge>
                      ))}
                      {template.detects.length > 2 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{template.detects.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
