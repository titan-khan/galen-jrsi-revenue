import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SectionHeaderProps {
  icon?: React.ReactNode;
  title: string;
  createPath?: string;
  createLabel?: string;
  viewAllPath?: string;
}

export const SectionHeader = memo(function SectionHeader({
  icon,
  title,
  createPath,
  createLabel = 'Create',
  viewAllPath,
}: SectionHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        {title}
      </div>
      <div className="flex items-center gap-2">
        {createPath && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
            onClick={() => navigate(createPath)}
          >
            <Plus className="h-3 w-3" />
            {createLabel}
          </Button>
        )}
        {viewAllPath && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-muted-foreground hover:text-foreground px-2"
            onClick={() => navigate(viewAllPath)}
          >
            View all
          </Button>
        )}
      </div>
    </div>
  );
});
