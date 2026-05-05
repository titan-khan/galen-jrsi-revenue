import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const QuickActions = memo(function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-2 mb-5">
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5"
        onClick={() => navigate('/assistant')}
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Ask Assistant
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5"
        onClick={() => navigate('/settings')}
      >
        <Settings className="h-3.5 w-3.5" />
        Configure
      </Button>
    </div>
  );
});
