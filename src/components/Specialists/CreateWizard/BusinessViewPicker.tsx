import {
  TrendingUp,
  Truck,
  Heart,
  PiggyBank,
  ShieldAlert,
  Bus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BusinessView, BusinessViewConfig } from '@/types/specialist';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  TrendingUp,
  Truck,
  Heart,
  PiggyBank,
  ShieldAlert,
  Bus,
};

interface BusinessViewPickerProps {
  views: BusinessViewConfig[];
  selected: BusinessView | null;
  onSelect: (view: BusinessView) => void;
}

export const BusinessViewPicker = ({ views, selected, onSelect }: BusinessViewPickerProps) => {
  return (
    <div className="grid grid-cols-3 gap-3">
      {views.map((view) => {
        const Icon = ICON_MAP[view.icon] || Bus;
        const isSelected = selected === view.id;

        return (
          <button
            key={view.id}
            onClick={() => onSelect(view.id)}
            className={cn(
              'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150 text-center',
              isSelected
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border bg-muted/60 hover:bg-muted hover:border-muted-foreground/30',
            )}
          >
            <div className={cn(
              'p-2.5 rounded-lg transition-colors',
              isSelected ? 'bg-primary/10' : view.bgClass,
            )}>
              <Icon className={cn(
                'h-5 w-5',
                isSelected ? 'text-primary' : view.colorClass,
              )} />
            </div>
            <span className={cn(
              'text-sm font-medium leading-tight',
              isSelected ? 'text-primary' : 'text-foreground',
            )}>
              {view.name}
            </span>
          </button>
        );
      })}
    </div>
  );
};
