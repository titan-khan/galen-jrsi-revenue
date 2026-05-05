import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AgentTemplate, AgentCategory } from '@/types/agent';
import { useAgents } from '@/contexts/AgentsContext';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Shield,
  Calculator,
  Clock,
  Search,
  HeartPulse,
  PackageX,
  Sparkles,
  BarChart3,
  Briefcase,
  Target,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Shield,
  Calculator,
  Clock,
  Search,
  HeartPulse,
  PackageX,
  BarChart3,
  Briefcase,
  Target,
};

const categoryConfig: Record<AgentCategory, { label: string; bgColor: string; iconBg: string }> = {
  product: { label: 'Product', bgColor: 'hover:border-blue-300', iconBg: 'bg-blue-500/10 text-blue-600' },
  revenue: { label: 'Revenue', bgColor: 'hover:border-emerald-300', iconBg: 'bg-emerald-500/10 text-emerald-600' },
  operations: { label: 'Operations', bgColor: 'hover:border-purple-300', iconBg: 'bg-purple-500/10 text-purple-600' },
  risk: { label: 'Risk', bgColor: 'hover:border-amber-300', iconBg: 'bg-amber-500/10 text-amber-600' },
};

const CATEGORY_ORDER: AgentCategory[] = ['product', 'revenue', 'operations', 'risk'];

interface TemplateGalleryProps {
  onSelect: (template: AgentTemplate | null) => void;
  selectedTemplate: AgentTemplate | null;
}

export function TemplateGallery({ onSelect, selectedTemplate }: TemplateGalleryProps) {
  const { templates } = useAgents();

  const templatesByCategory = CATEGORY_ORDER.reduce((acc, category) => {
    acc[category] = templates.filter((t) => t.category === category);
    return acc;
  }, {} as Record<AgentCategory, AgentTemplate[]>);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Select an Agent Blueprint</h2>
        <p className="text-muted-foreground">
          Choose a pre-configured template to get started, or create a custom agent.
        </p>
      </div>

      {CATEGORY_ORDER.map((category) => (
        <div key={category} className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {categoryConfig[category].label}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templatesByCategory[category].map((template) => {
              const Icon = iconMap[template.icon] || BarChart3;
              const isSelected = selectedTemplate?.id === template.id;
              const config = categoryConfig[template.category];

              return (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all ${config.bgColor} ${
                    isSelected ? 'ring-2 ring-primary border-primary' : ''
                  }`}
                  onClick={() => onSelect(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${config.iconBg}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground">{template.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {template.description}
                        </p>
                        <Badge variant="secondary" className="mt-2 text-xs">
                          {template.useCase}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {/* Custom Agent Option */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Custom
        </h3>
        <Card
          className={`cursor-pointer transition-all hover:border-foreground/30 ${
            selectedTemplate === null ? 'ring-2 ring-primary border-primary' : ''
          }`}
          onClick={() => onSelect(null)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Sparkles className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Custom Agent</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Start from scratch with full flexibility to define your own agent behavior and metrics.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
